const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Helper to resolve financial year ID from either financialYearId or academicYearId or active
async function resolveFinancialYearId(fyIdQuery, ayIdQuery) {
  if (fyIdQuery) {
    const num = parseInt(fyIdQuery);
    if (!isNaN(num) && num > 0) return num;
  }
  if (ayIdQuery) {
    const num = parseInt(ayIdQuery);
    if (!isNaN(num) && num > 0) {
      const ay = await prisma.academicYear.findUnique({ where: { id: num } });
      if (ay) {
        // Look for matching financial year (e.g. "2083-84" or "2083/84")
        const cleanYear = ay.year.replace('-', '/');
        const fy = await prisma.financialYear.findFirst({
          where: {
            OR: [
              { year: ay.year },
              { year: cleanYear },
              { year: ay.year.replace('/', '-') }
            ]
          }
        });
        if (fy) return fy.id;
      }
    }
  }
  // Fallback to active financial year
  const activeFy = await prisma.financialYear.findFirst({
    where: { isActive: true },
    orderBy: { id: 'desc' }
  });
  if (activeFy) return activeFy.id;

  const firstFy = await prisma.financialYear.findFirst({ orderBy: { id: 'desc' } });
  return firstFy ? firstFy.id : null;
}

// GET /api/budget — list budget allocations with actual realization & variance
router.get('/', authenticate, async (req, res) => {
  try {
    const { financialYearId, academicYearId, type, search } = req.query;

    const fyId = await resolveFinancialYearId(financialYearId, academicYearId);

    if (!fyId) {
      return res.json({
        success: true,
        data: [],
        allocations: [],
        totals: {
          totalExpenseBudget: 0,
          totalExpenseActual: 0,
          expenseVariance: 0,
          totalRevenueBudget: 0,
          totalRevenueActual: 0,
          revenueVariance: 0,
          netEstimatedSurplus: 0,
          netActualSurplus: 0,
        },
        summary: {
          totalHeads: 0,
          expenseHeadsCount: 0,
          revenueHeadsCount: 0,
          overBudgetCount: 0,
          nearCeilingCount: 0,
        }
      });
    }

    const where = { financialYearId: fyId };
    if (type && type !== 'ALL') {
      where.type = type === 'EXPENSE' ? 'EXPENSE' : (type === 'INCOME' || type === 'REVENUE' ? 'INCOME' : type);
    }

    const [budgets, financialYear, allExpenseHeads, allIncomeHeads] = await Promise.all([
      prisma.budget.findMany({
        where,
        include: { financialYear: true },
        orderBy: [{ type: 'asc' }, { headName: 'asc' }],
      }),
      prisma.financialYear.findUnique({ where: { id: fyId } }),
      prisma.expenseHead.findMany({ include: { category: true } }),
      prisma.incomeHead.findMany({ include: { category: true } }),
    ]);

    // Create lookup maps for heads
    const expenseHeadMap = new Map();
    allExpenseHeads.forEach(h => {
      expenseHeadMap.set(h.id, h);
      if (h.name) expenseHeadMap.set(h.name.trim().toLowerCase(), h);
      if (h.nameNepali) expenseHeadMap.set(h.nameNepali.trim().toLowerCase(), h);
    });

    const incomeHeadMap = new Map();
    allIncomeHeads.forEach(h => {
      incomeHeadMap.set(h.id, h);
      if (h.name) incomeHeadMap.set(h.name.trim().toLowerCase(), h);
      if (h.nameNepali) incomeHeadMap.set(h.nameNepali.trim().toLowerCase(), h);
    });

    // Query actual expenditures and incomes for this financial year
    // Also include entries where dateBs falls in financial year range or matching financialYearId
    const [expenseActuals, incomeActuals, feeCollections, payrollEntries] = await Promise.all([
      prisma.expenseEntry.groupBy({
        by: ['headId'],
        where: { financialYearId: fyId },
        _sum: { amount: true },
      }),
      prisma.incomeEntry.groupBy({
        by: ['headId'],
        where: { financialYearId: fyId },
        _sum: { amount: true },
      }),
      prisma.feeCollection.aggregate({
        where: { financialYearId: fyId },
        _sum: { amount: true },
      }),
      prisma.payroll.aggregate({
        where: { financialYearId: fyId },
        _sum: { netSalary: true },
      }),
    ]);

    const expActualMap = new Map(expenseActuals.map(e => [e.headId, e._sum.amount || 0]));
    const incActualMap = new Map(incomeActuals.map(i => [i.headId, i._sum.amount || 0]));

    let totalExpenseBudget = 0;
    let totalExpenseActual = 0;
    let totalRevenueBudget = 0;
    let totalRevenueActual = 0;
    let overBudgetCount = 0;
    let nearCeilingCount = 0;

    const enriched = budgets.map(b => {
      let actual = 0;
      let headCode = null;
      let headCategoryName = null;

      // Find linked head metadata
      if (b.type === 'EXPENSE') {
        const linkedHead = b.headId ? expenseHeadMap.get(b.headId) : (expenseHeadMap.get(b.headName.trim().toLowerCase()));
        if (linkedHead) {
          headCode = linkedHead.code || null;
          headCategoryName = linkedHead.category?.name || linkedHead.category?.nameNepali || null;
          actual = expActualMap.get(linkedHead.id) || 0;
        } else if (b.headId) {
          actual = expActualMap.get(b.headId) || 0;
        }
      } else {
        const linkedHead = b.headId ? incomeHeadMap.get(b.headId) : (incomeHeadMap.get(b.headName.trim().toLowerCase()));
        if (linkedHead) {
          headCode = linkedHead.code || null;
          headCategoryName = linkedHead.category?.name || linkedHead.category?.nameNepali || null;
          actual = incActualMap.get(linkedHead.id) || 0;
        } else if (b.headId) {
          actual = incActualMap.get(b.headId) || 0;
        }
      }

      const allocatedAmount = b.yearlyEstimated || 0;
      const variance = allocatedAmount - actual;
      const percentUsed = allocatedAmount > 0 ? parseFloat(((actual / allocatedAmount) * 100).toFixed(1)) : 0;
      const isOverBudget = percentUsed > 100;
      const isNearCeiling = percentUsed >= 80 && percentUsed <= 100;

      if (b.type === 'EXPENSE') {
        totalExpenseBudget += allocatedAmount;
        totalExpenseActual += actual;
        if (isOverBudget) overBudgetCount++;
        if (isNearCeiling) nearCeilingCount++;
      } else {
        totalRevenueBudget += allocatedAmount;
        totalRevenueActual += actual;
      }

      let parsedMonthly = {};
      try {
        if (b.monthlyEstimates) {
          parsedMonthly = typeof b.monthlyEstimates === 'string' ? JSON.parse(b.monthlyEstimates) : b.monthlyEstimates;
        }
      } catch (e) {
        parsedMonthly = {};
      }

      return {
        id: b.id,
        financialYearId: b.financialYearId,
        financialYearName: financialYear?.year || '',
        type: b.type === 'INCOME' ? 'REVENUE' : b.type,
        dbType: b.type,
        headId: b.headId,
        headName: b.headName,
        category: b.headName, // backward compat
        headCode,
        headCategoryName,
        allocatedAmount,
        yearlyEstimated: allocatedAmount,
        actualAmount: actual,
        actualSpentOrReceived: actual,
        variance,
        percentUsed,
        percentageUsed: percentUsed,
        isOverBudget,
        isNearCeiling,
        monthlyEstimates: parsedMonthly,
        remarks: b.remarks || '',
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      };
    });

    // If search filter is present
    const filteredAllocations = search
      ? enriched.filter(item =>
          item.headName.toLowerCase().includes(search.toLowerCase()) ||
          (item.remarks && item.remarks.toLowerCase().includes(search.toLowerCase())) ||
          (item.headCategoryName && item.headCategoryName.toLowerCase().includes(search.toLowerCase())) ||
          (item.headCode && item.headCode.toLowerCase().includes(search.toLowerCase()))
        )
      : enriched;

    const totals = {
      totalExpenseBudget,
      totalExpenseActual,
      expenseVariance: totalExpenseBudget - totalExpenseActual,
      totalRevenueBudget,
      totalRevenueActual,
      revenueVariance: totalRevenueBudget - totalRevenueActual,
      netEstimatedSurplus: totalRevenueBudget - totalExpenseBudget,
      netActualSurplus: totalRevenueActual - totalExpenseActual,
      totalFeeCollected: feeCollections._sum.amount || 0,
      totalPayrollSpent: payrollEntries._sum.netSalary || 0,
    };

    const summary = {
      totalHeads: enriched.length,
      expenseHeadsCount: enriched.filter(e => e.dbType === 'EXPENSE').length,
      revenueHeadsCount: enriched.filter(e => e.dbType === 'INCOME').length,
      overBudgetCount,
      nearCeilingCount,
      selectedFinancialYear: financialYear,
    };

    return res.json({
      success: true,
      data: filteredAllocations,
      allocations: filteredAllocations,
      totals,
      summary,
      financialYear,
    });
  } catch (err) {
    console.error('Budget list error:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/budget — create budget line
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const {
      financialYearId,
      academicYearId,
      type,
      headId,
      headName,
      category,
      allocatedAmount,
      yearlyEstimated,
      monthlyEstimates,
      remarks,
    } = req.body;

    const fyId = await resolveFinancialYearId(financialYearId, academicYearId);

    const name = String(headName || category || '').trim();
    const amount = parseFloat(yearlyEstimated !== undefined ? yearlyEstimated : allocatedAmount) || 0;
    const cleanType = (type === 'REVENUE' || type === 'INCOME') ? 'INCOME' : 'EXPENSE';

    if (!fyId || !name) {
      return res.status(400).json({ success: false, message: 'Financial Year and Budget Head name are required.' });
    }

    const budget = await prisma.budget.create({
      data: {
        financialYearId: fyId,
        type: cleanType,
        headId: headId ? parseInt(headId) : null,
        headName: name,
        yearlyEstimated: amount,
        monthlyEstimates: monthlyEstimates ? (typeof monthlyEstimates === 'string' ? monthlyEstimates : JSON.stringify(monthlyEstimates)) : null,
        remarks: remarks ? String(remarks).trim() : null,
      },
    });

    return res.status(201).json({
      success: true,
      data: budget,
      message: 'बजेट विनियोजन सफलतापूर्वक सुरक्षित गरियो! (Budget allocation saved successfully!)'
    });
  } catch (err) {
    console.error('Budget create error:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/budget/seed-standard-template — pre-populate standard Nepal school budget heads
router.post('/seed-standard-template', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { financialYearId, academicYearId, overwrite } = req.body;
    const fyId = await resolveFinancialYearId(financialYearId, academicYearId);

    if (!fyId) {
      return res.status(400).json({ success: false, message: 'Invalid financial year selected.' });
    }

    if (overwrite) {
      await prisma.budget.deleteMany({ where: { financialYearId: fyId } });
    }

    const standardAllocations = [
      // EXPENSES
      { type: 'EXPENSE', headName: 'शिक्षक तथा कर्मचारी तलब भत्ता (Teacher & Staff Salary)', yearlyEstimated: 0, remarks: 'सरकारी तथा निजी स्रोत शिक्षक कर्मचारी तलब' },
      { type: 'EXPENSE', headName: 'दिवा खाजा कार्यक्रम (Midday Meal Program)', yearlyEstimated: 0, remarks: 'कक्षा बालविकास देखि ५ सम्मका बालबालिकाको खाजा' },
      { type: 'EXPENSE', headName: 'निःशुल्क पाठ्यपुस्तक खरिद तथा वितरण (Free Textbooks)', yearlyEstimated: 0, remarks: 'विद्यार्थी निःशुल्क पुस्तक अनुदान' },
      { type: 'EXPENSE', headName: 'विद्यार्थी छात्रवृत्ति वितरण (Student Scholarships)', yearlyEstimated: 0, remarks: 'दलित, विपन्न तथा छात्रा छात्रवृत्ति' },
      { type: 'EXPENSE', headName: 'विद्यालय भवन तथा भौतिक पूर्वाधार मर्मत (Infrastructure Maintenance)', yearlyEstimated: 0, remarks: 'कक्षाकोठा, कम्पाउण्ड तथा रंगरोगन' },
      { type: 'EXPENSE', headName: 'मसलन्द, छपाई तथा कार्यालय सञ्चालन (Stationery & Admin)', yearlyEstimated: 0, remarks: 'कागज, रजिस्टर, मसी तथा कार्यालय सामग्री' },
      { type: 'EXPENSE', headName: 'विज्ञान तथा कम्प्युटर आईसीटी ल्याब (Science & ICT Lab)', yearlyEstimated: 0, remarks: 'ल्याब उपकरण, इन्टरनेट तथा मर्मत' },
      { type: 'EXPENSE', headName: 'परीक्षा सञ्चालन तथा उत्तरपुस्तिका (Exam Operations)', yearlyEstimated: 0, remarks: 'त्रैमासिक, अर्धवार्षिक तथा वार्षिक परीक्षा' },
      { type: 'EXPENSE', headName: 'विद्युत, खानेपानी तथा सरसफाइ (Utilities & Sanitation)', yearlyEstimated: 0, remarks: 'बिजुली महसुल, फिल्टर तथा शौचालय सरसफाइ' },
      { type: 'EXPENSE', headName: 'खेलकुद तथा अतिरिक्त क्रियाकलाप (Sports & ECA)', yearlyEstimated: 0, remarks: 'वार्षिक खेलकुद, पुरस्कार तथा कार्यक्रम' },
      { type: 'EXPENSE', headName: 'विविध आकस्मिक खर्च (Contingency & Miscellaneous)', yearlyEstimated: 0, remarks: 'विविध प्रशासनिक तथा आकस्मिक' },

      // REVENUES
      { type: 'INCOME', headName: 'स्थानीय तह / पालिका सशर्त अनुदान (Municipal Conditional Grant)', yearlyEstimated: 0, remarks: 'शिक्षक तलब तथा विद्यालय सञ्चालन अनुदान' },
      { type: 'INCOME', headName: 'दिवा खाजा सरकारी अनुदान (Midday Meal Subsidy)', yearlyEstimated: 0, remarks: 'नेपाल सरकार दिवा खाजा निकासा' },
      { type: 'INCOME', headName: 'पाठ्यपुस्तक तथा छात्रवृत्ति अनुदान (Books & Scholarship Subsidy)', yearlyEstimated: 0, remarks: 'सरकारबाट प्राप्त पाठ्यपुस्तक तथा छात्रवृत्ति निकासा' },
      { type: 'INCOME', headName: 'विद्यालय आन्तरिक स्रोत तथा शुल्क (Internal Revenue & Fees)', yearlyEstimated: 0, remarks: 'कक्षा ११/१२ सहयोग, परीक्षा फारम तथा प्रमाणपत्र' },
      { type: 'INCOME', headName: 'चन्दा, दान तथा वि.व्य.स. सहयोग (Donations & SMC Contributions)', yearlyEstimated: 0, remarks: 'स्थानीय दाता तथा समुदाय सहयोग' },
      { type: 'INCOME', headName: 'बैंक ब्याज आम्दानी (Bank Interest Revenue)', yearlyEstimated: 0, remarks: 'विद्यालय बचत खाता ब्याज' },
    ];

    let createdCount = 0;
    for (const item of standardAllocations) {
      // Check if already exists in this FY
      const existing = await prisma.budget.findFirst({
        where: {
          financialYearId: fyId,
          headName: item.headName,
        }
      });
      if (!existing) {
        // Divide into 12 equal monthly estimates
        const monthly = Math.round(item.yearlyEstimated / 12);
        const monthlyObj = {};
        for (let m = 1; m <= 12; m++) monthlyObj[m] = monthly;

        await prisma.budget.create({
          data: {
            financialYearId: fyId,
            type: item.type,
            headName: item.headName,
            yearlyEstimated: item.yearlyEstimated,
            monthlyEstimates: JSON.stringify(monthlyObj),
            remarks: item.remarks,
          }
        });
        createdCount++;
      }
    }

    return res.json({
      success: true,
      message: `मानक बजेट शीर्षकहरू सफलतापूर्वक लोड गरियो (${createdCount} शीर्षक थपियो)!`,
      createdCount,
    });
  } catch (err) {
    console.error('Seed standard template error:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/budget/clone-previous-year — copy budget from previous fiscal year
router.post('/clone-previous-year', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { sourceFinancialYearId, targetFinancialYearId, incrementPercentage = 0 } = req.body;

    if (!sourceFinancialYearId || !targetFinancialYearId) {
      return res.status(400).json({ success: false, message: 'Source and Target Financial Years are required.' });
    }

    const sourceBudgets = await prisma.budget.findMany({
      where: { financialYearId: parseInt(sourceFinancialYearId) }
    });

    if (sourceBudgets.length === 0) {
      return res.status(404).json({ success: false, message: 'No budget allocations found in the source financial year.' });
    }

    const multiplier = 1 + (parseFloat(incrementPercentage) || 0) / 100;
    let clonedCount = 0;

    for (const src of sourceBudgets) {
      const newAmount = Math.round(src.yearlyEstimated * multiplier);
      let newMonthly = null;
      if (src.monthlyEstimates) {
        try {
          const parsed = JSON.parse(src.monthlyEstimates);
          const scaled = {};
          Object.keys(parsed).forEach(k => {
            scaled[k] = Math.round(parsed[k] * multiplier);
          });
          newMonthly = JSON.stringify(scaled);
        } catch (e) {}
      }

      // Check if exists in target
      const existing = await prisma.budget.findFirst({
        where: {
          financialYearId: parseInt(targetFinancialYearId),
          headName: src.headName,
        }
      });

      if (existing) {
        await prisma.budget.update({
          where: { id: existing.id },
          data: {
            yearlyEstimated: newAmount,
            monthlyEstimates: newMonthly || existing.monthlyEstimates,
            remarks: src.remarks,
          }
        });
      } else {
        await prisma.budget.create({
          data: {
            financialYearId: parseInt(targetFinancialYearId),
            type: src.type,
            headId: src.headId,
            headName: src.headName,
            yearlyEstimated: newAmount,
            monthlyEstimates: newMonthly,
            remarks: src.remarks,
          }
        });
      }
      clonedCount++;
    }

    return res.json({
      success: true,
      message: `अघिल्लो आ.व. बाट ${clonedCount} बजेट शीर्षकहरू सफलतापूर्वक प्रतिलिपि गरियो (वृद्धि: ${incrementPercentage}%)!`,
      clonedCount,
    });
  } catch (err) {
    console.error('Clone previous year error:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// PUT /api/budget/:id — update budget line
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { headName, category, yearlyEstimated, allocatedAmount, monthlyEstimates, remarks, type } = req.body;

    const name = headName || category;
    const amount = yearlyEstimated !== undefined ? yearlyEstimated : allocatedAmount;

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        ...(name && { headName: String(name).trim() }),
        ...(amount !== undefined && { yearlyEstimated: parseFloat(amount) || 0 }),
        ...(type && { type: (type === 'REVENUE' || type === 'INCOME') ? 'INCOME' : 'EXPENSE' }),
        ...(monthlyEstimates !== undefined && {
          monthlyEstimates: typeof monthlyEstimates === 'string' ? monthlyEstimates : JSON.stringify(monthlyEstimates)
        }),
        ...(remarks !== undefined && { remarks: remarks ? String(remarks).trim() : null }),
      },
    });

    return res.json({ success: true, data: budget, message: 'बजेट विवरण अद्यावधिक भयो! (Budget updated successfully!)' });
  } catch (err) {
    console.error('Budget update error:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// DELETE /api/budget/:id
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.budget.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ success: true, message: 'बजेट शीर्षक सफलतापूर्वक हटाइयो!' });
  } catch (err) {
    console.error('Budget delete error:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
