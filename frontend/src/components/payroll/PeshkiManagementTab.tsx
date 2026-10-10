'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import { numberToNepaliWords, toNepaliDigits } from '@/lib/nepali-number-words';
import {
  Wallet,
  Plus,
  Printer,
  X,
  FileText,
  CheckCircle2,
  Calendar,
  Building,
  Edit2,
  Trash2,
  UserCheck,
  Search,
  Download,
  CreditCard,
  Layers,
  Sparkles,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  BookOpen,
  Send,
  Users,
  Check,
  Clock,
  Ban,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PeshkiManagementTabProps {
  teachersData: any[];
  financialYearsData: any[];
  bankAccountsData: any[];
  schoolProfile: any;
  currentYear: string;
}

const NEPALI_MONTHS = [
  { id: '01', name: 'बैशाख (Baisakh)', nepali: 'बैशाख' },
  { id: '02', name: 'जेठ (Jestha)', nepali: 'जेठ' },
  { id: '03', name: 'असार (Ashadh)', nepali: 'असार' },
  { id: '04', name: 'साउन (Shrawan)', nepali: 'साउन' },
  { id: '05', name: 'भदौ (Bhadra)', nepali: 'भदौ' },
  { id: '06', name: 'असोज (Ashwin)', nepali: 'असोज' },
  { id: '07', name: 'कार्तिक (Kartik)', nepali: 'कार्तिक' },
  { id: '08', name: 'मंसिर (Mangsir)', nepali: 'मंसिर' },
  { id: '09', name: 'पुस (Poush)', nepali: 'पुस' },
  { id: '10', name: 'माघ (Magh)', nepali: 'माघ' },
  { id: '11', name: 'फागुन (Falgun)', nepali: 'फागुन' },
  { id: '12', name: 'चैत (Chaitra)', nepali: 'चैत' },
];

export default function PeshkiManagementTab({
  teachersData,
  financialYearsData,
  bankAccountsData,
  schoolProfile,
  currentYear,
}: PeshkiManagementTabProps) {
  const queryClient = useQueryClient();

  // Active Fiscal Year
  const activeFy = financialYearsData?.find((f: any) => f.isActive) || financialYearsData?.[0];
  const defaultYearString = currentYear || activeFy?.year || '2081';
  const defaultYearOnly = defaultYearString.includes('/') ? defaultYearString.split('/')[0] : defaultYearString;

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SETTLED' | 'CANCELLED'>('ALL');
  const [financialYearFilter, setFinancialYearFilter] = useState<string>('ALL');
  const [teacherFilter, setTeacherFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals State
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [editingPeshki, setEditingPeshki] = useState<any>(null);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedPeshki, setSelectedPeshki] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('प्रशासनिक निर्णय अनुसार पेस्की निकासा रद्द');

  // New Advance Form State
  const [issueForm, setIssueForm] = useState({
    teacherId: '',
    financialYearId: activeFy?.id ? activeFy.id.toString() : '',
    amount: '',
    givenDateBs: todayBS(),
    paymentMethod: 'CHEQUE', // CASH, CHEQUE, BANK_TRANSFER
    bankAccountId: '', // School's bank account
    chequeNo: '',
    // Teacher's receiving bank details
    teacherBankName: '',
    teacherBankAccountNo: '',
    teacherBankBranch: '',
    teacherAccountSelection: 'PRIMARY', // 'PRIMARY', or bankAccount ID, or 'CUSTOM'
    // Deduction Schedule
    deductFromYear: defaultYearOnly,
    deductFromMonth: '04', // साउन
    deductToYear: defaultYearOnly,
    deductToMonth: '06', // असोज
    deductionMode: 'FULL', // FULL or INSTALLMENT
    monthlyDeduction: '',
    reason: 'चाडपर्व तथा घरायसी पेस्की (Salary Advance)',
    remarks: '',
    status: 'ACTIVE', // ACTIVE (Paid/Disbursed) or PENDING
    createExpenseVoucher: true,
  });

  // Edit Advance Form State
  const [editForm, setEditForm] = useState({
    teacherId: '',
    financialYearId: '',
    amount: '',
    remainingAmount: '',
    givenDateBs: '',
    paymentMethod: 'CHEQUE',
    bankAccountId: '',
    chequeNo: '',
    // Teacher's receiving bank details
    teacherBankName: '',
    teacherBankAccountNo: '',
    teacherBankBranch: '',
    teacherAccountSelection: 'PRIMARY',
    // Deduction Schedule
    deductFromYear: defaultYearOnly,
    deductFromMonth: '04',
    deductToYear: defaultYearOnly,
    deductToMonth: '06',
    monthlyDeduction: '',
    reason: '',
    remarks: '',
    status: 'ACTIVE',
  });

  // Direct Settlement Form State
  const [settleForm, setSettleForm] = useState({
    amount: '',
    settledDateBs: todayBS(),
    paymentMethod: 'CASH', // CASH, BANK_DEPOSIT
    depositBankAccountId: '',
    remarks: 'नगद दाखिला गरी सोझै पेस्की फर्छ्यौट',
  });

  // Helper to extract teacher accounts list
  const getTeacherAccounts = (teacher: any) => {
    if (!teacher) return [];
    const list: any[] = [];
    if (teacher.bankAccountNo || teacher.bankName) {
      list.push({
        id: 'PRIMARY_DIRECT',
        bankName: teacher.bankName || 'मुख्य तलब खाता',
        accountNumber: teacher.bankAccountNo || '',
        branch: teacher.bankBranch || '',
        accountType: 'तलब खाता (Salary Account)',
        isPrimary: true,
      });
    }
    if (Array.isArray(teacher.bankAccounts)) {
      teacher.bankAccounts.forEach((ba: any) => {
        if (!list.some((existing) => existing.accountNumber === ba.accountNumber && ba.accountNumber)) {
          list.push({
            id: ba.id ? ba.id.toString() : ba.accountNumber,
            bankName: ba.bankName,
            accountNumber: ba.accountNumber,
            branch: ba.branch || '',
            accountType: ba.accountType || 'बैंक खाता',
            isPrimary: !!ba.isPrimary,
          });
        }
      });
    }
    return list;
  };

  // Currently selected teacher in issue modal
  const selectedTeacherForIssue = useMemo(() => {
    if (!issueForm.teacherId) return null;
    return teachersData?.find((t: any) => t.id.toString() === issueForm.teacherId);
  }, [issueForm.teacherId, teachersData]);

  // Currently selected teacher in edit modal
  const selectedTeacherForEdit = useMemo(() => {
    if (!editForm.teacherId) return null;
    return teachersData?.find((t: any) => t.id.toString() === editForm.teacherId);
  }, [editForm.teacherId, teachersData]);

  // Handle Teacher selection change in Issue Form
  const handleTeacherChangeInIssue = (teacherId: string) => {
    const teacher = teachersData?.find((t: any) => t.id.toString() === teacherId);
    if (!teacher) {
      setIssueForm((prev) => ({
        ...prev,
        teacherId: '',
        teacherBankName: '',
        teacherBankAccountNo: '',
        teacherBankBranch: '',
        teacherAccountSelection: 'PRIMARY',
      }));
      return;
    }
    const accounts = getTeacherAccounts(teacher);
    const primary = accounts.find((a) => a.isPrimary) || accounts[0];
    setIssueForm((prev) => ({
      ...prev,
      teacherId,
      teacherBankName: primary ? primary.bankName : (teacher.bankName || ''),
      teacherBankAccountNo: primary ? primary.accountNumber : (teacher.bankAccountNo || ''),
      teacherBankBranch: primary ? primary.branch : (teacher.bankBranch || ''),
      teacherAccountSelection: primary ? primary.id : 'CUSTOM',
    }));
  };

  // Handle Teacher selection change in Edit Form
  const handleTeacherChangeInEdit = (teacherId: string) => {
    const teacher = teachersData?.find((t: any) => t.id.toString() === teacherId);
    if (!teacher) return;
    const accounts = getTeacherAccounts(teacher);
    const primary = accounts.find((a) => a.isPrimary) || accounts[0];
    setEditForm((prev) => ({
      ...prev,
      teacherId,
      teacherBankName: primary ? primary.bankName : (teacher.bankName || ''),
      teacherBankAccountNo: primary ? primary.accountNumber : (teacher.bankAccountNo || ''),
      teacherBankBranch: primary ? primary.branch : (teacher.bankBranch || ''),
      teacherAccountSelection: primary ? primary.id : 'CUSTOM',
    }));
  };

  // Fetch Advances Query
  const { data: peshkiResponse, isLoading } = useQuery({
    queryKey: ['staff-peshkis', statusFilter, financialYearFilter, teacherFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (financialYearFilter !== 'ALL') params.append('financialYearId', financialYearFilter);
      if (teacherFilter !== 'ALL') params.append('teacherId', teacherFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      const res = await api.get(`/peshki?${params.toString()}`);
      return res.data;
    },
  });

  const peshkis: any[] = peshkiResponse?.data || [];
  const summary = peshkiResponse?.summary || {
    totalAdvanceGiven: 0,
    totalRemaining: 0,
    totalSettled: 0,
    activeCount: 0,
    settledCount: 0,
    cancelledCount: 0,
  };

  // Invalidate queries helper
  const refreshAllPeshkiQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['staff-peshkis'] });
    queryClient.invalidateQueries({ queryKey: ['staff-peshkis-active-list'] });
    queryClient.invalidateQueries({ queryKey: ['payrolls-list'] });
    queryClient.invalidateQueries({ queryKey: ['payroll'] });
    queryClient.invalidateQueries({ queryKey: ['staff-advance-report'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-single'] });
    queryClient.invalidateQueries({ queryKey: ['teachers'] });
    queryClient.invalidateQueries({ queryKey: ['expense-entries-reports'] });
    queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
    queryClient.invalidateQueries({ queryKey: ['bank-accounts-all'] });
  };

  // Issue Advance Mutation
  const issueMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/peshki', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'पेस्की सफलतापूर्वक दर्ता भयो!');
      setIsIssueModalOpen(false);
      refreshAllPeshkiQueries();
      // Reset form
      setIssueForm({
        teacherId: '',
        financialYearId: activeFy?.id ? activeFy.id.toString() : '',
        amount: '',
        givenDateBs: todayBS(),
        paymentMethod: 'CHEQUE',
        bankAccountId: '',
        chequeNo: '',
        teacherBankName: '',
        teacherBankAccountNo: '',
        teacherBankBranch: '',
        teacherAccountSelection: 'PRIMARY',
        deductFromYear: defaultYearOnly,
        deductFromMonth: '04',
        deductToYear: defaultYearOnly,
        deductToMonth: '06',
        deductionMode: 'FULL',
        monthlyDeduction: '',
        reason: 'चाडपर्व तथा घरायसी पेस्की (Salary Advance)',
        remarks: '',
        status: 'ACTIVE',
        createExpenseVoucher: true,
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'पेस्की दर्ता गर्न सकिएन');
    },
  });

  // Mark Paid (1-Click) Mutation
  const markPaidMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload?: any }) => {
      const res = await api.patch(`/peshki/${id}/mark-paid`, payload || {});
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'पेस्की भुक्तानी प्रमाणित भयो!');
      refreshAllPeshkiQueries();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'भुक्तानी प्रमाणित गर्न सकिएन');
    },
  });

  // Edit Advance Mutation
  const editMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await api.put(`/peshki/${id}`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'पेस्की विवरण अद्यावधिक भयो!');
      setEditingPeshki(null);
      refreshAllPeshkiQueries();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'अद्यावधिक गर्न सकिएन');
    },
  });

  // Direct Settle Mutation
  const settleMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await api.post(`/peshki/${id}/settle`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'पेस्की फर्छ्यौट सुरक्षित गरियो!');
      setIsSettleModalOpen(false);
      setSelectedPeshki(null);
      refreshAllPeshkiQueries();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'फर्छ्यौट गर्न सकिएन');
    },
  });

  // Cancel Advance Mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await api.post(`/peshki/${id}/cancel`, { reason });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'पेस्की सफलतापूर्वक रद्द गरियो!');
      setIsCancelModalOpen(false);
      setSelectedPeshki(null);
      refreshAllPeshkiQueries();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'रद्द गर्न सकिएन');
    },
  });

  // Delete Advance Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/peshki/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'पेस्की अभिलेख हटाइयो');
      refreshAllPeshkiQueries();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'हटाउन सकिएन');
    },
  });

  // Open Edit Modal with pre-filled state
  const openEditModal = (p: any) => {
    setEditingPeshki(p);
    const fromParts = (p.deductFromMonth || '').split('-');
    const toParts = (p.deductToMonth || '').split('-');

    const teacher = p.teacher || teachersData?.find((t: any) => t.id === p.teacherId);
    const accounts = getTeacherAccounts(teacher);
    const matchingAcc = accounts.find((a) => a.accountNumber === p.teacher?.bankAccountNo);

    setEditForm({
      teacherId: p.teacherId ? p.teacherId.toString() : '',
      financialYearId: p.financialYearId ? p.financialYearId.toString() : '',
      amount: p.amount ? p.amount.toString() : '',
      remainingAmount: p.remainingAmount !== undefined ? p.remainingAmount.toString() : '',
      givenDateBs: p.givenDateBs || '',
      paymentMethod: p.paymentMethod || 'CHEQUE',
      bankAccountId: p.bankAccountId ? p.bankAccountId.toString() : '',
      chequeNo: p.chequeNo || '',
      teacherBankName: p.bankName || p.teacher?.bankName || '',
      teacherBankAccountNo: p.teacher?.bankAccountNo || '',
      teacherBankBranch: p.teacher?.bankBranch || '',
      teacherAccountSelection: matchingAcc ? matchingAcc.id : 'CUSTOM',
      deductFromYear: fromParts[0] || defaultYearOnly,
      deductFromMonth: fromParts[1] || '04',
      deductToYear: toParts[0] || defaultYearOnly,
      deductToMonth: toParts[1] || '06',
      monthlyDeduction: p.monthlyDeduction ? p.monthlyDeduction.toString() : '',
      reason: p.reason || '',
      remarks: p.remarks || '',
      status: p.status || 'ACTIVE',
    });
  };

  // Open Cancel Modal
  const openCancelModal = (p: any) => {
    setSelectedPeshki(p);
    setCancelReason('प्रशासनिक निर्णय अनुसार पेस्की निकासा रद्द');
    setIsCancelModalOpen(true);
  };

  // Handle Issue Submit
  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.teacherId) {
      toast.error('कृपया शिक्षक/कर्मचारी छनोट गर्नुहोस्!');
      return;
    }
    const amt = parseFloat(issueForm.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('कृपया मान्य पेस्की रकम प्रविष्ट गर्नुहोस्!');
      return;
    }

    const fromPeriod = `${issueForm.deductFromYear}-${issueForm.deductFromMonth}`;
    const toPeriod = `${issueForm.deductToYear}-${issueForm.deductToMonth}`;

    // Format receiving bank text for permanent advance snapshot
    const receivingBankInfo = issueForm.teacherBankName
      ? `${issueForm.teacherBankName}${issueForm.teacherBankAccountNo ? ' - खाता नं: ' + issueForm.teacherBankAccountNo : ''}${issueForm.teacherBankBranch ? ' (' + issueForm.teacherBankBranch + ')' : ''}`
      : null;

    issueMutation.mutate({
      teacherId: parseInt(issueForm.teacherId),
      financialYearId: issueForm.financialYearId ? parseInt(issueForm.financialYearId) : null,
      amount: amt,
      givenDateBs: issueForm.givenDateBs || todayBS(),
      paymentMethod: issueForm.paymentMethod,
      bankAccountId: issueForm.bankAccountId ? parseInt(issueForm.bankAccountId) : null,
      chequeNo: issueForm.chequeNo || null,
      bankName: receivingBankInfo || issueForm.teacherBankName || null,
      deductFromMonth: fromPeriod,
      deductToMonth: toPeriod,
      monthlyDeduction: issueForm.deductionMode === 'INSTALLMENT' && issueForm.monthlyDeduction ? parseFloat(issueForm.monthlyDeduction) : null,
      reason: issueForm.reason,
      remarks: issueForm.remarks,
      status: issueForm.status,
      createExpenseVoucher: issueForm.createExpenseVoucher,
    });
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPeshki) return;
    const amt = parseFloat(editForm.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('कृपया मान्य रकम प्रविष्ट गर्नुहोस्!');
      return;
    }

    const fromPeriod = `${editForm.deductFromYear}-${editForm.deductFromMonth}`;
    const toPeriod = `${editForm.deductToYear}-${editForm.deductToMonth}`;

    const receivingBankInfo = editForm.teacherBankName
      ? `${editForm.teacherBankName}${editForm.teacherBankAccountNo ? ' - खाता नं: ' + editForm.teacherBankAccountNo : ''}${editForm.teacherBankBranch ? ' (' + editForm.teacherBankBranch + ')' : ''}`
      : null;

    editMutation.mutate({
      id: editingPeshki.id,
      payload: {
        teacherId: editForm.teacherId ? parseInt(editForm.teacherId) : undefined,
        financialYearId: editForm.financialYearId ? parseInt(editForm.financialYearId) : null,
        amount: amt,
        remainingAmount: editForm.remainingAmount !== '' ? parseFloat(editForm.remainingAmount) : undefined,
        givenDateBs: editForm.givenDateBs,
        paymentMethod: editForm.paymentMethod,
        bankAccountId: editForm.bankAccountId ? parseInt(editForm.bankAccountId) : null,
        chequeNo: editForm.chequeNo,
        bankName: receivingBankInfo || editForm.teacherBankName || null,
        deductFromMonth: fromPeriod,
        deductToMonth: toPeriod,
        monthlyDeduction: editForm.monthlyDeduction ? parseFloat(editForm.monthlyDeduction) : null,
        reason: editForm.reason,
        remarks: editForm.remarks,
        status: editForm.status,
      },
    });
  };

  // Print Official Peshki Voucher
  const triggerPrintReceipt = (peshki: any) => {
    if (!peshki) return;
    const printWin = window.open('', '_blank', 'width=850,height=950');
    if (!printWin) {
      alert('कृपया प्रिन्ट गर्न पप-अप अनुमति दिनुहोस्');
      return;
    }

    const schoolNe = schoolProfile?.nameNepali || 'नेपाल माध्यमिक विद्यालय';
    const subNe = schoolProfile?.address || 'विश्रामपुर, वृन्दावन-२, रौतहट';
    const estdNe = schoolProfile?.establishedYear ? `(स्था: ${schoolProfile.establishedYear})` : '(स्था: २०४१)';
    const amtWords = numberToNepaliWords(peshki.amount);
    const teacherName = peshki.teacher?.fullNameNepali || peshki.teacher?.fullName || 'कर्मचारी';
    const fyName = peshki.financialYear?.year ? `आ.व. ${peshki.financialYear.year}` : '';
    const receivingAcc = peshki.bankName || (peshki.teacher?.bankAccountNo ? `${peshki.teacher.bankName || 'बैंक खाता'} (खाता: ${peshki.teacher.bankAccountNo})` : 'नगद भुक्तानी');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>पेस्की निकासा भौचर - ${teacherName}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; }
            body { font-family: "Noto Sans Devanagari", "Kalimati", Arial, sans-serif; font-size: 13px; color: #000; line-height: 1.5; padding: 10px; }
            .voucher-box { border: 2.5px solid #1e3a5f; padding: 25px; border-radius: 10px; max-width: 700px; margin: 0 auto; background: #fff; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 16px; }
            .title { font-size: 22px; font-weight: 900; color: #0b1f3a; margin: 0; }
            .sub { font-size: 13.5px; color: #334155; font-weight: bold; margin-top: 2px; }
            .badge { display: inline-block; background: #1e3a5f; color: #fff; padding: 5px 20px; border-radius: 6px; font-weight: 900; margin-top: 10px; font-size: 14px; letter-spacing: 0.5px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; background: #f8fafc; padding: 14px; border: 1px solid #cbd5e1; border-radius: 8px; }
            .meta-item { font-size: 12.5px; }
            .meta-label { color: #64748b; font-weight: bold; }
            .meta-val { font-weight: 800; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th, td { border: 1px solid #cbd5e1; padding: 9px 12px; }
            th { background: #f1f5f9; font-weight: 800; text-align: left; width: 42%; }
            .amt-box { background: #ecfdf5; border: 2px solid #059669; padding: 14px 18px; border-radius: 8px; margin: 18px 0; font-weight: 900; }
            .signatures { display: flex; justify-content: space-between; margin-top: 65px; font-size: 12px; font-weight: bold; }
            .sig-block { width: 180px; text-align: center; border-top: 1px dashed #000; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="voucher-box">
            <div class="header">
              <h1 class="title">${schoolNe}</h1>
              <div class="sub">${subNe} ${estdNe}</div>
              <div class="badge">शिक्षक तथा कर्मचारी पेस्की निकासा भौचर (ADVANCE VOUCHER) ${fyName}</div>
            </div>

            <div class="meta-grid">
              <div class="meta-item"><span class="meta-label">भौचर / पेस्की नं.:</span> <span class="meta-val">PESHKI-#${peshki.id}</span></div>
              <div class="meta-item"><span class="meta-label">पेस्की दिएको मिति:</span> <span class="meta-val">${peshki.givenDateBs || '—'} BS</span></div>
              <div class="meta-item"><span class="meta-label">शिक्षक/कर्मचारीको नाम:</span> <span class="meta-val">${teacherName}</span></div>
              <div class="meta-item"><span class="meta-label">पद / श्रेणी:</span> <span class="meta-val">${peshki.teacher?.taha || ''} ${peshki.teacher?.post ? '(' + peshki.teacher.post + ')' : ''}</span></div>
              <div class="meta-item"><span class="meta-label">भुक्तानी माध्यम:</span> <span class="meta-val">${peshki.paymentMethod === 'CHEQUE' ? `चेक नं. ${peshki.chequeNo || '—'}` : peshki.paymentMethod === 'BANK_TRANSFER' ? 'बैंक ट्रान्सफर' : 'नगद (Cash)'}</span></div>
              <div class="meta-item"><span class="meta-label">विद्यालयको भुक्तानी खाता:</span> <span class="meta-val">${peshki.bankAccount?.bankName || 'विद्यालयको कोष'}</span></div>
              <div class="meta-item" style="grid-column: span 2;"><span class="meta-label">शिक्षकको प्राप्त गर्ने खाता:</span> <span class="meta-val" style="color: #0b1f3a;">${receivingAcc}</span></div>
            </div>

            <table>
              <tr>
                <th>पेस्की प्रयोजन / विवरण:</th>
                <td><strong>${peshki.reason || 'तलब पेस्की (Salary Advance)'}</strong></td>
              </tr>
              <tr>
                <th>तलब कट्टी सुरु हुने अवधि:</th>
                <td><strong>${peshki.deductFromMonth || '—'} देखि ${peshki.deductToMonth || '—'}</strong></td>
              </tr>
              <tr>
                <th>कट्टी प्रणाली (Deduction Mode):</th>
                <td>${peshki.monthlyDeduction > 0 ? `मासिक किस्ता रू ${peshki.monthlyDeduction.toLocaleString()} का दरले` : 'एकमुष्ट तलब निकासाबाट कट्टी'}</td>
              </tr>
              <tr>
                <th>कैफियत (Remarks):</th>
                <td>${peshki.remarks || '—'}</td>
              </tr>
            </table>

            <div class="amt-box">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 16px; color: #065f46;">
                <span>स्वीकृत कुल पेस्की रकम:</span>
                <span style="font-size: 22px; font-weight: 900;">रू ${peshki.amount?.toLocaleString()}/-</span>
              </div>
              <div style="font-size: 12.5px; color: #047857; margin-top: 4px;">
                <strong>अक्षरेपी:</strong> ${amtWords}
              </div>
            </div>

            <div style="font-size: 11px; color: #64748b; font-style: italic;">
              * यस पेस्की रकम सम्बन्धित शिक्षक/कर्मचारीको आगामी महिनाको तलब निकासा वा मासिक किस्ताबन्दी अनुसार अनिवार्य रूपमा कट्टी/फर्छ्यौट गरिनेछ।
            </div>

            <div class="signatures">
              <div class="sig-block">पेस्की लिने शिक्षक/कर्मचारी<br/><span style="font-size:11px; color:#666;">दस्तखत: ...................</span></div>
              <div class="sig-block">लेखापाल / तयार गर्ने<br/><span style="font-size:11px; color:#666;">दस्तखत: ...................</span></div>
              <div class="sig-block">प्रधानाध्यापक / स्वीकृतकर्ता<br/><span style="font-size:11px; color:#666;">दस्तखत: ...................</span></div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="space-y-5">
      {/* ─── 1. TOP SUMMARY CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Advance Given */}
        <div className="rounded-2xl border border-blue-200 bg-linear-to-br from-blue-50 to-indigo-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900">कुल स्वीकृत पेस्की रकम</span>
            <div className="p-2 bg-[#1e3a5f] text-white rounded-xl shadow-2xs">
              <Wallet size={16} />
            </div>
          </div>
          <div className="mt-2 text-xl font-extrabold text-[#1e3a5f] font-mono">
            रू {(summary.totalAdvanceGiven || 0).toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-blue-800">
            जम्मा {peshkis.length} वटा पेस्की अभिलेख दर्ता
          </div>
        </div>

        {/* Card 2: Remaining Balance Due */}
        <div className="rounded-2xl border border-rose-200 bg-linear-to-br from-rose-50 to-orange-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-900">बाँकी कट्टी गर्नुपर्ने (दायित्व)</span>
            <div className="p-2 bg-rose-600 text-white rounded-xl shadow-2xs">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-2 text-xl font-extrabold text-rose-900 font-mono">
            रू {(summary.totalRemaining || 0).toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-rose-700">
            {summary.activeCount || 0} जना शिक्षकको सक्रिय पेस्की बाँकी
          </div>
        </div>

        {/* Card 3: Settled Amount */}
        <div className="rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-teal-50/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">तलबबाट कट्टी / फर्छ्यौट</span>
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-2xs">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-2 text-xl font-extrabold text-emerald-950 font-mono">
            रू {(summary.totalSettled || 0).toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-emerald-800">
            {summary.settledCount || 0} वटा पेस्की पूर्ण फर्छ्यौट भइसकेको
          </div>
        </div>

        {/* Card 4: Quick Action */}
        <div className="rounded-2xl border-2 border-dashed border-[#1e3a5f]/40 bg-slate-50 p-4 flex flex-col justify-center items-center text-center shadow-2xs">
          <button
            type="button"
            onClick={() => setIsIssueModalOpen(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Plus size={16} />
            <span>+ नयाँ पेस्की दर्ता (Issue Advance)</span>
          </button>
          <span className="text-[10.5px] text-gray-500 font-nepali mt-1.5">
            शिक्षक तथा कर्मचारीलाई तलब पेस्की/सापटी दिनुहोस्
          </span>
        </div>
      </div>

      {/* ─── 2. SEARCH & FILTER TOOLBAR ─── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold flex-wrap">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              सबै ({peshkis.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'ACTIVE' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-900 hover:bg-amber-100/50'
              }`}
            >
              सक्रिय / बाँकी ({summary.activeCount || 0})
            </button>
            <button
              onClick={() => setStatusFilter('SETTLED')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'SETTLED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-900 hover:bg-emerald-100/50'
              }`}
            >
              पूर्ण फर्छ्यौट ({summary.settledCount || 0})
            </button>
            <button
              onClick={() => setStatusFilter('CANCELLED')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                statusFilter === 'CANCELLED' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-900 hover:bg-rose-100/50'
              }`}
            >
              रद्द ({summary.cancelledCount || 0})
            </button>
          </div>

          {/* Filters: Fiscal Year, Teacher & Text Search */}
          <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap sm:flex-nowrap">
            {/* Fiscal Year Filter */}
            <select
              value={financialYearFilter}
              onChange={(e) => setFinancialYearFilter(e.target.value)}
              className="text-xs font-bold border border-gray-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden cursor-pointer shrink-0"
            >
              <option value="ALL">सबै आ.व. (All FY)</option>
              {financialYearsData?.map((fy: any) => (
                <option key={fy.id} value={fy.id.toString()}>
                  आ.व. {fy.year} {fy.isActive ? '★ (Active)' : ''}
                </option>
              ))}
            </select>

            {/* Teacher Selector */}
            <select
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              className="text-xs font-bold border border-gray-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden cursor-pointer max-w-[200px] truncate"
            >
              <option value="ALL">सबै शिक्षक तथा कर्मचारी</option>
              {teachersData?.map((t: any) => (
                <option key={t.id} value={t.id.toString()}>
                  {t.fullName} {t.fullNameNepali ? `(${t.fullNameNepali})` : ''} - {t.post || t.taha || 'शिक्षक'}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="खोजी गर्नुहोस् (नाम, चेक नं, खाता...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-slate-50 pl-8 pr-3 py-2 text-xs focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. PESHKI TABLE ─── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[640px]">
          <table className="w-full text-left text-xs text-gray-700 divide-y divide-gray-200 relative border-collapse">
            <thead className="bg-[#1e3a5f] text-white text-[11px] font-extrabold uppercase tracking-tight sticky top-0 z-20 shadow-md">
              <tr>
                <th className="py-3.5 px-3 text-center w-12">क्र.सं.</th>
                <th className="py-3.5 px-3 min-w-[210px]">शिक्षक तथा प्राप्त गर्ने खाता</th>
                <th className="py-3.5 px-3 min-w-[120px] text-right bg-blue-900/80">पेस्की रकम</th>
                <th className="py-3.5 px-3 min-w-[125px] text-right bg-rose-950">बाँकी दायित्व</th>
                <th className="py-3.5 px-3 min-w-[100px] text-center">आ.व. / मिति</th>
                <th className="py-3.5 px-3 min-w-[160px]">भुक्तानी स्रोत (Paid From)</th>
                <th className="py-3.5 px-3 min-w-[170px]">कट्टी हुने तालिका</th>
                <th className="py-3.5 px-3 min-w-[140px]">पेस्की प्रयोजन</th>
                <th className="py-3.5 px-3 min-w-[95px] text-center">अवस्था</th>
                <th className="py-3.5 px-3 text-center min-w-[175px] bg-slate-900 sticky right-0 z-10">कार्यहरू</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-gray-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
                    <p className="mt-2 text-xs font-nepali">पेस्की अभिलेख लोड हुँदैछ...</p>
                  </td>
                </tr>
              ) : peshkis.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-gray-400">
                    कुनै पनि पेस्की अभिलेख फेला परेन।
                  </td>
                </tr>
              ) : (
                peshkis.map((peshki: any, idx: number) => {
                  const advance = peshki.amount || 0;
                  const remaining = peshki.remainingAmount || 0;
                  const settled = Math.max(0, advance - remaining);
                  const progressPct = advance > 0 ? Math.min(100, Math.round((settled / advance) * 100)) : 0;
                  const isCancelled = peshki.status === 'CANCELLED';

                  return (
                    <tr key={peshki.id} className={`hover:bg-blue-50/40 transition ${isCancelled ? 'bg-rose-50/20 opacity-75' : ''}`}>
                      {/* S.N. */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-gray-500">
                        {idx + 1}
                      </td>

                      {/* Teacher & Receiving Bank Details */}
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-gray-900 text-xs">
                          {peshki.teacher?.fullName}
                        </div>
                        <div className="text-[10.5px] text-gray-500 font-nepali">
                          {peshki.teacher?.fullNameNepali || peshki.teacher?.post || 'शिक्षक'}
                        </div>
                        {/* Receiving Account Display */}
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-blue-900 bg-blue-50/90 px-1.5 py-0.5 rounded-md border border-blue-200/60 max-w-fit">
                          <Landmark size={11} className="text-blue-700 shrink-0" />
                          <span className="truncate max-w-[190px]">
                            {peshki.bankName || (peshki.teacher?.bankAccountNo ? `${peshki.teacher.bankName || 'खाता'}: ${peshki.teacher.bankAccountNo}` : 'नगद / अन्य')}
                          </span>
                        </div>
                      </td>

                      {/* Advance Amount */}
                      <td className="py-3 px-3 text-right font-mono font-black text-blue-950 bg-blue-50/40">
                        रू {advance.toLocaleString()}
                      </td>

                      {/* Remaining Amount */}
                      <td className="py-3 px-3 text-right bg-rose-50/40">
                        <div className="font-mono font-black text-rose-900 text-xs">
                          रू {remaining.toLocaleString()}
                        </div>
                        {/* Progress Bar */}
                        {!isCancelled && (
                          <>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
                              <div
                                className="bg-emerald-600 h-1.5 rounded-full transition-all"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <div className="text-[9.5px] text-gray-500 text-right mt-0.5 font-mono">
                              {progressPct}% फर्छ्यौट
                            </div>
                          </>
                        )}
                      </td>

                      {/* FY / Given Date */}
                      <td className="py-3 px-3 text-center">
                        <div className="font-mono text-gray-800 text-xs font-bold">
                          {peshki.givenDateBs || '—'}
                        </div>
                        {peshki.financialYear?.year && (
                          <span className="inline-block text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-1.5 rounded mt-0.5">
                            आ.व. {peshki.financialYear.year}
                          </span>
                        )}
                      </td>

                      {/* Disbursed From (School Bank Account / Method) */}
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {peshki.paymentMethod === 'CHEQUE' ? `🏦 चेक (${peshki.chequeNo || 'N/A'})` : peshki.paymentMethod === 'CASH' ? '💵 नगद (Cash)' : '💳 बैंक ट्रान्सफर'}
                        </span>
                        {peshki.bankAccount?.bankName && (
                          <div className="text-[10px] text-gray-600 truncate max-w-[150px] mt-0.5 font-medium">
                            स्रोत: {peshki.bankAccount.bankName}
                          </div>
                        )}
                      </td>

                      {/* Deduction Schedule */}
                      <td className="py-3 px-3">
                        <div className="text-xs font-bold text-purple-950">
                          {peshki.deductFromMonth || '—'} देखि {peshki.deductToMonth || '—'}
                        </div>
                        {peshki.monthlyDeduction > 0 ? (
                          <div className="text-[10px] text-purple-700 font-semibold mt-0.5">
                            मासिक किस्ता: रू {peshki.monthlyDeduction.toLocaleString()}
                          </div>
                        ) : (
                          <div className="text-[9.5px] text-gray-400">
                            एकमुष्ट तलब कट्टी
                          </div>
                        )}
                      </td>

                      {/* Reason */}
                      <td className="py-3 px-3 text-gray-700 text-xs">
                        <div className="truncate max-w-[140px] font-semibold" title={peshki.reason}>
                          {peshki.reason || 'तलब पेस्की'}
                        </div>
                        {peshki.remarks && (
                          <div className="text-[10px] text-gray-400 truncate max-w-[140px]" title={peshki.remarks}>
                            {peshki.remarks}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        {peshki.status === 'ACTIVE' ? (
                          remaining === 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              पूर्ण फर्छ्यौट
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                              सक्रिय / बाँकी
                            </span>
                          )
                        ) : peshki.status === 'SETTLED' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            पूर्ण फर्छ्यौट
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-900 border border-rose-300">
                            रद्द (Cancelled)
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center sticky right-0 bg-white shadow-xs">
                        <div className="flex items-center justify-center gap-1">
                          {/* Print Receipt */}
                          <button
                            type="button"
                            onClick={() => triggerPrintReceipt(peshki)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition cursor-pointer"
                            title="पेस्की निकासा भौचर प्रिन्ट गर्नुहोस्"
                          >
                            <Printer size={13} />
                          </button>

                          {/* Settlement History */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPeshki(peshki);
                              setIsHistoryModalOpen(true);
                            }}
                            className="p-1.5 bg-blue-100 hover:bg-blue-200 text-[#1e3a5f] rounded-lg transition cursor-pointer"
                            title="कट्टी तथा फर्छ्यौट इतिहास हेर्नुहोस्"
                          >
                            <Layers size={13} />
                          </button>

                          {/* Direct Settlement Button (if active and balance remaining) */}
                          {peshki.status === 'ACTIVE' && remaining > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPeshki(peshki);
                                setSettleForm({
                                  amount: peshki.remainingAmount.toString(),
                                  settledDateBs: todayBS(),
                                  paymentMethod: 'CASH',
                                  depositBankAccountId: '',
                                  remarks: 'नगद दाखिला गरी सोझै पेस्की फर्छ्यौट',
                                });
                                setIsSettleModalOpen(true);
                              }}
                              className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10.5px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                              title="नगद वा बैंकबाट सिधै दाखिला गरी फर्छ्यौट गर्नुहोस्"
                            >
                              <CheckCircle2 size={12} />
                              <span>फर्छ्यौट</span>
                            </button>
                          )}

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => openEditModal(peshki)}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition cursor-pointer"
                            title="पेस्की विवरण सम्पादन गर्नुहोस्"
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Cancel Button (if active) */}
                          {peshki.status === 'ACTIVE' && remaining > 0 && (
                            <button
                              type="button"
                              onClick={() => openCancelModal(peshki)}
                              className="p-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition cursor-pointer"
                              title="पेस्की रद्द गर्नुहोस् (Cancel)"
                            >
                              <Ban size={13} />
                            </button>
                          )}

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`के तपाईं #${peshki.id} (${peshki.teacher?.fullName}) पेस्की अभिलेख पूर्ण रूपमा मेटाउन निश्चित हुनुहुन्छ?`)) {
                                deleteMutation.mutate(peshki.id);
                              }
                            }}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition cursor-pointer"
                            title="पेस्की अभिलेख मेटाउनुहोस्"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════════════ MODAL 1: ISSUE NEW ADVANCE ════════════════ */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-gray-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-[#1e3a5f] text-white rounded-2xl shadow-xs">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1e3a5f]">
                    नयाँ शिक्षक तथा कर्मचारी पेस्की निकासा (Issue Salary Advance)
                  </h3>
                  <p className="text-[11px] text-gray-500 font-nepali">
                    पेस्की निकासा गरी रकम पठाउने बैंक खाता र कट्टी हुने तालिका दर्ता गर्नुहोस्
                  </p>
                </div>
              </div>
              <button onClick={() => setIsIssueModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-4 text-xs">
              {/* Teacher Selector */}
              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  शिक्षक / कर्मचारी छनौट गर्नुहोस् <span className="text-rose-600">*</span>
                </label>
                <select
                  value={issueForm.teacherId}
                  onChange={(e) => handleTeacherChangeInIssue(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 p-2.5 font-bold bg-white text-gray-900 focus:outline-hidden"
                >
                  <option value="">-- शिक्षक वा कर्मचारी छनोट गर्नुहोस् --</option>
                  {teachersData?.map((t: any) => (
                    <option key={t.id} value={t.id.toString()}>
                      {t.fullName} {t.fullNameNepali ? `(${t.fullNameNepali})` : ''} - {t.post || t.taha || 'शिक्षक'} {t.bankAccountNo ? `[खाता: ${t.bankAccountNo}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* ─── TEACHER'S RECEIVING BANK ACCOUNT CARD ─── */}
              {selectedTeacherForIssue && (
                <div className="bg-linear-to-br from-blue-50/90 to-indigo-50/70 p-4 rounded-2xl border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-extrabold text-blue-950 text-xs flex items-center gap-1.5">
                      <Landmark size={16} className="text-blue-700" />
                      <span>रकम प्राप्त गर्ने शिक्षकको बैंक खाता (Teacher's Receiving Account)</span>
                    </label>
                    <span className="text-[10px] text-blue-900 font-extrabold bg-blue-100/90 px-2 py-0.5 rounded-md">
                      {selectedTeacherForIssue.fullName}
                    </span>
                  </div>

                  {/* If teacher has registered accounts, show radio selection */}
                  {getTeacherAccounts(selectedTeacherForIssue).length > 0 ? (
                    <div className="space-y-2">
                      {getTeacherAccounts(selectedTeacherForIssue).map((acc: any) => (
                        <label
                          key={acc.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                            issueForm.teacherAccountSelection === acc.id
                              ? 'bg-white border-blue-500 shadow-xs ring-1 ring-blue-400'
                              : 'bg-white/60 border-blue-200 hover:bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="teacherAccountRadio"
                            value={acc.id}
                            checked={issueForm.teacherAccountSelection === acc.id}
                            onChange={() => {
                              setIssueForm({
                                ...issueForm,
                                teacherAccountSelection: acc.id,
                                teacherBankName: acc.bankName,
                                teacherBankAccountNo: acc.accountNumber,
                                teacherBankBranch: acc.branch,
                              });
                            }}
                            className="mt-0.5 text-blue-600"
                          />
                          <div className="flex-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-gray-900">{acc.bankName}</span>
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">
                                {acc.accountType} {acc.isPrimary ? '★ Primary' : ''}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-gray-700 font-bold mt-0.5">
                              खाता नं (A/C): {acc.accountNumber || 'उपलब्ध छैन'}
                            </div>
                            {acc.branch && (
                              <div className="text-[10.5px] text-gray-500 font-nepali">
                                शाखा: {acc.branch}
                              </div>
                            )}
                          </div>
                        </label>
                      ))}

                      {/* Custom Account Option */}
                      <label
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition ${
                          issueForm.teacherAccountSelection === 'CUSTOM'
                            ? 'bg-white border-blue-500 shadow-xs ring-1 ring-blue-400'
                            : 'bg-white/60 border-blue-200 hover:bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="teacherAccountRadio"
                          value="CUSTOM"
                          checked={issueForm.teacherAccountSelection === 'CUSTOM'}
                          onChange={() => setIssueForm({ ...issueForm, teacherAccountSelection: 'CUSTOM' })}
                          className="text-blue-600"
                        />
                        <span className="font-bold text-gray-700 text-xs">अन्य खाता वा फरक विवरण प्रविष्ट गर्नुहोस् (Custom Bank Details)</span>
                      </label>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-medium">
                      ⚠️ यस शिक्षकको कुनै बैंक खाता दर्ता भएको छैन। तल बैंक विवरण प्रविष्ट गर्नुहोस्:
                    </div>
                  )}

                  {/* Editable Bank Details Inputs if Custom or no accounts */}
                  {(issueForm.teacherAccountSelection === 'CUSTOM' || getTeacherAccounts(selectedTeacherForIssue).length === 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-blue-200/80">
                      <div>
                        <label className="block font-bold text-gray-700 text-[10.5px] mb-0.5">बैंकको नाम</label>
                        <input
                          type="text"
                          placeholder="उदा: माछापुच्छ्रे बैंक लि."
                          value={issueForm.teacherBankName}
                          onChange={(e) => setIssueForm({ ...issueForm, teacherBankName: e.target.value })}
                          className="w-full rounded-lg border border-blue-300 p-1.5 bg-white font-medium text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 text-[10.5px] mb-0.5">खाता नम्बर</label>
                        <input
                          type="text"
                          placeholder="A/C No."
                          value={issueForm.teacherBankAccountNo}
                          onChange={(e) => setIssueForm({ ...issueForm, teacherBankAccountNo: e.target.value })}
                          className="w-full rounded-lg border border-blue-300 p-1.5 font-mono bg-white font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 text-[10.5px] mb-0.5">शाखा (Branch)</label>
                        <input
                          type="text"
                          placeholder="उदा: वृन्दावन"
                          value={issueForm.teacherBankBranch}
                          onChange={(e) => setIssueForm({ ...issueForm, teacherBankBranch: e.target.value })}
                          className="w-full rounded-lg border border-blue-300 p-1.5 bg-white text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Financial Year & Advance Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">
                    सम्बन्धित आर्थिक वर्ष (Fiscal Year)
                  </label>
                  <select
                    value={issueForm.financialYearId}
                    onChange={(e) => setIssueForm({ ...issueForm, financialYearId: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2.5 font-bold bg-white"
                  >
                    <option value="">-- स्वतः मिति अनुसार (Auto) --</option>
                    {financialYearsData?.map((fy: any) => (
                      <option key={fy.id} value={fy.id.toString()}>
                        आ.व. {fy.year} {fy.isActive ? '★ (Active)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1">
                    पेस्की दिएको मिति (BS) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD"
                    value={issueForm.givenDateBs}
                    onChange={(e) => setIssueForm({ ...issueForm, givenDateBs: e.target.value })}
                    required
                    className="w-full rounded-xl border border-gray-300 p-2.5 font-mono font-bold bg-white"
                  />
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  पेस्की रकम (रुपैयाँमा) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="उदा: 25000"
                  value={issueForm.amount}
                  onChange={(e) => setIssueForm({ ...issueForm, amount: e.target.value })}
                  required
                  className="w-full rounded-xl border border-gray-300 p-2.5 font-mono font-black text-sm bg-white text-blue-950"
                />
                {parseFloat(issueForm.amount) > 0 && (
                  <div className="text-[11px] text-emerald-800 font-bold mt-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    अक्षरेपी: {numberToNepaliWords(parseFloat(issueForm.amount))}
                  </div>
                )}
              </div>

              {/* Payment Method & School Bank Account (Paid From) */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-800 mb-1">भुक्तानी माध्यम (Payment Mode)</label>
                    <select
                      value={issueForm.paymentMethod}
                      onChange={(e) => setIssueForm({ ...issueForm, paymentMethod: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 p-2 font-bold bg-white"
                    >
                      <option value="CHEQUE">चेक (Cheque)</option>
                      <option value="BANK_TRANSFER">बैंक ट्रान्सफर (Bank Transfer)</option>
                      <option value="CASH">नगद (Cash)</option>
                    </select>
                  </div>

                  {issueForm.paymentMethod !== 'CASH' && (
                    <div>
                      <label className="block font-bold text-gray-800 mb-1">विद्यालयको भुक्तानी दिने खाता (Paid From)</label>
                      <select
                        value={issueForm.bankAccountId}
                        onChange={(e) => setIssueForm({ ...issueForm, bankAccountId: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 p-2 bg-white font-medium"
                      >
                        <option value="">-- विद्यालयको बैंक खाता छनोट --</option>
                        {bankAccountsData?.map((ba: any) => (
                          <option key={ba.id} value={ba.id.toString()}>
                            {ba.bankName} - {ba.accountNo || ba.accountNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {issueForm.paymentMethod === 'CHEQUE' && (
                  <div>
                    <label className="block font-bold text-gray-800 mb-1">चेक नम्बर (Cheque No.)</label>
                    <input
                      type="text"
                      placeholder="Cheque No (उदा: CHQ-98124)"
                      value={issueForm.chequeNo}
                      onChange={(e) => setIssueForm({ ...issueForm, chequeNo: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 p-2 font-mono bg-white font-bold"
                    />
                  </div>
                )}
              </div>

              {/* ─── DEDUCTION SCHEDULE & FISCAL YEAR SELECTION ─── */}
              <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 space-y-3">
                <div className="font-extrabold text-purple-950 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={15} className="text-purple-700" />
                    <span>कट्टी हुने वर्ष तथा महिना तालिका (Deduction Schedule)</span>
                  </div>
                  <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded">
                    तलब निकासाबाट स्वतः कट्टी
                  </span>
                </div>

                {/* From Year & Month */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-purple-900 mb-1">
                      कट्टी सुरु हुने वर्ष तथा महिना:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="2081"
                        value={issueForm.deductFromYear}
                        onChange={(e) => setIssueForm({ ...issueForm, deductFromYear: e.target.value })}
                        className="w-24 rounded-xl border border-purple-300 p-2 font-mono font-bold bg-white text-center"
                      />
                      <select
                        value={issueForm.deductFromMonth}
                        onChange={(e) => setIssueForm({ ...issueForm, deductFromMonth: e.target.value })}
                        className="flex-1 rounded-xl border border-purple-300 p-2 bg-white font-bold cursor-pointer"
                      >
                        {NEPALI_MONTHS.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-purple-900 mb-1">
                      कट्टी अन्त्य हुने वर्ष तथा महिना:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="2081"
                        value={issueForm.deductToYear}
                        onChange={(e) => setIssueForm({ ...issueForm, deductToYear: e.target.value })}
                        className="w-24 rounded-xl border border-purple-300 p-2 font-mono font-bold bg-white text-center"
                      />
                      <select
                        value={issueForm.deductToMonth}
                        onChange={(e) => setIssueForm({ ...issueForm, deductToMonth: e.target.value })}
                        className="flex-1 rounded-xl border border-purple-300 p-2 bg-white font-bold cursor-pointer"
                      >
                        {NEPALI_MONTHS.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Deduction Mode: Full vs Installment */}
                <div className="pt-1 flex items-center gap-4">
                  <label className="flex items-center gap-1.5 font-bold text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="deductionMode"
                      value="FULL"
                      checked={issueForm.deductionMode === 'FULL'}
                      onChange={() => setIssueForm({ ...issueForm, deductionMode: 'FULL', monthlyDeduction: '' })}
                      className="text-purple-600"
                    />
                    <span>एकमुष्ट तलबबाट कट्टी (Full in single payroll)</span>
                  </label>
                  <label className="flex items-center gap-1.5 font-bold text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="deductionMode"
                      value="INSTALLMENT"
                      checked={issueForm.deductionMode === 'INSTALLMENT'}
                      onChange={() => setIssueForm({ ...issueForm, deductionMode: 'INSTALLMENT' })}
                      className="text-purple-600"
                    />
                    <span>मासिक किस्ता कट्टी (Installments)</span>
                  </label>
                </div>

                {issueForm.deductionMode === 'INSTALLMENT' && (
                  <div>
                    <label className="block font-bold text-purple-900 mb-1">मासिक किस्ता दर (रू प्रति महिना):</label>
                    <input
                      type="number"
                      placeholder="उदा: 5000"
                      value={issueForm.monthlyDeduction}
                      onChange={(e) => setIssueForm({ ...issueForm, monthlyDeduction: e.target.value })}
                      className="w-full rounded-xl border border-purple-300 p-2 font-mono font-bold bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Reason & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">पेस्की प्रयोजन (Reason)</label>
                  <input
                    type="text"
                    placeholder="उदा: चाडपर्व, घरायसी, औषधोपचार..."
                    value={issueForm.reason}
                    onChange={(e) => setIssueForm({ ...issueForm, reason: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-800 mb-1">कैफियत (Remarks)</label>
                  <input
                    type="text"
                    placeholder="थप विवरण..."
                    value={issueForm.remarks}
                    onChange={(e) => setIssueForm({ ...issueForm, remarks: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2"
                  />
                </div>
              </div>

              {/* Voucher Outflow Checkbox */}
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <label className="flex items-center gap-2 font-bold text-emerald-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={issueForm.createExpenseVoucher}
                    onChange={(e) => setIssueForm({ ...issueForm, createExpenseVoucher: e.target.checked })}
                    className="rounded text-emerald-600 w-4 h-4 cursor-pointer"
                  />
                  <span>पेस्की भुक्तानीको खर्च भौचर (Cash/Bank Outflow) स्वतः सिर्जना गर्नुहोस्</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  रद्द गर्नुहोस् (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={issueMutation.isPending}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1e3a5f] hover:bg-[#2a5280] rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 size={14} />
                  <span>{issueMutation.isPending ? 'दर्ता गरिँदैछ...' : 'पेस्की निकासा सुरक्षित गर्नुहोस्'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════ MODAL 2: EDIT ADVANCE ════════════════ */}
      {editingPeshki && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-gray-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-600 text-white rounded-2xl shadow-xs">
                  <Edit2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">
                    पेस्की विवरण सम्पादन गर्नुहोस् (Edit Peshki #{editingPeshki.id})
                  </h3>
                  <p className="text-[11px] text-gray-500 font-nepali">
                    {editingPeshki.teacher?.fullNameNepali || editingPeshki.teacher?.fullName}
                  </p>
                </div>
              </div>
              <button onClick={() => setEditingPeshki(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              {/* Teacher Selector */}
              <div>
                <label className="block font-bold text-gray-800 mb-1">शिक्षक / कर्मचारी</label>
                <select
                  value={editForm.teacherId}
                  onChange={(e) => handleTeacherChangeInEdit(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 font-bold bg-white text-gray-900"
                >
                  {teachersData?.map((t: any) => (
                    <option key={t.id} value={t.id.toString()}>
                      {t.fullName} {t.fullNameNepali ? `(${t.fullNameNepali})` : ''} - {t.post || 'शिक्षक'}
                    </option>
                  ))}
                </select>
              </div>

              {/* ─── TEACHER RECEIVING BANK DETAILS (EDIT) ─── */}
              {selectedTeacherForEdit && (
                <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 space-y-2.5">
                  <label className="font-extrabold text-blue-950 text-xs flex items-center gap-1.5">
                    <Landmark size={15} className="text-blue-700" />
                    <span>रकम प्राप्त गर्ने शिक्षकको बैंक खाता</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-gray-600 block mb-0.5">बैंकको नाम</span>
                      <input
                        type="text"
                        value={editForm.teacherBankName}
                        onChange={(e) => setEditForm({ ...editForm, teacherBankName: e.target.value })}
                        className="w-full rounded-lg border border-blue-300 p-1.5 bg-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-600 block mb-0.5">खाता नम्बर (A/C)</span>
                      <input
                        type="text"
                        value={editForm.teacherBankAccountNo}
                        onChange={(e) => setEditForm({ ...editForm, teacherBankAccountNo: e.target.value })}
                        className="w-full rounded-lg border border-blue-300 p-1.5 font-mono font-bold bg-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-600 block mb-0.5">शाखा (Branch)</span>
                      <input
                        type="text"
                        value={editForm.teacherBankBranch}
                        onChange={(e) => setEditForm({ ...editForm, teacherBankBranch: e.target.value })}
                        className="w-full rounded-lg border border-blue-300 p-1.5 bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Amount & Remaining Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">कुल पेस्की रकम (रू) *</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    required
                    className="w-full rounded-xl border border-gray-300 p-2.5 font-mono font-bold text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-800 mb-1">बाँकी दायित्व रकम (रू)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.remainingAmount}
                    onChange={(e) => setEditForm({ ...editForm, remainingAmount: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2.5 font-mono font-bold text-sm bg-white text-rose-900"
                  />
                </div>
              </div>

              {/* Given Date & FY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">पेस्की दिएको मिति (BS)</label>
                  <input
                    type="text"
                    value={editForm.givenDateBs}
                    onChange={(e) => setEditForm({ ...editForm, givenDateBs: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2.5 font-mono bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-800 mb-1">आर्थिक वर्ष (Fiscal Year)</label>
                  <select
                    value={editForm.financialYearId}
                    onChange={(e) => setEditForm({ ...editForm, financialYearId: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2.5 font-bold bg-white"
                  >
                    <option value="">-- आ.व. छनोट --</option>
                    {financialYearsData?.map((fy: any) => (
                      <option key={fy.id} value={fy.id.toString()}>
                        आ.व. {fy.year} {fy.isActive ? '★ (Active)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Mode & School Disbursing Bank */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">भुक्तानी माध्यम</label>
                  <select
                    value={editForm.paymentMethod}
                    onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2 font-bold bg-white"
                  >
                    <option value="CHEQUE">चेक (Cheque)</option>
                    <option value="BANK_TRANSFER">बैंक ट्रान्सफर (Bank Transfer)</option>
                    <option value="CASH">नगद (Cash)</option>
                  </select>
                </div>

                {editForm.paymentMethod !== 'CASH' && (
                  <div>
                    <label className="block font-bold text-gray-800 mb-1">विद्यालयको भुक्तानी दिने खाता</label>
                    <select
                      value={editForm.bankAccountId}
                      onChange={(e) => setEditForm({ ...editForm, bankAccountId: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 p-2 bg-white"
                    >
                      <option value="">-- विद्यालय खाता --</option>
                      {bankAccountsData?.map((ba: any) => (
                        <option key={ba.id} value={ba.id.toString()}>
                          {ba.bankName} - {ba.accountNo || ba.accountNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Deduction Schedule */}
              <div className="bg-purple-50/70 p-3.5 rounded-2xl border border-purple-200 space-y-2.5">
                <label className="block font-extrabold text-purple-950 text-xs">
                  कट्टी तालिका (Deduction Period):
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10.5px] font-bold text-gray-600 block mb-0.5">सुरु हुने (From):</span>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={editForm.deductFromYear}
                        onChange={(e) => setEditForm({ ...editForm, deductFromYear: e.target.value })}
                        className="w-20 rounded-lg border border-purple-300 p-1.5 font-mono font-bold bg-white text-center"
                      />
                      <select
                        value={editForm.deductFromMonth}
                        onChange={(e) => setEditForm({ ...editForm, deductFromMonth: e.target.value })}
                        className="flex-1 rounded-lg border border-purple-300 p-1.5 bg-white font-bold cursor-pointer"
                      >
                        {NEPALI_MONTHS.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10.5px] font-bold text-gray-600 block mb-0.5">अन्त्य हुने (To):</span>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={editForm.deductToYear}
                        onChange={(e) => setEditForm({ ...editForm, deductToYear: e.target.value })}
                        className="w-20 rounded-lg border border-purple-300 p-1.5 font-mono font-bold bg-white text-center"
                      />
                      <select
                        value={editForm.deductToMonth}
                        onChange={(e) => setEditForm({ ...editForm, deductToMonth: e.target.value })}
                        className="flex-1 rounded-lg border border-purple-300 p-1.5 bg-white font-bold cursor-pointer"
                      >
                        {NEPALI_MONTHS.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[10.5px] font-bold text-gray-700 block mb-0.5">मासिक किस्ता दर (यदि किस्ताबन्दी भए):</span>
                  <input
                    type="number"
                    placeholder="उदा: 5000"
                    value={editForm.monthlyDeduction}
                    onChange={(e) => setEditForm({ ...editForm, monthlyDeduction: e.target.value })}
                    className="w-full rounded-lg border border-purple-300 p-1.5 font-mono font-bold bg-white"
                  />
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block font-bold text-gray-800 mb-1">पेस्की अवस्था (Status)</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 p-2 font-bold bg-white"
                >
                  <option value="ACTIVE">सक्रिय / बाँकी (ACTIVE)</option>
                  <option value="SETTLED">पूर्ण फर्छ्यौट भइसकेको (SETTLED)</option>
                  <option value="CANCELLED">रद्द (CANCELLED)</option>
                </select>
              </div>

              {/* Reason & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">पेस्की प्रयोजन</label>
                  <input
                    type="text"
                    value={editForm.reason}
                    onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-800 mb-1">कैफियत</label>
                  <input
                    type="text"
                    value={editForm.remarks}
                    onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingPeshki(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  रद्द गर्नुहोस्
                </button>
                <button
                  type="submit"
                  disabled={editMutation.isPending}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 size={14} />
                  <span>{editMutation.isPending ? 'सुरक्षित हुँदैछ...' : 'परिवर्तन सुरक्षित गर्नुहोस्'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════ MODAL 3: DIRECT CASH / BANK SETTLEMENT ════════════════ */}
      {isSettleModalOpen && selectedPeshki && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-700 text-white rounded-2xl shadow-xs">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">
                    पेस्की सिधै दाखिला / फर्छ्यौट (Direct Settle)
                  </h3>
                  <p className="text-[10.5px] text-gray-500 font-nepali">
                    #{selectedPeshki.id} - {selectedPeshki.teacher?.fullNameNepali || selectedPeshki.teacher?.fullName}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsSettleModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-xs space-y-1.5">
              <div className="flex justify-between font-bold">
                <span className="text-emerald-900">कुल स्वीकृत पेस्की:</span>
                <span className="font-mono text-sm">रू {selectedPeshki.amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-rose-900">हाल बाँकी दायित्व:</span>
                <span className="font-mono text-sm text-rose-800 font-black">रू {selectedPeshki.remainingAmount?.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  दाखिला / फर्छ्यौट गर्ने रकम (रु.) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  max={selectedPeshki.remainingAmount}
                  value={settleForm.amount}
                  onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 p-2.5 font-mono font-bold text-sm bg-white"
                />
                <div className="flex justify-between mt-1 text-[10.5px]">
                  <button
                    type="button"
                    onClick={() => setSettleForm({ ...settleForm, amount: selectedPeshki.remainingAmount.toString() })}
                    className="text-emerald-700 font-bold hover:underline cursor-pointer"
                  >
                    ⚡ पूर्ण फर्छ्यौट (रू {selectedPeshki.remainingAmount?.toLocaleString()})
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">फर्छ्यौट मिति (BS)</label>
                <input
                  type="text"
                  value={settleForm.settledDateBs}
                  onChange={(e) => setSettleForm({ ...settleForm, settledDateBs: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 p-2.5 font-mono bg-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">दाखिला माध्यम (Settlement Medium)</label>
                <select
                  value={settleForm.paymentMethod}
                  onChange={(e) => setSettleForm({ ...settleForm, paymentMethod: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 p-2.5 font-bold bg-white"
                >
                  <option value="CASH">नगद फिर्ता दाखिला (Cash Return)</option>
                  <option value="BANK_DEPOSIT">विद्यालयको बैंक खातामा दाखिला / ट्रान्सफर (Bank Deposit)</option>
                </select>
              </div>

              {settleForm.paymentMethod === 'BANK_DEPOSIT' && (
                <div>
                  <label className="block font-bold text-gray-800 mb-1">दाखिला भएको विद्यालयको बैंक खाता</label>
                  <select
                    value={settleForm.depositBankAccountId}
                    onChange={(e) => setSettleForm({ ...settleForm, depositBankAccountId: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2 bg-white"
                  >
                    <option value="">-- बैंक खाता छनोट --</option>
                    {bankAccountsData?.map((ba: any) => (
                      <option key={ba.id} value={ba.id.toString()}>
                        {ba.bankName} - {ba.accountNo || ba.accountNumber}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-800 mb-1">कैफियत / भौचर विवरण</label>
                <input
                  type="text"
                  value={settleForm.remarks}
                  onChange={(e) => setSettleForm({ ...settleForm, remarks: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 p-2.5 bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsSettleModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                type="button"
                disabled={settleMutation.isPending}
                onClick={() => {
                  const amt = parseFloat(settleForm.amount);
                  if (isNaN(amt) || amt <= 0) {
                    toast.error('मान्य रकम हाल्नुहोस्');
                    return;
                  }
                  settleMutation.mutate({
                    id: selectedPeshki.id,
                    payload: {
                      amount: amt,
                      settledDateBs: settleForm.settledDateBs,
                      paymentMethod: settleForm.paymentMethod,
                      remarks: settleForm.remarks,
                    },
                  });
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <CheckCircle2 size={14} />
                <span>{settleMutation.isPending ? 'सुरक्षित गर्दै...' : 'फर्छ्यौट प्रमाणित गर्नुहोस्'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ MODAL 4: CANCEL ADVANCE ════════════════ */}
      {isCancelModalOpen && selectedPeshki && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-rose-600 text-white rounded-2xl shadow-xs">
                  <Ban size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">
                    पेस्की निकासा रद्द गर्नुहोस् (Cancel Advance)
                  </h3>
                  <p className="text-[10.5px] text-gray-500 font-nepali">
                    #{selectedPeshki.id} - {selectedPeshki.teacher?.fullNameNepali || selectedPeshki.teacher?.fullName}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsCancelModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200 text-xs space-y-1.5">
              <div className="flex justify-between font-bold">
                <span className="text-rose-900">रद्द गरिने पेस्की रकम:</span>
                <span className="font-mono text-sm text-rose-950 font-black">रू {selectedPeshki.amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-gray-700">हाल बाँकी दायित्व:</span>
                <span className="font-mono text-xs text-gray-800">रू {selectedPeshki.remainingAmount?.toLocaleString()}</span>
              </div>
              <p className="text-[11px] text-rose-800 pt-1">
                ⚠️ यो पेस्की रद्द गर्दा यसको बाँकी दायित्व शून्य हुनेछ र शिक्षकको दायित्वबाट हट्नेछ।
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-bold text-gray-800">रद्द गर्नुको कारण (Cancellation Reason):</label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="रद्द गर्नुको कारण खुलाउनुहोस्..."
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs focus:outline-hidden"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['प्रशासनिक निर्णय अनुसार रद्द', 'रकम निकासा नगरिएको', 'दोहोरो प्रविष्टि (Duplicate)', 'शिक्षकले पेस्की फिर्ता गरेको'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCancelReason(preset)}
                    className="text-[10.5px] bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-1 rounded-md cursor-pointer transition font-medium"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                फिर्ता (Back)
              </button>
              <button
                type="button"
                disabled={cancelMutation.isPending}
                onClick={() => {
                  cancelMutation.mutate({
                    id: selectedPeshki.id,
                    reason: cancelReason,
                  });
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Ban size={14} />
                <span>{cancelMutation.isPending ? 'रद्द गरिँदैछ...' : 'पेस्की रद्द निश्चित गर्नुहोस्'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ MODAL 5: SETTLEMENT HISTORY ════════════════ */}
      {isHistoryModalOpen && selectedPeshki && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-gray-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-purple-700 text-white rounded-2xl shadow-xs">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#1e3a5f]">
                    पेस्की कट्टी तथा फर्छ्यौट इतिहास (Settlements History)
                  </h3>
                  <p className="text-[10.5px] text-gray-500 font-nepali">
                    #{selectedPeshki.id} - {selectedPeshki.teacher?.fullNameNepali || selectedPeshki.teacher?.fullName}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">कुल स्वीकृत पेस्की:</span>
                <span className="font-mono font-bold">रू {selectedPeshki.amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-800 font-medium">हालसम्म कट्टी / फर्छ्यौट:</span>
                <span className="font-mono font-bold text-emerald-700">
                  रू {((selectedPeshki.amount || 0) - (selectedPeshki.remainingAmount || 0)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-800 font-medium">बाँकी दायित्व:</span>
                <span className="font-mono font-black text-rose-800">
                  रू {selectedPeshki.remainingAmount?.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                कट्टी सूची (Deduction Logs):
              </h4>
              {selectedPeshki.settlements && selectedPeshki.settlements.length > 0 ? (
                selectedPeshki.settlements.map((st: any, sIdx: number) => (
                  <div key={st.id || sIdx} className="p-3 bg-white border border-gray-200 rounded-xl text-xs space-y-1 shadow-2xs">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-emerald-800 font-mono text-sm">
                        - रू {(st.amount || 0).toLocaleString()}
                      </span>
                      <span className="text-[10.5px] font-mono text-gray-500 bg-slate-50 px-2 py-0.5 rounded border">
                        {st.settledDateBs || '—'}
                      </span>
                    </div>
                    <div className="text-gray-700 text-[11px]">
                      <strong>स्रोत / माध्यम:</strong> {st.payroll ? `तलब भरपाई #${st.payroll.id} (${st.payroll.monthFrom} देखि ${st.payroll.monthTo})` : (st.remarks || 'सिधै दाखिला फर्छ्यौट')}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-2xl">
                  यस पेस्कीबाट अहिलेसम्म कुनै पनि कट्टी वा फर्छ्यौट भएको छैन।
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                बन्द गर्नुहोस् (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
