const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ── EXPENSE CATEGORIES ────────────────────────────────────────────────────

router.get('/categories', authenticate, async (req, res) => {
  const cats = await prisma.expenseCategory.findMany({
    where: { isActive: true },
    include: { expenseHeads: { where: { isActive: true } } },
  });
  return res.json({ success: true, data: cats });
});

router.post('/categories', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { name, nameNepali, isActive } = req.body;
    let cat;
    try {
      cat = await prisma.expenseCategory.create({
        data: {
          name: name ? String(name).trim() : '',
          nameNepali: nameNepali ? String(nameNepali).trim() : null,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        },
      });
    } catch (createErr) {
      if (createErr.code === 'P2002' || createErr.message?.includes('id') || createErr.message?.includes('Unique constraint')) {
        const maxRes = await prisma.expenseCategory.aggregate({ _max: { id: true } });
        const nextId = (maxRes._max.id || 0) + 1;
        cat = await prisma.expenseCategory.create({
          data: {
            id: nextId,
            name: name ? String(name).trim() : '',
            nameNepali: nameNepali ? String(nameNepali).trim() : null,
            isActive: isActive !== undefined ? Boolean(isActive) : true,
          },
        });
      } else {
        throw createErr;
      }
    }
    return res.status(201).json({ success: true, data: cat, message: 'Expense Category created.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/categories/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { name, nameNepali, isActive } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name ? String(name).trim() : '';
    if (nameNepali !== undefined) updateData.nameNepali = nameNepali ? String(nameNepali).trim() : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const cat = await prisma.expenseCategory.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
    });
    return res.json({ success: true, data: cat, message: 'Expense Category updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/categories/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.expenseCategory.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Expense Category deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/categories/:id/delete', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.expenseCategory.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Expense Category deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── EXPENSE HEADS ─────────────────────────────────────────────────────────

router.get('/heads', authenticate, async (req, res) => {
  const heads = await prisma.expenseHead.findMany({
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
      head = await prisma.expenseHead.create({
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
        const maxRes = await prisma.expenseHead.aggregate({ _max: { id: true } });
        const nextId = (maxRes._max.id || 0) + 1;
        head = await prisma.expenseHead.create({
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
    return res.status(201).json({ success: true, data: head, message: 'Expense Head created.' });
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

    const head = await prisma.expenseHead.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: { category: true },
    });
    return res.json({ success: true, data: head, message: 'Expense Head updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});


router.delete('/heads/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.expenseHead.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Expense Head deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/heads/:id/delete', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.expenseHead.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Expense Head deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

const { resolveFinancialYearByDate, resolveAcademicYearForFinance } = require('./financialYears');

// ── EXPENSE ENTRIES ───────────────────────────────────────────────────────

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
      where.expenseDateBs = {};
      if (from) where.expenseDateBs.gte = from;
      if (to) where.expenseDateBs.lte = to;
    }
    if (q) {
      where.OR = [
        { paidTo: { contains: q } },
        { voucherNo: { contains: q } },
        { billNo: { contains: q } },
        { description: { contains: q } },
        { chequeNo: { contains: q } },
        { head: { name: { contains: q } } },
        { head: { code: { contains: q } } },
        { party: { name: { contains: q } } },
      ];
    }
    const [entries, total] = await Promise.all([
      prisma.expenseEntry.findMany({
        where,
        include: { head: { include: { category: true } }, academicYear: true, financialYear: true, party: true },
        orderBy: { expenseDateBs: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.expenseEntry.count({ where }),
    ]);
    const agg = await prisma.expenseEntry.aggregate({ where, _sum: { amount: true } });
    return res.json({ success: true, data: entries, total, totalAmount: agg._sum.amount || 0 });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/entries/:id', authenticate, async (req, res) => {
  const entry = await prisma.expenseEntry.findUnique({
    where: { id: parseInt(req.params.id) },
    include: { head: { include: { category: true } }, academicYear: true, financialYear: true, party: true },
  });
  if (!entry) return res.status(404).json({ success: false, message: 'Not found.' });
  return res.json({ success: true, data: entry });
});

router.post('/entries', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const {
      expenseDateAd,
      expenseDateBs,
      headId,
      academicYearId,
      financialYearId,
      partyId,
      bankAccountId,
      amount,
      paidTo,
      paidFromAccount,
      paymentMedium,
      paymentRef,
      chequeNo,
      chequePayeeName,
      chequeDateBs,
      voucherNo,
      billNo,
      approvedBy,
      description,
      remarks,
    } = req.body;
    
    // Auto resolve Financial Year by expense date if not provided
    let resolvedFyId = financialYearId ? parseInt(financialYearId) : null;
    if (!resolvedFyId && expenseDateBs) {
      const resolved = await resolveFinancialYearByDate(expenseDateBs);
      if (resolved) resolvedFyId = resolved.id;
    }

    const resolvedAyId = await resolveAcademicYearForFinance({
      academicYearId,
      financialYearId: resolvedFyId,
      dateBs: expenseDateBs,
    });

    const parsedAmt = parseFloat(amount) || 0;
    let finalPaymentMedium = paymentMedium ? String(paymentMedium).trim() : 'CASH';
    let finalPaidFromAccount = paidFromAccount ? String(paidFromAccount).trim() : null;

    if (parsedAmt === 0) {
      finalPaymentMedium = paymentMedium && paymentMedium !== 'CASH' ? String(paymentMedium).trim() : 'UNPAID_BILL';
      finalPaidFromAccount = finalPaidFromAccount || 'भुक्तानी हुन बाँकी दायित्व (Accounts Payable / Due)';
    }

    const entry = await prisma.expenseEntry.create({
      data: {
        amount: parsedAmt,
        paymentMedium: finalPaymentMedium,
        paidFromAccount: finalPaidFromAccount,
        expenseDateBs: expenseDateBs ? String(expenseDateBs).trim() : '',
        expenseDateAd: expenseDateAd ? new Date(expenseDateAd) : new Date(),
        headId: parseInt(headId),
        academicYearId: resolvedAyId,
        financialYearId: resolvedFyId,
        partyId: partyId ? parseInt(partyId) : undefined,
        bankAccountId: bankAccountId ? parseInt(bankAccountId) : undefined,
        paidTo: paidTo ? String(paidTo).trim() : null,
        paymentRef: paymentRef ? String(paymentRef).trim() : null,
        chequeNo: chequeNo ? String(chequeNo).trim() : null,
        chequePayeeName: chequePayeeName ? String(chequePayeeName).trim() : null,
        chequeDateBs: chequeDateBs ? String(chequeDateBs).trim() : null,
        voucherNo: voucherNo ? String(voucherNo).trim() : null,
        billNo: billNo ? String(billNo).trim() : null,
        approvedBy: approvedBy ? String(approvedBy).trim() : null,
        description: description ? String(description).trim() : null,
        remarks: remarks ? String(remarks).trim() : null,
      },
      include: { head: { include: { category: true } }, financialYear: true, party: true },
    });
    return res.status(201).json({ success: true, data: entry, message: 'Expense entry recorded.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/entries/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const {
      expenseDateAd,
      expenseDateBs,
      headId,
      academicYearId,
      financialYearId,
      partyId,
      bankAccountId,
      amount,
      paidTo,
      paidFromAccount,
      paymentMedium,
      paymentRef,
      chequeNo,
      chequePayeeName,
      chequeDateBs,
      voucherNo,
      billNo,
      approvedBy,
      description,
      remarks,
    } = req.body;

    const updateData = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (expenseDateAd) updateData.expenseDateAd = new Date(expenseDateAd);
    if (expenseDateBs !== undefined) updateData.expenseDateBs = String(expenseDateBs).trim();
    if (headId) updateData.headId = parseInt(headId);
    if (academicYearId) updateData.academicYearId = parseInt(academicYearId);
    
    if (financialYearId !== undefined) {
      updateData.financialYearId = financialYearId ? parseInt(financialYearId) : null;
    } else if (expenseDateBs) {
      const resolved = await resolveFinancialYearByDate(expenseDateBs);
      if (resolved) updateData.financialYearId = resolved.id;
    }

    if (partyId !== undefined) updateData.partyId = partyId ? parseInt(partyId) : null;
    if (bankAccountId !== undefined) updateData.bankAccountId = bankAccountId ? parseInt(bankAccountId) : null;
    if (paidTo !== undefined) updateData.paidTo = paidTo ? String(paidTo).trim() : null;
    if (paidFromAccount !== undefined) updateData.paidFromAccount = paidFromAccount ? String(paidFromAccount).trim() : null;
    if (paymentMedium !== undefined) updateData.paymentMedium = paymentMedium ? String(paymentMedium).trim() : null;
    if (paymentRef !== undefined) updateData.paymentRef = paymentRef ? String(paymentRef).trim() : null;
    if (chequeNo !== undefined) updateData.chequeNo = chequeNo ? String(chequeNo).trim() : null;
    if (chequePayeeName !== undefined) updateData.chequePayeeName = chequePayeeName ? String(chequePayeeName).trim() : null;
    if (chequeDateBs !== undefined) updateData.chequeDateBs = chequeDateBs ? String(chequeDateBs).trim() : null;
    if (voucherNo !== undefined) updateData.voucherNo = voucherNo ? String(voucherNo).trim() : null;
    if (billNo !== undefined) updateData.billNo = billNo ? String(billNo).trim() : null;
    if (approvedBy !== undefined) updateData.approvedBy = approvedBy ? String(approvedBy).trim() : null;
    if (description !== undefined) updateData.description = description ? String(description).trim() : null;
    if (remarks !== undefined) updateData.remarks = remarks ? String(remarks).trim() : null;

    const entry = await prisma.expenseEntry.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: { head: { include: { category: true } }, financialYear: true, party: true },
    });
    return res.json({ success: true, data: entry, message: 'Expense entry updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── UPDATE PAYABLE BILL (INCLUDING ALL LINKED RECORDS) ───────────────────────
router.put('/bills/update', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { registrationId, entryIds, billNo, billDateBs, partyId, headId, totalBillAmount, description } = req.body;

    const parsedTotal = parseFloat(totalBillAmount);
    if (isNaN(parsedTotal) || parsedTotal < 0) {
      return res.status(400).json({ success: false, message: 'Valid total bill amount is required.' });
    }

    const cleanBillNo = (billNo || '').trim();
    if (!cleanBillNo) {
      return res.status(400).json({ success: false, message: 'Bill number is required.' });
    }

    let partyObj = null;
    if (partyId) {
      partyObj = await prisma.party.findUnique({ where: { id: parseInt(partyId) } });
    }

    const cleanDesc = (description || 'Vendor Purchase Bill').replace(/\[Total Bill:\s*[^\]]+\]/i, '').trim();
    const finalRegDesc = `${cleanDesc} [Total Bill: Rs. ${parsedTotal.toLocaleString()}]`;

    // 1. Update primary bill registration entry
    const targetRegId = registrationId ? parseInt(registrationId) : null;
    if (targetRegId) {
      const regUpdateData = {
        billNo: cleanBillNo,
        headId: headId ? parseInt(headId) : undefined,
        partyId: partyId ? parseInt(partyId) : null,
        paidTo: partyObj ? partyObj.name : undefined,
        description: finalRegDesc,
      };
      if (billDateBs) regUpdateData.expenseDateBs = billDateBs;

      await prisma.expenseEntry.update({
        where: { id: targetRegId },
        data: regUpdateData,
      });
    }

    // 2. Update all associated installment entries (preserving their installment nature)
    const allIds = Array.isArray(entryIds) ? entryIds.map(id => parseInt(id)).filter(id => !isNaN(id)) : [];
    const installmentIds = allIds.filter(id => id !== targetRegId);

    for (const instId of installmentIds) {
      const instEntry = await prisma.expenseEntry.findUnique({ where: { id: instId } });
      if (instEntry) {
        let newDesc = instEntry.description || `Installment Payment for Bill ${cleanBillNo}`;
        newDesc = newDesc.replace(/Bill\s+[^\s\[]+/i, `Bill ${cleanBillNo}`);
        if (newDesc.includes('[Total Bill:')) {
          newDesc = newDesc.replace(/\[Total Bill:\s*[^\]]+\]/i, `[Total Bill: Rs. ${parsedTotal.toLocaleString()}]`);
        } else {
          newDesc = `${newDesc} [Total Bill: Rs. ${parsedTotal.toLocaleString()}]`;
        }
        if (targetRegId && !newDesc.includes('[Bill Reg ID:')) {
          newDesc = `${newDesc} [Bill Reg ID: ${targetRegId}]`;
        }

        await prisma.expenseEntry.update({
          where: { id: instId },
          data: {
            billNo: cleanBillNo,
            headId: headId ? parseInt(headId) : undefined,
            partyId: partyId ? parseInt(partyId) : null,
            paidTo: partyObj ? partyObj.name : undefined,
            description: newDesc,
          }
        });
      }
    }

    return res.json({ success: true, message: `Bill "${cleanBillNo}" details updated successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── BULK DELETE EXPENSE ENTRIES / BILL ASSOCIATIONS ─────────────────────────
router.post('/entries/bulk-delete', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No entry IDs provided for deletion.' });
    }
    const cleanIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id) && id > 0);
    if (cleanIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid entry IDs.' });
    }
    const result = await prisma.expenseEntry.deleteMany({
      where: { id: { in: cleanIds } }
    });
    return res.json({ success: true, message: `${result.count} record(s) deleted successfully.`, count: result.count });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/entries/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    await prisma.expenseEntry.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ success: true, message: 'Deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/entries/:id/delete', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    await prisma.expenseEntry.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ success: true, message: 'Deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── INCOME vs EXPENSE SUMMARY ──────────────────────────────────────────────

router.get('/summary', authenticate, async (req, res) => {
  try {
    const { academicYearId, financialYearId } = req.query;
    const yrFilter = {};
    if (financialYearId) yrFilter.financialYearId = parseInt(financialYearId);
    else if (academicYearId) yrFilter.academicYearId = parseInt(academicYearId);

    const [totalIncome, totalExpense] = await Promise.all([
      prisma.incomeEntry.aggregate({ where: yrFilter, _sum: { amount: true } }),
      prisma.expenseEntry.aggregate({ where: yrFilter, _sum: { amount: true } }),
    ]);
    return res.json({
      success: true,
      data: {
        totalIncome: totalIncome._sum.amount || 0,
        totalExpense: totalExpense._sum.amount || 0,
        balance: (totalIncome._sum.amount || 0) - (totalExpense._sum.amount || 0),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
