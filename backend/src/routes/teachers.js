const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { DEFAULT_INCHARGE_TASKS } = require('./staff-tasks');

const { router: staffMastersRouter } = require('./staffMasters');

const router = express.Router();

// Mount staff masters router
router.use('/masters', staffMastersRouter);

function generatePassword(length = 8) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ══════════════════════════════════════════════════════════════════════════════
// ─── 1. TEACHERS LIST & CREATE ───────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/teachers
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, category, inchargeRole, search, includeInactive, all, status } = req.query;
    const where = {};
    if (includeInactive !== 'true' && all !== 'true' && !status) {
      where.isActive = true;
    } else if (status === 'ACTIVE') {
      where.isActive = true;
    } else if (status === 'INACTIVE' || status === 'TRANSFERRED' || status === 'RETIRED' || status === 'LEFT') {
      where.isActive = false;
    }

    if (type) where.type = type;
    if (inchargeRole) {
      where.inchargeRole = { contains: inchargeRole };
    }
    if (category) {
      if (category === 'NON_TEACHING') {
        where.shreni = 'NON_TEACHING';
      } else if (category === 'TEACHING') {
        where.OR = [
          { shreni: 'TEACHING' },
          { shreni: null },
          { shreni: '' },
        ];
      }
    }
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { fullNameNepali: { contains: search } },
        { panNo: { contains: search } },
        { phone: { contains: search } },
        { post: { contains: search } },
        { inchargeTitle: { contains: search } },
      ];
    }

    let orderByClause;
    if (req.query.sortBy === 'name') {
      orderByClause = [{ fullName: 'asc' }];
    } else if (req.query.sortBy === 'id') {
      orderByClause = [{ id: 'asc' }];
    } else {
      orderByClause = [{ displayOrder: 'asc' }, { id: 'asc' }];
    }

    const teachers = await prisma.teacher.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, role: true, isActive: true } },
        subjects: { include: { subject: true } },
        classTeacherOf: { select: { id: true, name: true, section: true } },
        bankAccounts: { orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }] },
        tasks: {
          select: { id: true, title: true, status: true, priority: true, category: true, dueDateBs: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: orderByClause,
    });
    return res.json({ success: true, data: teachers });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/teachers - Create new teacher / staff
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const {
      fullName, fullNameNepali, gender, bloodGroup, dateOfBirthBs, address, phone, email,
      panNo, sanchayaKoshNo, nagarikLaganiKoshNo, citizenshipNo,
      type, taha, shreni, post, designation, photoUrl,
      isTeachingStaff, displayOrder,
      dateOfJoiningBs, dateOfRetirementBs, subjectIds, role,
      isActive, enableLogin, isHistorical,
      bankName, bankAccountNo, bankBranch
    } = req.body;

    const username = (fullName.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.') + '.' + Date.now().toString().slice(-4)).slice(0, 20);
    const plainPassword = generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    let userRole = role;
    if (!userRole || !['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'TEACHER', 'LIBRARIAN', 'STUDENT'].includes(userRole)) {
      if (shreni === 'NON_TEACHING' && post?.toLowerCase().includes('account')) {
        userRole = 'ACCOUNTANT';
      } else if (shreni === 'NON_TEACHING' && post?.toLowerCase().includes('library')) {
        userRole = 'LIBRARIAN';
      } else {
        userRole = 'TEACHER';
      }
    }

    const staffIsActive = isActive !== undefined ? Boolean(isActive) : !Boolean(isHistorical);
    const userIsActive = enableLogin !== undefined ? Boolean(enableLogin) : staffIsActive;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username, passwordHash, role: userRole, isActive: userIsActive, mustChangePassword: true },
      });

      const teacherCreateData = {
        userId: user.id, fullName, fullNameNepali, gender, bloodGroup: bloodGroup || null, dateOfBirthBs, address, phone, email,
        panNo, sanchayaKoshNo, nagarikLaganiKoshNo, citizenshipNo,
        type: type || 'RASTRIYA',
        isTeachingStaff: isTeachingStaff !== undefined ? Boolean(isTeachingStaff) : (shreni !== 'NON_TEACHING'),
        taha,
        shreni: shreni || 'TEACHING',
        post: post || (shreni === 'NON_TEACHING' ? 'कार्यालय सहयोगी' : 'शिक्षक'),
        designation,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder) : 0,
        photoUrl: photoUrl || null,
        dateOfJoiningBs, dateOfRetirementBs,
        isActive: staffIsActive,
        bankName: bankName || null,
        bankAccountNo: bankAccountNo || null,
        bankBranch: bankBranch || null,
        subjects: (subjectIds && subjectIds.length > 0) ? {
          create: subjectIds.map(sid => ({ subjectId: parseInt(sid) }))
        } : undefined,
      };

      let teacher;
      try {
        teacher = await tx.teacher.create({ data: teacherCreateData });
      } catch (createErr) {
        if (createErr.message && (createErr.message.includes('Unknown argument') || createErr.message.includes('bankName') || createErr.message.includes('bankAccountNo') || createErr.message.includes('bankBranch'))) {
          delete teacherCreateData.bankName;
          delete teacherCreateData.bankAccountNo;
          delete teacherCreateData.bankBranch;
          teacher = await tx.teacher.create({ data: teacherCreateData });
        } else {
          throw createErr;
        }
      }

      // Automatically register initial bank account into TeacherBankAccount if provided
      if (bankName && bankAccountNo) {
        try {
          await tx.teacherBankAccount.create({
            data: {
              teacherId: teacher.id,
              bankName,
              accountNumber: bankAccountNo,
              branch: bankBranch || null,
              accountType: 'SALARY',
              isPrimary: true,
            },
          });
        } catch (bErr) {
          console.warn('Initial TeacherBankAccount creation warning:', bErr.message);
        }
      }

      return { user, teacher };
    });

    if (bankName) {
      saveBankToDirectory(bankName, bankBranch).catch(() => {});
    }

    return res.status(201).json({
      success: true,
      data: result.teacher,
      credentials: { username, password: plainPassword },
      message: 'Staff/Teacher registered successfully.',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ─── 2. BANK DIRECTORY & COMMON BRANCHES (Auto-Fetch for All Teachers) ──────────
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_NEPAL_BANKS = [
  { bankName: 'Machhapuchchhre Bank Ltd. (माछापुच्छ्रे बैंक)', branch: 'Garuda Branch' },
  { bankName: 'Rastriya Banijya Bank (राष्ट्रिय वाणिज्य बैंक)', branch: 'Gaur Branch' },
  { bankName: 'Nepal Bank Limited (नेपाल बैंक लि.)', branch: 'Garuda Branch' },
  { bankName: 'Agricultural Development Bank (कृषि विकास बैंक)', branch: 'Gaur Branch' },
  { bankName: 'Global IME Bank Limited (ग्लोबल आइएमई बैंक)', branch: 'Garuda Branch' },
  { bankName: 'Nabil Bank Limited (नबिल बैंक)', branch: 'Chandranigahapur Branch' },
  { bankName: 'NIC Asia Bank (एनआईसी एशिया बैंक)', branch: 'Garuda Branch' },
  { bankName: 'Siddhartha Bank Limited (सिद्धार्थ बैंक)', branch: 'Garuda Branch' },
  { bankName: 'Prabhu Bank Limited (प्रभु बैंक)', branch: 'Gaur Branch' },
  { bankName: 'Everest Bank Limited (एभरेष्ट बैंक)', branch: 'Gaur Branch' },
  { bankName: 'Nepal SBI Bank (नेपाल एसबिआई बैंक)', branch: 'Gaur Branch' },
  { bankName: 'Sanima Bank (सानिमा बैंक)', branch: 'Chandranigahapur Branch' },
  { bankName: 'Kumari Bank (कुमारी बैंक)', branch: 'Garuda Branch' },
  { bankName: 'Citizens Bank International (सिटिजन्स बैंक)', branch: 'Garuda Branch' },
  { bankName: 'Prime Commercial Bank (प्राइम कमर्सियल बैंक)', branch: 'Garuda Branch' },
  { bankName: 'Laxmi Sunrise Bank (लक्ष्मी सनराइज बैंक)', branch: 'Garuda Branch' },
  { bankName: 'Himalayan Bank (हिमालयन बैंक)', branch: 'Gaur Branch' },
  { bankName: 'Standard Chartered Bank Nepal', branch: 'Birgunj Branch' },
  { bankName: 'Nepal Investment Mega Bank (नेपाल इन्भेष्टमेन्ट मेगा बैंक)', branch: 'Gaur Branch' },
  { bankName: 'Garima Bikas Bank (गरिमा विकास बैंक)', branch: 'Garuda Branch' },
  { bankName: 'Muktinath Bikas Bank (मुक्तिनाथ विकास बैंक)', branch: 'Garuda Branch' },
  { bankName: 'Kamana Sewa Bikas Bank (कामना सेवा विकास बैंक)', branch: 'Garuda Branch' },
  { bankName: 'Shine Resunga Development Bank (शाइन रेसुङ्गा विकास बैंक)', branch: 'Branch' },
  { bankName: 'Jyoti Bikas Bank (ज्योति विकास बैंक)', branch: 'Garuda Branch' },
  { bankName: 'Lumbini Bikas Bank (लुम्बिनी विकास बैंक)', branch: 'Garuda Branch' },
  { bankName: 'Mahalaxmi Bikas Bank (महालक्ष्मी विकास बैंक)', branch: 'Garuda Branch' },
];

async function saveBankToDirectory(bankName, branch) {
  if (!bankName || !bankName.trim()) return;
  const name = bankName.trim();
  const br = branch && branch.trim() ? branch.trim() : null;
  try {
    const existing = await prisma.bankDirectory.findFirst({
      where: {
        bankName: { equals: name, mode: 'insensitive' },
        branch: br ? { equals: br, mode: 'insensitive' } : null,
      },
    });
    if (!existing) {
      await prisma.bankDirectory.create({
        data: { bankName: name, branch: br },
      });
    }
  } catch (err) {
    // Non-blocking
  }
}

// GET /api/teachers/banks/directory — Fetch all saved bank names and branches
router.get('/banks/directory', authenticate, async (req, res) => {
  try {
    let dbBanks = await prisma.bankDirectory.findMany({ orderBy: [{ bankName: 'asc' }, { branch: 'asc' }] }).catch(() => []);

    // Also collect all distinct banks & branches from TeacherBankAccount & Teacher
    const existingAccounts = await prisma.teacherBankAccount.findMany({
      select: { bankName: true, branch: true },
      where: { bankName: { not: '' } },
    }).catch(() => []);

    const existingTeacherBanks = await prisma.teacher.findMany({
      select: { bankName: true, bankBranch: true },
      where: { bankName: { not: null } },
    }).catch(() => []);

    const masterBanks = await prisma.staffMasterOption.findMany({
      where: { category: 'BANK_NAME', isActive: true },
    }).catch(() => []);

    // Combine and deduplicate
    const bankMap = new Map(); // bankName -> Set of branches

    // Seed master bank options
    masterBanks.forEach(mb => {
      const name = (mb.labelNp || mb.labelEn || mb.code).trim();
      if (name && !bankMap.has(name)) {
        bankMap.set(name, new Set());
      }
    });

    // Seed defaults / dbBanks
    dbBanks.forEach(b => {
      const bName = b.bankName.trim();
      if (!bankMap.has(bName)) bankMap.set(bName, new Set());
      if (b.branch && b.branch.trim()) bankMap.get(bName).add(b.branch.trim());
    });

    // Seed from teacher accounts
    existingAccounts.forEach(a => {
      if (a.bankName && a.bankName.trim()) {
        const bName = a.bankName.trim();
        if (!bankMap.has(bName)) bankMap.set(bName, new Set());
        if (a.branch && a.branch.trim()) bankMap.get(bName).add(a.branch.trim());
      }
    });

    existingTeacherBanks.forEach(t => {
      if (t.bankName && t.bankName.trim()) {
        const bName = t.bankName.trim();
        if (!bankMap.has(bName)) bankMap.set(bName, new Set());
        if (t.bankBranch && t.bankBranch.trim()) bankMap.get(bName).add(t.bankBranch.trim());
      }
    });

    const grouped = Array.from(bankMap.entries()).map(([bankName, branchSet]) => ({
      bankName,
      branches: Array.from(branchSet),
    })).sort((a, b) => a.bankName.localeCompare(b.bankName));

    const allBanks = grouped.map(g => g.bankName);
    const allBranchesSet = new Set();
    grouped.forEach(g => g.branches.forEach(br => allBranchesSet.add(br)));
    const allBranches = Array.from(allBranchesSet);

    return res.json({
      success: true,
      data: grouped,
      allBanks,
      allBranches,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch bank directory: ' + err.message });
  }
});

// POST /api/teachers/banks/directory — Add new bank & branch to directory
router.post('/banks/directory', authenticate, async (req, res) => {
  try {
    const { bankName, branch } = req.body;
    if (!bankName || !bankName.trim()) {
      return res.status(400).json({ success: false, message: 'बैंकको नाम आवश्यक छ।' });
    }
    await saveBankToDirectory(bankName, branch);
    return res.json({ success: true, message: 'बैंक तथा शाखा विवरण निर्देशिकामा सुरक्षित गरियो।' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to save bank: ' + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ─── 3. TEACHER MULTIPLE BANK ACCOUNTS CRUD ──────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/teachers/:id/bank-accounts
router.get('/:id/bank-accounts', authenticate, async (req, res) => {
  try {
    const teacherId = parseInt(req.params.id);
    if (isNaN(teacherId)) return res.status(400).json({ success: false, message: 'Invalid teacher ID' });

    const accounts = await prisma.teacherBankAccount.findMany({
      where: { teacherId },
      orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
    });
    return res.json({ success: true, data: accounts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/teachers/:id/bank-accounts - Add bank account
router.post('/:id/bank-accounts', authenticate, async (req, res) => {
  try {
    const teacherId = parseInt(req.params.id);
    if (isNaN(teacherId)) return res.status(400).json({ success: false, message: 'Invalid teacher ID' });

    if (req.user.role === 'TEACHER' && req.user.teacher?.id !== teacherId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { bankName, accountNumber, branch, accountType, isPrimary, remarks } = req.body;
    if (!bankName || !accountNumber) {
      return res.status(400).json({ success: false, message: 'बैंकको नाम र खाता नम्बर आवश्यक छ।' });
    }

    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });

    // Check existing accounts count
    const existingCount = await prisma.teacherBankAccount.count({ where: { teacherId } });
    const shouldBePrimary = isPrimary !== undefined ? Boolean(isPrimary) : (existingCount === 0);

    const result = await prisma.$transaction(async (tx) => {
      if (shouldBePrimary) {
        // Set all other accounts of this teacher to isPrimary = false
        await tx.teacherBankAccount.updateMany({
          where: { teacherId },
          data: { isPrimary: false },
        });
        // Sync primary bank info to teacher main profile
        try {
          await tx.teacher.update({
            where: { id: teacherId },
            data: {
              bankName,
              bankAccountNo: accountNumber,
              bankBranch: branch || null,
            },
          });
        } catch (syncErr) {
          console.warn('Sync to teacher main bank profile non-fatal:', syncErr.message);
        }
      }

      const account = await tx.teacherBankAccount.create({
        data: {
          teacherId,
          bankName,
          accountNumber,
          branch: branch || null,
          accountType: accountType || 'SALARY',
          isPrimary: shouldBePrimary,
          remarks: remarks || null,
        },
      });

      return account;
    });

    if (bankName) {
      saveBankToDirectory(bankName, branch).catch(() => {});
    }

    return res.status(201).json({ success: true, data: result, message: 'बैंक खाता सफलतापूर्वक थपियो।' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Bank account creation failed: ' + err.message });
  }
});

// PUT /api/teachers/:id/bank-accounts/:accountId - Update bank account
router.put('/:id/bank-accounts/:accountId', authenticate, async (req, res) => {
  try {
    const teacherId = parseInt(req.params.id);
    const accountId = parseInt(req.params.accountId);
    if (isNaN(teacherId) || isNaN(accountId)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    if (req.user.role === 'TEACHER' && req.user.teacher?.id !== teacherId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { bankName, accountNumber, branch, accountType, isPrimary, remarks } = req.body;
    const existing = await prisma.teacherBankAccount.findUnique({ where: { id: accountId } });
    if (!existing || existing.teacherId !== teacherId) {
      return res.status(404).json({ success: false, message: 'Bank account not found' });
    }

    const shouldBePrimary = Boolean(isPrimary);

    const result = await prisma.$transaction(async (tx) => {
      if (shouldBePrimary) {
        await tx.teacherBankAccount.updateMany({
          where: { teacherId, id: { not: accountId } },
          data: { isPrimary: false },
        });
        try {
          await tx.teacher.update({
            where: { id: teacherId },
            data: {
              bankName: bankName || existing.bankName,
              bankAccountNo: accountNumber || existing.accountNumber,
              bankBranch: branch !== undefined ? branch : existing.branch,
            },
          });
        } catch (syncErr) {
          console.warn('Sync to teacher main bank profile non-fatal:', syncErr.message);
        }
      }

      const updated = await tx.teacherBankAccount.update({
        where: { id: accountId },
        data: {
          bankName: bankName !== undefined ? bankName : existing.bankName,
          accountNumber: accountNumber !== undefined ? accountNumber : existing.accountNumber,
          branch: branch !== undefined ? branch : existing.branch,
          accountType: accountType !== undefined ? accountType : existing.accountType,
          isPrimary: shouldBePrimary,
          remarks: remarks !== undefined ? remarks : existing.remarks,
        },
      });

      return updated;
    });

    if (bankName || branch) {
      saveBankToDirectory(bankName || existing.bankName, branch !== undefined ? branch : existing.branch).catch(() => {});
    }

    return res.json({ success: true, data: result, message: 'बैंक खाता विवरण अद्यावधिक भयो।' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Update failed: ' + err.message });
  }
});

// PATCH /api/teachers/:id/bank-accounts/:accountId/primary - Set Primary
router.patch('/:id/bank-accounts/:accountId/primary', authenticate, async (req, res) => {
  try {
    const teacherId = parseInt(req.params.id);
    const accountId = parseInt(req.params.accountId);
    if (isNaN(teacherId) || isNaN(accountId)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    if (req.user.role === 'TEACHER' && req.user.teacher?.id !== teacherId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const targetAccount = await prisma.teacherBankAccount.findUnique({ where: { id: accountId } });
    if (!targetAccount || targetAccount.teacherId !== teacherId) {
      return res.status(404).json({ success: false, message: 'Bank account not found' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.teacherBankAccount.updateMany({
        where: { teacherId },
        data: { isPrimary: false },
      });
      await tx.teacherBankAccount.update({
        where: { id: accountId },
        data: { isPrimary: true },
      });
      try {
        await tx.teacher.update({
          where: { id: teacherId },
          data: {
            bankName: targetAccount.bankName,
            bankAccountNo: targetAccount.accountNumber,
            bankBranch: targetAccount.branch,
          },
        });
      } catch (syncErr) {
        console.warn('Sync to teacher main bank profile non-fatal:', syncErr.message);
      }
    });

    return res.json({ success: true, message: 'मुख्य तलब खाता (Primary Account) सेट गरियो।' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed: ' + err.message });
  }
});

// DELETE /api/teachers/:id/bank-accounts/:accountId - Delete bank account
router.delete('/:id/bank-accounts/:accountId', authenticate, async (req, res) => {
  try {
    const teacherId = parseInt(req.params.id);
    const accountId = parseInt(req.params.accountId);
    if (isNaN(teacherId) || isNaN(accountId)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    if (req.user.role === 'TEACHER' && req.user.teacher?.id !== teacherId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const account = await prisma.teacherBankAccount.findUnique({ where: { id: accountId } });
    if (!account || account.teacherId !== teacherId) {
      return res.status(404).json({ success: false, message: 'Bank account not found' });
    }

    await prisma.teacherBankAccount.delete({ where: { id: accountId } });

    // If it was primary, check if another account can be set as primary
    if (account.isPrimary) {
      const remaining = await prisma.teacherBankAccount.findFirst({
        where: { teacherId },
        orderBy: { id: 'asc' },
      });
      if (remaining) {
        await prisma.teacherBankAccount.update({
          where: { id: remaining.id },
          data: { isPrimary: true },
        });
        try {
          await prisma.teacher.update({
            where: { id: teacherId },
            data: {
              bankName: remaining.bankName,
              bankAccountNo: remaining.accountNumber,
              bankBranch: remaining.branch,
            },
          });
        } catch (e) {}
      } else {
        try {
          await prisma.teacher.update({
            where: { id: teacherId },
            data: {
              bankName: null,
              bankAccountNo: null,
              bankBranch: null,
            },
          });
        } catch (e) {}
      }
    }

    return res.json({ success: true, message: 'बैंक खाता हटाइयो।' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Delete failed: ' + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ─── 4. STATUS & INCHARGE ROLES ──────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// PATCH /api/teachers/:id/status - Update staff status (Active, Transferred, Retired, Resigned, Left)
router.patch('/:id/status', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const teacherId = parseInt(req.params.id);
    if (isNaN(teacherId)) return res.status(400).json({ success: false, message: 'Invalid teacher ID' });

    const { isActive, statusReason, dateOfRetirementBs, exitRemarks, disableLogin } = req.body;

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher/Staff not found.' });

    const isStaffActive = Boolean(isActive);

    const updatedTeacher = await prisma.$transaction(async (tx) => {
      const t = await tx.teacher.update({
        where: { id: teacherId },
        data: {
          isActive: isStaffActive,
          statusReason: statusReason !== undefined ? statusReason : (isStaffActive ? null : teacher.statusReason),
          exitRemarks: exitRemarks !== undefined ? exitRemarks : (isStaffActive ? null : teacher.exitRemarks),
          dateOfRetirementBs: dateOfRetirementBs !== undefined ? dateOfRetirementBs : (isStaffActive ? null : teacher.dateOfRetirementBs),
        },
      });

      // If retiring/transferring out, safely unassign as active class teacher
      if (!isStaffActive) {
        await tx.class.updateMany({
          where: { classTeacherId: teacherId },
          data: { classTeacherId: null },
        });
      }

      // Handle User Portal Login status
      if (teacher.userId) {
        const shouldUserBeActive = isStaffActive ? (disableLogin !== true) : (disableLogin === false);
        await tx.user.update({
          where: { id: teacher.userId },
          data: { isActive: shouldUserBeActive },
        });
      }

      return t;
    });

    return res.json({
      success: true,
      data: updatedTeacher,
      message: isStaffActive
        ? 'शिक्षक/कर्मचारी पुनः कार्यरत (Active) सेवामा अद्यावधिक गरियो।'
        : `शिक्षक/कर्मचारीको स्थिति अद्यावधिक गरियो (${statusReason || 'सरुवा/अवकाश'})।`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Status update failed: ' + err.message });
  }
});

// POST /api/teachers/:id/assign-role - Assign Special Incharge Roles (Checkboxes) & auto create tasks
router.post('/:id/assign-role', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const teacherId = parseInt(req.params.id);
    if (isNaN(teacherId)) return res.status(400).json({ success: false, message: 'Invalid teacher ID' });

    const { inchargeRoles, inchargeRole, inchargeTitle, autoCreateTasks, dueDateBs } = req.body;

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });
    if (!teacher) return res.status(404).json({ success: false, message: 'Staff member not found.' });

    // Extract roles array from multi-select checkboxes or string
    let rolesArray = [];
    if (Array.isArray(inchargeRoles)) {
      rolesArray = inchargeRoles.filter(Boolean);
    } else if (typeof inchargeRole === 'string' && inchargeRole.trim() && inchargeRole !== 'NONE') {
      rolesArray = inchargeRole.split(',').map(r => r.trim()).filter(Boolean);
    }

    const rolesString = rolesArray.length > 0 ? rolesArray.join(',') : null;

    // Update teacher record
    const updated = await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        inchargeRole: rolesString,
        inchargeTitle: inchargeTitle || null,
      },
    });

    // Ensure teacher's user account ALWAYS maintains TEACHER portal access
    if (teacher.userId) {
      const userRec = await prisma.user.findUnique({ where: { id: teacher.userId } });
      if (userRec && userRec.role !== 'SUPER_ADMIN' && userRec.role !== 'ADMIN') {
        await prisma.user.update({
          where: { id: teacher.userId },
          data: { role: 'TEACHER' },
        });
      }
    }

    // Auto-create standard tasks for ALL selected roles
    let createdTasksCount = 0;
    if (autoCreateTasks && rolesArray.length > 0) {
      const allNewTasks = [];
      for (const r of rolesArray) {
        if (DEFAULT_INCHARGE_TASKS[r]) {
          allNewTasks.push(...DEFAULT_INCHARGE_TASKS[r]);
        }
      }

      if (allNewTasks.length > 0) {
        const created = await prisma.$transaction(
          allNewTasks.map((tpl) =>
            prisma.staffTask.create({
              data: {
                title: tpl.title,
                description: tpl.description,
                category: tpl.category,
                priority: tpl.priority,
                status: 'PENDING',
                assignedToId: teacherId,
                assignedById: req.user.id,
                dueDateBs: dueDateBs || undefined,
              },
            })
          )
        );
        createdTasksCount = created.length;
      }
    }

    return res.json({
      success: true,
      data: updated,
      createdTasksCount,
      message: rolesArray.length > 0
        ? `विशेष जिम्मेवारी (${rolesArray.length}) सफलतापूर्वक तोकियो।${createdTasksCount > 0 ? ` ${createdTasksCount} वटा कार्यहरू सिर्जना गरियो।` : ''}`
        : 'विशेष जिम्मेवारी हटाइयो।',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Incharge role assignment failed: ' + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ─── 5. SINGLE TEACHER CRUD (BY ID) ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/teachers/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const teacherId = parseInt(req.params.id);
    if (isNaN(teacherId)) return next();

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        user: { select: { id: true, username: true, role: true, isActive: true } },
        subjects: { include: { subject: true } },
        classTeacherOf: true,
        bankAccounts: { orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }] },
        peshkis: {
          include: {
            settlements: {
              include: { payroll: { select: { id: true, monthFrom: true, monthTo: true } } },
              orderBy: { id: 'desc' },
            },
            financialYear: true,
            bankAccount: true,
          },
          orderBy: { id: 'desc' },
        },
        payrolls: { orderBy: { createdAt: 'desc' }, take: 10 },
        tasks: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!teacher) return res.status(404).json({ success: false, message: 'Staff/Teacher not found.' });
    return res.json({ success: true, data: teacher });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// PUT /api/teachers/:id
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const teacherId = parseInt(req.params.id);
    if (isNaN(teacherId)) return next();

    if (req.user.role === 'TEACHER' && req.user.teacher?.id !== teacherId) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only edit your own details.' });
    }

    const { subjectIds, role, bankName, bankAccountNo, bankBranch, ...rest } = req.body;

    const validFields = [
      'fullName', 'fullNameNepali', 'gender', 'bloodGroup', 'dateOfBirthBs', 'address',
      'phone', 'email', 'panNo', 'sanchayaKoshNo', 'nagarikLaganiKoshNo', 'citizenshipNo',
      'type', 'isTeachingStaff', 'taha', 'shreni', 'post', 'designation', 'photoUrl',
      'inchargeRole', 'inchargeTitle', 'dateOfJoiningBs', 'dateOfRetirementBs',
      'statusReason', 'exitRemarks', 'isActive', 'displayOrder',
    ];

    const updateData = {};
    for (const key of Object.keys(rest)) {
      if (validFields.includes(key)) {
        if (key === 'displayOrder') {
          updateData[key] = rest[key] !== null && rest[key] !== undefined && rest[key] !== '' ? parseInt(rest[key]) : 0;
        } else {
          updateData[key] = rest[key];
        }
      }
    }

    if (bankName !== undefined) updateData.bankName = bankName || null;
    if (bankAccountNo !== undefined) updateData.bankAccountNo = bankAccountNo || null;
    if (bankBranch !== undefined) updateData.bankBranch = bankBranch || null;

    let teacher;
    try {
      teacher = await prisma.teacher.update({
        where: { id: teacherId },
        data: updateData,
      });
    } catch (updateErr) {
      if (updateErr.message && (updateErr.message.includes('Unknown argument') || updateErr.message.includes('bankName') || updateErr.message.includes('bankAccountNo') || updateErr.message.includes('bankBranch'))) {
        delete updateData.bankName;
        delete updateData.bankAccountNo;
        delete updateData.bankBranch;
        teacher = await prisma.teacher.update({
          where: { id: teacherId },
          data: updateData,
        });
      } else {
        throw updateErr;
      }
    }

    // Also sync to TeacherBankAccount table if bank info was supplied
    if (bankName && bankAccountNo) {
      try {
        const existingPrimary = await prisma.teacherBankAccount.findFirst({
          where: { teacherId, isPrimary: true },
        });
        if (existingPrimary) {
          await prisma.teacherBankAccount.update({
            where: { id: existingPrimary.id },
            data: {
              bankName,
              accountNumber: bankAccountNo,
              branch: bankBranch || null,
            },
          });
        } else {
          const anyAcc = await prisma.teacherBankAccount.findFirst({
            where: { teacherId },
          });
          if (anyAcc) {
            await prisma.teacherBankAccount.update({
              where: { id: anyAcc.id },
              data: {
                bankName,
                accountNumber: bankAccountNo,
                branch: bankBranch || null,
                isPrimary: true,
              },
            });
          } else {
            await prisma.teacherBankAccount.create({
              data: {
                teacherId,
                bankName,
                accountNumber: bankAccountNo,
                branch: bankBranch || null,
                accountType: 'SALARY',
                isPrimary: true,
              },
            });
          }
        }
      } catch (bankErr) {
        console.warn('TeacherBankAccount sync warning:', bankErr.message);
      }

      saveBankToDirectory(bankName, bankBranch).catch(() => {});
    }

    if (role && teacher.userId && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN')) {
      await prisma.user.update({
        where: { id: teacher.userId },
        data: { role },
      });
    }

    if (rest.isActive !== undefined && teacher.userId && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN')) {
      await prisma.user.update({
        where: { id: teacher.userId },
        data: { isActive: Boolean(rest.isActive) },
      });
      if (!rest.isActive) {
        await prisma.class.updateMany({
          where: { classTeacherId: teacherId },
          data: { classTeacherId: null },
        });
      }
    }

    if (subjectIds !== undefined && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN')) {
      await prisma.teacherSubject.deleteMany({ where: { teacherId: teacher.id } });
      if (Array.isArray(subjectIds) && subjectIds.length > 0) {
        await prisma.teacherSubject.createMany({
          data: subjectIds.map(sid => ({ teacherId: teacher.id, subjectId: parseInt(sid) })),
        });
      }
    }

    return res.json({ success: true, data: teacher, message: 'Staff details updated successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Update failed: ' + err.message });
  }
});

// POST /api/teachers/bulk-reorder - Update display order for multiple teachers in one request
router.post('/bulk-reorder', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { items } = req.body; // Array of { id: number, displayOrder: number }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'पुनर्क्रम सूची (items array) आवश्यक छ।' });
    }

    const updates = items.map((item) => {
      const id = parseInt(item.id);
      const displayOrder = parseInt(item.displayOrder) || 0;
      return prisma.teacher.update({
        where: { id },
        data: { displayOrder },
      });
    });

    await prisma.$transaction(updates);

    return res.json({ success: true, message: 'शिक्षकहरूको क्रम सफलतापूर्वक अद्यावधिक गरियो।' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Bulk reorder failed: ' + err.message });
  }
});

// PATCH /api/teachers/:id/display-order - Update single teacher display order
router.patch('/:id/display-order', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const teacherId = parseInt(req.params.id);
    if (isNaN(teacherId)) return res.status(400).json({ success: false, message: 'Invalid teacher ID' });

    const displayOrder = req.body.displayOrder !== undefined ? parseInt(req.body.displayOrder) || 0 : 0;

    const updated = await prisma.teacher.update({
      where: { id: teacherId },
      data: { displayOrder },
    });

    return res.json({
      success: true,
      data: updated,
      message: `क्रम नं. अद्यावधिक गरियो (${displayOrder})।`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Update failed: ' + err.message });
  }
});

// DELETE /api/teachers/:id
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res, next) => {
  try {
    const teacherId = parseInt(req.params.id);
    if (isNaN(teacherId)) return next();

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        payrolls: true,
        classTeacherOf: true,
        subjects: true,
        user: true,
      },
    });
    if (!teacher) return res.status(404).json({ success: false, message: 'Staff/Teacher not found.' });

    // Block deletion if active payroll records exist
    if (teacher.payrolls && teacher.payrolls.length > 0) {
      return res.status(400).json({
        success: false,
        message: `यो शिक्षक/कर्मचारीको ${teacher.payrolls.length} वटा तलब विवरण (Payroll Records) दर्ता छ। पहिले तलब रेकर्ड हटाउनुहोस् वा सरुवा/अवकाश (Transferred/Retired) स्थिति सेट गर्नुहोस्।`,
      });
    }

    // Unassign class teacher role
    if (teacher.classTeacherOf && teacher.classTeacherOf.length > 0) {
      await prisma.class.updateMany({
        where: { classTeacherId: teacherId },
        data: { classTeacherId: null },
      });
    }

    // Delete associated subjects
    await prisma.teacherSubject.deleteMany({ where: { teacherId } });

    // Delete associated bank accounts
    await prisma.teacherBankAccount.deleteMany({ where: { teacherId } });

    // Delete staff tasks
    await prisma.staffTask.deleteMany({ where: { assignedToId: teacherId } });

    // Delete teacher record
    await prisma.teacher.delete({ where: { id: teacherId } });

    // Delete user account if associated
    if (teacher.userId) {
      await prisma.user.delete({ where: { id: teacher.userId } }).catch(() => {});
    }

    return res.json({ success: true, message: 'Staff/Teacher removed successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
