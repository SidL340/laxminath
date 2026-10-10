const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { resolveFinancialYearByDate } = require('./financialYears');

const router = express.Router();

// GET /api/finance-reports/executive-summary — main dashboard comprehensive stats
router.get('/executive-summary', authenticate, async (req, res) => {
  try {
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    // BS today approximate or from query
    const todayBs = req.query.todayBs || '';

    // 1. Fee Collections: Today, This Month (same YYYY-MM in BS or AD), This Fiscal Year
    const currentFy = await prisma.financialYear.findFirst({ where: { isActive: true } });
    const fyId = currentFy ? currentFy.id : null;

    // Today's fees
    const feesToday = await prisma.feeCollection.aggregate({
      where: todayBs ? { paidDateBs: todayBs } : { paidDateAd: { gte: new Date(todayIso) } },
      _sum: { amount: true },
      _count: { id: true },
    });

    // Month's fees (e.g. "2081-06")
    const monthPrefix = todayBs ? todayBs.slice(0, 7) : todayIso.slice(0, 7);
    const feesMonth = await prisma.feeCollection.aggregate({
      where: todayBs ? { paidDateBs: { startsWith: monthPrefix } } : { paidDateAd: { gte: new Date(today.getFullYear(), today.getMonth(), 1) } },
      _sum: { amount: true },
      _count: { id: true },
    });

    // Fiscal Year's fees
    const feesYear = await prisma.feeCollection.aggregate({
      where: fyId ? { financialYearId: fyId } : {},
      _sum: { amount: true },
      _count: { id: true },
    });

    // 2. Student Attendance: Active students, Absent today
    const [activeStudentsCount, todayAbsentCount] = await Promise.all([
      prisma.student.count({ where: { isActive: true, status: 'ACTIVE' } }),
      prisma.attendance.count({
        where: {
          status: 'ABSENT',
          ...(todayBs ? { dateBs: todayBs } : { dateAd: { gte: new Date(todayIso) } }),
        },
      }),
    ]);

    // 3. Bank Balances & Cash Balance
    const bankAccounts = await prisma.bankAccount.findMany({ where: { isActive: true } });
    
    // Incomes deposited to bank accounts
    const bankIncomes = await prisma.incomeEntry.groupBy({
      by: ['bankAccountId'],
      where: { bankAccountId: { not: null } },
      _sum: { amount: true },
    });
    const bankExpenses = await prisma.expenseEntry.groupBy({
      by: ['bankAccountId'],
      where: { bankAccountId: { not: null } },
      _sum: { amount: true },
    });

    const bankIncMap = new Map(bankIncomes.map(i => [i.bankAccountId, i._sum.amount || 0]));
    const bankExpMap = new Map(bankExpenses.map(e => [e.bankAccountId, e._sum.amount || 0]));

    let totalBankBalance = 0;
    const bankAccountsWithBalance = bankAccounts.map(b => {
      const inc = bankIncMap.get(b.id) || 0;
      const exp = bankExpMap.get(b.id) || 0;
      const bal = Math.round((inc - exp) * 100) / 100;
      totalBankBalance += bal;
      return {
        ...b,
        totalIncome: inc,
        totalExpense: exp,
        currentBalance: bal,
      };
    });

    // Cash on Hand: Cash Incomes + Cash Fees - Cash Expenses
    const [cashIncomes, cashFees, cashExpenses] = await Promise.all([
      prisma.incomeEntry.aggregate({ where: { paymentMedium: 'CASH' }, _sum: { amount: true } }),
      prisma.feeCollection.aggregate({ where: { paymentMedium: 'CASH' }, _sum: { amount: true } }),
      prisma.expenseEntry.aggregate({ where: { paymentMedium: 'CASH' }, _sum: { amount: true } }),
    ]);

    const cashOnHand = Math.round(
      ((cashIncomes._sum.amount || 0) + (cashFees._sum.amount || 0) - (cashExpenses._sum.amount || 0)) * 100
    ) / 100;

    // 4. Receivables (Student Fee Dues)
    const feeDuesAgg = await prisma.studentFeeDue.aggregate({
      where: { isPaid: false },
      _sum: { amount: true, paidAmount: true },
    });
    const totalReceivables = Math.max(0, (feeDuesAgg._sum.amount || 0) - (feeDuesAgg._sum.paidAmount || 0));

    // 5. Payables (Vendor Bills Open Due)
    const allPayableExpenses = await prisma.expenseEntry.findMany({
      where: { partyId: { not: null }, billNo: { not: null } },
      select: { partyId: true, billNo: true, amount: true, description: true, remarks: true },
    });

    const openBillsMap = new Map();
    for (const e of allPayableExpenses) {
      if (!e.billNo || !e.billNo.trim() || e.billNo === 'LUMP-SUM-SETTLEMENT') continue;
      const pKey = `${e.partyId}_${e.billNo.trim()}`;
      if (!openBillsMap.has(pKey)) {
        let parsedTotal = e.amount || 0;
        const match = (e.description || '').match(/\[Total Bill:\s*(?:Rs\.|रू)?\s*([\d,.]+)\]/i) || (e.remarks || '').match(/\[Total Bill:\s*(?:Rs\.|रू)?\s*([\d,.]+)\]/i);
        if (match) parsedTotal = parseFloat(match[1].replace(/,/g, '')) || e.amount;
        openBillsMap.set(pKey, { total: parsedTotal, paid: 0 });
      }
      openBillsMap.get(pKey).paid += (e.amount || 0);
    }

    let totalPayables = 0;
    for (const b of openBillsMap.values()) {
      const due = Math.max(0, b.total - b.paid);
      totalPayables += due;
    }
    totalPayables = Math.round(totalPayables * 100) / 100;

    // 6. Financial Position Summary (Assets vs Liabilities)
    const totalCurrentAssets = Math.round((Math.max(0, totalBankBalance) + Math.max(0, cashOnHand) + totalReceivables) * 100) / 100;
    const totalLiabilities = totalPayables;
    const netPosition = Math.round((totalCurrentAssets - totalLiabilities) * 100) / 100;

    return res.json({
      success: true,
      data: {
        feeCollection: {
          today: feesToday._sum.amount || 0,
          todayCount: feesToday._count.id || 0,
          thisMonth: feesMonth._sum.amount || 0,
          thisMonthCount: feesMonth._count.id || 0,
          thisFiscalYear: feesYear._sum.amount || 0,
          thisFiscalYearCount: feesYear._count.id || 0,
        },
        students: {
          activeCount: activeStudentsCount,
          todayAbsentCount: todayAbsentCount,
        },
        balances: {
          totalBankBalance,
          cashOnHand,
          totalLiquidFunds: totalBankBalance + cashOnHand,
          bankAccounts: bankAccountsWithBalance,
        },
        dues: {
          totalReceivables,
          totalPayables,
        },
        financialPosition: {
          currentAssets: totalCurrentAssets,
          liabilities: totalLiabilities,
          netPosition,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/finance-reports/category-breakdown — category-wise income and expenses
router.get('/category-breakdown', authenticate, async (req, res) => {
  try {
    const { financialYearId, fromDateBs, toDateBs } = req.query;
    const whereExp = {};
    const whereInc = {};

    if (financialYearId) {
      whereExp.financialYearId = parseInt(financialYearId);
      whereInc.financialYearId = parseInt(financialYearId);
    }
    if (fromDateBs || toDateBs) {
      whereExp.expenseDateBs = {};
      whereInc.receivedDateBs = {};
      if (fromDateBs) {
        whereExp.expenseDateBs.gte = fromDateBs;
        whereInc.receivedDateBs.gte = fromDateBs;
      }
      if (toDateBs) {
        whereExp.expenseDateBs.lte = toDateBs;
        whereInc.receivedDateBs.lte = toDateBs;
      }
    }

    const [expenseEntries, incomeEntries, expenseCategories, incomeCategories] = await Promise.all([
      prisma.expenseEntry.findMany({
        where: whereExp,
        include: { head: { include: { category: true } }, party: true },
      }),
      prisma.incomeEntry.findMany({
        where: whereInc,
        include: { head: true, party: true },
      }),
      prisma.expenseCategory.findMany({ where: { isActive: true }, include: { expenseHeads: true } }),
      prisma.incomeCategory.findMany({ where: { isActive: true } }),
    ]);

    // Aggregate expense by category
    const expenseCategoryMap = new Map();
    for (const cat of expenseCategories) {
      expenseCategoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        nameNepali: cat.nameNepali,
        headsCount: cat.expenseHeads.length,
        totalAmount: 0,
        entriesCount: 0,
        heads: new Map(),
      });
    }

    for (const e of expenseEntries) {
      const catId = e.head?.category?.id || e.head?.categoryId || 0;
      if (!expenseCategoryMap.has(catId)) {
        expenseCategoryMap.set(catId, {
          id: catId,
          name: e.head?.category?.name || 'General / Other Expenses',
          nameNepali: e.head?.category?.nameNepali || 'अन्य खर्च',
          totalAmount: 0,
          entriesCount: 0,
          heads: new Map(),
        });
      }
      const cat = expenseCategoryMap.get(catId);
      cat.totalAmount += e.amount;
      cat.entriesCount++;

      const hId = e.headId;
      if (!cat.heads.has(hId)) {
        cat.heads.set(hId, {
          id: hId,
          name: e.head?.name || 'General',
          code: e.head?.code || '',
          totalAmount: 0,
          entriesCount: 0,
        });
      }
      const h = cat.heads.get(hId);
      h.totalAmount += e.amount;
      h.entriesCount++;
    }

    const expenseCategoryList = Array.from(expenseCategoryMap.values())
      .filter(c => c.totalAmount > 0 || c.entriesCount > 0)
      .map(c => ({
        ...c,
        heads: Array.from(c.heads.values()).sort((a, b) => b.totalAmount - a.totalAmount),
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return res.json({
      success: true,
      data: {
        expenses: expenseCategoryList,
        totalExpense: expenseEntries.reduce((sum, e) => sum + e.amount, 0),
        totalIncome: incomeEntries.reduce((sum, i) => sum + i.amount, 0),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/finance-reports/balance-sheet — comprehensive balance sheet (वासलात)
router.get('/balance-sheet', authenticate, async (req, res) => {
  try {
    const { financialYearId } = req.query;
    const fyFilter = financialYearId ? { financialYearId: parseInt(financialYearId) } : {};

    // 1. Current Assets
    // Cash on Hand
    const [cashInc, cashFees, cashExp] = await Promise.all([
      prisma.incomeEntry.aggregate({ where: { paymentMedium: 'CASH', ...fyFilter }, _sum: { amount: true } }),
      prisma.feeCollection.aggregate({ where: { paymentMedium: 'CASH', ...fyFilter }, _sum: { amount: true } }),
      prisma.expenseEntry.aggregate({ where: { paymentMedium: 'CASH', ...fyFilter }, _sum: { amount: true } }),
    ]);
    const cashOnHand = Math.max(0, Math.round(((cashInc._sum.amount || 0) + (cashFees._sum.amount || 0) - (cashExp._sum.amount || 0)) * 100) / 100);

    // Bank Accounts
    const bankAccounts = await prisma.bankAccount.findMany({ where: { isActive: true } });
    const bankIncomes = await prisma.incomeEntry.groupBy({
      by: ['bankAccountId'],
      where: { bankAccountId: { not: null }, ...fyFilter },
      _sum: { amount: true },
    });
    const bankExpenses = await prisma.expenseEntry.groupBy({
      by: ['bankAccountId'],
      where: { bankAccountId: { not: null }, ...fyFilter },
      _sum: { amount: true },
    });
    const bankIncMap = new Map(bankIncomes.map(i => [i.bankAccountId, i._sum.amount || 0]));
    const bankExpMap = new Map(bankExpenses.map(e => [e.bankAccountId, e._sum.amount || 0]));

    let totalBankBalances = 0;
    const bankList = bankAccounts.map(b => {
      const inc = bankIncMap.get(b.id) || 0;
      const exp = bankExpMap.get(b.id) || 0;
      const balance = Math.max(0, Math.round((inc - exp) * 100) / 100);
      totalBankBalances += balance;
      return {
        id: b.id,
        bankName: b.bankName,
        accountNo: b.accountNo,
        accountName: b.accountName,
        branch: b.branch,
        balance,
      };
    });

    // Student Fee Receivables
    const feeDuesAgg = await prisma.studentFeeDue.aggregate({
      where: { isPaid: false },
      _sum: { amount: true, paidAmount: true },
    });
    const feeReceivables = Math.max(0, (feeDuesAgg._sum.amount || 0) - (feeDuesAgg._sum.paidAmount || 0));

    // Inventory Stock Value
    const inventoryItems = await prisma.inventoryItem.findMany({
      select: { id: true, name: true, quantity: true, purchaseAmount: true },
    });
    const inventoryStockValue = inventoryItems.reduce((sum, item) => sum + (item.purchaseAmount || 0), 0);

    const totalCurrentAssets = Math.round((cashOnHand + totalBankBalances + feeReceivables + inventoryStockValue) * 100) / 100;

    // Fixed Assets (Dynamically aggregated from actual inventory and asset records)
    const inventoryWithCats = await prisma.inventoryItem.findMany({
      include: { category: true },
    });
    const catMap = new Map();
    for (const item of inventoryWithCats) {
      const catName = item.category?.name ? `${item.category.name} Assets` : 'General School Assets';
      const val = (item.purchaseAmount || 0);
      catMap.set(catName, (catMap.get(catName) || 0) + val);
    }
    const fixedAssetsList = Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));
    const totalFixedAssets = fixedAssetsList.reduce((sum, a) => sum + a.value, 0);

    const grandTotalAssets = Math.round((totalCurrentAssets + totalFixedAssets) * 100) / 100;

    // 2. Liabilities (Derived purely from outstanding vendor bills in database)
    const allPayableExpenses = await prisma.expenseEntry.findMany({
      where: { partyId: { not: null }, billNo: { not: null }, ...fyFilter },
      select: { partyId: true, billNo: true, amount: true, description: true, remarks: true },
    });
    const openBillsMap = new Map();
    for (const e of allPayableExpenses) {
      if (!e.billNo || !e.billNo.trim() || e.billNo === 'LUMP-SUM-SETTLEMENT') continue;
      const pKey = `${e.partyId}_${e.billNo.trim()}`;
      if (!openBillsMap.has(pKey)) {
        let parsedTotal = e.amount || 0;
        const match = (e.description || '').match(/\[Total Bill:\s*(?:Rs\.|रू)?\s*([\d,.]+)\]/i) || (e.remarks || '').match(/\[Total Bill:\s*(?:Rs\.|रू)?\s*([\d,.]+)\]/i);
        if (match) parsedTotal = parseFloat(match[1].replace(/,/g, '')) || e.amount;
        openBillsMap.set(pKey, { total: parsedTotal, paid: 0 });
      }
      openBillsMap.get(pKey).paid += (e.amount || 0);
    }
    let totalPayables = 0;
    for (const b of openBillsMap.values()) {
      totalPayables += Math.max(0, b.total - b.paid);
    }

    const currentLiabilitiesList = [
      { name: 'Accounts Payable / Vendor Bills (तिर्न बाँकी सप्लायर बिल)', amount: totalPayables },
    ];
    const totalCurrentLiabilities = currentLiabilitiesList.reduce((sum, l) => sum + l.amount, 0);

    // 3. Income & Expenditure Net Surplus (From verified accounting records)
    const [totalInc, totalExp, totalFees] = await Promise.all([
      prisma.incomeEntry.aggregate({ where: fyFilter, _sum: { amount: true } }),
      prisma.expenseEntry.aggregate({ where: fyFilter, _sum: { amount: true } }),
      prisma.feeCollection.aggregate({ where: fyFilter, _sum: { amount: true } }),
    ]);
    const totalRevenue = (totalInc._sum.amount || 0) + (totalFees._sum.amount || 0);
    const totalExpenditure = totalExp._sum.amount || 0;
    const currentYearNetSurplus = Math.round((totalRevenue - totalExpenditure) * 100) / 100;

    // Capital & Equity Fund (Purely dynamic from net balance)
    const netEquity = Math.round((grandTotalAssets - totalCurrentLiabilities) * 100) / 100;
    const accumulatedSurplus = Math.max(0, Math.round((netEquity - currentYearNetSurplus) * 100) / 100);

    const capitalFundsList = [
      { name: 'School General Capital Fund (विद्यालय पुँजी कोष)', amount: accumulatedSurplus },
      { name: 'Current Year Net Surplus / Deficit (चालु वर्षको खुद बचत/घाटा)', amount: currentYearNetSurplus },
    ];
    const totalCapitalFund = netEquity;
    const grandTotalLiabilitiesAndEquity = Math.round((totalCurrentLiabilities + totalCapitalFund) * 100) / 100;

    return res.json({
      success: true,
      data: {
        asOfDateBs: req.query.todayBs || '',
        currentAssets: {
          cashOnHand,
          bankAccounts: bankList,
          totalBankBalances,
          feeReceivables,
          inventoryStockValue,
          totalCurrentAssets,
        },
        fixedAssets: {
          items: fixedAssetsList,
          totalFixedAssets,
        },
        grandTotalAssets,
        currentLiabilities: {
          items: currentLiabilitiesList,
          totalCurrentLiabilities,
        },
        capitalAndEquity: {
          items: capitalFundsList,
          currentYearNetSurplus,
          totalCapitalFund,
        },
        grandTotalLiabilitiesAndEquity,
        isBalanced: Math.abs(grandTotalAssets - grandTotalLiabilitiesAndEquity) < 1,
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// GET /api/finance-reports/audit-statement — comprehensive audit-ready formal statement
router.get('/audit-statement', authenticate, async (req, res) => {
  try {
    const { financialYearId } = req.query;
    const isAllYears = !financialYearId || financialYearId === 'ALL' || financialYearId === '';
    
    let fy = null;
    let fyFilter = {};

    if (!isAllYears) {
      const fyIdNum = parseInt(financialYearId);
      fy = await prisma.financialYear.findUnique({ where: { id: fyIdNum } });
      if (fy) {
        fyFilter = { financialYearId: fyIdNum };
      }
    } else {
      // For all fiscal years, fetch active FY as reference metadata
      fy = await prisma.financialYear.findFirst({ where: { isActive: true } }) ||
           await prisma.financialYear.findFirst({ orderBy: { startDateBs: 'desc' } });
      fyFilter = {};
    }

    // 1. Opening Balances
    let openingCash = 0;
    let openingBank = 0;
    let openingPayables = 0;
    let openingReceivables = 0;
    let parsedOpeningDetails = { bankBalances: {}, carryforwardPayablesList: [] };

    if (!isAllYears && fy) {
      openingCash = fy.openingCashBalance || 0;
      openingBank = fy.openingBankBalance || 0;
      openingPayables = fy.openingPayables || 0;
      openingReceivables = fy.openingReceivables || 0;
      if (fy.openingDetails) {
        try {
          parsedOpeningDetails = typeof fy.openingDetails === 'string' ? JSON.parse(fy.openingDetails) : fy.openingDetails;
        } catch (e) {}
      }
    } else {
      // Sum opening balances across all FYs or active FY
      const allFys = await prisma.financialYear.findMany();
      openingCash = allFys.reduce((s, f) => s + (f.openingCashBalance || 0), 0);
      openingBank = allFys.reduce((s, f) => s + (f.openingBankBalance || 0), 0);
      openingPayables = allFys.reduce((s, f) => s + (f.openingPayables || 0), 0);
      openingReceivables = allFys.reduce((s, f) => s + (f.openingReceivables || 0), 0);
    }
    const totalOpeningFunds = openingCash + openingBank;

    // 2. Incomes & Grants (Schedule 1)
    const incomeEntries = await prisma.incomeEntry.findMany({
      where: fyFilter,
      include: { head: { include: { category: true } }, party: true },
      orderBy: { receivedDateBs: 'asc' },
    });
    const feeCollections = await prisma.feeCollection.findMany({
      where: fyFilter,
      include: { feeHead: true, student: true },
      orderBy: { paidDateBs: 'asc' },
    });

    const totalGeneralIncome = incomeEntries.reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalFeeIncome = feeCollections.reduce((sum, f) => sum + (f.amount || 0), 0);
    const totalCurrentIncome = totalGeneralIncome + totalFeeIncome;
    const totalAvailableFunds = totalCurrentIncome + totalOpeningFunds;

    // 3. Expenses & Payroll (Schedule 2)
    const expenseEntries = await prisma.expenseEntry.findMany({
      where: fyFilter,
      include: { head: { include: { category: true } }, party: true },
      orderBy: { expenseDateBs: 'asc' },
    });
    const payrollEntries = await prisma.payroll.findMany({
      where: {
        ...fyFilter,
        status: 'PAID',
      },
      include: { teacher: true },
    });

    const totalGeneralExpenses = expenseEntries.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalPayrollExpenses = payrollEntries.reduce((sum, p) => sum + (p.khudPaaunuParne || p.kulRakam || 0), 0);
    const totalCurrentExpenses = totalGeneralExpenses + totalPayrollExpenses;

    const netSurplusOrDeficit = Math.round((totalCurrentIncome - totalCurrentExpenses) * 100) / 100;
    const closingLiquidBalance = Math.round((totalAvailableFunds - totalCurrentExpenses) * 100) / 100;

    // 4. Accounts Payable & Vendor Dues (Schedule 4)
    const allBilledExpenses = await prisma.expenseEntry.findMany({
      where: {
        OR: [
          { billNo: { not: null } },
          { paymentMedium: 'UNPAID_BILL' },
          { amount: 0 },
        ],
        ...fyFilter,
      },
      include: { party: true, head: true, financialYear: true },
      orderBy: { expenseDateBs: 'asc' },
    });

    const vendorDuesMap = new Map();
    for (const e of allBilledExpenses) {
      const cleanBill = (e.billNo && e.billNo.trim()) || `REF-${e.id}`;
      const pKey = `${e.partyId || e.paidTo || 'direct'}_${cleanBill}`;
      if (!vendorDuesMap.has(pKey)) {
        let parsedTotal = e.amount || 0;
        const match = (e.description || '').match(/\[Total Bill:\s*(?:Rs\.|रू)?\s*([\d,.]+)\]/i) || (e.remarks || '').match(/\[Total Bill:\s*(?:Rs\.|रू)?\s*([\d,.]+)\]/i);
        if (match) {
          parsedTotal = parseFloat(match[1].replace(/,/g, '')) || e.amount;
        } else if (e.amount === 0 && e.description) {
          const anyNumMatch = e.description.match(/(?:Rs\.?|रू\.?|रु\.?)\s*([\d,.]+)/i);
          if (anyNumMatch) parsedTotal = parseFloat(anyNumMatch[1].replace(/,/g, '')) || 0;
        }

        vendorDuesMap.set(pKey, {
          id: e.id,
          billNo: e.billNo || `REF-${e.id}`,
          partyId: e.partyId,
          partyName: e.party?.nameNepali ? `${e.party.nameNepali} (${e.party.name})` : (e.party?.name || e.paidTo || 'पार्टी/आपूर्तिकर्ता'),
          panNo: e.party?.panNo || '',
          headName: e.head?.nameNepali || e.head?.name || 'General Expense',
          totalBillAmount: parsedTotal,
          totalPaidAmount: 0,
          remainingDue: 0,
          billDateBs: e.expenseDateBs,
          financialYearId: e.financialYearId,
          financialYear: e.financialYear?.year || '',
        });
      }
      const b = vendorDuesMap.get(pKey);
      b.totalPaidAmount += (e.amount || 0);
    }

    const payablesList = Array.from(vendorDuesMap.values()).map(b => {
      const remainingDue = Math.max(0, b.totalBillAmount - b.totalPaidAmount);
      return {
        ...b,
        remainingDue,
        status: remainingDue === 0 ? 'FULLY_PAID' : b.totalPaidAmount > 0 ? 'PARTIAL' : 'UNPAID',
      };
    });

    const totalOutstandingVendorDues = Math.round(payablesList.reduce((sum, b) => sum + b.remainingDue, 0) * 100) / 100;
    const totalLiabilities = Math.round((totalOutstandingVendorDues + openingPayables) * 100) / 100;

    // 5. Bank Accounts Balances
    const bankAccounts = await prisma.bankAccount.findMany({ where: { isActive: true } });
    const bankIncomes = await prisma.incomeEntry.groupBy({
      by: ['bankAccountId'],
      where: { bankAccountId: { not: null }, ...fyFilter },
      _sum: { amount: true },
    });
    const bankExpenses = await prisma.expenseEntry.groupBy({
      by: ['bankAccountId'],
      where: { bankAccountId: { not: null }, ...fyFilter },
      _sum: { amount: true },
    });
    const bIncMap = new Map(bankIncomes.map(i => [i.bankAccountId, i._sum.amount || 0]));
    const bExpMap = new Map(bankExpenses.map(e => [e.bankAccountId, e._sum.amount || 0]));

    let totalBankCurrentBalance = 0;
    const bankAccountsSummary = bankAccounts.map(b => {
      const openAmt = parsedOpeningDetails.bankBalances?.[b.id] || b.openingBalance || 0;
      const inc = bIncMap.get(b.id) || 0;
      const exp = bExpMap.get(b.id) || 0;
      const currBal = Math.round((openAmt + inc - exp) * 100) / 100;
      totalBankCurrentBalance += currBal;
      return {
        id: b.id,
        accountName: b.accountName,
        accountNo: b.accountNo,
        bankName: b.bankName,
        branch: b.branch,
        openingBalance: openAmt,
        totalIncome: inc,
        totalExpense: exp,
        currentBalance: currBal,
      };
    });

    // Cash Balance
    const [cashInc, cashFees, cashExp] = await Promise.all([
      prisma.incomeEntry.aggregate({ where: { paymentMedium: 'CASH', ...fyFilter }, _sum: { amount: true } }),
      prisma.feeCollection.aggregate({ where: { paymentMedium: 'CASH', ...fyFilter }, _sum: { amount: true } }),
      prisma.expenseEntry.aggregate({ where: { paymentMedium: 'CASH', ...fyFilter }, _sum: { amount: true } }),
    ]);
    const totalCashOnHand = Math.round(
      (openingCash + (cashInc._sum.amount || 0) + (cashFees._sum.amount || 0) - (cashExp._sum.amount || 0)) * 100
    ) / 100;

    // 6. Category-Wise Aggregations
    const expCategories = await prisma.expenseCategory.findMany({
      where: { isActive: true },
      include: { expenseHeads: true },
    });

    const categorySummaryList = expCategories.map(cat => {
      const headIds = cat.expenseHeads.map(h => h.id);
      const catExpenses = expenseEntries.filter(e => headIds.includes(e.headId));
      const totalAmount = catExpenses.reduce((sum, e) => sum + e.amount, 0);

      // Remaining dues in this category
      const catDues = payablesList
        .filter(b => cat.expenseHeads.some(h => h.name === b.headName || h.id === b.headId))
        .reduce((sum, b) => sum + b.remainingDue, 0);

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryNameNepali: cat.nameNepali || cat.name,
        headsCount: cat.expenseHeads.length,
        totalPaidExpense: totalAmount,
        totalDueRemaining: catDues,
        totalBilledCommitment: totalAmount + catDues,
      };
    });

    // 7. Trial Balance (सन्तुलन परीक्षण)
    const trialBalanceItems = [
      { code: '101', name: 'प्रारम्भिक नगद तथा बैंक मौज्दात (Opening Liquid Funds)', debit: totalOpeningFunds, credit: 0 },
      { code: '102', name: 'बैंक मौज्दातहरू (Closing Bank Balances)', debit: totalBankCurrentBalance, credit: 0 },
      { code: '103', name: 'नगद मौज्दात (Closing Cash in Hand)', debit: Math.max(0, totalCashOnHand), credit: 0 },
      { code: '201', name: 'सरकारी अनुदान तथा साधारण आम्दानी (Government Grants & Income)', debit: 0, credit: totalGeneralIncome },
      { code: '202', name: 'विद्यार्थी शुल्क आम्दानी (Student Fees Collection)', debit: 0, credit: totalFeeIncome },
      { code: '301', name: 'शिक्षक तथा कर्मचारी पारिश्रमिक खर्च (Teacher & Staff Payroll)', debit: totalPayrollExpenses, credit: 0 },
      { code: '302', name: 'शैक्षिक, प्रशासनिक तथा संचालन खर्च (Operational & Capital Expenses)', debit: totalGeneralExpenses, credit: 0 },
      { code: '401', name: 'पार्टी/भेन्डर तिर्न बाँकी बक्यौता दायित्व (Accounts Payable Liabilities)', debit: 0, credit: totalOutstandingVendorDues },
    ];

    const totalDebit = trialBalanceItems.reduce((sum, t) => sum + t.debit, 0);
    const totalCredit = trialBalanceItems.reduce((sum, t) => sum + t.credit, 0);

    return res.json({
      success: true,
      data: {
        financialYear: fy,
        openingBalances: {
          openingCashBalance: openingCash,
          openingBankBalance: openingBank,
          totalOpeningFunds,
          openingPayables,
          openingReceivables,
          details: parsedOpeningDetails,
        },
        revenueSummary: {
          grantsAndGeneral: totalGeneralIncome,
          studentFees: totalFeeIncome,
          totalCurrentIncome,
          totalAvailableFunds,
        },
        expenditureSummary: {
          payroll: totalPayrollExpenses,
          generalExpenses: totalGeneralExpenses,
          totalCurrentExpenses,
          netSurplusOrDeficit,
          closingLiquidBalance,
        },
        payablesSummary: {
          totalBillsCount: payablesList.length,
          totalOutstandingVendorDues,
          openingCarryforwardPayables: openingPayables,
          totalLiabilities,
          pendingBills: payablesList.filter(b => b.remainingDue > 0),
          allBills: payablesList,
        },
        bankAndCash: {
          cashOnHand: totalCashOnHand,
          bankAccounts: bankAccountsSummary,
          totalBankBalance: totalBankCurrentBalance,
          totalClosingLiquid: totalBankCurrentBalance + totalCashOnHand,
        },
        categorySummary: categorySummaryList,
        trialBalance: {
          items: trialBalanceItems,
          totalDebit,
          totalCredit,
          isBalanced: Math.abs(totalDebit - totalCredit) < 1,
        },
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/finance-reports/staff-advance — Dedicated Staff Advance Register Report
router.get('/staff-advance', authenticate, async (req, res) => {
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
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ── MATRIX REPORT: CATEGORY & TOPIC-WISE ACCORDING TO FISCAL YEAR & PARTIES ──
// Supports both INCOME (निकासा तथा आम्दानी फाँटवारी) and EXPENSE (खर्च फाँटवारी)
router.get('/matrix-report', authenticate, async (req, res) => {
  try {
    const {
      type = 'INCOME', // 'INCOME' or 'EXPENSE'
      financialYearId,
      categoryId,
      partyId,
      headId,
      fromDateBs,
      toDateBs,
      q,
    } = req.query;

    const isIncome = type.toUpperCase() === 'INCOME';

    // 1. Resolve Financial Year
    let fy = null;
    let effectiveFyId = null;
    if (financialYearId && financialYearId !== 'ALL') {
      effectiveFyId = parseInt(financialYearId);
      fy = await prisma.financialYear.findUnique({ where: { id: effectiveFyId } });
    } else if (financialYearId === 'ALL') {
      effectiveFyId = null;
    } else {
      fy = await prisma.financialYear.findFirst({ where: { isActive: true } });
      if (!fy) fy = await prisma.financialYear.findFirst({ orderBy: { startDateBs: 'desc' } });
      if (fy) effectiveFyId = fy.id;
    }

    if (isIncome) {
      // ─── A. INCOME MATRIX & PARTY BREAKDOWN ──────────────────────────────
      const where = {};
      if (effectiveFyId) where.financialYearId = effectiveFyId;
      if (partyId && partyId !== 'ALL') where.partyId = parseInt(partyId);
      if (headId && headId !== 'ALL') where.headId = parseInt(headId);
      if (categoryId && categoryId !== 'ALL') {
        where.head = { categoryId: parseInt(categoryId) };
      }
      if (fromDateBs || toDateBs) {
        where.receivedDateBs = {};
        if (fromDateBs) where.receivedDateBs.gte = fromDateBs;
        if (toDateBs) where.receivedDateBs.lte = toDateBs;
      }
      if (q && q.trim()) {
        const queryTerm = q.trim();
        where.OR = [
          { voucherNo: { contains: queryTerm, mode: 'insensitive' } },
          { sourceOrg: { contains: queryTerm, mode: 'insensitive' } },
          { remarks: { contains: queryTerm, mode: 'insensitive' } },
          { chequeNo: { contains: queryTerm, mode: 'insensitive' } },
          { party: { name: { contains: queryTerm, mode: 'insensitive' } } },
          { head: { name: { contains: queryTerm, mode: 'insensitive' } } },
          { head: { nameNepali: { contains: queryTerm, mode: 'insensitive' } } },
        ];
      }

      const [entries, allCategories, allParties] = await Promise.all([
        prisma.incomeEntry.findMany({
          where,
          include: {
            head: { include: { category: true } },
            party: true,
            financialYear: true,
          },
          orderBy: [
            { receivedDateBs: 'asc' },
            { id: 'asc' },
          ],
        }),
        prisma.incomeCategory.findMany({
          where: { isActive: true },
          include: {
            incomeHeads: {
              where: { isActive: true },
              orderBy: { id: 'asc' },
            },
          },
          orderBy: { id: 'asc' },
        }),
        prisma.party.findMany({
          orderBy: { name: 'asc' },
        }),
      ]);

      let headsForCategory = [];
      if (categoryId && categoryId !== 'ALL') {
        const selectedCat = allCategories.find(c => c.id === parseInt(categoryId));
        if (selectedCat) {
          headsForCategory = selectedCat.incomeHeads.map(h => ({
            id: h.id,
            name: h.name,
            nameNepali: h.nameNepali || h.name,
            code: h.code || '',
            categoryId: selectedCat.id,
            categoryName: selectedCat.name,
            categoryNameNepali: selectedCat.nameNepali || selectedCat.name,
          }));
        }
      } else {
        for (const cat of allCategories) {
          for (const h of cat.incomeHeads) {
            headsForCategory.push({
              id: h.id,
              name: h.name,
              nameNepali: h.nameNepali || h.name,
              code: h.code || '',
              categoryId: cat.id,
              categoryName: cat.name,
              categoryNameNepali: cat.nameNepali || cat.name,
            });
          }
        }
      }

      const headMap = new Map(headsForCategory.map(h => [h.id, h]));
      for (const entry of entries) {
        if (entry.head && !headMap.has(entry.head.id)) {
          const hObj = {
            id: entry.head.id,
            name: entry.head.name,
            nameNepali: entry.head.nameNepali || entry.head.name,
            code: entry.head.code || '',
            categoryId: entry.head.category?.id || 0,
            categoryName: entry.head.category?.name || 'General',
            categoryNameNepali: entry.head.category?.nameNepali || 'सामान्य',
          };
          headMap.set(entry.head.id, hObj);
          headsForCategory.push(hObj);
        }
      }

      let displayColumns = headsForCategory;
      if (headId && headId !== 'ALL') {
        displayColumns = headsForCategory.filter(h => h.id === parseInt(headId));
      }

      const headTotals = {};
      const categoryTotals = {};
      let totalAmount = 0;
      let bankTotal = 0;
      let cashTotal = 0;

      const rows = entries.map((e, idx) => {
        const amt = parseFloat(e.amount) || 0;
        totalAmount += amt;

        const isBank = (e.paymentMedium === 'BANK_TRANSFER' || e.paymentMedium === 'CHEQUE' || e.paymentMedium === 'QR_CODE' || !!e.bankAccountId);
        if (isBank) {
          bankTotal += amt;
        } else {
          cashTotal += amt;
        }

        headTotals[e.headId] = (headTotals[e.headId] || 0) + amt;
        const catId = e.head?.categoryId || 0;
        categoryTotals[catId] = (categoryTotals[catId] || 0) + amt;

        return {
          sn: idx + 1,
          id: e.id,
          dateBs: e.receivedDateBs,
          voucherNo: e.voucherNo || `REC-${e.id}`,
          chequeNo: e.chequeNo || '',
          partyId: e.partyId,
          partyName: e.party?.name || e.sourceOrg || 'प्रत्यक्ष / विविध',
          partyPan: e.party?.panNumber || '',
          headId: e.headId,
          headName: e.head?.nameNepali || e.head?.name,
          headCode: e.head?.code || '',
          categoryId: catId,
          categoryName: e.head?.category?.nameNepali || e.head?.category?.name || '',
          amount: amt,
          amountsByHead: {
            [e.headId]: amt,
          },
          paymentMedium: e.paymentMedium || 'CASH',
          depositedInAccount: e.depositedInAccount || '',
          remarks: e.remarks || e.sourceOrg || '',
        };
      });

      // Party Breakdown
      const partySummaryMap = new Map();
      for (const e of entries) {
        const amt = parseFloat(e.amount) || 0;
        const pKey = e.partyId ? `P_${e.partyId}` : `NAME_${e.party?.name || e.sourceOrg || 'Direct'}`;
        const pName = e.party?.name || e.sourceOrg || 'प्रत्यक्ष / विविध (Direct/Other)';
        const pPan = e.party?.panNumber || '-';
        const pPhone = e.party?.phone || '-';
        const pType = e.party?.type || 'DONOR';

        if (!partySummaryMap.has(pKey)) {
          partySummaryMap.set(pKey, {
            partyKey: pKey,
            partyId: e.partyId,
            partyName: pName,
            partyPan: pPan,
            partyPhone: pPhone,
            partyType: pType,
            totalAmount: 0,
            transactionCount: 0,
            amountsByHead: {},
            amountsByCategory: {},
          });
        }
        const pObj = partySummaryMap.get(pKey);
        pObj.totalAmount += amt;
        pObj.transactionCount += 1;
        pObj.amountsByHead[e.headId] = (pObj.amountsByHead[e.headId] || 0) + amt;
        const catId = e.head?.categoryId || 0;
        pObj.amountsByCategory[catId] = (pObj.amountsByCategory[catId] || 0) + amt;
      }

      const partyBreakdown = Array.from(partySummaryMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);

      const activeDisplayColumns = headsForCategory.filter(h => (headTotals[h.id] || 0) > 0);
      const finalColumns = (headId && headId !== 'ALL')
        ? displayColumns
        : (req.query.showAllHeads === 'true' ? displayColumns : (activeDisplayColumns.length > 0 ? activeDisplayColumns : displayColumns));

      const activePartyIds = new Set(entries.map(e => e.partyId).filter(Boolean));
      const activeCategoryIds = new Set(entries.map(e => e.head?.categoryId).filter(Boolean));

      const filteredAvailableParties = allParties.filter(p => 
        activePartyIds.has(p.id) || entries.some(e => e.sourceOrg === p.name)
      );
      const filteredAvailableCategories = allCategories.filter(c => activeCategoryIds.has(c.id));

      return res.json({
        success: true,
        data: {
          type: 'INCOME',
          financialYear: fy,
          columns: finalColumns,
          allColumnsCount: headsForCategory.length,
          activeColumnsCount: activeDisplayColumns.length,
          rows,
          totals: {
            totalAmount: Math.round(totalAmount * 100) / 100,
            bankTotal: Math.round(bankTotal * 100) / 100,
            cashTotal: Math.round(cashTotal * 100) / 100,
            headTotals,
            categoryTotals,
          },
          partyBreakdown,
          availableCategories: (req.query.showAllHeads === 'true' ? allCategories : (filteredAvailableCategories.length > 0 ? filteredAvailableCategories : allCategories)).map(c => ({
            id: c.id,
            name: c.name,
            nameNepali: c.nameNepali,
            headsCount: c.incomeHeads.length,
          })),
          availableParties: (req.query.showAllHeads === 'true' ? allParties : (filteredAvailableParties.length > 0 ? filteredAvailableParties : allParties)).map(p => ({
            id: p.id,
            name: p.name,
            panNumber: p.panNumber,
            type: p.type,
          })),
        },
      });
    } else {
      // ─── B. EXPENSE MATRIX & PARTY BREAKDOWN ─────────────────────────────
      const where = {};
      if (effectiveFyId) where.financialYearId = effectiveFyId;
      if (partyId && partyId !== 'ALL') where.partyId = parseInt(partyId);
      if (headId && headId !== 'ALL') where.headId = parseInt(headId);
      if (categoryId && categoryId !== 'ALL') {
        where.head = { categoryId: parseInt(categoryId) };
      }
      if (fromDateBs || toDateBs) {
        where.expenseDateBs = {};
        if (fromDateBs) where.expenseDateBs.gte = fromDateBs;
        if (toDateBs) where.expenseDateBs.lte = toDateBs;
      }
      if (q && q.trim()) {
        const queryTerm = q.trim();
        where.OR = [
          { voucherNo: { contains: queryTerm, mode: 'insensitive' } },
          { billNo: { contains: queryTerm, mode: 'insensitive' } },
          { paidTo: { contains: queryTerm, mode: 'insensitive' } },
          { description: { contains: queryTerm, mode: 'insensitive' } },
          { remarks: { contains: queryTerm, mode: 'insensitive' } },
          { chequeNo: { contains: queryTerm, mode: 'insensitive' } },
          { party: { name: { contains: queryTerm, mode: 'insensitive' } } },
          { head: { name: { contains: queryTerm, mode: 'insensitive' } } },
          { head: { nameNepali: { contains: queryTerm, mode: 'insensitive' } } },
        ];
      }

      const [entries, allCategories, allParties] = await Promise.all([
        prisma.expenseEntry.findMany({
          where,
          include: {
            head: { include: { category: true } },
            party: true,
            financialYear: true,
          },
          orderBy: [
            { expenseDateBs: 'asc' },
            { id: 'asc' },
          ],
        }),
        prisma.expenseCategory.findMany({
          where: { isActive: true },
          include: {
            expenseHeads: {
              where: { isActive: true },
              orderBy: { id: 'asc' },
            },
          },
          orderBy: { id: 'asc' },
        }),
        prisma.party.findMany({
          orderBy: { name: 'asc' },
        }),
      ]);

      let headsForCategory = [];
      if (categoryId && categoryId !== 'ALL') {
        const selectedCat = allCategories.find(c => c.id === parseInt(categoryId));
        if (selectedCat) {
          headsForCategory = selectedCat.expenseHeads.map(h => ({
            id: h.id,
            name: h.name,
            nameNepali: h.nameNepali || h.name,
            code: h.code || '',
            categoryId: selectedCat.id,
            categoryName: selectedCat.name,
            categoryNameNepali: selectedCat.nameNepali || selectedCat.name,
          }));
        }
      } else {
        for (const cat of allCategories) {
          for (const h of cat.expenseHeads) {
            headsForCategory.push({
              id: h.id,
              name: h.name,
              nameNepali: h.nameNepali || h.name,
              code: h.code || '',
              categoryId: cat.id,
              categoryName: cat.name,
              categoryNameNepali: cat.nameNepali || cat.name,
            });
          }
        }
      }

      const headMap = new Map(headsForCategory.map(h => [h.id, h]));
      for (const entry of entries) {
        if (entry.head && !headMap.has(entry.head.id)) {
          const hObj = {
            id: entry.head.id,
            name: entry.head.name,
            nameNepali: entry.head.nameNepali || entry.head.name,
            code: entry.head.code || '',
            categoryId: entry.head.category?.id || 0,
            categoryName: entry.head.category?.name || 'General',
            categoryNameNepali: entry.head.category?.nameNepali || 'सामान्य',
          };
          headMap.set(entry.head.id, hObj);
          headsForCategory.push(hObj);
        }
      }

      let displayColumns = headsForCategory;
      if (headId && headId !== 'ALL') {
        displayColumns = headsForCategory.filter(h => h.id === parseInt(headId));
      }

      const headTotals = {};
      const categoryTotals = {};
      let totalAmount = 0;
      let bankTotal = 0;
      let cashTotal = 0;

      const rows = entries.map((e, idx) => {
        const amt = parseFloat(e.amount) || 0;
        totalAmount += amt;

        const isBank = (e.paymentMedium === 'BANK_TRANSFER' || e.paymentMedium === 'CHEQUE' || e.paymentMedium === 'QR_CODE' || !!e.bankAccountId);
        if (isBank) {
          bankTotal += amt;
        } else {
          cashTotal += amt;
        }

        headTotals[e.headId] = (headTotals[e.headId] || 0) + amt;
        const catId = e.head?.categoryId || 0;
        categoryTotals[catId] = (categoryTotals[catId] || 0) + amt;

        return {
          sn: idx + 1,
          id: e.id,
          dateBs: e.expenseDateBs,
          voucherNo: e.voucherNo || e.billNo || `EXP-${e.id}`,
          billNo: e.billNo || '',
          chequeNo: e.chequeNo || '',
          partyId: e.partyId,
          partyName: e.party?.name || e.paidTo || 'Vendor/Individual',
          partyPan: e.party?.panNumber || '',
          headId: e.headId,
          headName: e.head?.nameNepali || e.head?.name,
          headCode: e.head?.code || '',
          categoryId: catId,
          categoryName: e.head?.category?.nameNepali || e.head?.category?.name || '',
          amount: amt,
          amountsByHead: {
            [e.headId]: amt,
          },
          paymentMedium: e.paymentMedium || 'CASH',
          paidFromAccount: e.paidFromAccount || '',
          remarks: e.description || e.remarks || '',
        };
      });

      // Party Breakdown
      const partySummaryMap = new Map();
      for (const e of entries) {
        const amt = parseFloat(e.amount) || 0;
        const pKey = e.partyId ? `P_${e.partyId}` : `NAME_${e.party?.name || e.paidTo || 'Vendor'}`;
        const pName = e.party?.name || e.paidTo || 'अन्य / आपूर्तिकर्ता (Vendor/Other)';
        const pPan = e.party?.panNumber || '-';
        const pPhone = e.party?.phone || '-';
        const pType = e.party?.type || 'VENDOR';

        if (!partySummaryMap.has(pKey)) {
          partySummaryMap.set(pKey, {
            partyKey: pKey,
            partyId: e.partyId,
            partyName: pName,
            partyPan: pPan,
            partyPhone: pPhone,
            partyType: pType,
            totalAmount: 0,
            transactionCount: 0,
            amountsByHead: {},
            amountsByCategory: {},
          });
        }
        const pObj = partySummaryMap.get(pKey);
        pObj.totalAmount += amt;
        pObj.transactionCount += 1;
        pObj.amountsByHead[e.headId] = (pObj.amountsByHead[e.headId] || 0) + amt;
        const catId = e.head?.categoryId || 0;
        pObj.amountsByCategory[catId] = (pObj.amountsByCategory[catId] || 0) + amt;
      }

      const partyBreakdown = Array.from(partySummaryMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);

      const activeDisplayColumns = headsForCategory.filter(h => (headTotals[h.id] || 0) > 0);
      const finalColumns = (headId && headId !== 'ALL')
        ? displayColumns
        : (req.query.showAllHeads === 'true' ? displayColumns : (activeDisplayColumns.length > 0 ? activeDisplayColumns : displayColumns));

      const activePartyIds = new Set(entries.map(e => e.partyId).filter(Boolean));
      const activeCategoryIds = new Set(entries.map(e => e.head?.categoryId).filter(Boolean));

      const filteredAvailableParties = allParties.filter(p => 
        activePartyIds.has(p.id) || entries.some(e => e.paidTo === p.name)
      );
      const filteredAvailableCategories = allCategories.filter(c => activeCategoryIds.has(c.id));

      return res.json({
        success: true,
        data: {
          type: 'EXPENSE',
          financialYear: fy,
          columns: finalColumns,
          allColumnsCount: headsForCategory.length,
          activeColumnsCount: activeDisplayColumns.length,
          rows,
          totals: {
            totalAmount: Math.round(totalAmount * 100) / 100,
            bankTotal: Math.round(bankTotal * 100) / 100,
            cashTotal: Math.round(cashTotal * 100) / 100,
            headTotals,
            categoryTotals,
          },
          partyBreakdown,
          availableCategories: (req.query.showAllHeads === 'true' ? allCategories : (filteredAvailableCategories.length > 0 ? filteredAvailableCategories : allCategories)).map(c => ({
            id: c.id,
            name: c.name,
            nameNepali: c.nameNepali,
            headsCount: c.expenseHeads.length,
          })),
          availableParties: (req.query.showAllHeads === 'true' ? allParties : (filteredAvailableParties.length > 0 ? filteredAvailableParties : allParties)).map(p => ({
            id: p.id,
            name: p.name,
            panNumber: p.panNumber,
            type: p.type,
          })),
        },
      });
    }
  } catch (err) {
    console.error('Matrix report error:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;

