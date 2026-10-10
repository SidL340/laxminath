'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS, getFiscalYearFromBS } from '@/lib/nepali-date';
import {
  Wallet,
  Plus,
  Printer,
  X,
  FileText,
  Calculator,
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
  Sliders,
  Check,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  BookOpen,
  Send,
  Users,
  Settings,
  ShieldCheck,
  Briefcase,
  GraduationCap,
  UserPlus,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PeshkiManagementTab from '@/components/payroll/PeshkiManagementTab';
import BankTransferLetterTab from '@/components/payroll/BankTransferLetterTab';
import { numberToNepaliWords, toNepaliDigits } from '@/lib/nepali-number-words';
import { useLanguage } from '@/lib/language-context';
import { getStaffTypeInfo } from '@/lib/staff-types';

// Standard BS Months list
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

export const getNepaliMonthName = (m?: string | number): string => {
  if (!m) return '';
  const cleanStr = String(m).trim();
  // If it's formatted like '2083-04'
  if (cleanStr.includes('-')) {
    const parts = cleanStr.split('-');
    const mNum = parseInt(parts[1], 10);
    const found = NEPALI_MONTHS.find((nm) => parseInt(nm.id, 10) === mNum);
    return found ? `${parts[0]} ${found.nepali}` : cleanStr;
  }
  const num = typeof m === 'number' ? m : parseInt(cleanStr.replace(/\D/g, ''), 10);
  const found = NEPALI_MONTHS.find((nm) => parseInt(nm.id, 10) === num);
  return found ? found.nepali : cleanStr;
};

export const formatPayrollPeriod = (fromStr?: string, toStr?: string): { text: string; monthCount: number } => {
  if (!fromStr && !toStr) return { text: '—', monthCount: 1 };
  if (fromStr && !toStr) {
    return { text: getNepaliMonthName(fromStr), monthCount: 1 };
  }
  if (fromStr && toStr) {
    const pFrom = String(fromStr).split('-');
    const pTo = String(toStr).split('-');
    const yrFrom = pFrom[0] || '';
    const yrTo = pTo[0] || '';
    const mFromNum = parseInt(pFrom[1] || '1', 10);
    const mToNum = parseInt(pTo[1] || '1', 10);
    const mFromName = getNepaliMonthName(pFrom[1] || fromStr);
    const mToName = getNepaliMonthName(pTo[1] || toStr);
    const count = mToNum >= mFromNum ? (mToNum - mFromNum + 1) : 1;

    if (yrFrom === yrTo) {
      if (pFrom[1] === pTo[1]) {
        return { text: `${yrFrom} ${mFromName} (१ महिना)`, monthCount: 1 };
      }
      return { text: `${yrFrom} ${mFromName} देखि ${mToName} सम्म (${count} महिना)`, monthCount: count };
    }
    return { text: `${yrFrom} ${mFromName} देखि ${yrTo} ${mToName} सम्म (${count} महिना)`, monthCount: count };
  }
  return { text: `${fromStr} देखि ${toStr}`, monthCount: 1 };
};

export default function PayrollPage() {
  const { lang, l } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'bulk' | 'history' | 'peshki' | 'bank-letter' | 'scales'>('bulk');

  // Period / Year & Month Range State for Bulk Creation
  const currentBS = todayBS();
  const currentYear = currentBS.slice(0, 4) || '2083';
  const [selectedFYId, setSelectedFYId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [fromMonth, setFromMonth] = useState<string>('04'); // साउन
  const [toMonth, setToMonth] = useState<string>('06'); // असोज
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'TEACHING' | 'NON_TEACHING'>('ALL');
  const [filterType, setFilterType] = useState<string>(''); // RASTRIYA, NIJI_SROTH

  // Extended Payroll History Filters
  const [selectedHistoryBatchKey, setSelectedHistoryBatchKey] = useState<string | null>(null);
  const [historyFYFilter, setHistoryFYFilter] = useState<string>('ALL');
  const [historyYearFilter, setHistoryYearFilter] = useState<string>('ALL');
  const [historyMonthFromFilter, setHistoryMonthFromFilter] = useState<string>('ALL');
  const [historyMonthToFilter, setHistoryMonthToFilter] = useState<string>('ALL');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<string>('ALL');
  const [historySearchStaff, setHistorySearchStaff] = useState<string>('');

  // Global Multipliers & Allowances Toggles
  const [globalFestivalAllowed, setGlobalFestivalAllowed] = useState<boolean>(false);
  const [globalDressAllowance, setGlobalDressAllowance] = useState<number>(0);
  const [globalDearnessAmount, setGlobalDearnessAmount] = useState<number>(2000);
  const [globalInsuranceGovContribution, setGlobalInsuranceGovContribution] = useState<number>(400);

  // Bulk Grid Items State: mapped by teacherId
  const [bulkRows, setBulkRows] = useState<Record<number, any>>({});
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>([]);
  const [includedTeacherIds, setIncludedTeacherIds] = useState<number[]>([]);
  const [displayMode, setDisplayMode] = useState<'custom' | 'all'>('custom');
  const [searchStaff, setSearchStaff] = useState<string>('');
  const [staffSortOrder, setStaffSortOrder] = useState<'selectionOrder' | 'displayOrder' | 'hierarchy' | 'id' | 'name'>('selectionOrder');
  const [staffStatusFilter, setStaffStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Searchable Staff Selector Dropdown Popover State
  const [isStaffSelectorOpen, setIsStaffSelectorOpen] = useState(false);
  const [staffSelectorQuery, setStaffSelectorQuery] = useState('');
  const staffSelectorRef = useRef<HTMLDivElement>(null);

  // Close staff selector popup on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (staffSelectorRef.current && !staffSelectorRef.current.contains(e.target as Node)) {
        setIsStaffSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Official Nepal School Staff Hierarchy Rank Helper (मर्यादाक्रम)
  const getStaffRank = (t: any): number => {
    if (!t) return 99;
    const isPrincipal = Boolean(
      (
        t.inchargeRole === 'PRINCIPAL' ||
        t.post === 'प्रधानाध्यापक (Headmaster / Principal)' ||
        t.post === 'प्रधानाध्यापक' ||
        t.post?.toLowerCase() === 'principal' ||
        t.post?.toLowerCase() === 'headmaster'
      ) &&
      !t.post?.includes('सहायक') &&
      !t.post?.includes('Assistant') &&
      !t.inchargeRole?.includes('VICE')
    );
    if (isPrincipal) return 10;

    if (
      t.post?.includes('सहायक प्रधानाध्यापक') ||
      t.post?.toLowerCase().includes('assistant headmaster') ||
      t.post?.toLowerCase().includes('vice principal')
    ) {
      return 20;
    }

    const taha = (t.taha || '').toLowerCase();
    const post = (t.post || '').toLowerCase();
    const shreni = (t.shreni || '').toLowerCase();

    const isSecondary =
      taha.includes('माध्यमिक') ||
      taha.includes('मा.वि.') ||
      taha.includes('secondary') ||
      post.includes('मा.वि.') ||
      post.includes('माध्यमिक') ||
      post.includes('secondary');
    if (isSecondary) {
      if (shreni.includes('प्रथम') || shreni.includes('1st') || shreni.includes('first')) return 31;
      if (shreni.includes('द्वितीय') || shreni.includes('2nd') || shreni.includes('second')) return 32;
      return 33;
    }

    const isLowerSecondary =
      taha.includes('निम्न') ||
      taha.includes('नि.मा.वि.') ||
      taha.includes('lower secondary') ||
      post.includes('नि.मा.वि.') ||
      post.includes('निम्न माध्यमिक') ||
      post.includes('lower secondary');
    if (isLowerSecondary) {
      if (shreni.includes('प्रथम') || shreni.includes('1st') || shreni.includes('first')) return 41;
      if (shreni.includes('द्वितीय') || shreni.includes('2nd') || shreni.includes('second')) return 42;
      return 43;
    }

    const isPrimary =
      taha.includes('प्राथमिक') ||
      taha.includes('प्रा.वि.') ||
      taha.includes('primary') ||
      post.includes('प्रा.वि.') ||
      post.includes('प्राथमिक') ||
      post.includes('primary');
    if (isPrimary) {
      if (shreni.includes('प्रथम') || shreni.includes('1st') || shreni.includes('first')) return 51;
      if (shreni.includes('द्वितीय') || shreni.includes('2nd') || shreni.includes('second')) return 52;
      return 53;
    }

    const isEcd =
      taha.includes('बालविकास') ||
      taha.includes('ecd') ||
      taha.includes('पूर्व प्राथमिक') ||
      post.includes('बालविकास') ||
      post.includes('ecd') ||
      post.includes('nursery');
    if (isEcd) return 60;

    if (t.isTeachingStaff !== false && t.shreni !== 'NON_TEACHING') {
      return 70;
    }

    if (post.includes('लेखा') || post.includes('accountant')) return 81;
    if (post.includes('सहायक') || post.includes('assistant') || post.includes('प्रशासन') || post.includes('operator')) return 82;
    if (post.includes('सहयोगी') || post.includes('परिचर') || post.includes('helper') || post.includes('peon')) return 85;
    if (post.includes('पाले') || post.includes('guard') || post.includes('चालक') || post.includes('सफाइ')) return 86;

    return 90;
  };

  // Modals & Single Slips
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [disburseForm, setDisburseForm] = useState({
    bankAccountId: '',
    paymentDateBs: todayBS(),
    chequeNo: '',
    chequePayeeName: 'Teacher & Staff Salary Disbursement',
    voucherNo: '',
    paymentMedium: 'CHEQUE',
    remarks: '',
  });

  // Scale Modal
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [editingScale, setEditingScale] = useState<any>(null);
  const [scaleForm, setScaleForm] = useState({
    taha: 'माध्यमिक तह',
    shreni: 'तृतीय श्रेणी',
    moolTalab: 43689,
    gradeAmount: 1456,
  });

  // Single Edit Modal (Bulk tab)
  const [isSingleEditModalOpen, setIsSingleEditModalOpen] = useState(false);
  const [singleEditData, setSingleEditData] = useState<any>(null);

  // Edit DRAFT Payroll State (History tab)
  const [editingPayroll, setEditingPayroll] = useState<any | null>(null);
  const [isEditPayrollModalOpen, setIsEditPayrollModalOpen] = useState(false);
  const [editPayrollForm, setEditPayrollForm] = useState<any>({
    id: 0,
    teacherId: 0,
    teacherName: '',
    teacherPost: '',
    taha: '',
    shreni: '',
    monthFrom: '',
    monthTo: '',
    monthCount: 3,
    moolTalab: 0,
    gradeNo: 0,
    gradeAmount: 0,
    hasKsKoshThap: true,
    hasKsKoshKatti: true,
    bimaThap: 400,
    bimaKati: 0,
    mahangiGhata: 2000,
    hasMahangiGhata: true,
    praABhata: 0,
    hasPraABhata: false,
    sahayakPraABhata: 0,
    prabiInchargeBhata: 0,
    mabiInchargeBhata: 0,
    durgamBhata: 0,
    hasDurgamBhata: false,
    protsahanBhata: 0,
    hasProtsahanBhata: false,
    otherBhata: 0,
    hasOtherBhata: false,
    otherBhataLabel: 'विविध भत्ता',
    karmachariKoshSapati: 0,
    includeChaadparba: false,
    chaadparbaKharcha: 0,
    poshakBhata: 0,
    peshkiDeduction: 0,
    status: 'DRAFT',
    note: '',
  });

  // Add Missing Staff to Saved Payroll Batch State (History tab)
  const [isAddMissingStaffModalOpen, setIsAddMissingStaffModalOpen] = useState(false);
  const [addMissingStaffForm, setAddMissingStaffForm] = useState<any>({
    teacherId: '',
    teacherName: '',
    teacherPost: '',
    monthFrom: '',
    monthTo: '',
    monthCount: 3,
    financialYearId: null,
    taha: 'माध्यमिक तह',
    shreni: 'तृतीय श्रेणी',
    moolTalab: 43689,
    gradeNo: 0,
    gradeAmount: 1456,
    hasKsKoshThap: true,
    hasKsKoshKatti: true,
    bimaThap: 400,
    bimaKati: 0,
    mahangiGhata: 2000,
    hasMahangiGhata: true,
    praABhata: 0,
    hasPraABhata: false,
    sahayakPraABhata: 0,
    prabiInchargeBhata: 0,
    mabiInchargeBhata: 0,
    durgamBhata: 0,
    hasDurgamBhata: false,
    protsahanBhata: 0,
    hasProtsahanBhata: false,
    otherBhata: 0,
    hasOtherBhata: false,
    otherBhataLabel: 'विविध भत्ता',
    karmachariKoshSapati: 0,
    includeChaadparba: false,
    chaadparbaKharcha: 0,
    poshakBhata: 0,
    peshkiDeduction: 0,
    activePeshkiRemaining: 0,
    status: 'DRAFT',
    note: '',
  });

  const [historySortOrder, setHistorySortOrder] = useState<'hierarchy' | 'displayOrder' | 'name' | 'salaryDesc' | 'id'>('hierarchy');

  // Past / Historical Staff State
  const [isAddPastStaffOpen, setIsAddPastStaffOpen] = useState(false);
  const [pastStaffForm, setPastStaffForm] = useState({
    fullName: '',
    fullNameNepali: '',
    gender: 'MALE',
    phone: '',
    panNo: '',
    shreni: 'TEACHING',
    taha: 'माध्यमिक तह',
    post: 'मा.वि. शिक्षक',
    type: 'RASTRIYA',
    dateOfJoiningBs: '',
    dateOfRetirementBs: '',
    statusReason: 'सरुवा (Transferred)',
  });

  // ── 1. Fetch Teachers (Faculty & Staff - including historical/past staff) ───
  const { data: teachersData, isLoading: isTeachersLoading } = useQuery({
    queryKey: ['teachers-all-payroll'],
    queryFn: async () => {
      const res = await api.get('/teachers?includeInactive=true');
      return res.data?.data || [];
    },
  });

  // Add Past Staff Mutation
  const addPastStaffMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/teachers', {
        ...payload,
        isActive: false,
        enableLogin: false,
        isHistorical: true,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('विगत/पूर्व शिक्षक कर्मचारी अभिलेख सुरक्षित भयो (Login Portal खाता बिना)');
      queryClient.invalidateQueries({ queryKey: ['teachers-all-payroll'] });
      setIsAddPastStaffOpen(false);
      setPastStaffForm({
        fullName: '',
        fullNameNepali: '',
        gender: 'MALE',
        phone: '',
        panNo: '',
        shreni: 'TEACHING',
        taha: 'माध्यमिक तह',
        post: 'मा.वि. शिक्षक',
        type: 'RASTRIYA',
        dateOfJoiningBs: '',
        dateOfRetirementBs: '',
        statusReason: 'सरुवा (Transferred)',
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add past staff');
    },
  });

  // ── 2. Fetch Salary Scales (Government Pay Scales) ──────────────────────
  const { data: scalesData, isLoading: isScalesLoading } = useQuery({
    queryKey: ['salary-scales-all'],
    queryFn: async () => {
      const res = await api.get('/payroll/salary-scales/all');
      return res.data?.data || [];
    },
  });

  // ── 3. Fetch Financial Years ──────────────────────────────────────────
  const { data: financialYearsData } = useQuery({
    queryKey: ['financial-years-all'],
    queryFn: async () => {
      const res = await api.get('/financial-years/all');
      return res.data?.data || [];
    },
  });
  const activeFinancialYear = financialYearsData?.find((f: any) => f.isActive) || financialYearsData?.[0];

  // ── 3.1 Fetch Staff Master Options (TEACHER_TYPE) ─────────────────────
  const { data: staffMasterOptions = [] } = useQuery({
    queryKey: ['staff-master-options'],
    queryFn: async () => {
      const res = await api.get('/staff-masters/options');
      return res.data?.data || [];
    },
  });

  const masterTeacherTypes = useMemo(() => {
    return (staffMasterOptions as any[]).filter((o: any) => o.category === 'TEACHER_TYPE');
  }, [staffMasterOptions]);

  const availableTeacherTypes = useMemo(() => {
    const map = new Map<string, { code: string; label: string; icon: string }>();

    (masterTeacherTypes || []).forEach((m: any) => {
      const codeVal = m.code || m.title;
      if (codeVal && !map.has(codeVal)) {
        const info = getStaffTypeInfo(codeVal, masterTeacherTypes);
        map.set(codeVal, {
          code: codeVal,
          label: `${info.icon} ${m.titleNepali || m.title || codeVal}`,
          icon: info.icon,
        });
      }
    });

    (teachersData || []).forEach((t: any) => {
      if (t.type && !map.has(t.type)) {
        const info = getStaffTypeInfo(t.type, masterTeacherTypes);
        map.set(t.type, {
          code: t.type,
          label: `${info.icon} ${info.displayText}`,
          icon: info.icon,
        });
      }
    });

    if (map.size === 0) {
      map.set('RASTRIYA', { code: 'RASTRIYA', label: '🏛️ स्थायी दरबन्दी (Gov)', icon: '🏛️' });
      map.set('NIJI_SROTH', { code: 'NIJI_SROTH', label: '🤝 निजी स्रोत (School Private)', icon: '🤝' });
      map.set('RAHAT', { code: 'RAHAT', label: '💜 राहत अनुदान (Rahat)', icon: '💜' });
      map.set('KARAR', { code: 'KARAR', label: '📑 करार सेवा (Contract)', icon: '📑' });
      map.set('BALBIKAS', { code: 'BALBIKAS', label: '👶 बालविकास (ECD)', icon: '👶' });
    }

    return Array.from(map.values());
  }, [masterTeacherTypes, teachersData]);

  // Resolve selected Financial Year
  const selectedFinancialYear = useMemo(() => {
    if (!financialYearsData || financialYearsData.length === 0) return activeFinancialYear;
    if (selectedFYId) {
      return financialYearsData.find((f: any) => f.id.toString() === selectedFYId) || activeFinancialYear;
    }
    return activeFinancialYear || financialYearsData[0];
  }, [financialYearsData, selectedFYId, activeFinancialYear]);

  // Sync FY selection on initial data load
  useEffect(() => {
    if (activeFinancialYear && !selectedFYId) {
      setSelectedFYId(activeFinancialYear.id.toString());
      const yrMatch = activeFinancialYear.year?.match(/(\d{4})/);
      if (yrMatch && yrMatch[1]) {
        setSelectedYear(yrMatch[1]);
      }
    }
  }, [activeFinancialYear, selectedFYId]);

  // ── 4. Fetch Bank Accounts for Bulk Payment ───────────────────────────
  const { data: bankAccountsData } = useQuery({
    queryKey: ['bank-accounts-all'],
    queryFn: async () => {
      const res = await api.get('/school/bank-accounts');
      return res.data?.data || [];
    },
  });

  // Auto-select first bank account when available
  useEffect(() => {
    if (bankAccountsData && bankAccountsData.length > 0 && !disburseForm.bankAccountId) {
      setDisburseForm((prev) => ({ ...prev, bankAccountId: bankAccountsData[0].id.toString() }));
    }
  }, [bankAccountsData, disburseForm.bankAccountId]);

  // ── 5. Fetch School Profile for Header & Prints ────────────────────────
  const { data: schoolProfile } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data || {};
    },
  });

  // ── 6. Fetch Payroll History ──────────────────────────────────────────
  const { data: payrollsData, isLoading: isPayrollsLoading } = useQuery({
    queryKey: ['payrolls-list'],
    queryFn: async () => {
      const res = await api.get('/payroll?limit=200');
      return res.data?.data || [];
    },
  });

  // ── 6.5 Fetch Active Peshkis (Salary Advances) ──────────────────────────
  const { data: activePeshkisData } = useQuery({
    queryKey: ['staff-peshkis-active-list'],
    queryFn: async () => {
      try {
        const res = await api.get('/peshki?status=ACTIVE');
        return res.data?.data || [];
      } catch (err: any) {
        if (err.response?.status === 404) {
          const fallback = await api.get('/payroll/peshki?status=ACTIVE');
          return fallback.data?.data || [];
        }
        return [];
      }
    },
  });

  // ── 6.6 Group Saved Payrolls into Distinct Batches / Sessions ──
  const savedPayrollBatches = useMemo(() => {
    if (!payrollsData || payrollsData.length === 0) return [];

    const map = new Map<string, {
      key: string;
      monthFrom: string;
      monthTo: string;
      financialYear: any;
      financialYearId: number | null;
      periodText: string;
      monthCount: number;
      staffCount: number;
      totalNet: number;
      totalGross: number;
      records: any[];
      statuses: string[];
      createdAt: string;
    }>();

    payrollsData.forEach((p: any) => {
      const fyId = p.financialYearId || (p.financialYear?.id) || 'default';
      const mFrom = p.monthFrom || '2083-04';
      const mTo = p.monthTo || '2083-06';
      const key = `${fyId}_${mFrom}_${mTo}`;

      const periodInfo = formatPayrollPeriod(mFrom, mTo);

      if (!map.has(key)) {
        map.set(key, {
          key,
          monthFrom: mFrom,
          monthTo: mTo,
          financialYear: p.financialYear || financialYearsData?.find((f: any) => f.id === p.financialYearId),
          financialYearId: p.financialYearId || null,
          periodText: periodInfo.text,
          monthCount: periodInfo.monthCount,
          staffCount: 0,
          totalNet: 0,
          totalGross: 0,
          records: [],
          statuses: [],
          createdAt: p.createdAt || '',
        });
      }

      const batch = map.get(key)!;
      batch.records.push(p);
      batch.staffCount += 1;
      batch.totalNet += (p.khudPaaunuParne || 0);
      batch.totalGross += (p.traimasikTalan || 0);
      if (p.status && !batch.statuses.includes(p.status)) {
        batch.statuses.push(p.status);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      return (b.monthFrom || '').localeCompare(a.monthFrom || '');
    });
  }, [payrollsData, financialYearsData]);

  const selectedBatchObj = useMemo(() => {
    if (!selectedHistoryBatchKey) return null;
    return savedPayrollBatches.find((b) => b.key === selectedHistoryBatchKey) || null;
  }, [savedPayrollBatches, selectedHistoryBatchKey]);

  // Calculate Month Count
  const monthCount = useMemo(() => {
    const fromIdx = parseInt(fromMonth, 10);
    const toIdx = parseInt(toMonth, 10);
    if (toIdx >= fromIdx) return toIdx - fromIdx + 1;
    return 12 - fromIdx + toIdx + 1;
  }, [fromMonth, toMonth]);

  const monthFromStr = `${selectedYear}-${fromMonth}`;
  const monthToStr = `${selectedYear}-${toMonth}`;

  // ── 7. Initialize and prefill bulk spreadsheet rows when teachers/scales change ──
  useEffect(() => {
    if (!teachersData || teachersData.length === 0) return;

    const initialRows: Record<number, any> = {};
    const allIds: number[] = [];

    // Sort by official hierarchy rank order (Principal first, then Secondary, Lower Sec, Primary, Non-Teaching)
    const sortedTeachers = (teachersData || []).slice().sort((a: any, b: any) => {
      const rankA = getStaffRank(a);
      const rankB = getStaffRank(b);
      if (rankA !== rankB) return rankA - rankB;
      return a.id - b.id;
    });

    sortedTeachers.forEach((teacher: any) => {
      allIds.push(teacher.id);

      // Match salary scale if available
      let matchedScale = scalesData?.find(
        (s: any) =>
          s.taha === teacher.taha &&
          (!teacher.shreni || s.shreni === teacher.shreni)
      );

      // Default fallback scales
      const baseSalary = matchedScale ? matchedScale.moolTalab : (teacher.shreni === 'NON_TEACHING' ? 26082 : 38000);
      const gradeRate = matchedScale ? matchedScale.gradeAmount : (teacher.shreni === 'NON_TEACHING' ? 869 : 1200);

      // Strictly Principal only for प्र.अ. भत्ता [I] (exclude assistant headmaster, vice principal, etc.)
      const isPrincipal = Boolean(
        (
          teacher.inchargeRole === 'PRINCIPAL' ||
          teacher.post === 'प्रधानाध्यापक (Headmaster / Principal)' ||
          teacher.post === 'प्रधानाध्यापक' ||
          teacher.post?.toLowerCase() === 'principal' ||
          teacher.post?.toLowerCase() === 'headmaster'
        ) &&
        !teacher.post?.includes('सहायक') &&
        !teacher.post?.includes('Assistant') &&
        !teacher.inchargeRole?.includes('VICE')
      );

      // Check active peshkis for this teacher (sum all active advances with remaining > 0)
      const teacherActivePeshkis = (activePeshkisData || []).filter(
        (p: any) => p.teacherId === teacher.id && p.status === 'ACTIVE' && (p.remainingAmount || 0) > 0
      );
      const totalRemainingPeshki = teacherActivePeshkis.reduce((sum: number, p: any) => sum + (p.remainingAmount || 0), 0);

      let autoPeshkiDeduction = 0;
      if (teacherActivePeshkis.length > 0) {
        autoPeshkiDeduction = teacherActivePeshkis.reduce((sum: number, p: any) => {
          if (p.monthlyDeduction && p.monthlyDeduction > 0) {
            return sum + Math.min(p.remainingAmount, p.monthlyDeduction * monthCount);
          }
          return sum + (p.remainingAmount || 0);
        }, 0);
        autoPeshkiDeduction = Math.min(autoPeshkiDeduction, totalRemainingPeshki);
      }

      const isGovtEligible = (
        teacher.type === 'RASTRIYA' ||
        teacher.type === 'PERMANENT' ||
        teacher.type === 'RAHAT' ||
        (teacher.type && !['BALVIKAS', 'ECD', 'NIZI', 'PRIVATE', 'VOLUNTEER', 'LOCAL', 'NIGAM'].includes(teacher.type.toUpperCase()))
      ) && baseSalary > 20000;

      const defaultBimaThap = isGovtEligible ? globalInsuranceGovContribution : 0;
      const defaultKsKoshThap = isGovtEligible;
      const defaultKsKoshKatti = isGovtEligible;

      initialRows[teacher.id] = {
        teacherId: teacher.id,
        fullName: teacher.fullName,
        fullNameNepali: teacher.fullNameNepali || teacher.fullName,
        taha: teacher.taha || (teacher.shreni === 'NON_TEACHING' ? 'कार्यालय सहयोगी' : 'माध्यमिक तह'),
        shreni: teacher.shreni || (teacher.shreni === 'NON_TEACHING' ? 'श्रेणीविहीन' : 'तृतीय श्रेणी'),
        post: teacher.post || (teacher.shreni === 'NON_TEACHING' ? 'कर्मचारी' : 'शिक्षक'),
        type: teacher.type || 'RASTRIYA',
        bankAccountNo: teacher.bankAccountNo || '',
        panNo: teacher.panNo || '',
        // Form inputs
        moolTalab: baseSalary, // A
        gradeNo: isGovtEligible ? 3 : 0, // B (Default 3 grades for permanent, 0 for contract/ECD)
        gradeAmount: gradeRate, // C
        hasKsKoshThap: defaultKsKoshThap, // Column F toggle
        bimaThap: defaultBimaThap, // G (Default 0 for ECD/Private, 400 for Govt)
        // Dedicated Allowance flags & values
        hasPraABhata: isPrincipal,
        praABhata: isPrincipal ? 1000 : 0, // I (प्र.अ. भत्ता strictly only for Principal)
        hasMahangiGhata: true,
        mahangiGhata: globalDearnessAmount, // J (Default 2000)
        hasDurgamBhata: false,
        durgamBhata: 0, // K
        hasProtsahanBhata: false,
        protsahanBhata: 0, // L
        hasOtherBhata: false,
        otherBhata: 0, // M
        hasKsKoshKatti: defaultKsKoshKatti, // Column Q toggle
        karmachariKoshSapati: 0, // R (Loan)
        includeChaadparba: globalFestivalAllowed, // V
        poshakBhata: globalDressAllowance, // W
        peshkiDeduction: autoPeshkiDeduction, // Dedicated Advance Deduction
        activePeshkiRemaining: totalRemainingPeshki,
        remarks: '',
      };
    });

    setBulkRows(initialRows);
    setSelectedTeacherIds((prev) => (prev.length > 0 ? prev : []));
    setIncludedTeacherIds((prev) => (prev.length > 0 ? prev : []));
  }, [teachersData, scalesData, activePeshkisData, monthCount]);

  // ── Sync latest active Peshki balances into bulk spreadsheet rows ──────
  const syncActivePeshkisToRows = () => {
    queryClient.invalidateQueries({ queryKey: ['staff-peshkis-active-list'] });
    setBulkRows((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((idStr) => {
        const id = parseInt(idStr, 10);
        const teacherActivePeshkis = (activePeshkisData || []).filter(
          (p: any) => p.teacherId === id && p.status === 'ACTIVE' && (p.remainingAmount || 0) > 0
        );
        const totalRemainingPeshki = teacherActivePeshkis.reduce((sum: number, p: any) => sum + (p.remainingAmount || 0), 0);
        let autoPeshkiDeduction = 0;
        if (teacherActivePeshkis.length > 0) {
          autoPeshkiDeduction = teacherActivePeshkis.reduce((sum: number, p: any) => {
            if (p.monthlyDeduction && p.monthlyDeduction > 0) {
              return sum + Math.min(p.remainingAmount, p.monthlyDeduction * monthCount);
            }
            return sum + (p.remainingAmount || 0);
          }, 0);
          autoPeshkiDeduction = Math.min(autoPeshkiDeduction, totalRemainingPeshki);
        }

        updated[id] = {
          ...updated[id],
          activePeshkiRemaining: totalRemainingPeshki,
          peshkiDeduction: autoPeshkiDeduction,
        };
      });
      return updated;
    });
    toast.success('सक्रिय पेस्की बाँकी विवरण सिङ्क गरियो!');
  };

  // Update rows if global festival or dress allowance toggle changes
  const applyGlobalSettingsToRows = (festival: boolean, dress: number, dearness: number, insurance: number) => {
    setBulkRows((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((idStr) => {
        const id = parseInt(idStr, 10);
        updated[id] = {
          ...updated[id],
          includeChaadparba: festival,
          poshakBhata: dress,
          mahangiGhata: dearness,
          bimaThap: insurance,
        };
      });
      return updated;
    });
  };

  // ── Calculation Helper (Columns A through Z) ──────────────────────────
  const calculateRow = (row: any) => {
    if (!row) return {};
    let remarksData: any = {};
    if (row.remarks && typeof row.remarks === 'string' && row.remarks.startsWith('{')) {
      try { remarksData = JSON.parse(row.remarks); } catch (e) {}
    } else if (row.remarks && typeof row.remarks === 'object') {
      remarksData = row.remarks;
    }
    const merged = { ...remarksData, ...row };

    const A = parseFloat(merged.moolTalab || 0); // मूल तलब
    const B = parseInt(merged.gradeNo || 0, 10); // ग्रेड संख्या
    const C = parseFloat(merged.gradeAmount || 0); // ग्रेड दर
    const D = +(B * C).toFixed(2); // जम्मा ग्रेड रकम (B * C)
    const E = +(A + D).toFixed(2); // जम्मा तलब (ग्रेड सहित) (A + D)

    // Optional K.S. Kosh 10% employer addition (Column F toggle)
    const hasKsKoshThap = merged.hasKsKoshThap !== undefined ? Boolean(merged.hasKsKoshThap) : true;
    const F = hasKsKoshThap ? +(E * 0.10).toFixed(2) : 0; // क.सं. कोष थप १०% (10% of E if enabled)

    let G = 0;
    if (merged.bimaThap !== undefined && merged.bimaThap !== null && merged.bimaThap !== '') {
      G = parseFloat(merged.bimaThap) || 0;
    } else if (merged.hasBima === false) {
      G = 0;
    } else if (merged.bimaKati !== undefined && parseFloat(merged.bimaKati) === 0) {
      G = 0;
    } else {
      G = 0;
    }
    const H = +(E + F + G).toFixed(2); // कुल तलब (E + F + G)

    // Allowances (only added if checkbox is checked or enabled)
    const isPraA = merged.hasPraABhata !== undefined ? merged.hasPraABhata : (parseFloat(merged.praABhata || 0) > 0);
    const I = isPraA ? parseFloat(merged.praABhata || 0) : 0; // प्र.अ. भत्ता

    const isMahangi = merged.hasMahangiGhata !== undefined ? merged.hasMahangiGhata : (merged.mahangiGhata !== undefined ? parseFloat(merged.mahangiGhata) > 0 : true);
    const J = isMahangi ? parseFloat(merged.mahangiGhata !== undefined ? merged.mahangiGhata : 2000) : 0; // महङ्गी भत्ता

    const isDurgam = merged.hasDurgamBhata !== undefined ? merged.hasDurgamBhata : (parseFloat(merged.durgamBhata || 0) > 0);
    const K = isDurgam ? parseFloat(merged.durgamBhata || 0) : 0; // दुर्गम भत्ता

    const isProtsahan = merged.hasProtsahanBhata !== undefined ? merged.hasProtsahanBhata : (parseFloat(merged.protsahanBhata || 0) > 0);
    const L = isProtsahan ? parseFloat(merged.protsahanBhata || 0) : 0; // प्रोत्साहन भत्ता

    const isOther = merged.hasOtherBhata !== undefined ? merged.hasOtherBhata : (parseFloat(merged.otherBhata || 0) > 0);
    const M = isOther ? parseFloat(merged.otherBhata || 0) : 0; // अन्य भत्ता

    const N = +(I + J + K + L + M).toFixed(2); // जम्मा भत्ता

    const O = +(H + N).toFixed(2); // जम्मा तलब भत्ता (H + N)
    const effectiveMonths = merged.monthCount !== undefined && merged.monthCount !== '' ? parseInt(merged.monthCount) : monthCount;
    const P = +(O * effectiveMonths).toFixed(2); // त्रैमासिक / आवधिक तलब भत्ता (O * effectiveMonths)

    // विभिन्न कट्टी (Deductions)
    // Optional K.S. Kosh 20% employee deduction (Column Q toggle)
    const hasKsKoshKatti = merged.hasKsKoshKatti !== undefined ? Boolean(merged.hasKsKoshKatti) : true;
    const Q = hasKsKoshKatti ? +(E * 0.20 * effectiveMonths).toFixed(2) : 0; // क.सं. कोष २०% कट्टी ((20% of E) * effectiveMonths if enabled)

    const R = parseFloat(merged.karmachariKoshSapati || 0); // कोष सापट कट्टी
    const S = +(G * 2 * effectiveMonths).toFixed(2); // बीमा कट्टी ((G * 2) * effectiveMonths)
    const T = +(Q + R + S).toFixed(2); // जम्मा कट्टी (Q + R + S)

    const U = +(P - T).toFixed(2); // बाँकी पाउनु पर्ने (P - T)

    const V = merged.includeChaadparba ? E : 0; // चाडपर्व खर्च (E)
    const W = parseFloat(merged.poshakBhata || 0); // पोसाक भत्ता
    const X = +(U + V + W).toFixed(2); // जम्मा पाउनु पर्ने (U + V + W)

    const Y = +(X * 0.01).toFixed(2); // सा.सु. कर १% कट्टी (1% of X)
    const netBeforePeshki = +(X - Y).toFixed(2); // Net before salary advance deduction
    const peshkiDeduction = parseFloat(merged.peshkiDeduction || 0); // पेस्की कट्टी
    const Z = Math.max(0, +(netBeforePeshki - peshkiDeduction).toFixed(2)); // खुद भुक्तानी पाउनु पर्ने ((X - Y) - peshkiDeduction)

    return {
      A, B, C, D, E, F, G, H,
      I, J, K, L, M, N,
      O, P,
      Q, R, S, T,
      U, V, W, X, Y,
      netBeforePeshki,
      peshkiDeduction,
      Z,
      hasKsKoshThap,
      hasKsKoshKatti,
    };
  };

  // Update specific field in row
  const handleFieldChange = (teacherId: number, field: string, value: any) => {
    setBulkRows((prev) => ({
      ...prev,
      [teacherId]: {
        ...prev[teacherId],
        [field]: value,
      },
    }));
  };

  // Handle Scale Change for Teacher
  const handleScaleSelection = (teacherId: number, scaleId: string) => {
    const scale = scalesData?.find((s: any) => s.id.toString() === scaleId);
    if (!scale) return;
    setBulkRows((prev) => ({
      ...prev,
      [teacherId]: {
        ...prev[teacherId],
        taha: scale.taha,
        shreni: scale.shreni,
        moolTalab: scale.moolTalab,
        gradeAmount: scale.gradeAmount,
      },
    }));
  };

  // Filtered displayed staff (including active vs past/transferred, sorted by displayOrder/hierarchy/ID)
  const displayedStaff = useMemo(() => {
    const list = (teachersData || []).filter((t: any) => {
      if (displayMode === 'custom' && !includedTeacherIds.includes(t.id)) return false;
      if (staffStatusFilter === 'ACTIVE' && t.isActive === false) return false;
      if (staffStatusFilter === 'INACTIVE' && t.isActive !== false) return false;
      if (selectedCategory === 'TEACHING' && t.shreni === 'NON_TEACHING') return false;
      if (selectedCategory === 'NON_TEACHING' && t.shreni !== 'NON_TEACHING') return false;
      if (filterType && t.type !== filterType) return false;
      if (searchStaff) {
        const q = searchStaff.toLowerCase();
        return (
          t.fullName?.toLowerCase().includes(q) ||
          t.fullNameNepali?.toLowerCase().includes(q) ||
          t.taha?.toLowerCase().includes(q) ||
          t.post?.toLowerCase().includes(q) ||
          t.panNo?.includes(q)
        );
      }
      return true;
    });

    return list.slice().sort((a: any, b: any) => {
      if (staffSortOrder === 'selectionOrder') {
        const idxA = includedTeacherIds.indexOf(a.id);
        const idxB = includedTeacherIds.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        const orderA = a.displayOrder !== null && a.displayOrder !== undefined ? a.displayOrder : 999;
        const orderB = b.displayOrder !== null && b.displayOrder !== undefined ? b.displayOrder : 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.id - b.id;
      }
      if (staffSortOrder === 'displayOrder') {
        const orderA = a.displayOrder !== null && a.displayOrder !== undefined ? a.displayOrder : 999;
        const orderB = b.displayOrder !== null && b.displayOrder !== undefined ? b.displayOrder : 999;
        if (orderA !== orderB) return orderA - orderB;
        const rankA = getStaffRank(a);
        const rankB = getStaffRank(b);
        if (rankA !== rankB) return rankA - rankB;
        return a.id - b.id;
      }
      if (staffSortOrder === 'hierarchy') {
        const rankA = getStaffRank(a);
        const rankB = getStaffRank(b);
        if (rankA !== rankB) return rankA - rankB;
        return a.id - b.id;
      }
      if (staffSortOrder === 'id') {
        return a.id - b.id;
      }
      if (staffSortOrder === 'name') {
        return (a.fullName || '').localeCompare(b.fullName || '');
      }
      return a.id - b.id;
    });
  }, [teachersData, includedTeacherIds, displayMode, staffStatusFilter, selectedCategory, filterType, searchStaff, staffSortOrder]);

  // Find all available teachers that are not yet in includedTeacherIds
  const unaddedTeachers = useMemo(() => {
    const list = (teachersData || []).filter((t: any) => {
      if (includedTeacherIds.includes(t.id)) return false;
      if (staffStatusFilter === 'ACTIVE' && t.isActive === false) return false;
      if (staffStatusFilter === 'INACTIVE' && t.isActive !== false) return false;
      if (selectedCategory === 'TEACHING' && t.shreni === 'NON_TEACHING') return false;
      if (selectedCategory === 'NON_TEACHING' && t.shreni !== 'NON_TEACHING') return false;
      return true;
    });

    return list.slice().sort((a: any, b: any) => {
      const orderA = a.displayOrder !== null && a.displayOrder !== undefined ? a.displayOrder : 999;
      const orderB = b.displayOrder !== null && b.displayOrder !== undefined ? b.displayOrder : 999;
      if (orderA !== orderB) return orderA - orderB;
      const rankA = getStaffRank(a);
      const rankB = getStaffRank(b);
      if (rankA !== rankB) return rankA - rankB;
      return a.id - b.id;
    });
  }, [teachersData, includedTeacherIds, staffStatusFilter, selectedCategory]);

  // Filtered unadded teachers for the Searchable Dropdown
  const filteredUnaddedTeachers = useMemo(() => {
    if (!staffSelectorQuery.trim()) return unaddedTeachers;
    const q = staffSelectorQuery.toLowerCase().trim();
    return unaddedTeachers.filter((t: any) => {
      return (
        (t.fullName && t.fullName.toLowerCase().includes(q)) ||
        (t.fullNameNepali && t.fullNameNepali.toLowerCase().includes(q)) ||
        (t.post && t.post.toLowerCase().includes(q)) ||
        (t.taha && t.taha.toLowerCase().includes(q)) ||
        (t.shreni && t.shreni.toLowerCase().includes(q)) ||
        (t.displayOrder !== null && t.displayOrder !== undefined && String(t.displayOrder).includes(q)) ||
        (t.phone && t.phone.includes(q))
      );
    });
  }, [unaddedTeachers, staffSelectorQuery]);

  const addNextTeacher = () => {
    if (unaddedTeachers.length === 0) {
      toast.error('सबै शिक्षकहरू पहिले नै तालिकामा थपिइसकेका छन्।');
      return;
    }
    const nextT = unaddedTeachers[0];
    setDisplayMode('custom');
    setIncludedTeacherIds((prev) => [...prev.filter((id) => id !== nextT.id), nextT.id]);
    setSelectedTeacherIds((prev) => Array.from(new Set([...prev, nextT.id])));
    toast.success(`+ ${nextT.fullName} (${nextT.fullNameNepali || nextT.post || 'शिक्षक'}) तालिकामा थपियो!`);
  };

  const addSpecificTeacher = (teacherId: number) => {
    const found = teachersData?.find((t: any) => t.id === teacherId);
    if (!found) return;
    setDisplayMode('custom');
    setIncludedTeacherIds((prev) => [...prev.filter((id) => id !== teacherId), teacherId]);
    setSelectedTeacherIds((prev) => Array.from(new Set([...prev, teacherId])));
    toast.success(`+ ${found.fullName} (${found.fullNameNepali || found.post || 'शिक्षक'}) तालिकामा थपियो!`);
    setStaffSelectorQuery('');
  };

  const removeTeacherFromSheet = (teacherId: number) => {
    setDisplayMode('custom');
    setIncludedTeacherIds((prev) => prev.filter((id) => id !== teacherId));
    setSelectedTeacherIds((prev) => prev.filter((id) => id !== teacherId));
    toast.success('शिक्षक तालिकाबाट हटाइयो (पुनः थप्न सकिनेछ)।');
  };

  const addAllTeachersToSheet = () => {
    const allIds = (teachersData || []).map((t: any) => t.id);
    setIncludedTeacherIds(allIds);
    setSelectedTeacherIds(allIds);
    setDisplayMode('all');
    toast.success(`सबै (${allIds.length}) शिक्षकहरू तालिकामा थपियो।`);
  };

  const clearAllTeachersFromSheet = () => {
    setIncludedTeacherIds([]);
    setSelectedTeacherIds([]);
    setDisplayMode('custom');
    toast.success('तालिका खाली गरियो। अब एक-एक गरी शिक्षक थप्न सक्नुहुन्छ।');
  };

  // Grand Totals of selected staff
  const grandTotals = useMemo(() => {
    let totalGrossP = 0;
    let totalDeductionT = 0;
    let totalFestivalV = 0;
    let totalDressW = 0;
    let totalTaxY = 0;
    let totalPeshkiDeduction = 0;
    let totalNetZ = 0;
    let count = 0;

    selectedTeacherIds.forEach((id) => {
      const row = bulkRows[id];
      if (!row) return;
      const calc = calculateRow(row);
      totalGrossP += calc.P || 0;
      totalDeductionT += calc.T || 0;
      totalFestivalV += calc.V || 0;
      totalDressW += calc.W || 0;
      totalTaxY += calc.Y || 0;
      totalPeshkiDeduction += calc.peshkiDeduction || 0;
      totalNetZ += calc.Z || 0;
      count++;
    });

    return {
      count,
      totalGrossP: Math.round(totalGrossP * 100) / 100,
      totalDeductionT: Math.round(totalDeductionT * 100) / 100,
      totalFestivalV: Math.round(totalFestivalV * 100) / 100,
      totalDressW: Math.round(totalDressW * 100) / 100,
      totalTaxY: Math.round(totalTaxY * 100) / 100,
      totalPeshkiDeduction: Math.round(totalPeshkiDeduction * 100) / 100,
      totalNetZ: Math.round(totalNetZ * 100) / 100,
    };
  }, [selectedTeacherIds, bulkRows, monthCount]);

  // Current bulk staff list for Bank Transfer Letter tab
  const currentBulkStaffListForBank = useMemo(() => {
    return selectedTeacherIds.map((id) => {
      const row = bulkRows[id] || {};
      const calc = calculateRow(row);
      return {
        id,
        fullName: row.fullName,
        fullNameNepali: row.fullNameNepali,
        post: row.post,
        taha: row.taha,
        bankAccountNo: row.bankAccountNo,
        netPayable: calc.Z || 0,
      };
    });
  }, [selectedTeacherIds, bulkRows]);

  // ── 8. Bulk Save Mutation ─────────────────────────────────────────────
  const bulkSaveMutation = useMutation({
    mutationFn: async () => {
      if (selectedTeacherIds.length === 0) {
        throw new Error('कृपया कम्तीमा १ जना शिक्षक/कर्मचारी छनौट गर्नुहोस्!');
      }

      const items = selectedTeacherIds.map((id) => {
        const row = bulkRows[id];
        return {
          teacherId: id,
          monthFrom: monthFromStr,
          monthTo: monthToStr,
          taha: row.taha,
          shreni: row.shreni,
          moolTalab: row.moolTalab,
          gradeNo: row.gradeNo,
          gradeAmount: row.gradeAmount,
          hasKsKoshThap: row.hasKsKoshThap !== undefined ? Boolean(row.hasKsKoshThap) : true,
          hasKsKoshKatti: row.hasKsKoshKatti !== undefined ? Boolean(row.hasKsKoshKatti) : true,
          peshkiDeduction: parseFloat(row.peshkiDeduction || 0),
          mahangiGhata: row.mahangiGhata,
          praABhata: row.praABhata,
          durgamBhata: row.durgamBhata,
          protsahanBhata: row.protsahanBhata,
          otherBhata: row.otherBhata,
          karmachariKoshSapati: row.karmachariKoshSapati,
          bimaThap: row.bimaThap,
          includeChaadparba: row.includeChaadparba,
          poshakBhata: row.poshakBhata,
          remarks: row.remarks,
        };
      });

      const res = await api.post('/payroll/bulk-save', {
        items,
        monthFrom: monthFromStr,
        monthTo: monthToStr,
        monthCount,
        financialYearId: selectedFinancialYear?.id || activeFinancialYear?.id,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'सफलतापूर्वक तलब भरपाई दर्ता गरियो!');
      queryClient.invalidateQueries({ queryKey: ['payrolls-list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-peshkis'] });
      queryClient.invalidateQueries({ queryKey: ['staff-peshkis-active-list'] });
    },
    onError: (err: any) => {
      toast.error(err.message || err.response?.data?.message || 'भरपाई दर्ता गर्न सकिएन');
    },
  });

  // ── 9. Issue Bulk Payment & Expense Posting ────────────────────────────
  const issueBulkPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!disburseForm.bankAccountId) {
        throw new Error('कृपया विद्यालयको बैंक खाता छनौट गर्नुहोस्!');
      }

      // First ensure the latest records are saved
      const items = selectedTeacherIds.map((id) => {
        const row = bulkRows[id];
        return {
          teacherId: id,
          monthFrom: monthFromStr,
          monthTo: monthToStr,
          taha: row.taha,
          shreni: row.shreni,
          moolTalab: row.moolTalab,
          gradeNo: row.gradeNo,
          gradeAmount: row.gradeAmount,
          hasKsKoshThap: row.hasKsKoshThap !== undefined ? Boolean(row.hasKsKoshThap) : true,
          hasKsKoshKatti: row.hasKsKoshKatti !== undefined ? Boolean(row.hasKsKoshKatti) : true,
          peshkiDeduction: parseFloat(row.peshkiDeduction || 0),
          mahangiGhata: row.mahangiGhata,
          praABhata: row.praABhata,
          durgamBhata: row.durgamBhata,
          protsahanBhata: row.protsahanBhata,
          otherBhata: row.otherBhata,
          karmachariKoshSapati: row.karmachariKoshSapati,
          bimaThap: row.bimaThap,
          includeChaadparba: row.includeChaadparba,
          poshakBhata: row.poshakBhata,
          remarks: row.remarks,
        };
      });

      const saveRes = await api.post('/payroll/bulk-save', {
        items,
        monthFrom: monthFromStr,
        monthTo: monthToStr,
        monthCount,
        financialYearId: selectedFinancialYear?.id || activeFinancialYear?.id,
      });

      const savedPayrolls = saveRes.data?.data || [];
      const payrollIds = savedPayrolls.map((p: any) => p.id);

      // Now disburse via bank and post expense
      const disburseRes = await api.post('/payroll/disburse-bank-bulk', {
        payrollIds,
        bankAccountId: disburseForm.bankAccountId,
        paymentDateBs: disburseForm.paymentDateBs || todayBS(),
        chequeNo: disburseForm.chequeNo,
        chequePayeeName: disburseForm.chequePayeeName,
        voucherNo: disburseForm.voucherNo,
        remarks: disburseForm.remarks,
      });

      return disburseRes.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'एकमुष्ट बैंक तलब भुक्तानी निकासा र खर्च प्रविष्टि सम्पन्न भयो!');
      setIsDisburseModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['payrolls-list'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-all'] });
      queryClient.invalidateQueries({ queryKey: ['staff-peshkis'] });
      queryClient.invalidateQueries({ queryKey: ['staff-peshkis-active-list'] });
    },
    onError: (err: any) => {
      toast.error(err.message || err.response?.data?.message || 'बैंक भुक्तानी निकासा गर्न सकिएन');
    },
  });

  // ── 10. Seed Default Salary Scales ─────────────────────────────────────
  const seedScalesMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/payroll/salary-scales/seed-default');
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'नेपाल सरकार शिक्षक तलब स्केल सुरक्षित गरियो!');
      queryClient.invalidateQueries({ queryKey: ['salary-scales-all'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to seed scales');
    },
  });

  // ── 11. Delete Scale Mutation ──────────────────────────────────────────
  const deleteScaleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/payroll/salary-scales/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Salary scale deleted');
      queryClient.invalidateQueries({ queryKey: ['salary-scales-all'] });
    },
  });

  // ── 12. Save Scale Mutation ────────────────────────────────────────────
  const saveScaleMutation = useMutation({
    mutationFn: async () => {
      if (editingScale) {
        const res = await api.put(`/payroll/salary-scales/${editingScale.id}`, scaleForm);
        return res.data;
      } else {
        const res = await api.post('/payroll/salary-scales', scaleForm);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(editingScale ? 'Scale updated' : 'New scale created');
      setIsScaleModalOpen(false);
      setEditingScale(null);
      queryClient.invalidateQueries({ queryKey: ['salary-scales-all'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save scale');
    },
  });

  // ── 12.5 Open Edit Modal for a DRAFT Payroll Record ──
  const handleOpenEditPayroll = (p: any) => {
    setEditingPayroll(p);
    let parsedRemarks: any = {};
    try {
      if (p.remarks && typeof p.remarks === 'string' && p.remarks.startsWith('{')) {
        parsedRemarks = JSON.parse(p.remarks);
      }
    } catch (e) {}

    const fromM = p.monthFrom ? parseInt(p.monthFrom.split('-')[1] || '4') : 4;
    const toM = p.monthTo ? parseInt(p.monthTo.split('-')[1] || '6') : 6;
    let computedMonths = toM >= fromM ? toM - fromM + 1 : 12 - fromM + toM + 1;
    if (parsedRemarks?.monthCount) computedMonths = parsedRemarks.monthCount;

    const bimaThapVal = parsedRemarks?.bimaThap !== undefined
      ? Number(parsedRemarks.bimaThap)
      : (p.bimaKati > 0 ? (Number(p.bimaKati) / (2 * (computedMonths || 3))) : 0);

    setEditPayrollForm({
      id: p.id,
      teacherId: p.teacherId,
      teacherName: p.teacher?.fullName || 'Teacher',
      teacherPost: `${p.taha || ''} ${p.shreni ? `(${p.shreni})` : ''}`,
      taha: p.taha || 'माध्यमिक तह',
      shreni: p.shreni || 'तृतीय श्रेणी',
      monthFrom: p.monthFrom || '',
      monthTo: p.monthTo || '',
      monthCount: computedMonths,
      moolTalab: p.moolTalab || 0,
      gradeNo: p.gradeNo || 0,
      gradeAmount: p.gradeAmount || 0,
      hasKsKoshThap: p.hasKsKoshThap !== undefined ? Boolean(p.hasKsKoshThap) : (p.karmachari10Pct > 0),
      hasKsKoshKatti: p.hasKsKoshKatti !== undefined ? Boolean(p.hasKsKoshKatti) : (p.ssk20Pct > 0),
      bimaThap: bimaThapVal,
      bimaKati: p.bimaKati || 0,
      mahangiGhata: p.mahangiGhata !== undefined ? p.mahangiGhata : 2000,
      hasMahangiGhata: p.mahangiGhata !== undefined ? (p.mahangiGhata > 0) : true,
      praABhata: p.praABhata || 0,
      hasPraABhata: (p.praABhata || 0) > 0,
      sahayakPraABhata: p.sahayakPraABhata || 0,
      prabiInchargeBhata: p.prabiInchargeBhata || 0,
      mabiInchargeBhata: p.mabiInchargeBhata || 0,
      durgamBhata: parsedRemarks?.durgamBhata || 0,
      hasDurgamBhata: (parsedRemarks?.durgamBhata || 0) > 0,
      protsahanBhata: parsedRemarks?.protsahanBhata || 0,
      hasProtsahanBhata: (parsedRemarks?.protsahanBhata || 0) > 0,
      otherBhata: p.otherBhata || 0,
      hasOtherBhata: (p.otherBhata || 0) > 0,
      otherBhataLabel: p.otherBhataLabel || 'विविध भत्ता',
      karmachariKoshSapati: p.karmachariKoshSapati || 0,
      includeChaadparba: Boolean(p.chaadparbaKharcha && p.chaadparbaKharcha > 0),
      chaadparbaKharcha: p.chaadparbaKharcha || 0,
      poshakBhata: parsedRemarks?.poshakBhata || 0,
      peshkiDeduction: p.peshkiDeduction || p.peshkiKati || 0,
      status: p.status || 'DRAFT',
      note: parsedRemarks?.note || '',
    });
    setIsEditPayrollModalOpen(true);
  };

  // ── Update Single Existing Payroll Record Mutation ──
  const updatePayrollMutation = useMutation({
    mutationFn: async () => {
      if (!editPayrollForm.id) return;
      const bimaThapVal = editPayrollForm.bimaThap !== undefined && editPayrollForm.bimaThap !== '' ? parseFloat(editPayrollForm.bimaThap) : 0;
      const calc = calculateRow({
        ...editPayrollForm,
        bimaThap: bimaThapVal,
        monthCount: editPayrollForm.monthCount || 3,
      });

      const remarksObj = {
        bimaThap: bimaThapVal,
        durgamBhata: parseFloat(editPayrollForm.durgamBhata || 0),
        protsahanBhata: parseFloat(editPayrollForm.protsahanBhata || 0),
        poshakBhata: parseFloat(editPayrollForm.poshakBhata || 0),
        monthCount: editPayrollForm.monthCount || 3,
        hasKsKoshThap: editPayrollForm.hasKsKoshThap,
        hasKsKoshKatti: editPayrollForm.hasKsKoshKatti,
        peshkiDeduction: parseFloat(editPayrollForm.peshkiDeduction || 0),
        note: editPayrollForm.note || '',
      };

      const res = await api.put(`/payroll/${editPayrollForm.id}`, {
        teacherId: editPayrollForm.teacherId,
        monthFrom: editPayrollForm.monthFrom,
        monthTo: editPayrollForm.monthTo,
        taha: editPayrollForm.taha,
        shreni: editPayrollForm.shreni,
        moolTalab: parseFloat(editPayrollForm.moolTalab || 0),
        gradeNo: parseInt(editPayrollForm.gradeNo || 0),
        gradeAmount: parseFloat(editPayrollForm.gradeAmount || 0),
        bimaThap: bimaThapVal,
        bimaKati: bimaThapVal > 0 ? (calc.S || 0) : 0,
        mahangiGhata: editPayrollForm.hasMahangiGhata !== false ? parseFloat(editPayrollForm.mahangiGhata !== undefined ? editPayrollForm.mahangiGhata : 2000) : 0,
        praABhata: editPayrollForm.hasPraABhata ? parseFloat(editPayrollForm.praABhata || 0) : 0,
        sahayakPraABhata: parseFloat(editPayrollForm.sahayakPraABhata || 0),
        prabiInchargeBhata: parseFloat(editPayrollForm.prabiInchargeBhata || 0),
        mabiInchargeBhata: parseFloat(editPayrollForm.mabiInchargeBhata || 0),
        otherBhata: editPayrollForm.hasOtherBhata ? parseFloat(editPayrollForm.otherBhata || 0) : 0,
        otherBhataLabel: editPayrollForm.otherBhataLabel,
        hasKsKoshThap: editPayrollForm.hasKsKoshThap,
        hasKsKoshKatti: editPayrollForm.hasKsKoshKatti,
        karmachariKoshSapati: parseFloat(editPayrollForm.karmachariKoshSapati || 0),
        peshkiDeduction: parseFloat(editPayrollForm.peshkiDeduction || 0),
        peshkiKati: parseFloat(editPayrollForm.peshkiDeduction || 0),
        includeChaadparba: Boolean(editPayrollForm.includeChaadparba),
        chaadparbaKharcha: editPayrollForm.includeChaadparba ? (editPayrollForm.chaadparbaKharcha ? parseFloat(editPayrollForm.chaadparbaKharcha) : calc.E) : 0,
        poshakBhata: parseFloat(editPayrollForm.poshakBhata || 0),
        remarks: JSON.stringify(remarksObj),
        status: editPayrollForm.status || 'DRAFT',
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('तलब विवरण सफलतापूर्वक अद्यावधिक (Update) भयो!');
      setIsEditPayrollModalOpen(false);
      setEditingPayroll(null);
      queryClient.invalidateQueries({ queryKey: ['payrolls-list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-peshkis'] });
      queryClient.invalidateQueries({ queryKey: ['staff-peshkis-active-list'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'तलब अद्यावधिक गर्न सकिएन');
    },
  });

  // ── 12.6 Add Missing Staff to Saved Payroll Batch / Period ──
  const handleOpenAddMissingStaff = () => {
    let mFrom = '';
    let mTo = '';
    let fyId: any = activeFinancialYear?.id || null;

    if (selectedBatchObj) {
      mFrom = selectedBatchObj.monthFrom;
      mTo = selectedBatchObj.monthTo;
      fyId = selectedBatchObj.financialYearId || activeFinancialYear?.id || null;
    } else {
      mFrom = historyMonthFromFilter !== 'ALL' ? `${historyYearFilter !== 'ALL' ? historyYearFilter : selectedYear}-${historyMonthFromFilter}` : `${selectedYear}-04`;
      mTo = historyMonthToFilter !== 'ALL' ? `${historyYearFilter !== 'ALL' ? historyYearFilter : selectedYear}-${historyMonthToFilter}` : `${selectedYear}-06`;
      fyId = historyFYFilter !== 'ALL' ? parseInt(historyFYFilter) : (activeFinancialYear?.id || null);
    }

    const fromM = parseInt(mFrom.split('-')[1] || '4', 10);
    const toM = parseInt(mTo.split('-')[1] || '6', 10);
    let computedMonths = toM >= fromM ? toM - fromM + 1 : 12 - fromM + toM + 1;

    const firstMissing = unaddedTeachersInHistory[0];

    setAddMissingStaffForm({
      teacherId: firstMissing ? firstMissing.id.toString() : '',
      teacherName: firstMissing ? firstMissing.fullName : '',
      teacherPost: firstMissing ? `${firstMissing.taha || ''} ${firstMissing.shreni ? `(${firstMissing.shreni})` : ''}` : '',
      monthFrom: mFrom,
      monthTo: mTo,
      monthCount: computedMonths,
      financialYearId: fyId,
      taha: firstMissing?.taha || 'माध्यमिक तह',
      shreni: firstMissing?.shreni || 'तृतीय श्रेणी',
      moolTalab: 43689,
      gradeNo: firstMissing?.gradeNo || 0,
      gradeAmount: 1456,
      hasKsKoshThap: true,
      hasKsKoshKatti: true,
      bimaThap: 0,
      bimaKati: 0,
      mahangiGhata: 2000,
      hasMahangiGhata: true,
      praABhata: 0,
      hasPraABhata: false,
      sahayakPraABhata: 0,
      prabiInchargeBhata: 0,
      mabiInchargeBhata: 0,
      durgamBhata: 0,
      hasDurgamBhata: false,
      protsahanBhata: 0,
      hasProtsahanBhata: false,
      otherBhata: 0,
      hasOtherBhata: false,
      otherBhataLabel: 'विविध भत्ता',
      karmachariKoshSapati: 0,
      includeChaadparba: false,
      chaadparbaKharcha: 0,
      poshakBhata: 0,
      peshkiDeduction: 0,
      activePeshkiRemaining: 0,
      status: 'DRAFT',
      note: '',
    });

    if (firstMissing) {
      handleMissingTeacherSelected(firstMissing.id.toString());
    }

    setIsAddMissingStaffModalOpen(true);
  };

  const handleMissingTeacherSelected = (teacherIdStr: string) => {
    const teacher = (teachersData || []).find((t: any) => t.id.toString() === teacherIdStr);
    if (!teacher) return;

    // Find matching scale
    const matchingScale = scalesData?.find((s: any) => 
      (s.taha === teacher.taha && s.shreni === teacher.shreni) ||
      (teacher.post && s.taha && teacher.post.toLowerCase().includes(s.taha.toLowerCase()))
    ) || scalesData?.[0];

    const baseSalary = matchingScale?.moolTalab || 43689;
    const isGovt = (
      teacher.type === 'RASTRIYA' ||
      teacher.type === 'PERMANENT' ||
      (teacher.type && !['BALVIKAS', 'ECD', 'NIZI', 'PRIVATE', 'VOLUNTEER', 'LOCAL', 'NIGAM'].includes(teacher.type.toUpperCase()))
    ) && baseSalary > 20000;
    const isHeadmaster = teacher.post?.includes('प्रधानाध्यापक') || teacher.post?.includes('Headmaster') || teacher.post?.includes('प्र.अ.');

    // Check active peshki
    const teacherActivePeshkis = (activePeshkisData || []).filter(
      (p: any) => p.teacherId === teacher.id && p.status === 'ACTIVE' && (p.remainingAmount || 0) > 0
    );
    const totalRemainingPeshki = teacherActivePeshkis.reduce((sum: number, p: any) => sum + (p.remainingAmount || 0), 0);

    setAddMissingStaffForm((prev: any) => ({
      ...prev,
      teacherId: teacher.id.toString(),
      teacherName: teacher.fullName,
      teacherPost: `${teacher.taha || ''} ${teacher.shreni ? `(${teacher.shreni})` : ''}`,
      taha: teacher.taha || matchingScale?.taha || 'माध्यमिक तह',
      shreni: teacher.shreni || matchingScale?.shreni || 'तृतीय श्रेणी',
      moolTalab: baseSalary,
      gradeNo: isGovt ? (teacher.gradeNo || 0) : 0,
      gradeAmount: matchingScale?.gradeAmount || 1456,
      hasKsKoshThap: isGovt,
      hasKsKoshKatti: isGovt,
      bimaThap: isGovt ? 400 : 0,
      hasMahangiGhata: true,
      mahangiGhata: 2000,
      praABhata: isHeadmaster ? 500 : 0,
      hasPraABhata: isHeadmaster,
      peshkiDeduction: 0,
      activePeshkiRemaining: totalRemainingPeshki,
    }));
  };

  const addMissingStaffMutation = useMutation({
    mutationFn: async () => {
      if (!addMissingStaffForm.teacherId) {
        throw new Error('कृपया शिक्षक/कर्मचारी छनौट गर्नुहोस्');
      }

      const bimaThapVal = addMissingStaffForm.bimaThap !== undefined && addMissingStaffForm.bimaThap !== '' ? parseFloat(addMissingStaffForm.bimaThap) : 0;
      const calc = calculateRow({
        ...addMissingStaffForm,
        bimaThap: bimaThapVal,
        monthCount: addMissingStaffForm.monthCount || 3,
      });

      const remarksObj = {
        bimaThap: bimaThapVal,
        durgamBhata: parseFloat(addMissingStaffForm.durgamBhata || 0),
        protsahanBhata: parseFloat(addMissingStaffForm.protsahanBhata || 0),
        poshakBhata: parseFloat(addMissingStaffForm.poshakBhata || 0),
        monthCount: addMissingStaffForm.monthCount || 3,
        hasKsKoshThap: addMissingStaffForm.hasKsKoshThap,
        hasKsKoshKatti: addMissingStaffForm.hasKsKoshKatti,
        peshkiDeduction: parseFloat(addMissingStaffForm.peshkiDeduction || 0),
        note: addMissingStaffForm.note || '',
      };

      const res = await api.post('/payroll/bulk-save', {
        monthFrom: addMissingStaffForm.monthFrom,
        monthTo: addMissingStaffForm.monthTo,
        financialYearId: addMissingStaffForm.financialYearId || activeFinancialYear?.id,
        monthCount: addMissingStaffForm.monthCount || 3,
        items: [
          {
            teacherId: parseInt(addMissingStaffForm.teacherId),
            taha: addMissingStaffForm.taha,
            shreni: addMissingStaffForm.shreni,
            moolTalab: parseFloat(addMissingStaffForm.moolTalab || 0),
            gradeNo: parseInt(addMissingStaffForm.gradeNo || 0),
            gradeAmount: parseFloat(addMissingStaffForm.gradeAmount || 0),
            bimaThap: bimaThapVal,
            bimaKati: bimaThapVal > 0 ? (calc.S || 0) : 0,
            mahangiGhata: addMissingStaffForm.hasMahangiGhata !== false ? parseFloat(addMissingStaffForm.mahangiGhata || 2000) : 0,
            praABhata: addMissingStaffForm.hasPraABhata ? parseFloat(addMissingStaffForm.praABhata || 0) : 0,
            sahayakPraABhata: parseFloat(addMissingStaffForm.sahayakPraABhata || 0),
            prabiInchargeBhata: parseFloat(addMissingStaffForm.prabiInchargeBhata || 0),
            mabiInchargeBhata: parseFloat(addMissingStaffForm.mabiInchargeBhata || 0),
            otherBhata: parseFloat(addMissingStaffForm.otherBhata || 0),
            otherBhataLabel: addMissingStaffForm.otherBhataLabel,
            hasKsKoshThap: addMissingStaffForm.hasKsKoshThap,
            hasKsKoshKatti: addMissingStaffForm.hasKsKoshKatti,
            karmachariKoshSapati: parseFloat(addMissingStaffForm.karmachariKoshSapati || 0),
            peshkiDeduction: parseFloat(addMissingStaffForm.peshkiDeduction || 0),
            peshkiKati: parseFloat(addMissingStaffForm.peshkiDeduction || 0),
            includeChaadparba: Boolean(addMissingStaffForm.includeChaadparba),
            chaadparbaKharcha: addMissingStaffForm.includeChaadparba ? (addMissingStaffForm.chaadparbaKharcha ? parseFloat(addMissingStaffForm.chaadparbaKharcha) : calc.E) : 0,
            poshakBhata: parseFloat(addMissingStaffForm.poshakBhata || 0),
            remarks: JSON.stringify(remarksObj),
            status: 'DRAFT',
          },
        ],
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'शिक्षक/कर्मचारी निकासा भरपाईमा सफलतापूर्वक थपियो!');
      setIsAddMissingStaffModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['payrolls-list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-peshkis'] });
      queryClient.invalidateQueries({ queryKey: ['staff-peshkis-active-list'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'कर्मचारी थप्न सकिएन');
    },
  });

  // ── 13. Official Nepal Government Bharpai Sheet Print ──────────────────
  const triggerOfficialGoNBharpaiPrint = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const schoolNe = schoolProfile?.nameNepali || 'नेपाल माध्यमिक विद्यालय';
    const subNe = schoolProfile?.address || 'वृन्दावन न.पा.-२, विश्रामपुर, रौतहट';
    const estdNe = schoolProfile?.estYear ? `(स्था: ${schoolProfile.estYear})` : '(स्था: २००७)';
    const fyYear = activeFinancialYear?.year || getFiscalYearFromBS(todayBS());

    const selectedList = selectedTeacherIds
      .map((id) => {
        const row = bulkRows[id];
        if (!row) return null;
        const teacherObj = teachersData?.find((t: any) => t.id === id) || row;
        const calc = calculateRow(row);
        return { ...row, teacherObj, calc };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        const idA = a.teacherId || a.id || a.teacherObj?.id;
        const idB = b.teacherId || b.id || b.teacherObj?.id;
        if (staffSortOrder === 'selectionOrder') {
          const idxA = includedTeacherIds.indexOf(idA);
          const idxB = includedTeacherIds.indexOf(idB);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
        }
        if (staffSortOrder === 'displayOrder') {
          const orderA = a.teacherObj?.displayOrder !== null && a.teacherObj?.displayOrder !== undefined ? a.teacherObj.displayOrder : (idA || 999);
          const orderB = b.teacherObj?.displayOrder !== null && b.teacherObj?.displayOrder !== undefined ? b.teacherObj.displayOrder : (idB || 999);
          if (orderA !== orderB) return orderA - orderB;
        }
        if (staffSortOrder === 'hierarchy') {
          const rankA = getStaffRank(a.teacherObj || a);
          const rankB = getStaffRank(b.teacherObj || b);
          if (rankA !== rankB) return rankA - rankB;
          return (a.teacherId || a.id) - (b.teacherId || b.id);
        }
        if (staffSortOrder === 'id') {
          return (a.teacherId || a.id) - (b.teacherId || b.id);
        }
        if (staffSortOrder === 'name') {
          return (a.fullName || '').localeCompare(b.fullName || '');
        }
        return (a.teacherId || a.id) - (b.teacherId || b.id);
      });

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>नेपाल सरकार तलब तथा भत्ता भरपाई - ${schoolNe}</title>
          <style>
            @page { size: A4 landscape; margin: 8mm 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { 
              font-family: "Noto Sans Devanagari", "Kalimati", Arial, sans-serif; 
              margin: 0; 
              padding: 0; 
              background: #fff; 
              color: #000; 
              font-size: 10px; 
              line-height: 1.25;
            }
            .header-box { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 6px; }
            .school-title { font-size: 18px; font-weight: 900; margin: 0; color: #0b1f3a; }
            .school-sub { font-size: 11px; font-weight: bold; margin: 2px 0; }
            .doc-title { font-size: 13px; font-weight: 900; margin: 4px 0 2px 0; text-decoration: underline; }
            .meta-row { display: flex; justify-content: space-between; font-size: 10.5px; font-weight: bold; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 8.8px; }
            th, td { border: 1px solid #333; padding: 3px 2px; text-align: center; }
            th { background: #f1f5f9; font-weight: 900; }
            .text-left { text-align: left; padding-left: 4px; }
            .text-right { text-align: right; padding-right: 4px; font-family: monospace; }
            .bold { font-weight: 900; }
            .grand-total-row { background: #e2e8f0; font-weight: 900; }
            .footer-signatures { margin-top: 30px; display: flex; justify-content: space-between; font-size: 10.5px; font-weight: bold; }
            .sig-block { width: 220px; text-align: center; border-top: 1px dashed #000; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <h1 class="school-title">${schoolNe}</h1>
            <div class="school-sub">${subNe} ${estdNe}</div>
            <div class="doc-title">शिक्षक तथा कर्मचारीहरूको तलब तथा भत्ता भरपाई (GOVERNMENT PAYROLL REGISTER)</div>
            <div class="meta-row">
              <div>आर्थिक वर्ष: <strong>${fyYear}</strong></div>
              <div>अवधि (Period): <strong>${monthFromStr} देखि ${monthToStr} सम्म (${monthCount} महिना)</strong></div>
              <div>कुल संख्या: <strong>${selectedList.length} जना</strong></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th rowspan="2">क्र.सं.</th>
                <th rowspan="2" style="min-width: 100px;">कर्मचारीको नाम</th>
                <th rowspan="2">तह/दर्जा</th>
                <th rowspan="2">मूल तलब</th>
                <th colspan="3">ग्रेड (Grade)</th>
                <th rowspan="2">जम्मा तलब<br/>(ग्रेड सहित)</th>
                <th rowspan="2">क.सं. कोष<br/>थप १०%</th>
                <th rowspan="2">बीमा<br/>थप</th>
                <th rowspan="2">कुल तलब</th>
                <th colspan="5">भत्ताहरू (Allowances)</th>
                <th rowspan="2">जम्मा<br/>भत्ता</th>
                <th rowspan="2">जम्मा तलब<br/>भत्ता</th>
                <th rowspan="2">त्रैमासिक<br/>तलब भत्ता</th>
                <th colspan="3">विभिन्न कट्टी (Deductions)</th>
                <th rowspan="2">जम्मा<br/>कट्टी</th>
                <th rowspan="2">बाँकी पाउनु<br/>पर्ने</th>
                <th rowspan="2">चाडपर्व<br/>खर्च</th>
                <th rowspan="2">पोसाक<br/>भत्ता</th>
                <th rowspan="2">जम्मा<br/>रकम</th>
                <th rowspan="2">सा.सु. कर<br/>१% कट्टी</th>
                <th rowspan="2" style="background: #fef3c7; color: #92400e;">पेस्की<br/>कट्टी</th>
                <th rowspan="2">खुद भुक्तानी</th>
                <th rowspan="2" style="min-width: 65px;">दस्तखत<br/>(Signature)</th>
              </tr>
              <tr>
                <th>संख्या</th>
                <th>दर</th>
                <th>रकम</th>
                <th>प्र.अ. भत्ता</th>
                <th>महङ्गी भत्ता</th>
                <th>दुर्गम भत्ता</th>
                <th>प्रोत्साहन</th>
                <th>अन्य</th>
                <th>क.सं. कोष २०%</th>
                <th>सापट</th>
                <th>बीमा</th>
              </tr>
            </thead>
            <tbody>
              ${selectedList.map((item: any, idx: number) => {
                const c = item.calc;
                return `
                  <tr>
                    <td>${idx + 1}</td>
                    <td class="text-left bold">${item.fullNameNepali || item.fullName}</td>
                    <td>${item.taha || item.post}</td>
                    <td class="text-right">${c.A?.toLocaleString()}</td>
                    <td>${c.B}</td>
                    <td class="text-right">${c.C?.toLocaleString()}</td>
                    <td class="text-right">${c.D?.toLocaleString()}</td>
                    <td class="text-right bold">${c.E?.toLocaleString()}</td>
                    <td class="text-right">${c.F ? c.F.toLocaleString() : '-'}</td>
                    <td class="text-right">${c.G?.toLocaleString()}</td>
                    <td class="text-right bold">${c.H?.toLocaleString()}</td>
                    <td class="text-right">${c.I ? c.I.toLocaleString() : '-'}</td>
                    <td class="text-right">${c.J ? c.J.toLocaleString() : '-'}</td>
                    <td class="text-right">${c.K ? c.K.toLocaleString() : '-'}</td>
                    <td class="text-right">${c.L ? c.L.toLocaleString() : '-'}</td>
                    <td class="text-right">${c.M ? c.M.toLocaleString() : '-'}</td>
                    <td class="text-right bold">${c.N?.toLocaleString()}</td>
                    <td class="text-right bold">${c.O?.toLocaleString()}</td>
                    <td class="text-right bold" style="color: #0b1f3a;">${c.P?.toLocaleString()}</td>
                    <td class="text-right">${c.Q ? c.Q.toLocaleString() : '-'}</td>
                    <td class="text-right">${c.R ? c.R.toLocaleString() : '-'}</td>
                    <td class="text-right">${c.S?.toLocaleString()}</td>
                    <td class="text-right bold" style="color: #991b1b;">${c.T?.toLocaleString()}</td>
                    <td class="text-right bold">${c.U?.toLocaleString()}</td>
                    <td class="text-right">${c.V ? c.V.toLocaleString() : '-'}</td>
                    <td class="text-right">${c.W ? c.W.toLocaleString() : '-'}</td>
                    <td class="text-right bold">${c.X?.toLocaleString()}</td>
                    <td class="text-right">${c.Y?.toLocaleString()}</td>
                    <td class="text-right" style="color: #b45309; font-weight: bold;">${c.peshkiDeduction ? c.peshkiDeduction.toLocaleString() : '-'}</td>
                    <td class="text-right bold" style="color: #065f46; font-size: 9.5px;">${c.Z?.toLocaleString()}</td>
                    <td></td>
                  </tr>
                `;
              }).join('')}

              <tr class="grand-total-row">
                <td colspan="3" class="text-left bold">कुल जम्मा (GRAND TOTAL):</td>
                <td colspan="15"></td>
                <td class="text-right bold">रू ${grandTotals.totalGrossP.toLocaleString()}</td>
                <td colspan="3"></td>
                <td class="text-right bold">रू ${grandTotals.totalDeductionT.toLocaleString()}</td>
                <td></td>
                <td class="text-right bold">रू ${grandTotals.totalFestivalV.toLocaleString()}</td>
                <td class="text-right bold">रू ${grandTotals.totalDressW.toLocaleString()}</td>
                <td></td>
                <td class="text-right bold">रू ${grandTotals.totalTaxY.toLocaleString()}</td>
                <td class="text-right bold" style="color: #b45309;">${grandTotals.totalPeshkiDeduction ? 'रू ' + grandTotals.totalPeshkiDeduction.toLocaleString() : '-'}</td>
                <td class="text-right bold" style="font-size: 10px; color: #065f46;">रू ${grandTotals.totalNetZ.toLocaleString()}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <div class="footer-signatures">
            <div class="sig-block">
              तयार गर्ने (लेखापाल / कर्मचारी)<br/>
              मिति: ${todayBS()}
            </div>
            <div class="sig-block">
              जाँच गर्ने (प्रशासन / विद्यालय व्यवस्थापन समिति)<br/>
              मिति: ${todayBS()}
            </div>
            <div class="sig-block">
              स्वीकृत गर्ने (प्रधानाध्यापक)<br/>
              नाम: ${schoolProfile?.principalName || 'प्रेमलाल प्रसाद राउत'}
            </div>
          </div>

          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Export to CSV helper
  const exportToCsv = () => {
    const headers = [
      'S.N.', 'Teacher Name', 'Taha/Post', 'Basic Salary', 'Grade Count', 'Grade Rate',
      'Grade Amount', 'Gross Basic Salary', 'SSK 10% Contribution', 'Insurance Contribution', 'Monthly Gross Salary',
      'Total Allowances', 'Monthly Total', `Period Gross (${monthCount} Months)`, 'SSK 20% Deduction',
      'Loan Deduction', 'Insurance Deduction', 'Total Deductions', 'Net Basic', 'Festival Allowance', 'Dress Allowance',
      'Total Gross Payable', 'Social Security Tax 1%', 'Peshki Deduction', 'Net Payable Amount', 'Bank Account',
    ];

    const rows = selectedTeacherIds.map((id, idx) => {
      const row = bulkRows[id];
      const c = calculateRow(row);
      return [
        idx + 1,
        `"${row.fullName}"`,
        `"${row.taha || row.post}"`,
        c.A, c.B, c.C, c.D, c.E, c.F, c.G, c.H,
        c.N, c.O, c.P, c.Q, c.R, c.S, c.T, c.U, c.V, c.W, c.X, c.Y, c.peshkiDeduction || 0, c.Z,
        `"${row.bankAccountNo || 'N/A'}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Teacher_Payroll_${selectedYear}_${fromMonth}_to_${toMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── History Filtered Data & Totals ──
  const filteredPayrolls = useMemo(() => {
    let sourceList = payrollsData || [];
    if (selectedHistoryBatchKey && selectedBatchObj) {
      sourceList = selectedBatchObj.records;
    }

    const list = sourceList.filter((p: any) => {
      // 1. Fiscal Year filter (if not in a specific batch)
      if (!selectedHistoryBatchKey && historyFYFilter !== 'ALL' && p.financialYearId?.toString() !== historyFYFilter) {
        return false;
      }
      // 2. Year filter (BS)
      if (!selectedHistoryBatchKey && historyYearFilter !== 'ALL') {
        const fromYr = p.monthFrom?.slice(0, 4);
        const toYr = p.monthTo?.slice(0, 4);
        if (fromYr !== historyYearFilter && toYr !== historyYearFilter) {
          return false;
        }
      }
      // 3. Month From filter
      if (!selectedHistoryBatchKey && historyMonthFromFilter !== 'ALL') {
        const pFromM = p.monthFrom?.slice(5, 7) || p.monthFrom;
        if (pFromM && !pFromM.includes(historyMonthFromFilter)) {
          return false;
        }
      }
      // 4. Month To filter
      if (!selectedHistoryBatchKey && historyMonthToFilter !== 'ALL') {
        const pToM = p.monthTo?.slice(5, 7) || p.monthTo;
        if (pToM && !pToM.includes(historyMonthToFilter)) {
          return false;
        }
      }
      // 5. Category / Type filter
      if (historyCategoryFilter && historyCategoryFilter !== 'ALL') {
        if (historyCategoryFilter === 'TEACHING' && p.teacher?.shreni === 'NON_TEACHING') return false;
        if (historyCategoryFilter === 'NON_TEACHING' && p.teacher?.shreni !== 'NON_TEACHING') return false;
        if (historyCategoryFilter === 'GOVT') {
          const tUpper = (p.teacher?.type || '').toUpperCase();
          if (tUpper !== 'RASTRIYA' && tUpper !== 'PERMANENT' && !tUpper.includes('स्थायी')) return false;
        } else if (historyCategoryFilter === 'PRIVATE') {
          const tUpper = (p.teacher?.type || '').toUpperCase();
          if (tUpper === 'RASTRIYA' || tUpper === 'PERMANENT' || tUpper.includes('स्थायी')) return false;
        } else if (!['ALL', 'TEACHING', 'NON_TEACHING'].includes(historyCategoryFilter)) {
          if (p.teacher?.type !== historyCategoryFilter) return false;
        }
      }

      // 6. Search query
      if (historySearchStaff.trim()) {
        const q = historySearchStaff.toLowerCase();
        const match =
          p.teacher?.fullName?.toLowerCase().includes(q) ||
          p.teacher?.fullNameNepali?.toLowerCase().includes(q) ||
          p.teacher?.panNo?.toLowerCase().includes(q) ||
          p.taha?.toLowerCase().includes(q) ||
          p.shreni?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    return list.slice().sort((a: any, b: any) => {
      const teacherA = a.teacher || (teachersData || []).find((t: any) => t.id === a.teacherId) || a;
      const teacherB = b.teacher || (teachersData || []).find((t: any) => t.id === b.teacherId) || b;

      if (historySortOrder === 'name') {
        return (teacherA.fullName || '').localeCompare(teacherB.fullName || '');
      }
      if (historySortOrder === 'salaryDesc') {
        return (b.khudPaaunuParne || 0) - (a.khudPaaunuParne || 0);
      }
      if (historySortOrder === 'id') {
        return (a.teacherId || a.id) - (b.teacherId || b.id);
      }
      if (historySortOrder === 'displayOrder') {
        const orderA = teacherA?.displayOrder !== null && teacherA?.displayOrder !== undefined ? teacherA.displayOrder : 999;
        const orderB = teacherB?.displayOrder !== null && teacherB?.displayOrder !== undefined ? teacherB.displayOrder : 999;
        if (orderA !== orderB) return orderA - orderB;
      }

      // Default: Official School Hierarchy (मर्यादाक्रम: Principal -> Secondary -> Lower Sec -> Primary -> ECD -> Non-Teaching)
      const rankA = getStaffRank(teacherA);
      const rankB = getStaffRank(teacherB);
      if (rankA !== rankB) return rankA - rankB;

      const orderA = teacherA?.displayOrder !== null && teacherA?.displayOrder !== undefined ? teacherA.displayOrder : 999;
      const orderB = teacherB?.displayOrder !== null && teacherB?.displayOrder !== undefined ? teacherB.displayOrder : 999;
      if (orderA !== orderB) return orderA - orderB;

      return (a.teacherId || a.id) - (b.teacherId || b.id);
    });
  }, [
    payrollsData,
    teachersData,
    selectedHistoryBatchKey,
    selectedBatchObj,
    historySortOrder,
    historyFYFilter,
    historyYearFilter,
    historyMonthFromFilter,
    historyMonthToFilter,
    historyCategoryFilter,
    historySearchStaff,
  ]);

  const historyTotals = useMemo(() => {
    return filteredPayrolls.reduce(
      (acc: any, p: any) => {
        let parsedRemarks: any = {};
        try {
          if (p.remarks && typeof p.remarks === 'string' && p.remarks.startsWith('{')) {
            parsedRemarks = JSON.parse(p.remarks);
          }
        } catch (e) {}

        const fromM = p.monthFrom ? parseInt(p.monthFrom.split('-')[1] || '4') : 4;
        const toM = p.monthTo ? parseInt(p.monthTo.split('-')[1] || '6') : 6;
        let computedMonths = toM >= fromM ? toM - fromM + 1 : 12 - fromM + toM + 1;
        if (parsedRemarks?.monthCount) computedMonths = parsedRemarks.monthCount;

        const moolTalab = p.moolTalab || 0;
        const gradeNo = p.gradeNo || 0;
        const gradeAmount = p.gradeAmount || 0;
        const gradeRakam = p.gradeRakam || 0;
        const gradeSahitTalab = p.gradeSahitTalab || (moolTalab + gradeRakam);
        const karmachari10Pct = p.karmachari10Pct || 0;
        const bimaThap = parsedRemarks?.bimaThap !== undefined
          ? Number(parsedRemarks.bimaThap)
          : ((p.bimaKati || 0) > 0 ? (Number(p.bimaKati) / (2 * (computedMonths || 3))) : 0);
        const monthlyTalab = gradeSahitTalab + karmachari10Pct + bimaThap;

        const mahangiGhata = p.mahangiGhata || 0;
        const praABhata = (p.praABhata || 0) + (p.sahayakPraABhata || 0) + (p.prabiInchargeBhata || 0) + (p.mabiInchargeBhata || 0);
        const otherBhata = (p.otherBhata || 0) + (parsedRemarks?.durgamBhata || 0) + (parsedRemarks?.protsahanBhata || 0);
        const jammaBhata = p.jammaBhata || (mahangiGhata + praABhata + otherBhata);
        const jammaTalabBhata = p.jammaTalabBhata || (monthlyTalab + jammaBhata);

        const periodGross = p.traimasikTalan || (jammaTalabBhata * computedMonths);
        const ssk20Pct = p.ssk20Pct || 0;
        const loan = p.karmachariKoshSapati || 0;
        const bimaKati = p.bimaKati || 0;
        const jammaKati = p.jammaKati || (ssk20Pct + loan + bimaKati);
        const bakiPaaunu = p.bakiPaaunuParne || (periodGross - jammaKati);
        const chaadparba = p.chaadparbaKharcha || 0;
        const poshak = p.poshakBhata || parsedRemarks?.poshakBhata || 0;
        const kulRakam = p.kulRakam || (bakiPaaunu + chaadparba + poshak);
        const tax1 = p.samajikSurakshaKar1Pct || 0;
        const peshki = p.peshkiDeduction || p.peshkiKati || 0;
        const netPayable = p.khudPaaunuParne || (kulRakam - tax1 - peshki);

        acc.count += 1;
        acc.totalBasic += moolTalab;
        acc.totalGrade += gradeRakam;
        acc.totalGradeSahitTalab += gradeSahitTalab;
        acc.totalKs10 += karmachari10Pct;
        acc.totalBimaThap += bimaThap;
        acc.totalMonthlyBasicGross += monthlyTalab;
        acc.totalMahangi += mahangiGhata;
        acc.totalPraA += praABhata;
        acc.totalOtherBhata += otherBhata;
        acc.totalJammaBhata += jammaBhata;
        acc.totalMonthlyGross += jammaTalabBhata;
        acc.totalGross += periodGross;
        acc.totalPF20 += ssk20Pct;
        acc.totalLoan += loan;
        acc.totalInsurance += bimaKati;
        acc.totalDeductions += jammaKati;
        acc.totalBakiPaaunu += bakiPaaunu;
        acc.totalFestival += chaadparba;
        acc.totalDress += poshak;
        acc.totalKulRakam += kulRakam;
        acc.totalTax1 += tax1;
        acc.totalPeshki += peshki;
        acc.totalNetPayable += netPayable;
        return acc;
      },
      {
        count: 0,
        totalBasic: 0,
        totalGrade: 0,
        totalGradeSahitTalab: 0,
        totalKs10: 0,
        totalBimaThap: 0,
        totalMonthlyBasicGross: 0,
        totalMahangi: 0,
        totalPraA: 0,
        totalOtherBhata: 0,
        totalJammaBhata: 0,
        totalMonthlyGross: 0,
        totalGross: 0,
        totalPF20: 0,
        totalLoan: 0,
        totalInsurance: 0,
        totalDeductions: 0,
        totalBakiPaaunu: 0,
        totalFestival: 0,
        totalDress: 0,
        totalKulRakam: 0,
        totalTax1: 0,
        totalPeshki: 0,
        totalNetPayable: 0,
      }
    );
  }, [filteredPayrolls]);

  // ── Missing / Un-added Staff for Current History View / Batch ──
  const unaddedTeachersInHistory = useMemo(() => {
    if (!teachersData || teachersData.length === 0) return [];
    const addedIds = new Set(filteredPayrolls.map((p: any) => p.teacherId));
    return teachersData.filter((t: any) => !addedIds.has(t.id));
  }, [teachersData, filteredPayrolls]);

  // ── History Official Bharpai Print ──
  const triggerPrintHistoryBharpai = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const schoolNe = schoolProfile?.nameNepali || 'नेपाल माध्यमिक विद्यालय';
    const subNe = schoolProfile?.address || 'वृन्दावन न.पा.-२, विश्रामपुर, रौतहट';
    const estdNe = schoolProfile?.estYear ? `(स्था: ${schoolProfile.estYear})` : '(स्था: २००७)';
    const fyObj = financialYearsData?.find((f: any) => f.id.toString() === historyFYFilter);
    const fyYear = fyObj ? `आ.व. ${fyObj.year}` : (historyFYFilter === 'ALL' ? 'सबै आर्थिक वर्षहरू' : `आ.व. ${activeFinancialYear?.year || ''}`);

    const periodFilterText =
      historyMonthFromFilter !== 'ALL' || historyMonthToFilter !== 'ALL'
        ? `${historyYearFilter !== 'ALL' ? historyYearFilter : ''} ${getNepaliMonthName(historyMonthFromFilter)} देखि ${getNepaliMonthName(historyMonthToFilter)} सम्म`
        : (historyYearFilter !== 'ALL' ? `वर्ष ${historyYearFilter} BS` : 'सम्पूर्ण अवधि');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>नेपाल सरकार तलब तथा भत्ता भरपाई प्रतिवेदन - ${schoolNe}</title>
          <style>
            @page { size: A4 landscape; margin: 8mm 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { 
              font-family: "Noto Sans Devanagari", "Kalimati", Arial, sans-serif; 
              margin: 0; 
              padding: 0; 
              background: #fff; 
              color: #000; 
              font-size: 9.5px; 
              line-height: 1.25;
            }
            .header-box { text-align: center; margin-bottom: 8px; border-bottom: 2px solid #000; padding-bottom: 5px; }
            .school-title { font-size: 17px; font-weight: 900; margin: 0; color: #0b1f3a; }
            .school-sub { font-size: 10.5px; font-weight: bold; margin: 2px 0; }
            .doc-title { font-size: 12px; font-weight: 900; margin: 3px 0 2px 0; text-decoration: underline; }
            .meta-row { display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; margin-top: 3px; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 8px; }
            th, td { border: 1px solid #333; padding: 2.5px 1.5px; text-align: center; }
            th { background: #f1f5f9; font-weight: 900; }
            .text-left { text-align: left; padding-left: 3px; }
            .text-right { text-align: right; padding-right: 3px; font-family: monospace; }
            .bold { font-weight: 900; }
            .grand-total-row { background: #e2e8f0; font-weight: 900; }
            .footer-signatures { margin-top: 30px; display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; }
            .sig-block { width: 190px; text-align: center; border-top: 1px dashed #000; padding-top: 4px; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <h1 class="school-title">${schoolNe}</h1>
            <div class="school-sub">${subNe} ${estdNe}</div>
            <div class="doc-title">शिक्षक तथा कर्मचारी तलब निकासा भरपाई प्रतिवेदन (GOVERNMENT PAYROLL REGISTER)</div>
            <div class="meta-row">
              <div>आर्थिक वर्ष: <strong>${fyYear}</strong></div>
              <div>अवधि / फिल्टर: <strong>${periodFilterText}</strong></div>
              <div>कुल संख्या: <strong>${filteredPayrolls.length} जना</strong></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th rowspan="2">क्र.सं.</th>
                <th rowspan="2" style="min-width: 90px;">कर्मचारीको नाम</th>
                <th rowspan="2">तह/दर्जा</th>
                <th rowspan="2">अवधि</th>
                <th rowspan="2">मूल तलब</th>
                <th colspan="3">ग्रेड (Grade)</th>
                <th rowspan="2">जम्मा तलब<br/>(ग्रेड सहित)</th>
                <th rowspan="2">क.सं. कोष<br/>१०% थप</th>
                <th rowspan="2">बीमा<br/>थप</th>
                <th rowspan="2">कुल मासिक<br/>तलब</th>
                <th colspan="4">भत्ताहरू (Allowances)</th>
                <th rowspan="2">मासिक<br/>जम्मा</th>
                <th rowspan="2">निकासा तलब<br/>भत्ता</th>
                <th colspan="4">कट्टी विवरण (Deductions)</th>
                <th rowspan="2">बाँकी पाउनु<br/>पर्ने</th>
                <th colspan="2">अन्य सुविधाहरू</th>
                <th rowspan="2">जम्मा पाउनु<br/>पर्ने</th>
                <th rowspan="2">सा.सु. कर<br/>१%</th>
                <th rowspan="2">पेस्की<br/>कट्टी</th>
                <th rowspan="2">खुद भुक्तानी<br/>रकम</th>
                <th rowspan="2">बैंक खाता नं.</th>
                <th rowspan="2" style="min-width: 45px;">दस्तखत</th>
              </tr>
              <tr>
                <th>संख्या</th>
                <th>दर</th>
                <th>रकम</th>
                <th>महङ्गी</th>
                <th>प्र.अ.</th>
                <th>अन्य</th>
                <th>जम्मा</th>
                <th>कोष २०%</th>
                <th>सापट</th>
                <th>बीमा</th>
                <th>जम्मा</th>
                <th>चाडपर्व</th>
                <th>पोसाक</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPayrolls.map((p: any, idx: number) => {
                let parsedRemarks: any = {};
                try {
                  if (p.remarks && typeof p.remarks === 'string' && p.remarks.startsWith('{')) {
                    parsedRemarks = JSON.parse(p.remarks);
                  }
                } catch (e) {}

                const periodInfo = formatPayrollPeriod(p.monthFrom, p.monthTo);
                const fromM = p.monthFrom ? parseInt(p.monthFrom.split('-')[1] || '4') : 4;
                const toM = p.monthTo ? parseInt(p.monthTo.split('-')[1] || '6') : 6;
                let computedMonths = toM >= fromM ? toM - fromM + 1 : 12 - fromM + toM + 1;
                if (parsedRemarks?.monthCount) computedMonths = parsedRemarks.monthCount;

                const moolTalab = p.moolTalab || 0;
                const gradeNo = p.gradeNo || 0;
                const gradeAmount = p.gradeAmount || 0;
                const gradeRakam = p.gradeRakam || 0;
                const gradeSahitTalab = p.gradeSahitTalab || (moolTalab + gradeRakam);
                const karmachari10Pct = p.karmachari10Pct || 0;
                const bimaThap = parsedRemarks?.bimaThap !== undefined
                  ? Number(parsedRemarks.bimaThap)
                  : ((p.bimaKati || 0) > 0 ? (Number(p.bimaKati) / (2 * (computedMonths || 3))) : 0);
                const monthlyTalab = gradeSahitTalab + karmachari10Pct + bimaThap;

                const mahangiGhata = p.mahangiGhata || 0;
                const praABhata = (p.praABhata || 0) + (p.sahayakPraABhata || 0) + (p.prabiInchargeBhata || 0) + (p.mabiInchargeBhata || 0);
                const otherBhata = (p.otherBhata || 0) + (parsedRemarks?.durgamBhata || 0) + (parsedRemarks?.protsahanBhata || 0);
                const jammaBhata = p.jammaBhata || (mahangiGhata + praABhata + otherBhata);
                const jammaTalabBhata = p.jammaTalabBhata || (monthlyTalab + jammaBhata);

                const periodGross = p.traimasikTalan || (jammaTalabBhata * computedMonths);
                const ssk20Pct = p.ssk20Pct || 0;
                const loan = p.karmachariKoshSapati || 0;
                const bimaKati = p.bimaKati || 0;
                const jammaKati = p.jammaKati || (ssk20Pct + loan + bimaKati);
                const bakiPaaunu = p.bakiPaaunuParne || (periodGross - jammaKati);
                const chaadparba = p.chaadparbaKharcha || 0;
                const poshak = p.poshakBhata || parsedRemarks?.poshakBhata || 0;
                const kulRakam = p.kulRakam || (bakiPaaunu + chaadparba + poshak);
                const tax1 = p.samajikSurakshaKar1Pct || 0;
                const peshki = p.peshkiDeduction || p.peshkiKati || 0;
                const netPayable = p.khudPaaunuParne || (kulRakam - tax1 - peshki);

                return `
                  <tr>
                    <td>${idx + 1}</td>
                    <td class="text-left bold">${p.teacher?.fullNameNepali || p.teacher?.fullName || '—'}</td>
                    <td>${p.taha || ''}</td>
                    <td>${periodInfo.text}</td>
                    <td class="text-right">${moolTalab ? moolTalab.toLocaleString() : '-'}</td>
                    <td>${gradeNo || '-'}</td>
                    <td class="text-right">${gradeAmount ? gradeAmount.toLocaleString() : '-'}</td>
                    <td class="text-right">${gradeRakam ? gradeRakam.toLocaleString() : '-'}</td>
                    <td class="text-right bold">${gradeSahitTalab.toLocaleString()}</td>
                    <td class="text-right">${karmachari10Pct ? karmachari10Pct.toLocaleString() : '-'}</td>
                    <td class="text-right">${bimaThap ? bimaThap.toLocaleString() : '-'}</td>
                    <td class="text-right bold">${monthlyTalab.toLocaleString()}</td>
                    <td class="text-right">${mahangiGhata ? mahangiGhata.toLocaleString() : '-'}</td>
                    <td class="text-right">${praABhata ? praABhata.toLocaleString() : '-'}</td>
                    <td class="text-right">${otherBhata ? otherBhata.toLocaleString() : '-'}</td>
                    <td class="text-right bold">${jammaBhata ? jammaBhata.toLocaleString() : '-'}</td>
                    <td class="text-right bold">${jammaTalabBhata.toLocaleString()}</td>
                    <td class="text-right bold" style="color: #0b1f3a;">${periodGross.toLocaleString()}</td>
                    <td class="text-right">${ssk20Pct ? ssk20Pct.toLocaleString() : '-'}</td>
                    <td class="text-right">${loan ? loan.toLocaleString() : '-'}</td>
                    <td class="text-right">${bimaKati ? bimaKati.toLocaleString() : '-'}</td>
                    <td class="text-right bold" style="color: #991b1b;">${jammaKati.toLocaleString()}</td>
                    <td class="text-right bold">${bakiPaaunu.toLocaleString()}</td>
                    <td class="text-right">${chaadparba ? chaadparba.toLocaleString() : '-'}</td>
                    <td class="text-right">${poshak ? poshak.toLocaleString() : '-'}</td>
                    <td class="text-right bold">${kulRakam.toLocaleString()}</td>
                    <td class="text-right">${tax1 ? tax1.toLocaleString() : '-'}</td>
                    <td class="text-right" style="color: #b45309; font-weight: bold;">${peshki ? peshki.toLocaleString() : '-'}</td>
                    <td class="text-right bold" style="color: #065f46; font-size: 8.5px;">${netPayable.toLocaleString()}</td>
                    <td class="text-left" style="font-size: 7.5px;">${p.teacher?.bankAccountNo || '—'}</td>
                    <td></td>
                  </tr>
                `;
              }).join('')}

              <tr class="grand-total-row">
                <td colspan="4" class="text-left bold">कुल जम्मा (GRAND TOTAL: ${historyTotals.count} जना):</td>
                <td class="text-right bold">रू ${historyTotals.totalBasic.toLocaleString()}</td>
                <td></td>
                <td></td>
                <td class="text-right bold">रू ${historyTotals.totalGrade.toLocaleString()}</td>
                <td class="text-right bold">रू ${historyTotals.totalGradeSahitTalab.toLocaleString()}</td>
                <td class="text-right bold">रू ${historyTotals.totalKs10.toLocaleString()}</td>
                <td class="text-right bold">रू ${historyTotals.totalBimaThap.toLocaleString()}</td>
                <td class="text-right bold">रू ${historyTotals.totalMonthlyBasicGross.toLocaleString()}</td>
                <td class="text-right bold">रू ${historyTotals.totalMahangi.toLocaleString()}</td>
                <td class="text-right bold">रू ${historyTotals.totalPraA.toLocaleString()}</td>
                <td class="text-right bold">रू ${historyTotals.totalOtherBhata.toLocaleString()}</td>
                <td class="text-right bold">रू ${historyTotals.totalJammaBhata.toLocaleString()}</td>
                <td class="text-right bold">रू ${historyTotals.totalMonthlyGross.toLocaleString()}</td>
                <td class="text-right bold" style="color: #0b1f3a;">रू ${historyTotals.totalGross.toLocaleString()}</td>
                <td class="text-right bold">रू ${historyTotals.totalPF20.toLocaleString()}</td>
                <td class="text-right bold">रू ${historyTotals.totalLoan.toLocaleString()}</td>
                <td class="text-right bold">रू ${historyTotals.totalInsurance.toLocaleString()}</td>
                <td class="text-right bold" style="color: #991b1b;">रू ${historyTotals.totalDeductions.toLocaleString()}</td>
                <td class="text-right bold">रू ${historyTotals.totalBakiPaaunu.toLocaleString()}</td>
                <td class="text-right bold">रू ${historyTotals.totalFestival.toLocaleString()}</td>
                <td class="text-right bold">रू ${historyTotals.totalDress.toLocaleString()}</td>
                <td class="text-right bold">रू ${historyTotals.totalKulRakam.toLocaleString()}</td>
                <td class="text-right bold">रू ${historyTotals.totalTax1.toLocaleString()}</td>
                <td class="text-right bold" style="color: #b45309;">${historyTotals.totalPeshki ? 'रू ' + historyTotals.totalPeshki.toLocaleString() : '-'}</td>
                <td class="text-right bold" style="font-size: 9.5px; color: #065f46;">रू ${historyTotals.totalNetPayable.toLocaleString()}</td>
                <td colspan="2"></td>
              </tr>
            </tbody>
          </table>

          <div class="footer-signatures">
            <div class="sig-block">
              तयार गर्ने (लेखापाल)<br/>
              नाम: .......................................<br/>
              मिति: ${todayBS()}
            </div>
            <div class="sig-block">
              जाँच गर्ने (आन्तरिक लेखापरीक्षक)<br/>
              नाम: .......................................<br/>
              मिति: ${todayBS()}
            </div>
            <div class="sig-block">
              स्वीकृत गर्ने (प्रधानाध्यापक)<br/>
              नाम: ${schoolProfile?.principalName || 'प्रेमलाल प्रसाद राउत'}<br/>
              मिति: ${todayBS()}
            </div>
            <div class="sig-block">
              प्रमाणित गर्ने (वि.व्य.स. अध्यक्ष)<br/>
              नाम: .......................................<br/>
              मिति: ${todayBS()}
            </div>
          </div>

          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // ── History Export to CSV ──
  const exportHistoryToCsv = () => {
    const headers = [
      'S.N.', 'Teacher Name', 'Nepali Name', 'Category', 'Taha/Post', 'Period', 'Months',
      'Basic Salary [A]', 'Grade Count [B]', 'Grade Rate [C]', 'Grade Amount [D]', 'Salary With Grade [E]',
      'PF 10% Contribution [F]', 'Insurance Addition [G]', 'Total Monthly Salary [H]',
      'Dearness Allowance [I]', 'Principal/Incharge Allowance [J]', 'Other Allowance [K]', 'Total Allowance [N]',
      'Monthly Gross [O]', 'Period Gross [P]',
      'PF 20% Deduction [Q]', 'PF Loan Deduction [R]', 'Insurance Deduction [S]', 'Total Deduction [T]',
      'Balance Payable [U]', 'Festival Expense [V]', 'Dress Allowance [W]', 'Gross Before Tax [X]',
      'Social Security Tax 1% [Y]', 'Peshki Deduction', 'Net Payable [Z]',
      'Bank Account No', 'Status',
    ];

    const rows = filteredPayrolls.map((p: any, idx: number) => {
      let parsedRemarks: any = {};
      try {
        if (p.remarks && typeof p.remarks === 'string' && p.remarks.startsWith('{')) {
          parsedRemarks = JSON.parse(p.remarks);
        }
      } catch (e) {}

      const fromM = p.monthFrom ? parseInt(p.monthFrom.split('-')[1] || '4') : 4;
      const toM = p.monthTo ? parseInt(p.monthTo.split('-')[1] || '6') : 6;
      let computedMonths = toM >= fromM ? toM - fromM + 1 : 12 - fromM + toM + 1;
      if (parsedRemarks?.monthCount) computedMonths = parsedRemarks.monthCount;

      const periodInfo = formatPayrollPeriod(p.monthFrom, p.monthTo);
      const moolTalab = p.moolTalab || 0;
      const gradeNo = p.gradeNo || 0;
      const gradeAmount = p.gradeAmount || 0;
      const gradeRakam = p.gradeRakam || 0;
      const gradeSahitTalab = p.gradeSahitTalab || (moolTalab + gradeRakam);
      const karmachari10Pct = p.karmachari10Pct || 0;
      const bimaThap = parsedRemarks?.bimaThap !== undefined
        ? Number(parsedRemarks.bimaThap)
        : ((p.bimaKati || 0) > 0 ? (Number(p.bimaKati) / (2 * (computedMonths || 3))) : 0);
      const monthlyTalab = gradeSahitTalab + karmachari10Pct + bimaThap;

      const mahangiGhata = p.mahangiGhata || 0;
      const praABhata = (p.praABhata || 0) + (p.sahayakPraABhata || 0) + (p.prabiInchargeBhata || 0) + (p.mabiInchargeBhata || 0);
      const otherBhata = (p.otherBhata || 0) + (parsedRemarks?.durgamBhata || 0) + (parsedRemarks?.protsahanBhata || 0);
      const jammaBhata = p.jammaBhata || (mahangiGhata + praABhata + otherBhata);
      const jammaTalabBhata = p.jammaTalabBhata || (monthlyTalab + jammaBhata);

      const periodGross = p.traimasikTalan || (jammaTalabBhata * computedMonths);
      const ssk20Pct = p.ssk20Pct || 0;
      const loan = p.karmachariKoshSapati || 0;
      const bimaKati = p.bimaKati || 0;
      const jammaKati = p.jammaKati || (ssk20Pct + loan + bimaKati);
      const bakiPaaunu = p.bakiPaaunuParne || (periodGross - jammaKati);
      const chaadparba = p.chaadparbaKharcha || 0;
      const poshak = p.poshakBhata || parsedRemarks?.poshakBhata || 0;
      const kulRakam = p.kulRakam || (bakiPaaunu + chaadparba + poshak);
      const tax1 = p.samajikSurakshaKar1Pct || 0;
      const peshki = p.peshkiDeduction || p.peshkiKati || 0;
      const netPayable = p.khudPaaunuParne || (kulRakam - tax1 - peshki);

      return [
        idx + 1,
        `"${p.teacher?.fullName || ''}"`,
        `"${p.teacher?.fullNameNepali || ''}"`,
        `"${p.teacher?.type === 'RASTRIYA' ? 'Government' : 'School Source'}"`,
        `"${p.taha || ''} ${p.shreni || ''}"`,
        `"${periodInfo.text}"`,
        computedMonths,
        moolTalab,
        gradeNo,
        gradeAmount,
        gradeRakam,
        gradeSahitTalab,
        karmachari10Pct,
        bimaThap,
        monthlyTalab,
        mahangiGhata,
        praABhata,
        otherBhata,
        jammaBhata,
        jammaTalabBhata,
        periodGross,
        ssk20Pct,
        loan,
        bimaKati,
        jammaKati,
        bakiPaaunu,
        chaadparba,
        poshak,
        kulRakam,
        tax1,
        peshki,
        netPayable,
        `"${p.teacher?.bankAccountNo || 'N/A'}"`,
        `"${p.status || 'DRAFT'}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Teacher_Payroll_History_${todayBS()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Print Individual Pay Slip (Clean, Official School Voucher) ──
  const triggerPrintIndividualSlip = (slip: any) => {
    if (!slip) return;
    const printWin = window.open('', '_blank', 'width=850,height=950');
    if (!printWin) {
      alert('कृपया प्रिन्ट विन्डो खोल्न पप-अप अनुमति दिनुहोस् (Please allow popups for printing).');
      return;
    }

    const schoolNe = schoolProfile?.nameNepali || 'नेपाल माध्यमिक विद्यालय';
    const subNe = schoolProfile?.address || 'रौतहट';
    const estdNe = schoolProfile?.establishedYear ? `(स्था: ${schoolProfile.establishedYear})` : '';
    const periodInfo = formatPayrollPeriod(slip.monthFrom, slip.monthTo);

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>तलब भुक्तानी स्लिप - ${slip.teacher?.fullNameNepali || slip.teacher?.fullName || 'Teacher'}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm 15mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { 
              font-family: "Noto Sans Devanagari", "Kalimati", Arial, sans-serif; 
              margin: 0; 
              padding: 0; 
              background: #fff; 
              color: #000; 
              font-size: 12px; 
              line-height: 1.4;
            }
            .slip-card {
              border: 2px solid #1e3a5f;
              border-radius: 8px;
              padding: 24px;
              max-width: 650px;
              margin: 0 auto;
            }
            .header-box { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; }
            .school-title { font-size: 20px; font-weight: 900; margin: 0; color: #0b1f3a; }
            .school-sub { font-size: 12px; font-weight: bold; margin: 3px 0; color: #475569; }
            .doc-title { 
              font-size: 13.5px; 
              font-weight: 900; 
              margin: 8px auto 4px auto; 
              background: #1e3a5f; 
              color: #fff; 
              display: inline-block; 
              padding: 3px 18px; 
              border-radius: 4px;
            }
            .meta-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 8px 16px; 
              background: #f8fafc; 
              border: 1px solid #e2e8f0; 
              padding: 12px 16px; 
              border-radius: 6px; 
              margin-bottom: 16px;
              font-size: 11.5px;
            }
            .meta-item { display: flex; justify-content: space-between; }
            .meta-label { color: #64748b; font-weight: bold; }
            .meta-val { font-weight: 800; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11.5px; }
            th, td { border: 1px solid #cbd5e1; padding: 7px 12px; }
            th { background: #f1f5f9; font-weight: 900; color: #1e293b; }
            .text-left { text-align: left; }
            .text-right { text-align: right; font-family: monospace; font-size: 12px; }
            .bold { font-weight: 900; }
            .net-box {
              background: #ecfdf5;
              border: 2px solid #059669;
              padding: 12px 16px;
              border-radius: 6px;
              margin-top: 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 14px;
              font-weight: 900;
              color: #065f46;
            }
            .footer-signatures { margin-top: 50px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; }
            .sig-block { width: 170px; text-align: center; border-top: 1px dashed #000; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="slip-card">
            <div class="header-box">
              <h1 class="school-title">${schoolNe}</h1>
              <div class="school-sub">${subNe} ${estdNe}</div>
              <div class="doc-title">शिक्षक तथा कर्मचारी तलब भुक्तानी स्लिप (PAY SLIP)</div>
            </div>

            <div class="meta-grid">
              <div class="meta-item"><span class="meta-label">कर्मचारीको नाम:</span> <span class="meta-val">${slip.teacher?.fullNameNepali || slip.teacher?.fullName || '—'}</span></div>
              <div class="meta-item"><span class="meta-label">पद / तह:</span> <span class="meta-val">${slip.taha || ''} ${slip.shreni ? '(' + slip.shreni + ')' : ''}</span></div>
              <div class="meta-item"><span class="meta-label">भुक्तानी अवधि:</span> <span class="meta-val">${periodInfo.text}</span></div>
              <div class="meta-item"><span class="meta-label">आर्थिक वर्ष:</span> <span class="meta-val">${slip.financialYear?.name || 'चालु आ.व.'}</span></div>
              <div class="meta-item"><span class="meta-label">स्थायी लेखा नं. (PAN):</span> <span class="meta-val">${slip.teacher?.panNo || 'N/A'}</span></div>
              <div class="meta-item"><span class="meta-label">बैंक खाता नं.:</span> <span class="meta-val">${slip.teacher?.bankAccountNo || 'बैंक दाखिला'}</span></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th class="text-left">विवरण (Salary & Allowance Description)</th>
                  <th class="text-right">रकम (रू)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="text-left">मूल तलब (Basic Salary)</td>
                  <td class="text-right">${(slip.moolTalab || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td class="text-left">ग्रेड रकम (${slip.gradeNo || 0} ग्रेड)</td>
                  <td class="text-right">${(slip.gradeRakam || 0).toLocaleString()}</td>
                </tr>
                <tr style="background: #f8fafc;">
                  <td class="text-left bold">जम्मा तलब (ग्रेड सहित)</td>
                  <td class="text-right bold">${(slip.gradeSahitTalab || 0).toLocaleString()}</td>
                </tr>
                ${(slip.jammaBhata || 0) > 0 ? `
                  <tr>
                    <td class="text-left">जम्मा भत्ताहरू (Allowances)</td>
                    <td class="text-right">${(slip.jammaBhata || 0).toLocaleString()}</td>
                  </tr>
                ` : ''}
                <tr style="background: #f1f5f9;">
                  <td class="text-left bold" style="color: #0b1f3a;">कुल तलब भत्ता (Period Gross)</td>
                  <td class="text-right bold" style="color: #0b1f3a;">${(slip.traimasikTalan || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td class="text-left" style="color: #991b1b;">कर्मचारी सञ्चय कोष २०% कट्टी</td>
                  <td class="text-right" style="color: #991b1b;">- ${(slip.ssk20Pct || 0).toLocaleString()}</td>
                </tr>
                ${(slip.karmachariKoshSapati || 0) > 0 ? `
                  <tr>
                    <td class="text-left" style="color: #991b1b;">क.सं. कोष सापट कट्टी</td>
                    <td class="text-right" style="color: #991b1b;">- ${(slip.karmachariKoshSapati || 0).toLocaleString()}</td>
                  </tr>
                ` : ''}
                ${(slip.bimaKati || 0) > 0 ? `
                  <tr>
                    <td class="text-left" style="color: #991b1b;">बीमा कट्टी (सावधिक जीवन बीमा)</td>
                    <td class="text-right" style="color: #991b1b;">- ${(slip.bimaKati || 0).toLocaleString()}</td>
                  </tr>
                ` : ''}
                <tr style="background: #fef2f2;">
                  <td class="text-left bold" style="color: #991b1b;">जम्मा कट्टी (Total Deductions)</td>
                  <td class="text-right bold" style="color: #991b1b;">- ${(slip.jammaKati || 0).toLocaleString()}</td>
                </tr>
                ${(slip.chaadparbaKharcha || 0) > 0 ? `
                  <tr>
                    <td class="text-left" style="color: #6b21a8;">चाडपर्व खर्च (दसैं भत्ता)</td>
                    <td class="text-right" style="color: #6b21a8;">+ ${(slip.chaadparbaKharcha || 0).toLocaleString()}</td>
                  </tr>
                ` : ''}
                ${(slip.poshakBhata || 0) > 0 ? `
                  <tr>
                    <td class="text-left" style="color: #1e3a5f;">पोसाक भत्ता</td>
                    <td class="text-right" style="color: #1e3a5f;">+ ${(slip.poshakBhata || 0).toLocaleString()}</td>
                  </tr>
                ` : ''}
                <tr>
                  <td class="text-left" style="color: #92400e;">सामाजिक सुरक्षा कर १%</td>
                  <td class="text-right" style="color: #92400e;">- ${(slip.samajikSurakshaKar1Pct || 0).toLocaleString()}</td>
                </tr>
                ${(slip.peshkiDeduction || slip.peshkiKati || 0) > 0 ? `
                  <tr style="background: #fffbeb;">
                    <td class="text-left bold" style="color: #b45309;">पेस्की कट्टी (Salary Advance Deduction)</td>
                    <td class="text-right bold" style="color: #b45309;">- ${((slip.peshkiDeduction || slip.peshkiKati || 0)).toLocaleString()}</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>

            <div class="net-box">
              <span>खुद भुक्तानी रकम (Net Payable):</span>
              <span>रू ${(slip.khudPaaunuParne || 0).toLocaleString()}</span>
            </div>

            <div class="footer-signatures">
              <div class="sig-block">
                तयार गर्ने (लेखापाल)<br/>
                मिति: ${todayBS()}
              </div>
              <div class="sig-block">
                स्वीकृत गर्ने (प्रधानाध्यापक)<br/>
                नाम: ${schoolProfile?.principalName || 'प्रेमलाल प्रसाद राउत'}
              </div>
              <div class="sig-block">
                बुझिलिने (कर्मचारी दस्तखत)<br/>
                मिति: ........................
              </div>
            </div>
          </div>

          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f] flex items-center gap-2">
            <Wallet className="text-[#1e3a5f]" />
            <span>{l('शिक्षक तथा कर्मचारी तलब निकासा', 'Government Teacher & Staff Payroll', 'Government Teacher & Staff Payroll (शिक्षक तथा कर्मचारी तलब निकासा)')}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {l(
              'नेपाल सरकारको आधिकारिक नियमानुसार: ग्रेड, भत्ता, १०% क.सं. कोष थप, बीमा, २०% कट्टी, १% सा.सु. कर र खुद बैंक भुक्तानी',
              'Official Government Scale: Grade, Allowances, 10% SSK Add, Insurance, 20% Deductions, 1% SST, and Net Bank Disbursement'
            )}
          </p>
        </div>

        {/* Top 5 Navigation Tabs */}
        <div className="flex flex-wrap rounded-xl bg-slate-200/80 p-1 text-xs font-bold gap-1 shadow-inner">
          <button
            onClick={() => setActiveTab('bulk')}
            className={`rounded-lg px-3 py-1.5 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'bulk' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <Calculator size={14} />
            <span>{l('एकमुष्ट भरपाई', 'Bulk Payroll Sheet', 'Bulk Payroll Sheet (एकमुष्ट भरपाई)')}</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`rounded-lg px-3 py-1.5 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <BookOpen size={14} />
            <span>{l('निकासा इतिहास', 'Payroll History', 'Payroll History (निकासा इतिहास)')}</span>
          </button>
          <button
            onClick={() => setActiveTab('peshki')}
            className={`rounded-lg px-3 py-1.5 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'peshki' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <Wallet size={14} className={activeTab === 'peshki' ? 'text-amber-400' : 'text-purple-700'} />
            <span>{l('पेस्की व्यवस्थापन', 'Salary Advance', 'Salary Advance (पेस्की व्यवस्थापन)')}</span>
          </button>
          <button
            onClick={() => setActiveTab('bank-letter')}
            className={`rounded-lg px-3 py-1.5 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'bank-letter' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <Building size={14} className={activeTab === 'bank-letter' ? 'text-amber-400' : 'text-emerald-700'} />
            <span>{l('बैंक ट्रान्सफर पत्र', 'Bank Letter', 'Bank Letter (बैंक रकम ट्रान्सफर पत्र)')}</span>
          </button>
          <button
            onClick={() => setActiveTab('scales')}
            className={`rounded-lg px-3 py-1.5 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'scales' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <Settings size={14} />
            <span>{l('तलब स्केल', 'Salary Scales & Grades', 'Salary Scales & Grades (तलब स्केल)')}</span>
          </button>
        </div>
      </div>

      {/* ════════════════════ TAB 1: BULK DATA ENTRY & BHARPAI ════════════════════ */}
      {activeTab === 'bulk' && (
        <div className="space-y-3.5">
          {/* Step 1: Period & Global Controls Strip */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs space-y-2.5">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-gray-100 pb-2.5">
              {/* Year & Month Selectors */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-800">
                {/* 1. Fiscal Year (आर्थिक वर्ष) */}
                <div className="flex items-center gap-1.5 bg-blue-50/90 px-2.5 py-1 rounded-xl border border-blue-200">
                  <Calendar size={14} className="text-[#1e3a5f]" />
                  <span className="text-[#1e3a5f]">{l('आर्थिक वर्ष:', 'Fiscal Year:')}</span>
                  <select
                    value={selectedFYId || activeFinancialYear?.id?.toString() || ''}
                    onChange={(e) => {
                      const fyId = e.target.value;
                      setSelectedFYId(fyId);
                      const fy = financialYearsData?.find((f: any) => f.id.toString() === fyId);
                      if (fy) {
                        const yrMatch = fy.year?.match(/(\d{4})/);
                        if (yrMatch && yrMatch[1]) {
                          setSelectedYear(yrMatch[1]);
                        }
                      }
                    }}
                    className="bg-transparent font-extrabold text-[#1e3a5f] focus:outline-hidden cursor-pointer"
                  >
                    {financialYearsData && financialYearsData.length > 0 ? (
                      financialYearsData.map((fy: any) => (
                        <option key={fy.id} value={fy.id.toString()} className="text-gray-900 font-bold">
                          {fy.year?.includes('२०') || fy.year?.includes('20') ? `आ.व. ${fy.year}` : `आ.व. ${fy.year}`} {fy.isActive ? '(चालु / Active)' : ''}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="2083" className="text-gray-900">२०८३/०८४ (2083/84)</option>
                        <option value="2082" className="text-gray-900">२०८२/०८३ (2082/83)</option>
                        <option value="2081" className="text-gray-900">२०८१/०८२ (2081/82)</option>
                      </>
                    )}
                  </select>
                </div>

                {/* 2. Exact Year (वर्ष) */}
                <div className="flex items-center gap-1.5 bg-slate-100/90 px-2 py-1 rounded-xl border border-gray-200">
                  <span className="text-gray-700">{l('वर्ष:', 'Year:')}</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="font-bold text-gray-900 bg-white border border-gray-300 rounded px-1.5 py-0.5 focus:outline-hidden cursor-pointer"
                  >
                    {['2085', '2084', '2083', '2082', '2081', '2080', '2079', '2078'].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr} BS
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Nepali Month Range */}
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-gray-200">
                  <span>{l('महिना देखि:', 'From:')}</span>
                  <select
                    value={fromMonth}
                    onChange={(e) => setFromMonth(e.target.value)}
                    className="font-bold text-gray-900 bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-hidden cursor-pointer"
                  >
                    {NEPALI_MONTHS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {lang === 'en' ? m.name.split(' ')[1]?.replace(/[()]/g, '') || m.name : m.nepali}
                      </option>
                    ))}
                  </select>

                  <span>{l('सम्म:', 'To:')}</span>
                  <select
                    value={toMonth}
                    onChange={(e) => setToMonth(e.target.value)}
                    className="font-bold text-gray-900 bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-hidden cursor-pointer"
                  >
                    {NEPALI_MONTHS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {lang === 'en' ? m.name.split(' ')[1]?.replace(/[()]/g, '') || m.name : m.nepali}
                      </option>
                    ))}
                  </select>

                  <span className="bg-[#1e3a5f] text-white px-2 py-0.5 rounded-md font-mono text-[11px] shadow-2xs">
                    {monthCount} {l('महिना', 'Month(s)')} ({monthCount === 3 ? l('त्रैमासिक निकासा', 'Quarterly') : monthCount === 1 ? l('मासिक निकासा', 'Monthly') : `${monthCount} months`})
                  </span>
                </div>
              </div>

              {/* Action Buttons Header */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={triggerOfficialGoNBharpaiPrint}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Printer size={14} />
                  <span>{l('भरपाई प्रिन्ट', 'Print Sheet', 'प्रिन्ट भरपाई पाना (Print Sheet)')}</span>
                </button>

                <button
                  type="button"
                  onClick={exportToCsv}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-800 font-bold text-xs flex items-center gap-1.5 border border-gray-300 transition cursor-pointer"
                >
                  <Download size={14} />
                  <span>Excel/CSV</span>
                </button>

                <button
                  type="button"
                  disabled={bulkSaveMutation.isPending}
                  onClick={() => bulkSaveMutation.mutate()}
                  className="px-3.5 py-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition disabled:opacity-60 cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span>{bulkSaveMutation.isPending ? l('सुरक्षित हुँदै...', 'Saving...') : l('भरपाई सुरक्षित गर्नुहोस्', 'Save Payroll Draft', 'Save Payroll Draft (सुरक्षित गर्नुहोस्)')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDisburseModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <CreditCard size={14} />
                  <span>{l('बैंक भुक्तानी निकासा', 'Disburse via Bank', 'एकमुष्ट बैंक भुक्तानी (Disburse via Bank)')}</span>
                </button>
              </div>
            </div>

            {/* Global Allowance Toggles Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-gray-700">
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-1.5 font-bold text-purple-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={globalFestivalAllowed}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setGlobalFestivalAllowed(val);
                      applyGlobalSettingsToRows(val, globalDressAllowance, globalDearnessAmount, globalInsuranceGovContribution);
                    }}
                    className="rounded text-purple-600 w-4 h-4 cursor-pointer"
                  />
                  <span>🎁 चाडपर्व खर्च समावेश (Dashain / Festival Allowance)</span>
                </label>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-600">👔 पोसाक भत्ता (Dress):</span>
                  <input
                    type="number"
                    value={globalDressAllowance}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setGlobalDressAllowance(val);
                      applyGlobalSettingsToRows(globalFestivalAllowed, val, globalDearnessAmount, globalInsuranceGovContribution);
                    }}
                    className="w-20 px-2 py-0.5 border border-gray-300 rounded font-mono text-xs bg-white"
                    placeholder="रू ०"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-600">महङ्गी भत्ता दर (Dearness):</span>
                  <input
                    type="number"
                    value={globalDearnessAmount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setGlobalDearnessAmount(val);
                      applyGlobalSettingsToRows(globalFestivalAllowed, globalDressAllowance, val, globalInsuranceGovContribution);
                    }}
                    className="w-20 px-2 py-0.5 border border-gray-300 rounded font-mono text-xs bg-white"
                  />
                </div>
              </div>

              <span className="text-[11px] text-gray-500 font-medium">
                * १०% संचय कोष थप, २०% संचय कोष कट्टी, सावधिक जीवन बीमा र १% सामाजिक सुरक्षा कर स्वतः हिसाब हुन्छ।
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Pills */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-gray-200">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedCategory === 'ALL' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All Category ({teachersData?.length || 0})
                </button>
                <button
                  onClick={() => setSelectedCategory('TEACHING')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedCategory === 'TEACHING' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Teaching Faculty (शिक्षक)
                </button>
                <button
                  onClick={() => setSelectedCategory('NON_TEACHING')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedCategory === 'NON_TEACHING' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Non-Teaching (कर्मचारी)
                </button>
              </div>

              {/* Staff Status Filter Pills (Active vs Past / Transferred) */}
              <div className="inline-flex rounded-xl bg-amber-50/80 p-1 border border-amber-200">
                <button
                  onClick={() => setStaffStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    staffStatusFilter === 'ALL' ? 'bg-amber-700 text-white shadow-xs' : 'text-amber-900 hover:bg-amber-100/60'
                  }`}
                >
                  सबै ({teachersData?.length || 0})
                </button>
                <button
                  onClick={() => setStaffStatusFilter('ACTIVE')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    staffStatusFilter === 'ACTIVE' ? 'bg-emerald-700 text-white shadow-xs' : 'text-emerald-900 hover:bg-emerald-100/60'
                  }`}
                >
                  कार्यरत / Active ({teachersData?.filter((t: any) => t.isActive !== false).length || 0})
                </button>
                <button
                  onClick={() => setStaffStatusFilter('INACTIVE')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    staffStatusFilter === 'INACTIVE' ? 'bg-rose-700 text-white shadow-xs' : 'text-rose-900 hover:bg-rose-100/60'
                  }`}
                >
                  विगत/सरुवा / Past Staff ({teachersData?.filter((t: any) => t.isActive === false).length || 0})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Sync Active Peshkis Button */}
              <button
                type="button"
                onClick={syncActivePeshkisToRows}
                className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-2xs"
                title="सबै शिक्षकहरूको पछिल्लो सक्रिय पेस्की तथा बाँकी रकम सिङ्क गर्नुहोस्"
              >
                <RotateCcw size={13} className="text-amber-700" />
                <span>पेस्की सिङ्क (Sync)</span>
              </button>

              {/* + Add Past / Historical Staff Button */}
              <button
                type="button"
                onClick={() => setIsAddPastStaffOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
              >
                <Plus size={14} />
                <span>+ पूर्व शिक्षक (Past Staff)</span>
              </button>

              <div className="relative flex-1 min-w-[140px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search staff by name, post, PAN..."
                  value={searchStaff}
                  onChange={(e) => setSearchStaff(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs focus:bg-white focus:outline-hidden"
                />
              </div>
              {/* Order / Ranking Selector */}
              <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
                <span className="text-[11px] font-bold text-gray-500">क्रम:</span>
                <select
                  value={staffSortOrder}
                  onChange={(e: any) => setStaffSortOrder(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#1e3a5f] focus:outline-hidden cursor-pointer"
                  title="शिक्षक तथा कर्मचारीहरूको क्रम छनोट गर्नुहोस्"
                >
                  <option value="selectionOrder">➕ थपिएको क्रम (First Entered / Added First)</option>
                  <option value="displayOrder">📌 शिक्षक क्रम/रोल (Display Order #)</option>
                  <option value="hierarchy">👑 पद/तहगत मर्यादाक्रम (Official Hierarchy)</option>
                  <option value="id">🔢 दर्ता क्र.सं. (Staff ID Order)</option>
                  <option value="name">🔤 नाम वर्णानुक्रम (A-Z)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 font-bold text-xs text-gray-700 shrink-0">
                <input
                  type="checkbox"
                  id="selectAllStaff"
                  checked={selectedTeacherIds.length === displayedStaff.length && displayedStaff.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTeacherIds(displayedStaff.map((t: any) => t.id));
                    } else {
                      setSelectedTeacherIds([]);
                    }
                  }}
                  className="rounded text-[#1e3a5f] w-4 h-4 cursor-pointer"
                />
                <label htmlFor="selectAllStaff" className="cursor-pointer">सबै छनोट ({selectedTeacherIds.length})</label>
              </div>
            </div>
          </div>

          {/* ════════════ TOP INCREMENTAL STAFF ADDITION & SEQUENCING BAR ════════════ */}
          <div className="bg-gradient-to-r from-slate-900 via-[#1e3a5f] to-indigo-950 text-white p-3.5 rounded-2xl border border-blue-800 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-black text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
                <UserPlus size={15} />
                <span>शिक्षक थप्नुहोस् (Add Staff):</span>
              </span>

              {/* Custom Searchable Staff Popover Selector */}
              <div className="relative" ref={staffSelectorRef}>
                <button
                  type="button"
                  onClick={() => setIsStaffSelectorOpen((prev) => !prev)}
                  className="bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs rounded-xl px-3.5 py-2 min-w-[280px] max-w-[340px] shadow-sm border border-amber-400 flex items-center justify-between gap-2 focus:ring-2 focus:ring-amber-400 focus:outline-hidden transition cursor-pointer"
                  title="शिक्षक तथा कर्मचारी छान्नुहोस्"
                >
                  <span className="truncate flex items-center gap-1.5">
                    <UserPlus size={14} className="text-amber-600 shrink-0" />
                    <span>
                      {unaddedTeachers.length > 0
                        ? `➕ शिक्षक छान्नुहोस् (${unaddedTeachers.length} जना बाँकी)...`
                        : '✓ सबै शिक्षक थपिइसकेका छन्'}
                    </span>
                  </span>
                  <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${isStaffSelectorOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Floating Search Popover Dropdown */}
                {isStaffSelectorOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-[360px] sm:w-[420px] max-h-[380px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95 duration-100">
                    {/* Search Input Box */}
                    <div className="p-2.5 bg-slate-50 border-b border-gray-200">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="नाम (English / नेपाली), पद वा क्रम खोज्नुहोस्..."
                          value={staffSelectorQuery}
                          onChange={(e) => setStaffSelectorQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-xl focus:border-[#1e3a5f] focus:outline-hidden text-gray-900 placeholder:text-gray-400"
                        />
                      </div>
                    </div>

                    {/* Filtered Teachers List */}
                    <div className="overflow-y-auto max-h-[300px] divide-y divide-gray-100 p-1">
                      {filteredUnaddedTeachers.length === 0 ? (
                        <div className="p-6 text-center text-xs text-gray-400">
                          {unaddedTeachers.length === 0
                            ? 'सबै शिक्षकहरू तालिकामा समावेश भइसकेका छन्।'
                            : 'कुनै शिक्षक फेला परेन।'}
                        </div>
                      ) : (
                        filteredUnaddedTeachers.map((t: any) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              addSpecificTeacher(t.id);
                              setIsStaffSelectorOpen(false);
                            }}
                            className="w-full text-left p-2.5 rounded-xl hover:bg-blue-50/80 transition flex items-start justify-between gap-2 group cursor-pointer"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 group-hover:bg-amber-100 text-slate-700 group-hover:text-amber-900 border border-slate-200 group-hover:border-amber-300 font-bold shrink-0">
                                  #{t.displayOrder !== null && t.displayOrder !== undefined ? t.displayOrder : '—'}
                                </span>
                                <span className="font-extrabold text-xs text-gray-900 group-hover:text-blue-900">
                                  {t.fullName}
                                </span>
                                {t.fullNameNepali && (
                                  <span className="text-[11px] text-gray-500 font-nepali">
                                    ({t.fullNameNepali})
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-500 truncate mt-0.5 flex items-center gap-1.5">
                                <span className="font-medium">{t.post || t.taha || 'शिक्षक'}</span>
                                {t.type && <span className="text-gray-300">•</span>}
                                {t.type && (
                                  <span className="text-gray-500 font-medium">
                                    {getStaffTypeInfo(t.type, masterTeacherTypes).nepali}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-lg shrink-0 opacity-0 group-hover:opacity-100 transition">
                              + थप्नुहोस्
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Add All & Clear Controls */}
              <button
                type="button"
                onClick={addAllTeachersToSheet}
                className="px-3 py-2 rounded-xl bg-blue-700/70 hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 transition border border-blue-400/40 cursor-pointer"
                title="सबै शिक्षकहरूलाई एकैपटक तालिकामा समावेश गर्नुहोस्"
              >
                <Users size={14} />
                <span>सबै थप्नुहोस् ({teachersData?.length || 0})</span>
              </button>

              {displayedStaff.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllTeachersFromSheet}
                  className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 font-bold text-xs flex items-center gap-1.5 transition border border-rose-500/40 cursor-pointer"
                  title="तालिका खाली गर्नुहोस्"
                >
                  <RotateCcw size={13} />
                  <span>सफा (Clear)</span>
                </button>
              )}
            </div>

            {/* Status and Progress Counter */}
            <div className="flex items-center gap-2 self-end md:self-center">
              <div className="bg-black/30 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-semibold text-blue-200">
                  तालिकामा:{' '}
                  <strong className="text-white font-mono text-sm">{displayedStaff.length}</strong> / {teachersData?.length || 0} जना
                </span>
                {unaddedTeachers.length > 0 && (
                  <span className="text-[11px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-400/30">
                    +{unaddedTeachers.length} बाँकी
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ════════════ SPREADSHEET TABLE GRID (A to Z) ════════════ */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto max-h-[640px] relative scrollbar-thin">
              <table className="w-full text-left text-xs text-gray-700 divide-y divide-gray-200 relative border-separate border-spacing-0">
                <thead className="bg-[#1e3a5f] text-white text-[10.5px] font-extrabold uppercase tracking-tight sticky top-0 z-30 shadow-md">
                  <tr>
                    <th className="py-2.5 px-2 text-center w-9 min-w-[36px] max-w-[36px] sticky left-0 top-0 z-40 bg-[#1e3a5f] border-b border-r border-blue-900">
                      <Check size={12} className="mx-auto" />
                    </th>
                    <th className="py-2.5 px-2 text-center w-11 min-w-[44px] max-w-[44px] sticky left-[36px] top-0 z-40 bg-[#1e3a5f] border-b border-r border-blue-900">क्र.सं.</th>
                    <th className="py-2.5 px-3 min-w-[170px] max-w-[210px] sticky left-[80px] top-0 z-40 bg-[#1e3a5f] shadow-[4px_0_6px_-2px_rgba(0,0,0,0.35)] border-b border-r border-blue-800">कर्मचारीको नाम</th>
                    <th className="py-2.5 px-2 min-w-[120px]">तह / स्केल</th>
                    <th className="py-2.5 px-2 min-w-[95px] text-right bg-blue-900/60">मूल तलब</th>
                    <th className="py-2.5 px-2 min-w-[65px] text-center">ग्रेड संख्या</th>
                    <th className="py-2.5 px-2 min-w-[70px] text-right">ग्रेड दर</th>
                    <th className="py-2.5 px-2 min-w-[80px] text-right bg-blue-950/70">जम्मा ग्रेड रकम</th>
                    <th className="py-2.5 px-2 min-w-[90px] text-right bg-blue-900">जम्मा तलब</th>
                    <th className="py-2.5 px-2 min-w-[95px] text-right bg-blue-900/90">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="checkbox"
                          checked={displayedStaff.length > 0 && displayedStaff.every((t: any) => bulkRows[t.id]?.hasKsKoshThap !== false)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setBulkRows((prev) => {
                              const next = { ...prev };
                              displayedStaff.forEach((t: any) => {
                                if (next[t.id]) next[t.id] = { ...next[t.id], hasKsKoshThap: checked };
                              });
                              return next;
                            });
                          }}
                          className="rounded text-[#1e3a5f] w-3 h-3 cursor-pointer"
                          title="सबै शिक्षकलाई क.सं. कोष १०% थप लागू/हटाउनुहोस्"
                        />
                        <span>क.सं. कोष १०%</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-2 min-w-[65px] text-right">बीमा थप</th>
                    <th className="py-2.5 px-2 min-w-[90px] text-right bg-indigo-950">कुल तलब</th>
                    {/* Allowances */}
                    <th className="py-2.5 px-2 min-w-[90px] text-right bg-purple-950/90">प्र.अ. भत्ता</th>
                    <th className="py-2.5 px-2 min-w-[90px] text-right bg-purple-950/90">महङ्गी भत्ता</th>
                    <th className="py-2.5 px-2 min-w-[85px] text-right bg-purple-950/90">दुर्गम भत्ता</th>
                    <th className="py-2.5 px-2 min-w-[85px] text-right bg-purple-950/90">प्रोत्साहन भत्ता</th>
                    <th className="py-2.5 px-2 min-w-[85px] text-right bg-purple-950/90">अन्य भत्ता</th>
                    <th className="py-2.5 px-2 min-w-[90px] text-right bg-purple-900 font-black">जम्मा भत्ता</th>
                    <th className="py-2.5 px-2 min-w-[95px] text-right bg-purple-950">मासिक जम्मा</th>
                    <th className="py-2.5 px-2 min-w-[105px] text-right bg-slate-900 text-amber-300">
                      {monthCount} महिना तलब भत्ता
                    </th>
                    <th className="py-2.5 px-2 min-w-[95px] text-right bg-rose-950">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="checkbox"
                          checked={displayedStaff.length > 0 && displayedStaff.every((t: any) => bulkRows[t.id]?.hasKsKoshKatti !== false)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setBulkRows((prev) => {
                              const next = { ...prev };
                              displayedStaff.forEach((t: any) => {
                                if (next[t.id]) next[t.id] = { ...next[t.id], hasKsKoshKatti: checked };
                              });
                              return next;
                            });
                          }}
                          className="rounded text-rose-700 w-3 h-3 cursor-pointer"
                          title="सबै शिक्षकलाई क.सं. कोष २०% कट्टी लागू/हटाउनुहोस्"
                        />
                        <span>कोष २०% कट्टी</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-2 min-w-[75px] text-right bg-rose-950/70">सापट कट्टी</th>
                    <th className="py-2.5 px-2 min-w-[70px] text-right bg-rose-950/70">बीमा कट्टी</th>
                    <th className="py-2.5 px-2 min-w-[85px] text-right bg-rose-900 text-white">जम्मा कट्टी</th>
                    <th className="py-2.5 px-2 min-w-[95px] text-right bg-blue-950">बाँकी पाउनु पर्ने</th>
                    <th className="py-2.5 px-2 min-w-[75px] text-right">चाडपर्व खर्च</th>
                    <th className="py-2.5 px-2 min-w-[70px] text-right">पोसाक भत्ता</th>
                    <th className="py-2.5 px-2 min-w-[95px] text-right bg-emerald-950">जम्मा पाउनु पर्ने</th>
                    <th className="py-2.5 px-2 min-w-[75px] text-right">सा.सु. कर १%</th>
                    <th className="py-2.5 px-2 min-w-[100px] text-right bg-amber-950 text-amber-200">
                      पेस्की कट्टी
                    </th>
                    <th className="py-2.5 px-3 min-w-[110px] text-right bg-emerald-700 text-white font-black">
                      खुद भुक्तानी
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {isTeachersLoading ? (
                    <tr>
                      <td colSpan={31} className="p-12 text-center text-gray-400">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
                        <p className="mt-2 text-xs">Loading payroll sheet data...</p>
                      </td>
                    </tr>
                  ) : displayedStaff.length === 0 ? (
                    <tr>
                      <td colSpan={31} className="py-14 px-4 text-center bg-slate-50/50">
                        <div className="max-w-md mx-auto space-y-1.5">
                          <p className="text-sm font-bold text-gray-700">
                            तलब तालिकामा हाल कुनै शिक्षक/कर्मचारी थपिएको छैन
                          </p>
                          <p className="text-xs text-gray-500 font-nepali">
                            माथिको &ldquo;शिक्षक छान्नुहोस्&rdquo; वा &ldquo;+ अर्को थप्नुहोस्&rdquo; बटनबाट क्रमबद्ध रूपमा शिक्षकहरू तालिकामा थप्नुहोस्।
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayedStaff.map((teacher: any, idx: number) => {
                      const row = bulkRows[teacher.id] || {};
                      const isSelected = selectedTeacherIds.includes(teacher.id);
                      const calc = calculateRow(row);

                      return (
                        <tr
                          key={teacher.id}
                          className={`group transition ${isSelected ? 'bg-white hover:bg-blue-50/50' : 'bg-slate-50/70 opacity-60'}`}
                        >
                          {/* Frozen Checkbox */}
                          <td className={`py-2 px-2 text-center sticky left-0 z-10 w-9 min-w-[36px] max-w-[36px] border-b border-gray-100 ${
                            isSelected ? 'bg-white group-hover:bg-blue-50' : 'bg-slate-50'
                          }`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTeacherIds((prev) => [...prev, teacher.id]);
                                } else {
                                  setSelectedTeacherIds((prev) => prev.filter((id) => id !== teacher.id));
                                }
                              }}
                              className="rounded text-[#1e3a5f] w-3.5 h-3.5 cursor-pointer"
                            />
                          </td>

                          {/* Frozen S.N. */}
                          <td className={`py-2 px-2 text-center font-mono font-bold text-gray-500 text-[11px] sticky left-[36px] z-10 w-11 min-w-[44px] max-w-[44px] border-b border-gray-100 ${
                            isSelected ? 'bg-white group-hover:bg-blue-50' : 'bg-slate-50'
                          }`}>
                            {idx + 1}
                          </td>

                          {/* Frozen Teacher Name & Title */}
                          <td className={`py-2 px-3 sticky left-[80px] z-10 min-w-[185px] max-w-[220px] shadow-[4px_0_6px_-2px_rgba(0,0,0,0.12)] border-b border-r border-gray-200 ${
                            isSelected ? 'bg-white group-hover:bg-blue-50' : 'bg-slate-50'
                          }`}>
                            <div className="flex items-center justify-between gap-1">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {teacher.displayOrder !== undefined && teacher.displayOrder !== null && (
                                    <span className="text-[9px] bg-slate-100 text-slate-700 font-mono font-bold px-1 rounded border border-slate-200" title="प्रदर्शन क्रम (Display Order)">
                                      #{teacher.displayOrder}
                                    </span>
                                  )}
                                  <span className="font-extrabold text-gray-900 text-xs truncate max-w-[130px]" title={teacher.fullName}>
                                    {teacher.fullName}
                                  </span>
                                  {!teacher.isActive && (
                                    <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.2 rounded">
                                      विगत
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-500 font-nepali truncate max-w-[140px]">
                                  {teacher.fullNameNepali || teacher.post || 'शिक्षक'}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeTeacherFromSheet(teacher.id)}
                                className="inline-flex items-center gap-1 text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 hover:border-rose-600 px-1.5 py-1 rounded-md transition cursor-pointer shrink-0 shadow-2xs"
                                title="यो शिक्षकलाई तालिकाबाट हटाउनुहोस् (Remove from Sheet - पुनः थप्न सकिनेछ)"
                              >
                                <Trash2 size={12} />
                                <span className="text-[9.5px] font-bold">हटाउनुहोस्</span>
                              </button>
                            </div>
                          </td>

                          {/* Taha / Scale Preset Dropdown */}
                          <td className="py-2 px-2">
                            <select
                              value={scalesData?.find((s: any) => s.taha === row.taha && s.shreni === row.shreni)?.id || ''}
                              onChange={(e) => handleScaleSelection(teacher.id, e.target.value)}
                              className="w-full text-[10px] font-semibold bg-slate-50 border border-gray-200 rounded p-1 focus:bg-white truncate"
                            >
                              <option value="">{row.taha || 'स्केल छनौट'}</option>
                              {scalesData?.map((sc: any) => (
                                <option key={sc.id} value={sc.id}>
                                  {sc.taha} - {sc.shreni} (रु {sc.moolTalab?.toLocaleString()})
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* [A] मूल तलब */}
                          <td className="py-2 px-2 text-right font-mono bg-blue-50/40">
                            <input
                              type="number"
                              value={row.moolTalab || 0}
                              onChange={(e) => handleFieldChange(teacher.id, 'moolTalab', parseFloat(e.target.value) || 0)}
                              className="w-20 text-right font-mono font-bold text-xs bg-transparent border-b border-gray-300 focus:border-blue-600 focus:outline-hidden"
                            />
                          </td>

                          {/* [B] ग्रेड संख्या */}
                          <td className="py-2 px-2 text-center font-mono">
                            <input
                              type="number"
                              min="0"
                              max="12"
                              value={row.gradeNo || 0}
                              onChange={(e) => handleFieldChange(teacher.id, 'gradeNo', parseInt(e.target.value, 10) || 0)}
                              className="w-12 text-center font-mono font-bold text-xs bg-slate-50 border border-gray-300 rounded p-0.5 focus:bg-white"
                            />
                          </td>

                          {/* [C] ग्रेड दर */}
                          <td className="py-2 px-2 text-right font-mono">
                            <input
                              type="number"
                              value={row.gradeAmount || 0}
                              onChange={(e) => handleFieldChange(teacher.id, 'gradeAmount', parseFloat(e.target.value) || 0)}
                              className="w-16 text-right font-mono text-xs bg-transparent border-b border-gray-300 focus:outline-hidden"
                            />
                          </td>

                          {/* [D] जम्मा ग्रेड रकम */}
                          <td className="py-2 px-2 text-right font-mono font-semibold text-gray-700 bg-slate-50">
                            {calc.D?.toLocaleString()}
                          </td>

                          {/* [E] जम्मा तलब (A + D) */}
                          <td className="py-2 px-2 text-right font-mono font-extrabold text-blue-950 bg-blue-50/70">
                            {calc.E?.toLocaleString()}
                          </td>

                          {/* [F] क.सं. कोष थप १०% */}
                          <td className="py-2 px-2 text-right font-mono bg-blue-50/20">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="checkbox"
                                checked={row.hasKsKoshThap !== false}
                                onChange={(e) => handleFieldChange(teacher.id, 'hasKsKoshThap', e.target.checked)}
                                className="rounded text-blue-700 w-3.5 h-3.5 cursor-pointer"
                                title="क.सं. कोष १०% थप लागू छ/छैन"
                              />
                              <span className={row.hasKsKoshThap !== false ? 'text-gray-900 font-semibold' : 'text-gray-300'}>
                                {calc.F?.toLocaleString()}
                              </span>
                            </div>
                          </td>

                          {/* [G] बीमा थप */}
                          <td className="py-2 px-2 text-right font-mono">
                            <input
                              type="number"
                              value={row.bimaThap || 0}
                              onChange={(e) => handleFieldChange(teacher.id, 'bimaThap', parseFloat(e.target.value) || 0)}
                              className="w-14 text-right font-mono text-xs bg-transparent border-b border-gray-300 focus:outline-hidden"
                            />
                          </td>

                          {/* [H] कुल तलब (E + F + G) */}
                          <td className="py-2 px-2 text-right font-mono font-bold text-indigo-900 bg-indigo-50/50">
                            {calc.H?.toLocaleString()}
                          </td>

                          {/* [I] प्र.अ. भत्ता (Checkbox + Amount) */}
                          <td className="py-2 px-2 text-right font-mono bg-purple-50/20">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="checkbox"
                                checked={row.hasPraABhata || false}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  handleFieldChange(teacher.id, 'hasPraABhata', checked);
                                  if (checked && (!row.praABhata || row.praABhata === 0)) {
                                    handleFieldChange(teacher.id, 'praABhata', 1000);
                                  }
                                }}
                                className="rounded text-purple-700 w-3.5 h-3.5 cursor-pointer"
                                title="प्र.अ. भत्ता लागू छ/छैन"
                              />
                              <input
                                type="number"
                                disabled={!row.hasPraABhata}
                                value={row.hasPraABhata ? (row.praABhata || 0) : 0}
                                onChange={(e) => handleFieldChange(teacher.id, 'praABhata', parseFloat(e.target.value) || 0)}
                                className={`w-14 text-right font-mono text-xs bg-transparent border-b focus:outline-hidden ${
                                  row.hasPraABhata ? 'border-purple-300 font-bold text-purple-900' : 'border-gray-200 text-gray-300 opacity-50'
                                }`}
                                placeholder="0"
                              />
                            </div>
                          </td>

                          {/* [J] महङ्गी भत्ता (Checkbox + Amount) */}
                          <td className="py-2 px-2 text-right font-mono bg-purple-50/20">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="checkbox"
                                checked={row.hasMahangiGhata !== false}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  handleFieldChange(teacher.id, 'hasMahangiGhata', checked);
                                  if (checked && (!row.mahangiGhata || row.mahangiGhata === 0)) {
                                    handleFieldChange(teacher.id, 'mahangiGhata', globalDearnessAmount || 2000);
                                  }
                                }}
                                className="rounded text-purple-700 w-3.5 h-3.5 cursor-pointer"
                                title="महङ्गी भत्ता लागू छ/छैन"
                              />
                              <input
                                type="number"
                                disabled={row.hasMahangiGhata === false}
                                value={row.hasMahangiGhata !== false ? (row.mahangiGhata !== undefined ? row.mahangiGhata : 2000) : 0}
                                onChange={(e) => handleFieldChange(teacher.id, 'mahangiGhata', parseFloat(e.target.value) || 0)}
                                className={`w-14 text-right font-mono text-xs bg-transparent border-b focus:outline-hidden ${
                                  row.hasMahangiGhata !== false ? 'border-purple-300 font-bold text-purple-900' : 'border-gray-200 text-gray-300 opacity-50'
                                }`}
                                placeholder="0"
                              />
                            </div>
                          </td>

                          {/* [K] दुर्गम भत्ता (Checkbox + Amount) */}
                          <td className="py-2 px-2 text-right font-mono bg-purple-50/20">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="checkbox"
                                checked={row.hasDurgamBhata || false}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  handleFieldChange(teacher.id, 'hasDurgamBhata', checked);
                                  if (checked && (!row.durgamBhata || row.durgamBhata === 0)) {
                                    handleFieldChange(teacher.id, 'durgamBhata', 1000);
                                  }
                                }}
                                className="rounded text-purple-700 w-3.5 h-3.5 cursor-pointer"
                                title="दुर्गम भत्ता लागू छ/छैन"
                              />
                              <input
                                type="number"
                                disabled={!row.hasDurgamBhata}
                                value={row.hasDurgamBhata ? (row.durgamBhata || 0) : 0}
                                onChange={(e) => handleFieldChange(teacher.id, 'durgamBhata', parseFloat(e.target.value) || 0)}
                                className={`w-14 text-right font-mono text-xs bg-transparent border-b focus:outline-hidden ${
                                  row.hasDurgamBhata ? 'border-purple-300 font-bold text-purple-900' : 'border-gray-200 text-gray-300 opacity-50'
                                }`}
                                placeholder="0"
                              />
                            </div>
                          </td>

                          {/* [L] प्रोत्साहन भत्ता (Checkbox + Amount) */}
                          <td className="py-2 px-2 text-right font-mono bg-purple-50/20">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="checkbox"
                                checked={row.hasProtsahanBhata || false}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  handleFieldChange(teacher.id, 'hasProtsahanBhata', checked);
                                  if (checked && (!row.protsahanBhata || row.protsahanBhata === 0)) {
                                    handleFieldChange(teacher.id, 'protsahanBhata', 1000);
                                  }
                                }}
                                className="rounded text-purple-700 w-3.5 h-3.5 cursor-pointer"
                                title="प्रोत्साहन भत्ता लागू छ/छैन"
                              />
                              <input
                                type="number"
                                disabled={!row.hasProtsahanBhata}
                                value={row.hasProtsahanBhata ? (row.protsahanBhata || 0) : 0}
                                onChange={(e) => handleFieldChange(teacher.id, 'protsahanBhata', parseFloat(e.target.value) || 0)}
                                className={`w-14 text-right font-mono text-xs bg-transparent border-b focus:outline-hidden ${
                                  row.hasProtsahanBhata ? 'border-purple-300 font-bold text-purple-900' : 'border-gray-200 text-gray-300 opacity-50'
                                }`}
                                placeholder="0"
                              />
                            </div>
                          </td>

                          {/* [M] अन्य भत्ता (Checkbox + Amount) */}
                          <td className="py-2 px-2 text-right font-mono bg-purple-50/20">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="checkbox"
                                checked={row.hasOtherBhata || false}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  handleFieldChange(teacher.id, 'hasOtherBhata', checked);
                                  if (checked && (!row.otherBhata || row.otherBhata === 0)) {
                                    handleFieldChange(teacher.id, 'otherBhata', 500);
                                  }
                                }}
                                className="rounded text-purple-700 w-3.5 h-3.5 cursor-pointer"
                                title="अन्य भत्ता लागू छ/छैन"
                              />
                              <input
                                type="number"
                                disabled={!row.hasOtherBhata}
                                value={row.hasOtherBhata ? (row.otherBhata || 0) : 0}
                                onChange={(e) => handleFieldChange(teacher.id, 'otherBhata', parseFloat(e.target.value) || 0)}
                                className={`w-14 text-right font-mono text-xs bg-transparent border-b focus:outline-hidden ${
                                  row.hasOtherBhata ? 'border-purple-300 font-bold text-purple-900' : 'border-gray-200 text-gray-300 opacity-50'
                                }`}
                                placeholder="0"
                              />
                            </div>
                          </td>

                          {/* [N] जम्मा भत्ता (N = I + J + K + L + M) */}
                          <td className="py-2 px-2 text-right font-mono font-extrabold text-purple-950 bg-purple-100/70">
                            <div className="flex items-center justify-end gap-1">
                              <span>{calc.N?.toLocaleString()}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSingleEditData({ ...row, ...calc });
                                  setIsSingleEditModalOpen(true);
                                }}
                                className="text-[9px] text-purple-700 hover:text-purple-950 underline cursor-pointer"
                                title="Detailed allowance view"
                              >
                                ⚙️
                              </button>
                            </div>
                          </td>

                          {/* [O] मासिक जम्मा (H + N) */}
                          <td className="py-2 px-2 text-right font-mono font-bold text-purple-950 bg-purple-50">
                            {calc.O?.toLocaleString()}
                          </td>

                          {/* [P] त्रैमासिक / कुल तलब भत्ता (O * MonthCount) */}
                          <td className="py-2 px-2 text-right font-mono font-extrabold text-[#1e3a5f] bg-blue-100/60 text-xs">
                            {calc.P?.toLocaleString()}
                          </td>

                          {/* [Q] कोष २०% कट्टी */}
                          <td className="py-2 px-2 text-right font-mono bg-rose-50/40">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="checkbox"
                                checked={row.hasKsKoshKatti !== false}
                                onChange={(e) => handleFieldChange(teacher.id, 'hasKsKoshKatti', e.target.checked)}
                                className="rounded text-rose-700 w-3.5 h-3.5 cursor-pointer"
                                title="क.सं. कोष २०% कट्टी लागू छ/छैन"
                              />
                              <span className={row.hasKsKoshKatti !== false ? 'text-rose-800 font-semibold' : 'text-gray-300'}>
                                {calc.Q?.toLocaleString()}
                              </span>
                            </div>
                          </td>

                          {/* [R] सापट कट्टी */}
                          <td className="py-2 px-2 text-right font-mono">
                            <input
                              type="number"
                              value={row.karmachariKoshSapati || 0}
                              onChange={(e) => handleFieldChange(teacher.id, 'karmachariKoshSapati', parseFloat(e.target.value) || 0)}
                              className="w-16 text-right font-mono text-xs bg-transparent border-b border-rose-300 focus:outline-hidden text-rose-800"
                              placeholder="0"
                            />
                          </td>

                          {/* [S] बीमा कट्टी */}
                          <td className="py-2 px-2 text-right font-mono text-rose-800">
                            {calc.S?.toLocaleString()}
                          </td>

                          {/* [T] जम्मा कट्टी (Q + R + S) */}
                          <td className="py-2 px-2 text-right font-mono font-extrabold text-rose-900 bg-rose-100/70">
                            {calc.T?.toLocaleString()}
                          </td>

                          {/* [U] बाँकी पाउनु पर्ने (P - T) */}
                          <td className="py-2 px-2 text-right font-mono font-bold text-gray-900 bg-slate-50">
                            {calc.U?.toLocaleString()}
                          </td>

                          {/* [V] चाडपर्व खर्च */}
                          <td className="py-2 px-2 text-right font-mono text-purple-900">
                            <input
                              type="checkbox"
                              checked={row.includeChaadparba || false}
                              onChange={(e) => handleFieldChange(teacher.id, 'includeChaadparba', e.target.checked)}
                              className="rounded text-purple-600 mr-1 cursor-pointer"
                              title="Include 1 Month Dashain Allowance"
                            />
                            {calc.V ? calc.V.toLocaleString() : '-'}
                          </td>

                          {/* [W] पोसाक भत्ता */}
                          <td className="py-2 px-2 text-right font-mono">
                            <input
                              type="number"
                              value={row.poshakBhata || 0}
                              onChange={(e) => handleFieldChange(teacher.id, 'poshakBhata', parseFloat(e.target.value) || 0)}
                              className="w-14 text-right font-mono text-xs bg-transparent border-b border-gray-300 focus:outline-hidden"
                            />
                          </td>

                          {/* [X] जम्मा रकम (U + V + W) */}
                          <td className="py-2 px-2 text-right font-mono font-bold text-gray-950 bg-emerald-50/50">
                            {calc.X?.toLocaleString()}
                          </td>

                          {/* [Y] सा.सु. कर १% */}
                          <td className="py-2 px-2 text-right font-mono text-amber-900">
                            {calc.Y?.toLocaleString()}
                          </td>

                          {/* Dedicated पेस्की कट्टी (Peshki Deduct) */}
                          <td className="py-2 px-2 text-right font-mono bg-amber-50/40">
                            <div className="flex flex-col items-end gap-0.5">
                              <input
                                type="number"
                                min="0"
                                max={row.activePeshkiRemaining || undefined}
                                value={row.peshkiDeduction || 0}
                                onChange={(e) => handleFieldChange(teacher.id, 'peshkiDeduction', parseFloat(e.target.value) || 0)}
                                className={`w-20 text-right font-mono font-bold text-xs bg-transparent border-b focus:outline-hidden ${
                                  (row.peshkiDeduction || 0) > 0 ? 'border-amber-500 text-amber-950 bg-amber-100/50 rounded-xs px-1' : 'border-gray-200 text-gray-500'
                                }`}
                                placeholder="0"
                              />
                              {row.activePeshkiRemaining > 0 ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] font-bold text-amber-800 bg-amber-100/80 px-1 rounded truncate max-w-[90px]" title={`सक्रिय बाँकी पेस्की: रु. ${row.activePeshkiRemaining}`}>
                                    बाँकी: {row.activePeshkiRemaining.toLocaleString()}
                                  </span>
                                  {row.peshkiDeduction !== row.activePeshkiRemaining && (
                                    <button
                                      type="button"
                                      onClick={() => handleFieldChange(teacher.id, 'peshkiDeduction', row.activePeshkiRemaining)}
                                      className="text-[8.5px] font-extrabold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                                      title="बाँकी सम्पूर्ण पेस्की यो महिना कट्टी गर्नुहोस्"
                                    >
                                      सबै
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[8.5px] text-gray-400">फछ्र्यौट / छैन</span>
                              )}
                            </div>
                          </td>

                          {/* [Z] खुद भुक्तानी पाउनु पर्ने */}
                          <td className="py-2 px-3 text-right font-mono font-black text-emerald-800 bg-emerald-100/80 text-xs">
                            रू {calc.Z?.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* ═════════ STICKY GRAND TOTAL FOOTER ═════════ */}
                <tfoot className="bg-slate-900 text-white font-bold text-xs sticky bottom-0 z-30 shadow-2xl">
                  <tr>
                    <td colSpan={3} className="py-3 px-3 text-left font-black tracking-wide text-amber-300 sticky left-0 z-40 bg-slate-900 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.4)] border-r border-slate-700">
                      कुल जम्मा (GRAND TOTAL: {grandTotals.count} जना शिक्षक/कर्मचारी):
                    </td>
                    <td colSpan={16}></td>
                    <td className="py-3 px-2 text-right font-mono font-extrabold text-amber-300 text-sm">
                      रू {grandTotals.totalGrossP.toLocaleString()}
                    </td>
                    <td colSpan={3}></td>
                    <td className="py-3 px-2 text-right font-mono font-extrabold text-rose-300 text-sm">
                      - रू {grandTotals.totalDeductionT.toLocaleString()}
                    </td>
                    <td></td>
                    <td className="py-3 px-2 text-right font-mono text-purple-200">
                      रू {grandTotals.totalFestivalV.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-blue-200">
                      रू {grandTotals.totalDressW.toLocaleString()}
                    </td>
                    <td></td>
                    <td className="py-3 px-2 text-right font-mono text-amber-300">
                      - रू {grandTotals.totalTaxY.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-amber-300">
                      {grandTotals.totalPeshkiDeduction ? `- रू ${grandTotals.totalPeshkiDeduction.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-300 text-base bg-emerald-950/80 border-l-2 border-emerald-400">
                      रू {grandTotals.totalNetZ.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ TAB 2: PAYROLL HISTORY & SLIPS ════════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {!selectedHistoryBatchKey ? (
            <div className="space-y-4">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-[#1e3a5f] via-[#2d5986] to-[#1e3a5f] p-5 rounded-2xl text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-lg mb-1.5 shadow-2xs">
                    <Layers size={14} />
                    <span>Saved Payroll Registers & Batches</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-white">
                    सुरक्षित तलब निकासा भरपाई अभिलेख (Saved Payroll Registers)
                  </h2>
                  <p className="text-xs text-blue-100 font-nepali mt-0.5">
                    कुन अवधिको तलब भरपाई हेर्न चाहनुहुन्छ? तलको सूचीबाट छान्नुहोस् ।
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-white/10 px-3.5 py-2 rounded-xl text-xs font-bold text-white border border-white/20">
                    कुल {savedPayrollBatches.length} वटा निकासा सत्र
                  </span>
                </div>
              </div>

              {/* Batches Grid */}
              {isPayrollsLoading ? (
                <div className="py-20 text-center text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-2xs space-y-3">
                  <div className="w-8 h-8 border-3 border-[#1e3a5f] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-bold">तलब निकासा अभिलेखहरू लोड हुँदैछ...</p>
                </div>
              ) : savedPayrollBatches.length === 0 ? (
                <div className="py-20 text-center text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-2xs space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <FileText size={32} />
                  </div>
                  <h3 className="text-base font-extrabold text-gray-800">कुनै तलब निकासा अभिलेख फेला परेन</h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    माथिको &quot;एकमुष्ट तलब निकासा (Bulk Payroll Entry)&quot; ट्याबबाट शिक्षक कर्मचारीहरूको तलब तयार गरी सुरक्षित गर्नुहोस् ।
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bulk')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e3a5f] hover:bg-[#2d5986] text-white font-bold text-xs shadow-xs cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>नयाँ तलब निकासा सुरु गर्नुहोस्</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
                    <div className="p-3.5 border-b border-gray-100 bg-slate-50/70 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers size={16} className="text-[#1e3a5f]" />
                        <h3 className="font-extrabold text-xs text-gray-900">
                          निकासा सत्र सूची (Payroll Sessions List)
                        </h3>
                      </div>
                      <span className="text-[11px] font-bold text-gray-500 font-mono">
                        {savedPayrollBatches.length} Entries
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-gray-700 font-bold border-b border-gray-200 text-[11px] uppercase tracking-wider">
                          <tr>
                            <th className="py-3 px-3.5 w-12 text-center">क्र.सं.</th>
                            <th className="py-3 px-4 min-w-[220px]">निकासा अवधि / सत्र (Period & Session)</th>
                            <th className="py-3 px-3">आर्थिक वर्ष (FY)</th>
                            <th className="py-3 px-3 text-center">कर्मचारी संख्या</th>
                            <th className="py-3 px-4 text-right">त्रैमासिक कुल रकम (Gross)</th>
                            <th className="py-3 px-4 text-right">खुद भुक्तानी (Net Payout)</th>
                            <th className="py-3 px-3 text-center">स्थिति (Status)</th>
                            <th className="py-3 px-4 text-right">कार्य (Action)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {savedPayrollBatches.map((batch, idx) => {
                            const isDisbursed = batch.statuses.includes('PAID') || batch.statuses.includes('DISBURSED');

                            return (
                              <tr
                                key={batch.key}
                                onClick={() => setSelectedHistoryBatchKey(batch.key)}
                                className="hover:bg-blue-50/70 transition-colors cursor-pointer group"
                              >
                                <td className="py-3.5 px-3.5 text-center font-mono font-bold text-gray-400">
                                  {idx + 1}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-extrabold text-gray-900 group-hover:text-blue-900 transition flex items-center gap-2">
                                    <FileText size={15} className="text-blue-600 shrink-0" />
                                    <span>{batch.periodText}</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-3 font-semibold text-gray-700">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                                    <Calendar size={11} className="text-slate-500" />
                                    <span>{batch.financialYear?.year ? `आ.व. ${batch.financialYear.year}` : 'चालु'}</span>
                                  </span>
                                </td>
                                <td className="py-3.5 px-3 text-center">
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-800">
                                    <Users size={12} className="text-gray-400" />
                                    <span>{batch.staffCount} जना</span>
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-700">
                                  रू {batch.totalGross.toLocaleString()}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                                  रू {batch.totalNet.toLocaleString()}
                                </td>
                                <td className="py-3.5 px-3 text-center">
                                  <span
                                    className={`inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                      isDisbursed
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                                    }`}
                                  >
                                    {isDisbursed ? '✓ DISBURSED' : '• DRAFT'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedHistoryBatchKey(batch.key);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1e3a5f] group-hover:bg-blue-700 text-white font-extrabold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                                  >
                                    <span>भरपाई हेर्नुहोस्</span>
                                    <span>→</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Option to view all batches together */}
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedHistoryBatchKey('ALL_COMBINED')}
                      className="text-xs font-bold text-gray-500 hover:text-gray-800 hover:underline cursor-pointer"
                    >
                      वा सबै निकासा रेकर्डहरू एकै तालिकामा हेर्नुहोस् (View All Entries Together)
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Back to Batches Navigation Bar */}
              <div className="bg-gradient-to-r from-slate-900 via-[#1e3a5f] to-slate-900 text-white p-4 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedHistoryBatchKey(null)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-xs border border-white/20 transition cursor-pointer active:scale-95"
                  >
                    <span>← अर्को निकासा छान्नुहोस् (Back to All Batches)</span>
                  </button>
                  <div>
                    <h3 className="text-sm font-black text-amber-300">
                      {selectedHistoryBatchKey === 'ALL_COMBINED'
                        ? 'सबै निकासा अभिलेखहरू (All Combined Payroll Records)'
                        : selectedBatchObj?.periodText}
                    </h3>
                    {selectedBatchObj && (
                      <p className="text-[11px] text-blue-200">
                        {selectedBatchObj.financialYear?.year ? `आ.व. ${selectedBatchObj.financialYear.year}` : ''} • कुल {selectedBatchObj.staffCount} जना शिक्षक/कर्मचारी • खुद निकासा: रू {selectedBatchObj.totalNet.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleOpenAddMissingStaff}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95"
                    title="यो निकासा भरपाईमा छुटेका शिक्षक/कर्मचारी थप्नुहोस् (Add Staff)"
                  >
                    <Plus size={14} />
                    <span>+ कर्मचारी थप्नुहोस् {unaddedTeachersInHistory.length > 0 ? `(${unaddedTeachersInHistory.length} जना छुटेका)` : ''}</span>
                  </button>

                  <button
                    type="button"
                    onClick={triggerPrintHistoryBharpai}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    title="फिल्टर गरिएको अवधिको आधिकारिक भरपाई प्रतिवेदन प्रिन्ट गर्नुहोस्"
                  >
                    <Printer size={14} />
                    <span>🖨️ भरपाई प्रिन्ट (Print Sheet)</span>
                  </button>

                  <button
                    type="button"
                    onClick={exportHistoryToCsv}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 border border-white/20 transition cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Excel / CSV</span>
                  </button>
                </div>
              </div>

              {/* Un-added Staff Alert / Quick Add Banner */}
              {unaddedTeachersInHistory.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-amber-200 text-amber-900 rounded-lg">
                      <Users size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-amber-950">
                        यस निकासा अवधिमा {unaddedTeachersInHistory.length} जना शिक्षक/कर्मचारी समावेश हुन बाँकी छन्:
                      </h4>
                      <p className="text-[11px] text-amber-800 font-nepali">
                        {unaddedTeachersInHistory.slice(0, 4).map((t: any) => t.fullName).join(', ')}
                        {unaddedTeachersInHistory.length > 4 ? ` र अन्य ${unaddedTeachersInHistory.length - 4} जना` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddMissingStaff}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-2xs transition cursor-pointer shrink-0 active:scale-95"
                  >
                    <Plus size={13} />
                    <span>छुटेका शिक्षक थप्नुहोस् (Add Missing)</span>
                  </button>
                </div>
              )}

          {/* Comprehensive Multi-Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold text-gray-800">
              {/* 1. Fiscal Year Filter (आर्थिक वर्ष) */}
              <div className="flex items-center gap-1.5 bg-blue-50/90 px-3 py-1.5 rounded-xl border border-blue-200">
                <Calendar size={14} className="text-[#1e3a5f]" />
                <span className="text-[#1e3a5f]">आर्थिक वर्ष:</span>
                <select
                  value={historyFYFilter}
                  onChange={(e) => setHistoryFYFilter(e.target.value)}
                  className="bg-transparent font-extrabold text-[#1e3a5f] focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">सबै आर्थिक वर्षहरू (All FY)</option>
                  {(financialYearsData || []).map((fy: any) => (
                    <option key={fy.id} value={fy.id.toString()} className="text-gray-900 font-bold">
                      आ.व. {fy.year} {fy.isActive ? '(चालु / Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Payment Year BS Filter (वर्ष) */}
              <div className="flex items-center gap-1.5 bg-slate-100/90 px-2.5 py-1.5 rounded-xl border border-gray-200">
                <span className="text-gray-700">वर्ष (Year):</span>
                <select
                  value={historyYearFilter}
                  onChange={(e) => setHistoryYearFilter(e.target.value)}
                  className="font-bold text-gray-900 bg-white border border-gray-300 rounded px-2 py-0.5 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">सबै वर्ष (All Years)</option>
                  {['2085', '2084', '2083', '2082', '2081', '2080', '2079', '2078'].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr} BS
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Nepali Month Range (कुन महिना देखि कुन महिना सम्म) */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-gray-200">
                <span className="text-gray-700">महिना देखि:</span>
                <select
                  value={historyMonthFromFilter}
                  onChange={(e) => setHistoryMonthFromFilter(e.target.value)}
                  className="font-bold text-gray-900 bg-white border border-gray-300 rounded px-1.5 py-0.5 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">सुरुवाती महिना (सबै)</option>
                  {NEPALI_MONTHS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>

                <span className="text-gray-700">सम्म:</span>
                <select
                  value={historyMonthToFilter}
                  onChange={(e) => setHistoryMonthToFilter(e.target.value)}
                  className="font-bold text-gray-900 bg-white border border-gray-300 rounded px-1.5 py-0.5 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">अन्तिम महिना (सबै)</option>
                  {NEPALI_MONTHS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Category Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-gray-200">
                <span className="text-gray-700">प्रकार:</span>
                <select
                  value={historyCategoryFilter}
                  onChange={(e) => setHistoryCategoryFilter(e.target.value)}
                  className="font-bold text-gray-900 bg-white border border-gray-300 rounded px-1.5 py-0.5 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">सबै कर्मचारी (All Staff)</option>
                  <option value="TEACHING">शिक्षक (Teaching Only)</option>
                  <option value="NON_TEACHING">गैर-शैक्षिक (Non-Teaching)</option>
                  {availableTeacherTypes.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Sort Order Selector */}
              <div className="flex items-center gap-1.5 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
                <span className="text-purple-900 font-extrabold">क्रम (Sort):</span>
                <select
                  value={historySortOrder}
                  onChange={(e: any) => setHistorySortOrder(e.target.value)}
                  className="font-bold text-purple-950 bg-white border border-purple-300 rounded px-2 py-0.5 focus:outline-hidden cursor-pointer"
                >
                  <option value="hierarchy">👑 मर्यादाक्रम (मा.वि. ➔ नि.मा.वि. ➔ प्रा.वि. ➔ कर्मचारी)</option>
                  <option value="displayOrder">🔢 तोकिएको रोल क्रम (Display Order)</option>
                  <option value="name">🔤 नाम अनुसार (A-Z)</option>
                  <option value="salaryDesc">💰 खुद तलब (उच्च देखि न्यून)</option>
                  <option value="id">🆔 दर्ता ID अनुसार</option>
                </select>
              </div>
            </div>

            {/* Quick Quarter Buttons & Staff Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-gray-500 mr-1">⚡ द्रुत त्रैमासिक (Quick Quarters):</span>
                <button
                  type="button"
                  onClick={() => { setHistoryMonthFromFilter('04'); setHistoryMonthToFilter('06'); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    historyMonthFromFilter === '04' && historyMonthToFilter === '06'
                      ? 'bg-[#1e3a5f] text-white shadow-xs'
                      : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                  }`}
                >
                  Q1: साउन-असोज
                </button>
                <button
                  type="button"
                  onClick={() => { setHistoryMonthFromFilter('07'); setHistoryMonthToFilter('09'); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    historyMonthFromFilter === '07' && historyMonthToFilter === '09'
                      ? 'bg-[#1e3a5f] text-white shadow-xs'
                      : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                  }`}
                >
                  Q2: कार्तिक-पुस
                </button>
                <button
                  type="button"
                  onClick={() => { setHistoryMonthFromFilter('10'); setHistoryMonthToFilter('12'); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    historyMonthFromFilter === '10' && historyMonthToFilter === '12'
                      ? 'bg-[#1e3a5f] text-white shadow-xs'
                      : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                  }`}
                >
                  Q3: माघ-चैत
                </button>
                <button
                  type="button"
                  onClick={() => { setHistoryMonthFromFilter('01'); setHistoryMonthToFilter('03'); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    historyMonthFromFilter === '01' && historyMonthToFilter === '03'
                      ? 'bg-[#1e3a5f] text-white shadow-xs'
                      : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                  }`}
                >
                  Q4: बैशाख-असार
                </button>
                <button
                  type="button"
                  onClick={() => { setHistoryMonthFromFilter('ALL'); setHistoryMonthToFilter('ALL'); setHistoryYearFilter('ALL'); setHistoryFYFilter('ALL'); setHistoryCategoryFilter('ALL'); setHistorySearchStaff(''); }}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 transition cursor-pointer"
                >
                  🔄 सबै रिसेट (Reset)
                </button>
              </div>

              <div className="relative min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="कर्मचारी खोज्नुहोस् (Name, PAN, Post)..."
                  value={historySearchStaff}
                  onChange={(e) => setHistorySearchStaff(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* ════════════ 6 REAL COMPUTED GRAND TOTAL SUMMARY CARDS ════════════ */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Total Staff */}
            <div className="bg-white p-3.5 rounded-2xl border border-blue-100 shadow-2xs">
              <div className="flex items-center justify-between text-blue-900">
                <span className="text-[11px] font-bold">कुल शिक्षक/कर्मचारी</span>
                <Users size={16} className="text-blue-600" />
              </div>
              <div className="mt-2 text-xl font-extrabold text-blue-950 font-mono">
                {historyTotals.count} <span className="text-xs font-normal text-gray-500">जना</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">Filtered Records</p>
            </div>

            {/* 2. Total Gross Salary */}
            <div className="bg-white p-3.5 rounded-2xl border border-indigo-100 shadow-2xs">
              <div className="flex items-center justify-between text-indigo-900">
                <span className="text-[11px] font-bold">कुल तलब भत्ता (Gross)</span>
                <Briefcase size={16} className="text-indigo-600" />
              </div>
              <div className="mt-2 text-base font-black text-indigo-950 font-mono truncate">
                रू {historyTotals.totalGross.toLocaleString()}
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">जम्मा निकासा माग रकम</p>
            </div>

            {/* 3. Total Deductions */}
            <div className="bg-white p-3.5 rounded-2xl border border-rose-100 shadow-2xs">
              <div className="flex items-center justify-between text-rose-900">
                <span className="text-[11px] font-bold">जम्मा कट्टी (Deductions)</span>
                <Sliders size={16} className="text-rose-600" />
              </div>
              <div className="mt-2 text-base font-black text-rose-800 font-mono truncate">
                - रू {historyTotals.totalDeductions.toLocaleString()}
              </div>
              <p className="text-[10px] text-rose-600 mt-0.5">कोष, बीमा र सापट</p>
            </div>

            {/* 4. Total Net Disbursed */}
            <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-900">
                <span className="text-[11px] font-black">कुल खुद भुक्तानी (Net)</span>
                <Wallet size={16} className="text-emerald-700" />
              </div>
              <div className="mt-2 text-base font-black text-emerald-900 font-mono truncate">
                रू {historyTotals.totalNetPayable.toLocaleString()}
              </div>
              <p className="text-[10px] text-emerald-700 font-bold mt-0.5">बैंक खातामा जाने रकम</p>
            </div>

            {/* 5. Total Provident Fund (20%) */}
            <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-2xs">
              <div className="flex items-center justify-between text-purple-900">
                <span className="text-[11px] font-bold">संचय कोष २०%</span>
                <ShieldCheck size={16} className="text-purple-600" />
              </div>
              <div className="mt-2 text-sm font-extrabold text-purple-950 font-mono truncate">
                रू {historyTotals.totalPF20.toLocaleString()}
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">१०% थप + १०% कट्टी</p>
            </div>

            {/* 6. Total Social Security Tax (1%) */}
            <div className="bg-white p-3.5 rounded-2xl border border-amber-100 shadow-2xs">
              <div className="flex items-center justify-between text-amber-900">
                <span className="text-[11px] font-bold">सा.सु. कर १%</span>
                <Calculator size={16} className="text-amber-600" />
              </div>
              <div className="mt-2 text-sm font-extrabold text-amber-950 font-mono truncate">
                रू {historyTotals.totalTax1.toLocaleString()}
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">आन्तरिक राजस्व दाखिला</p>
            </div>
          </div>

          {/* ════════════ PAYROLL HISTORY TABLE WITH GRAND TOTAL FOOTER ════════════ */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto max-h-[640px] relative scrollbar-thin">
              <table className="w-full text-left text-xs text-gray-700 divide-y divide-gray-200 relative border-separate border-spacing-0">
                <thead className="bg-[#1e3a5f] text-white text-[10px] font-extrabold uppercase tracking-tight sticky top-0 z-30 shadow-md">
                  <tr>
                    <th className="py-2.5 px-2 text-center w-11 min-w-[44px] sticky left-0 top-0 z-40 bg-[#1e3a5f] border-b border-r border-blue-900">क्र.सं.</th>
                    <th className="py-2.5 px-3 min-w-[170px] sticky left-[44px] top-0 z-40 bg-[#1e3a5f] shadow-[4px_0_6px_-2px_rgba(0,0,0,0.35)] border-b border-r border-blue-800">कर्मचारीको नाम</th>
                    <th className="py-2.5 px-2 min-w-[110px]">तह / पद</th>
                    <th className="py-2.5 px-2 min-w-[130px]">अवधि (Period)</th>
                    <th className="py-2.5 px-2 min-w-[85px] text-right bg-blue-900/60">मूल तलब</th>
                    <th className="py-2.5 px-1.5 min-w-[55px] text-center">ग्रेड सं.</th>
                    <th className="py-2.5 px-2 min-w-[65px] text-right">ग्रेड दर</th>
                    <th className="py-2.5 px-2 min-w-[75px] text-right bg-blue-950/70">ग्रेड रकम</th>
                    <th className="py-2.5 px-2 min-w-[85px] text-right bg-blue-900">जम्मा तलब</th>
                    <th className="py-2.5 px-2 min-w-[80px] text-right bg-blue-900/90">कोष १०%</th>
                    <th className="py-2.5 px-2 min-w-[60px] text-right">बीमा थप</th>
                    <th className="py-2.5 px-2 min-w-[85px] text-right bg-indigo-950">कुल तलब</th>
                    {/* Allowances */}
                    <th className="py-2.5 px-2 min-w-[75px] text-right bg-purple-950/90">महङ्गी भत्ता</th>
                    <th className="py-2.5 px-2 min-w-[75px] text-right bg-purple-950/90">प्र.अ. भत्ता</th>
                    <th className="py-2.5 px-2 min-w-[75px] text-right bg-purple-950/90">अन्य भत्ता</th>
                    <th className="py-2.5 px-2 min-w-[85px] text-right bg-purple-900 font-black">जम्मा भत्ता</th>
                    <th className="py-2.5 px-2 min-w-[90px] text-right bg-purple-950">मासिक जम्मा</th>
                    <th className="py-2.5 px-2 min-w-[105px] text-right bg-slate-900 text-amber-300 font-black">
                      निकासा तलब भत्ता
                    </th>
                    {/* Deductions */}
                    <th className="py-2.5 px-2 min-w-[85px] text-right bg-rose-950">कोष २०%</th>
                    <th className="py-2.5 px-2 min-w-[70px] text-right bg-rose-950/70">सापट कट्टी</th>
                    <th className="py-2.5 px-2 min-w-[70px] text-right bg-rose-950/70">बीमा कट्टी</th>
                    <th className="py-2.5 px-2 min-w-[85px] text-right bg-rose-900 text-white font-black">जम्मा कट्टी</th>
                    <th className="py-2.5 px-2 min-w-[90px] text-right bg-blue-950">बाँकी पाउनुपर्ने</th>
                    <th className="py-2.5 px-2 min-w-[75px] text-right">चाडपर्व खर्च</th>
                    <th className="py-2.5 px-2 min-w-[70px] text-right">पोसाक भत्ता</th>
                    <th className="py-2.5 px-2 min-w-[95px] text-right bg-emerald-950">कुल पाउनुपर्ने</th>
                    <th className="py-2.5 px-2 min-w-[70px] text-right">सा.सु. १%</th>
                    <th className="py-2.5 px-2 min-w-[85px] text-right bg-amber-950 text-amber-200">पेस्की कट्टी</th>
                    <th className="py-2.5 px-3 min-w-[105px] text-right bg-emerald-700 text-white font-black">खुद भुक्तानी</th>
                    <th className="py-2.5 px-2 min-w-[110px]">बैंक खाता नं.</th>
                    <th className="py-2.5 px-2 min-w-[65px] text-center">Status</th>
                    <th className="py-2.5 px-2 min-w-[95px] text-right">कार्य</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {isPayrollsLoading ? (
                    <tr>
                      <td colSpan={32} className="p-12 text-center text-gray-400">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
                        <p className="mt-2 text-xs font-bold">तलब अभिलेख लोड हुँदैछ...</p>
                      </td>
                    </tr>
                  ) : filteredPayrolls.length === 0 ? (
                    <tr>
                      <td colSpan={32} className="p-12 text-center text-gray-400">
                        <Wallet size={32} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm font-bold text-gray-700">छनौट गरिएको फिल्टर अनुसार कुनै तलब भरपाई फेला परेन</p>
                        <p className="text-xs text-gray-500 font-nepali mt-1">
                          कृपया माथिबाट आर्थिक वर्ष, वर्ष वा महिनाको फिल्टर परिवर्तन गर्नुहोस् वा "+ कर्मचारी थप्नुहोस्" बटन क्लिक गर्नुहोस्।
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredPayrolls.map((p: any, idx: number) => {
                      let parsedRemarks: any = {};
                      try {
                        if (p.remarks && typeof p.remarks === 'string' && p.remarks.startsWith('{')) {
                          parsedRemarks = JSON.parse(p.remarks);
                        }
                      } catch (e) {}

                      const fromM = p.monthFrom ? parseInt(p.monthFrom.split('-')[1] || '4') : 4;
                      const toM = p.monthTo ? parseInt(p.monthTo.split('-')[1] || '6') : 6;
                      let computedMonths = toM >= fromM ? toM - fromM + 1 : 12 - fromM + toM + 1;
                      if (parsedRemarks?.monthCount) computedMonths = parsedRemarks.monthCount;

                      const periodInfo = formatPayrollPeriod(p.monthFrom, p.monthTo);
                      const moolTalab = p.moolTalab || 0;
                      const gradeNo = p.gradeNo || 0;
                      const gradeAmount = p.gradeAmount || 0;
                      const gradeRakam = p.gradeRakam || 0;
                      const gradeSahitTalab = p.gradeSahitTalab || (moolTalab + gradeRakam);
                      const karmachari10Pct = p.karmachari10Pct || 0;
                      const bimaThap = parsedRemarks?.bimaThap !== undefined
                        ? Number(parsedRemarks.bimaThap)
                        : ((p.bimaKati || 0) > 0 ? (Number(p.bimaKati) / (2 * (computedMonths || 3))) : 0);
                      const monthlyTalab = gradeSahitTalab + karmachari10Pct + bimaThap;

                      const mahangiGhata = p.mahangiGhata || 0;
                      const praABhata = (p.praABhata || 0) + (p.sahayakPraABhata || 0) + (p.prabiInchargeBhata || 0) + (p.mabiInchargeBhata || 0);
                      const otherBhata = (p.otherBhata || 0) + (parsedRemarks?.durgamBhata || 0) + (parsedRemarks?.protsahanBhata || 0);
                      const jammaBhata = p.jammaBhata || (mahangiGhata + praABhata + otherBhata);
                      const jammaTalabBhata = p.jammaTalabBhata || (monthlyTalab + jammaBhata);

                      const periodGross = p.traimasikTalan || (jammaTalabBhata * computedMonths);
                      const ssk20Pct = p.ssk20Pct || 0;
                      const loan = p.karmachariKoshSapati || 0;
                      const bimaKati = p.bimaKati || 0;
                      const jammaKati = p.jammaKati || (ssk20Pct + loan + bimaKati);
                      const bakiPaaunu = p.bakiPaaunuParne || (periodGross - jammaKati);
                      const chaadparba = p.chaadparbaKharcha || 0;
                      const poshak = p.poshakBhata || parsedRemarks?.poshakBhata || 0;
                      const kulRakam = p.kulRakam || (bakiPaaunu + chaadparba + poshak);
                      const tax1 = p.samajikSurakshaKar1Pct || 0;
                      const peshkiAmt = p.peshkiDeduction || p.peshkiKati || 0;
                      const netPayable = p.khudPaaunuParne || (kulRakam - tax1 - peshkiAmt);

                      return (
                        <tr key={p.id} className="group hover:bg-blue-50/40 transition">
                          {/* Frozen S.N. */}
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-gray-500 sticky left-0 z-10 bg-white group-hover:bg-blue-50 w-11 min-w-[44px] border-b border-gray-100">
                            {idx + 1}
                          </td>

                          {/* Frozen Teacher Name */}
                          <td className="py-2.5 px-3 sticky left-[44px] z-10 bg-white group-hover:bg-blue-50 min-w-[170px] shadow-[4px_0_6px_-2px_rgba(0,0,0,0.12)] border-b border-r border-gray-200">
                            <div className="font-extrabold text-gray-900 text-xs">
                              {p.teacher?.fullName || '—'}
                            </div>
                            <div className="text-[10px] text-gray-500 font-nepali">
                              {p.teacher?.fullNameNepali || p.teacher?.post || ''}
                            </div>
                          </td>

                          {/* Post / Taha */}
                          <td className="py-2.5 px-2">
                            {(() => {
                              const typeInfo = getStaffTypeInfo(p.teacher?.type, masterTeacherTypes);
                              return (
                                <span
                                  className={`inline-block rounded px-1.5 py-0.2 text-[9px] font-bold ${typeInfo.badgeClass}`}
                                  title={typeInfo.displayText}
                                >
                                  {typeInfo.icon} {typeInfo.nepali || typeInfo.label}
                                </span>
                              );
                            })()}
                            <div className="text-[10px] text-gray-600 mt-0.5 font-medium truncate max-w-[120px]">
                              {p.taha} {p.shreni ? `(${p.shreni})` : ''}
                            </div>
                          </td>

                          {/* Period */}
                          <td className="py-2.5 px-2">
                            <div className="font-bold text-[#1e3a5f] text-[11px] flex items-center gap-1">
                              <Calendar size={11} className="text-blue-600 shrink-0" />
                              <span>{periodInfo.text}</span>
                            </div>
                            <div className="text-[9.5px] font-mono text-gray-400 mt-0.5">
                              {p.monthFrom} ~ {p.monthTo} ({computedMonths} महिना)
                            </div>
                          </td>

                          {/* [A] मूल तलब */}
                          <td className="py-2.5 px-2 text-right font-mono font-medium text-gray-800 bg-blue-50/30">
                            {(moolTalab || 0).toLocaleString()}
                          </td>

                          {/* [B] ग्रेड संख्या */}
                          <td className="py-2.5 px-1.5 text-center font-mono font-bold text-gray-700">
                            {gradeNo || 0}
                          </td>

                          {/* [C] ग्रेड दर */}
                          <td className="py-2.5 px-2 text-right font-mono text-gray-600">
                            {(gradeAmount || 0).toLocaleString()}
                          </td>

                          {/* [D] जम्मा ग्रेड रकम */}
                          <td className="py-2.5 px-2 text-right font-mono font-semibold text-gray-800 bg-slate-50">
                            {(gradeRakam || 0).toLocaleString()}
                          </td>

                          {/* [E] जम्मा तलब (A + D) */}
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-gray-900 bg-blue-50/50">
                            {gradeSahitTalab.toLocaleString()}
                          </td>

                          {/* [F] क.सं. कोष १०% */}
                          <td className="py-2.5 px-2 text-right font-mono text-blue-900">
                            {karmachari10Pct ? karmachari10Pct.toLocaleString() : '—'}
                          </td>

                          {/* [G] बीमा थप */}
                          <td className="py-2.5 px-2 text-right font-mono text-gray-700">
                            {bimaThap ? bimaThap.toLocaleString() : '—'}
                          </td>

                          {/* [H] कुल तलब (E + F + G) */}
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-indigo-900 bg-indigo-50/40">
                            {monthlyTalab.toLocaleString()}
                          </td>

                          {/* Allowances */}
                          {/* [I] महङ्गी भत्ता */}
                          <td className="py-2.5 px-2 text-right font-mono text-purple-900">
                            {mahangiGhata ? mahangiGhata.toLocaleString() : '—'}
                          </td>

                          {/* [J] प्र.अ. भत्ता */}
                          <td className="py-2.5 px-2 text-right font-mono text-purple-900">
                            {praABhata ? praABhata.toLocaleString() : '—'}
                          </td>

                          {/* [K] अन्य भत्ता */}
                          <td className="py-2.5 px-2 text-right font-mono text-purple-900">
                            {otherBhata ? otherBhata.toLocaleString() : '—'}
                          </td>

                          {/* [N] जम्मा भत्ता */}
                          <td className="py-2.5 px-2 text-right font-mono font-extrabold text-purple-950 bg-purple-50/60">
                            {jammaBhata.toLocaleString()}
                          </td>

                          {/* [O] मासिक जम्मा */}
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-purple-950 bg-purple-50/80">
                            {jammaTalabBhata.toLocaleString()}
                          </td>

                          {/* [P] निकासा तलब भत्ता (Period Gross) */}
                          <td className="py-2.5 px-2 text-right font-mono font-black text-[#1e3a5f] bg-blue-100/70 text-xs">
                            रू {periodGross.toLocaleString()}
                          </td>

                          {/* Deductions */}
                          {/* [Q] कोष २०% */}
                          <td className="py-2.5 px-2 text-right font-mono text-rose-800">
                            {ssk20Pct ? ssk20Pct.toLocaleString() : '—'}
                          </td>

                          {/* [R] सापट कट्टी */}
                          <td className="py-2.5 px-2 text-right font-mono text-rose-800">
                            {loan ? loan.toLocaleString() : '—'}
                          </td>

                          {/* [S] बीमा कट्टी */}
                          <td className="py-2.5 px-2 text-right font-mono text-rose-800">
                            {bimaKati ? bimaKati.toLocaleString() : '—'}
                          </td>

                          {/* [T] जम्मा कट्टी */}
                          <td className="py-2.5 px-2 text-right font-mono font-black text-rose-900 bg-rose-50/70">
                            - {(jammaKati || 0).toLocaleString()}
                          </td>

                          {/* [U] बाँकी पाउनु पर्ने */}
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-gray-900 bg-slate-50">
                            {bakiPaaunu.toLocaleString()}
                          </td>

                          {/* [V] चाडपर्व खर्च */}
                          <td className="py-2.5 px-2 text-right font-mono text-gray-700">
                            {chaadparba ? chaadparba.toLocaleString() : '—'}
                          </td>

                          {/* [W] पोसाक भत्ता */}
                          <td className="py-2.5 px-2 text-right font-mono text-gray-700">
                            {poshak ? poshak.toLocaleString() : '—'}
                          </td>

                          {/* [X] कुल रकम */}
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-gray-950 bg-emerald-50/40">
                            {kulRakam.toLocaleString()}
                          </td>

                          {/* [Y] सा.सु. कर १% */}
                          <td className="py-2.5 px-2 text-right font-mono text-amber-900">
                            - {(tax1 || 0).toLocaleString()}
                          </td>

                          {/* Dedicated पेस्की कट्टी */}
                          <td className="py-2.5 px-2 text-right font-mono font-bold bg-amber-50/50">
                            {peshkiAmt > 0 ? (
                              <span className="text-amber-900 font-extrabold" title={`पेस्की कट्टी: रु. ${peshkiAmt}`}>
                                - {peshkiAmt.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-gray-400 font-normal">—</span>
                            )}
                          </td>

                          {/* [Z] खुद भुक्तानी */}
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-900 bg-emerald-100/90 text-xs">
                            रू {netPayable.toLocaleString()}
                          </td>

                          {/* Bank Account No */}
                          <td className="py-2.5 px-2 font-mono text-[10px] text-gray-600 truncate max-w-[120px]">
                            {p.teacher?.bankAccountNo || '—'}
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                              p.status === 'PAID' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              {p.status === 'PAID' ? '✓ PAID' : 'DRAFT'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {p.status === 'DRAFT' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPayroll(p)}
                                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white px-1.5 py-1 text-[10px] font-bold shadow-2xs transition cursor-pointer"
                                  title="ड्राफ्ट तलब सम्पादन गर्नुहोस् (Edit Draft Payroll)"
                                >
                                  <Edit2 size={11} />
                                  <span>Edit</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedSlip(p)}
                                className="inline-flex items-center gap-1 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 px-1.5 py-1 text-[10px] font-bold shadow-2xs transition cursor-pointer"
                                title="व्यक्तिगत तलब स्लिप प्रिन्ट गर्नुहोस्"
                              >
                                <Printer size={11} />
                                <span>Slip</span>
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (window.confirm(`के तपाईं "${p.teacher?.fullName || 'कर्मचारी'}" को तलब अभिलेख यस निकासाबाट हटाउन निश्चित हुनुहुन्छ?\n\n(Delete payroll record for "${p.teacher?.fullName || 'Staff'}"?)`)) {
                                    try {
                                      await api.delete(`/payroll/${p.id}`);
                                      toast.success(`"${p.teacher?.fullName || 'कर्मचारी'}" को तलब अभिलेख हटाइयो!`);
                                      queryClient.invalidateQueries({ queryKey: ['payrolls-list'] });
                                      queryClient.invalidateQueries({ queryKey: ['staff-peshkis'] });
                                      queryClient.invalidateQueries({ queryKey: ['staff-peshkis-active-list'] });
                                    } catch (err: any) {
                                      toast.error(err.response?.data?.message || 'हटाउन सकिएन');
                                    }
                                  }
                                }}
                                className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                                title="यो कर्मचारीको तलब रेकर्ड मेटाउनुहोस् (Delete from Payroll)"
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

                {/* ═════════ STICKY GRAND TOTAL FOOTER FOR HISTORY ═════════ */}
                <tfoot className="bg-slate-900 text-white font-bold text-xs sticky bottom-0 z-30 shadow-2xl">
                  <tr>
                    <td colSpan={2} className="py-3 px-3 text-left font-black tracking-wide text-amber-300 sticky left-0 z-40 bg-slate-900 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.4)] border-r border-slate-700">
                      कुल जम्मा (GRAND TOTAL: {historyTotals.count} जना):
                    </td>
                    <td colSpan={2}></td>
                    <td className="py-3 px-2 text-right font-mono text-gray-200">
                      रू {historyTotals.totalBasic.toLocaleString()}
                    </td>
                    <td></td>
                    <td></td>
                    <td className="py-3 px-2 text-right font-mono text-gray-200">
                      रू {historyTotals.totalGrade.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-white font-black">
                      रू {historyTotals.totalGradeSahitTalab.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-blue-200">
                      रू {historyTotals.totalKs10.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-gray-300">
                      रू {historyTotals.totalBimaThap.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-indigo-200">
                      रू {historyTotals.totalMonthlyBasicGross.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-purple-200">
                      रू {historyTotals.totalMahangi.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-purple-200">
                      रू {historyTotals.totalPraA.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-purple-200">
                      रू {historyTotals.totalOtherBhata.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-purple-300 font-extrabold">
                      रू {historyTotals.totalJammaBhata.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-purple-200">
                      रू {historyTotals.totalMonthlyGross.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono font-black text-amber-300 text-sm bg-blue-950/80">
                      रू {historyTotals.totalGross.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-rose-200">
                      रू {historyTotals.totalPF20.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-rose-200">
                      रू {historyTotals.totalLoan.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-rose-200">
                      रू {historyTotals.totalInsurance.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono font-extrabold text-rose-300 text-sm bg-rose-950/80">
                      - रू {historyTotals.totalDeductions.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-blue-200">
                      रू {historyTotals.totalBakiPaaunu.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-gray-200">
                      रू {historyTotals.totalFestival.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-gray-200">
                      रू {historyTotals.totalDress.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-emerald-200">
                      रू {historyTotals.totalKulRakam.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-amber-300">
                      - रू {historyTotals.totalTax1.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-amber-300 bg-amber-950/70">
                      {historyTotals.totalPeshki ? `- रू ${historyTotals.totalPeshki.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-300 text-base bg-emerald-950/90 border-l-2 border-emerald-400">
                      रू {historyTotals.totalNetPayable.toLocaleString()}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════ TAB 3: SALARY ADVANCE (पेस्की व्यवस्थापन) ════════════════════ */}
      {activeTab === 'peshki' && (
        <PeshkiManagementTab
          teachersData={teachersData || []}
          financialYearsData={financialYearsData || []}
          bankAccountsData={bankAccountsData || []}
          schoolProfile={schoolProfile}
          currentYear={selectedYear}
        />
      )}

      {/* ════════════════════ TAB 4: BANK TRANSFER LETTER (बैंक रकम ट्रान्सफर पत्र) ════════════════════ */}
      {activeTab === 'bank-letter' && (
        <BankTransferLetterTab
          schoolProfile={schoolProfile}
          currentBulkStaffList={currentBulkStaffListForBank}
          payrollsHistory={payrollsData || []}
          bankAccountsData={bankAccountsData || []}
          selectedYear={selectedYear}
          fromMonth={fromMonth}
          toMonth={toMonth}
          monthCount={monthCount}
        />
      )}

      {/* ════════════════════ TAB 5: SALARY SCALES & GRADES ════════════════════ */}
      {activeTab === 'scales' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-[#1e3a5f] flex items-center gap-2">
                <Settings size={16} />
                <span>Nepal Government Teacher Salary Scales & Grade Rates (नेपाल सरकार तलब स्केल तथा ग्रेड दर)</span>
              </h2>
              <p className="text-xs text-gray-500 font-nepali">
                तह तथा श्रेणी अनुसारको आधारभूत मूल तलब र प्रति ग्रेड दर सम्पादन तथा व्यवस्थापन
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => seedScalesMutation.mutate()}
                disabled={seedScalesMutation.isPending}
                className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Reset to Official Nepal GoN Scales</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingScale(null);
                  setScaleForm({ taha: 'माध्यमिक तह', shreni: 'तृतीय श्रेणी', moolTalab: 43689, gradeAmount: 1456 });
                  setIsScaleModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer"
              >
                <Plus size={14} />
                <span>+ Add Salary Scale</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-[#1e3a5f] text-white">
                <tr>
                  <th className="px-4 py-3.5 font-bold uppercase">क्र.सं.</th>
                  <th className="px-4 py-3.5 font-bold uppercase">तह / श्रेणी (Taha & Shreni)</th>
                  <th className="px-4 py-3.5 font-bold uppercase text-right">सुरु मूल तलब (Basic Salary)</th>
                  <th className="px-4 py-3.5 font-bold uppercase text-right">प्रति ग्रेड दर (Grade Rate)</th>
                  <th className="px-4 py-3.5 font-bold uppercase text-center">Status</th>
                  <th className="px-4 py-3.5 font-bold uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isScalesLoading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading salary scales...</td></tr>
                ) : (scalesData || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      No salary scales registered. Click &quot;Reset to Official Nepal GoN Scales&quot; above to initialize.
                    </td>
                  </tr>
                ) : (
                  scalesData.map((sc: any, idx: number) => (
                    <tr key={sc.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {sc.taha} <span className="text-gray-500 font-normal">({sc.shreni})</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-blue-900">
                        रू {sc.moolTalab?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-purple-900">
                        रू {sc.gradeAmount?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingScale(sc);
                              setScaleForm({
                                taha: sc.taha,
                                shreni: sc.shreni || '',
                                moolTalab: sc.moolTalab,
                                gradeAmount: sc.gradeAmount,
                              });
                              setIsScaleModalOpen(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete scale "${sc.taha} - ${sc.shreni}"?`)) {
                                deleteScaleMutation.mutate(sc.id);
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════ MODAL 0.5: ADD MISSING STAFF TO SAVED PAYROLL BATCH ════════════ */}
      {isAddMissingStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-emerald-200 my-auto max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>निकासा भरपाईमा कर्मचारी थप्नुहोस् (Add Staff to Payroll)</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold">
                      नयाँ प्रविष्टि
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    अवधि: {addMissingStaffForm.monthFrom} देखि {addMissingStaffForm.monthTo} ({addMissingStaffForm.monthCount} महिना)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMissingStaffModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addMissingStaffMutation.mutate();
              }}
              className="space-y-4"
            >
              {/* 1. Staff Selector */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-gray-200 space-y-2">
                <label className="text-xs font-bold text-gray-700 block">
                  शिक्षक / कर्मचारी छनौट गर्नुहोस् (Select Teacher / Staff): <span className="text-rose-500">*</span>
                </label>
                <select
                  value={addMissingStaffForm.teacherId}
                  onChange={(e) => handleMissingTeacherSelected(e.target.value)}
                  className="w-full text-xs font-bold bg-white border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
                  required
                >
                  <option value="">-- शिक्षक/कर्मचारी छान्नुहोस् --</option>
                  {unaddedTeachersInHistory.length > 0 && (
                    <optgroup label="⚠️ यस निकासामा समावेश हुन बाँकी कर्मचारीहरू (Un-added Staff)">
                      {unaddedTeachersInHistory.map((t: any) => (
                        <option key={t.id} value={t.id.toString()}>
                          {t.fullName} {t.fullNameNepali ? `(${t.fullNameNepali})` : ''} — {t.taha || t.post || 'शिक्षक'}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="अन्य सम्पूर्ण शिक्षक/कर्मचारीहरू">
                    {(teachersData || []).map((t: any) => (
                      <option key={t.id} value={t.id.toString()}>
                        {t.fullName} {t.fullNameNepali ? `(${t.fullNameNepali})` : ''} — {t.taha || t.post || 'शिक्षक'}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* 2. Scale & Post Matching */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">सरकारी तलब स्केल छनौट:</label>
                  <select
                    value={scalesData?.find((s: any) => s.taha === addMissingStaffForm.taha && s.shreni === addMissingStaffForm.shreni)?.id || ''}
                    onChange={(e) => {
                      const sc = scalesData?.find((s: any) => s.id.toString() === e.target.value);
                      if (sc) {
                        setAddMissingStaffForm((prev: any) => ({
                          ...prev,
                          taha: sc.taha,
                          shreni: sc.shreni,
                          moolTalab: sc.moolTalab,
                          gradeAmount: sc.gradeAmount,
                        }));
                      }
                    }}
                    className="w-full text-xs bg-white border border-gray-300 rounded-xl p-2 focus:outline-hidden"
                  >
                    <option value="">स्केल चयन गर्नुहोस्</option>
                    {scalesData?.map((sc: any) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.taha} - {sc.shreni} (रु {sc.moolTalab?.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">तह (Level):</label>
                  <input
                    type="text"
                    value={addMissingStaffForm.taha}
                    onChange={(e) => setAddMissingStaffForm({ ...addMissingStaffForm, taha: e.target.value })}
                    className="w-full text-xs bg-white border border-gray-300 rounded-xl p-2 focus:outline-hidden font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">श्रेणी (Class/Rank):</label>
                  <input
                    type="text"
                    value={addMissingStaffForm.shreni}
                    onChange={(e) => setAddMissingStaffForm({ ...addMissingStaffForm, shreni: e.target.value })}
                    className="w-full text-xs bg-white border border-gray-300 rounded-xl p-2 focus:outline-hidden font-medium"
                  />
                </div>
              </div>

              {/* 3. Basic Salary & Grade Inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                <div>
                  <label className="text-xs font-bold text-blue-950 block mb-1">[A] मूल तलब (रु):</label>
                  <input
                    type="number"
                    value={addMissingStaffForm.moolTalab || 0}
                    onChange={(e) => setAddMissingStaffForm({ ...addMissingStaffForm, moolTalab: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs bg-white border border-blue-300 rounded-xl p-2 font-mono font-bold focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-blue-950 block mb-1">[B] ग्रेड संख्या:</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={addMissingStaffForm.gradeNo || 0}
                    onChange={(e) => setAddMissingStaffForm({ ...addMissingStaffForm, gradeNo: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs bg-white border border-blue-300 rounded-xl p-2 font-mono font-bold focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-blue-950 block mb-1">[C] ग्रेड दर (रु):</label>
                  <input
                    type="number"
                    value={addMissingStaffForm.gradeAmount || 0}
                    onChange={(e) => setAddMissingStaffForm({ ...addMissingStaffForm, gradeAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs bg-white border border-blue-300 rounded-xl p-2 font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-blue-950 block mb-1">[E] जम्मा तलब (A+D):</label>
                  <div className="text-xs font-mono font-black text-blue-900 bg-white border border-blue-200 rounded-xl p-2">
                    रु {((parseFloat(addMissingStaffForm.moolTalab || 0)) + (parseInt(addMissingStaffForm.gradeNo || 0) * parseFloat(addMissingStaffForm.gradeAmount || 0))).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* 4. Provident Fund & Insurance Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-50/50 p-3.5 rounded-xl border border-purple-100">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="missing_ks_thap"
                      checked={addMissingStaffForm.hasKsKoshThap !== false}
                      onChange={(e) => setAddMissingStaffForm({ ...addMissingStaffForm, hasKsKoshThap: e.target.checked })}
                      className="rounded text-blue-700 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="missing_ks_thap" className="text-xs font-bold text-gray-800 cursor-pointer">
                      [F] क.सं. कोष १०% सरकारी थप लागू
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="missing_ks_katti"
                      checked={addMissingStaffForm.hasKsKoshKatti !== false}
                      onChange={(e) => setAddMissingStaffForm({ ...addMissingStaffForm, hasKsKoshKatti: e.target.checked })}
                      className="rounded text-rose-700 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="missing_ks_katti" className="text-xs font-bold text-gray-800 cursor-pointer">
                      [Q] क.सं. कोष २०% कट्टी लागू
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-0.5">[G] मासिक बीमा सरकारी थप (रु):</label>
                    <input
                      type="number"
                      value={addMissingStaffForm.bimaThap !== undefined ? addMissingStaffForm.bimaThap : 0}
                      onChange={(e) => setAddMissingStaffForm({ ...addMissingStaffForm, bimaThap: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs bg-white border border-purple-200 rounded-lg p-1.5 font-mono focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-0.5">[R] कोष सापट कट्टी (Loan Ded):</label>
                    <input
                      type="number"
                      value={addMissingStaffForm.karmachariKoshSapati || 0}
                      onChange={(e) => setAddMissingStaffForm({ ...addMissingStaffForm, karmachariKoshSapati: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs bg-white border border-purple-200 rounded-lg p-1.5 font-mono focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Allowances Grid */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-gray-200 space-y-3">
                <span className="text-xs font-bold text-gray-800 block">भत्ता तथा सुविधाहरू (Allowances & Benefits):</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="missing_mahangi"
                      checked={addMissingStaffForm.hasMahangiGhata !== false}
                      onChange={(e) => setAddMissingStaffForm({ ...addMissingStaffForm, hasMahangiGhata: e.target.checked })}
                      className="rounded text-purple-700 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="missing_mahangi" className="text-xs font-bold text-gray-700 cursor-pointer">
                      महङ्गी भत्ता (रु २०००)
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="missing_praa"
                      checked={Boolean(addMissingStaffForm.hasPraABhata)}
                      onChange={(e) => setAddMissingStaffForm({
                        ...addMissingStaffForm,
                        hasPraABhata: e.target.checked,
                        praABhata: e.target.checked ? (addMissingStaffForm.praABhata || 500) : 0,
                      })}
                      className="rounded text-purple-700 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="missing_praa" className="text-xs font-bold text-gray-700 cursor-pointer">
                      प्र.अ. / ईन्चार्ज भत्ता
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="missing_chaadparba"
                      checked={Boolean(addMissingStaffForm.includeChaadparba)}
                      onChange={(e) => setAddMissingStaffForm({ ...addMissingStaffForm, includeChaadparba: e.target.checked })}
                      className="rounded text-purple-700 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="missing_chaadparba" className="text-xs font-bold text-gray-700 cursor-pointer">
                      चाडपर्व खर्च (दसैं खर्च)
                    </label>
                  </div>
                </div>

                {addMissingStaffForm.hasPraABhata && (
                  <div className="pt-2">
                    <label className="text-[11px] font-bold text-gray-600 block mb-0.5">प्र.अ. भत्ता मासिक रकम (रु):</label>
                    <input
                      type="number"
                      value={addMissingStaffForm.praABhata || 0}
                      onChange={(e) => setAddMissingStaffForm({ ...addMissingStaffForm, praABhata: parseFloat(e.target.value) || 0 })}
                      className="w-36 text-xs bg-white border border-gray-300 rounded-lg p-1.5 font-mono focus:outline-hidden"
                    />
                  </div>
                )}
              </div>

              {/* 6. Live Computed Payout Preview */}
              {(() => {
                const calc = calculateRow({
                  ...addMissingStaffForm,
                  monthCount: addMissingStaffForm.monthCount || 3,
                });
                return (
                  <div className="bg-gradient-to-r from-emerald-950 via-[#1e3a5f] to-emerald-950 text-white p-4 rounded-xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] text-emerald-300 font-bold block uppercase tracking-wider">
                        भुक्तानी हिसाब सारांश ({addMissingStaffForm.monthCount} महिना):
                      </span>
                      <p className="text-xs text-blue-100 font-mono mt-0.5">
                        कुल तलब भत्ता: रु {calc.P?.toLocaleString()} • जम्मा कट्टी: रु {calc.T?.toLocaleString()} • कर १%: रु {calc.Y?.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-300 block">खुद बैंक भुक्तानी (Net Pay):</span>
                      <span className="text-xl font-black text-emerald-300 font-mono">
                        रू {calc.Z?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsAddMissingStaffModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  रद्द गर्नुहोस् (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={addMissingStaffMutation.isPending}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                >
                  {addMissingStaffMutation.isPending ? (
                    <span>थप्दैछ...</span>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>निकासामा समावेश गरी सुरक्षित गर्नुहोस् (Save to Payroll)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════ MODAL 0: EDIT DRAFT PAYROLL RECORD (ड्राफ्ट तलब विवरण सम्पादन) ════════════ */}
      {isEditPayrollModalOpen && editingPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-blue-200 my-auto max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                  <Edit2 size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>ड्राफ्ट तलब विवरण सम्पादन (Edit Draft Payroll)</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-extrabold">
                      DRAFT
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {editPayrollForm.teacherName} ({editPayrollForm.teacherPost || editPayrollForm.taha}) — {editPayrollForm.monthFrom} देखि {editPayrollForm.monthTo} ({editPayrollForm.monthCount} महिना)
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditPayrollModalOpen(false);
                  setEditingPayroll(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {(() => {
              const liveCalc = calculateRow({
                ...editPayrollForm,
                monthCount: editPayrollForm.monthCount || 3,
              });

              return (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updatePayrollMutation.mutate();
                  }}
                  className="space-y-4"
                >
                  {/* Live Net Pay Banner */}
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-700 p-4 rounded-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                    <div>
                      <span className="text-[11px] uppercase font-bold text-emerald-100 tracking-wider block">
                        खुद भुक्तानी पाउनु पर्ने रकम (Net Payable - स्तम्भ Z):
                      </span>
                      <span className="text-xs text-emerald-50">
                        {editPayrollForm.monthCount} महिनाको तलब भत्ता, थप सुविधा र कट्टी मिलान पश्चात
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl sm:text-3xl font-black font-mono">
                        रू {liveCalc.Z?.toLocaleString() || 0}
                      </span>
                      <span className="block text-[10.5px] text-emerald-100 font-mono">
                        (जम्मा पाउनु पर्ने X: रू {liveCalc.X?.toLocaleString()} - सा.सु.कर Y: रू {liveCalc.Y?.toLocaleString()} - पेस्की: रू {liveCalc.peshkiDeduction?.toLocaleString()})
                      </span>
                    </div>
                  </div>

                  {/* Section 1: तलब र ग्रेड (Columns A, B, C, D, E) */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase">
                      <Calculator size={14} className="text-blue-600" />
                      <span>१. सुरु तलब स्केल र ग्रेड (Salary & Grade)</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">महिना संख्या (Months):</label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={editPayrollForm.monthCount}
                          onChange={(e) => setEditPayrollForm({ ...editPayrollForm, monthCount: parseInt(e.target.value) || 1 })}
                          className="w-full rounded-lg border border-gray-300 p-2 font-mono font-bold bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">सुरु तलब A (Basic):</label>
                        <input
                          type="number"
                          value={editPayrollForm.moolTalab}
                          onChange={(e) => setEditPayrollForm({ ...editPayrollForm, moolTalab: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded-lg border border-gray-300 p-2 font-mono font-bold bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">ग्रेड संख्या B (Grade No):</label>
                        <input
                          type="number"
                          value={editPayrollForm.gradeNo}
                          onChange={(e) => setEditPayrollForm({ ...editPayrollForm, gradeNo: parseInt(e.target.value) || 0 })}
                          className="w-full rounded-lg border border-gray-300 p-2 font-mono font-bold bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">ग्रेड दर C (Grade Rate):</label>
                        <input
                          type="number"
                          value={editPayrollForm.gradeAmount}
                          onChange={(e) => setEditPayrollForm({ ...editPayrollForm, gradeAmount: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded-lg border border-gray-300 p-2 font-mono font-bold bg-white"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs bg-white px-3 py-2 rounded-lg border border-slate-200 font-mono">
                      <span>जम्मा ग्रेड D = रू {liveCalc.D?.toLocaleString()}</span>
                      <span className="font-bold text-blue-900">जम्मा तलब (ग्रेड सहित) E = रू {liveCalc.E?.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Section 2: थप रकम र कोष (Columns F, G, H) */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      <span>२. थप रकम तथा कुल तलब (Employer Additions F, G, H)</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-white border-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-800">
                          <input
                            type="checkbox"
                            checked={editPayrollForm.hasKsKoshThap}
                            onChange={(e) => setEditPayrollForm({ ...editPayrollForm, hasKsKoshThap: e.target.checked })}
                            className="rounded text-blue-600 focus:ring-0"
                          />
                          <span>क.सं. कोष थप १०% (F)</span>
                        </label>
                        <span className="font-mono font-bold text-emerald-800">रू {liveCalc.F?.toLocaleString()}</span>
                      </div>

                      <div className="p-2.5 rounded-lg border bg-white border-gray-200">
                        <label className="block font-semibold text-gray-700 mb-1">बीमा थप G (Insurance Add):</label>
                        <input
                          type="number"
                          value={editPayrollForm.bimaThap !== undefined ? editPayrollForm.bimaThap : 0}
                          onChange={(e) => setEditPayrollForm({ ...editPayrollForm, bimaThap: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded-lg border border-gray-300 p-1.5 font-mono font-bold bg-white text-xs"
                        />
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-blue-50/80 border-blue-200">
                        <span className="font-bold text-blue-950">कुल तलब H (E+F+G):</span>
                        <span className="font-mono font-black text-blue-900 text-sm">रू {liveCalc.H?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: मासिक भत्ताहरू (Columns I, J, K, L, M, N, O, P) */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase">
                      <Briefcase size={14} className="text-purple-600" />
                      <span>३. मासिक भत्ताहरू (Allowances N, O, P)</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      {/* Mahangi */}
                      <div className="p-2 rounded-lg border bg-white border-gray-200 space-y-1">
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-gray-800">
                          <input
                            type="checkbox"
                            checked={editPayrollForm.hasMahangiGhata}
                            onChange={(e) => setEditPayrollForm({ ...editPayrollForm, hasMahangiGhata: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          <span>महङ्गी भत्ता J</span>
                        </label>
                        <input
                          type="number"
                          disabled={!editPayrollForm.hasMahangiGhata}
                          value={editPayrollForm.mahangiGhata}
                          onChange={(e) => setEditPayrollForm({ ...editPayrollForm, mahangiGhata: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded border border-gray-300 p-1 font-mono font-bold text-xs disabled:bg-gray-100"
                        />
                      </div>

                      {/* Pra A */}
                      <div className="p-2 rounded-lg border bg-white border-gray-200 space-y-1">
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-gray-800">
                          <input
                            type="checkbox"
                            checked={editPayrollForm.hasPraABhata}
                            onChange={(e) => setEditPayrollForm({ ...editPayrollForm, hasPraABhata: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          <span>प्र.अ. भत्ता I</span>
                        </label>
                        <input
                          type="number"
                          disabled={!editPayrollForm.hasPraABhata}
                          value={editPayrollForm.praABhata}
                          onChange={(e) => setEditPayrollForm({ ...editPayrollForm, praABhata: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded border border-gray-300 p-1 font-mono font-bold text-xs disabled:bg-gray-100"
                        />
                      </div>

                      {/* Durgam */}
                      <div className="p-2 rounded-lg border bg-white border-gray-200 space-y-1">
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-gray-800">
                          <input
                            type="checkbox"
                            checked={editPayrollForm.hasDurgamBhata}
                            onChange={(e) => setEditPayrollForm({ ...editPayrollForm, hasDurgamBhata: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          <span>दुर्गम भत्ता K</span>
                        </label>
                        <input
                          type="number"
                          disabled={!editPayrollForm.hasDurgamBhata}
                          value={editPayrollForm.durgamBhata}
                          onChange={(e) => setEditPayrollForm({ ...editPayrollForm, durgamBhata: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded border border-gray-300 p-1 font-mono font-bold text-xs disabled:bg-gray-100"
                        />
                      </div>

                      {/* Protsahan */}
                      <div className="p-2 rounded-lg border bg-white border-gray-200 space-y-1">
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-gray-800">
                          <input
                            type="checkbox"
                            checked={editPayrollForm.hasProtsahanBhata}
                            onChange={(e) => setEditPayrollForm({ ...editPayrollForm, hasProtsahanBhata: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          <span>प्रोत्साहन भत्ता L</span>
                        </label>
                        <input
                          type="number"
                          disabled={!editPayrollForm.hasProtsahanBhata}
                          value={editPayrollForm.protsahanBhata}
                          onChange={(e) => setEditPayrollForm({ ...editPayrollForm, protsahanBhata: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded border border-gray-300 p-1 font-mono font-bold text-xs disabled:bg-gray-100"
                        />
                      </div>

                      {/* Other */}
                      <div className="p-2 rounded-lg border bg-white border-gray-200 space-y-1 col-span-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-gray-800">
                            <input
                              type="checkbox"
                              checked={editPayrollForm.hasOtherBhata}
                              onChange={(e) => setEditPayrollForm({ ...editPayrollForm, hasOtherBhata: e.target.checked })}
                              className="rounded text-blue-600"
                            />
                            <span>अन्य / स्थानीय भत्ता M:</span>
                          </label>
                          <input
                            type="text"
                            placeholder="भत्ताको नाम"
                            disabled={!editPayrollForm.hasOtherBhata}
                            value={editPayrollForm.otherBhataLabel}
                            onChange={(e) => setEditPayrollForm({ ...editPayrollForm, otherBhataLabel: e.target.value })}
                            className="w-32 rounded border border-gray-300 px-1 py-0.5 text-[11px] disabled:bg-gray-100"
                          />
                        </div>
                        <input
                          type="number"
                          disabled={!editPayrollForm.hasOtherBhata}
                          value={editPayrollForm.otherBhata}
                          onChange={(e) => setEditPayrollForm({ ...editPayrollForm, otherBhata: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded border border-gray-300 p-1 font-mono font-bold text-xs disabled:bg-gray-100"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs bg-white px-3 py-2 rounded-lg border border-slate-200 font-mono">
                      <span>जम्मा भत्ता N = रू {liveCalc.N?.toLocaleString()}</span>
                      <span>मासिक तलबभत्ता O = रू {liveCalc.O?.toLocaleString()}</span>
                      <span className="font-bold text-purple-900">{editPayrollForm.monthCount} महिनाको तलब भत्ता P = रू {liveCalc.P?.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Section 4: कट्टीहरू (Columns Q, R, S, T, U) */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase">
                      <Trash2 size={14} className="text-rose-600" />
                      <span>४. कट्टी रकमहरू (Deductions Q, R, S, T)</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-white border-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-800">
                          <input
                            type="checkbox"
                            checked={editPayrollForm.hasKsKoshKatti}
                            onChange={(e) => setEditPayrollForm({ ...editPayrollForm, hasKsKoshKatti: e.target.checked })}
                            className="rounded text-rose-600 focus:ring-0"
                          />
                          <span>क.सं. कोष २०% कट्टी (Q)</span>
                        </label>
                        <span className="font-mono font-bold text-rose-700">रू {liveCalc.Q?.toLocaleString()}</span>
                      </div>

                      <div className="p-2.5 rounded-lg border bg-white border-gray-200">
                        <label className="block font-semibold text-gray-700 mb-1">कोष सापट कट्टी R (Kosh Sapati):</label>
                        <input
                          type="number"
                          value={editPayrollForm.karmachariKoshSapati}
                          onChange={(e) => setEditPayrollForm({ ...editPayrollForm, karmachariKoshSapati: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded-lg border border-gray-300 p-1.5 font-mono font-bold bg-white text-xs"
                        />
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-lg border bg-white border-gray-200">
                        <span className="font-semibold text-gray-800">बीमा कट्टी S (G*2*{editPayrollForm.monthCount}):</span>
                        <span className="font-mono font-bold text-rose-700">रू {liveCalc.S?.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs bg-white px-3 py-2 rounded-lg border border-slate-200 font-mono">
                      <span className="font-bold text-rose-800">जम्मा कट्टी T = रू {liveCalc.T?.toLocaleString()}</span>
                      <span className="font-bold text-emerald-800">बाँकी पाउनु पर्ने U (P - T) = रू {liveCalc.U?.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Section 5: चाडपर्व, पोसाक, कर र पेस्की कट्टी (V, W, X, Y, Peshki, Z) */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase">
                      <Sparkles size={14} className="text-amber-600" />
                      <span>५. चाडपर्व, पोसाक, कर र पेस्की (Festival, Dress, Tax, Advance)</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {/* Festival */}
                      <div className="p-2.5 rounded-lg border bg-white border-gray-200 space-y-1">
                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-800">
                          <input
                            type="checkbox"
                            checked={editPayrollForm.includeChaadparba}
                            onChange={(e) => setEditPayrollForm({ ...editPayrollForm, includeChaadparba: e.target.checked })}
                            className="rounded text-amber-600"
                          />
                          <span>चाडपर्व खर्च V (Festival = E)</span>
                        </label>
                        <span className="font-mono font-bold text-amber-900 block">रू {liveCalc.V?.toLocaleString()}</span>
                      </div>

                      {/* Dress */}
                      <div className="p-2.5 rounded-lg border bg-white border-gray-200">
                        <label className="block font-semibold text-gray-700 mb-1">पोसाक भत्ता W (Dress Allowance):</label>
                        <input
                          type="number"
                          value={editPayrollForm.poshakBhata}
                          onChange={(e) => setEditPayrollForm({ ...editPayrollForm, poshakBhata: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded-lg border border-gray-300 p-1.5 font-mono font-bold bg-white text-xs"
                        />
                      </div>

                      {/* Peshki Advance Deduction */}
                      <div className="p-2.5 rounded-lg border bg-rose-50/80 border-rose-200">
                        <label className="block font-bold text-rose-900 mb-1">पेस्की कट्टी (Peshki Advance Deduction):</label>
                        <input
                          type="number"
                          value={editPayrollForm.peshkiDeduction}
                          onChange={(e) => setEditPayrollForm({ ...editPayrollForm, peshkiDeduction: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded-lg border border-rose-300 p-1.5 font-mono font-bold bg-white text-xs text-rose-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-white p-3 rounded-lg border border-slate-200 font-mono">
                      <div>
                        <span className="text-gray-600 block text-[11px]">जम्मा पाउनु पर्ने X (U+V+W):</span>
                        <span className="font-bold text-slate-900">रू {liveCalc.X?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 block text-[11px]">सा.सु. कर १% कट्टी Y:</span>
                        <span className="font-bold text-rose-700">रू {liveCalc.Y?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-emerald-700 block text-[11px] font-bold">खुद भुक्तानी Z:</span>
                        <span className="font-black text-emerald-800 text-sm">रू {liveCalc.Z?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 6: कैफियत / टिप्पणी (Note) */}
                  <div className="text-xs">
                    <label className="block font-semibold text-gray-700 mb-1">कैफियत / टिप्पणी (Remarks / Note):</label>
                    <input
                      type="text"
                      placeholder="उदा: ग्रेड वृद्धि समायोजन, विशेष कटौती..."
                      value={editPayrollForm.note}
                      onChange={(e) => setEditPayrollForm({ ...editPayrollForm, note: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 p-2 text-xs"
                    />
                  </div>

                  {/* Modal Footer Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditPayrollModalOpen(false);
                        setEditingPayroll(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                    >
                      रद्द गर्नुहोस् (Cancel)
                    </button>
                    <button
                      type="submit"
                      disabled={updatePayrollMutation.isPending}
                      className="px-6 py-2.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      <CheckCircle2 size={16} />
                      <span>{updatePayrollMutation.isPending ? 'सुरक्षित गर्दैछ...' : 'परिवर्तन सुरक्षित गर्नुहोस् (Save Changes)'}</span>
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* ════════════ MODAL 1: DISBURSE VIA BANK (एकमुष्ट बैंक भुक्तानी) ════════════ */}
      {isDisburseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1e3a5f] flex items-center gap-2">
                  <CreditCard className="text-emerald-600" size={18} />
                  <span>एकमुष्ट बैंक तलब निकासा (Bulk Bank Salary Allotment)</span>
                </h3>
                <p className="text-[11px] text-gray-500 font-nepali">
                  {selectedTeacherIds.length} जना शिक्षक/कर्मचारीको कुल खुद तलब रकम निकासा गरी लेखा प्रणालीमा खर्च प्रविष्टि हुनेछ।
                </p>
              </div>
              <button onClick={() => setIsDisburseModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-900 block">कुल निकासा रकम (Net Disbursable):</span>
                <span className="text-xs font-semibold text-emerald-800">{selectedTeacherIds.length} Teachers / Staff</span>
              </div>
              <span className="text-xl font-black font-mono text-emerald-900">
                रू {grandTotals.totalNetZ.toLocaleString()}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">भुक्तानी गरिने विद्यालयको बैंक खाता (School Bank Account):</label>
                <select
                  value={disburseForm.bankAccountId}
                  onChange={(e) => setDisburseForm({ ...disburseForm, bankAccountId: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 p-2 font-semibold bg-white"
                >
                  <option value="">-- Choose Bank Account --</option>
                  {(bankAccountsData || []).map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.accountName} (A/C: {b.accountNumber || b.accountNo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">निकासा मिति BS (Date):</label>
                  <input
                    type="text"
                    value={disburseForm.paymentDateBs}
                    onChange={(e) => setDisburseForm({ ...disburseForm, paymentDateBs: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">चेक नं. / भौचर नं. (Cheque/Voucher):</label>
                  <input
                    type="text"
                    placeholder="CHQ-10492 / VCH-01"
                    value={disburseForm.chequeNo}
                    onChange={(e) => setDisburseForm({ ...disburseForm, chequeNo: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">कैफियत / टिप्पणी (Remarks / Narration):</label>
                <textarea
                  rows={2}
                  placeholder="आर्थिक वर्ष २०८३/०८४ त्रैमासिक तलब भत्ता निकासा..."
                  value={disburseForm.remarks}
                  onChange={(e) => setDisburseForm({ ...disburseForm, remarks: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsDisburseModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                type="button"
                disabled={issueBulkPaymentMutation.isPending}
                onClick={() => issueBulkPaymentMutation.mutate()}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 size={15} />
                <span>{issueBulkPaymentMutation.isPending ? 'Processing...' : 'निकासा तथा खर्च प्रविष्टि गर्नुहोस्'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ MODAL 2: DETAILED ALLOWANCES EDIT MODAL ════════════ */}
      {isSingleEditModalOpen && singleEditData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h3 className="text-sm font-bold text-[#1e3a5f]">
                  भत्ता विवरण सम्पादन: {singleEditData.fullName}
                </h3>
                <p className="text-[10.5px] text-gray-500">प्र.अ. भत्ता, महङ्गी, दुर्गम तथा प्रोत्साहन भत्ता समायोजन</p>
              </div>
              <button onClick={() => setIsSingleEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* प्र.अ. भत्ता */}
              <div className="p-2.5 rounded-xl border border-gray-200 bg-slate-50 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkRows[singleEditData.teacherId]?.hasPraABhata || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        handleFieldChange(singleEditData.teacherId, 'hasPraABhata', checked);
                        if (checked && (!bulkRows[singleEditData.teacherId]?.praABhata || bulkRows[singleEditData.teacherId]?.praABhata === 0)) {
                          handleFieldChange(singleEditData.teacherId, 'praABhata', 1000);
                        }
                      }}
                      className="rounded text-purple-700 w-4 h-4 cursor-pointer"
                    />
                    <span>प्र.अ. भत्ता (Principal Only)</span>
                  </label>
                  <span className="text-[10px] text-gray-500">Applicable?</span>
                </div>
                <input
                  type="number"
                  disabled={!bulkRows[singleEditData.teacherId]?.hasPraABhata}
                  value={bulkRows[singleEditData.teacherId]?.hasPraABhata ? (bulkRows[singleEditData.teacherId]?.praABhata || 0) : 0}
                  onChange={(e) => handleFieldChange(singleEditData.teacherId, 'praABhata', parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-lg border p-2 font-mono ${
                    bulkRows[singleEditData.teacherId]?.hasPraABhata ? 'border-purple-300 bg-white font-bold' : 'border-gray-200 bg-gray-100 text-gray-400'
                  }`}
                  placeholder="0"
                />
              </div>

              {/* महङ्गी भत्ता */}
              <div className="p-2.5 rounded-xl border border-gray-200 bg-slate-50 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkRows[singleEditData.teacherId]?.hasMahangiGhata !== false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        handleFieldChange(singleEditData.teacherId, 'hasMahangiGhata', checked);
                        if (checked && (!bulkRows[singleEditData.teacherId]?.mahangiGhata || bulkRows[singleEditData.teacherId]?.mahangiGhata === 0)) {
                          handleFieldChange(singleEditData.teacherId, 'mahangiGhata', globalDearnessAmount || 2000);
                        }
                      }}
                      className="rounded text-purple-700 w-4 h-4 cursor-pointer"
                    />
                    <span>महङ्गी भत्ता</span>
                  </label>
                  <span className="text-[10px] text-gray-500">Applicable?</span>
                </div>
                <input
                  type="number"
                  disabled={bulkRows[singleEditData.teacherId]?.hasMahangiGhata === false}
                  value={bulkRows[singleEditData.teacherId]?.hasMahangiGhata !== false ? (bulkRows[singleEditData.teacherId]?.mahangiGhata !== undefined ? bulkRows[singleEditData.teacherId]?.mahangiGhata : 2000) : 0}
                  onChange={(e) => handleFieldChange(singleEditData.teacherId, 'mahangiGhata', parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-lg border p-2 font-mono ${
                    bulkRows[singleEditData.teacherId]?.hasMahangiGhata !== false ? 'border-purple-300 bg-white font-bold' : 'border-gray-200 bg-gray-100 text-gray-400'
                  }`}
                  placeholder="0"
                />
              </div>

              {/* दुर्गम भत्ता */}
              <div className="p-2.5 rounded-xl border border-gray-200 bg-slate-50 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkRows[singleEditData.teacherId]?.hasDurgamBhata || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        handleFieldChange(singleEditData.teacherId, 'hasDurgamBhata', checked);
                        if (checked && (!bulkRows[singleEditData.teacherId]?.durgamBhata || bulkRows[singleEditData.teacherId]?.durgamBhata === 0)) {
                          handleFieldChange(singleEditData.teacherId, 'durgamBhata', 1000);
                        }
                      }}
                      className="rounded text-purple-700 w-4 h-4 cursor-pointer"
                    />
                    <span>दुर्गम भत्ता</span>
                  </label>
                  <span className="text-[10px] text-gray-500">Applicable?</span>
                </div>
                <input
                  type="number"
                  disabled={!bulkRows[singleEditData.teacherId]?.hasDurgamBhata}
                  value={bulkRows[singleEditData.teacherId]?.hasDurgamBhata ? (bulkRows[singleEditData.teacherId]?.durgamBhata || 0) : 0}
                  onChange={(e) => handleFieldChange(singleEditData.teacherId, 'durgamBhata', parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-lg border p-2 font-mono ${
                    bulkRows[singleEditData.teacherId]?.hasDurgamBhata ? 'border-purple-300 bg-white font-bold' : 'border-gray-200 bg-gray-100 text-gray-400'
                  }`}
                  placeholder="0"
                />
              </div>

              {/* प्रोत्साहन भत्ता */}
              <div className="p-2.5 rounded-xl border border-gray-200 bg-slate-50 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkRows[singleEditData.teacherId]?.hasProtsahanBhata || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        handleFieldChange(singleEditData.teacherId, 'hasProtsahanBhata', checked);
                        if (checked && (!bulkRows[singleEditData.teacherId]?.protsahanBhata || bulkRows[singleEditData.teacherId]?.protsahanBhata === 0)) {
                          handleFieldChange(singleEditData.teacherId, 'protsahanBhata', 1000);
                        }
                      }}
                      className="rounded text-purple-700 w-4 h-4 cursor-pointer"
                    />
                    <span>प्रोत्साहन भत्ता</span>
                  </label>
                  <span className="text-[10px] text-gray-500">Applicable?</span>
                </div>
                <input
                  type="number"
                  disabled={!bulkRows[singleEditData.teacherId]?.hasProtsahanBhata}
                  value={bulkRows[singleEditData.teacherId]?.hasProtsahanBhata ? (bulkRows[singleEditData.teacherId]?.protsahanBhata || 0) : 0}
                  onChange={(e) => handleFieldChange(singleEditData.teacherId, 'protsahanBhata', parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-lg border p-2 font-mono ${
                    bulkRows[singleEditData.teacherId]?.hasProtsahanBhata ? 'border-purple-300 bg-white font-bold' : 'border-gray-200 bg-gray-100 text-gray-400'
                  }`}
                  placeholder="0"
                />
              </div>

              {/* अन्य भत्ता */}
              <div className="p-2.5 rounded-xl border border-gray-200 bg-slate-50 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkRows[singleEditData.teacherId]?.hasOtherBhata || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        handleFieldChange(singleEditData.teacherId, 'hasOtherBhata', checked);
                        if (checked && (!bulkRows[singleEditData.teacherId]?.otherBhata || bulkRows[singleEditData.teacherId]?.otherBhata === 0)) {
                          handleFieldChange(singleEditData.teacherId, 'otherBhata', 500);
                        }
                      }}
                      className="rounded text-purple-700 w-4 h-4 cursor-pointer"
                    />
                    <span>अन्य भत्ता</span>
                  </label>
                  <span className="text-[10px] text-gray-500">Applicable?</span>
                </div>
                <input
                  type="number"
                  disabled={!bulkRows[singleEditData.teacherId]?.hasOtherBhata}
                  value={bulkRows[singleEditData.teacherId]?.hasOtherBhata ? (bulkRows[singleEditData.teacherId]?.otherBhata || 0) : 0}
                  onChange={(e) => handleFieldChange(singleEditData.teacherId, 'otherBhata', parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-lg border p-2 font-mono ${
                    bulkRows[singleEditData.teacherId]?.hasOtherBhata ? 'border-purple-300 bg-white font-bold' : 'border-gray-200 bg-gray-100 text-gray-400'
                  }`}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsSingleEditModalOpen(false)}
                className="px-4 py-2 bg-[#1e3a5f] text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                सम्झनुहोस् (Done)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ MODAL 3: SALARY SCALE CREATE/EDIT ════════════ */}
      {isScaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-[#1e3a5f]">
                {editingScale ? 'Edit Salary Scale' : 'Add New Salary Scale'}
              </h3>
              <button onClick={() => setIsScaleModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">तह (Taha / Level):</label>
                <input
                  type="text"
                  placeholder="माध्यमिक तह / निम्न माध्यमिक तह / प्राथमिक तह"
                  value={scaleForm.taha}
                  onChange={(e) => setScaleForm({ ...scaleForm, taha: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2 font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">श्रेणी (Shreni):</label>
                <input
                  type="text"
                  placeholder="प्रथम श्रेणी / द्वितीय श्रेणी / तृतीय श्रेणी"
                  value={scaleForm.shreni}
                  onChange={(e) => setScaleForm({ ...scaleForm, shreni: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">सुरु मूल तलब (Basic Salary):</label>
                <input
                  type="number"
                  value={scaleForm.moolTalab}
                  onChange={(e) => setScaleForm({ ...scaleForm, moolTalab: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-300 p-2 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">प्रति ग्रेड दर (Grade Rate):</label>
                <input
                  type="number"
                  value={scaleForm.gradeAmount}
                  onChange={(e) => setScaleForm({ ...scaleForm, gradeAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-300 p-2 font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsScaleModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saveScaleMutation.isPending}
                onClick={() => saveScaleMutation.mutate()}
                className="px-5 py-2 text-xs font-bold text-white bg-[#1e3a5f] hover:bg-[#2a5280] rounded-xl shadow-xs transition cursor-pointer"
              >
                Save Scale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ INDIVIDUAL PAY SLIP MODAL & PRINT ════════════ */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-[#1e3a5f]">
                आधिकारिक तलब स्लिप (Official Salary Slip): {selectedSlip.teacher?.fullName}
              </h3>
              <button onClick={() => setSelectedSlip(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-slate-50 space-y-3 text-xs">
              <div className="text-center border-b pb-2">
                <h4 className="font-extrabold text-[#1e3a5f] text-base">{schoolProfile?.nameNepali || 'नेपाल माध्यमिक विद्यालय'}</h4>
                <p className="text-[10.5px] text-gray-500">{schoolProfile?.address || 'रौतहट'} | {selectedSlip.monthFrom} देखि {selectedSlip.monthTo} सम्म</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><strong>शिक्षकको नाम:</strong> {selectedSlip.teacher?.fullNameNepali || selectedSlip.teacher?.fullName}</div>
                <div><strong>पद / तह:</strong> {selectedSlip.taha} {selectedSlip.shreni ? `(${selectedSlip.shreni})` : ''}</div>
                <div><strong>PAN No:</strong> {selectedSlip.teacher?.panNo || 'N/A'}</div>
                <div><strong>Bank A/C:</strong> {selectedSlip.teacher?.bankAccountNo || 'Bank Deposit'}</div>
              </div>

              <div className="space-y-1.5 border-t pt-2.5 font-mono">
                <div className="flex justify-between"><span>मूल तलब (Basic Salary):</span><span>रू {selectedSlip.moolTalab?.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>जम्मा ग्रेड ({selectedSlip.gradeNo || 0} ग्रेड):</span><span>रू {selectedSlip.gradeRakam?.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold text-[#1e3a5f]"><span>जम्मा तलब (ग्रेड सहित):</span><span>रू {selectedSlip.gradeSahitTalab?.toLocaleString()}</span></div>
                {(selectedSlip.jammaBhata || 0) > 0 && (
                  <div className="flex justify-between"><span>जम्मा भत्ताहरू (Allowances):</span><span>रू {selectedSlip.jammaBhata?.toLocaleString()}</span></div>
                )}
                <div className="flex justify-between font-bold text-blue-900"><span>कुल तलब भत्ता निकासा:</span><span>रू {selectedSlip.traimasikTalan?.toLocaleString()}</span></div>
                <div className="flex justify-between text-rose-700"><span>कर्मचारी सञ्चय कोष २०% कट्टी:</span><span>- रू {selectedSlip.ssk20Pct?.toLocaleString()}</span></div>
                {(selectedSlip.karmachariKoshSapati || 0) > 0 && (
                  <div className="flex justify-between text-rose-700"><span>क.सं. कोष सापट कट्टी:</span><span>- रू {selectedSlip.karmachariKoshSapati?.toLocaleString()}</span></div>
                )}
                {(selectedSlip.bimaKati || 0) > 0 && (
                  <div className="flex justify-between text-rose-700"><span>बीमा कट्टी:</span><span>- रू {selectedSlip.bimaKati?.toLocaleString()}</span></div>
                )}
                <div className="flex justify-between font-bold text-rose-800 bg-rose-50 px-2 py-1 rounded">
                  <span>जम्मा कट्टी रकम:</span>
                  <span>- रू {selectedSlip.jammaKati?.toLocaleString()}</span>
                </div>
                {selectedSlip.chaadparbaKharcha > 0 && (
                  <div className="flex justify-between text-purple-700"><span>चाडपर्व खर्च (दसैं भत्ता):</span><span>+ रू {selectedSlip.chaadparbaKharcha?.toLocaleString()}</span></div>
                )}
                {selectedSlip.poshakBhata > 0 && (
                  <div className="flex justify-between text-blue-800"><span>पोसाक भत्ता:</span><span>+ रू {selectedSlip.poshakBhata?.toLocaleString()}</span></div>
                )}
                <div className="flex justify-between text-amber-800"><span>सा.सु. कर १% कट्टी:</span><span>- रू {selectedSlip.samajikSurakshaKar1Pct?.toLocaleString()}</span></div>
                {(selectedSlip.peshkiDeduction || selectedSlip.peshkiKati || 0) > 0 && (
                  <div className="flex justify-between font-bold text-amber-900 bg-amber-50 px-2 py-1 rounded">
                    <span>पेस्की कट्टी (Salary Advance Deduct):</span>
                    <span>- रू {(selectedSlip.peshkiDeduction || selectedSlip.peshkiKati).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm text-emerald-800 bg-emerald-100 p-2.5 rounded-lg mt-2">
                  <span>खुद भुक्तानी रकम (Net Payable):</span>
                  <span>रू {selectedSlip.khudPaaunuParne?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedSlip(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerPrintIndividualSlip(selectedSlip);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#1e3a5f] hover:bg-[#2a5280] rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Printer size={14} />
                <span>Print Official Pay Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ ADD PAST / HISTORICAL STAFF MODAL ════════════ */}
      {isAddPastStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    विगत / पूर्व शिक्षक वा कर्मचारीको अभिलेख (Historical Staff)
                  </h3>
                  <p className="text-[11px] text-gray-500 font-nepali">
                    विगतका आर्थिक वर्षको तलब भरपाईका लागि दर्ता (Login Portal खाता बन्द रहनेछ)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddPastStaffOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-700" />
              <span>
                यो फारामबाट विगतमा सरुवा भएका, अवकाश पाएका वा राजिनामा दिएका शिक्षक/कर्मचारीको विवरण थपिनेछ। उनीहरूको कुनै पनि Login Portal सक्रिय हुने छैन र केवल तलब भरपाई तथा अभिलेखमा प्रयोग हुनेछ।
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!pastStaffForm.fullName.trim()) {
                  toast.error('कृपया शिक्षक वा कर्मचारीको नाम प्रविष्ट गर्नुहोस्');
                  return;
                }
                addPastStaffMutation.mutate(pastStaffForm);
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    कर्मचारीको पूरा नाम (English) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ram Prasad Sharma"
                    value={pastStaffForm.fullName}
                    onChange={(e) => setPastStaffForm({ ...pastStaffForm, fullName: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    नाम (नेपालीमा)
                  </label>
                  <input
                    type="text"
                    placeholder="उदा: राम प्रसाद शर्मा"
                    value={pastStaffForm.fullNameNepali}
                    onChange={(e) => setPastStaffForm({ ...pastStaffForm, fullNameNepali: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2 font-nepali"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">प्रकार / वर्ग</label>
                  <select
                    value={pastStaffForm.shreni}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPastStaffForm({
                        ...pastStaffForm,
                        shreni: val,
                        post: val === 'NON_TEACHING' ? 'कार्यालय सहयोगी' : 'मा.वि. शिक्षक',
                        taha: val === 'NON_TEACHING' ? 'कार्यालय सहयोगी' : 'माध्यमिक तह',
                      });
                    }}
                    className="w-full rounded-lg border border-gray-300 p-2 font-medium"
                  >
                    <option value="TEACHING">शिक्षक (Teaching Staff)</option>
                    <option value="NON_TEACHING">गैर-शैक्षिक कर्मचारी (Non-Teaching Staff)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">दरबन्दी प्रकार</label>
                  <select
                    value={pastStaffForm.type}
                    onChange={(e) => setPastStaffForm({ ...pastStaffForm, type: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2 font-medium"
                  >
                    {availableTeacherTypes.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">तह (Taha / Level)</label>
                  <input
                    type="text"
                    placeholder="माध्यमिक तह / निम्न माध्यमिक तह / प्राथमिक तह"
                    value={pastStaffForm.taha}
                    onChange={(e) => setPastStaffForm({ ...pastStaffForm, taha: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">पद (Post)</label>
                  <input
                    type="text"
                    placeholder="उदा: शिक्षक, सह-लेखापाल, पियन"
                    value={pastStaffForm.post}
                    onChange={(e) => setPastStaffForm({ ...pastStaffForm, post: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">स्थायी लेखा नं. (PAN No)</label>
                  <input
                    type="text"
                    placeholder="PAN No"
                    value={pastStaffForm.panNo}
                    onChange={(e) => setPastStaffForm({ ...pastStaffForm, panNo: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">अवस्था / कारण (Status)</label>
                  <select
                    value={pastStaffForm.statusReason}
                    onChange={(e) => setPastStaffForm({ ...pastStaffForm, statusReason: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2 font-medium"
                  >
                    <option value="सरुवा (Transferred)">सरुवा (Transferred)</option>
                    <option value="अनिवार्य अवकाश (Retired)">अनिवार्य अवकाश (Retired)</option>
                    <option value="राजिनामा (Resigned)">राजिनामा (Resigned)</option>
                    <option value="अन्य पूर्व कर्मचारी (Past Staff)">अन्य पूर्व कर्मचारी (Past Staff)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddPastStaffOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  रद्द गर्नुहोस् (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={addPastStaffMutation.isPending}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 size={14} />
                  <span>{addPastStaffMutation.isPending ? 'थप्दैछ...' : 'सुरक्षित गर्नुहोस् (Add Past Staff)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
