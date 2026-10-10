const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { resolveFinancialYearByDate } = require('./financialYears');

const router = express.Router();

// ─── GET /api/peshki — List all staff advances with summary & filters ─────────
router.get('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'TEACHER'), async (req, res) => {
  try {
    const { teacherId, status, financialYearId, search } = req.query;

    const where = {};
    if (teacherId && teacherId !== 'ALL') {
      where.teacherId = parseInt(teacherId);
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (financialYearId && financialYearId !== 'ALL') {
      where.financialYearId = parseInt(financialYearId);
    }
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { teacher: { fullName: { contains: q, mode: 'insensitive' } } },
        { teacher: { fullNameNepali: { contains: q, mode: 'insensitive' } } },
        { reason: { contains: q, mode: 'insensitive' } },
        { chequeNo: { contains: q, mode: 'insensitive' } },
      ];
    }

    // If teacher role, only show their own peshki
    if (req.user?.role === 'TEACHER' && req.user?.teacher?.id) {
      where.teacherId = req.user.teacher.id;
    }

    const peshkis = await prisma.staffPeshki.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            fullName: true,
            fullNameNepali: true,
            post: true,
            taha: true,
            shreni: true,
            phone: true,
            bankAccountNo: true,
            bankName: true,
            bankBranch: true,
            bankAccounts: { orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }] },
          },
        },
        financialYear: true,
        bankAccount: true,
        settlements: {
          include: {
            payroll: {
              select: {
                id: true,
                monthFrom: true,
                monthTo: true,
                status: true,
              },
            },
          },
          orderBy: { id: 'desc' },
        },
      },
      orderBy: { id: 'desc' },
    });

    // Summary calculation
    const totalAdvanceGiven = peshkis.reduce((s, p) => s + (p.status !== 'CANCELLED' ? (p.amount || 0) : 0), 0);
    const totalRemaining = peshkis.reduce((s, p) => s + (p.status !== 'CANCELLED' ? (p.remainingAmount || 0) : 0), 0);
    const totalSettled = totalAdvanceGiven - totalRemaining;

    return res.json({
      success: true,
      data: peshkis,
      summary: {
        totalAdvanceGiven,
        totalRemaining,
        totalSettled,
        activeCount: peshkis.filter(p => p.status === 'ACTIVE' && p.remainingAmount > 0).length,
        settledCount: peshkis.filter(p => p.status === 'SETTLED' || (p.status === 'ACTIVE' && p.remainingAmount <= 0)).length,
        cancelledCount: peshkis.filter(p => p.status === 'CANCELLED').length,
      },
    });
  } catch (err) {
    console.error('Error in GET /api/peshki:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ─── GET /api/peshki/report — Full Advance Register Report for Financial Reports
router.get('/report', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { financialYearId, teacherId, status } = req.query;

    const where = {};
    if (financialYearId && financialYearId !== 'ALL') {
      where.financialYearId = parseInt(financialYearId);
    }
    if (teacherId && teacherId !== 'ALL') {
      where.teacherId = parseInt(teacherId);
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const peshkis = await prisma.staffPeshki.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            fullName: true,
            fullNameNepali: true,
            post: true,
            taha: true,
            shreni: true,
            phone: true,
            bankAccountNo: true,
            bankName: true,
            bankBranch: true,
            panNo: true,
            bankAccounts: { orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }] },
          },
        },
        financialYear: true,
        bankAccount: true,
        settlements: {
          include: {
            payroll: {
              select: {
                id: true,
                monthFrom: true,
                monthTo: true,
                status: true,
              },
            },
          },
          orderBy: { id: 'desc' },
        },
      },
      orderBy: [{ financialYearId: 'desc' }, { id: 'desc' }],
    });

    const activeAdvances = peshkis.filter(p => p.status === 'ACTIVE' && p.remainingAmount > 0);
    const settledAdvances = peshkis.filter(p => p.status === 'SETTLED' || (p.status === 'ACTIVE' && p.remainingAmount <= 0));
    const totalGiven = peshkis.reduce((s, p) => s + (p.status !== 'CANCELLED' ? (p.amount || 0) : 0), 0);
    const totalRemaining = peshkis.reduce((s, p) => s + (p.status !== 'CANCELLED' ? (p.remainingAmount || 0) : 0), 0);
    const totalSettled = totalGiven - totalRemaining;

    return res.json({
      success: true,
      data: peshkis,
      summary: {
        totalGiven,
        totalSettled,
        totalRemaining,
        activeCount: activeAdvances.length,
        settledCount: settledAdvances.length,
        totalCount: peshkis.length,
      },
    });
  } catch (err) {
    console.error('Error in GET /api/peshki/report:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ─── GET /api/peshki/teacher/:teacherId — Active advances for specific teacher ───
router.get('/teacher/:teacherId', authenticate, async (req, res) => {
  try {
    const teacherId = parseInt(req.params.teacherId);
    if (isNaN(teacherId)) {
      return res.status(400).json({ success: false, message: 'Invalid teacher ID' });
    }

    const peshkis = await prisma.staffPeshki.findMany({
      where: {
        teacherId,
        status: { in: ['ACTIVE', 'SETTLED'] },
      },
      include: {
        settlements: {
          include: {
            payroll: {
              select: { id: true, monthFrom: true, monthTo: true },
            },
          },
          orderBy: { id: 'desc' },
        },
        financialYear: true,
        bankAccount: true,
      },
      orderBy: { id: 'desc' },
    });

    const activePeshkis = peshkis.filter(p => p.status === 'ACTIVE' && p.remainingAmount > 0);
    const totalDue = activePeshkis.reduce((s, p) => s + (p.remainingAmount || 0), 0);
    const totalGiven = peshkis.reduce((s, p) => s + (p.amount || 0), 0);
    const totalSettled = totalGiven - totalDue;

    return res.json({
      success: true,
      data: peshkis,
      activeAdvances: activePeshkis,
      totalDue,
      totalGiven,
      totalSettled,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/peshki/my — Teacher logged-in self-service view ─────────────────
router.get('/my', authenticate, authorize('TEACHER'), async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
    });

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    }

    const peshkis = await prisma.staffPeshki.findMany({
      where: { teacherId: teacher.id },
      include: {
        settlements: {
          include: {
            payroll: {
              select: {
                id: true,
                monthFrom: true,
                monthTo: true,
              },
            },
          },
          orderBy: { id: 'desc' },
        },
        financialYear: true,
        bankAccount: true,
      },
      orderBy: { id: 'desc' },
    });

    const activePeshkis = peshkis.filter(p => p.status === 'ACTIVE' && p.remainingAmount > 0);
    const totalRemaining = activePeshkis.reduce((s, p) => s + p.remainingAmount, 0);
    const totalGiven = peshkis.reduce((s, p) => s + (p.status !== 'CANCELLED' ? (p.amount || 0) : 0), 0);

    return res.json({
      success: true,
      data: peshkis,
      summary: {
        activeCount: activePeshkis.length,
        totalRemaining,
        totalGiven,
        totalSettled: totalGiven - totalRemaining,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Helper to safely create an expense entry for Peshki payout
async function recordExpenseVoucherForPeshki(peshki, teacher, givenDateBs, fyId, paymentMethod, chequeNo, reason) {
  try {
    let expenseHead = await prisma.expenseHead.findFirst({
      where: { name: { contains: 'पेस्की' } },
    });
    if (!expenseHead) {
      expenseHead = await prisma.expenseHead.findFirst();
    }
    if (!expenseHead) return;

    let activeAy = await prisma.academicYear.findFirst({ where: { isActive: true } });
    if (!activeAy) {
      activeAy = await prisma.academicYear.findFirst({ orderBy: { id: 'desc' } });
    }
    if (!activeAy) return;

    const paymentMedium = paymentMethod === 'CHEQUE' ? 'CHEQUE' : (paymentMethod === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'CASH');

    await prisma.expenseEntry.create({
      data: {
        headId: expenseHead.id,
        academicYearId: activeAy.id,
        financialYearId: fyId || null,
        amount: peshki.amount,
        expenseDateBs: givenDateBs || '',
        expenseDateAd: new Date(),
        paymentMedium,
        bankAccountId: peshki.bankAccountId || null,
        chequeNo: chequeNo || null,
        paidTo: `${teacher.fullName} (शिक्षक पेस्की)`,
        billNo: chequeNo || `ADV-${peshki.id}`,
        remarks: `Staff Salary Advance (पेस्की): ${teacher.fullName} - ${reason || 'तलब पेस्की'} [Peshki #${peshki.id}]`,
      },
    }).catch((e) => console.warn('Peshki auto expense log non-fatal:', e.message));
  } catch (err) {
    console.warn('Could not auto-create expense entry for peshki:', err.message);
  }
}

// ─── POST /api/peshki — Issue new Peshki (Advance payment) ─────────────────────
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const {
      teacherId,
      amount,
      givenDateBs,
      paymentMethod = 'CASH', // CASH, CHEQUE, BANK_TRANSFER
      chequeNo,
      bankName,
      bankAccountId,
      deductFromMonth,
      deductToMonth,
      monthlyDeduction,
      reason,
      remarks,
      financialYearId,
      status = 'ACTIVE', // ACTIVE (Paid/Disbursed) or PENDING (Recorded but not yet paid)
      createExpenseVoucher = true,
    } = req.body;

    if (!teacherId) {
      return res.status(400).json({ success: false, message: 'शिक्षक/कर्मचारी छनोट गर्न आवश्यक छ।' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'मान्य पेस्की रकम प्रविष्ट गर्नुहोस्।' });
    }

    const teacher = await prisma.teacher.findUnique({ where: { id: parseInt(teacherId) } });
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    let fyId = financialYearId ? parseInt(financialYearId) : null;
    if (!fyId && givenDateBs) {
      const resolved = await resolveFinancialYearByDate(givenDateBs);
      if (resolved) fyId = resolved.id;
    }
    if (!fyId) {
      const activeFy = await prisma.financialYear.findFirst({ where: { isActive: true } });
      if (activeFy) fyId = activeFy.id;
    }

    const advanceStatus = status === 'PENDING' ? 'ACTIVE' : (status || 'ACTIVE');

    // Create StaffPeshki record
    const peshki = await prisma.staffPeshki.create({
      data: {
        teacherId: parseInt(teacherId),
        financialYearId: fyId,
        amount: numAmount,
        remainingAmount: numAmount,
        givenDateBs: givenDateBs || '',
        paymentMethod,
        chequeNo: chequeNo || null,
        bankName: bankName || null,
        bankAccountId: bankAccountId ? parseInt(bankAccountId) : null,
        deductFromMonth: deductFromMonth || null,
        deductToMonth: deductToMonth || null,
        monthlyDeduction: monthlyDeduction ? parseFloat(monthlyDeduction) : null,
        reason: reason || 'तलब पेस्की (Salary Advance)',
        remarks: remarks || null,
        status: advanceStatus,
      },
      include: {
        teacher: true,
        bankAccount: true,
        financialYear: true,
      },
    });

    // Optionally create ExpenseEntry to record outflow in cash/bank book
    if (createExpenseVoucher && advanceStatus === 'ACTIVE') {
      await recordExpenseVoucherForPeshki(peshki, teacher, givenDateBs, fyId, paymentMethod, chequeNo, reason);
    }

    return res.status(201).json({
      success: true,
      data: peshki,
      message: `${teacher.fullName} लाई रू ${numAmount.toLocaleString()} पेस्की सफलतापूर्वक दर्ता गरियो!`,
    });
  } catch (err) {
    console.error('Error creating peshki:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ─── PATCH /api/peshki/:id/mark-paid — 1-Click Mark Paid ──────────────────────
router.patch('/:id/mark-paid', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const { givenDateBs, paymentMethod, chequeNo, bankAccountId } = req.body || {};

    const existing = await prisma.staffPeshki.findUnique({
      where: { id },
      include: { teacher: true, financialYear: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Peshki record not found' });
    }

    const updated = await prisma.staffPeshki.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        givenDateBs: givenDateBs || existing.givenDateBs,
        paymentMethod: paymentMethod || existing.paymentMethod,
        chequeNo: chequeNo !== undefined ? chequeNo : existing.chequeNo,
        bankAccountId: bankAccountId ? parseInt(bankAccountId) : existing.bankAccountId,
      },
      include: { teacher: true, settlements: true, bankAccount: true, financialYear: true },
    });

    // Also record expense entry
    await recordExpenseVoucherForPeshki(
      updated,
      updated.teacher,
      updated.givenDateBs,
      updated.financialYearId,
      updated.paymentMethod,
      updated.chequeNo,
      updated.reason
    );

    return res.json({
      success: true,
      data: updated,
      message: `पेस्की #${id} (${updated.teacher.fullName}) भुक्तानी प्रमाणित भयो!`,
    });
  } catch (err) {
    console.error('Error in mark-paid:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/peshki/:id — Full Edit Advance ──────────────────────────────────
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const {
      teacherId,
      amount,
      remainingAmount,
      givenDateBs,
      paymentMethod,
      chequeNo,
      bankName,
      bankAccountId,
      deductFromMonth,
      deductToMonth,
      monthlyDeduction,
      reason,
      status,
      remarks,
      financialYearId,
    } = req.body;

    const existing = await prisma.staffPeshki.findUnique({
      where: { id },
      include: { settlements: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Peshki record not found' });
    }

    const totalSettled = existing.settlements.reduce((sum, s) => sum + (s.amount || 0), 0);
    const newAmount = amount !== undefined ? parseFloat(amount) : existing.amount;

    let computedRemaining = remainingAmount !== undefined
      ? parseFloat(remainingAmount)
      : Math.max(0, +(newAmount - totalSettled).toFixed(2));

    let newStatus = status || existing.status;
    if (computedRemaining === 0 && totalSettled > 0) {
      newStatus = 'SETTLED';
    } else if (computedRemaining > 0 && newStatus === 'SETTLED') {
      newStatus = 'ACTIVE';
    }

    const updated = await prisma.staffPeshki.update({
      where: { id },
      data: {
        teacherId: teacherId ? parseInt(teacherId) : existing.teacherId,
        financialYearId: financialYearId ? parseInt(financialYearId) : existing.financialYearId,
        amount: newAmount,
        remainingAmount: computedRemaining,
        givenDateBs: givenDateBs !== undefined ? givenDateBs : existing.givenDateBs,
        paymentMethod: paymentMethod !== undefined ? paymentMethod : existing.paymentMethod,
        chequeNo: chequeNo !== undefined ? chequeNo : existing.chequeNo,
        bankName: bankName !== undefined ? bankName : existing.bankName,
        bankAccountId: bankAccountId !== undefined ? (bankAccountId ? parseInt(bankAccountId) : null) : existing.bankAccountId,
        deductFromMonth: deductFromMonth !== undefined ? deductFromMonth : existing.deductFromMonth,
        deductToMonth: deductToMonth !== undefined ? deductToMonth : existing.deductToMonth,
        monthlyDeduction: monthlyDeduction !== undefined ? (monthlyDeduction ? parseFloat(monthlyDeduction) : null) : existing.monthlyDeduction,
        reason: reason !== undefined ? reason : existing.reason,
        status: newStatus,
        remarks: remarks !== undefined ? remarks : existing.remarks,
      },
      include: {
        teacher: true,
        bankAccount: true,
        settlements: true,
        financialYear: true,
      },
    });

    return res.json({
      success: true,
      data: updated,
      message: 'पेस्की विवरण सफलतापूर्वक अद्यावधिक गरियो।',
    });
  } catch (err) {
    console.error('Error updating peshki:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/peshki/:id/settle & /api/peshki/:id/settle-cash ────────────────
async function handleDirectSettlement(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const { amount, settledDateBs, remarks, paymentMethod = 'CASH' } = req.body;
    const settleAmount = parseFloat(amount);

    if (isNaN(settleAmount) || settleAmount <= 0) {
      return res.status(400).json({ success: false, message: 'मान्य फर्छ्यौट रकम प्रविष्ट गर्नुहोस्।' });
    }

    const peshki = await prisma.staffPeshki.findUnique({
      where: { id },
      include: { teacher: true },
    });
    if (!peshki) {
      return res.status(404).json({ success: false, message: 'Peshki not found' });
    }

    const newRemaining = Math.max(0, +(peshki.remainingAmount - settleAmount).toFixed(2));
    const newStatus = newRemaining === 0 ? 'SETTLED' : 'ACTIVE';

    const settlement = await prisma.peshkiSettlement.create({
      data: {
        peshkiId: id,
        amount: settleAmount,
        settledDateBs: settledDateBs || peshki.givenDateBs || '',
        settledMonth: settledDateBs ? settledDateBs.slice(0, 7) : 'DIRECT_SETTLE',
        remarks: remarks || `${paymentMethod === 'CASH' ? 'नगद' : 'बैंक'} दाखिला गरी सोझै फर्छ्यौट`,
      },
    });

    const updatedPeshki = await prisma.staffPeshki.update({
      where: { id },
      data: {
        remainingAmount: newRemaining,
        status: newStatus,
      },
      include: { teacher: true, settlements: true, financialYear: true },
    });

    return res.json({
      success: true,
      data: updatedPeshki,
      settlement,
      message: `रू ${settleAmount.toLocaleString()} पेस्की फर्छ्यौट भयो! बाँकी दायित्व रकम: रू ${newRemaining.toLocaleString()}`,
    });
  } catch (err) {
    console.error('Error settling peshki:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

router.post('/:id/settle', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), handleDirectSettlement);
router.post('/:id/settle-cash', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), handleDirectSettlement);

// ─── POST /api/peshki/:id/cancel — Cancel an active advance ───────────────────
router.post('/:id/cancel', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const { reason = 'प्रशासनिक निर्णय अनुसार रद्द' } = req.body;

    const existing = await prisma.staffPeshki.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Peshki not found' });

    const updated = await prisma.staffPeshki.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        remarks: existing.remarks ? `${existing.remarks} | [रद्द: ${reason}]` : `[रद्द: ${reason}]`,
      },
      include: { teacher: true },
    });

    return res.json({
      success: true,
      data: updated,
      message: `पेस्की #${id} सफलतापूर्वक रद्द गरियो।`,
    });
  } catch (err) {
    console.error('Error cancelling peshki:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/peshki/:id — Delete peshki record ────────────────────────────
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

    const existing = await prisma.staffPeshki.findUnique({
      where: { id },
      include: { settlements: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Peshki not found' });
    }

    // Cascade delete any settlements first
    await prisma.peshkiSettlement.deleteMany({ where: { peshkiId: id } });
    await prisma.staffPeshki.delete({ where: { id } });

    return res.json({ success: true, message: 'पेस्की अभिलेख सफलतापूर्वक मेटाइयो।' });
  } catch (err) {
    console.error('Error deleting peshki:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
