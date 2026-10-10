'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Edit3,
  PieChart,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Calendar,
  Layers,
  Sparkles,
  X,
  Printer,
  Download,
  Copy,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  RefreshCw,
  Clock,
  BookOpen,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

const NEPALI_MONTHS = [
  { id: 1, name: 'बैशाख (Baisakh)' },
  { id: 2, name: 'जेठ (Jestha)' },
  { id: 3, name: 'असार (Ashadh)' },
  { id: 4, name: 'श्रावण (Shrawan)' },
  { id: 5, name: 'भाद्र (Bhadra)' },
  { id: 6, name: 'आश्विन (Ashwin)' },
  { id: 7, name: 'कार्तिक (Kartik)' },
  { id: 8, name: 'मंसिर (Mangsir)' },
  { id: 9, name: 'पौष (Poush)' },
  { id: 10, name: 'माघ (Magh)' },
  { id: 11, name: 'फाल्गुन (Falgun)' },
  { id: 12, name: 'चैत्र (Chaitra)' },
];

const formatNpr = (val?: number | string | null): string => {
  if (val === undefined || val === null || isNaN(Number(val))) return '0';
  return Number(val).toLocaleString('en-IN');
};

export default function BudgetManagementPage() {
  const queryClient = useQueryClient();

  // State
  const [selectedFyId, setSelectedFyId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'EXPENSE' | 'REVENUE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NORMAL' | 'WARNING' | 'OVERBUDGET'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'TABLE' | 'MONTHLY' | 'ANALYTICS'>('TABLE');
  const [expandedMonthlyRows, setExpandedMonthlyRows] = useState<Record<number, boolean>>({});

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Forms
  const [budgetForm, setBudgetForm] = useState({
    type: 'EXPENSE' as 'EXPENSE' | 'REVENUE',
    headName: '',
    headId: '',
    yearlyEstimated: '',
    remarks: '',
    monthlyEstimates: {} as Record<number, number>,
  });

  const [cloneForm, setCloneForm] = useState({
    sourceFinancialYearId: '',
    incrementPercentage: 5,
  });

  // Fetch School Info for print
  const { data: schoolProfile } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data || null;
    },
  });

  // Fetch Financial Years (साउन–असार)
  const { data: financialYearsData, isLoading: isLoadingFys } = useQuery({
    queryKey: ['financial-years-all'],
    queryFn: async () => {
      const res = await api.get('/financial-years/all');
      return res.data?.data || [];
    },
  });

  const financialYears: any[] = useMemo(() => {
    return Array.isArray(financialYearsData) ? financialYearsData : [];
  }, [financialYearsData]);

  // Auto select active FY
  const activeFy = useMemo(() => {
    return financialYears.find((fy: any) => fy?.isActive) || financialYears[0] || null;
  }, [financialYears]);

  const effectiveFyId = selectedFyId || (activeFy?.id ? String(activeFy.id) : '');

  // Fetch Budget Comparison Data
  const { data: budgetResponse, isLoading: isLoadingBudget, refetch } = useQuery({
    queryKey: ['budget-data', effectiveFyId],
    queryFn: async () => {
      if (!effectiveFyId) return null;
      const res = await api.get(`/budget?financialYearId=${effectiveFyId}`);
      return res.data;
    },
    enabled: !!effectiveFyId,
  });

  // Fetch Expense Heads and Income Heads for autocomplete
  const { data: expenseHeadsData } = useQuery({
    queryKey: ['expense-heads-list'],
    queryFn: async () => {
      const res = await api.get('/expense/heads');
      return res.data?.data || [];
    },
  });

  const { data: incomeHeadsData } = useQuery({
    queryKey: ['income-heads-list'],
    queryFn: async () => {
      const res = await api.get('/income/heads');
      return res.data?.data || [];
    },
  });

  const expenseHeads: any[] = Array.isArray(expenseHeadsData) ? expenseHeadsData : [];
  const incomeHeads: any[] = Array.isArray(incomeHeadsData) ? incomeHeadsData : [];

  // Add Budget Line Mutation
  const addBudgetMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/budget', {
        financialYearId: parseInt(effectiveFyId),
        type: payload.type,
        headId: payload.headId ? parseInt(payload.headId) : null,
        headName: payload.headName,
        yearlyEstimated: parseFloat(payload.yearlyEstimated || '0'),
        monthlyEstimates: payload.monthlyEstimates,
        remarks: payload.remarks,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'बजेट विनियोजन सुरक्षित भयो!');
      setIsAddModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['budget-data'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'बजेट सुरक्षित गर्न सकिएन');
    },
  });

  // Edit Budget Line Mutation
  const editBudgetMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await api.put(`/budget/${id}`, {
        type: payload.type,
        headName: payload.headName,
        yearlyEstimated: parseFloat(payload.yearlyEstimated || '0'),
        monthlyEstimates: payload.monthlyEstimates,
        remarks: payload.remarks,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'बजेट विवरण अद्यावधिक भयो!');
      setIsEditModalOpen(false);
      setIsMonthlyModalOpen(false);
      setEditingItem(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['budget-data'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'अद्यावधिक गर्न सकिएन');
    },
  });

  // Delete Budget Mutation
  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/budget/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('बजेट शीर्षक सफलतापूर्वक हटाइयो!');
      queryClient.invalidateQueries({ queryKey: ['budget-data'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'बजेट हटाउन सकिएन');
    }
  });

  // Seed Standard Template Mutation
  const seedTemplateMutation = useMutation({
    mutationFn: async (overwrite: boolean = false) => {
      const res = await api.post('/budget/seed-standard-template', {
        financialYearId: parseInt(effectiveFyId),
        overwrite,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'मानक बजेट ढाँचा तयार भयो!');
      queryClient.invalidateQueries({ queryKey: ['budget-data'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'त्रुटि भयो');
    }
  });

  // Clone Previous Year Mutation
  const cloneMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/budget/clone-previous-year', {
        sourceFinancialYearId: parseInt(cloneForm.sourceFinancialYearId),
        targetFinancialYearId: parseInt(effectiveFyId),
        incrementPercentage: cloneForm.incrementPercentage,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'बजेट प्रतिलिपि भयो!');
      setIsCloneModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['budget-data'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'प्रतिलिपि गर्न सकिएन');
    }
  });

  const resetForm = () => {
    setBudgetForm({
      type: 'EXPENSE',
      headName: '',
      headId: '',
      yearlyEstimated: '',
      remarks: '',
      monthlyEstimates: {},
    });
  };

  const openEditModal = (item: any) => {
    if (!item) return;
    setEditingItem(item);
    setBudgetForm({
      type: item.type === 'INCOME' ? 'REVENUE' : item.type || 'EXPENSE',
      headName: item.headName || item.category || '',
      headId: item.headId ? String(item.headId) : '',
      yearlyEstimated: item.allocatedAmount !== undefined ? String(item.allocatedAmount) : '0',
      remarks: item.remarks || '',
      monthlyEstimates: item.monthlyEstimates || {},
    });
    setIsEditModalOpen(true);
  };

  const openMonthlyPlannerModal = (item: any) => {
    if (!item) return;
    setEditingItem(item);
    setBudgetForm({
      type: item.type === 'INCOME' ? 'REVENUE' : item.type || 'EXPENSE',
      headName: item.headName || item.category || '',
      headId: item.headId ? String(item.headId) : '',
      yearlyEstimated: item.allocatedAmount !== undefined ? String(item.allocatedAmount) : '0',
      remarks: item.remarks || '',
      monthlyEstimates: item.monthlyEstimates || {},
    });
    setIsMonthlyModalOpen(true);
  };

  const autoDistributeMonthly = (total: number) => {
    const validTotal = isNaN(total) ? 0 : total;
    const perMonth = Math.round(validTotal / 12);
    const updated: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
      updated[m] = perMonth;
    }
    setBudgetForm(prev => ({ ...prev, monthlyEstimates: updated }));
  };

  // Safe extraction of budget allocations
  const rawAllocations: any[] = useMemo(() => {
    if (Array.isArray(budgetResponse?.allocations)) return budgetResponse.allocations;
    if (Array.isArray(budgetResponse?.data)) return budgetResponse.data;
    return [];
  }, [budgetResponse]);

  const totals = useMemo(() => {
    const t = budgetResponse?.totals;
    return {
      totalExpenseBudget: Number(t?.totalExpenseBudget || 0),
      totalExpenseActual: Number(t?.totalExpenseActual || 0),
      expenseVariance: Number(t?.expenseVariance || 0),
      totalRevenueBudget: Number(t?.totalRevenueBudget || 0),
      totalRevenueActual: Number(t?.totalRevenueActual || 0),
      revenueVariance: Number(t?.revenueVariance || 0),
      netEstimatedSurplus: Number(t?.netEstimatedSurplus || 0),
      netActualSurplus: Number(t?.netActualSurplus || 0),
    };
  }, [budgetResponse]);

  const summary = useMemo(() => {
    const s = budgetResponse?.summary;
    return {
      totalHeads: Number(s?.totalHeads || rawAllocations.length),
      expenseHeadsCount: Number(s?.expenseHeadsCount || rawAllocations.filter(a => a.type === 'EXPENSE').length),
      revenueHeadsCount: Number(s?.revenueHeadsCount || rawAllocations.filter(a => a.type === 'REVENUE' || a.type === 'INCOME').length),
      overBudgetCount: Number(s?.overBudgetCount || rawAllocations.filter(a => a.isOverBudget).length),
      nearCeilingCount: Number(s?.nearCeilingCount || rawAllocations.filter(a => a.isNearCeiling).length),
    };
  }, [budgetResponse, rawAllocations]);

  const filteredAllocations = useMemo(() => {
    return rawAllocations.filter((item) => {
      if (!item) return false;
      // Tab filter
      if (activeTab === 'EXPENSE' && item.type !== 'EXPENSE') return false;
      if (activeTab === 'REVENUE' && (item.type !== 'REVENUE' && item.type !== 'INCOME')) return false;

      // Status filter
      if (statusFilter === 'OVERBUDGET' && !item.isOverBudget) return false;
      if (statusFilter === 'WARNING' && !item.isNearCeiling) return false;
      if (statusFilter === 'NORMAL' && (item.isOverBudget || item.isNearCeiling)) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (item.headName || item.category || '').toLowerCase().includes(q);
        const matchesRemarks = (item.remarks || '').toLowerCase().includes(q);
        const matchesCat = (item.headCategoryName || '').toLowerCase().includes(q);
        const matchesCode = (item.headCode || '').toLowerCase().includes(q);
        if (!matchesName && !matchesRemarks && !matchesCat && !matchesCode) return false;
      }

      return true;
    });
  }, [rawAllocations, activeTab, statusFilter, searchQuery]);

  const expensePct = totals.totalExpenseBudget > 0
    ? Math.round((totals.totalExpenseActual / totals.totalExpenseBudget) * 100)
    : 0;

  const revenuePct = totals.totalRevenueBudget > 0
    ? Math.round((totals.totalRevenueActual / totals.totalRevenueBudget) * 100)
    : 0;

  const currentFyObject = useMemo(() => {
    return financialYears.find((fy: any) => String(fy?.id) === String(effectiveFyId)) || activeFy;
  }, [financialYears, effectiveFyId, activeFy]);

  // Toggle monthly expansion
  const toggleMonthlyRow = (id: number) => {
    setExpandedMonthlyRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Print Official Budget Book
  const handlePrintBudgetBook = () => {
    const printWin = window.open('', '_blank', 'width=1000,height=900');
    if (!printWin) {
      toast.error('Please allow popups to print official budget report');
      return;
    }

    const schoolNameNe = schoolProfile?.nameNepali || 'नेपाल माध्यमिक विद्यालय';
    const schoolNameEn = schoolProfile?.name || 'Nepal Secondary School';
    const address = schoolProfile?.address || 'वृन्दावन न.पा.-२, विश्रामपुर, रौतहट';
    const emisCode = schoolProfile?.emisCode || '320160005';
    const estYear = schoolProfile?.estYear || '2007';
    const principal = schoolProfile?.principalName || 'प्रेमलाल प्रसाद राउत';
    const fyYear = currentFyObject?.year || '2083/84';

    const expenseList = rawAllocations.filter(a => a?.type === 'EXPENSE');
    const revenueList = rawAllocations.filter(a => a?.type === 'REVENUE' || a?.type === 'INCOME');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>वार्षिक बजेट तथा आय-व्यय योजना पुस्तिका - ${fyYear} | ${schoolNameNe}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm 12mm 15mm 12mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: 'Times New Roman', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; color: #111; font-size: 11px; line-height: 1.4; }
            .letterhead { text-align: center; border-bottom: 2.5px double #1e3a5f; padding-bottom: 8px; margin-bottom: 12px; position: relative; }
            .school-logo { width: 55px; height: 55px; position: absolute; left: 10px; top: 0; }
            .emis-tag { position: absolute; right: 10px; top: 5px; font-size: 10px; font-weight: bold; background: #f1f5f9; padding: 3px 8px; border: 1px solid #cbd5e1; border-radius: 4px; }
            .school-title { font-size: 18px; font-weight: 900; color: #1e3a5f; margin: 0; }
            .school-sub { font-size: 12px; font-weight: bold; color: #334155; margin: 2px 0; }
            .school-address { font-size: 11px; color: #475569; }
            .doc-badge { display: inline-block; background: #1e3a5f; color: #fff; font-weight: 900; font-size: 11.5px; padding: 4px 14px; border-radius: 20px; margin-top: 6px; letter-spacing: 0.5px; }
            
            .summary-box { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
            .summary-card { border: 1.5px solid #1e3a5f; padding: 8px; border-radius: 6px; background: #f8fafc; text-align: center; }
            .summary-card h4 { margin: 0 0 4px 0; font-size: 10.5px; color: #1e3a5f; text-transform: uppercase; font-weight: 800; }
            .summary-card p { margin: 0; font-size: 13px; font-weight: 900; font-family: monospace; }

            .section-header { background: #1e3a5f; color: #fff; padding: 5px 8px; font-size: 11px; font-weight: 800; margin-top: 14px; margin-bottom: 4px; border-radius: 4px; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10.5px; }
            th { background: #f1f5f9; border: 1px solid #94a3b8; padding: 5px 4px; font-weight: 800; text-align: left; color: #0f172a; }
            td { border: 1px solid #cbd5e1; padding: 5px 4px; vertical-align: middle; }
            .num { text-align: right; font-family: monospace; font-weight: 700; }
            .center { text-align: center; }
            .total-row { background: #e2e8f0; font-weight: 900; }

            .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 40px; padding-top: 10px; page-break-inside: avoid; }
            .sig-box { text-align: center; border-top: 1.5px dashed #475569; padding-top: 5px; font-size: 10.5px; font-weight: 700; }
            .sig-title { font-size: 9.5px; color: #64748b; margin-top: 2px; }
            .footer-note { font-size: 8.5px; color: #64748b; text-align: center; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 4px; }
          </style>
        </head>
        <body>
          <div class="letterhead">
            <img src="/school_logo.png" class="school-logo" alt="Logo" onerror="this.style.display='none'"/>
            <div class="emis-tag">EMIS: ${emisCode}</div>
            <h1 class="school-title">${schoolNameNe}</h1>
            <div class="school-sub">${schoolNameEn}</div>
            <div class="school-address">${address} • स्थापना: वि.सं. ${estYear}</div>
            <div class="doc-badge">वार्षिक बजेट तथा आय-व्यय योजना विवरण (ANNUAL BUDGET & VARIANCE REPORT) • आ.व. ${fyYear}</div>
          </div>

          <div class="summary-box">
            <div class="summary-card">
              <h4>कुल आम्दानी लक्ष्य (Estimated Revenue)</h4>
              <p style="color: #047857;">रू ${formatNpr(totals.totalRevenueBudget)}</p>
              <div style="font-size: 9.5px; color: #555; margin-top: 2px;">वास्तविक प्राप्त: रू ${formatNpr(totals.totalRevenueActual)} (${revenuePct}%)</div>
            </div>
            <div class="summary-card">
              <h4>कुल खर्च विनियोजन (Expense Budget)</h4>
              <p style="color: #b91c1c;">रू ${formatNpr(totals.totalExpenseBudget)}</p>
              <div style="font-size: 9.5px; color: #555; margin-top: 2px;">वास्तविक खर्च: रू ${formatNpr(totals.totalExpenseActual)} (${expensePct}%)</div>
            </div>
            <div class="summary-card">
              <h4>अनुमानित सन्तुलन (Net Surplus/Deficit)</h4>
              <p style="color: #1e3a5f;">रू ${formatNpr(totals.totalRevenueBudget - totals.totalExpenseBudget)}</p>
              <div style="font-size: 9.5px; color: #555; margin-top: 2px;">हालको बचत मौज्दात: रू ${formatNpr(totals.totalRevenueActual - totals.totalExpenseActual)}</div>
            </div>
          </div>

          <!-- Section A: REVENUES -->
          <div class="section-header">
            <span>खण्ड (क): आम्दानी तथा अनुदान अनुमानित स्रोत (REVENUE & GRANTS ESTIMATE)</span>
            <span>कुल आम्दानी शीर्षक: ${revenueList.length}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 25px;" class="center">क्र.सं.</th>
                <th>आम्दानी तथा स्रोत शीर्षक (Revenue / Source Head)</th>
                <th style="width: 110px;" class="num">वार्षिक लक्ष्य (रु)</th>
                <th style="width: 110px;" class="num">वास्तविक आम्दानी (रु)</th>
                <th style="width: 100px;" class="num">बाँकी / फरक (रु)</th>
                <th style="width: 60px;" class="center">प्रगति %</th>
              </tr>
            </thead>
            <tbody>
              ${revenueList.length === 0 ? `<tr><td colspan="6" class="center" style="padding: 10px; color: #777;">कुनै आम्दानी शीर्षक विनियोजन गरिएको छैन।</td></tr>` : 
                revenueList.map((item, idx) => `
                  <tr>
                    <td class="center">${idx + 1}</td>
                    <td><strong>${item.headName || item.category || '—'}</strong> ${item.remarks ? `<br/><span style="font-size: 9px; color: #666;">कैफियत: ${item.remarks}</span>` : ''}</td>
                    <td class="num">रू ${formatNpr(item.allocatedAmount)}</td>
                    <td class="num" style="color: #047857;">रू ${formatNpr(item.actualAmount)}</td>
                    <td class="num">रू ${formatNpr(Number(item.allocatedAmount || 0) - Number(item.actualAmount || 0))}</td>
                    <td class="center"><strong>${item.percentUsed || 0}%</strong></td>
                  </tr>
                `).join('')
              }
              <tr class="total-row">
                <td colspan="2" class="center"><strong>जम्मा आम्दानी लक्ष्य (Total Revenue Target)</strong></td>
                <td class="num">रू ${formatNpr(totals.totalRevenueBudget)}</td>
                <td class="num" style="color: #047857;">रू ${formatNpr(totals.totalRevenueActual)}</td>
                <td class="num">रू ${formatNpr(totals.totalRevenueBudget - totals.totalRevenueActual)}</td>
                <td class="center">${revenuePct}%</td>
              </tr>
            </tbody>
          </table>

          <!-- Section B: EXPENSES -->
          <div class="section-header">
            <span>खण्ड (ख): खर्च तथा कार्यक्रम विनियोजन (EXPENDITURE ALLOCATIONS & CEILINGS)</span>
            <span>कुल खर्च शीर्षक: ${expenseList.length}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 25px;" class="center">क्र.सं.</th>
                <th>खर्च शीर्षक तथा कार्यक्रम (Expense Head / Program)</th>
                <th style="width: 110px;" class="num">वार्षिक विनियोजन (रु)</th>
                <th style="width: 110px;" class="num">वास्तविक खर्च (रु)</th>
                <th style="width: 100px;" class="num">बचत / बाँकी रकम (रु)</th>
                <th style="width: 60px;" class="center">खर्च %</th>
              </tr>
            </thead>
            <tbody>
              ${expenseList.length === 0 ? `<tr><td colspan="6" class="center" style="padding: 10px; color: #777;">कुनै खर्च बजेट विनियोजन गरिएको छैन।</td></tr>` : 
                expenseList.map((item, idx) => `
                  <tr>
                    <td class="center">${idx + 1}</td>
                    <td><strong>${item.headName || item.category || '—'}</strong> ${item.remarks ? `<br/><span style="font-size: 9px; color: #666;">कैफियत: ${item.remarks}</span>` : ''}</td>
                    <td class="num">रू ${formatNpr(item.allocatedAmount)}</td>
                    <td class="num" style="color: #b91c1c;">रू ${formatNpr(item.actualAmount)}</td>
                    <td class="num" style="${Number(item.variance || 0) < 0 ? 'color: #b91c1c; font-weight: bold;' : ''}">रू ${formatNpr(Number(item.allocatedAmount || 0) - Number(item.actualAmount || 0))}</td>
                    <td class="center"><strong style="${Number(item.percentUsed || 0) > 100 ? 'color: #b91c1c;' : ''}">${item.percentUsed || 0}%</strong></td>
                  </tr>
                `).join('')
              }
              <tr class="total-row">
                <td colspan="2" class="center"><strong>जम्मा खर्च विनियोजन (Total Expense Budget)</strong></td>
                <td class="num">रू ${formatNpr(totals.totalExpenseBudget)}</td>
                <td class="num" style="color: #b91c1c;">रू ${formatNpr(totals.totalExpenseActual)}</td>
                <td class="num">रू ${formatNpr(totals.totalExpenseBudget - totals.totalExpenseActual)}</td>
                <td class="center">${expensePct}%</td>
              </tr>
            </tbody>
          </table>

          <div class="signatures">
            <div class="sig-box">
              <div>तयार गर्ने (लेखापाल)</div>
              <div class="sig-title">Accountant / Cashier</div>
            </div>
            <div class="sig-box">
              <div>सिफारिसकर्ता (प्रधानाध्यापक)</div>
              <div class="sig-title">${principal} (Headmaster)</div>
            </div>
            <div class="sig-box">
              <div>स्वीकृत गर्ने (वि.व्य.स. अध्यक्ष)</div>
              <div class="sig-title">SMC Chairperson</div>
            </div>
          </div>

          <div class="footer-note">
            मुद्रण मिति: ${new Date().toLocaleDateString()} • Nepal Secondary School ERP • आधिकारिक बजेट अभिलेख
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (rawAllocations.length === 0) {
      toast.error('No budget data to export');
      return;
    }

    const headers = ['S.N.', 'Budget Type', 'Category Head', 'Account Code', 'Allocated Budget (NPR)', 'Actual Amount (NPR)', 'Variance (NPR)', 'Utilization (%)', 'Remarks'];
    const rows = rawAllocations.map((item, index) => [
      index + 1,
      item?.type || '',
      `"${(item?.headName || item?.category || '').replace(/"/g, '""')}"`,
      item?.headCode || '',
      item?.allocatedAmount || 0,
      item?.actualAmount || 0,
      item?.variance || 0,
      `${item?.percentUsed || 0}%`,
      `"${(item?.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Budget_Report_${currentFyObject?.year || 'Session'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Budget spreadsheet downloaded successfully!');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ─── PAGE HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-[#1e3a5f]">
              <Scale size={22} className="text-[#1e3a5f]" />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#1e3a5f] tracking-tight">
                School Budget & Variance Tracking (वार्षिक बजेट तथा खर्च नियन्त्रण)
              </h1>
              <p className="text-xs text-gray-500 font-nepali mt-0.5">
                नेपाल सरकार तथा स्थानीय तह विद्यालय बजेट तर्जुमा, शीर्षकगत विनियोजन तथा वास्तविक खर्च अनुगमन
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Financial Year Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-gray-200 px-3.5 py-2 rounded-xl text-xs font-bold text-[#1e3a5f] shadow-2xs">
            <Calendar size={15} className="text-blue-600 shrink-0" />
            <span className="text-gray-500 text-[11px] uppercase tracking-wider font-semibold">आ.व.:</span>
            <select
              value={effectiveFyId}
              onChange={(e) => setSelectedFyId(e.target.value)}
              className="bg-transparent font-black focus:outline-hidden cursor-pointer text-[#1e3a5f]"
            >
              {financialYears.length === 0 && <option value="">लोड हुँदैछ...</option>}
              {financialYears.map((fy: any) => (
                <option key={fy.id} value={fy.id}>
                  आ.व. {fy.year} {fy.isActive ? '★ (चालु आ.व.)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Actions Dropdown / Buttons */}
          <button
            onClick={() => {
              if (rawAllocations.length > 0) {
                if (confirm('तपाईंको चालु बजेटमा शीर्षकहरू पहिले नै छन्। के तपाईं मानक सरकारी शीर्षकहरू थप्न चाहनुहुन्छ?')) {
                  seedTemplateMutation.mutate(false);
                }
              } else {
                seedTemplateMutation.mutate(false);
              }
            }}
            disabled={seedTemplateMutation.isPending || !effectiveFyId}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition shadow-2xs disabled:opacity-50"
            title="मानक सरकारी तथा विद्यालय बजेट शीर्षकहरू स्वतः भर्नुहोस्"
          >
            <Sparkles size={14} className="text-amber-600" />
            <span>{seedTemplateMutation.isPending ? 'लोड हुँदै...' : 'मानक ढाँचा भर्ने (Auto Template)'}</span>
          </button>

          <button
            onClick={() => setIsCloneModalOpen(true)}
            disabled={financialYears.length <= 1}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition shadow-2xs disabled:opacity-50"
            title="अघिल्लो आर्थिक वर्षको बजेट प्रतिलिपि गर्नुहोस्"
          >
            <Copy size={14} className="text-slate-600" />
            <span>अघिल्लो वर्षबाट तान्ने</span>
          </button>

          <button
            onClick={handlePrintBudgetBook}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-3.5 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100 transition shadow-2xs"
            title="वार्षिक बजेट पुस्तिका प्रिन्ट गर्नुहोस्"
          >
            <Printer size={14} className="text-indigo-600" />
            <span>बजेट पुस्तिका प्रिन्ट</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition shadow-2xs"
            title="CSV/Excel मा डाउनलोड गर्नुहोस्"
          >
            <Download size={14} className="text-emerald-600" />
            <span>एक्सेल (CSV)</span>
          </button>

          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2 text-xs font-bold text-white hover:bg-[#2a5280] transition shadow-xs"
          >
            <Plus size={15} />
            <span>+ बजेट विनियोजन (Add Line)</span>
          </button>
        </div>
      </div>

      {/* ─── 4 TOP FINANCIAL KPI CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Expense Budget */}
        <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-white to-rose-50/30 p-4.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-rose-100 text-rose-700">
                <TrendingDown size={18} />
              </span>
              <span className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
                कुल खर्च बजेट (Expense)
              </span>
            </div>
            <span
              className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg ${
                expensePct > 100
                  ? 'bg-red-100 text-red-800 animate-pulse border border-red-200'
                  : expensePct >= 80
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {expensePct}% Used
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-rose-100/60">
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">विनियोजित (Allocated)</p>
              <p className="text-lg font-black text-gray-900 font-mono mt-0.5">
                रू {formatNpr(totals.totalExpenseBudget)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-rose-600 font-bold uppercase">वास्तविक खर्च (Spent)</p>
              <p className="text-lg font-black text-rose-700 font-mono mt-0.5">
                रू {formatNpr(totals.totalExpenseActual)}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-gray-500 font-medium">
              <span>बाँकी खर्च सीमा:</span>
              <span className={`font-mono font-bold ${totals.expenseVariance < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                रू {formatNpr(totals.expenseVariance)}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                style={{ width: `${Math.min(expensePct, 100)}%` }}
                className={`h-full rounded-full transition-all duration-500 ${
                  expensePct > 100 ? 'bg-red-600' : expensePct >= 80 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
              />
            </div>
          </div>
        </div>

        {/* 2. Total Revenue Target */}
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30 p-4.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <TrendingUp size={18} />
              </span>
              <span className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
                कुल आम्दानी लक्ष्य (Revenue)
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg">
              {revenuePct}% Realized
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-100/60">
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">लक्ष्य (Target)</p>
              <p className="text-lg font-black text-gray-900 font-mono mt-0.5">
                रू {formatNpr(totals.totalRevenueBudget)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-emerald-600 font-bold uppercase">वास्तविक प्राप्त (Earned)</p>
              <p className="text-lg font-black text-emerald-700 font-mono mt-0.5">
                रू {formatNpr(totals.totalRevenueActual)}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-gray-500 font-medium">
              <span>उठ्न बाँकी लक्ष्य:</span>
              <span className="font-mono font-bold text-gray-700">
                रू {formatNpr(totals.revenueVariance)}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                style={{ width: `${Math.min(revenuePct, 100)}%` }}
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Net Budget Surplus / Deficit */}
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/30 p-4.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-100 text-blue-800">
                <DollarSign size={18} />
              </span>
              <span className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
                बजेट सन्तुलन (Net Balance)
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                totals.netEstimatedSurplus >= 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {totals.netEstimatedSurplus >= 0 ? 'Surplus (बचत)' : 'Deficit (घाटा)'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-blue-100/60">
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">अनुमानित बचत/घाटा</p>
              <p className={`text-lg font-black font-mono mt-0.5 ${totals.netEstimatedSurplus >= 0 ? 'text-blue-900' : 'text-red-600'}`}>
                रू {formatNpr(totals.netEstimatedSurplus)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-blue-600 font-bold uppercase">वास्तविक बचत (Live)</p>
              <p className={`text-lg font-black font-mono mt-0.5 ${totals.netActualSurplus >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                रू {formatNpr(totals.netActualSurplus)}
              </p>
            </div>
          </div>

          <div className="text-[10.5px] text-gray-500 flex items-center justify-between pt-1">
            <span>कुल शीर्षक संख्या:</span>
            <span className="font-bold text-[#1e3a5f]">{summary.totalHeads} Heads</span>
          </div>
        </div>

        {/* 4. Budget Risk & Health Index */}
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/30 p-4.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <AlertTriangle size={18} />
              </span>
              <span className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
                जोखिम तथा चेतावनी (Alerts)
              </span>
            </div>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-lg">
              {summary.overBudgetCount > 0 ? 'Action Required' : 'Healthy'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-100/60">
            <div className="p-2 rounded-xl bg-white/80 border border-amber-100">
              <p className="text-[10px] text-red-600 font-bold uppercase">सीमा नाघेका (Over)</p>
              <p className="text-base font-black text-red-700 font-mono mt-0.5">
                {summary.overBudgetCount} शीर्षक
              </p>
            </div>
            <div className="p-2 rounded-xl bg-white/80 border border-amber-100 text-right">
              <p className="text-[10px] text-amber-600 font-bold uppercase">८०%+ पुगेका (Near)</p>
              <p className="text-base font-black text-amber-700 font-mono mt-0.5">
                {summary.nearCeilingCount} शीर्षक
              </p>
            </div>
          </div>

          <div className="text-[10px] text-gray-500 flex items-center justify-between">
            <span>सक्रिय आर्थिक वर्ष:</span>
            <span className="font-bold text-[#1e3a5f]">{currentFyObject?.year || '—'}</span>
          </div>
        </div>
      </div>

      {/* ─── TOOLBAR & VIEW CONTROLS ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
        {/* Type Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'ALL'
                ? 'bg-white text-[#1e3a5f] shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            सबै शीर्षक ({rawAllocations.length})
          </button>
          <button
            onClick={() => setActiveTab('EXPENSE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              activeTab === 'EXPENSE'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingDown size={13} />
            <span>खर्च बजेट ({summary.expenseHeadsCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('REVENUE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              activeTab === 'REVENUE'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp size={13} />
            <span>आम्दानी लक्ष्य ({summary.revenueHeadsCount})</span>
          </button>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="शीर्षक खोज्नुहोस्..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-gray-200 rounded-xl focus:outline-hidden focus:border-blue-500 w-48 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-gray-200 px-2.5 py-1.5 rounded-xl text-xs font-bold text-gray-700">
            <Filter size={13} className="text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="bg-transparent focus:outline-hidden font-bold cursor-pointer text-xs"
            >
              <option value="ALL">सबै स्थिति (All Status)</option>
              <option value="NORMAL">सामान्य (&lt;80%)</option>
              <option value="WARNING">सचेत (८०%-१००%)</option>
              <option value="OVERBUDGET">सीमा नाघेको (&gt;100%)</option>
            </select>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'TABLE' ? 'bg-white text-[#1e3a5f] shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Table View"
            >
              <Layers size={15} />
            </button>
            <button
              onClick={() => setViewMode('MONTHLY')}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'MONTHLY' ? 'bg-white text-[#1e3a5f] shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Monthly Matrix View"
            >
              <Calendar size={15} />
            </button>
            <button
              onClick={() => setViewMode('ANALYTICS')}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'ANALYTICS' ? 'bg-white text-[#1e3a5f] shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Visual Analytics"
            >
              <BarChart3 size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── VIEW 1: TABLE VIEW ─────────────────────────────────────────────── */}
      {viewMode === 'TABLE' && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]">
                Category-wise Budget Allocations & Live Realization (शीर्षकगत विनियोजन तथा खर्च)
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {filteredAllocations.length} शीर्षक
              </span>
            </div>
            <div className="text-xs text-gray-500">
              आ.व. <strong>{currentFyObject?.year || '—'}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-[#1e3a5f] text-white">
                <tr>
                  <th className="p-3.5 font-bold uppercase w-10 text-center">क्र.सं.</th>
                  <th className="p-3.5 font-bold uppercase">Category Head (शीर्षक तथा विवरण)</th>
                  <th className="p-3.5 font-bold uppercase w-24 text-center">Type</th>
                  <th className="p-3.5 font-bold uppercase text-right">Allocated Budget (वार्षिक विनियोजित)</th>
                  <th className="p-3.5 font-bold uppercase text-right">Actual Amount (वास्तविक खर्च/आम्दानी)</th>
                  <th className="p-3.5 font-bold uppercase text-right">Variance / Balance (बाँकी रकम)</th>
                  <th className="p-3.5 font-bold uppercase text-center w-40">Progress / Used %</th>
                  <th className="p-3.5 font-bold uppercase text-right w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoadingBudget ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-gray-400">
                      <RefreshCw size={24} className="mx-auto text-blue-500 animate-spin mb-2" />
                      <p className="text-xs font-bold text-gray-600">बजेट विवरण लोड हुँदैछ...</p>
                    </td>
                  </tr>
                ) : filteredAllocations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-gray-400">
                      <Layers size={36} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-sm font-bold text-gray-700">यस आर्थिक वर्षमा कुनै बजेट शीर्षक भेटिएन</p>
                      <p className="text-xs text-gray-400 mt-1">
                        माथिको "+ बजेट विनियोजन" वा "मानक ढाँचा भर्ने" बटन क्लिक गरेर तुरुन्त बजेट सेट गर्नुहोस्।
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredAllocations.map((item: any, idx: number) => {
                    const pct = Number(item.percentUsed || 0);
                    const isOver = !!item.isOverBudget;
                    const isNear = !!item.isNearCeiling;
                    const isExpanded = !!expandedMonthlyRows[item.id];
                    const isExpense = item.type === 'EXPENSE';

                    return (
                      <React.Fragment key={item.id}>
                        <tr className={`hover:bg-slate-50/80 transition ${isOver ? 'bg-red-50/30' : ''}`}>
                          <td className="p-3.5 text-center font-mono text-gray-400 font-bold">{idx + 1}</td>
                          <td className="p-3.5">
                            <div className="flex items-start gap-2">
                              <button
                                onClick={() => toggleMonthlyRow(item.id)}
                                className="mt-0.5 text-gray-400 hover:text-blue-600 transition"
                                title="Toggle monthly breakdown"
                              >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                              <div>
                                <div className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
                                  <span>{item.headName || item.category || '—'}</span>
                                  {item.headCode && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                      {item.headCode}
                                    </span>
                                  )}
                                </div>
                                {item.headCategoryName && (
                                  <div className="text-[10.5px] text-gray-400 font-medium">
                                    समूह: {item.headCategoryName}
                                  </div>
                                )}
                                {item.remarks && (
                                  <div className="text-[10px] text-gray-500 italic mt-0.5">
                                    {item.remarks}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`rounded-lg px-2.5 py-1 text-[10.5px] font-bold inline-flex items-center gap-1 ${
                                isExpense
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {isExpense ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                              <span>{isExpense ? 'EXPENSE' : 'REVENUE'}</span>
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-mono font-black text-gray-900 text-sm">
                            रू {formatNpr(item.allocatedAmount)}
                          </td>
                          <td
                            className={`p-3.5 text-right font-mono font-black text-sm ${
                              isExpense ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            रू {formatNpr(item.actualAmount)}
                          </td>
                          <td
                            className={`p-3.5 text-right font-mono font-bold ${
                              isExpense
                                ? Number(item.variance || 0) < 0
                                  ? 'text-red-600 font-black'
                                  : 'text-emerald-700'
                                : Number(item.actualAmount || 0) >= Number(item.allocatedAmount || 0)
                                ? 'text-emerald-700'
                                : 'text-gray-600'
                            }`}
                          >
                            रू {formatNpr(item.variance)}
                          </td>
                          <td className="p-3.5">
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                                <span className={isOver ? 'text-red-700' : isNear ? 'text-amber-700' : 'text-gray-700'}>
                                  {pct}%
                                </span>
                                {isOver ? (
                                  <span className="text-[9px] text-red-600 font-bold flex items-center gap-0.5 bg-red-100 px-1 rounded">
                                    <AlertTriangle size={9} /> Over Budget
                                  </span>
                                ) : isNear ? (
                                  <span className="text-[9px] text-amber-700 font-bold bg-amber-100 px-1 rounded">
                                    Warning 80%+
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1 rounded">
                                    On Track
                                  </span>
                                )}
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isOver
                                      ? 'bg-red-600'
                                      : isNear
                                      ? 'bg-amber-500'
                                      : isExpense
                                      ? 'bg-rose-500'
                                      : 'bg-emerald-500'
                                  }`}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openMonthlyPlannerModal(item)}
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-700 transition"
                                title="महिनावारी विनियोजन तालिका (Monthly Planner)"
                              >
                                <Calendar size={13} />
                              </button>
                              <button
                                onClick={() => openEditModal(item)}
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-slate-100 hover:text-slate-800 transition"
                                title="Edit Allocation"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`के तपाईं "${item.headName || item.category}" बजेट शीर्षक हटाउन निश्चित हुनुहुन्छ?`)) {
                                    deleteBudgetMutation.mutate(item.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Monthly Breakdown Sub-row */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 border-y border-slate-200">
                            <td colSpan={8} className="p-3.5">
                              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                                  <span className="text-[11px] font-bold text-[#1e3a5f] flex items-center gap-1">
                                    <Clock size={13} className="text-blue-600" />
                                    <span>१२ महिनाको मासिक विनियोजन तालिका (12-Month Monthly Distribution)</span>
                                  </span>
                                  <button
                                    onClick={() => openMonthlyPlannerModal(item)}
                                    className="text-[10px] font-bold text-blue-700 hover:underline"
                                  >
                                    मासिक योजना सम्पादन गर्नुहोस् &rarr;
                                  </button>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1.5 text-center">
                                  {NEPALI_MONTHS.map((m) => {
                                    const mVal = item.monthlyEstimates?.[m.id] !== undefined
                                      ? item.monthlyEstimates[m.id]
                                      : Math.round(Number(item.allocatedAmount || 0) / 12);
                                    return (
                                      <div key={m.id} className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[10px]">
                                        <p className="text-gray-500 font-bold truncate">{m.name.split(' ')[0]}</p>
                                        <p className="font-mono font-bold text-gray-900 mt-0.5">
                                          रू {formatNpr(mVal)}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── VIEW 2: MONTHLY MATRIX VIEW ─────────────────────────────────────── */}
      {viewMode === 'MONTHLY' && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]">
                12-Month Budget Distribution Matrix (महिनावारी विनियोजन तालिका)
              </h2>
              <p className="text-[11px] text-gray-500">बैशाख देखि चैत्र सम्मको शीर्षकगत मासिक योजना</p>
            </div>
            <span className="text-xs font-bold text-[#1e3a5f]">
              {filteredAllocations.length} Heads
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] text-gray-700 border-collapse">
              <thead className="bg-[#1e3a5f] text-white">
                <tr>
                  <th className="p-2.5 font-bold uppercase sticky left-0 bg-[#1e3a5f] z-10 min-w-[180px]">Category Head</th>
                  <th className="p-2.5 font-bold uppercase text-right w-24">Yearly Total</th>
                  {NEPALI_MONTHS.map(m => (
                    <th key={m.id} className="p-2 font-bold uppercase text-right min-w-[75px]">
                      {m.name.split(' ')[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAllocations.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-gray-900 sticky left-0 bg-white shadow-xs">
                      <div className="truncate max-w-[170px]" title={item.headName || item.category || ''}>
                        {item.headName || item.category || '—'}
                      </div>
                      <span className="text-[9px] font-semibold text-gray-400">{item.type}</span>
                    </td>
                    <td className="p-2.5 text-right font-mono font-black text-gray-900">
                      रू {formatNpr(item.allocatedAmount)}
                    </td>
                    {NEPALI_MONTHS.map(m => {
                      const mVal = item.monthlyEstimates?.[m.id] !== undefined
                        ? item.monthlyEstimates[m.id]
                        : Math.round(Number(item.allocatedAmount || 0) / 12);
                      return (
                        <td key={m.id} className="p-2 text-right font-mono font-medium text-gray-700 bg-slate-50/50">
                          {formatNpr(mVal)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── VIEW 3: VISUAL ANALYTICS & CATEGORY SPLIT ──────────────────────── */}
      {viewMode === 'ANALYTICS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Top Expense Consumers */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] flex items-center gap-1.5">
              <TrendingDown size={16} className="text-rose-600" />
              <span>खर्च विनियोजनका मुख्य शीर्षकहरू (Top Expense Allocations)</span>
            </h3>
            <div className="space-y-3">
              {rawAllocations
                .filter(a => a?.type === 'EXPENSE')
                .sort((a, b) => Number(b?.allocatedAmount || 0) - Number(a?.allocatedAmount || 0))
                .slice(0, 7)
                .map((item, idx) => {
                  const pctOfTotal = totals.totalExpenseBudget > 0
                    ? Math.round((Number(item?.allocatedAmount || 0) / totals.totalExpenseBudget) * 100)
                    : 0;
                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-gray-800">
                          {idx + 1}. {item.headName || item.category || '—'}
                        </span>
                        <span className="font-mono font-bold text-rose-700">
                          रू {formatNpr(item.allocatedAmount)} ({pctOfTotal}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pctOfTotal}%` }}
                          className="h-full bg-rose-500 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Top Revenue Sources */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] flex items-center gap-1.5">
              <TrendingUp size={16} className="text-emerald-600" />
              <span>आम्दानी लक्ष्यका मुख्य स्रोतहरू (Top Revenue Targets)</span>
            </h3>
            <div className="space-y-3">
              {rawAllocations
                .filter(a => a?.type === 'REVENUE' || a?.type === 'INCOME')
                .sort((a, b) => Number(b?.allocatedAmount || 0) - Number(a?.allocatedAmount || 0))
                .slice(0, 7)
                .map((item, idx) => {
                  const pctOfTotal = totals.totalRevenueBudget > 0
                    ? Math.round((Number(item?.allocatedAmount || 0) / totals.totalRevenueBudget) * 100)
                    : 0;
                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-gray-800">
                          {idx + 1}. {item.headName || item.category || '—'}
                        </span>
                        <span className="font-mono font-bold text-emerald-700">
                          रू {formatNpr(item.allocatedAmount)} ({pctOfTotal}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pctOfTotal}%` }}
                          className="h-full bg-emerald-500 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: ADD BUDGET ALLOCATION ─────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 text-[#1e3a5f]">
                  <Plus size={18} />
                </span>
                <h3 className="text-base font-extrabold text-[#1e3a5f]">
                  Set Budget Allocation (बजेट विनियोजन फारम)
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              {/* Type Switcher */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">बजेटको प्रकार (Budget Type) *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBudgetForm({ ...budgetForm, type: 'EXPENSE', headName: '', headId: '' })}
                    className={`p-2.5 rounded-xl border text-center font-bold transition flex items-center justify-center gap-1.5 ${
                      budgetForm.type === 'EXPENSE'
                        ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-2xs'
                        : 'border-gray-200 text-gray-600 hover:bg-slate-50'
                    }`}
                  >
                    <TrendingDown size={15} />
                    <span>खर्च बजेट (Expense)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBudgetForm({ ...budgetForm, type: 'REVENUE', headName: '', headId: '' })}
                    className={`p-2.5 rounded-xl border text-center font-bold transition flex items-center justify-center gap-1.5 ${
                      budgetForm.type === 'REVENUE'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                        : 'border-gray-200 text-gray-600 hover:bg-slate-50'
                    }`}
                  >
                    <TrendingUp size={15} />
                    <span>आम्दानी लक्ष्य (Revenue)</span>
                  </button>
                </div>
              </div>

              {/* Quick Select from Predefined Accounting Heads */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  विद्यमान खाता शीर्षकबाट छान्नुहोस् (Choose Predefined Head):
                </label>
                <select
                  value={budgetForm.headId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const list = budgetForm.type === 'EXPENSE' ? expenseHeads : incomeHeads;
                    const selected = list.find((h: any) => String(h.id) === String(id));
                    setBudgetForm({
                      ...budgetForm,
                      headId: id,
                      headName: selected ? (selected.nameNepali || selected.name) : budgetForm.headName,
                    });
                  }}
                  className="erp-input text-xs font-semibold cursor-pointer"
                >
                  <option value="">-- नयाँ शीर्षक लेख्नुहोस् (Custom Head) --</option>
                  {(budgetForm.type === 'EXPENSE' ? expenseHeads : incomeHeads).map((h: any) => (
                    <option key={h.id} value={h.id}>
                      {h.nameNepali || h.name} {h.code ? `(${h.code})` : ''} • {h.category?.name || ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Category / Head Name */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">शीर्षकको नाम (Category Head Name) *</label>
                <input
                  type="text"
                  placeholder="उदा: शिक्षक तलब, दिवा खाजा, विज्ञान ल्याब, आदि"
                  value={budgetForm.headName}
                  onChange={(e) => setBudgetForm({ ...budgetForm, headName: e.target.value })}
                  className="erp-input font-bold text-xs"
                  required
                />
              </div>

              {/* Annual Amount */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">वार्षिक विनियोजित रकम (Annual NPR) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500">रू</span>
                  <input
                    type="number"
                    placeholder="e.g. 500000"
                    value={budgetForm.yearlyEstimated}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBudgetForm(prev => {
                        const num = parseFloat(val) || 0;
                        const autoMonthly: Record<number, number> = {};
                        for (let m = 1; m <= 12; m++) autoMonthly[m] = Math.round(num / 12);
                        return { ...prev, yearlyEstimated: val, monthlyEstimates: autoMonthly };
                      });
                    }}
                    className="erp-input font-mono font-black text-sm pl-8"
                    required
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">कैफियत / विवरण (Remarks)</label>
                <input
                  type="text"
                  placeholder="आवश्यक थप टिप्पणी वा अनुदानको स्रोत..."
                  value={budgetForm.remarks}
                  onChange={(e) => setBudgetForm({ ...budgetForm, remarks: e.target.value })}
                  className="erp-input text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-slate-50"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                type="button"
                disabled={addBudgetMutation.isPending || !budgetForm.headName || !budgetForm.yearlyEstimated}
                onClick={() => addBudgetMutation.mutate(budgetForm)}
                className="rounded-xl bg-[#1e3a5f] px-5 py-2 font-bold text-white hover:bg-[#2a5280] disabled:opacity-60 transition"
              >
                {addBudgetMutation.isPending ? 'सुरक्षित हुँदै...' : 'बजेट सुरक्षित गर्नुहोस्'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: EDIT BUDGET ALLOCATION ────────────────────────────────── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <h3 className="text-base font-extrabold text-[#1e3a5f]">
                बजेट शीर्षक सम्पादन (Edit Budget)
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">शीर्षक (Head Name) *</label>
                <input
                  type="text"
                  value={budgetForm.headName}
                  onChange={(e) => setBudgetForm({ ...budgetForm, headName: e.target.value })}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">वार्षिक बजेट रकम (NPR) *</label>
                <input
                  type="number"
                  value={budgetForm.yearlyEstimated}
                  onChange={(e) => setBudgetForm({ ...budgetForm, yearlyEstimated: e.target.value })}
                  className="erp-input font-mono font-black text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">कैफियत (Remarks)</label>
                <input
                  type="text"
                  value={budgetForm.remarks}
                  onChange={(e) => setBudgetForm({ ...budgetForm, remarks: e.target.value })}
                  className="erp-input"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                type="button"
                disabled={editBudgetMutation.isPending}
                onClick={() => editBudgetMutation.mutate({ id: editingItem.id, payload: budgetForm })}
                className="rounded-xl bg-[#1e3a5f] px-5 py-2 font-bold text-white hover:bg-[#2a5280] disabled:opacity-60"
              >
                {editBudgetMutation.isPending ? 'अद्यावधिक हुँदै...' : 'अद्यावधिक गर्नुहोस्'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: MONTHLY PLANNER MODAL ─────────────────────────────────── */}
      {isMonthlyModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div>
                <h3 className="text-base font-extrabold text-[#1e3a5f]">
                  महिनावारी बजेट विनियोजन (12-Month Distribution)
                </h3>
                <p className="text-[11px] text-gray-500 font-bold">
                  शीर्षक: <span className="text-blue-900">{editingItem.headName || editingItem.category}</span> • वार्षिक कुल: रू {formatNpr(budgetForm.yearlyEstimated)}
                </p>
              </div>
              <button onClick={() => setIsMonthlyModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between bg-blue-50 p-2.5 rounded-xl border border-blue-100">
              <span className="text-[11px] font-bold text-blue-900">
                सबै १२ महिनामा बराबर विभाजन गर्नुहोस्:
              </span>
              <button
                type="button"
                onClick={() => autoDistributeMonthly(parseFloat(budgetForm.yearlyEstimated || '0'))}
                className="px-3 py-1 bg-white border border-blue-200 text-blue-700 font-bold rounded-lg hover:bg-blue-100 transition shadow-2xs"
              >
                बराबर विभाजन (Auto Divide)
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[55vh] overflow-y-auto pr-1">
              {NEPALI_MONTHS.map((m) => {
                const currentVal = budgetForm.monthlyEstimates?.[m.id] !== undefined
                  ? budgetForm.monthlyEstimates[m.id]
                  : Math.round(parseFloat(budgetForm.yearlyEstimated || '0') / 12);
                return (
                  <div key={m.id} className="p-2.5 rounded-xl border border-gray-200 bg-slate-50 space-y-1">
                    <label className="block font-bold text-gray-700 text-[10.5px]">{m.name}</label>
                    <input
                      type="number"
                      value={currentVal}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setBudgetForm(prev => ({
                          ...prev,
                          monthlyEstimates: { ...prev.monthlyEstimates, [m.id]: val },
                        }));
                      }}
                      className="erp-input font-mono font-bold text-xs"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <div className="text-[11px] font-bold text-gray-600">
                महिनावारी योग: <span className="font-mono text-gray-900 font-black">
                  रू {formatNpr(Object.values(budgetForm.monthlyEstimates || {}).reduce((a, b) => a + (parseFloat(b as any) || 0), 0))}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsMonthlyModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600"
                >
                  रद्द गर्नुहोस्
                </button>
                <button
                  type="button"
                  disabled={editBudgetMutation.isPending}
                  onClick={() => editBudgetMutation.mutate({ id: editingItem.id, payload: budgetForm })}
                  className="rounded-xl bg-[#1e3a5f] px-5 py-2 font-bold text-white hover:bg-[#2a5280] disabled:opacity-60"
                >
                  {editBudgetMutation.isPending ? 'सुरक्षित हुँदै...' : 'मासिक योजना सुरक्षित गर्नुहोस्'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: CLONE PREVIOUS YEAR MODAL ─────────────────────────────── */}
      {isCloneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Copy size={18} className="text-blue-600" />
                <h3 className="text-base font-extrabold text-[#1e3a5f]">
                  अघिल्लो आर्थिक वर्षबाट बजेट प्रतिलिपि
                </h3>
              </div>
              <button onClick={() => setIsCloneModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block font-bold text-gray-700 mb-1">स्रोत आर्थिक वर्ष (Source Fiscal Year) *</label>
                <select
                  value={cloneForm.sourceFinancialYearId}
                  onChange={(e) => setCloneForm({ ...cloneForm, sourceFinancialYearId: e.target.value })}
                  className="erp-input cursor-pointer font-bold"
                >
                  <option value="">-- अघिल्लो आ.व. छान्नुहोस् --</option>
                  {financialYears
                    .filter((fy: any) => String(fy?.id) !== String(effectiveFyId))
                    .map((fy: any) => (
                      <option key={fy.id} value={fy.id}>
                        आ.व. {fy.year}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  वार्षिक बजेट वृद्धि प्रतिशत (% Increment for Growth / Inflation):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={cloneForm.incrementPercentage}
                    onChange={(e) => setCloneForm({ ...cloneForm, incrementPercentage: parseFloat(e.target.value) || 0 })}
                    className="erp-input font-mono font-bold w-28 text-sm"
                  />
                  <span className="text-xs font-bold text-gray-500">% वृद्धि</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  उदा: ०% राखेमा उही रकम, १०% राखेमा १० प्रतिशत थपिएर नयाँ आ.व. मा आउनेछ।
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setIsCloneModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                type="button"
                disabled={cloneMutation.isPending || !cloneForm.sourceFinancialYearId}
                onClick={() => cloneMutation.mutate()}
                className="rounded-xl bg-[#1e3a5f] px-5 py-2 font-bold text-white hover:bg-[#2a5280] disabled:opacity-60 transition"
              >
                {cloneMutation.isPending ? 'प्रतिलिपि हुँदै...' : 'बजेट प्रतिलिपि गर्नुहोस्'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
