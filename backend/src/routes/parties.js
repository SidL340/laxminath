const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const { getFiscalYearFromBS } = require('./financialYears');

const router = express.Router();

// ── GET ALL PARTIES / RECIPIENTS ──────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { q, type } = req.query;
    const where = { isActive: true };
    if (type && type !== 'ALL') where.partyType = type;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { nameNepali: { contains: q } },
        { panNo: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const parties = await prisma.party.findMany({
      where,
      include: {
        _count: {
          select: { expenseEntries: true, incomeEntries: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    // Populate full accurate voucher count combining partyId and name text matches
    const updatedParties = await Promise.all(
      parties.map(async (p) => {
        const [expCount, incCount] = await Promise.all([
          prisma.expenseEntry.count({
            where: {
              OR: [{ partyId: p.id }, { paidTo: { contains: p.name } }]
            }
          }),
          prisma.incomeEntry.count({
            where: {
              OR: [{ partyId: p.id }, { sourceOrg: { contains: p.name } }]
            }
          })
        ]);

        return {
          ...p,
          vouchersCount: expCount + incCount,
          _count: {
            expenseEntries: expCount,
            incomeEntries: incCount,
          }
        };
      })
    );

    return res.json({ success: true, data: updatedParties });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET COMPREHENSIVE ACCOUNTS PAYABLE & VENDOR DUES SUMMARY ─────────────────
router.get('/payables-summary', authenticate, async (req, res) => {
  try {
    const { partyId, financialYearId, status, fyScope } = req.query;

    const where = {
      billNo: { not: null },
    };
    if (partyId && partyId !== 'ALL') where.partyId = parseInt(partyId);

    const entries = await prisma.expenseEntry.findMany({
      where,
      include: {
        party: true,
        head: { include: { category: true } },
        financialYear: true,
      },
      orderBy: { expenseDateBs: 'asc' },
    });

    const billRegistrations = [];
    const installmentPayments = [];

    function normalizeFyString(val) {
      if (!val) return '';
      if (typeof val === 'object' && val !== null) val = val.year || '';
      val = String(val).trim().replace(/\s+/g, '');
      val = val.replace('-', '/');
      const parts = val.split('/');
      if (parts.length === 2) {
        const y1 = parts[0];
        const y2 = parts[1].length === 4 ? parts[1].slice(-2) : parts[1];
        return `${y1}/${y2}`;
      }
      return val;
    }

    function getInstallmentFyString(inst) {
      if (inst.expenseDateBs) {
        const calculated = getFiscalYearFromBS(inst.expenseDateBs);
        if (calculated) return normalizeFyString(calculated);
      }
      if (inst.financialYear) {
        return normalizeFyString(inst.financialYear);
      }
      return '';
    }

    for (const e of entries) {
      if (!e.billNo || !e.billNo.trim()) continue;
      const cleanBill = e.billNo.trim();
      const desc = e.description || '';
      const remarks = e.remarks || '';

      const isInstallment =
        desc.toLowerCase().includes('installment') ||
        desc.toLowerCase().includes('settlement payment') ||
        desc.toLowerCase().includes('lump-sum settlement') ||
        remarks.toLowerCase().includes('installment') ||
        remarks.toLowerCase().includes('settlement') ||
        desc.includes('किस्ता') ||
        remarks.includes('किस्ता') ||
        desc.match(/\[Bill Reg ID:\s*(\d+)\]/i) ||
        desc.match(/\[Bill ID:\s*(\d+)\]/i) ||
        remarks.match(/\[Bill Reg ID:\s*(\d+)\]/i);

      const match = desc.match(/\[Total Bill:\s*(?:Rs\.|रू)?\s*([\d,.]+)\]/i) || remarks.match(/\[Total Bill:\s*(?:Rs\.|रू)?\s*([\d,.]+)\]/i);
      const parsedTotal = match ? (parseFloat(match[1].replace(/,/g, '')) || e.amount) : e.amount;

      if (e.paymentMedium === 'UNPAID_BILL' || (!isInstallment && e.amount === 0) || (!isInstallment && match)) {
        const billFy = normalizeFyString(e.financialYear?.year) || normalizeFyString(getFiscalYearFromBS(e.expenseDateBs));
        billRegistrations.push({
          registrationId: e.id,
          key: `${e.partyId || 'direct'}_${cleanBill}_${e.financialYearId || billFy}_${e.id}`,
          billNo: cleanBill,
          billDateBs: e.expenseDateBs,
          billFinancialYear: billFy,
          billFinancialYearId: e.financialYearId,
          partyId: e.partyId,
          party: e.party,
          partyName: e.party?.name || e.paidTo || 'Vendor / Supplier',
          panNo: e.party?.panNo || '',
          phone: e.party?.phone || '',
          headId: e.headId,
          head: e.head,
          headName: e.head?.name || 'Expense Head',
          totalBillAmount: parsedTotal || e.amount,
          totalPaidAmount: (e.paymentMedium !== 'UNPAID_BILL' && e.amount > 0) ? e.amount : 0,
          description: e.description,
          remarks: e.remarks,
          entryIds: [e.id],
          installments: (e.paymentMedium !== 'UNPAID_BILL' && e.amount > 0) ? [{
            id: e.id,
            voucherNo: e.voucherNo,
            amount: e.amount,
            expenseDateBs: e.expenseDateBs,
            financialYear: billFy,
            financialYearId: e.financialYearId,
            paymentMedium: e.paymentMedium,
            paidFromAccount: e.paidFromAccount,
            description: e.description,
            remarks: e.remarks,
          }] : [],
        });
      } else if (isInstallment) {
        installmentPayments.push({
          ...e,
          cleanBill,
          parsedTotal,
        });
      } else {
        const billFy = normalizeFyString(e.financialYear?.year) || normalizeFyString(getFiscalYearFromBS(e.expenseDateBs));
        billRegistrations.push({
          registrationId: e.id,
          key: `${e.partyId || 'direct'}_${cleanBill}_${e.financialYearId || billFy}_${e.id}`,
          billNo: cleanBill,
          billDateBs: e.expenseDateBs,
          billFinancialYear: billFy,
          billFinancialYearId: e.financialYearId,
          partyId: e.partyId,
          party: e.party,
          partyName: e.party?.name || e.paidTo || 'Vendor / Supplier',
          panNo: e.party?.panNo || '',
          phone: e.party?.phone || '',
          headId: e.headId,
          head: e.head,
          headName: e.head?.name || 'Expense Head',
          totalBillAmount: parsedTotal || e.amount,
          totalPaidAmount: e.amount,
          description: e.description,
          remarks: e.remarks,
          entryIds: [e.id],
          installments: [{
            id: e.id,
            voucherNo: e.voucherNo,
            amount: e.amount,
            expenseDateBs: e.expenseDateBs,
            financialYear: billFy,
            financialYearId: e.financialYearId,
            paymentMedium: e.paymentMedium,
            paidFromAccount: e.paidFromAccount,
            description: e.description,
            remarks: e.remarks,
          }],
        });
      }
    }

    // Link installments to the accurate registered bill
    for (const inst of installmentPayments) {
      const desc = inst.description || '';
      const remarks = inst.remarks || '';
      const regIdMatch = desc.match(/\[Bill Reg ID:\s*(\d+)\]/i) || desc.match(/\[Bill ID:\s*(\d+)\]/i) || remarks.match(/\[Bill Reg ID:\s*(\d+)\]/i);
      const specificRegId = regIdMatch ? parseInt(regIdMatch[1]) : null;

      let targetBill = null;
      if (specificRegId) {
        targetBill = billRegistrations.find(b => b.registrationId === specificRegId);
      }

      if (!targetBill) {
        const matchingBills = billRegistrations.filter(b =>
          (b.partyId === inst.partyId || (!b.partyId && !inst.partyId)) &&
          b.billNo.toLowerCase() === inst.cleanBill.toLowerCase()
        );

        if (matchingBills.length === 1) {
          targetBill = matchingBills[0];
        } else if (matchingBills.length > 1) {
          // Prioritize bills that still have an unpaid balance
          const unpaidBills = matchingBills.filter(b => (b.totalBillAmount - b.totalPaidAmount) > 0.01);
          if (unpaidBills.length > 0) {
            // 1. Try exact match by totalBillAmount among unpaid bills
            targetBill = unpaidBills.find(b => Math.abs(b.totalBillAmount - inst.parsedTotal) < 1);
            // 2. Fallback: match by bill date before installment date that still has remaining due
            if (!targetBill) {
              targetBill = unpaidBills
                .filter(b => !b.billDateBs || !inst.expenseDateBs || b.billDateBs <= inst.expenseDateBs)
                .sort((a, b) => (b.totalBillAmount - b.totalPaidAmount) - (a.totalBillAmount - a.totalPaidAmount))[0];
            }
            if (!targetBill) targetBill = unpaidBills[0];
          } else {
            // If all matching bills are already paid, find by exact total or pick the last one
            targetBill = matchingBills.find(b => Math.abs(b.totalBillAmount - inst.parsedTotal) < 1) || matchingBills[matchingBills.length - 1];
          }
        }
      }

      const instFy = getInstallmentFyString(inst);

      if (targetBill) {
        targetBill.totalPaidAmount += (inst.amount || 0);
        targetBill.entryIds.push(inst.id);
        targetBill.installments.push({
          id: inst.id,
          voucherNo: inst.voucherNo,
          amount: inst.amount,
          expenseDateBs: inst.expenseDateBs,
          financialYear: instFy,
          financialYearId: inst.financialYearId,
          paymentMedium: inst.paymentMedium,
          chequeNo: inst.chequeNo,
          chequePayeeName: inst.chequePayeeName,
          paidFromAccount: inst.paidFromAccount,
          description: inst.description,
          remarks: inst.remarks,
        });
      } else {
        billRegistrations.push({
          registrationId: inst.id,
          key: `${inst.partyId || 'direct'}_${inst.cleanBill}_${inst.financialYearId || instFy}_${inst.id}`,
          billNo: inst.cleanBill,
          billDateBs: inst.expenseDateBs,
          billFinancialYear: instFy,
          billFinancialYearId: inst.financialYearId,
          partyId: inst.partyId,
          party: inst.party,
          partyName: inst.party?.name || inst.paidTo || 'Vendor / Supplier',
          panNo: inst.party?.panNo || '',
          phone: inst.party?.phone || '',
          headId: inst.headId,
          head: inst.head,
          headName: inst.head?.name || 'Expense Head',
          totalBillAmount: inst.parsedTotal || inst.amount,
          totalPaidAmount: inst.amount,
          description: inst.description,
          remarks: inst.remarks,
          entryIds: [inst.id],
          installments: [{
            id: inst.id,
            voucherNo: inst.voucherNo,
            amount: inst.amount,
            expenseDateBs: inst.expenseDateBs,
            financialYear: instFy,
            financialYearId: inst.financialYearId,
            paymentMedium: inst.paymentMedium,
            paidFromAccount: inst.paidFromAccount,
            description: inst.description,
            remarks: inst.remarks,
          }],
        });
      }
    }

    let targetFY = null;
    if (financialYearId && financialYearId !== 'ALL') {
      targetFY = await prisma.financialYear.findUnique({
        where: { id: parseInt(financialYearId) },
      });
    }

    let processedBills = [];

    if (targetFY) {
      const fyStart = targetFY.startDateBs;
      const fyEnd = targetFY.endDateBs;
      const targetFyStr = normalizeFyString(targetFY.year) || (targetFY.startDateBs ? normalizeFyString(getFiscalYearFromBS(targetFY.startDateBs)) : '');

      for (const b of billRegistrations) {
        const originDate = b.billDateBs || '';
        const originFY = normalizeFyString(b.billFinancialYear) || normalizeFyString(getFiscalYearFromBS(originDate));

        // 1. STRICTLY EXCLUDE FUTURE BILLS
        if (fyEnd && originDate && originDate > fyEnd) {
          continue; // Created in future date!
        }
        if (targetFyStr && originFY && originFY > targetFyStr) {
          continue; // Created in future fiscal year!
        }

        // 2. Identify if Current FY Bill or Past FY Carried Forward Bill
        const isCurrentFY = (targetFyStr && originFY === targetFyStr) ||
          (targetFY.id && b.billFinancialYearId === targetFY.id) ||
          (fyStart && fyEnd && originDate >= fyStart && originDate <= fyEnd);

        let isCarriedForward = !isCurrentFY;
        let openingDue = 0;
        let paidBeforeThisFY = 0;
        let paidInThisFY = 0;
        let remainingDue = 0;
        let billStatus = 'UNPAID';

        // Payments breakdown
        const fyPaymentsMap = {};
        b.installments.forEach(inst => {
          const instFyName = getInstallmentFyString(inst) || 'Other';
          fyPaymentsMap[instFyName] = (fyPaymentsMap[instFyName] || 0) + (inst.amount || 0);
        });

        const isInstInTargetFY = (inst) => {
          if (inst.financialYearId && targetFY.id && inst.financialYearId === targetFY.id) return true;
          const instFy = getInstallmentFyString(inst);
          if (instFy && targetFyStr && instFy === targetFyStr) return true;
          if (fyStart && fyEnd && inst.expenseDateBs && inst.expenseDateBs >= fyStart && inst.expenseDateBs <= fyEnd) return true;
          return false;
        };

        const isInstBeforeTargetFY = (inst) => {
          if (targetFY.id && inst.financialYearId && inst.financialYearId < targetFY.id) return true;
          const instFy = getInstallmentFyString(inst);
          if (instFy && targetFyStr && instFy < targetFyStr) return true;
          if (fyStart && inst.expenseDateBs && inst.expenseDateBs < fyStart) return true;
          return false;
        };

        if (isCurrentFY) {
          // Bill registered in this fiscal year
          openingDue = b.totalBillAmount;
          paidBeforeThisFY = 0;

          paidInThisFY = b.installments
            .filter(inst => isInstInTargetFY(inst))
            .reduce((sum, inst) => sum + (inst.amount || 0), 0);

          remainingDue = Math.max(0, b.totalBillAmount - (b.totalPaidAmount || 0));
          if (remainingDue === 0) billStatus = 'FULLY_PAID';
          else if ((b.totalPaidAmount || 0) > 0) billStatus = 'PARTIAL';
          else billStatus = 'UNPAID';

        } else {
          // Bill registered in a past fiscal year -> CARRYFORWARD
          paidBeforeThisFY = b.installments
            .filter(inst => isInstBeforeTargetFY(inst))
            .reduce((sum, inst) => sum + (inst.amount || 0), 0);

          openingDue = Math.max(0, b.totalBillAmount - paidBeforeThisFY);

          paidInThisFY = b.installments
            .filter(inst => isInstInTargetFY(inst))
            .reduce((sum, inst) => sum + (inst.amount || 0), 0);

          remainingDue = Math.max(0, b.totalBillAmount - (b.totalPaidAmount || 0));

          // If the past bill was ALREADY 100% paid off before this FY started and has no payments in this FY,
          // it carries zero liability into this FY -> Exclude from active view
          if (openingDue === 0 && paidInThisFY === 0) {
            continue;
          }

          if (remainingDue === 0) billStatus = 'FULLY_PAID';
          else if ((b.totalPaidAmount || 0) > 0) billStatus = 'PARTIAL';
          else billStatus = 'UNPAID';
        }

        processedBills.push({
          ...b,
          originFY,
          isCarriedForward,
          openingDue,
          paidBeforeThisFY,
          paidInThisFY,
          remainingDue,
          status: billStatus,
          fyPayments: fyPaymentsMap,
          displayPayableAmount: isCarriedForward ? openingDue : b.totalBillAmount,
        });
      }

    } else {
      // All Fiscal Years Lifetime view
      for (const b of billRegistrations) {
        const remainingDue = Math.max(0, b.totalBillAmount - (b.totalPaidAmount || 0));
        let billStatus = 'FULLY_PAID';
        if (remainingDue > 0 && (b.totalPaidAmount || 0) > 0) billStatus = 'PARTIAL';
        else if ((b.totalPaidAmount || 0) === 0 || remainingDue === b.totalBillAmount) billStatus = 'UNPAID';

        const fyPaymentsMap = {};
        b.installments.forEach(inst => {
          const instFyName = getInstallmentFyString(inst) || 'Other';
          fyPaymentsMap[instFyName] = (fyPaymentsMap[instFyName] || 0) + (inst.amount || 0);
        });

        processedBills.push({
          ...b,
          originFY: normalizeFyString(b.billFinancialYear) || normalizeFyString(getFiscalYearFromBS(b.billDateBs)),
          isCarriedForward: false,
          openingDue: b.totalBillAmount,
          paidBeforeThisFY: 0,
          paidInThisFY: b.totalPaidAmount,
          remainingDue,
          status: billStatus,
          fyPayments: fyPaymentsMap,
          displayPayableAmount: b.totalBillAmount,
        });
      }
    }

    // Filter by Scope (CURRENT_FY vs PAST_CARRYFORWARD vs ALL)
    if (fyScope === 'CURRENT_FY') {
      processedBills = processedBills.filter(b => !b.isCarriedForward);
    } else if (fyScope === 'PAST_CARRYFORWARD') {
      processedBills = processedBills.filter(b => b.isCarriedForward);
    }

    // Filter by Status (UNPAID / PARTIAL / FULLY_PAID)
    if (status && status !== 'ALL') {
      processedBills = processedBills.filter(b => b.status === status);
    }

    // Party-Wise Aggregation
    const partyAggMap = new Map();
    for (const b of processedBills) {
      const pId = b.partyId || 0;
      if (!partyAggMap.has(pId)) {
        partyAggMap.set(pId, {
          partyId: b.partyId,
          party: b.party,
          partyName: b.partyName,
          panNo: b.panNo,
          phone: b.phone,
          totalBillsCount: 0,
          totalBillsAmount: 0,
          totalOpeningDue: 0,
          totalPaidAmount: 0,
          totalOutstandingDue: 0,
          pendingBillsCount: 0,
          bills: [],
        });
      }

      const pGroup = partyAggMap.get(pId);
      pGroup.totalBillsCount += 1;
      pGroup.totalBillsAmount += (b.displayPayableAmount || b.totalBillAmount);
      pGroup.totalOpeningDue += (b.openingDue || 0);
      pGroup.totalPaidAmount += (b.paidInThisFY || b.totalPaidAmount || 0);
      pGroup.totalOutstandingDue += b.remainingDue;
      if (b.remainingDue > 0) pGroup.pendingBillsCount += 1;
      pGroup.bills.push(b);
    }

    const partySummary = Array.from(partyAggMap.values());
    const totalPayables = processedBills.reduce((s, b) => s + (b.displayPayableAmount || b.totalBillAmount), 0);
    const totalPaid = processedBills.reduce((s, b) => s + (b.paidInThisFY || b.totalPaidAmount || 0), 0);
    const totalOutstandingDue = processedBills.reduce((s, b) => s + b.remainingDue, 0);
    const pendingBillsCount = processedBills.filter(b => b.remainingDue > 0).length;
    const currentFyBillsCount = processedBills.filter(b => !b.isCarriedForward).length;
    const pastCarryforwardBillsCount = processedBills.filter(b => b.isCarriedForward).length;
    const partiesWithDuesCount = partySummary.filter(p => p.totalOutstandingDue > 0).length;

    return res.json({
      success: true,
      data: {
        summary: {
          totalBillsCount: processedBills.length,
          totalPayables,
          totalPaid,
          totalOutstandingDue,
          pendingBillsCount,
          currentFyBillsCount,
          pastCarryforwardBillsCount,
          partiesWithDuesCount,
        },
        bills: processedBills,
        partySummary,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET SINGLE PARTY WITH PARTY-WISE VOUCHERS / TRANSACTIONS ─────────────────
router.get('/:id/vouchers', authenticate, async (req, res) => {
  try {
    const partyId = parseInt(req.params.id);
    const party = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!party) {
      return res.status(404).json({ success: false, message: 'Party/Recipient not found.' });
    }

    const [expenses, incomes] = await Promise.all([
      prisma.expenseEntry.findMany({
        where: {
          OR: [
            { partyId },
            { paidTo: { contains: party.name } }
          ]
        },
        include: { head: { include: { category: true } } },
        orderBy: { expenseDateBs: 'desc' },
      }),
      prisma.incomeEntry.findMany({
        where: {
          OR: [
            { partyId },
            { sourceOrg: { contains: party.name } }
          ]
        },
        include: { head: { include: { category: true } } },
        orderBy: { receivedDateBs: 'desc' },
      }),
    ]);

    const totalExpenseSum = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalIncomeSum = incomes.reduce((sum, i) => sum + (i.amount || 0), 0);

    return res.json({
      success: true,
      data: {
        party,
        expenses,
        incomes,
        totalExpenseSum,
        totalIncomeSum,
        totalVoucherCount: expenses.length + incomes.length,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── CREATE PARTY / RECIPIENT ──────────────────────────────────────────────────
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { name, nameNepali, partyType, panNo, phone, email, address, bankName, accountNo } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Party Name is required.' });
    }

    const party = await prisma.party.create({
      data: {
        name: name.trim(),
        nameNepali: nameNepali ? nameNepali.trim() : null,
        partyType: partyType || 'VENDOR',
        panNo: panNo ? panNo.trim() : null,
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        address: address ? address.trim() : null,
        bankName: bankName ? bankName.trim() : null,
        accountNo: accountNo ? accountNo.trim() : null,
      },
    });

    return res.status(201).json({ success: true, data: party, message: 'Party/Recipient saved successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── UPDATE PARTY ─────────────────────────────────────────────────────────────
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { name, nameNepali, partyType, panNo, phone, email, address, bankName, accountNo } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (nameNepali !== undefined) updateData.nameNepali = nameNepali ? nameNepali.trim() : null;
    if (partyType !== undefined) updateData.partyType = partyType;
    if (panNo !== undefined) updateData.panNo = panNo ? panNo.trim() : null;
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (email !== undefined) updateData.email = email ? email.trim() : null;
    if (address !== undefined) updateData.address = address ? address.trim() : null;
    if (bankName !== undefined) updateData.bankName = bankName ? bankName.trim() : null;
    if (accountNo !== undefined) updateData.accountNo = accountNo ? accountNo.trim() : null;

    const party = await prisma.party.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
    });
    return res.json({ success: true, data: party, message: 'पार्टी विवरण सफलतापूर्वक परिमार्जन भयो।' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE PARTY (WITH OPTIONAL CASCADE DELETE OF ALL ENTRIES) ───────────────
const handleDeleteParty = async (req, res) => {
  try {
    const partyId = parseInt(req.params.id);
    const deleteEntries = req.body?.deleteEntries === true || req.query?.deleteEntries === 'true';

    const party = await prisma.party.findUnique({
      where: { id: partyId },
      include: {
        _count: {
          select: { expenseEntries: true, incomeEntries: true }
        }
      }
    });

    if (!party) {
      return res.status(404).json({ success: false, message: 'पार्टी फेला परेन (Party not found).' });
    }

    let deletedExpenseCount = 0;
    let deletedIncomeCount = 0;

    if (deleteEntries) {
      // Cascade delete: Delete all expenses and income associated with this party
      const [expDel, incDel] = await Promise.all([
        prisma.expenseEntry.deleteMany({
          where: {
            OR: [
              { partyId: partyId },
              { paidTo: party.name },
            ]
          }
        }),
        prisma.incomeEntry.deleteMany({
          where: {
            OR: [
              { partyId: partyId },
              { sourceOrg: party.name },
            ]
          }
        })
      ]);
      deletedExpenseCount = expDel.count;
      deletedIncomeCount = incDel.count;

      // Delete party record
      try {
        await prisma.party.delete({ where: { id: partyId } });
      } catch (delErr) {
        await prisma.party.update({ where: { id: partyId }, data: { isActive: false } });
      }

      return res.json({
        success: true,
        message: `पार्टी "${party.name}" र यसका सम्पूर्ण ${deletedExpenseCount + deletedIncomeCount} वटा आम्दानी/खर्च भौचरहरू सफलतापूर्वक मेटाइयो।`,
        deletedEntries: deletedExpenseCount + deletedIncomeCount,
      });
    } else {
      // Unlink mode: Keep vouchers intact, just set partyId = null
      await Promise.all([
        prisma.expenseEntry.updateMany({
          where: { partyId: partyId },
          data: { partyId: null }
        }),
        prisma.incomeEntry.updateMany({
          where: { partyId: partyId },
          data: { partyId: null }
        })
      ]);

      // Delete party record
      try {
        await prisma.party.delete({ where: { id: partyId } });
      } catch (delErr) {
        await prisma.party.update({ where: { id: partyId }, data: { isActive: false } });
      }

      return res.json({
        success: true,
        message: `पार्टी "${party.name}" सफलतापूर्वक हटाइयो (सम्बन्धित पुराना भौचरहरू सुरक्षित राखिएका छन्)।`,
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), handleDeleteParty);
router.post('/:id/delete', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), handleDeleteParty);

// ── SETTLE LUMP-SUM / MULTI-BILL PAYMENT FOR A PARTY ─────────────────────────
router.post('/:id/settle-lump-sum', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const partyId = parseInt(req.params.id);
    const party = await prisma.party.findUnique({ where: { id: partyId } });
    if (!party) return res.status(404).json({ success: false, message: 'Party not found.' });

    const {
      amount,
      financialYearId,
      academicYearId,
      headId,
      expenseDateBs,
      paymentMedium,
      bankAccountId,
      chequeNo,
      chequePayeeName,
      voucherNo,
      remarks,
      isSplit,
      cashAmount,
      bankAmount,
      splitBankAccountId,
      splitChequeNo,
      billKeys,
    } = req.body;

    const totalPayAmt = parseFloat(amount);
    if (!totalPayAmt || totalPayAmt <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required.' });
    }

    // Auto resolve Financial Year & Academic Year for the transaction
    const { resolveFinancialYearByDate, resolveAcademicYearForFinance } = require('./financialYears');
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

    // Default active expense head if bill has none
    const defaultHead = await prisma.expenseHead.findFirst({ where: { isActive: true }, orderBy: { id: 'asc' } });
    const fallbackHeadId = defaultHead ? defaultHead.id : 1;

    // Fetch all entries for this party to find open bills
    const allEntries = await prisma.expenseEntry.findMany({
      where: { partyId },
      include: { head: true, financialYear: true },
      orderBy: { expenseDateBs: 'asc' },
    });

    const billRegistrations = [];
    const installmentPayments = [];

    for (const e of allEntries) {
      if (!e.billNo || !e.billNo.trim() || e.billNo === 'LUMP-SUM-SETTLEMENT') continue;
      const cleanBill = e.billNo.trim();
      const desc = e.description || '';
      const rem = e.remarks || '';

      const isInstallment =
        desc.toLowerCase().includes('installment') ||
        desc.toLowerCase().includes('settlement payment') ||
        desc.toLowerCase().includes('lump-sum settlement') ||
        rem.toLowerCase().includes('installment') ||
        rem.toLowerCase().includes('settlement') ||
        desc.includes('किस्ता') ||
        rem.includes('किस्ता') ||
        desc.match(/\[Bill Reg ID:\s*(\d+)\]/i) ||
        desc.match(/\[Bill ID:\s*(\d+)\]/i) ||
        rem.match(/\[Bill Reg ID:\s*(\d+)\]/i);

      const match = desc.match(/\[Total Bill:\s*(?:Rs\.|रू)?\s*([\d,.]+)\]/i) || rem.match(/\[Total Bill:\s*(?:Rs\.|रू)?\s*([\d,.]+)\]/i);
      const parsedTotal = match ? (parseFloat(match[1].replace(/,/g, '')) || e.amount) : e.amount;

      if (e.paymentMedium === 'UNPAID_BILL' || (!isInstallment && e.amount === 0) || (!isInstallment && match)) {
        billRegistrations.push({
          registrationId: e.id,
          key: `${partyId}_${cleanBill}_${e.id}`,
          billNo: cleanBill,
          headId: e.headId,
          billDateBs: e.expenseDateBs,
          totalBillAmount: parsedTotal,
          totalPaidAmount: (e.paymentMedium !== 'UNPAID_BILL' && e.amount > 0) ? e.amount : 0,
        });
      } else if (isInstallment) {
        installmentPayments.push({ ...e, cleanBill, parsedTotal });
      } else {
        billRegistrations.push({
          registrationId: e.id,
          key: `${partyId}_${cleanBill}_${e.id}`,
          billNo: cleanBill,
          headId: e.headId,
          billDateBs: e.expenseDateBs,
          totalBillAmount: parsedTotal || e.amount,
          totalPaidAmount: e.amount,
        });
      }
    }

    for (const inst of installmentPayments) {
      const desc = inst.description || '';
      const rem = inst.remarks || '';
      const regIdMatch = desc.match(/\[Bill Reg ID:\s*(\d+)\]/i) || desc.match(/\[Bill ID:\s*(\d+)\]/i) || rem.match(/\[Bill Reg ID:\s*(\d+)\]/i);
      const specificRegId = regIdMatch ? parseInt(regIdMatch[1]) : null;

      let targetBill = null;
      if (specificRegId) {
        targetBill = billRegistrations.find(b => b.registrationId === specificRegId);
      }

      if (!targetBill) {
        const matchingBills = billRegistrations.filter(b => b.billNo.toLowerCase() === inst.cleanBill.toLowerCase());
        if (matchingBills.length === 1) targetBill = matchingBills[0];
        else if (matchingBills.length > 1) {
          const unpaidBills = matchingBills.filter(b => (b.totalBillAmount - b.totalPaidAmount) > 0.01);
          if (unpaidBills.length > 0) {
            targetBill = unpaidBills.find(b => Math.abs(b.totalBillAmount - inst.parsedTotal) < 1);
            if (!targetBill) {
              targetBill = unpaidBills
                .filter(b => !b.billDateBs || !inst.expenseDateBs || b.billDateBs <= inst.expenseDateBs)
                .sort((a, b) => (b.totalBillAmount - b.totalPaidAmount) - (a.totalBillAmount - a.totalPaidAmount))[0];
            }
            if (!targetBill) targetBill = unpaidBills[0];
          } else {
            targetBill = matchingBills.find(b => Math.abs(b.totalBillAmount - inst.parsedTotal) < 1) || matchingBills[matchingBills.length - 1];
          }
        }
      }

      if (targetBill) {
        targetBill.totalPaidAmount += (inst.amount || 0);
      }
    }

    let openBills = billRegistrations
      .map(b => ({
        ...b,
        remainingDue: Math.max(0, b.totalBillAmount - b.totalPaidAmount),
      }))
      .filter(b => b.remainingDue > 0);

    if (billKeys && Array.isArray(billKeys) && billKeys.length > 0) {
      openBills = openBills.filter(b => billKeys.includes(b.billNo) || billKeys.includes(b.key));
    }

    if (openBills.length === 0) {
      return res.status(400).json({ success: false, message: 'यो पार्टीको कुनै पनि बक्यौता बिल फेला परेन (No outstanding bills found for this party).' });
    }

    let remainingPayment = totalPayAmt;
    const createdEntries = [];

    // Resolve Bank details
    let paidFromAcc = 'विद्यालय नगद खाता (School Cash / Petty Cash A/c)';
    let bObj = null;
    if (bankAccountId) {
      bObj = await prisma.bankAccount.findUnique({ where: { id: parseInt(bankAccountId) } });
      if (bObj) paidFromAcc = `${bObj.bankName} (${bObj.accountNo})`;
    }

    let splitBObj = null;
    if (splitBankAccountId) {
      splitBObj = await prisma.bankAccount.findUnique({ where: { id: parseInt(splitBankAccountId) } });
    }

    for (const b of openBills) {
      if (remainingPayment <= 0.001) break;

      const payForBill = Math.min(b.remainingDue, remainingPayment);
      const entryHeadId = headId ? parseInt(headId) : (b.headId || fallbackHeadId);

      if (isSplit) {
        const cashRatio = parseFloat(cashAmount || 0) / totalPayAmt;
        const bankRatio = parseFloat(bankAmount || 0) / totalPayAmt;
        const billCash = Math.round(payForBill * cashRatio * 100) / 100;
        const billBank = Math.round((payForBill - billCash) * 100) / 100;

        if (billCash > 0) {
          const cashEntry = await prisma.expenseEntry.create({
            data: {
              financialYearId: resolvedFyId,
              academicYearId: resolvedAyId,
              headId: entryHeadId,
              partyId: partyId,
              amount: billCash,
              expenseDateBs: expenseDateBs,
              expenseDateAd: new Date(),
              paidTo: party.name,
              paymentMedium: 'CASH',
              paidFromAccount: 'विद्यालय नगद खाता (School Cash / Petty Cash A/c)',
              billNo: b.billNo,
              voucherNo: voucherNo || undefined,
              description: `Settlement payment for Bill ${b.billNo} [Bill Reg ID: ${b.registrationId || b.id}] [Total Bill: Rs. ${b.totalBillAmount.toLocaleString()}] [Cash Portion 1/2]`,
              remarks: remarks || `Lump-sum cash settlement for Bill ${b.billNo}`,
              approvedBy: 'Principal (प्रधानाध्यापक)',
            }
          });
          createdEntries.push(cashEntry);
        }

        if (billBank > 0) {
          const bankEntry = await prisma.expenseEntry.create({
            data: {
              financialYearId: resolvedFyId,
              academicYearId: resolvedAyId,
              headId: entryHeadId,
              partyId: partyId,
              amount: billBank,
              expenseDateBs: expenseDateBs,
              expenseDateAd: new Date(),
              paidTo: party.name,
              paymentMedium: 'CHEQUE',
              paidFromAccount: splitBObj ? `${splitBObj.bankName} (${splitBObj.accountNo})` : 'School Bank Account',
              bankAccountId: splitBankAccountId ? parseInt(splitBankAccountId) : undefined,
              chequeNo: splitChequeNo || null,
              chequePayeeName: chequePayeeName || party.name,
              billNo: b.billNo,
              voucherNo: voucherNo || undefined,
              description: `Settlement payment for Bill ${b.billNo} [Bill Reg ID: ${b.registrationId || b.id}] [Total Bill: Rs. ${b.totalBillAmount.toLocaleString()}] [Cheque/Bank Portion 2/2]`,
              remarks: remarks || `Lump-sum bank settlement for Bill ${b.billNo}`,
              approvedBy: 'Principal (प्रधानाध्यापक)',
            }
          });
          createdEntries.push(bankEntry);
        }
      } else {
        const entry = await prisma.expenseEntry.create({
          data: {
            financialYearId: resolvedFyId,
            academicYearId: resolvedAyId,
            headId: entryHeadId,
            partyId: partyId,
            amount: payForBill,
            expenseDateBs: expenseDateBs,
            expenseDateAd: new Date(),
            paidTo: party.name,
            paymentMedium: paymentMedium || 'CHEQUE',
            paidFromAccount: paymentMedium === 'CASH' ? 'विद्यालय नगद खाता (School Cash / Petty Cash A/c)' : paidFromAcc,
            bankAccountId: paymentMedium !== 'CASH' && bankAccountId ? parseInt(bankAccountId) : undefined,
            chequeNo: chequeNo || null,
            chequePayeeName: chequePayeeName || party.name,
            voucherNo: voucherNo || undefined,
            billNo: b.billNo,
            description: `Settlement payment for Bill ${b.billNo} [Bill Reg ID: ${b.registrationId || b.id}] [Total Bill: Rs. ${b.totalBillAmount.toLocaleString()}]`,
            remarks: remarks || `Lump-sum settlement payment for Bill ${b.billNo}`,
            approvedBy: 'Principal (प्रधानाध्यापक)',
          }
        });
        createdEntries.push(entry);
      }

      remainingPayment -= payForBill;
    }

    return res.status(201).json({
      success: true,
      data: createdEntries,
      message: `पार्टी बक्यौता रकम रू ${totalPayAmt.toLocaleString()} सम्बन्धित ${openBills.length} वटा बिलहरूमा सफलतापूर्वक चुक्ता भयो!`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

