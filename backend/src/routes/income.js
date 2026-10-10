const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { resolveFinancialYearByDate, resolveAcademicYearForFinance } = require('./financialYears');

const router = express.Router();

// Force no HTTP caching on any income/fee route
router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// ── FEE COLLECTIONS DELETE & EDIT (TOP PRIORITY) ───────────────────────────
const deleteFeeCollectionHandler = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    await prisma.feeCollection.delete({ where: { id } });
    return res.json({ success: true, message: 'Fee collection deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.delete('/fee-collections/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), deleteFeeCollectionHandler);
router.post('/fee-collections/:id/delete', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), deleteFeeCollectionHandler);

router.post('/fee-collections-delete-direct', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const id = parseInt(req.body.id || req.body.feeCollectionId);
    if (!id || isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid receipt ID.' });
    await prisma.feeCollection.delete({ where: { id } });
    return res.json({ success: true, message: 'Fee collection deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/fee-collections/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const {
      amount,
      paidDateBs,
      paidDateAd,
      studentId,
      feeHeadId,
      academicYearId,
      financialYearId,
      collectedBy,
      depositedInAccount,
      paymentMedium,
      paymentRef,
      chequePayeeName,
      remarks,
    } = req.body;

    const updateData = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (paidDateBs !== undefined) updateData.paidDateBs = String(paidDateBs).trim();
    if (paidDateAd) updateData.paidDateAd = new Date(paidDateAd);
    if (studentId !== undefined) updateData.studentId = parseInt(studentId);
    if (feeHeadId !== undefined) updateData.feeHeadId = parseInt(feeHeadId);
    if (academicYearId !== undefined) updateData.academicYearId = academicYearId ? parseInt(academicYearId) : null;
    if (financialYearId !== undefined) updateData.financialYearId = financialYearId ? parseInt(financialYearId) : null;
    if (collectedBy !== undefined) updateData.collectedBy = collectedBy ? String(collectedBy).trim() : null;
    if (depositedInAccount !== undefined) updateData.depositedInAccount = depositedInAccount ? String(depositedInAccount).trim() : null;
    if (paymentMedium !== undefined) updateData.paymentMedium = paymentMedium ? String(paymentMedium).trim() : null;
    if (paymentRef !== undefined) updateData.paymentRef = paymentRef ? String(paymentRef).trim() : null;
    if (chequePayeeName !== undefined) updateData.chequePayeeName = chequePayeeName ? String(chequePayeeName).trim() : null;
    if (remarks !== undefined) updateData.remarks = remarks ? String(remarks).trim() : null;

    const collection = await prisma.feeCollection.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: { student: true, feeHead: true },
    });
    return res.json({ success: true, data: collection, message: 'Fee collection updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── INCOME CATEGORIES ──────────────────────────────────────────────────────

router.get('/categories', authenticate, async (req, res) => {
  const cats = await prisma.incomeCategory.findMany({
    where: { isActive: true },
    include: { incomeHeads: { where: { isActive: true } } },
    orderBy: { name: 'asc' },
  });
  return res.json({ success: true, data: cats });
});

router.post('/categories', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { name, nameNepali, type, description, isActive } = req.body;
    let cat;
    try {
      cat = await prisma.incomeCategory.create({
        data: {
          name: name ? String(name).trim() : '',
          nameNepali: nameNepali ? String(nameNepali).trim() : null,
          type: type || 'OWN_SOURCE',
          description: description ? String(description).trim() : null,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        },
      });
    } catch (createErr) {
      if (createErr.code === 'P2002' || createErr.message?.includes('id') || createErr.message?.includes('Unique constraint')) {
        const maxRes = await prisma.incomeCategory.aggregate({ _max: { id: true } });
        const nextId = (maxRes._max.id || 0) + 1;
        cat = await prisma.incomeCategory.create({
          data: {
            id: nextId,
            name: name ? String(name).trim() : '',
            nameNepali: nameNepali ? String(nameNepali).trim() : null,
            type: type || 'OWN_SOURCE',
            description: description ? String(description).trim() : null,
            isActive: isActive !== undefined ? Boolean(isActive) : true,
          },
        });
      } else {
        throw createErr;
      }
    }
    return res.status(201).json({ success: true, data: cat, message: 'Income Category created.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/categories/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { name, nameNepali, type, description, isActive } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name ? String(name).trim() : '';
    if (nameNepali !== undefined) updateData.nameNepali = nameNepali ? String(nameNepali).trim() : null;
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description ? String(description).trim() : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const cat = await prisma.incomeCategory.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
    });
    return res.json({ success: true, data: cat, message: 'Category updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/categories/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.incomeCategory.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Income Category deleted/deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/categories/:id/delete', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.incomeCategory.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Income Category deleted/deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── INCOME HEADS ──────────────────────────────────────────────────────────

router.get('/heads', authenticate, async (req, res) => {
  const heads = await prisma.incomeHead.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { name: 'asc' },
  });
  return res.json({ success: true, data: heads });
});

router.post('/heads', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { name, nameNepali, code, categoryId, isActive } = req.body;
    let head;
    try {
      head = await prisma.incomeHead.create({
        data: {
          name,
          nameNepali: nameNepali || null,
          code: code ? String(code).trim() : null,
          categoryId: parseInt(categoryId),
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        },
        include: { category: true },
      });
    } catch (createErr) {
      if (createErr.code === 'P2002' || createErr.message?.includes('id') || createErr.message?.includes('Unique constraint')) {
        // Heal sequence and retry with max ID + 1
        const maxRes = await prisma.incomeHead.aggregate({ _max: { id: true } });
        const nextId = (maxRes._max.id || 0) + 1;
        head = await prisma.incomeHead.create({
          data: {
            id: nextId,
            name,
            nameNepali: nameNepali || null,
            code: code ? String(code).trim() : null,
            categoryId: parseInt(categoryId),
            isActive: isActive !== undefined ? Boolean(isActive) : true,
          },
          include: { category: true },
        });
      } else {
        throw createErr;
      }
    }
    return res.status(201).json({ success: true, data: head, message: 'Income Head created.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/heads/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { name, nameNepali, code, categoryId, isActive } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (nameNepali !== undefined) updateData.nameNepali = nameNepali || null;
    if (code !== undefined) updateData.code = code ? String(code).trim() : null;
    if (categoryId !== undefined) updateData.categoryId = parseInt(categoryId);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const head = await prisma.incomeHead.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: { category: true },
    });
    return res.json({ success: true, data: head, message: 'Income Head updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});


router.delete('/heads/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.incomeHead.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Income Head deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/heads/:id/delete', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.incomeHead.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Income Head deleted/deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── FEE HEADS ──────────────────────────────────────────────────────────────

router.get('/fee-heads', authenticate, async (req, res) => {
  const heads = await prisma.feeHead.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  return res.json({ success: true, data: heads });
});

router.post('/fee-heads', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { name, nameNepali, amount, isOptional, isActive, incomeHeadId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Fee Head name is required.' });
    }
    const fh = await prisma.feeHead.create({
      data: {
        name: String(name).trim(),
        nameNepali: nameNepali ? String(nameNepali).trim() : null,
        amount: parseFloat(amount || 0),
        isOptional: Boolean(isOptional),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        incomeHeadId: incomeHeadId ? parseInt(incomeHeadId) : undefined,
      },
    });

    // Auto-link new Fee Head to all classes in ClassFeeStructure
    const allClasses = await prisma.class.findMany();
    for (const c of allClasses) {
      await prisma.classFeeStructure.upsert({
        where: { classId_feeHeadId: { classId: c.id, feeHeadId: fh.id } },
        update: {},
        create: { classId: c.id, feeHeadId: fh.id, amount: fh.amount },
      });
    }

    return res.status(201).json({ success: true, data: fh, message: 'Fee Head created and linked to all classes.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/fee-heads/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { name, nameNepali, amount, isOptional, isActive, incomeHeadId } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (nameNepali !== undefined) updateData.nameNepali = nameNepali ? String(nameNepali).trim() : null;
    if (amount !== undefined) updateData.amount = parseFloat(amount || 0);
    if (isOptional !== undefined) updateData.isOptional = Boolean(isOptional);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (incomeHeadId !== undefined) updateData.incomeHeadId = incomeHeadId ? parseInt(incomeHeadId) : null;

    const fh = await prisma.feeHead.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
    });
    return res.json({ success: true, data: fh, message: 'Fee Head updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/fee-heads/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.feeHead.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Fee Head deleted/deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/fee-heads/:id/delete', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.feeHead.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Fee Head deleted/deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── FEE COLLECTIONS ───────────────────────────────────────────────────────

router.get('/fee-collections', authenticate, async (req, res) => {
  try {
    const { studentId, feeHeadId, academicYearId, financialYearId, from, to, page = 1, limit = 200 } = req.query;
    const where = {};
    if (studentId) where.studentId = parseInt(studentId);
    if (feeHeadId) where.feeHeadId = parseInt(feeHeadId);
    if (financialYearId) where.financialYearId = parseInt(financialYearId);
    else if (academicYearId) where.academicYearId = parseInt(academicYearId);

    if (from || to) {
      where.paidDateBs = {};
      if (from) where.paidDateBs.gte = from;
      if (to) where.paidDateBs.lte = to;
    }
    const [collections, total] = await Promise.all([
      prisma.feeCollection.findMany({
        where,
        include: { student: true, feeHead: true, academicYear: true, financialYear: true },
        orderBy: { paidDateAd: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.feeCollection.count({ where }),
    ]);
    const agg = await prisma.feeCollection.aggregate({ where, _sum: { amount: true } });
    return res.json({ success: true, data: collections, total, totalAmount: agg._sum.amount || 0 });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/fee-collections', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    // Generate receipt no
    const count = await prisma.feeCollection.count();
    const receiptNo = `RCP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    const {
      studentId,
      feeHeadId,
      amount,
      paidDateBs,
      paidDateAd,
      academicYearId,
      financialYearId,
      collectedBy,
      depositedInAccount,
      paymentMedium,
      paymentRef,
      chequePayeeName,
      remarks,
      feeDueId,
      previousReceiptId,
    } = req.body;

    let resolvedFyId = financialYearId ? parseInt(financialYearId) : null;
    if (!resolvedFyId && paidDateBs) {
      const resolved = await resolveFinancialYearByDate(paidDateBs);
      if (resolved) resolvedFyId = resolved.id;
    }

    const collection = await prisma.feeCollection.create({
      data: {
        studentId: parseInt(studentId),
        feeHeadId: parseInt(feeHeadId),
        amount: parseFloat(amount || 0),
        paidDateBs: paidDateBs ? String(paidDateBs).trim() : '',
        paidDateAd: new Date(paidDateAd || new Date()),
        academicYearId: academicYearId ? parseInt(academicYearId) : undefined,
        financialYearId: resolvedFyId,
        receiptNo,
        collectedBy: collectedBy ? String(collectedBy).trim() : req.user.username,
        depositedInAccount: depositedInAccount ? String(depositedInAccount).trim() : null,
        paymentMedium: paymentMedium ? String(paymentMedium).trim() : 'CASH',
        paymentRef: paymentRef ? String(paymentRef).trim() : null,
        chequePayeeName: chequePayeeName ? String(chequePayeeName).trim() : null,
        remarks: remarks ? String(remarks).trim() : null,
      },
      include: { student: true, feeHead: true, financialYear: true },
    });

    // If this payment is a due settlement for a previous receipt, update previous receipt to mark due settled
    if (previousReceiptId) {
      try {
        const prev = await prisma.feeCollection.findUnique({ where: { id: parseInt(previousReceiptId) } });
        if (prev) {
          const updatedRemarks = prev.remarks
            ? prev.remarks.replace(/Due:\s*(?:Rs\.|रू)?\s*[\d,.]+/gi, `Due: Rs. 0 [Settled by ${receiptNo}]`)
            : `[Settled by ${receiptNo} | Due: Rs. 0]`;
          await prisma.feeCollection.update({
            where: { id: parseInt(previousReceiptId) },
            data: { remarks: updatedRemarks },
          });
        }
      } catch (prevErr) {
        console.error('Failed to update previous due receipt:', prevErr);
      }
    }

    // Also check if remarks reference a previous receipt number (Ref Receipt: RCP-XXXX)
    const refMatch = (rest.remarks || '').match(/Ref Receipt:\s*(RCP-[\w-]+)/i);
    if (refMatch && refMatch[1]) {
      try {
        const refRec = await prisma.feeCollection.findFirst({ where: { receiptNo: refMatch[1] } });
        if (refRec && (!previousReceiptId || refRec.id !== parseInt(previousReceiptId))) {
          const updatedRemarks = refRec.remarks
            ? refRec.remarks.replace(/Due:\s*(?:Rs\.|रू)?\s*[\d,.]+/gi, `Due: Rs. 0 [Settled by ${receiptNo}]`)
            : `[Settled by ${receiptNo} | Due: Rs. 0]`;
          await prisma.feeCollection.update({
            where: { id: refRec.id },
            data: { remarks: updatedRemarks },
          });
        }
      } catch (refErr) {
        console.error('Failed to update referenced receipt:', refErr);
      }
    }

    // Mark corresponding fee due as paid if feeDueId passed
    if (feeDueId) {
      await prisma.studentFeeDue.update({
        where: { id: parseInt(feeDueId) },
        data: { isPaid: true, paidAmount: parseFloat(rest.amount) },
      }).catch(() => {});
    }

    // Automatically dispatch individual notice notification to student portal
    try {
      const feeHead = await prisma.feeHead.findUnique({ where: { id: parseInt(rest.feeHeadId) } });
      const headTitle = feeHead?.name || 'School Fee';
      const payAmt = parseFloat(rest.amount);

      const matchDue = (rest.remarks || '').match(/Due:\s*(?:Rs\.|रू)?\s*([\d,.]+)/i);
      const remDue = matchDue ? parseFloat(matchDue[1].replace(/,/g, '')) : 0;

      const noticeTitle = remDue > 0
        ? `💰 शुल्क भुक्तानी रसिद प्राप्त भयो (रसिद नं: ${receiptNo})`
        : `🎉 शुल्क पूर्ण चुक्ता भयो (रसिद नं: ${receiptNo})`;

      const noticeBody = remDue > 0
        ? `तपाईंको '${headTitle}' शीर्षकमा मिति ${rest.paidDateBs || 'हालै'} मा रू ${payAmt.toLocaleString()} शुल्क भुक्तानी प्राप्त भएको छ। बाँकी तिर्नुपर्ने बक्यौता रकम: रू ${remDue.toLocaleString()}। आधिकारिक रसिद नं: ${receiptNo}।`
        : `तपाईंको '${headTitle}' शीर्षकमा मिति ${rest.paidDateBs || 'हालै'} मा रू ${payAmt.toLocaleString()} शुल्क प्राप्त भई सम्पूर्ण बक्यौता चुक्ता भएको छ। आधिकारिक रसिद नं: ${receiptNo}।`;

      const createdFeeNotice = await prisma.notice.create({
        data: {
          title: noticeTitle,
          body: noticeBody,
          type: remDue > 0 ? 'FEE_REMINDER' : 'GENERAL',
          targetRole: 'STUDENT',
          targetStudentId: parseInt(rest.studentId),
          postedDateBs: rest.paidDateBs || new Date().toISOString().slice(0, 10),
          postedDateAd: new Date(),
          isAuto: true,
          isActive: true,
        },
      });

      const { dispatchNoticeNotifications } = require('../lib/notificationDispatcher');
      dispatchNoticeNotifications(createdFeeNotice).catch(() => {});
    } catch (noticeErr) {
      console.error('Failed to create automatic fee notice:', noticeErr);
    }

    return res.status(201).json({ success: true, data: collection, receiptNo });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── CLASS-WISE FEE STRUCTURE ────────────────────────────────────────────────
// GET /api/income/class-fee-structures/matrix/all — All classes fee matrix
router.get('/class-fee-structures/matrix/all', authenticate, async (req, res) => {
  try {
    const [classes, feeHeads, structures] = await Promise.all([
      prisma.class.findMany({ orderBy: { orderIndex: 'asc' } }),
      prisma.feeHead.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.classFeeStructure.findMany(),
    ]);

    const structMap = {};
    structures.forEach((cs) => {
      structMap[`${cs.classId}_${cs.feeHeadId}`] = cs.amount;
    });

    return res.json({
      success: true,
      data: {
        classes,
        feeHeads,
        structMap,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/income/class-fee-structures/:classId
router.get('/class-fee-structures/:classId', authenticate, async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);
    const feeHeads = await prisma.feeHead.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    const classStructures = await prisma.classFeeStructure.findMany({ where: { classId } });

    const structMap = {};
    classStructures.forEach((cs) => { structMap[cs.feeHeadId] = cs.amount; });

    const result = feeHeads.map((fh) => ({
      feeHeadId: fh.id,
      name: fh.name,
      nameNepali: fh.nameNepali,
      defaultAmount: fh.amount,
      classAmount: structMap[fh.id] !== undefined ? structMap[fh.id] : fh.amount,
    }));

    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/income/class-fee-structures
router.post('/class-fee-structures', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'HEAD_TEACHER', 'TEACHER'), async (req, res) => {
  try {
    const { classId, structures } = req.body; // structures: [{ feeHeadId, amount }] or array of { classId, feeHeadId, amount }
    
    if (Array.isArray(structures)) {
      for (const item of structures) {
        const targetClassId = parseInt(item.classId || classId);
        if (!targetClassId || !item.feeHeadId) continue;

        await prisma.classFeeStructure.upsert({
          where: { classId_feeHeadId: { classId: targetClassId, feeHeadId: parseInt(item.feeHeadId) } },
          update: { amount: parseFloat(item.amount || 0) },
          create: { classId: targetClassId, feeHeadId: parseInt(item.feeHeadId), amount: parseFloat(item.amount || 0) },
        });
      }
    }

    return res.json({ success: true, message: 'Class fee structure updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── MONTHLY FEE DUES GENERATOR ──────────────────────────────────────────────
// POST /api/income/fee-dues/generate-monthly
router.post('/fee-dues/generate-monthly', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { classId, monthBs, feeHeadId, dueDateBs, sendNotice } = req.body;
    if (!monthBs) {
      return res.status(400).json({ success: false, message: 'monthBs is required.' });
    }

    const targetClassId = classId && classId !== 'ALL' ? parseInt(classId) : null;
    
    // Fetch active fee heads to generate
    let feeHeadsToProcess = [];
    if (feeHeadId && feeHeadId !== 'ALL') {
      const parsedHeadId = parseInt(feeHeadId);
      if (!isNaN(parsedHeadId)) {
        const fh = await prisma.feeHead.findUnique({ where: { id: parsedHeadId } });
        if (fh) feeHeadsToProcess.push(fh);
      }
    }

    if (feeHeadsToProcess.length === 0) {
      // Default: Find all active fee heads
      feeHeadsToProcess = await prisma.feeHead.findMany({ where: { isActive: true } });
    }

    if (feeHeadsToProcess.length === 0) {
      return res.status(400).json({ success: false, message: 'No active Fee Heads found to generate dues. Please add Fee Heads first.' });
    }

    // Fetch active enrollments
    const enrollmentsWhere = { isActive: true };
    if (targetClassId) enrollmentsWhere.classId = targetClassId;

    const enrollments = await prisma.classEnrollment.findMany({
      where: enrollmentsWhere,
      include: {
        student: { select: { id: true, fullName: true, guardianContact: true, classEnrollment: { include: { class: true } } } },
        class: true,
      },
    });

    if (enrollments.length === 0) {
      return res.status(400).json({ success: false, message: 'No enrolled active students found in the selected class.' });
    }

    let generatedCount = 0;
    for (const enroll of enrollments) {
      for (const feeHead of feeHeadsToProcess) {
        // Find class-specific fee or default fee
        const classStruct = await prisma.classFeeStructure.findUnique({
          where: { classId_feeHeadId: { classId: enroll.classId, feeHeadId: feeHead.id } },
        });
        const amount = classStruct ? classStruct.amount : feeHead.amount;

        // Skip optional 0-amount fee heads
        if (amount <= 0 && feeHead.isOptional) continue;

        // Check if due already exists
        const existing = await prisma.studentFeeDue.findFirst({
          where: { studentId: enroll.studentId, feeHeadId: feeHead.id, monthBs },
        });

        if (!existing) {
          await prisma.studentFeeDue.create({
            data: {
              studentId: enroll.studentId,
              feeHeadId: feeHead.id,
              monthBs,
              amount,
              dueDateBs: dueDateBs || `${monthBs}-30`,
              remarks: `Monthly Fee (${feeHead.name}) for ${monthBs}`,
            },
          });
          generatedCount++;

          // Send Fee Reminder Notice if requested
          if (sendNotice) {
            await prisma.notice.create({
              data: {
                title: `Fee Due Alert — ${monthBs} (${feeHead.name})`,
                body: `Dear Parent/Guardian, ${feeHead.name} of Rs. ${amount} for ${monthBs} is due for ${enroll.student.fullName}. Please clear dues online or at school office.`,
                type: 'FEE_REMINDER',
                targetStudentId: enroll.studentId,
                isAutomatic: true,
                postedDateBs: monthBs + '-15',
              },
            }).catch(() => {});
          }
        }
      }
    }

    return res.json({
      success: true,
      message: `Successfully generated fee dues for ${generatedCount} student fee records for ${monthBs}!`,
      generatedCount,
    });
  } catch (err) {
    console.error('Error generating monthly fee dues:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── STUDENT PAYMENT LEDGER (STATEMENT OF ACCOUNT) ───────────────────────────
// GET /api/income/student-ledger/:studentId
router.get('/student-ledger/:studentId', authenticate, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    if (!studentId || isNaN(studentId)) {
      return res.status(400).json({ success: false, message: 'Valid Student ID is required.' });
    }

    // FIX H-06: Authorization check - students may only inspect their own ledger
    if (req.user.role === 'STUDENT' && (!req.user.student || req.user.student.id !== studentId)) {
      return res.status(403).json({ success: false, message: 'You can only view your own student fee ledger.' });
    }

    const [dues, collections, student] = await Promise.all([
      prisma.studentFeeDue.findMany({
        where: { studentId },
        include: { feeHead: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.feeCollection.findMany({
        where: { studentId },
        include: { feeHead: true },
        orderBy: { paidDateAd: 'asc' },
      }),
      prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, fullName: true, fullNameNepali: true, studentId: true, phone: true, guardianContact: true },
      }),
    ]);

    // Build unified chronological ledger entries
    const duesHeadSet = new Set(dues.map(d => d.feeHeadId));
    const ledgerEntries = [];

    dues.forEach((d) => {
      ledgerEntries.push({
        id: `DUE-${d.id}`,
        dateBs: d.monthBs || d.createdAt.toISOString().slice(0, 10),
        type: 'DUE',
        particulars: `${d.feeHead?.name || 'Fee Billed'} ${d.monthBs ? `(${d.monthBs})` : ''}`,
        billedAmount: d.amount,
        paidAmount: 0,
        isPaid: d.isPaid,
        remarks: d.remarks || 'Billed Fee Due',
        createdAt: d.createdAt,
      });
    });

    collections.forEach((c) => {
      const hasSeparateDue = duesHeadSet.has(c.feeHeadId);
      
      const matchTotal = (c.remarks || '').match(/Total:\s*(?:Rs\.|रू)?\s*([\d,.]+)/i);
      const matchDisc = (c.remarks || '').match(/Disc:\s*(?:Rs\.|रू)?\s*([\d,.]+)/i);
      const matchDue = (c.remarks || '').match(/Due:\s*(?:Rs\.|रू)?\s*([\d,.]+)/i);

      const totalFee = matchTotal ? parseFloat(matchTotal[1].replace(/,/g, '')) : c.amount;
      const discount = matchDisc ? parseFloat(matchDisc[1].replace(/,/g, '')) : 0;
      const remainingDue = matchDue ? parseFloat(matchDue[1].replace(/,/g, '')) : Math.max(0, totalFee - discount - c.amount);

      const implicitBilled = hasSeparateDue ? 0 : Math.max(totalFee - discount, c.amount + remainingDue);

      ledgerEntries.push({
        id: `PAY-${c.id}`,
        dateBs: c.paidDateBs,
        type: 'PAYMENT',
        particulars: `Receipt No: ${c.receiptNo} — ${c.feeHead?.name || 'Fee Payment'}`,
        billedAmount: implicitBilled,
        paidAmount: c.amount,
        remainingDue,
        paymentMedium: c.paymentMedium || 'CASH',
        receiptNo: c.receiptNo,
        remarks: c.remarks || 'Fee Paid',
        createdAt: c.paidDateAd,
      });
    });

    // Sort chronologically
    ledgerEntries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Calculate Running Balance
    let runningBalance = 0;
    const items = ledgerEntries.map((e) => {
      runningBalance += e.billedAmount - e.paidAmount;
      return { ...e, runningBalance: Math.max(0, runningBalance) };
    });

    const totalBilled = items.reduce((sum, item) => sum + item.billedAmount, 0);
    const totalPaid = items.reduce((sum, item) => sum + item.paidAmount, 0);
    const netOutstanding = Math.max(0, totalBilled - totalPaid);

    return res.json({
      success: true,
      data: {
        student,
        items,
        totalBilled,
        totalPaid,
        netOutstanding,
        dues,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/income/online-pay — Student Online QR / Transfer Payment Submission
router.post('/online-pay', authenticate, async (req, res) => {
  try {
    const { studentId, feeHeadId, amount, paymentMedium, paymentRef, remarks } = req.body;
    const targetStudentId = parseInt(studentId);
    if (!targetStudentId || isNaN(targetStudentId)) {
      return res.status(400).json({ success: false, message: 'Valid Student ID is required.' });
    }

    // FIX H-05: Strict role & identity check
    if (req.user.role === 'STUDENT') {
      if (!req.user.student || req.user.student.id !== targetStudentId) {
        return res.status(403).json({ success: false, message: 'You can only submit online payments for your own student account.' });
      }
    } else if (!['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to record fee payments.' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount greater than zero is required.' });
    }

    const count = await prisma.feeCollection.count();
    const receiptNo = `ONLINE-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const collection = await prisma.feeCollection.create({
      data: {
        studentId: targetStudentId,
        feeHeadId: parseInt(feeHeadId),
        amount: parsedAmount,
        paidDateBs: req.body.paidDateBs ? String(req.body.paidDateBs).trim() : `${new Date().getFullYear() + 57}-01-01`,
        paidDateAd: new Date(),
        receiptNo,
        collectedBy: req.user.role === 'STUDENT' ? 'Student Online Portal' : (req.user.username || 'Finance Staff'),
        paymentMedium: paymentMedium ? String(paymentMedium).trim() : 'QR_CODE',
        paymentRef: paymentRef ? String(paymentRef).trim() : null,
        remarks: remarks ? String(remarks).trim() : 'Online Fee Submission',
      },
      include: { student: true, feeHead: true },
    });
    return res.status(201).json({ success: true, data: collection, message: 'Online payment submitted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── INCOME ENTRIES ────────────────────────────────────────────────────────
router.get('/entries', authenticate, async (req, res) => {
  try {
    const { academicYearId, financialYearId, headId, categoryId, partyId, from, to, q, page = 1, limit = 100 } = req.query;
    const where = {};
    if (financialYearId) where.financialYearId = parseInt(financialYearId);
    else if (academicYearId) where.academicYearId = parseInt(academicYearId);

    if (headId) where.headId = parseInt(headId);
    if (partyId) where.partyId = parseInt(partyId);
    if (categoryId) where.head = { categoryId: parseInt(categoryId) };
    if (from || to) {
      where.receivedDateBs = {};
      if (from) where.receivedDateBs.gte = from;
      if (to) where.receivedDateBs.lte = to;
    }
    if (q) {
      where.OR = [
        { sourceOrg: { contains: q } },
        { voucherNo: { contains: q } },
        { receivedBy: { contains: q } },
        { chequeNo: { contains: q } },
        { head: { name: { contains: q } } },
        { head: { code: { contains: q } } },
        { party: { name: { contains: q } } },
      ];
    }
    const [entries, total] = await Promise.all([
      prisma.incomeEntry.findMany({
        where,
        include: { head: { include: { category: true } }, academicYear: true, financialYear: true, party: true },
        orderBy: { receivedDateBs: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.incomeEntry.count({ where }),
    ]);
    const agg = await prisma.incomeEntry.aggregate({ where, _sum: { amount: true } });
    return res.json({ success: true, data: entries, total, totalAmount: agg._sum.amount || 0 });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/entries', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const {
      receivedDateAd,
      receivedDateBs,
      headId,
      academicYearId,
      financialYearId,
      partyId,
      bankAccountId,
      amount,
      sourceLevel,
      sourceOrg,
      depositedInAccount,
      receivedBy,
      paymentMedium,
      paymentRef,
      chequeNo,
      chequeDateBs,
      voucherNo,
      remarks,
    } = req.body;

    const parsedAmount = parseFloat(amount || 0);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'कृपया मान्य आम्दानी रकम प्रविष्टि गर्नुहोस् (Valid income amount is required).' });
    }

    // 1. Resolve and validate Income Head
    let safeHeadId = parseInt(headId);
    if (!safeHeadId || isNaN(safeHeadId)) {
      const defaultHead = await prisma.incomeHead.findFirst({ where: { isActive: true }, orderBy: { id: 'asc' } });
      if (defaultHead) {
        safeHeadId = defaultHead.id;
      } else {
        // Create a default category and head if none exists
        let cat = await prisma.incomeCategory.findFirst({ where: { isActive: true } });
        if (!cat) {
          cat = await prisma.incomeCategory.create({
            data: { name: 'Own Source', nameNepali: 'आफ्नै स्रोत', type: 'OWN_SOURCE', isActive: true },
          });
        }
        const createdHead = await prisma.incomeHead.create({
          data: { name: 'General Income', nameNepali: 'विविध आम्दानी', categoryId: cat.id, isActive: true },
        });
        safeHeadId = createdHead.id;
      }
    } else {
      const headExists = await prisma.incomeHead.findUnique({ where: { id: safeHeadId } });
      if (!headExists) {
        const defaultHead = await prisma.incomeHead.findFirst({ where: { isActive: true }, orderBy: { id: 'asc' } });
        if (defaultHead) safeHeadId = defaultHead.id;
      }
    }

    // 2. Resolve Financial Year safely
    let resolvedFyId = financialYearId && !isNaN(parseInt(financialYearId)) ? parseInt(financialYearId) : null;
    if (resolvedFyId) {
      const fyExists = await prisma.financialYear.findUnique({ where: { id: resolvedFyId } });
      if (!fyExists) resolvedFyId = null;
    }
    if (!resolvedFyId && receivedDateBs) {
      const resolved = await resolveFinancialYearByDate(receivedDateBs);
      if (resolved) resolvedFyId = resolved.id;
    }
    if (!resolvedFyId) {
      const activeFy = await prisma.financialYear.findFirst({ where: { isActive: true } }) || await prisma.financialYear.findFirst({ orderBy: { id: 'desc' } });
      if (activeFy) resolvedFyId = activeFy.id;
    }

    // 3. Resolve Academic Year safely
    const resolvedAyId = await resolveAcademicYearForFinance({
      academicYearId,
      financialYearId: resolvedFyId,
      dateBs: receivedDateBs,
    });

    // 4. Resolve Party safely (set to null if party was deleted or invalid)
    let safePartyId = null;
    let safeSourceOrg = sourceOrg ? String(sourceOrg).trim() : null;
    if (partyId && !isNaN(parseInt(partyId))) {
      const p = await prisma.party.findUnique({ where: { id: parseInt(partyId) } });
      if (p) {
        safePartyId = p.id;
        if (!safeSourceOrg) safeSourceOrg = p.name;
      }
    }

    // 5. Parse Dates
    let validReceivedDateAd = new Date();
    if (receivedDateAd && !isNaN(new Date(receivedDateAd).getTime())) {
      validReceivedDateAd = new Date(receivedDateAd);
    }
    const cleanDateBs = receivedDateBs ? String(receivedDateBs).trim() : '';

    const entry = await prisma.incomeEntry.create({
      data: {
        amount: parsedAmount,
        receivedDateBs: cleanDateBs,
        receivedDateAd: validReceivedDateAd,
        headId: safeHeadId,
        academicYearId: resolvedAyId,
        financialYearId: resolvedFyId,
        partyId: safePartyId,
        bankAccountId: bankAccountId && !isNaN(parseInt(bankAccountId)) ? parseInt(bankAccountId) : null,
        sourceLevel: sourceLevel ? String(sourceLevel).trim() : 'Other',
        sourceOrg: safeSourceOrg,
        depositedInAccount: depositedInAccount ? String(depositedInAccount).trim() : null,
        receivedBy: receivedBy ? String(receivedBy).trim() : null,
        paymentMedium: paymentMedium ? String(paymentMedium).trim() : 'CASH',
        paymentRef: paymentRef ? String(paymentRef).trim() : null,
        chequeNo: chequeNo ? String(chequeNo).trim() : null,
        chequeDateBs: chequeDateBs ? String(chequeDateBs).trim() : null,
        voucherNo: voucherNo ? String(voucherNo).trim() : null,
        remarks: remarks ? String(remarks).trim() : null,
      },
      include: { head: { include: { category: true } }, financialYear: true, party: true },
    });
    return res.status(201).json({ success: true, data: entry, message: 'Income entry saved successfully.' });
  } catch (err) {
    console.error('Error saving income entry:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to save income entry.' });
  }
});

router.put('/entries/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const entryId = parseInt(req.params.id);
    if (!entryId || isNaN(entryId)) {
      return res.status(400).json({ success: false, message: 'Invalid income entry ID.' });
    }

    const {
      receivedDateAd,
      receivedDateBs,
      headId,
      academicYearId,
      financialYearId,
      partyId,
      bankAccountId,
      amount,
      sourceLevel,
      sourceOrg,
      depositedInAccount,
      receivedBy,
      paymentMedium,
      paymentRef,
      chequeNo,
      chequeDateBs,
      voucherNo,
      remarks,
    } = req.body;

    const updateData = {};
    if (amount !== undefined) {
      const pAmt = parseFloat(amount);
      if (!isNaN(pAmt)) updateData.amount = pAmt;
    }
    if (receivedDateAd && !isNaN(new Date(receivedDateAd).getTime())) {
      updateData.receivedDateAd = new Date(receivedDateAd);
    }
    if (receivedDateBs !== undefined) updateData.receivedDateBs = String(receivedDateBs).trim();

    if (headId && !isNaN(parseInt(headId))) {
      const hExists = await prisma.incomeHead.findUnique({ where: { id: parseInt(headId) } });
      if (hExists) updateData.headId = hExists.id;
    }
    if (academicYearId && !isNaN(parseInt(academicYearId))) {
      const ayExists = await prisma.academicYear.findUnique({ where: { id: parseInt(academicYearId) } });
      if (ayExists) updateData.academicYearId = ayExists.id;
    }
    
    if (financialYearId !== undefined) {
      if (financialYearId && !isNaN(parseInt(financialYearId))) {
        const fyExists = await prisma.financialYear.findUnique({ where: { id: parseInt(financialYearId) } });
        updateData.financialYearId = fyExists ? fyExists.id : null;
      } else {
        updateData.financialYearId = null;
      }
    } else if (receivedDateBs) {
      const resolved = await resolveFinancialYearByDate(receivedDateBs);
      if (resolved) updateData.financialYearId = resolved.id;
    }

    if (partyId !== undefined) {
      if (partyId && !isNaN(parseInt(partyId))) {
        const pExists = await prisma.party.findUnique({ where: { id: parseInt(partyId) } });
        updateData.partyId = pExists ? pExists.id : null;
      } else {
        updateData.partyId = null;
      }
    }

    if (bankAccountId !== undefined) {
      updateData.bankAccountId = bankAccountId && !isNaN(parseInt(bankAccountId)) ? parseInt(bankAccountId) : null;
    }
    if (sourceLevel !== undefined) updateData.sourceLevel = sourceLevel ? String(sourceLevel).trim() : null;
    if (sourceOrg !== undefined) updateData.sourceOrg = sourceOrg ? String(sourceOrg).trim() : null;
    if (depositedInAccount !== undefined) updateData.depositedInAccount = depositedInAccount ? String(depositedInAccount).trim() : null;
    if (receivedBy !== undefined) updateData.receivedBy = receivedBy ? String(receivedBy).trim() : null;
    if (paymentMedium !== undefined) updateData.paymentMedium = paymentMedium ? String(paymentMedium).trim() : null;
    if (paymentRef !== undefined) updateData.paymentRef = paymentRef ? String(paymentRef).trim() : null;
    if (chequeNo !== undefined) updateData.chequeNo = chequeNo ? String(chequeNo).trim() : null;
    if (chequeDateBs !== undefined) updateData.chequeDateBs = chequeDateBs ? String(chequeDateBs).trim() : null;
    if (voucherNo !== undefined) updateData.voucherNo = voucherNo ? String(voucherNo).trim() : null;
    if (remarks !== undefined) updateData.remarks = remarks ? String(remarks).trim() : null;

    const entry = await prisma.incomeEntry.update({
      where: { id: entryId },
      data: updateData,
      include: { head: { include: { category: true } }, financialYear: true, party: true },
    });
    return res.json({ success: true, data: entry, message: 'Income entry updated successfully.' });
  } catch (err) {
    console.error('Error updating income entry:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update income entry.' });
  }
});

router.delete('/entries/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.incomeEntry.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ success: true, message: 'Income entry deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
