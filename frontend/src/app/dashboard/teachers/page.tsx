'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  BookOpen,
  Award,
  Building,
  KeyRound,
  X,
  CreditCard,
  User,
  Edit2,
  Trash2,
  Upload,
  Camera,
  CheckCircle2,
  Briefcase,
  Layers,
  ShieldCheck,
  UserCheck,
  Users,
  CheckSquare,
  ClipboardList,
  Clock,
  AlertCircle,
  FileCheck,
  Sparkles,
  Check,
  ChevronRight,
  Activity,
  CalendarDays,
  Flame,
  List,
  LayoutGrid,
  ArrowRightLeft,
  Landmark,
  Star,
  CheckCircle,
  Eye,
  Copy,
  Wallet,
  ArrowUpDown,
  Sliders,
} from 'lucide-react';
import toast from 'react-hot-toast';
import StaffMastersTab from '@/components/teachers/StaffMastersTab';
import DisplayOrderManagerModal from '@/components/teachers/DisplayOrderManagerModal';
import { getStaffTypeInfo } from '@/lib/staff-types';

export const BANK_ACCOUNT_TYPES: Record<
  string,
  { label: string; nepali: string; color: string; bg: string; border: string }
> = {
  SALARY: {
    label: 'Salary Account',
    nepali: 'तलब खाता (Salary)',
    color: 'text-emerald-800',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  SAVINGS: {
    label: 'Savings Account',
    nepali: 'बचत खाता (Savings)',
    color: 'text-blue-800',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  CIT: {
    label: 'Nagarik Lagani Kosh',
    nepali: 'नागरिक लगानी कोष (CIT)',
    color: 'text-purple-800',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  EPF: {
    label: 'Sanchaya Kosh',
    nepali: 'कर्मचारी सञ्चय कोष (EPF)',
    color: 'text-indigo-800',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  OTHER: {
    label: 'Other Account',
    nepali: 'अन्य खाता (Other)',
    color: 'text-slate-800',
    bg: 'bg-slate-100',
    border: 'border-slate-300',
  },
};

export const INCHARGE_ROLES_CONFIG: Record<
  string,
  { label: string; nepali: string; color: string; bg: string; border: string }
> = {
  EXAM_INCHARGE: {
    label: 'Exam Incharge',
    nepali: 'परीक्षा प्रमुख',
    color: 'text-purple-800',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  LIBRARIAN: {
    label: 'Librarian Incharge',
    nepali: 'पुस्तकालय प्रमुख',
    color: 'text-blue-800',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  ACCOUNTANT: {
    label: 'Accountant',
    nepali: 'लेखापाल / लेखा प्रमुख',
    color: 'text-emerald-800',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  DISCIPLINE_INCHARGE: {
    label: 'Discipline Incharge',
    nepali: 'अनुशासन प्रमुख',
    color: 'text-rose-800',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
  ECA_INCHARGE: {
    label: 'Sports & ECA Incharge',
    nepali: 'खेलकुद तथा अतिरिक्त क्रियाकलाप प्रमुख',
    color: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  ACADEMIC_COORDINATOR: {
    label: 'Academic Coordinator',
    nepali: 'शैक्षिक संयोजक',
    color: 'text-indigo-800',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  LAB_INCHARGE: {
    label: 'Lab & IT Incharge',
    nepali: 'प्रयोगशाला तथा कम्प्युटर प्रमुख',
    color: 'text-cyan-800',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
  },
  OTHER: {
    label: 'Special Incharge',
    nepali: 'विशेष जिम्मेवारी',
    color: 'text-slate-800',
    bg: 'bg-slate-100',
    border: 'border-slate-300',
  },
};

const NON_TEACHING_POSTS = [
  'लेखापाल (Accountant)',
  'सह-लेखापाल / कार्यालय सहायक (Account Assistant / Office Assistant)',
  'प्रशासनिक अधिकृत / सहायक (Administrative Officer / Assistant)',
  'कम्प्युटर अपरेटर / IT प्राविधिक (Computer Operator / IT Tech)',
  'प्रयोगशाला सहायक (Science Lab Assistant)',
  'पुस्तकालय सहायक (Library Assistant)',
  'कार्यालय सहयोगी / पियन (Office Peon / Helper)',
  'सवारी चालक (School Driver)',
  'सुरक्षा गार्ड (Security Guard)',
  'सरसफाइ कर्मचारी (Sanitation / Cleaner)',
  'भान्छे / क्यान्टिन सहयोगी (Cook / Canteen Staff)',
  'अन्य गैर-शैक्षिक कर्मचारी (Other Staff)',
];

const TEACHING_POSTS = [
  'प्रधानाध्यापक (Headmaster / Principal)',
  'सहायक प्रधानाध्यापक (Assistant Headmaster)',
  'मा.वि. शिक्षक (Secondary Teacher - Grade 9-12)',
  'नि.मा.वि. शिक्षक (Lower Secondary Teacher - Grade 6-8)',
  'प्रा.वि. शिक्षक (Primary Teacher - Grade 1-5)',
  'शिशु / बालविकास शिक्षक (ECD / Nursery Teacher)',
  'विषय शिक्षक (Subject Teacher)',
  'राहत शिक्षक (Rahat Teacher)',
  'करार शिक्षक (Contract Teacher)',
];

function getStaffHierarchyRank(staff: any): number {
  const post = (staff?.post || '').toLowerCase();
  const taha = (staff?.taha || '').toLowerCase();
  const shreni = (staff?.shreni || '').toUpperCase();

  // 1. Headmaster / Principal
  if (post.includes('headmaster') || post.includes('प्रधानाध्यापक') || post.includes('principal')) {
    if (!post.includes('assistant') && !post.includes('सहायक') && !post.includes('vice')) return 1;
  }
  // 2. Assistant Headmaster / Vice Principal
  if (post.includes('assistant headmaster') || post.includes('सहायक प्रधानाध्यापक') || post.includes('vice principal')) return 2;

  // Teaching Levels / Taha
  if (shreni !== 'NON_TEACHING') {
    if (taha.includes('मा.वि. प्रथम') || taha.includes('mabi 1st') || post.includes('मा.वि. प्रथम')) return 10;
    if (taha.includes('मा.वि. द्वितीय') || taha.includes('mabi 2nd') || post.includes('मा.वि. द्वितीय')) return 11;
    if (taha.includes('मा.वि. तृतीय') || taha.includes('mabi 3rd') || post.includes('मा.वि. तृतीय') || taha.includes('मा.वि.') || post.includes('मा.वि.')) return 12;

    if (taha.includes('नि.मा.वि. प्रथम') || taha.includes('nimabi 1st')) return 20;
    if (taha.includes('नि.मा.वि. द्वितीय') || taha.includes('nimabi 2nd')) return 21;
    if (taha.includes('नि.मा.वि. तृतीय') || taha.includes('nimabi 3rd') || taha.includes('नि.मा.वि.') || post.includes('नि.मा.वि.')) return 22;

    if (taha.includes('प्रा.वि. प्रथम') || taha.includes('prabi 1st')) return 30;
    if (taha.includes('प्रा.वि. द्वितीय') || taha.includes('prabi 2nd')) return 31;
    if (taha.includes('प्रा.वि. तृतीय') || taha.includes('prabi 3rd') || taha.includes('प्रा.वि.') || post.includes('प्रा.वि.')) return 32;

    if (post.includes('शिशु') || post.includes('बालविकास') || post.includes('ecd') || post.includes('nursery')) return 40;
    if (post.includes('राहत') || post.includes('rahat')) return 45;
    if (post.includes('करार') || post.includes('contract')) return 50;
    return 60;
  }

  // Non-teaching Staff Hierarchy
  if (post.includes('लेखापाल') || post.includes('accountant')) return 100;
  if (post.includes('प्रशासन') || post.includes('admin') || post.includes('अधिकृत')) return 105;
  if (post.includes('कम्प्युटर') || post.includes('computer') || post.includes('it')) return 110;
  if (post.includes('प्रयोगशाला') || post.includes('lab')) return 115;
  if (post.includes('पुस्तकालय') || post.includes('library')) return 120;
  if (post.includes('सहायक') || post.includes('assistant')) return 125;
  if (post.includes('चालक') || post.includes('driver')) return 130;
  if (post.includes('सुरक्षा') || post.includes('guard')) return 135;
  if (post.includes('सहयोगी') || post.includes('peon') || post.includes('helper')) return 140;
  if (post.includes('सफाई') || post.includes('cleaner') || post.includes('sanitation')) return 145;
  return 150;
}

export default function TeachersPage() {
  const queryClient = useQueryClient();

  // Top Page Tab: 'directory' | 'incharges' | 'tasks' | 'masters'
  const [mainViewTab, setMainViewTab] = useState<'directory' | 'incharges' | 'tasks' | 'masters'>('directory');

  // Directory filter & sort state
  const [activeCategoryTab, setActiveCategoryTab] = useState<'ALL' | 'TEACHING' | 'NON_TEACHING'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterType, setFilterType] = useState('');
  const [inchargeFilter, setInchargeFilter] = useState('');
  const [sortBy, setSortBy] = useState<'DISPLAY_ORDER' | 'HIERARCHY' | 'NAME_ASC' | 'NAME_DESC' | 'POST' | 'TAHA' | 'JOIN_DATE' | 'TYPE' | 'ID_ASC'>('DISPLAY_ORDER');
  const [search, setSearch] = useState('');
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

  // Task Filter state
  const [taskStaffFilter, setTaskStaffFilter] = useState('');
  const [taskCategoryFilter, setTaskCategoryFilter] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState('');
  const [taskSearch, setTaskSearch] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [newCredentials, setNewCredentials] = useState<any>(null);
  const [viewingTeacher, setViewingTeacher] = useState<any>(null);
  const [viewDetailsTab, setViewDetailsTab] = useState<'overview' | 'financial' | 'academic' | 'tasks'>('overview');

  // Incharge Assign Modal
  const [isAssignRoleModalOpen, setIsAssignRoleModalOpen] = useState(false);
  const [selectedStaffForRole, setSelectedStaffForRole] = useState<any>(null);
  const [selectedRoleContext, setSelectedRoleContext] = useState<string>('');
  const [targetInchargeRoles, setTargetInchargeRoles] = useState<string[]>([]);
  const [targetInchargeTitle, setTargetInchargeTitle] = useState('');
  const [syncUserRole, setSyncUserRole] = useState(true);
  const [autoCreateTasks, setAutoCreateTasks] = useState(true);
  const [inchargeDueDateBs, setInchargeDueDateBs] = useState(todayBS());

  const toggleInchargeRole = (roleKey: string) => {
    setTargetInchargeRoles((prev) =>
      prev.includes(roleKey) ? prev.filter((r) => r !== roleKey) : [...prev, roleKey]
    );
  };

  // Task Create/Edit Modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    category: 'GENERAL',
    assignedToId: '',
    priority: 'MEDIUM',
    status: 'PENDING',
    dueDateBs: todayBS(),
    remarks: '',
  });

  // Transfer / Retirement / Exit Status Modal
  const [statusModalStaff, setStatusModalStaff] = useState<any>(null);
  const [statusForm, setStatusForm] = useState({
    statusType: 'सरुवा (Transferred)',
    dateBs: todayBS(),
    destination: '',
    remarks: '',
    disableLogin: true,
    isReactivating: false,
  });

  const openStatusModal = (staff: any) => {
    setStatusModalStaff(staff);
    if (staff.isActive !== false) {
      setStatusForm({
        statusType: 'सरुवा (Transferred)',
        dateBs: staff.dateOfRetirementBs || todayBS(),
        destination: staff.exitRemarks || '',
        remarks: '',
        disableLogin: true,
        isReactivating: false,
      });
    } else {
      setStatusForm({
        statusType: staff.statusReason || 'सरुवा (Transferred)',
        dateBs: staff.dateOfRetirementBs || todayBS(),
        destination: staff.exitRemarks || '',
        remarks: '',
        disableLogin: false,
        isReactivating: true,
      });
    }
  };

  // Bank Accounts Management Modal State
  const [isBankAccountsModalOpen, setIsBankAccountsModalOpen] = useState(false);
  const [selectedStaffForBanks, setSelectedStaffForBanks] = useState<any>(null);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [bankAccountForm, setBankAccountForm] = useState({
    bankName: '',
    accountNumber: '',
    branch: '',
    accountType: 'SALARY',
    isPrimary: false,
    remarks: '',
  });

  const openBankAccountsModal = (staff: any) => {
    setSelectedStaffForBanks(staff);
    setEditingAccount(null);
    setBankAccountForm({
      bankName: '',
      accountNumber: '',
      branch: '',
      accountType: 'SALARY',
      isPrimary: false,
      remarks: '',
    });
    setIsBankAccountsModalOpen(true);
  };

  // Form Category state in Add/Edit modal
  const [modalCategory, setModalCategory] = useState<'TEACHING' | 'NON_TEACHING'>('TEACHING');
  const [selectedPost, setSelectedPost] = useState('');
  const [customPost, setCustomPost] = useState('');
  const [modalInchargeRole, setModalInchargeRole] = useState('');
  const [modalInchargeTitle, setModalInchargeTitle] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);

  // Photo state
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [editPhotoPreview, setEditPhotoPreview] = useState<string>('');

  // Edit Modal Status & Retirement states
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editRetirementDate, setEditRetirementDate] = useState<string>('');
  const [editStatusReason, setEditStatusReason] = useState<string>('सरुवा (Transferred)');

  // Fetch subjects
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects-all'],
    queryFn: async () => {
      const res = await api.get('/classes/subjects/all');
      return res.data?.data || [];
    },
  });

  // Fetch active salary scales for dynamic dropdown
  const { data: scalesData } = useQuery({
    queryKey: ['salary-scales-active'],
    queryFn: async () => {
      const res = await api.get('/payroll/salary-scales/list');
      return res.data?.data || [];
    },
  });

  // Fetch staff & teachers
  const { data: teachersData, isLoading } = useQuery({
    queryKey: ['teachers', filterType, inchargeFilter, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      if (inchargeFilter) params.append('inchargeRole', inchargeFilter);
      if (search) params.append('search', search);
      if (statusFilter === 'ALL') params.append('all', 'true');
      else if (statusFilter === 'INACTIVE') params.append('status', 'INACTIVE');
      else params.append('status', 'ACTIVE');
      const res = await api.get(`/teachers?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  // Fetch tasks
  const { data: tasksData, isLoading: isTasksLoading } = useQuery({
    queryKey: ['staff-tasks', taskStaffFilter, taskCategoryFilter, taskStatusFilter, taskPriorityFilter, taskSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (taskStaffFilter) params.append('teacherId', taskStaffFilter);
      if (taskCategoryFilter) params.append('category', taskCategoryFilter);
      if (taskStatusFilter) params.append('status', taskStatusFilter);
      if (taskPriorityFilter) params.append('priority', taskPriorityFilter);
      if (taskSearch) params.append('search', taskSearch);
      const res = await api.get(`/staff-tasks?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  // Fetch task summary stats
  const { data: taskSummaryData } = useQuery({
    queryKey: ['staff-tasks-summary'],
    queryFn: async () => {
      const res = await api.get('/staff-tasks/summary');
      return res.data?.data || {};
    },
  });

  // Fetch teacher bank accounts
  const { data: staffBankAccounts = [], isLoading: isLoadingBankAccounts } = useQuery({
    queryKey: ['teacher-bank-accounts', selectedStaffForBanks?.id],
    queryFn: async () => {
      if (!selectedStaffForBanks?.id) return [];
      const res = await api.get(`/teachers/${selectedStaffForBanks.id}/bank-accounts`);
      return res.data?.data || [];
    },
    enabled: Boolean(selectedStaffForBanks?.id && isBankAccountsModalOpen),
  });

  // Fetch bank directory (all Nepali Class A/B banks & auto-saved branches)
  const { data: bankDirectoryData } = useQuery({
    queryKey: ['bank-directory'],
    queryFn: async () => {
      const res = await api.get('/teachers/banks/directory');
      return res.data || { data: [], allBanks: [], allBranches: [] };
    },
  });

  // Fetch Master Dropdown Options
  const { data: staffMasterOptions = [] } = useQuery({
    queryKey: ['staff-master-options'],
    queryFn: async () => {
      const res = await api.get('/staff-masters/options');
      return res.data?.data || [];
    },
  });

  const masterTeacherTypes = (staffMasterOptions as any[]).filter((o: any) => o.category === 'TEACHER_TYPE');
  const masterPosts = (staffMasterOptions as any[]).filter((o: any) => o.category === 'POST');
  const masterInchargeRoles = (staffMasterOptions as any[]).filter((o: any) => o.category === 'INCHARGE_ROLE');
  const masterTahas = (staffMasterOptions as any[]).filter((o: any) => o.category === 'TAHA');
  const masterShrenis = (staffMasterOptions as any[]).filter((o: any) => o.category === 'SHRENI');
  const masterBanks = (staffMasterOptions as any[]).filter((o: any) => o.category === 'BANK_NAME');

  const allKnownBanks: string[] = Array.from(
    new Set([
      ...(bankDirectoryData?.allBanks || []),
      ...masterBanks.map((b: any) => b.titleNepali ? `${b.title} (${b.titleNepali})` : b.title),
    ])
  );
  const allKnownBranches: string[] = bankDirectoryData?.allBranches || [];

  // Update Display Order Mutation
  const updateDisplayOrderMutation = useMutation({
    mutationFn: async ({ id, displayOrder }: { id: number; displayOrder: number }) => {
      const res = await api.patch(`/teachers/${id}/display-order`, { displayOrder });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'क्रम नं. अद्यावधिक भयो!');
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teachers-all-payroll'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update order');
    },
  });

  // Fetch full teacher profile details when viewing
  const { data: viewingTeacherDetailsData } = useQuery({
    queryKey: ['teacher-profile-details', viewingTeacher?.id],
    queryFn: async () => {
      if (!viewingTeacher?.id) return null;
      const res = await api.get(`/teachers/${viewingTeacher.id}`);
      return res.data?.data || viewingTeacher;
    },
    enabled: Boolean(viewingTeacher?.id),
  });

  const detailedStaff = viewingTeacherDetailsData || viewingTeacher;

  // Photo compression helper (guarantees <= 50KB)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (.jpg, .png, .webp)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 320;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
        if (isEdit) {
          setEditPhotoPreview(compressedBase64);
        } else {
          setPhotoPreview(compressedBase64);
        }
        toast.success(`Photo compressed & ready (under 50 KB)`);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Add Teacher/Staff Mutation
  const addTeacherMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.post('/teachers', formData);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Staff/Teacher registered successfully!');
      setNewCredentials(data.credentials);
      setIsAddModalOpen(false);
      setPhotoPreview('');
      setSelectedSubjectIds([]);
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-tasks-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create staff');
    },
  });

  // Edit Teacher/Staff Mutation
  const editTeacherMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await api.put(`/teachers/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Staff details updated successfully!');
      setEditingTeacher(null);
      setEditPhotoPreview('');
      setSelectedSubjectIds([]);
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['staff-tasks-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update staff');
    },
  });

  // Delete Teacher/Staff Mutation
  const deleteTeacherMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/teachers/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Staff record removed permanently.');
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teachers-all'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-tasks-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to remove staff');
    },
  });

  // Bank Account Mutations
  const addBankAccountMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post(`/teachers/${selectedStaffForBanks?.id}/bank-accounts`, data);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Bank account added successfully!');
      setBankAccountForm({
        bankName: '',
        accountNumber: '',
        branch: '',
        accountType: 'SALARY',
        isPrimary: false,
        remarks: '',
      });
      setEditingAccount(null);
      queryClient.invalidateQueries({ queryKey: ['teacher-bank-accounts', selectedStaffForBanks?.id] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['bank-directory'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add bank account');
    },
  });

  const updateBankAccountMutation = useMutation({
    mutationFn: async ({ accountId, data }: { accountId: number; data: any }) => {
      const res = await api.put(`/teachers/${selectedStaffForBanks?.id}/bank-accounts/${accountId}`, data);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Bank account updated successfully!');
      setBankAccountForm({
        bankName: '',
        accountNumber: '',
        branch: '',
        accountType: 'SALARY',
        isPrimary: false,
        remarks: '',
      });
      setEditingAccount(null);
      queryClient.invalidateQueries({ queryKey: ['teacher-bank-accounts', selectedStaffForBanks?.id] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['bank-directory'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update bank account');
    },
  });

  const setPrimaryBankAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const res = await api.patch(`/teachers/${selectedStaffForBanks?.id}/bank-accounts/${accountId}/primary`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Primary salary account updated!');
      queryClient.invalidateQueries({ queryKey: ['teacher-bank-accounts', selectedStaffForBanks?.id] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to set primary bank account');
    },
  });

  const deleteBankAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const res = await api.delete(`/teachers/${selectedStaffForBanks?.id}/bank-accounts/${accountId}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Bank account removed.');
      queryClient.invalidateQueries({ queryKey: ['teacher-bank-accounts', selectedStaffForBanks?.id] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete bank account');
    },
  });

  // Update Staff Status (Active vs Transferred/Retired/Resigned)
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      isActive,
      statusReason,
      dateOfRetirementBs,
      exitRemarks,
      disableLogin,
    }: {
      id: number;
      isActive: boolean;
      statusReason?: string;
      dateOfRetirementBs?: string;
      exitRemarks?: string;
      disableLogin?: boolean;
    }) => {
      const res = await api.patch(`/teachers/${id}/status`, {
        isActive,
        statusReason,
        dateOfRetirementBs,
        exitRemarks,
        disableLogin,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'शिक्षक/कर्मचारी स्थिति अद्यावधिक भयो');
      setStatusModalStaff(null);
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teachers-all-payroll'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update status');
    },
  });

  // Assign Role & Auto Tasks Mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({
      teacherId,
      inchargeRoles,
      inchargeTitle,
      syncUserRole,
      autoCreateTasks,
      dueDateBs,
    }: any) => {
      const res = await api.post(`/teachers/${teacherId}/assign-role`, {
        inchargeRoles: inchargeRoles || [],
        inchargeTitle: inchargeTitle || null,
        syncUserRole,
        autoCreateTasks,
        dueDateBs,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Incharge roles & duties assigned!');
      setIsAssignRoleModalOpen(false);
      setSelectedStaffForRole(null);
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['staff-tasks-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to assign role');
    },
  });

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const res = await api.post('/staff-tasks', taskData);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Task created and assigned successfully!');
      setIsTaskModalOpen(false);
      setEditingTask(null);
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['staff-tasks-summary'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to assign task');
    },
  });

  // Edit Task Mutation
  const editTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await api.put(`/staff-tasks/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Task updated successfully!');
      setIsTaskModalOpen(false);
      setEditingTask(null);
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['staff-tasks-summary'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update task');
    },
  });

  // Quick Status Update Mutation
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await api.patch(`/staff-tasks/${id}/status`, {
        status,
        completedAtBs: status === 'COMPLETED' ? todayBS() : null,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Task status updated!');
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['staff-tasks-summary'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update status');
    },
  });

  // Delete Task Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/staff-tasks/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Task removed.');
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['staff-tasks-summary'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete task');
    },
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = {};
    fd.forEach((value, key) => {
      if (value) data[key] = value;
    });
    data.shreni = modalCategory;
    data.post =
      customPost ||
      selectedPost ||
      fd.get('post') ||
      (modalCategory === 'NON_TEACHING' ? 'कार्यालय सहयोगी' : 'शिक्षक');
    if (photoPreview) data.photoUrl = photoPreview;
    if (modalCategory === 'TEACHING') {
      data.subjectIds = selectedSubjectIds;
    } else {
      data.subjectIds = [];
    }
    const isHist = fd.get('isHistorical') === 'true';
    if (isHist) {
      data.isActive = false;
      data.enableLogin = false;
      data.isHistorical = true;
    }
    addTeacherMutation.mutate(data);
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTeacher) return;
    const fd = new FormData(e.currentTarget);
    const data: any = {};
    fd.forEach((value, key) => {
      data[key] = value || null;
    });
    data.shreni = modalCategory;
    data.post = customPost || selectedPost || fd.get('post') || editingTeacher.post;
    data.inchargeRole = modalInchargeRole || null;
    data.inchargeTitle = modalInchargeTitle || null;
    if (editPhotoPreview) {
      data.photoUrl = editPhotoPreview;
    } else if (editingTeacher.photoUrl) {
      data.photoUrl = editingTeacher.photoUrl;
    }
    if (modalCategory === 'TEACHING') {
      data.subjectIds = selectedSubjectIds;
    } else {
      data.subjectIds = [];
    }

    // Handle Active vs Retired status
    data.isActive = editIsActive;
    if (editIsActive) {
      data.dateOfRetirementBs = null;
      data.statusReason = null;
      data.exitRemarks = null;
    } else {
      data.dateOfRetirementBs = editRetirementDate || null;
      data.statusReason = editStatusReason || null;
    }

    editTeacherMutation.mutate({ id: editingTeacher.id, data });
  };

  const allTeachers: any[] = teachersData || [];
  const allTasks: any[] = tasksData || [];

  // Categorize
  const teachingStaff = allTeachers.filter((t: any) => t.shreni !== 'NON_TEACHING');
  const nonTeachingStaff = allTeachers.filter((t: any) => t.shreni === 'NON_TEACHING');
  const inchargeStaff = allTeachers.filter((t: any) => t.inchargeRole);

  const displayedStaff = React.useMemo(() => {
    let list = allTeachers.filter((t: any) => {
      if (activeCategoryTab === 'TEACHING') return t.shreni !== 'NON_TEACHING';
      if (activeCategoryTab === 'NON_TEACHING') return t.shreni === 'NON_TEACHING';
      return true;
    });

    return list.slice().sort((a: any, b: any) => {
      if (sortBy === 'DISPLAY_ORDER') {
        const orderA = a.displayOrder !== null && a.displayOrder !== undefined ? a.displayOrder : 999;
        const orderB = b.displayOrder !== null && b.displayOrder !== undefined ? b.displayOrder : 999;
        if (orderA !== orderB) return orderA - orderB;
        const rankA = getStaffHierarchyRank(a);
        const rankB = getStaffHierarchyRank(b);
        if (rankA !== rankB) return rankA - rankB;
        return (a.id || 0) - (b.id || 0);
      }
      if (sortBy === 'HIERARCHY') {
        const rankA = getStaffHierarchyRank(a);
        const rankB = getStaffHierarchyRank(b);
        if (rankA !== rankB) return rankA - rankB;
        if (a.dateOfJoiningBs && b.dateOfJoiningBs && a.dateOfJoiningBs !== b.dateOfJoiningBs) {
          return a.dateOfJoiningBs.localeCompare(b.dateOfJoiningBs);
        }
        return (a.fullName || '').localeCompare(b.fullName || '');
      }
      if (sortBy === 'NAME_ASC') {
        return (a.fullName || '').localeCompare(b.fullName || '');
      }
      if (sortBy === 'NAME_DESC') {
        return (b.fullName || '').localeCompare(a.fullName || '');
      }
      if (sortBy === 'POST') {
        return (a.post || '').localeCompare(b.post || '');
      }
      if (sortBy === 'TAHA') {
        return (a.taha || '').localeCompare(b.taha || '');
      }
      if (sortBy === 'JOIN_DATE') {
        const dateA = a.dateOfJoiningBs || '9999-99-99';
        const dateB = b.dateOfJoiningBs || '9999-99-99';
        return dateA.localeCompare(dateB);
      }
      if (sortBy === 'TYPE') {
        const typeA = a.type === 'RASTRIYA' ? 1 : 2;
        const typeB = b.type === 'RASTRIYA' ? 1 : 2;
        if (typeA !== typeB) return typeA - typeB;
        return (a.fullName || '').localeCompare(b.fullName || '');
      }
      if (sortBy === 'ID_ASC') {
        return (a.id || 0) - (b.id || 0);
      }
      return 0;
    });
  }, [allTeachers, activeCategoryTab, sortBy]);

  const rastriyaCount = allTeachers.filter((t: any) => {
    const typeUpper = (t.type || '').toUpperCase();
    return typeUpper === 'RASTRIYA' || typeUpper === 'PERMANENT' || typeUpper === 'GOVT' || typeUpper.includes('स्थायी');
  }).length;
  const nijiCount = allTeachers.length - rastriyaCount;

  const availableTeacherTypes = React.useMemo(() => {
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

    (allTeachers || []).forEach((t: any) => {
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
  }, [masterTeacherTypes, allTeachers]);

  const openAddModal = (cat: 'TEACHING' | 'NON_TEACHING' = 'TEACHING') => {
    setModalCategory(cat);
    setSelectedPost(cat === 'NON_TEACHING' ? NON_TEACHING_POSTS[0] : TEACHING_POSTS[2]);
    setCustomPost('');
    setModalInchargeRole('');
    setModalInchargeTitle('');
    setPhotoPreview('');
    setSelectedSubjectIds([]);
    setIsAddModalOpen(true);
  };

  const openEditModal = (staff: any) => {
    const isNonTeach = staff.shreni === 'NON_TEACHING';
    setModalCategory(isNonTeach ? 'NON_TEACHING' : 'TEACHING');
    setSelectedPost(staff.post || '');
    setCustomPost('');
    setModalInchargeRole(staff.inchargeRole || '');
    setModalInchargeTitle(staff.inchargeTitle || '');
    setEditingTeacher(staff);
    setEditPhotoPreview(staff.photoUrl || '');
    setSelectedSubjectIds(staff.subjects?.map((s: any) => s.subjectId) || []);
    setEditIsActive(staff.isActive !== false);
    setEditRetirementDate(staff.dateOfRetirementBs || '');
    setEditStatusReason(staff.statusReason || 'सरुवा (Transferred)');
  };

  const openAssignRoleModal = (staff?: any, preselectedRole?: string) => {
    const targetStaff = staff || (allTeachers.length > 0 ? allTeachers[0] : null);
    setSelectedStaffForRole(targetStaff);
    setSelectedRoleContext(preselectedRole || '');

    if (targetStaff) {
      let existingRoles = targetStaff.inchargeRole
        ? targetStaff.inchargeRole.split(',').map((r: string) => r.trim()).filter(Boolean)
        : [];
      if (preselectedRole && !existingRoles.includes(preselectedRole)) {
        existingRoles = [...existingRoles, preselectedRole];
      }
      setTargetInchargeRoles(existingRoles);
      setTargetInchargeTitle(targetStaff.inchargeTitle || '');
    } else {
      setTargetInchargeRoles(preselectedRole ? [preselectedRole] : []);
      setTargetInchargeTitle('');
    }

    setSyncUserRole(true);
    setAutoCreateTasks(true);
    setInchargeDueDateBs(todayBS());
    setIsAssignRoleModalOpen(true);
  };

  const handleSwitchStaffForRole = (teacherId: number) => {
    const found = allTeachers.find((t: any) => t.id === teacherId);
    if (!found) return;
    setSelectedStaffForRole(found);
    let existingRoles = found.inchargeRole
      ? found.inchargeRole.split(',').map((r: string) => r.trim()).filter(Boolean)
      : [];
    if (selectedRoleContext && !existingRoles.includes(selectedRoleContext)) {
      existingRoles = [...existingRoles, selectedRoleContext];
    }
    setTargetInchargeRoles(existingRoles);
    setTargetInchargeTitle(found.inchargeTitle || '');
  };

  const openTaskModal = (task?: any, defaultTeacherId?: number) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title || '',
        description: task.description || '',
        category: task.category || 'GENERAL',
        assignedToId: String(task.assignedToId || ''),
        priority: task.priority || 'MEDIUM',
        status: task.status || 'PENDING',
        dueDateBs: task.dueDateBs || todayBS(),
        remarks: task.remarks || '',
      });
    } else {
      setEditingTask(null);
      setTaskForm({
        title: '',
        description: '',
        category: 'GENERAL',
        assignedToId: defaultTeacherId ? String(defaultTeacherId) : (allTeachers[0]?.id ? String(allTeachers[0].id) : ''),
        priority: 'MEDIUM',
        status: 'PENDING',
        dueDateBs: todayBS(),
        remarks: '',
      });
    }
    setIsTaskModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f] flex items-center gap-2">
            <Users className="text-[#1e3a5f]" />
            <span>Staff & Incharge Roles (शिक्षक, कर्मचारी तथा जिम्मेवारी व्यवस्थापन)</span>
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            शिक्षक, गैर-शैक्षिक कर्मचारी, विशेष भूमिका (परीक्षा, पुस्तकालय, लेखापाल प्रमुख) तथा कार्य जिम्मेवारी (Tasks) व्यवस्थापन
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openTaskModal()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-purple-800 shadow-2xs transition cursor-pointer"
          >
            <ClipboardList size={14} />
            <span>+ Assign Task (कार्य तोक्नुहोस्)</span>
          </button>

          <button
            onClick={() => openAddModal('TEACHING')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#2a5280] shadow-2xs transition cursor-pointer"
          >
            <Plus size={14} />
            <span>+ Add Teacher (शिक्षक दर्ता)</span>
          </button>

          <button
            onClick={() => openAddModal('NON_TEACHING')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-800 shadow-2xs transition cursor-pointer"
          >
            <Briefcase size={14} />
            <span>+ Add Staff (कर्मचारी दर्ता)</span>
          </button>
        </div>
      </div>

      {/* Top 3 Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 text-xs font-bold">
        <button
          onClick={() => setMainViewTab('directory')}
          className={`border-b-2 px-4 py-2.5 transition flex items-center gap-1.5 ${
            mainViewTab === 'directory'
              ? 'border-[#1e3a5f] text-[#1e3a5f]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users size={14} />
          <span>Faculty & Staff Directory ({allTeachers.length})</span>
        </button>

        <button
          onClick={() => setMainViewTab('incharges')}
          className={`border-b-2 px-4 py-2.5 transition flex items-center gap-1.5 ${
            mainViewTab === 'incharges'
              ? 'border-purple-700 text-purple-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Award size={14} />
          <span>Incharge Roles & Posts ({inchargeStaff.length})</span>
        </button>

        <button
          onClick={() => setMainViewTab('tasks')}
          className={`border-b-2 px-4 py-2.5 transition flex items-center gap-1.5 ${
            mainViewTab === 'tasks'
              ? 'border-emerald-700 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <CheckSquare size={14} />
          <span>Task & Duty Tracking ({allTasks.length})</span>
          {taskSummaryData?.pendingTasks > 0 && (
            <span className="rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[10px] font-mono">
              {taskSummaryData.pendingTasks} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setMainViewTab('masters')}
          className={`border-b-2 px-4 py-2.5 transition flex items-center gap-1.5 ${
            mainViewTab === 'masters'
              ? 'border-[#1e3a5f] text-[#1e3a5f]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Sliders size={14} />
          <span>मास्टर्स तथा ड्रपडाउन व्यवस्थापन (Master Dropdown Heads)</span>
          {staffMasterOptions.length > 0 && (
            <span className="rounded-full bg-blue-100 text-blue-900 px-1.5 py-0.2 text-[10px] font-mono">
              {staffMasterOptions.length}
            </span>
          )}
        </button>
      </div>

      {/* Metric overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Total Faculty & Staff</span>
            <Users size={16} className="text-[#1e3a5f]" />
          </div>
          <p className="text-2xl font-extrabold text-[#1e3a5f] mt-1">{allTeachers.length}</p>
          <p className="text-[11px] text-gray-500 font-nepali">
            {teachingStaff.length} शिक्षक • {nonTeachingStaff.length} कर्मचारी
          </p>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-700 uppercase">Special Incharges</span>
            <Award size={16} className="text-purple-700" />
          </div>
          <p className="text-2xl font-extrabold text-purple-900 mt-1">{inchargeStaff.length}</p>
          <p className="text-[11px] text-purple-700 font-nepali">विशेष विभागीय प्रमुखहरू</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Assigned Tasks</span>
            <CheckSquare size={16} className="text-emerald-700" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-900 mt-1">{allTasks.length}</p>
          <p className="text-[11px] text-emerald-700 font-nepali">
            {allTasks.filter((t) => t.status === 'COMPLETED').length} सम्पन्न •{' '}
            {allTasks.filter((t) => t.status !== 'COMPLETED').length} बाँकी
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Permanent / Gov</span>
            <ShieldCheck size={16} className="text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-amber-700 mt-1">{rastriyaCount}</p>
          <p className="text-[11px] text-gray-500 font-nepali">स्थाई दरबन्दी ({nijiCount} निजी/करार)</p>
        </div>
      </div>

      {/* ─── TAB 1: FACULTY & STAFF DIRECTORY ─── */}
      {mainViewTab === 'directory' && (
        <div className="space-y-4">
          {/* Filter & Sort Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
            {/* Top Row: Category Switcher, Status Filter, & View Mode Toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Category Switcher Tabs */}
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-gray-200 flex-wrap">
                  <button
                    onClick={() => setActiveCategoryTab('ALL')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeCategoryTab === 'ALL'
                        ? 'bg-[#1e3a5f] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Users size={13} />
                    <span>All Category ({allTeachers.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveCategoryTab('TEACHING')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeCategoryTab === 'TEACHING'
                        ? 'bg-[#1e3a5f] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <GraduationCap size={13} />
                    <span>Teaching Faculty (शिक्षक) ({teachingStaff.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveCategoryTab('NON_TEACHING')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeCategoryTab === 'NON_TEACHING'
                        ? 'bg-[#1e3a5f] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Briefcase size={13} />
                    <span>Non-Teaching Staff (कर्मचारी) ({nonTeachingStaff.length})</span>
                  </button>
                </div>

                {/* Status Filter */}
                <div className="inline-flex rounded-xl bg-amber-50/90 p-1 border border-amber-200">
                  <button
                    onClick={() => setStatusFilter('ACTIVE')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      statusFilter === 'ACTIVE' ? 'bg-emerald-700 text-white shadow-xs' : 'text-emerald-900 hover:bg-emerald-100/50'
                    }`}
                  >
                    कार्यरत (Active)
                  </button>
                  <button
                    onClick={() => setStatusFilter('INACTIVE')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      statusFilter === 'INACTIVE' ? 'bg-rose-700 text-white shadow-xs' : 'text-rose-900 hover:bg-rose-100/50'
                    }`}
                  >
                    विगत / सरुवा (Past)
                  </button>
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      statusFilter === 'ALL' ? 'bg-amber-700 text-white shadow-xs' : 'text-amber-900 hover:bg-amber-100/50'
                    }`}
                  >
                    सबै (All)
                  </button>
                </div>
              </div>

              {/* View Toggle: List vs Cards */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-gray-200 shrink-0 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                    viewMode === 'list'
                      ? 'bg-[#1e3a5f] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="List View (तालिका / सूची स्वरूप)"
                >
                  <List size={14} />
                  <span>List (तालिका)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                    viewMode === 'grid'
                      ? 'bg-[#1e3a5f] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Grid View (कार्ड स्वरूप)"
                >
                  <LayoutGrid size={14} />
                  <span>Cards</span>
                </button>
              </div>
            </div>

            {/* Bottom Row: Search, Incharges Filter, Staff Type Filter, and Sort By Selector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap pt-2 border-t border-gray-100">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[200px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="खोजी गर्नुहोस् (नाम, पद, जिम्मेवारी, PAN, सम्पर्क...)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50/70 pl-9 pr-3 py-2 text-xs focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Incharge Roles Filter */}
              <select
                value={inchargeFilter}
                onChange={(e) => setInchargeFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-gray-800 focus:outline-hidden cursor-pointer shrink-0"
              >
                <option value="">All Incharges (सबै जिम्मेवारी)</option>
                {Object.entries(INCHARGE_ROLES_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.nepali} ({cfg.label})
                  </option>
                ))}
              </select>

              {/* Staff Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-xl border border-gray-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-gray-800 focus:outline-hidden cursor-pointer shrink-0"
              >
                <option value="">सबै प्रकार (All Types)</option>
                {availableTeacherTypes.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Sort By (क्रमबद्धता) Dropdown */}
              <div className="flex items-center gap-1.5 shrink-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2 text-xs font-extrabold text-[#1e3a5f] focus:outline-hidden cursor-pointer"
                  title="कर्मचारी क्रमबद्धता (Sorting)"
                >
                  <option value="DISPLAY_ORDER">📌 क्रमबद्ध अङ्क अनुसार (Display Order)</option>
                  <option value="HIERARCHY">👑 वरिष्ठता / पद मर्यादा (Hierarchy)</option>
                  <option value="NAME_ASC">🔤 नाम: A देखि Z (Name A-Z)</option>
                  <option value="NAME_DESC">🔤 नाम: Z देखि A (Name Z-A)</option>
                  <option value="POST">📋 पद अनुसार (By Post)</option>
                  <option value="TAHA">🎓 तह तथा श्रेणी (By Level/Taha)</option>
                  <option value="JOIN_DATE">📅 नियुक्ति मिति (Seniority Date)</option>
                  <option value="TYPE">🏛️ स्थायी पहिले (Permanent first)</option>
                  <option value="ID_ASC">🔢 दर्ता क्रम (S.N. / ID)</option>
                </select>

                <button
                  type="button"
                  onClick={() => setIsReorderModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1e3a5f] border border-blue-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  title="सबै शिक्षक तथा कर्मचारीहरूको क्रम १, २, ३... मिलाउनुहोस्"
                >
                  <ArrowUpDown size={13} className="text-blue-700" />
                  <span>क्रम मिलाउनुहोस् (Reorder)</span>
                </button>
              </div>

              {/* Reset Filters button if any filter is active */}
              {(search || inchargeFilter || filterType || sortBy !== 'HIERARCHY' || activeCategoryTab !== 'ALL' || statusFilter !== 'ACTIVE') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setInchargeFilter('');
                    setFilterType('');
                    setSortBy('HIERARCHY');
                    setActiveCategoryTab('ALL');
                    setStatusFilter('ACTIVE');
                  }}
                  className="px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition cursor-pointer shrink-0"
                  title="सबै फिल्टर रिसेट गर्नुहोस्"
                >
                  फिल्टर रिसेट ✕
                </button>
              )}
            </div>
          </div>

          {/* ═════════ 1. LIST / TABLE VIEW ═════════ */}
          {viewMode === 'list' && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700 divide-y divide-gray-200">
                  <thead className="bg-[#1e3a5f] text-white font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th
                        onClick={() => setSortBy(sortBy === 'DISPLAY_ORDER' ? 'ID_ASC' : 'DISPLAY_ORDER')}
                        className="py-3 px-2 w-16 text-center cursor-pointer select-none hover:bg-[#2a5280] transition"
                        title="क्रमबद्ध अङ्क (Display Order) अनुसार क्रमबद्ध गर्नुहोस्"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>क्रम</span>
                          {sortBy === 'DISPLAY_ORDER' && <span>📌</span>}
                          {sortBy === 'ID_ASC' && <span>↑</span>}
                        </div>
                      </th>
                      <th
                        onClick={() => setSortBy(sortBy === 'NAME_ASC' ? 'NAME_DESC' : 'NAME_ASC')}
                        className="py-3 px-4 min-w-[220px] cursor-pointer select-none hover:bg-[#2a5280] transition"
                        title="नाम अनुसार क्रमबद्ध गर्नुहोस् (Click to sort by Name)"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>शिक्षक / कर्मचारी विवरण</span>
                          {sortBy === 'NAME_ASC' && <span>↑</span>}
                          {sortBy === 'NAME_DESC' && <span>↓</span>}
                        </div>
                      </th>
                      <th
                        onClick={() => setSortBy('TYPE')}
                        className="py-3 px-3 w-28 cursor-pointer select-none hover:bg-[#2a5280] transition"
                        title="प्रकार अनुसार क्रमबद्ध गर्नुहोस्"
                      >
                        <div className="flex items-center gap-1">
                          <span>प्रकार</span>
                          {sortBy === 'TYPE' && <span>✓</span>}
                        </div>
                      </th>
                      <th
                        onClick={() => setSortBy(sortBy === 'POST' ? 'TAHA' : 'POST')}
                        className="py-3 px-3 min-w-[160px] cursor-pointer select-none hover:bg-[#2a5280] transition"
                        title="पद वा तह अनुसार क्रमबद्ध गर्नुहोस्"
                      >
                        <div className="flex items-center gap-1">
                          <span>पद / तह</span>
                          {(sortBy === 'POST' || sortBy === 'TAHA') && <span>✓</span>}
                        </div>
                      </th>
                      <th
                        onClick={() => setSortBy('JOIN_DATE')}
                        className="py-3 px-3 min-w-[130px] cursor-pointer select-none hover:bg-[#2a5280] transition"
                        title="नियुक्ति मिति / सम्पर्क"
                      >
                        <div className="flex items-center gap-1">
                          <span>सम्पर्क / नियुक्ति</span>
                          {sortBy === 'JOIN_DATE' && <span>✓</span>}
                        </div>
                      </th>
                      <th className="py-3 px-4 min-w-[200px]">विशेष जिम्मेवारी (Incharge Roles)</th>
                      <th className="py-3 px-3 min-w-[130px] text-center">कार्य प्रगति</th>
                      <th className="py-3 px-4 text-right min-w-[120px]">कार्यहरू</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-400">
                          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
                          <p className="mt-2 text-xs">Loading staff directory...</p>
                        </td>
                      </tr>
                    ) : displayedStaff.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-400">
                          <Users size={32} className="mx-auto text-gray-300 mb-1" />
                          <p className="text-sm font-semibold text-gray-600">No staff found matching filter</p>
                          <p className="text-xs text-gray-400">Use &apos;Add Staff&apos; or &apos;Add Teacher&apos; to register members.</p>
                        </td>
                      </tr>
                    ) : (
                      displayedStaff.map((staff: any, idx: number) => {
                        const isNonTeaching = staff.shreni === 'NON_TEACHING';
                        const staffTasks = staff.tasks || [];
                        const completedCount = staffTasks.filter((t: any) => t.status === 'COMPLETED').length;

                        return (
                          <tr key={staff.id} className="hover:bg-blue-50/40 transition">
                            {/* Display Order & S.N. */}
                            <td className="py-3 px-2 text-center">
                              <div className="flex flex-col items-center gap-0.5">
                                <input
                                  type="number"
                                  min="0"
                                  key={`order-${staff.id}-${staff.displayOrder}`}
                                  defaultValue={staff.displayOrder !== null && staff.displayOrder !== undefined ? staff.displayOrder : idx + 1}
                                  onBlur={(e) => {
                                    const newOrder = parseInt(e.target.value) || 0;
                                    if (newOrder !== (staff.displayOrder || 0)) {
                                      updateDisplayOrderMutation.mutate({ id: staff.id, displayOrder: newOrder });
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  className="w-12 text-center font-mono font-bold text-xs rounded-lg border border-gray-200 bg-slate-50 py-0.5 focus:bg-white focus:border-[#1e3a5f] focus:outline-hidden"
                                  title="क्रम नम्बर परिवर्तन गर्न यहाँ अङ्क लेखी बाहिर क्लिक गर्नुहोस् वा Enter थिच्नुहोस्"
                                />
                                <span className="text-[9px] font-mono text-gray-400">#{idx + 1}</span>
                              </div>
                            </td>

                            {/* Name & Photo */}
                            <td className="py-3 px-4">
                              <div
                                onClick={() => {
                                  setViewingTeacher(staff);
                                  setViewDetailsTab('overview');
                                }}
                                className="flex items-center gap-3 cursor-pointer group"
                                title="क्लिक गरेर विस्तृत विवरण हेर्नुहोस् (Click to view full profile)"
                              >
                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-extrabold text-xs overflow-hidden border shadow-2xs group-hover:ring-2 group-hover:ring-[#1e3a5f]/40 transition ${
                                    isNonTeaching
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                                      : 'bg-blue-100 text-[#1e3a5f] border-blue-200'
                                  }`}
                                >
                                  {staff.photoUrl ? (
                                    <img src={staff.photoUrl} alt={staff.fullName} className="h-full w-full object-cover" />
                                  ) : (
                                    <span>{staff.fullName.slice(0, 2).toUpperCase()}</span>
                                  )}
                                </div>
                                <div>
                                  <div className="font-extrabold text-gray-900 text-xs flex items-center gap-1.5 flex-wrap group-hover:text-[#1e3a5f] transition">
                                    <span className="underline-offset-2 group-hover:underline">{staff.fullName}</span>
                                    <span
                                      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[9px] font-extrabold ${
                                        isNonTeaching
                                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                                      }`}
                                    >
                                      {isNonTeaching ? <Briefcase size={9} /> : <GraduationCap size={9} />}
                                      <span>{isNonTeaching ? 'कर्मचारी' : 'शिक्षक'}</span>
                                    </span>
                                    {staff.gender && (
                                      <span className="inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-bold bg-slate-100 text-slate-700">
                                        {staff.gender === 'MALE' ? 'पुरुष' : staff.gender === 'FEMALE' ? 'महिला' : staff.gender}
                                      </span>
                                    )}
                                    {staff.bloodGroup && (
                                      <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[9px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                                        🩸 {staff.bloodGroup}
                                      </span>
                                    )}
                                    {!staff.isActive && (
                                      <span className="inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                        विगत / सरुवा (Past)
                                      </span>
                                    )}
                                  </div>
                                  {staff.fullNameNepali && (
                                    <p className="text-[11px] text-gray-500 font-nepali">{staff.fullNameNepali}</p>
                                  )}
                                  <div className="flex items-center gap-2 flex-wrap text-[9.5px] font-mono text-gray-400">
                                    {staff.panNo && <span>PAN: {staff.panNo}</span>}
                                    {staff.dateOfBirthBs && <span>🎂 जन्म: {staff.dateOfBirthBs}</span>}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Type */}
                            <td className="py-3 px-3">
                              {(() => {
                                const typeInfo = getStaffTypeInfo(staff.type, masterTeacherTypes);
                                return (
                                  <span
                                    className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${typeInfo.badgeClass}`}
                                    title={typeInfo.displayText}
                                  >
                                    {typeInfo.icon} {typeInfo.nepali || typeInfo.label}
                                  </span>
                                );
                              })()}
                            </td>

                            {/* Post / Designation */}
                            <td className="py-3 px-3">
                              <div className="font-bold text-gray-900 text-xs">
                                {staff.post || (isNonTeaching ? 'कार्यालय सहयोगी' : 'शिक्षक')}
                              </div>
                              {staff.shreni && staff.shreni !== 'NON_TEACHING' && (
                                <span className="inline-block text-[10px] text-gray-500 bg-slate-100 px-1.5 py-0.2 rounded mt-0.5 font-semibold">
                                  {staff.shreni}
                                </span>
                              )}
                              {staff.subjects && staff.subjects.length > 0 && (
                                <div className="text-[10px] text-blue-800 flex items-center gap-1 mt-0.5 flex-wrap">
                                  <BookOpen size={10} />
                                  <span>{staff.subjects.map((s: any) => s.subject?.name || s.subjectId).join(', ')}</span>
                                </div>
                              )}
                              {staff.dateOfJoiningBs && (
                                <p className="text-[9.5px] text-gray-500 font-mono mt-0.5">
                                  📅 हाजिर: {staff.dateOfJoiningBs}
                                </p>
                              )}
                              {staff.dateOfRetirementBs && !staff.isActive && (
                                <p className="text-[9.5px] text-amber-700 font-mono mt-0.5">
                                  🛑 अवकाश/सरुवा: {staff.dateOfRetirementBs}
                                </p>
                              )}
                            </td>

                            {/* Contact */}
                            <td className="py-3 px-3">
                              {staff.phone ? (
                                <div className="flex items-center gap-1 font-mono text-xs font-semibold text-gray-800">
                                  <Phone size={12} className="text-gray-400" />
                                  <span>{staff.phone}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-[11px]">-</span>
                              )}
                              {staff.email && (
                                <div className="flex items-center gap-1 text-[10.5px] text-gray-500 truncate max-w-[150px] mt-0.5">
                                  <Mail size={11} className="text-gray-400" />
                                  <span>{staff.email}</span>
                                </div>
                              )}
                            </td>

                            {/* Special Incharge Roles */}
                            <td className="py-3 px-4">
                              {staff.inchargeRole ? (
                                <div className="space-y-1">
                                  <div className="flex flex-wrap gap-1">
                                    {staff.inchargeRole
                                      .split(',')
                                      .map((r: string) => r.trim())
                                      .filter(Boolean)
                                      .map((roleKey: string) => {
                                        const info = INCHARGE_ROLES_CONFIG[roleKey] || {
                                          label: roleKey,
                                          nepali: roleKey,
                                          color: 'text-purple-800',
                                          bg: 'bg-purple-50',
                                          border: 'border-purple-200',
                                        };
                                        return (
                                          <span
                                            key={roleKey}
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${info.bg} ${info.border} ${info.color}`}
                                          >
                                            <Award size={10} />
                                            <span>{info.nepali}</span>
                                          </span>
                                        );
                                      })}
                                  </div>
                                  {staff.inchargeTitle && (
                                    <p className="text-[10px] text-purple-950 font-bold">
                                      📌 {staff.inchargeTitle}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openAssignRoleModal(staff)}
                                  className="text-[10.5px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50/60 hover:bg-purple-100/80 px-2 py-1 rounded-md border border-purple-200/70 transition cursor-pointer flex items-center gap-1"
                                >
                                  <Plus size={11} />
                                  <span>Assign Role</span>
                                </button>
                              )}
                            </td>

                            {/* Tasks Progress */}
                            <td className="py-3 px-3 text-center">
                              <div className="inline-flex flex-col items-center gap-1">
                                <span
                                  className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                                    staffTasks.length > 0 && completedCount === staffTasks.length
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : staffTasks.length > 0
                                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                                      : 'bg-slate-50 text-gray-500 border-gray-200'
                                  }`}
                                >
                                  {completedCount} / {staffTasks.length} Done
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openTaskModal(undefined, staff.id)}
                                  className="text-[10px] font-bold text-purple-700 hover:underline cursor-pointer flex items-center gap-0.5"
                                >
                                  <span>+ Task</span>
                                </button>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewingTeacher(staff);
                                    setViewDetailsTab('overview');
                                  }}
                                  className="p-1.5 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 transition cursor-pointer"
                                  title="विवरण हेर्नुहोस् (View Teacher Profile Details)"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openBankAccountsModal(staff)}
                                  className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 transition cursor-pointer flex items-center gap-1"
                                  title="बैंक खाता व्यवस्थापन (Manage Bank Accounts)"
                                >
                                  <Landmark size={14} />
                                  {staff.bankAccounts && staff.bankAccounts.length > 0 && (
                                    <span className="text-[9.5px] font-bold font-mono px-1 rounded-full bg-emerald-600 text-white">
                                      {staff.bankAccounts.length}
                                    </span>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openStatusModal(staff)}
                                  className={`p-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                                    staff.isActive 
                                      ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60' 
                                      : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60'
                                  }`}
                                  title={staff.isActive ? 'सरुवा तथा अवकाश प्रविष्टि (Transfer / Retirement Management)' : 'अवस्था विवरण तथा पुनः बहाली (Status & Re-activate)'}
                                >
                                  <ArrowRightLeft size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openAssignRoleModal(staff)}
                                  className="p-1.5 rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 transition cursor-pointer"
                                  title="Assign / Manage Incharge Roles"
                                >
                                  <Award size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(staff)}
                                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition cursor-pointer"
                                  title="Edit Staff Details"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to remove "${staff.fullName}"?`)) {
                                      deleteTeacherMutation.mutate(staff.id);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer"
                                  title="Remove Staff"
                                >
                                  <Trash2 size={15} />
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
          )}

          {/* ═════════ 2. GRID / CARD VIEW ═════════ */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading ? (
                <div className="col-span-full py-12 text-center text-gray-400">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
                  <p className="mt-2 text-xs">Loading staff directory...</p>
                </div>
              ) : displayedStaff.length === 0 ? (
                <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
                  <Users size={32} className="mx-auto text-gray-300 mb-1" />
                  <p className="text-sm font-semibold text-gray-600">No staff found matching filter</p>
                  <p className="text-xs text-gray-400">Use &apos;Add Staff&apos; or &apos;Add Teacher&apos; to register members.</p>
                </div>
              ) : (
                displayedStaff.map((staff: any) => {
                  const isNonTeaching = staff.shreni === 'NON_TEACHING';
                  const inchargeInfo = staff.inchargeRole ? INCHARGE_ROLES_CONFIG[staff.inchargeRole] : null;
                  const staffTasks = staff.tasks || [];
                  const completedCount = staffTasks.filter((t: any) => t.status === 'COMPLETED').length;

                  return (
                    <div
                      key={staff.id}
                      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs hover:shadow-md transition space-y-3 relative group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          onClick={() => {
                            setViewingTeacher(staff);
                            setViewDetailsTab('overview');
                          }}
                          className="flex items-center gap-3 cursor-pointer group/name"
                          title="क्लिक गरेर विस्तृत विवरण हेर्नुहोस् (Click to view full profile)"
                        >
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-extrabold text-sm overflow-hidden border shadow-2xs group-hover/name:ring-2 group-hover/name:ring-[#1e3a5f]/40 transition ${
                              isNonTeaching
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                                : 'bg-blue-100 text-[#1e3a5f] border-blue-200'
                            }`}
                          >
                            {staff.photoUrl ? (
                              <img src={staff.photoUrl} alt={staff.fullName} className="h-full w-full object-cover" />
                            ) : (
                              <span>{staff.fullName.slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-sm text-gray-900 leading-tight flex items-center gap-1.5 flex-wrap group-hover/name:text-[#1e3a5f] transition">
                              <span className="underline-offset-2 group-hover/name:underline">{staff.fullName}</span>
                              {!staff.isActive && (
                                <span className="inline-block rounded px-1.5 py-0.2 text-[9px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                  विगत / सरुवा
                                </span>
                              )}
                            </h3>
                            {staff.fullNameNepali && (
                              <p className="text-[10px] text-gray-500 font-nepali">{staff.fullNameNepali}</p>
                            )}

                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-extrabold ${
                                  isNonTeaching
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                                }`}
                              >
                                {isNonTeaching ? <Briefcase size={10} /> : <GraduationCap size={10} />}
                                <span>{isNonTeaching ? 'गैर-शैक्षिक कर्मचारी' : 'शिक्षक'}</span>
                              </span>

                              {(() => {
                                const typeInfo = getStaffTypeInfo(staff.type, masterTeacherTypes);
                                return (
                                  <span
                                    className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold ${typeInfo.badgeClass}`}
                                    title={typeInfo.displayText}
                                  >
                                    {typeInfo.icon} {typeInfo.nepali || typeInfo.label}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setViewingTeacher(staff);
                              setViewDetailsTab('overview');
                            }}
                            className="p-1.5 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 transition cursor-pointer"
                            title="विवरण हेर्नुहोस् (View Teacher Profile Details)"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openBankAccountsModal(staff)}
                            className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 transition cursor-pointer flex items-center gap-1"
                            title="बैंक खाता व्यवस्थापन (Manage Bank Accounts)"
                          >
                            <Landmark size={14} />
                            {staff.bankAccounts && staff.bankAccounts.length > 0 && (
                              <span className="text-[9px] font-bold font-mono px-1 rounded-full bg-emerald-600 text-white">
                                {staff.bankAccounts.length}
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => openStatusModal(staff)}
                            className={`p-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                              staff.isActive 
                                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60' 
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60'
                            }`}
                            title={staff.isActive ? 'सरुवा तथा अवकाश प्रविष्टि (Transfer / Retirement Management)' : 'अवस्था विवरण तथा पुनः बहाली (Status & Re-activate)'}
                          >
                            <ArrowRightLeft size={14} />
                          </button>
                          <button
                            onClick={() => openAssignRoleModal(staff)}
                            className="p-1.5 rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 transition cursor-pointer"
                            title="Assign Special Incharge Role & Duties"
                          >
                            <Award size={15} />
                          </button>
                          <button
                            onClick={() => openEditModal(staff)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition cursor-pointer"
                            title="Edit Staff Details"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove "${staff.fullName}"?`)) {
                                deleteTeacherMutation.mutate(staff.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer"
                            title="Remove Staff"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Special Incharge Badges */}
                      {staff.inchargeRole && (
                        <div className="space-y-1.5 p-2 rounded-xl bg-purple-50/50 border border-purple-100">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1">
                              <Award size={12} className="text-purple-700" />
                              <span>विशेष जिम्मेवारी (Incharge Roles):</span>
                            </span>
                            <button
                              onClick={() => openAssignRoleModal(staff)}
                              className="text-[10px] font-bold text-purple-700 hover:underline cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {staff.inchargeRole
                              .split(',')
                              .map((r: string) => r.trim())
                              .filter(Boolean)
                              .map((roleKey: string) => {
                                const info = INCHARGE_ROLES_CONFIG[roleKey] || {
                                  label: roleKey,
                                  nepali: roleKey,
                                  color: 'text-purple-800',
                                  bg: 'bg-purple-50',
                                  border: 'border-purple-200',
                                };
                                return (
                                  <span
                                    key={roleKey}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-extrabold ${info.bg} ${info.border} ${info.color}`}
                                  >
                                    <span>{info.nepali}</span>
                                  </span>
                                );
                              })}
                          </div>
                          {staff.inchargeTitle && (
                            <p className="text-[10px] text-purple-900 font-bold">
                              📌 {staff.inchargeTitle}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="border-t border-gray-50 pt-2 space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-medium">पद / Post:</span>
                          <span className="font-bold text-gray-900 bg-slate-50 px-2 py-0.5 rounded-md border border-gray-100">
                            {staff.post || (isNonTeaching ? 'कार्यालय सहयोगी' : 'शिक्षक')}
                          </span>
                        </div>

                        {staff.phone && (
                          <div className="flex justify-between font-mono">
                            <span className="text-gray-400 font-sans">Phone:</span>
                            <span className="font-semibold">{staff.phone}</span>
                          </div>
                        )}

                        {/* Tasks progress count */}
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-gray-400 flex items-center gap-1">
                            <CheckSquare size={12} />
                            <span>जिम्मेवारी तथा कार्यहरू:</span>
                          </span>
                          <span className="font-bold font-mono text-[11px] text-purple-900 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                            {completedCount} / {staffTasks.length} Done
                          </span>
                        </div>
                      </div>

                      {/* Quick Button to Assign Task */}
                      <div className="border-t border-gray-100 pt-2 flex items-center justify-between gap-2">
                        <button
                          onClick={() => openAssignRoleModal(staff)}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-gray-700 text-[11px] font-bold text-center transition cursor-pointer"
                        >
                          {staff.inchargeRole ? '⚙️ Manage Roles' : '+ Incharge Roles'}
                        </button>
                        <button
                          onClick={() => openTaskModal(undefined, staff.id)}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-[11px] font-bold text-center transition cursor-pointer"
                        >
                          + Add Task
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: INCHARGE ROLES & POSTS OVERVIEW ─── */}
      {mainViewTab === 'incharges' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <Award size={20} className="text-amber-400" />
                <span>Special Incharge & Department Leads (विशेष विभागीय जिम्मेवारी)</span>
              </h2>
              <p className="text-xs text-purple-200 mt-1">
                शिक्षक तथा गैर-शैक्षिक कर्मचारीहरूलाई परीक्षा, पुस्तकालय, लेखा, खेलकुद तथा अनुशासन जस्ता मुख्य विभागहरूको प्रमुख तोक्ने र कार्य अनुगमन गर्ने ठाउँ।
              </p>
            </div>
            <button
              onClick={() => openAssignRoleModal()}
              className="bg-white text-purple-950 hover:bg-purple-50 font-extrabold px-4 py-2 rounded-xl text-xs shadow-xs transition self-start sm:self-auto cursor-pointer"
            >
              + Assign Incharge Roles
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(INCHARGE_ROLES_CONFIG).map(([roleKey, cfg]) => {
              const assignedMembers = allTeachers.filter(
                (t) => t.inchargeRole && t.inchargeRole.split(',').map((r: string) => r.trim()).includes(roleKey)
              );

              return (
                <div
                  key={roleKey}
                  className={`rounded-2xl border p-5 bg-white shadow-2xs space-y-3.5 hover:shadow-md transition ${cfg.border}`}
                >
                  <div className="flex items-center justify-between border-b pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`p-2 rounded-xl ${cfg.bg} ${cfg.color}`}>
                        <Award size={18} />
                      </span>
                      <div>
                        <h3 className="font-extrabold text-sm text-gray-900">{cfg.nepali}</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">{cfg.label}</p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-extrabold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                      {assignedMembers.length} Person(s)
                    </span>
                  </div>

                  {assignedMembers.length === 0 ? (
                    <div className="py-4 text-center text-gray-400 bg-slate-50/50 rounded-xl border border-dashed border-gray-200 text-xs">
                      <p className="font-medium">No one assigned yet (हाल रिक्त)</p>
                      <button
                        onClick={() => openAssignRoleModal(undefined, roleKey)}
                        className="mt-1.5 text-xs font-bold text-purple-700 hover:underline cursor-pointer"
                      >
                        + Assign Staff (कर्मचारी तोक्नुहोस्)
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {assignedMembers.map((member) => {
                        const memberTasks = member.tasks || [];
                        const completed = memberTasks.filter((t: any) => t.status === 'COMPLETED').length;

                        return (
                          <div
                            key={member.id}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-9 w-9 rounded-xl bg-purple-100 text-purple-900 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                                {member.photoUrl ? (
                                  <img src={member.photoUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  member.fullName.slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <div>
                                <p className="font-extrabold text-xs text-gray-900 leading-tight">
                                  {member.fullName}
                                </p>
                                <p className="text-[10px] text-gray-500 font-nepali">
                                  {member.shreni === 'NON_TEACHING' ? 'गैर-शैक्षिक कर्मचारी' : 'शिक्षक'} • {member.post}
                                </p>
                                <p className="text-[10px] text-purple-800 font-mono font-bold mt-0.5">
                                  📋 {completed}/{memberTasks.length} tasks completed
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => openAssignRoleModal(member, roleKey)}
                                className="p-1 rounded-md text-gray-500 hover:bg-slate-200 text-right text-[10px] font-bold"
                                title="Edit Role Assignment"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => openTaskModal(undefined, member.id)}
                                className="px-2 py-0.5 rounded-md bg-purple-700 text-white text-[10px] font-bold hover:bg-purple-800 shadow-2xs"
                              >
                                + Task
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => openAssignRoleModal(undefined, roleKey)}
                          className="text-[11px] font-bold text-purple-700 hover:text-purple-900 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Plus size={12} />
                          <span>+ Add Staff to {cfg.nepali}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 3: TASK & DUTY TRACKING ─── */}
      {mainViewTab === 'tasks' && (
        <div className="space-y-4">
          {/* Task Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs flex-wrap">
            <div className="flex flex-1 items-center gap-2 max-w-md">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks by title, staff name, remarks..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50/60 pl-9 pr-3 py-1.5 text-xs focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter by Staff */}
              <select
                value={taskStaffFilter}
                onChange={(e) => setTaskStaffFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-slate-50/60 px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden"
              >
                <option value="">All Staff (सबै कर्मचारी/शिक्षक)</option>
                {allTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} {t.inchargeRole ? `(${t.inchargeRole})` : ''}
                  </option>
                ))}
              </select>

              {/* Filter by Category */}
              <select
                value={taskCategoryFilter}
                onChange={(e) => setTaskCategoryFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-slate-50/60 px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden"
              >
                <option value="">All Categories (सबै विधा)</option>
                <option value="EXAM">Exam (परीक्षा)</option>
                <option value="LIBRARY">Library (पुस्तकालय)</option>
                <option value="ACCOUNT">Account (लेखा)</option>
                <option value="ACADEMIC">Academic (शैक्षिक)</option>
                <option value="DISCIPLINE">Discipline (अनुशासन)</option>
                <option value="ECA">Sports & ECA (अतिरिक्त क्रियाकलाप)</option>
                <option value="ADMIN">Administration (प्रशासनिक)</option>
                <option value="GENERAL">General (सामान्य)</option>
              </select>

              {/* Filter by Status */}
              <select
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-slate-50/60 px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden"
              >
                <option value="">All Status (सबै स्थिति)</option>
                <option value="PENDING">Pending (बाँकी)</option>
                <option value="IN_PROGRESS">In Progress (सञ्चालनमा)</option>
                <option value="COMPLETED">Completed (सम्पन्न)</option>
                <option value="ON_HOLD">On Hold (स्थगित)</option>
              </select>

              {/* Filter by Priority */}
              <select
                value={taskPriorityFilter}
                onChange={(e) => setTaskPriorityFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-slate-50/60 px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden"
              >
                <option value="">All Priority (प्राथमिकता)</option>
                <option value="URGENT">Urgent (अति जरुरी)</option>
                <option value="HIGH">High (उच्च)</option>
                <option value="MEDIUM">Medium (मध्यम)</option>
                <option value="LOW">Low (सामान्य)</option>
              </select>

              <button
                onClick={() => openTaskModal()}
                className="rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] text-white px-3.5 py-1.5 text-xs font-bold shadow-2xs transition"
              >
                + Create Task
              </button>
            </div>
          </div>

          {/* Task Table */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-[#1e3a5f] text-white">
                <tr>
                  <th className="p-3.5 font-bold uppercase">Task Title & Details</th>
                  <th className="p-3.5 font-bold uppercase">Assigned Staff</th>
                  <th className="p-3.5 font-bold uppercase">Category</th>
                  <th className="p-3.5 font-bold uppercase">Priority</th>
                  <th className="p-3.5 font-bold uppercase">Due Date (BS)</th>
                  <th className="p-3.5 font-bold uppercase text-center">Status</th>
                  <th className="p-3.5 font-bold uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isTasksLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      Loading assigned tasks...
                    </td>
                  </tr>
                ) : allTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      No tasks found matching filter.
                    </td>
                  </tr>
                ) : (
                  allTasks.map((task: any) => {
                    const isUrgent = task.priority === 'URGENT';
                    const isHigh = task.priority === 'HIGH';
                    const isCompleted = task.status === 'COMPLETED';
                    const isInProgress = task.status === 'IN_PROGRESS';

                    return (
                      <tr key={task.id} className="hover:bg-slate-50">
                        <td className="p-3.5 max-w-sm">
                          <p className={`font-bold text-gray-900 ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-[11px] text-gray-500 font-nepali mt-0.5 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          {task.remarks && (
                            <span className="text-[10px] text-purple-700 font-semibold mt-0.5 block">
                              Note: {task.remarks}
                            </span>
                          )}
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-slate-100 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                              {task.assignedTo?.photoUrl ? (
                                <img src={task.assignedTo.photoUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                task.assignedTo?.fullName?.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="font-extrabold text-gray-900 leading-tight">
                                {task.assignedTo?.fullName}
                              </p>
                              {task.assignedTo?.inchargeRole && (
                                <span className="text-[9px] font-bold text-purple-700">
                                  {task.assignedTo.inchargeRole}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-700 uppercase">
                            {task.category}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-extrabold ${
                              isUrgent
                                ? 'bg-rose-100 text-rose-800'
                                : isHigh
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-50 text-blue-800'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </td>

                        <td className="p-3.5 font-mono font-bold text-gray-700">
                          {task.dueDateBs || '—'}
                        </td>

                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => {
                              const nextStatus = isCompleted
                                ? 'PENDING'
                                : isInProgress
                                ? 'COMPLETED'
                                : 'IN_PROGRESS';
                              updateTaskStatusMutation.mutate({ id: task.id, status: nextStatus });
                            }}
                            className={`rounded-xl px-2.5 py-1 text-xs font-extrabold inline-flex items-center gap-1 shadow-2xs transition ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : isInProgress
                                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                            title="Click to cycle status"
                          >
                            {isCompleted ? <Check size={13} /> : <Clock size={13} />}
                            <span>{task.status}</span>
                          </button>
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openTaskModal(task)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                              title="Edit Task"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete task "${task.title}"?`)) {
                                  deleteTaskMutation.mutate(task.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                              title="Delete Task"
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
      )}

      {/* ─── TAB 4: MASTER DROPDOWN HEADS & CATEGORY MANAGER ─── */}
      {mainViewTab === 'masters' && (
        <StaffMastersTab />
      )}

      {/* ─── ASSIGN INCHARGE ROLE MODAL ────────────────────────────────────── */}
      {isAssignRoleModalOpen && selectedStaffForRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Award size={20} className="text-purple-700" />
                <div>
                  <h3 className="text-base font-extrabold text-[#1e3a5f]">
                    Assign Incharge Role & Duties (विशेष जिम्मेवारी तोक्नुहोस्)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Staff: <b>{selectedStaffForRole.fullName}</b> ({selectedStaffForRole.shreni === 'NON_TEACHING' ? 'गैर-शैक्षिक कर्मचारी' : 'शिक्षक'})
                  </p>
                </div>
              </div>
              <button onClick={() => setIsAssignRoleModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* 1. Select Staff Member Dropdown */}
              <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-purple-950 text-xs">
                    १. कर्मचारी छनौट गर्नुहोस् (Select Teacher / Staff): *
                  </label>
                  {selectedStaffForRole && (
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                      ID: #{selectedStaffForRole.id}
                    </span>
                  )}
                </div>
                <select
                  value={selectedStaffForRole?.id || ''}
                  onChange={(e) => handleSwitchStaffForRole(parseInt(e.target.value, 10))}
                  className="w-full rounded-xl border border-purple-300 p-2.5 text-xs font-bold text-gray-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
                >
                  {allTeachers.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} {t.fullNameNepali ? `(${t.fullNameNepali})` : ''} — {t.shreni === 'NON_TEACHING' ? 'गैर-शैक्षिक कर्मचारी' : 'शिक्षक'} ({t.post || 'शिक्षक'})
                    </option>
                  ))}
                </select>
                {selectedStaffForRole && (
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-purple-900 flex-wrap">
                    <span className="font-semibold">पद: {selectedStaffForRole.post || 'शिक्षक'}</span>
                    <span>•</span>
                    <span>वर्ग: {selectedStaffForRole.shreni === 'NON_TEACHING' ? 'गैर-शैक्षिक कर्मचारी' : 'शिक्षक'}</span>
                    {selectedStaffForRole.inchargeRole && (
                      <>
                        <span>•</span>
                        <span className="font-bold text-emerald-800">
                          हालका जिम्मेवारी: {selectedStaffForRole.inchargeRole}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Select Multiple Roles */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-gray-700">
                    २. विशेष जिम्मेवारी छान्नुहोस् (Select Incharge Roles — बहु-चयन):
                  </label>
                  {targetInchargeRoles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTargetInchargeRoles([])}
                      className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear All (सबै हटाउनुहोस्)
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(INCHARGE_ROLES_CONFIG).map(([key, cfg]) => {
                    const isChecked = targetInchargeRoles.includes(key);
                    return (
                      <div
                        key={key}
                        onClick={() => toggleInchargeRole(key)}
                        className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition select-none ${
                          isChecked
                            ? 'border-purple-600 bg-purple-50/90 ring-2 ring-purple-500/20 shadow-xs'
                            : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-slate-50/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // toggled by parent wrapper
                          className="mt-0.5 rounded text-purple-700 focus:ring-purple-600 h-4 w-4 pointer-events-none"
                        />
                        <div className="flex-1">
                          <p className={`font-bold text-xs ${isChecked ? 'text-purple-950 font-extrabold' : 'text-gray-800'}`}>
                            {cfg.nepali}
                          </p>
                          <p className="text-[10px] text-gray-500 font-medium">{cfg.label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Title */}
              {targetInchargeRoles.length > 0 && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Custom Designation Title (वैकल्पिक अतिरिक्त पदनाम):
                  </label>
                  <input
                    type="text"
                    value={targetInchargeTitle}
                    onChange={(e) => setTargetInchargeTitle(e.target.value)}
                    placeholder="e.g. परीक्षा नियन्त्रक तथा पुस्तकालय प्रमुख"
                    className="erp-input font-bold text-purple-900"
                  />
                </div>
              )}

              {/* Auto Create Tasks Checkbox */}
              {targetInchargeRoles.length > 0 && (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCreateTasks}
                      onChange={(e) => setAutoCreateTasks(e.target.checked)}
                      className="mt-0.5 rounded text-purple-700 focus:ring-purple-600 h-4 w-4"
                    />
                    <div>
                      <span className="font-extrabold text-purple-950 block">
                        Auto-assign standard responsibilities & tasks (चयन गरिएका भूमिकाहरूका मानक कार्यहरू स्वतः तोक्ने)
                      </span>
                      <span className="text-[11px] text-purple-800">
                        चयन गरिएका सबै भूमिकाहरूका प्रमुख कार्यहरू (परीक्षा तालिका, पुस्तकालय व्यवस्थापन, बिलिङ, आदि) यस कर्मचारीको खातामा स्वतः दर्ता हुनेछ।
                      </span>
                    </div>
                  </label>

                  {autoCreateTasks && (
                    <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between">
                      <span className="font-bold text-purple-900 text-[11px]">Target Due Date (BS):</span>
                      <input
                        type="text"
                        value={inchargeDueDateBs}
                        onChange={(e) => setInchargeDueDateBs(e.target.value)}
                        className="rounded-lg border border-purple-300 bg-white px-2 py-1 text-xs font-mono font-bold text-purple-950 w-32 text-center"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Incharge Access Notice */}
              {targetInchargeRoles.length > 0 && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-emerald-950 block text-xs">
                        Teacher Portal Preserved + Incharge Hub Activated (शिक्षक पोर्टल यथावत रहने)
                      </span>
                      <span className="text-[11px] text-emerald-800">
                        शिक्षकको मुख्य Teacher Portal हट्ने छैन। निजको शिक्षक पोर्टलभित्रै तोकिएका शाखाहरू (पुस्तकालय, लेखा, परीक्षा, आदि) को विशेष विभागीय पहुँच र कार्यहरू स्वतः खुल्नेछ।
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAssignRoleModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={assignRoleMutation.isPending}
                  onClick={() =>
                    assignRoleMutation.mutate({
                      teacherId: selectedStaffForRole.id,
                      inchargeRoles: targetInchargeRoles,
                      inchargeTitle: targetInchargeTitle,
                      syncUserRole,
                      autoCreateTasks,
                      dueDateBs: inchargeDueDateBs,
                    })
                  }
                  className="rounded-xl bg-purple-700 hover:bg-purple-800 px-5 py-2 font-bold text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {assignRoleMutation.isPending ? 'Assigning...' : 'Save & Assign Duties'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATE / EDIT TASK MODAL ───────────────────────────────────────── */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList size={20} className="text-purple-700" />
                <h3 className="text-base font-extrabold text-[#1e3a5f]">
                  {editingTask ? 'Edit Task (कार्य सम्पादन)' : 'Assign New Task (नयाँ कार्य तोक्नुहोस्)'}
                </h3>
              </div>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!taskForm.title || !taskForm.assignedToId) {
                  toast.error('Task title and assigned staff are required.');
                  return;
                }
                if (editingTask) {
                  editTaskMutation.mutate({ id: editingTask.id, data: taskForm });
                } else {
                  createTaskMutation.mutate(taskForm);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Task Title (कार्यको शीर्षक) *</label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. परीक्षा तालिका रुजु गर्ने / Question Paper Printing"
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Assigned Staff Member (जिम्मेवार शिक्षक/कर्मचारी) *</label>
                <select
                  required
                  value={taskForm.assignedToId}
                  onChange={(e) => setTaskForm((p) => ({ ...p, assignedToId: e.target.value }))}
                  className="erp-input font-semibold"
                >
                  <option value="">Select Staff Member</option>
                  {allTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.shreni === 'NON_TEACHING' ? 'Staff' : 'Teacher'}) {t.inchargeRole ? `[${t.inchargeRole}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category (विधा)</label>
                  <select
                    value={taskForm.category}
                    onChange={(e) => setTaskForm((p) => ({ ...p, category: e.target.value }))}
                    className="erp-input font-semibold"
                  >
                    <option value="EXAM">Exam (परीक्षा)</option>
                    <option value="LIBRARY">Library (पुस्तकालय)</option>
                    <option value="ACCOUNT">Account (लेखा)</option>
                    <option value="ACADEMIC">Academic (शैक्षिक)</option>
                    <option value="DISCIPLINE">Discipline (अनुशासन)</option>
                    <option value="ECA">Sports & ECA (अतिरिक्त)</option>
                    <option value="ADMIN">Administration (प्रशासनिक)</option>
                    <option value="GENERAL">General (सामान्य)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Priority (प्राथमिकता)</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm((p) => ({ ...p, priority: e.target.value }))}
                    className="erp-input font-bold text-purple-900"
                  >
                    <option value="URGENT">🔴 Urgent (अति जरुरी)</option>
                    <option value="HIGH">🟠 High (उच्च)</option>
                    <option value="MEDIUM">🔵 Medium (मध्यम)</option>
                    <option value="LOW">⚪ Low (सामान्य)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Due Date (BS)</label>
                  <input
                    type="text"
                    value={taskForm.dueDateBs}
                    onChange={(e) => setTaskForm((p) => ({ ...p, dueDateBs: e.target.value }))}
                    className="erp-input font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Status (स्थिति)</label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm((p) => ({ ...p, status: e.target.value }))}
                    className="erp-input font-semibold"
                  >
                    <option value="PENDING">Pending (बाँकी)</option>
                    <option value="IN_PROGRESS">In Progress (सञ्चालनमा)</option>
                    <option value="COMPLETED">Completed (सम्पन्न)</option>
                    <option value="ON_HOLD">On Hold (स्थगित)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description / Instructions (विवरण / निर्देशन)</label>
                <textarea
                  rows={3}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Detailed instructions for the task..."
                  className="erp-input"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Remarks / Note (कैफियत)</label>
                <input
                  type="text"
                  value={taskForm.remarks}
                  onChange={(e) => setTaskForm((p) => ({ ...p, remarks: e.target.value }))}
                  placeholder="Additional remarks..."
                  className="erp-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending || editTaskMutation.isPending}
                  className="rounded-xl bg-purple-700 hover:bg-purple-800 px-5 py-2 font-bold text-white shadow-xs transition disabled:opacity-50"
                >
                  {createTaskMutation.isPending || editTaskMutation.isPending
                    ? 'Saving...'
                    : editingTask
                    ? 'Update Task'
                    : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD TEACHER / NON-TEACHING STAFF MODAL ───────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#1e3a5f]">
                  {modalCategory === 'NON_TEACHING'
                    ? 'Register Non-Teaching Staff (गैर-शैक्षिक कर्मचारी दर्ता)'
                    : 'Register Teacher (शिक्षक दर्ता)'}
                </h2>
                <p className="text-[11px] text-gray-500 font-nepali">
                  व्यक्तिगत विवरण, पद, तह, विशेष जिम्मेवारी तथा पोर्टल लगइन सिर्जना
                </p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              {/* Category Selector Buttons */}
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600">
                  कर्मचारी वर्ग (Staff Category) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalCategory('TEACHING');
                      setSelectedPost(TEACHING_POSTS[2]);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      modalCategory === 'TEACHING'
                        ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-slate-100'
                    }`}
                  >
                    <GraduationCap size={16} />
                    <span>Teaching Faculty (शिक्षक)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModalCategory('NON_TEACHING');
                      setSelectedPost(NON_TEACHING_POSTS[0]);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      modalCategory === 'NON_TEACHING'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-slate-100'
                    }`}
                  >
                    <Briefcase size={16} />
                    <span>Non-Teaching Staff (कर्मचारी)</span>
                  </button>
                </div>
              </div>

              {/* Photo Upload Section */}
              <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-gray-300 flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-white border border-gray-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <Camera size={24} className="text-gray-400" />
                  )}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-gray-700">Profile Photo (फोटो)</label>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      Max 50 KB (Auto-Optimized)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, false)}
                      className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#1e3a5f] file:text-white hover:file:bg-[#2a5280] cursor-pointer"
                    />
                    {photoPreview && (
                      <button
                        type="button"
                        onClick={() => setPhotoPreview('')}
                        className="text-xs text-rose-600 font-bold hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Name (English) *</label>
                  <input required name="fullName" type="text" placeholder="e.g. Ramesh Kumar Yadav" className="erp-input font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Name (नेपाली)</label>
                  <input name="fullNameNepali" type="text" placeholder="उदा. रमेश कुमार यादव" className="erp-input font-nepali" />
                </div>
              </div>

              {/* Personal Details: Gender (Compulsory *), Blood Group, Date of Birth (BS) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">
                    Gender (लिङ्ग) <span className="text-rose-600 font-extrabold">*</span>
                  </label>
                  <select required name="gender" className="erp-input font-bold text-[#1e3a5f] bg-white">
                    <option value="">-- चयन गर्नुहोस् (Select) * --</option>
                    <option value="MALE">पुरुष (Male)</option>
                    <option value="FEMALE">महिला (Female)</option>
                    <option value="OTHER">अन्य (Other)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1">Blood Group (रक्त समूह)</label>
                  <select name="bloodGroup" className="erp-input font-semibold bg-white">
                    <option value="">-- छैन / Select --</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1">Date of Birth (जन्म मिति BS)</label>
                  <input
                    name="dateOfBirthBs"
                    type="text"
                    placeholder="उदा: २०४०-०५-१५"
                    className="erp-input font-mono bg-white"
                  />
                </div>
              </div>

              {/* Post / Designation Selection */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  पद / Designation ({modalCategory === 'NON_TEACHING' ? 'गैर-शैक्षिक पद' : 'शिक्षक पद'}) *
                </label>
                <select
                  value={selectedPost}
                  onChange={(e) => setSelectedPost(e.target.value)}
                  className="erp-input font-semibold"
                >
                  {masterPosts.length > 0 ? (
                    masterPosts.map((p: any) => (
                      <option key={p.id} value={p.titleNepali ? `${p.titleNepali} (${p.title})` : p.title}>
                        {p.titleNepali ? `${p.titleNepali} (${p.title})` : p.title}
                      </option>
                    ))
                  ) : (
                    modalCategory === 'NON_TEACHING'
                      ? NON_TEACHING_POSTS.map((p) => <option key={p} value={p}>{p}</option>)
                      : TEACHING_POSTS.map((p) => <option key={p} value={p}>{p}</option>)
                  )}
                </select>
              </div>

              {/* Employment Type, Taha, Display Order, & Portal Role */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Appointment Type (सेवा प्रकार) *</label>
                  <select name="type" required className="erp-input font-semibold">
                    {masterTeacherTypes.length > 0 ? (
                      masterTeacherTypes.map((t: any) => (
                        <option key={t.id} value={t.code || t.title}>
                          {t.titleNepali || t.title}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="RASTRIYA">स्थाई (Government / Rastriya)</option>
                        <option value="NIJI_SROTH">निजी स्रोत (Private / Contract)</option>
                        <option value="RAHAT">राहत शिक्षक (Rahat)</option>
                        <option value="KARAR">करार शिक्षक (Contract)</option>
                        <option value="BALBIKAS">बालविकास (ECD)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Taha / Sreni (तह/श्रेणी)</label>
                  <select name="taha" className="erp-input font-bold text-[#1e3a5f]">
                    <option value="">Select Taha / Sreni</option>
                    {scalesData?.map((s: any) => (
                      <option key={s.id} value={s.taha}>
                        {s.taha} (मूल: रू {s.moolTalab?.toLocaleString()})
                      </option>
                    ))}
                    {masterTahas.map((t: any) => (
                      <option key={t.id} value={t.titleNepali || t.title}>
                        {t.titleNepali || t.title}
                      </option>
                    ))}
                    <option value="सहायक पाँचौ">सहायक पाँचौ (Assistant 5th)</option>
                    <option value="सहायक चौथो">सहायक चौथो (Assistant 4th)</option>
                    <option value="श्रेणीविहीन">श्रेणीविहीन (Unranked / Helper)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">क्रम नं. (Display Order):</label>
                  <input
                    name="displayOrder"
                    type="number"
                    min="0"
                    defaultValue={(allTeachers.length || 0) + 1}
                    placeholder="1"
                    className="erp-input font-mono font-bold"
                    title="शिक्षक तथा पेरोल सूचीमा देखाउने क्रम अङ्क"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Portal System Role:</label>
                  <select name="role" className="erp-input font-semibold">
                    <option value="TEACHER">Staff / Teacher Portal</option>
                    <option value="ACCOUNTANT">Accountant (लेखा)</option>
                    <option value="LIBRARIAN">Librarian (पुस्तकालय)</option>
                    <option value="ADMIN">Administrator (प्रशासन)</option>
                  </select>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-100 pt-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone (Mobile No) *</label>
                  <input required name="phone" type="tel" placeholder="98XXXXXXXX" className="erp-input font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                  <input name="email" type="email" placeholder="staff@school.edu.np" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Citizenship No (नागरिकता नं.)</label>
                  <input name="citizenshipNo" type="text" placeholder="नागरिकता नं." className="erp-input font-mono" />
                </div>
              </div>

              {/* Service Dates: Joining & Retirement / Exit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-gray-200">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">Date of Joining (नियुक्ति/हाजिर मिति BS)</label>
                  <input name="dateOfJoiningBs" type="text" placeholder="उदा: २०७५-०४-०१" className="erp-input font-mono bg-white" />
                </div>
                <div>
                  <label className="block font-bold text-gray-800 mb-1">Date of Retirement / Exit (अवकाश/सरुवा मिति BS)</label>
                  <input name="dateOfRetirementBs" type="text" placeholder="उदा: २०८५-०४-०१" className="erp-input font-mono bg-white" />
                </div>
              </div>

              {/* Financial IDs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">PAN Number</label>
                  <input name="panNo" type="text" placeholder="PAN 102938475" className="erp-input font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Sanchaya Kosh (SSK) No</label>
                  <input name="sanchayaKoshNo" type="text" placeholder="SSK Number" className="erp-input font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nagarik Lagani Kosh (CIT)</label>
                  <input name="nagarikLaganiKoshNo" type="text" placeholder="CIT Number" className="erp-input font-mono" />
                </div>
              </div>

              {/* Primary Bank Account Details */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                    <Landmark size={14} className="text-emerald-700" />
                    <span>मुख्य तलब बैंक खाता विवरण (Primary Salary Bank Account)</span>
                  </label>
                  <span className="text-[10px] text-emerald-700 font-semibold">Multiple accounts can be added later</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Bank Name (बैंकको नाम)</label>
                    <input
                      name="bankName"
                      type="text"
                      list="teachers-bank-list"
                      placeholder="e.g. Machhapuchchhre Bank Ltd."
                      className="erp-input font-medium bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Account No (खाता नम्बर)</label>
                    <input name="bankAccountNo" type="text" placeholder="12345678901234" className="erp-input font-mono font-bold bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Branch (शाखा)</label>
                    <input
                      name="bankBranch"
                      type="text"
                      list="teachers-branch-list"
                      placeholder="e.g. Garuda Branch"
                      className="erp-input font-medium bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Subjects Checklist (for Teaching Staff only) */}
              {modalCategory === 'TEACHING' && (
                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-900">
                    पढाउने विषयहरू (Subjects Taught):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                    {subjectsData?.map((sub: any) => {
                      const isChecked = selectedSubjectIds.includes(sub.id);
                      return (
                        <label
                          key={sub.id}
                          className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer ${
                            isChecked
                              ? 'bg-white border-blue-400 font-bold text-blue-900'
                              : 'bg-white/60 border-gray-200 text-gray-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() =>
                              setSelectedSubjectIds((prev) =>
                                isChecked ? prev.filter((id) => id !== sub.id) : [...prev, sub.id]
                              )
                            }
                            className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                          />
                          <span className="truncate">{sub.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Past / Historical Staff Toggle */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isHistorical"
                    id="isHistorical"
                    value="true"
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  <div>
                    <span className="font-bold text-xs text-amber-950">
                      विगत / पूर्व शिक्षक वा कर्मचारी (Past / Historical Staff Record)
                    </span>
                    <p className="text-[11px] text-amber-800 font-nepali">
                      विगतका आर्थिक वर्षको तलब भरपाईका लागि मात्र दर्ता गर्ने हो भने चिन्ह लगाउनुहोस्। यिनीहरूको कुनै Login Portal खाता सिर्जना हुने छैन।
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addTeacherMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] px-5 py-2 font-semibold text-white hover:bg-[#2a5280] disabled:opacity-60 cursor-pointer"
                >
                  {addTeacherMutation.isPending ? 'Saving...' : 'Register Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT TEACHER / NON-TEACHING STAFF MODAL ───────────────────────── */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#1e3a5f]">
                  Edit Staff / Teacher Details (विवरण सम्पादन)
                </h2>
                <p className="text-[11px] text-gray-500">
                  Update personal, designation, incharge role, category or portal role
                </p>
              </div>
              <button onClick={() => setEditingTeacher(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              {/* Category Selector */}
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600">
                  कर्मचारी वर्ग (Staff Category) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalCategory('TEACHING')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      modalCategory === 'TEACHING'
                        ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-slate-100'
                    }`}
                  >
                    <GraduationCap size={16} />
                    <span>Teaching Faculty (शिक्षक)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalCategory('NON_TEACHING')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      modalCategory === 'NON_TEACHING'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-slate-100'
                    }`}
                  >
                    <Briefcase size={16} />
                    <span>Non-Teaching Staff (कर्मचारी)</span>
                  </button>
                </div>
              </div>

              {/* Photo Upload Section */}
              <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-gray-300 flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-white border border-gray-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                  {editPhotoPreview ? (
                    <img src={editPhotoPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <Camera size={24} className="text-gray-400" />
                  )}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-gray-700">Change Photo (फोटो परिवर्तन)</label>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      Max 50 KB (Auto-Optimized)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, true)}
                      className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#1e3a5f] file:text-white hover:file:bg-[#2a5280] cursor-pointer"
                    />
                    {editPhotoPreview && (
                      <button
                        type="button"
                        onClick={() => setEditPhotoPreview('')}
                        className="text-xs text-rose-600 font-bold hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Name (English) *</label>
                  <input
                    required
                    name="fullName"
                    type="text"
                    defaultValue={editingTeacher.fullName}
                    className="erp-input font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Name (नेपाली)</label>
                  <input
                    name="fullNameNepali"
                    type="text"
                    defaultValue={editingTeacher.fullNameNepali || ''}
                    className="erp-input font-nepali"
                  />
                </div>
              </div>

              {/* Personal Details: Gender (Compulsory *), Blood Group, Date of Birth (BS) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">
                    Gender (लिङ्ग) <span className="text-rose-600 font-extrabold">*</span>
                  </label>
                  <select
                    required
                    name="gender"
                    defaultValue={editingTeacher.gender || ''}
                    className="erp-input font-bold text-[#1e3a5f] bg-white"
                  >
                    <option value="">-- चयन गर्नुहोस् (Select) * --</option>
                    <option value="MALE">पुरुष (Male)</option>
                    <option value="FEMALE">महिला (Female)</option>
                    <option value="OTHER">अन्य (Other)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1">Blood Group (रक्त समूह)</label>
                  <select
                    name="bloodGroup"
                    defaultValue={editingTeacher.bloodGroup || ''}
                    className="erp-input font-semibold bg-white"
                  >
                    <option value="">-- छैन / Select --</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1">Date of Birth (जन्म मिति BS)</label>
                  <input
                    name="dateOfBirthBs"
                    type="text"
                    defaultValue={editingTeacher.dateOfBirthBs || ''}
                    placeholder="उदा: २०४०-०५-१५"
                    className="erp-input font-mono bg-white"
                  />
                </div>
              </div>

              {/* Post & Incharge Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    पद / Designation ({modalCategory === 'NON_TEACHING' ? 'गैर-शैक्षिक पद' : 'शिक्षक पद'}) *
                  </label>
                  <select
                    value={selectedPost}
                    onChange={(e) => setSelectedPost(e.target.value)}
                    className="erp-input font-semibold"
                  >
                    {masterPosts.length > 0 ? (
                      masterPosts.map((p: any) => (
                        <option key={p.id} value={p.titleNepali ? `${p.titleNepali} (${p.title})` : p.title}>
                          {p.titleNepali ? `${p.titleNepali} (${p.title})` : p.title}
                        </option>
                      ))
                    ) : (
                      modalCategory === 'NON_TEACHING'
                        ? NON_TEACHING_POSTS.map((p) => <option key={p} value={p}>{p}</option>)
                        : TEACHING_POSTS.map((p) => <option key={p} value={p}>{p}</option>)
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Special Incharge Role (विशेष जिम्मेवारी):</label>
                  <select
                    value={modalInchargeRole}
                    onChange={(e) => setModalInchargeRole(e.target.value)}
                    className="erp-input font-bold text-purple-900"
                  >
                    <option value="">No Incharge Role (सामान्य)</option>
                    {masterInchargeRoles.length > 0 ? (
                      masterInchargeRoles.map((r: any) => (
                        <option key={r.id} value={r.code || r.title}>
                          {r.titleNepali || r.title}
                        </option>
                      ))
                    ) : (
                      Object.entries(INCHARGE_ROLES_CONFIG).map(([k, cfg]) => (
                        <option key={k} value={k}>{cfg.nepali} ({cfg.label})</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Employment Type, Taha, Display Order, & Portal Role */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Appointment Type (सेवा प्रकार) *</label>
                  <select
                    name="type"
                    required
                    defaultValue={editingTeacher.type}
                    className="erp-input font-semibold"
                  >
                    {masterTeacherTypes.length > 0 ? (
                      masterTeacherTypes.map((t: any) => (
                        <option key={t.id} value={t.code || t.title}>
                          {t.titleNepali || t.title}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="RASTRIYA">स्थाई (Government / Rastriya)</option>
                        <option value="NIJI_SROTH">निजी स्रोत (Private / Contract)</option>
                        <option value="RAHAT">राहत शिक्षक (Rahat)</option>
                        <option value="KARAR">करार शिक्षक (Contract)</option>
                        <option value="BALBIKAS">बालविकास (ECD)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Taha / Sreni (तह/श्रेणी)</label>
                  <select
                    name="taha"
                    defaultValue={editingTeacher.taha || ''}
                    className="erp-input font-bold text-[#1e3a5f]"
                  >
                    <option value="">Select Taha / Sreni</option>
                    {scalesData?.map((s: any) => (
                      <option key={s.id} value={s.taha}>
                        {s.taha} (मूल: रू {s.moolTalab?.toLocaleString()})
                      </option>
                    ))}
                    {masterTahas.map((t: any) => (
                      <option key={t.id} value={t.titleNepali || t.title}>
                        {t.titleNepali || t.title}
                      </option>
                    ))}
                    <option value="सहायक पाँचौ">सहायक पाँचौ (Assistant 5th)</option>
                    <option value="सहायक चौथो">सहायक चौथो (Assistant 4th)</option>
                    <option value="श्रेणीविहीन">श्रेणीविहीन (Unranked / Helper)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">क्रम नं. (Display Order):</label>
                  <input
                    name="displayOrder"
                    type="number"
                    min="0"
                    defaultValue={editingTeacher.displayOrder !== null && editingTeacher.displayOrder !== undefined ? editingTeacher.displayOrder : 0}
                    placeholder="0"
                    className="erp-input font-mono font-bold"
                    title="शिक्षक तथा पेरोल सूचीमा देखाउने क्रम अङ्क"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Portal Role (लगइन पहुँच):</label>
                  <select
                    name="role"
                    defaultValue={editingTeacher.user?.role || 'TEACHER'}
                    className="erp-input font-semibold"
                  >
                    <option value="TEACHER">Staff / Teacher Portal (कर्मचारी पोर्टल)</option>
                    <option value="ACCOUNTANT">Accountant (लेखा तथा वित्तीय पूर्ण पहुँच)</option>
                    <option value="LIBRARIAN">Librarian (पुस्तकालय व्यवस्थापक)</option>
                    <option value="ADMIN">Administrator (प्रशासकीय पहुँच)</option>
                  </select>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-100 pt-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone (Mobile No)</label>
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={editingTeacher.phone || ''}
                    className="erp-input font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={editingTeacher.email || ''}
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Citizenship No (नागरिकता नं.)</label>
                  <input
                    name="citizenshipNo"
                    type="text"
                    defaultValue={editingTeacher.citizenshipNo || ''}
                    placeholder="नागरिकता नं."
                    className="erp-input font-mono"
                  />
                </div>
              </div>

              {/* Service Dates & Status / Retirement Management */}
              <div className="space-y-2.5">
                <div className="p-3 bg-slate-50 rounded-xl border border-gray-200">
                  <label className="block font-bold text-gray-800 mb-1">Date of Joining (नियुक्ति/हाजिर मिति BS)</label>
                  <input
                    name="dateOfJoiningBs"
                    type="text"
                    defaultValue={editingTeacher.dateOfJoiningBs || ''}
                    placeholder="उदा: २०७५-०४-०१"
                    className="erp-input font-mono bg-white"
                  />
                </div>

                {/* Active vs Retired Status Toggle Card */}
                <div
                  className={`p-3.5 rounded-xl border transition ${
                    editIsActive
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50/80 border-amber-200 text-amber-950'
                  } space-y-2.5`}
                >
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 font-bold text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editIsActive}
                        onChange={(e) => {
                          const active = e.target.checked;
                          setEditIsActive(active);
                          if (active) {
                            setEditRetirementDate('');
                            setEditStatusReason('');
                          }
                        }}
                        className="rounded text-emerald-600 w-4 h-4 cursor-pointer"
                      />
                      <span>
                        {editIsActive
                          ? '✅ कार्यरत शिक्षक / कर्मचारी (Currently Active & Working)'
                          : '🛑 अवकाश / सरुवा / विगत कर्मचारी (Retired / Transferred / Inactive)'}
                      </span>
                    </label>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                        editIsActive
                          ? 'bg-emerald-200/80 text-emerald-900'
                          : 'bg-amber-200/80 text-amber-900'
                      }`}
                    >
                      {editIsActive ? 'सक्रिय (Active)' : 'अवकाश (Retired)'}
                    </span>
                  </div>

                  {!editIsActive && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-amber-200/60">
                      <div>
                        <label className="block text-[11px] font-bold text-amber-900 mb-1">
                          अवकाश / सरुवा कारण (Exit Reason):
                        </label>
                        <select
                          value={editStatusReason}
                          onChange={(e) => setEditStatusReason(e.target.value)}
                          className="erp-input font-bold text-amber-950 bg-white"
                        >
                          <option value="सरुवा (Transferred)">🚚 सरुवा (Transferred)</option>
                          <option value="अनिवार्य अवकाश (Compulsory Retirement)">🎖️ अनिवार्य अवकाश (Compulsory Retirement)</option>
                          <option value="स्वैच्छिक अवकाश (Voluntary Retirement)">🕊️ स्वैच्छिक अवकाश (Voluntary Retirement)</option>
                          <option value="राजीनामा (Resigned)">📄 राजीनामा (Resigned)</option>
                          <option value="करार समाप्ति (Contract Expired)">⌛ करार समाप्ति (Contract Expired)</option>
                          <option value="अन्य पूर्व कर्मचारी (Past Staff)">📦 अन्य पूर्व कर्मचारी (Other Past Record)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-amber-900 mb-1">
                          अवकाश / सरुवा मिति (Retirement Date BS):
                        </label>
                        <input
                          type="text"
                          value={editRetirementDate}
                          onChange={(e) => setEditRetirementDate(e.target.value)}
                          placeholder="उदा: २०८२-०४-०१"
                          className="erp-input font-mono bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {editIsActive && editingTeacher.isActive === false && (
                    <p className="text-[11px] text-emerald-800 font-nepali">
                      💡 <b>नोट:</b> चेकबक्स लगाउनाले यो शिक्षकलाई अवकाशबाट हटाएर <b>पुनः कार्यरत (Active Staff)</b> बनाइनेछ र लगइन पोर्टल पुनः सक्रिय हुनेछ।
                    </p>
                  )}
                </div>
              </div>

              {/* Financial IDs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">PAN Number</label>
                  <input
                    name="panNo"
                    type="text"
                    defaultValue={editingTeacher.panNo || ''}
                    placeholder="PAN 102938475"
                    className="erp-input font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Sanchaya Kosh (SSK) No</label>
                  <input
                    name="sanchayaKoshNo"
                    type="text"
                    defaultValue={editingTeacher.sanchayaKoshNo || ''}
                    placeholder="SSK Number"
                    className="erp-input font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nagarik Lagani Kosh (CIT)</label>
                  <input
                    name="nagarikLaganiKoshNo"
                    type="text"
                    defaultValue={editingTeacher.nagarikLaganiKoshNo || ''}
                    placeholder="CIT Number"
                    className="erp-input font-mono"
                  />
                </div>
              </div>

              {/* Primary Bank Account Details & Multiple Accounts Manager Shortcut */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                    <Landmark size={14} className="text-emerald-700" />
                    <span>मुख्य तलब बैंक खाता (Primary Salary Bank Account)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => openBankAccountsModal(editingTeacher)}
                    className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100/70 hover:bg-emerald-200/80 px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1"
                  >
                    <span>🏦 Manage All Bank Accounts</span>
                    {editingTeacher.bankAccounts && editingTeacher.bankAccounts.length > 0 && (
                      <span className="bg-emerald-700 text-white rounded-full px-1 text-[9px] font-mono">
                        {editingTeacher.bankAccounts.length}
                      </span>
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Bank Name (बैंकको नाम)</label>
                    <input
                      name="bankName"
                      type="text"
                      list="teachers-bank-list"
                      defaultValue={editingTeacher.bankName || ''}
                      placeholder="e.g. Machhapuchchhre Bank Ltd."
                      className="erp-input font-medium bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Account No (खाता नम्बर)</label>
                    <input
                      name="bankAccountNo"
                      type="text"
                      defaultValue={editingTeacher.bankAccountNo || ''}
                      placeholder="12345678901234"
                      className="erp-input font-mono font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Branch (शाखा)</label>
                    <input
                      name="bankBranch"
                      type="text"
                      list="teachers-branch-list"
                      defaultValue={editingTeacher.bankBranch || ''}
                      placeholder="e.g. Garuda Branch"
                      className="erp-input font-medium bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Subjects Checklist (for Teaching Staff only) */}
              {modalCategory === 'TEACHING' && (
                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-900">
                    पढाउने विषयहरू (Subjects Taught):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                    {subjectsData?.map((sub: any) => {
                      const isChecked = selectedSubjectIds.includes(sub.id);
                      return (
                        <label
                          key={sub.id}
                          className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer ${
                            isChecked
                              ? 'bg-white border-blue-400 font-bold text-blue-900'
                              : 'bg-white/60 border-gray-200 text-gray-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() =>
                              setSelectedSubjectIds((prev) =>
                                isChecked ? prev.filter((id) => id !== sub.id) : [...prev, sub.id]
                              )
                            }
                            className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                          />
                          <span className="truncate">{sub.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editTeacherMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] px-5 py-2 font-semibold text-white hover:bg-[#2a5280] disabled:opacity-60 cursor-pointer"
                >
                  {editTeacherMutation.isPending ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CREDENTIALS SUCCESS POPUP ──────────────────────────────────────── */}
      {newCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <KeyRound size={24} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900">Staff Portal Credentials</h3>
              <p className="text-xs text-gray-500 mt-1">
                Please copy and share these credentials with the staff member.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-left text-xs font-mono space-y-2">
              <div>
                <span className="text-gray-400 block font-sans">Username:</span>
                <span className="font-bold text-base text-[#1e3a5f]">{newCredentials.username}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-sans">Temporary Password:</span>
                <span className="font-bold text-base text-emerald-700">{newCredentials.password}</span>
              </div>
            </div>

            <button
              onClick={() => setNewCredentials(null)}
              className="w-full rounded-xl bg-[#1e3a5f] py-2 text-xs font-bold text-white hover:bg-[#2a5280] cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}

      {/* ─── TRANSFER & RETIREMENT STATUS MODAL ───────────────────────── */}
      {statusModalStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-900">
                  <ArrowRightLeft size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1e3a5f]">
                    शिक्षक/कर्मचारी सरुवा तथा अवकाश प्रविष्टि
                  </h3>
                  <p className="text-xs text-gray-500 font-nepali">
                    Staff Transfer & Retirement Management
                  </p>
                </div>
              </div>
              <button onClick={() => setStatusModalStaff(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Staff Card */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-[#1e3a5f] text-white flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                {statusModalStaff.photoUrl ? (
                  <img src={statusModalStaff.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  statusModalStaff.fullName?.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-gray-900 text-sm truncate">{statusModalStaff.fullName}</h4>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                    statusModalStaff.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {statusModalStaff.isActive ? 'हाल कार्यरत (Active)' : 'विगत/निष्कृय (Past/Inactive)'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-nepali">{statusModalStaff.fullNameNepali || statusModalStaff.post || 'शिक्षक'}</p>
                <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono mt-0.5 flex-wrap">
                  {statusModalStaff.phone && <span>📞 {statusModalStaff.phone}</span>}
                  {statusModalStaff.panNo && <span>• PAN: {statusModalStaff.panNo}</span>}
                  {statusModalStaff.dateOfJoiningBs && <span>• हाजिर: {statusModalStaff.dateOfJoiningBs}</span>}
                </div>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (statusForm.isReactivating) {
                  updateStatusMutation.mutate({
                    id: statusModalStaff.id,
                    isActive: true,
                    statusReason: 'पुनः कार्यरत',
                    dateOfRetirementBs: '',
                    exitRemarks: '',
                    disableLogin: false,
                  });
                } else {
                  updateStatusMutation.mutate({
                    id: statusModalStaff.id,
                    isActive: false,
                    statusReason: statusForm.statusType,
                    dateOfRetirementBs: statusForm.dateBs,
                    exitRemarks: statusForm.destination || statusForm.remarks,
                    disableLogin: statusForm.disableLogin,
                  });
                }
              }}
              className="space-y-3.5 text-xs"
            >
              {/* Mode Toggle if already Inactive */}
              {!statusModalStaff.isActive && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                  <label className="flex items-center gap-2 font-bold text-blue-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={statusForm.isReactivating}
                      onChange={(e) => setStatusForm({ ...statusForm, isReactivating: e.target.checked })}
                      className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                    />
                    <span>🔄 यस शिक्षक/कर्मचारीलाई पुनः सक्रिय सेवामा बहाली (Re-activate to Active) गर्नुहोस्</span>
                  </label>
                  <p className="text-[11px] text-blue-800 font-nepali pl-6">
                    बहाली गर्दा शिक्षक पुनः कार्यरत सूचीमा आउनेछन् र लगइन पोर्टल पहुँच खुला हुनेछ।
                  </p>
                </div>
              )}

              {!statusForm.isReactivating && (
                <>
                  {/* Status Type */}
                  <div>
                    <label className="block font-bold text-gray-800 mb-1">
                      सरुवा / अवकाशको प्रकार (Transfer / Retirement Type): *
                    </label>
                    <select
                      value={statusForm.statusType}
                      onChange={(e) => setStatusForm({ ...statusForm, statusType: e.target.value })}
                      className="erp-input font-bold text-[#1e3a5f]"
                    >
                      <option value="सरुवा (Transferred)">🚚 सरुवा (Transferred to another school / office)</option>
                      <option value="अनिवार्य अवकाश (Compulsory Retirement)">🎖️ अनिवार्य अवकाश (Compulsory Age Retirement)</option>
                      <option value="स्वैच्छिक अवकाश (Voluntary Retirement)">🕊️ स्वैच्छिक अवकाश (Voluntary Retirement / VR)</option>
                      <option value="राजीनामा (Resigned)">📄 राजीनामा (Resigned)</option>
                      <option value="करार समाप्ति (Contract Expired)">⌛ करार समाप्ति (Contract Expired / Terminated)</option>
                      <option value="अन्य पूर्व कर्मचारी (Past Staff)">📦 अन्य पूर्व कर्मचारी (Other Past Record)</option>
                    </select>
                  </div>

                  {/* Effective Date BS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-800 mb-1">
                        सरुवा / अवकाश मिति BS (Effective Date): *
                      </label>
                      <input
                        type="text"
                        required
                        value={statusForm.dateBs}
                        onChange={(e) => setStatusForm({ ...statusForm, dateBs: e.target.value })}
                        placeholder="उदा: २०८२-०४-०१"
                        className="erp-input font-mono font-bold"
                      />
                    </div>

                    {statusForm.statusType.includes('सरुवा') && (
                      <div>
                        <label className="block font-bold text-gray-800 mb-1">
                          सरुवा भएको नयाँ विद्यालय/निकाय (Destination):
                        </label>
                        <input
                          type="text"
                          value={statusForm.destination}
                          onChange={(e) => setStatusForm({ ...statusForm, destination: e.target.value })}
                          placeholder="उदा: जनता मा.वि. गौर"
                          className="erp-input"
                        />
                      </div>
                    )}
                  </div>

                  {/* Remarks / Reference Letter */}
                  <div>
                    <label className="block font-bold text-gray-800 mb-1">
                      निर्णय / चलानी नं. / कैफियत (Letter No / Remarks):
                    </label>
                    <textarea
                      rows={2}
                      value={statusForm.remarks}
                      onChange={(e) => setStatusForm({ ...statusForm, remarks: e.target.value })}
                      placeholder="उदा: शिक्षा विकास तथा समन्वय इकाईको च.नं. ३४२ को सरुवा पत्र अनुसार..."
                      className="erp-input text-xs"
                    />
                  </div>

                  {/* Login Security Toggle */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                    <label className="flex items-center gap-2 font-bold text-amber-950 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={statusForm.disableLogin}
                        onChange={(e) => setStatusForm({ ...statusForm, disableLogin: e.target.checked })}
                        className="rounded text-amber-600 w-4 h-4 cursor-pointer"
                      />
                      <span>🔒 शिक्षक लगइन पोर्टल खाता स्वतः निष्कृय (Disable Login Account) गर्नुहोस्</span>
                    </label>
                    <p className="text-[11px] text-amber-800 font-nepali pl-6">
                      सिफारिस गरिएको: सरुवा वा अवकाश भएका व्यक्तिको लगइन पोर्टल खाता बन्द गरिन्छ। विगतका तलब भरपाई र अध्यापन अभिलेख सुरक्षित रहन्छ।
                    </p>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setStatusModalStaff(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  रद्द गर्नुहोस् (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={updateStatusMutation.isPending}
                  className={`rounded-xl px-5 py-2 font-bold text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60 ${
                    statusForm.isReactivating
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : 'bg-amber-700 hover:bg-amber-800'
                  }`}
                >
                  <CheckCircle2 size={15} />
                  <span>
                    {updateStatusMutation.isPending
                      ? 'सुरक्षित हुँदैछ...'
                      : statusForm.isReactivating
                      ? 'पुनः सेवा बहाली गर्नुहोस् (Re-activate)'
                      : 'सरुवा / अवकाश प्रविष्टि गर्नुहोस् (Save Status)'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MULTIPLE BANK ACCOUNTS MANAGEMENT MODAL ───────────────────────── */}
      {isBankAccountsModalOpen && selectedStaffForBanks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800">
                  <Landmark size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1e3a5f]">
                    शिक्षक तथा कर्मचारी बैंक खाता व्यवस्थापन
                  </h3>
                  <p className="text-xs text-gray-500 font-nepali">
                    Multiple Bank Accounts & Primary Salary Disbursement Manager
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsBankAccountsModalOpen(false);
                  setSelectedStaffForBanks(null);
                  setEditingAccount(null);
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Staff Info Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-[#1e3a5f] text-white flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                {selectedStaffForBanks.photoUrl ? (
                  <img src={selectedStaffForBanks.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  selectedStaffForBanks.fullName?.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-gray-900 text-sm truncate">{selectedStaffForBanks.fullName}</h4>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-900">
                    {selectedStaffForBanks.post || 'शिक्षक'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-nepali">
                  {selectedStaffForBanks.fullNameNepali || selectedStaffForBanks.taha || 'नेपाल मावि'}
                </p>
              </div>
            </div>

            {/* Registered Bank Accounts List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Building size={14} className="text-emerald-700" />
                  <span>दर्ता भएका बैंक खाताहरू ({staffBankAccounts.length}):</span>
                </h4>
                {editingAccount && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAccount(null);
                      setBankAccountForm({
                        bankName: '',
                        accountNumber: '',
                        branch: '',
                        accountType: 'SALARY',
                        isPrimary: false,
                        remarks: '',
                      });
                    }}
                    className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    + नयाँ खाता थप्ने फारम
                  </button>
                )}
              </div>

              {isLoadingBankAccounts ? (
                <div className="py-6 text-center text-xs text-gray-400">बैंक खाता विवरण लोड हुँदैछ...</div>
              ) : staffBankAccounts.length === 0 ? (
                <div className="py-6 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-slate-50/50">
                  <Landmark className="mx-auto text-gray-300 mb-1" size={28} />
                  <p className="text-xs font-bold text-gray-600">कुनै बैंक खाता दर्ता भएको छैन</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">तलको फारम भरेर बैंक खाता दर्ता गर्नुहोस्।</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {staffBankAccounts.map((acc: any) => {
                    const typeCfg = BANK_ACCOUNT_TYPES[acc.accountType] || {
                      label: acc.accountType,
                      nepali: acc.accountType,
                      color: 'text-slate-800',
                      bg: 'bg-slate-50',
                      border: 'border-slate-200',
                    };

                    return (
                      <div
                        key={acc.id}
                        className={`p-3 rounded-2xl border transition ${
                          acc.isPrimary
                            ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-gray-900">{acc.bankName}</span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${typeCfg.bg} ${typeCfg.border} ${typeCfg.color}`}
                            >
                              <span>{typeCfg.nepali}</span>
                            </span>
                            {acc.isPrimary && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black shadow-2xs">
                                <Star size={10} className="fill-white" />
                                <span>मुख्य तलब खाता (Primary)</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs font-mono text-gray-600 flex-wrap">
                            <span>
                              खाता नं: <b className="text-blue-950 font-bold">{acc.accountNumber}</b>
                            </span>
                            {acc.branch && <span>• शाखा: {acc.branch}</span>}
                            {acc.remarks && <span className="font-sans text-gray-400">({acc.remarks})</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          {!acc.isPrimary && (
                            <button
                              type="button"
                              onClick={() => setPrimaryBankAccountMutation.mutate(acc.id)}
                              disabled={setPrimaryBankAccountMutation.isPending}
                              className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                              title="Set as Primary Salary Account"
                            >
                              <Star size={12} />
                              <span>मुख्य बनाउनुहोस्</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAccount(acc);
                              setBankAccountForm({
                                bankName: acc.bankName,
                                accountNumber: acc.accountNumber,
                                branch: acc.branch || '',
                                accountType: acc.accountType || 'SALARY',
                                isPrimary: acc.isPrimary || false,
                                remarks: acc.remarks || '',
                              });
                            }}
                            className="p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition cursor-pointer"
                            title="Edit Bank Account"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove account "${acc.accountNumber}" (${acc.bankName})?`)) {
                                deleteBankAccountMutation.mutate(acc.id);
                              }
                            }}
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                            title="Delete Bank Account"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add / Edit Bank Account Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!bankAccountForm.bankName || !bankAccountForm.accountNumber) {
                  toast.error('Bank Name and Account Number are required.');
                  return;
                }
                if (editingAccount) {
                  updateBankAccountMutation.mutate({
                    accountId: editingAccount.id,
                    data: bankAccountForm,
                  });
                } else {
                  addBankAccountMutation.mutate(bankAccountForm);
                }
              }}
              className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="font-extrabold text-[#1e3a5f] flex items-center gap-1.5">
                  <Plus size={14} className="text-emerald-700" />
                  <span>{editingAccount ? 'बैंक खाता विवरण सम्पादन गर्नुहोस् (Edit Bank Account)' : 'नयाँ बैंक खाता थप्नुहोस् (Add New Bank Account)'}</span>
                </span>
                {editingAccount && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAccount(null);
                      setBankAccountForm({
                        bankName: '',
                        accountNumber: '',
                        branch: '',
                        accountType: 'SALARY',
                        isPrimary: false,
                        remarks: '',
                      });
                    }}
                    className="text-xs text-gray-500 font-bold hover:underline cursor-pointer"
                  >
                    रद्द (Cancel Edit)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    बैंकको नाम (Bank Name) *
                  </label>
                  <input
                    type="text"
                    required
                    list="teachers-bank-list"
                    placeholder="उदा: Machhapuchchhre Bank Ltd."
                    value={bankAccountForm.bankName}
                    onChange={(e) => setBankAccountForm({ ...bankAccountForm, bankName: e.target.value })}
                    className="erp-input font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    खाता नम्बर (Account Number) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="उदा: 12345678901234"
                    value={bankAccountForm.accountNumber}
                    onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountNumber: e.target.value })}
                    className="erp-input font-mono font-bold bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    शाखा (Branch)
                  </label>
                  <input
                    type="text"
                    list="teachers-branch-list"
                    placeholder="उदा: Garuda / Gaur Branch"
                    value={bankAccountForm.branch}
                    onChange={(e) => setBankAccountForm({ ...bankAccountForm, branch: e.target.value })}
                    className="erp-input bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    खाता प्रकार (Account Type)
                  </label>
                  <select
                    value={bankAccountForm.accountType}
                    onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountType: e.target.value })}
                    className="erp-input font-bold bg-white text-[#1e3a5f]"
                  >
                    <option value="SALARY">तलब खाता (Primary Salary Account)</option>
                    <option value="SAVINGS">बचत खाता (Personal Savings)</option>
                    <option value="CIT">नागरिक लगानी कोष (CIT Account)</option>
                    <option value="EPF">कर्मचारी सञ्चय कोष (EPF Account)</option>
                    <option value="OTHER">अन्य खाता (Other)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  कैफियत (Remarks / Purpose)
                </label>
                <input
                  type="text"
                  placeholder="उदा: व्यक्तिगत बचत, सरकारी भत्ताको लागि..."
                  value={bankAccountForm.remarks}
                  onChange={(e) => setBankAccountForm({ ...bankAccountForm, remarks: e.target.value })}
                  className="erp-input bg-white"
                />
              </div>

              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <label className="flex items-center gap-2 font-bold text-emerald-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bankAccountForm.isPrimary}
                    onChange={(e) => setBankAccountForm({ ...bankAccountForm, isPrimary: e.target.checked })}
                    className="rounded text-emerald-600 w-4 h-4 cursor-pointer"
                  />
                  <span>यस खातालाई विद्यालयको मुख्य तलब भुक्तानी खाता (Primary Salary Account) बनाउने</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsBankAccountsModalOpen(false);
                    setSelectedStaffForBanks(null);
                    setEditingAccount(null);
                  }}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  बन्द गर्नुहोस् (Close)
                </button>
                <button
                  type="submit"
                  disabled={addBankAccountMutation.isPending || updateBankAccountMutation.isPending}
                  className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 py-2 font-bold text-white shadow-xs transition disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 size={15} />
                  <span>
                    {addBankAccountMutation.isPending || updateBankAccountMutation.isPending
                      ? 'सुरक्षित हुँदैछ...'
                      : editingAccount
                      ? 'परिवर्तन सुरक्षित गर्नुहोस्'
                      : 'नयाँ बैंक खाता दर्ता गर्नुहोस्'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* 7. VIEW TEACHER PROFILE DETAILS MODAL (आँखा / विस्तृत विवरण) */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {viewingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden my-8 border border-gray-100 max-h-[92vh] flex flex-col">
            
            {/* Header Banner */}
            <div className="bg-linear-to-r from-[#1e3a5f] via-[#244570] to-[#142844] text-white p-6 relative shrink-0">
              <button
                type="button"
                onClick={() => setViewingTeacher(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="बन्द गर्नुहोस् (Close)"
              >
                <X size={18} />
              </button>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative">
                  <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-white/15 border-2 border-white/30 backdrop-blur-md overflow-hidden flex items-center justify-center font-black text-2xl text-white shadow-inner">
                    {detailedStaff?.photoUrl ? (
                      <img
                        src={detailedStaff.photoUrl}
                        alt={detailedStaff.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{detailedStaff?.fullName?.slice(0, 2)?.toUpperCase() || 'ST'}</span>
                    )}
                  </div>
                  {detailedStaff?.isActive ? (
                    <span className="absolute -bottom-1 -right-1 bg-emerald-500 border-2 border-white text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white flex items-center gap-0.5 shadow-xs">
                      <CheckCircle2 size={10} />
                      <span>सक्रिय</span>
                    </span>
                  ) : (
                    <span className="absolute -bottom-1 -right-1 bg-amber-500 border-2 border-white text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shadow-xs">
                      विगत / सरुवा
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                      <span>{detailedStaff?.fullName}</span>
                      {detailedStaff?.fullNameNepali && (
                        <span className="text-base sm:text-lg font-normal text-blue-200 font-nepali">
                          ({detailedStaff.fullNameNepali})
                        </span>
                      )}
                    </h2>
                  </div>

                  <p className="text-sm font-semibold text-blue-100 flex items-center gap-2 flex-wrap">
                    <span>{detailedStaff?.post || (detailedStaff?.shreni === 'NON_TEACHING' ? 'कार्यालय सहयोगी' : 'शिक्षक')}</span>
                    {detailedStaff?.taha && (
                      <>
                        <span className="text-blue-300">•</span>
                        <span className="text-amber-200 font-bold">{detailedStaff.taha}</span>
                      </>
                    )}
                  </p>

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold bg-white/15 text-white border border-white/20">
                      {detailedStaff?.shreni === 'NON_TEACHING' ? (
                        <>
                          <Briefcase size={12} />
                          <span>गैर-शैक्षिक कर्मचारी (Non-Teaching)</span>
                        </>
                      ) : (
                        <>
                          <GraduationCap size={12} />
                          <span>शिक्षक (Teaching Staff)</span>
                        </>
                      )}
                    </span>

                    {(() => {
                      const typeInfo = getStaffTypeInfo(detailedStaff?.type, masterTeacherTypes);
                      return (
                        <span className="inline-block rounded-md px-2 py-0.5 text-xs font-bold bg-white/15 text-white border border-white/20">
                          {typeInfo.icon} {typeInfo.displayText}
                        </span>
                      );
                    })()}

                    {detailedStaff?.gender && (
                      <span className="inline-block rounded-md px-2 py-0.5 text-xs font-bold bg-white/15 text-white border border-white/20">
                        {detailedStaff.gender === 'MALE' ? 'पुरुष' : detailedStaff.gender === 'FEMALE' ? 'महिला' : detailedStaff.gender}
                      </span>
                    )}

                    {detailedStaff?.bloodGroup && (
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-extrabold bg-rose-500/20 text-rose-200 border border-rose-400/30">
                        🩸 {detailedStaff.bloodGroup}
                      </span>
                    )}
                  </div>
                </div>

                {/* Top Quick Actions */}
                <div className="flex items-center gap-2 self-start sm:self-center mt-2 sm:mt-0">
                  <button
                    type="button"
                    onClick={() => {
                      const staffToEdit = detailedStaff;
                      setViewingTeacher(null);
                      openEditModal(staffToEdit);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/30 backdrop-blur-md transition cursor-pointer"
                  >
                    <Edit2 size={13} />
                    <span>सम्पादन (Edit)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const staffForBanks = detailedStaff;
                      setViewingTeacher(null);
                      openBankAccountsModal(staffForBanks);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-bold border border-emerald-400/40 backdrop-blur-md transition cursor-pointer"
                  >
                    <Landmark size={13} />
                    <span>बैंक खाता (Banks)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 px-6 border-b border-gray-200 bg-gray-50/70 overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setViewDetailsTab('overview')}
                className={`flex items-center gap-1.5 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  viewDetailsTab === 'overview'
                    ? 'border-[#1e3a5f] text-[#1e3a5f] bg-white rounded-t-lg'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <User size={15} />
                <span>व्यक्तिगत तथा सेवा विवरण (Overview)</span>
              </button>

              <button
                type="button"
                onClick={() => setViewDetailsTab('financial')}
                className={`flex items-center gap-1.5 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  viewDetailsTab === 'financial'
                    ? 'border-[#1e3a5f] text-[#1e3a5f] bg-white rounded-t-lg'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Landmark size={15} />
                <span>आर्थिक तथा बैंक खाता (Financial & Banks)</span>
                {(detailedStaff?.bankAccounts?.length > 0 || detailedStaff?.bankAccountNo) && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold">
                    {detailedStaff?.bankAccounts?.length || 1}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setViewDetailsTab('academic')}
                className={`flex items-center gap-1.5 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  viewDetailsTab === 'academic'
                    ? 'border-[#1e3a5f] text-[#1e3a5f] bg-white rounded-t-lg'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Award size={15} />
                <span>विशेष जिम्मेवारी तथा विषय (Roles)</span>
              </button>

              <button
                type="button"
                onClick={() => setViewDetailsTab('tasks')}
                className={`flex items-center gap-1.5 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  viewDetailsTab === 'tasks'
                    ? 'border-[#1e3a5f] text-[#1e3a5f] bg-white rounded-t-lg'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <ClipboardList size={15} />
                <span>तोकिएका कार्यहरू (Tasks & Progress)</span>
              </button>
            </div>

            {/* Tab Body Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">

              {/* ═════════ TAB 1: OVERVIEW ═════════ */}
              {viewDetailsTab === 'overview' && (
                <div className="space-y-6">
                  {/* Personal & Contact Grid */}
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                      <User size={14} className="text-[#1e3a5f]" />
                      <span>सम्पर्क तथा व्यक्तिगत जानकारी (Personal & Contact)</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-[11px] font-bold text-gray-500 block">सम्पर्क फोन (Phone Number)</span>
                        {detailedStaff?.phone ? (
                          <div className="flex items-center justify-between">
                            <a
                              href={`tel:${detailedStaff.phone}`}
                              className="font-mono text-sm font-bold text-blue-700 hover:underline flex items-center gap-1.5"
                            >
                              <Phone size={14} className="text-blue-500" />
                              <span>{detailedStaff.phone}</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(detailedStaff.phone);
                                toast.success('Phone copied!');
                              }}
                              className="text-gray-400 hover:text-gray-600 p-1"
                              title="Copy Phone"
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">उल्लेख नभएको</span>
                        )}
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-[11px] font-bold text-gray-500 block">ईमेल (Email Address)</span>
                        {detailedStaff?.email ? (
                          <a
                            href={`mailto:${detailedStaff.email}`}
                            className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1.5 truncate"
                          >
                            <Mail size={14} className="text-blue-500 shrink-0" />
                            <span className="truncate">{detailedStaff.email}</span>
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400 italic">उल्लेख नभएको</span>
                        )}
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-[11px] font-bold text-gray-500 block">ठेगाना (Permanent / Current Address)</span>
                        <p className="text-xs font-bold text-gray-800">
                          {detailedStaff?.address || <span className="text-gray-400 font-normal italic">उल्लेख नभएको</span>}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-[11px] font-bold text-gray-500 block">जन्म मिति वि.सं. (Date of Birth BS)</span>
                        <p className="font-mono text-xs font-bold text-gray-800">
                          {detailedStaff?.dateOfBirthBs ? `📅 ${detailedStaff.dateOfBirthBs}` : <span className="text-gray-400 font-normal italic">उल्लेख नभएको</span>}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-[11px] font-bold text-gray-500 block">नागरिकता नम्बर (Citizenship No)</span>
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-xs font-bold text-gray-800">
                            {detailedStaff?.citizenshipNo || <span className="text-gray-400 font-normal italic">उल्लेख नभएको</span>}
                          </p>
                          {detailedStaff?.citizenshipNo && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(detailedStaff.citizenshipNo);
                                toast.success('Citizenship No copied!');
                              }}
                              className="text-gray-400 hover:text-gray-600 p-1"
                              title="Copy"
                            >
                              <Copy size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-[11px] font-bold text-gray-500 block">रक्त समूह (Blood Group)</span>
                        <p className="text-xs font-bold text-rose-700">
                          {detailedStaff?.bloodGroup ? `🩸 ${detailedStaff.bloodGroup}` : <span className="text-gray-400 font-normal italic">उल्लेख नभएको</span>}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Appointment & Service History */}
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                      <Briefcase size={14} className="text-[#1e3a5f]" />
                      <span>सेवा तथा नियुक्ति विवरण (Service & Appointment Information)</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-[11px] font-bold text-gray-500 block">पद तथा श्रेणी (Designation & Post)</span>
                        <p className="text-xs font-black text-gray-900">
                          {detailedStaff?.post || (detailedStaff?.shreni === 'NON_TEACHING' ? 'कार्यालय सहयोगी' : 'शिक्षक')}
                        </p>
                        {detailedStaff?.taha && (
                          <span className="inline-block text-[10.5px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {detailedStaff.taha}
                          </span>
                        )}
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-[11px] font-bold text-gray-500 block">विद्यालयमा हाजिर मिति (Date of Joining BS)</span>
                        <p className="font-mono text-xs font-bold text-emerald-800">
                          {detailedStaff?.dateOfJoiningBs ? `🗓️ ${detailedStaff.dateOfJoiningBs}` : <span className="text-gray-400 font-normal italic">उल्लेख नभएको</span>}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-[11px] font-bold text-gray-500 block">वर्तमान अवस्था (Active Status)</span>
                        {detailedStaff?.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <CheckCircle2 size={13} />
                            <span>हाल कार्यरत (Active Staff)</span>
                          </span>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                              <AlertCircle size={13} />
                              <span>विगत / सरुवा / अवकाश</span>
                            </span>
                            {detailedStaff?.dateOfRetirementBs && (
                              <p className="text-[11px] text-amber-900 font-mono font-bold">
                                मिति: {detailedStaff.dateOfRetirementBs}
                              </p>
                            )}
                            {detailedStaff?.statusReason && (
                              <p className="text-[10.5px] text-gray-600 italic">
                                कारण: {detailedStaff.statusReason}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═════════ TAB 2: FINANCIAL & BANKS ═════════ */}
              {viewDetailsTab === 'financial' && (
                <div className="space-y-6">
                  {/* Statutory Numbers Grid */}
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                      <CreditCard size={14} className="text-[#1e3a5f]" />
                      <span>सांविधिक पहिचान नम्बरहरू (Statutory IDs)</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-linear-to-br from-slate-50 to-indigo-50/40 border border-indigo-100 space-y-1.5">
                        <span className="text-[11px] font-bold text-gray-500 block">स्थायी लेखा नम्बर (PAN No.)</span>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-black text-gray-900 tracking-wider">
                            {detailedStaff?.panNo || <span className="text-gray-400 font-normal italic text-xs">दर्ता नभएको</span>}
                          </span>
                          {detailedStaff?.panNo && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(detailedStaff.panNo);
                                toast.success('PAN No copied!');
                              }}
                              className="text-indigo-600 hover:text-indigo-800 p-1"
                              title="Copy PAN"
                            >
                              <Copy size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-linear-to-br from-slate-50 to-purple-50/40 border border-purple-100 space-y-1.5">
                        <span className="text-[11px] font-bold text-gray-500 block">कर्मचारी सञ्चय कोष नं (EPF No.)</span>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-black text-gray-900 tracking-wider">
                            {detailedStaff?.sanchayaKoshNo || <span className="text-gray-400 font-normal italic text-xs">दर्ता नभएको</span>}
                          </span>
                          {detailedStaff?.sanchayaKoshNo && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(detailedStaff.sanchayaKoshNo);
                                toast.success('EPF No copied!');
                              }}
                              className="text-purple-600 hover:text-purple-800 p-1"
                              title="Copy EPF"
                            >
                              <Copy size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-linear-to-br from-slate-50 to-blue-50/40 border border-blue-100 space-y-1.5">
                        <span className="text-[11px] font-bold text-gray-500 block">नागरिक लगानी कोष नं (CIT No.)</span>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-black text-gray-900 tracking-wider">
                            {detailedStaff?.nagarikLaganiKoshNo || <span className="text-gray-400 font-normal italic text-xs">दर्ता नभएको</span>}
                          </span>
                          {detailedStaff?.nagarikLaganiKoshNo && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(detailedStaff.nagarikLaganiKoshNo);
                                toast.success('CIT No copied!');
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Copy CIT"
                            >
                              <Copy size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Registered Bank Accounts Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                        <Landmark size={14} className="text-emerald-700" />
                        <span>दर्ता गरिएका बैंक खाताहरू (Registered Bank Accounts)</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          const staffForBanks = detailedStaff;
                          setViewingTeacher(null);
                          openBankAccountsModal(staffForBanks);
                        }}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <Plus size={13} />
                        <span>नयाँ खाता थप्नुहोस् / व्यवस्थापन</span>
                      </button>
                    </div>

                    {detailedStaff?.bankAccounts && detailedStaff.bankAccounts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {detailedStaff.bankAccounts.map((acc: any) => {
                          const typeInfo = BANK_ACCOUNT_TYPES[acc.accountType] || BANK_ACCOUNT_TYPES.SALARY;
                          return (
                            <div
                              key={acc.id}
                              className={`p-4 rounded-2xl border transition relative ${
                                acc.isPrimary
                                  ? 'bg-linear-to-br from-emerald-50/60 to-emerald-100/30 border-emerald-300 shadow-xs'
                                  : 'bg-white border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                                      <Landmark size={15} className="text-emerald-700" />
                                      <span>{acc.bankName}</span>
                                    </h4>
                                    {acc.isPrimary && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white shadow-2xs">
                                        <Star size={10} className="fill-amber-300 text-amber-300" />
                                        <span>मुख्य तलब खाता (Primary)</span>
                                      </span>
                                    )}
                                  </div>
                                  {acc.branch && (
                                    <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
                                      शाखा (Branch): {acc.branch}
                                    </p>
                                  )}
                                </div>

                                <span
                                  className={`inline-block px-2 py-0.5 rounded-lg border text-[10px] font-bold ${typeInfo.bg} ${typeInfo.border} ${typeInfo.color}`}
                                >
                                  {typeInfo.nepali}
                                </span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-gray-50/80 border border-gray-200/80 flex items-center justify-between mt-3">
                                <div>
                                  <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider block">
                                    खाता नम्बर (A/C No)
                                  </span>
                                  <span className="font-mono text-sm font-black text-gray-900 tracking-wider">
                                    {acc.accountNumber}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(acc.accountNumber);
                                    toast.success('Account number copied!');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                  title="Copy Account Number"
                                >
                                  <Copy size={12} />
                                  <span>Copy</span>
                                </button>
                              </div>

                              {acc.remarks && (
                                <p className="text-[11px] text-gray-500 italic mt-2">
                                  कैफियत: {acc.remarks}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : detailedStaff?.bankAccountNo ? (
                      /* Fallback legacy single bank account if not yet migrated to array */
                      <div className="p-4 rounded-2xl bg-linear-to-br from-emerald-50/60 to-emerald-100/30 border border-emerald-300 shadow-xs">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                              <Landmark size={15} className="text-emerald-700" />
                              <span>{detailedStaff.bankName || 'Bank Account'}</span>
                            </h4>
                            {detailedStaff.bankBranch && (
                              <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
                                शाखा (Branch): {detailedStaff.bankBranch}
                              </p>
                            )}
                          </div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white shadow-2xs">
                            <Star size={10} className="fill-amber-300 text-amber-300" />
                            <span>मुख्य तलब खाता (Primary)</span>
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between mt-3">
                          <div>
                            <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider block">
                              खाता नम्बर (A/C No)
                            </span>
                            <span className="font-mono text-sm font-black text-gray-900 tracking-wider">
                              {detailedStaff.bankAccountNo}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(detailedStaff.bankAccountNo);
                              toast.success('Account number copied!');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                            title="Copy Account Number"
                          >
                            <Copy size={12} />
                            <span>Copy</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                        <Landmark size={28} className="mx-auto text-gray-400 mb-2" />
                        <p className="text-xs font-bold text-gray-600">कुनै बैंक खाता प्रविष्टि भएको छैन</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          तलब तथा अन्य भत्ता भुक्तानीको लागि नयाँ बैंक खाता थप्न सक्नुहुन्छ।
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const staffForBanks = detailedStaff;
                            setViewingTeacher(null);
                            openBankAccountsModal(staffForBanks);
                          }}
                          className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>बैंक खाता दर्ता गर्नुहोस्</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Salary Advance (पेस्की तथा सापटी) Liability Reflection */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                        <Wallet size={14} className="text-purple-700" />
                        <span>पेस्की तथा सापटी दायित्व विवरण (Salary Advance & Liability)</span>
                      </h3>
                      <a
                        href="/dashboard/finance/payroll"
                        className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1 rounded-lg transition flex items-center gap-1"
                      >
                        <Wallet size={13} />
                        <span>पेस्की व्यवस्थापन (Peshki Manager)</span>
                      </a>
                    </div>

                    {/* Quick Advance Stats for this Teacher */}
                    {(() => {
                      const staffPeshkis = detailedStaff?.peshkis || [];
                      const totalAdv = staffPeshkis.reduce((s: number, p: any) => s + (p.amount || 0), 0);
                      const totalRem = staffPeshkis.reduce((s: number, p: any) => s + (p.status !== 'CANCELLED' ? (p.remainingAmount || 0) : 0), 0);
                      const totalSet = Math.max(0, totalAdv - totalRem);

                      if (staffPeshkis.length === 0) {
                        return (
                          <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-gray-200">
                            <Wallet size={24} className="mx-auto text-gray-300 mb-1.5" />
                            <p className="text-xs font-bold text-gray-600">कुनै पेस्की वा सापटी बाँकी छैन</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">यस शिक्षकको नाममा हाल कुनै पनि पेस्की दायित्व सक्रिय छैन।</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {/* Mini KPI Cards */}
                          <div className="grid grid-cols-3 gap-2.5">
                            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-center">
                              <span className="text-[10px] font-bold text-blue-900 uppercase block">कुल पेस्की लिएको</span>
                              <span className="text-sm font-black font-mono text-[#1e3a5f]">रू {totalAdv.toLocaleString()}</span>
                            </div>
                            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
                              <span className="text-[10px] font-bold text-emerald-900 uppercase block">तलबबाट कट्टी भएको</span>
                              <span className="text-sm font-black font-mono text-emerald-800">रू {totalSet.toLocaleString()}</span>
                            </div>
                            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-center">
                              <span className="text-[10px] font-bold text-rose-900 uppercase block">बाँकी पेस्की दायित्व</span>
                              <span className="text-sm font-black font-mono text-rose-900">रू {totalRem.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Advances List */}
                          <div className="space-y-2">
                            {staffPeshkis.map((p: any) => {
                              const advGiven = p.amount || 0;
                              const advRem = p.remainingAmount || 0;
                              const advSet = Math.max(0, advGiven - advRem);
                              const pct = advGiven > 0 ? Math.min(100, Math.round((advSet / advGiven) * 100)) : 0;

                              return (
                                <div key={p.id} className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-xs text-gray-900">
                                        #{p.id} - {p.reason || 'तलब पेस्की'}
                                      </span>
                                      {p.financialYear?.year && (
                                        <span className="text-[10px] font-semibold bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-100">
                                          आ.व. {p.financialYear.year}
                                        </span>
                                      )}
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                      p.status === 'ACTIVE' && advRem > 0
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                    }`}>
                                      {p.status === 'ACTIVE' && advRem > 0 ? 'सक्रिय / बाँकी' : 'पूर्ण फर्छ्यौट'}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-gray-600 bg-slate-50 p-2 rounded-lg">
                                    <div>
                                      <span className="text-gray-400 block font-sans text-[9.5px]">स्वीकृत रकम:</span>
                                      <strong className="text-blue-950 font-bold">रू {advGiven.toLocaleString()}</strong>
                                    </div>
                                    <div>
                                      <span className="text-gray-400 block font-sans text-[9.5px]">हाल बाँकी:</span>
                                      <strong className="text-rose-800 font-bold">रू {advRem.toLocaleString()}</strong>
                                    </div>
                                    <div>
                                      <span className="text-gray-400 block font-sans text-[9.5px]">जारी मिति:</span>
                                      <span>{p.givenDateBs || '—'}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-400 block font-sans text-[9.5px]">कट्टी अवधि:</span>
                                      <span className="truncate">{p.deductFromMonth || '—'} सम्म</span>
                                    </div>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* ═════════ TAB 3: ACADEMIC & ROLES ═════════ */}
              {viewDetailsTab === 'academic' && (
                <div className="space-y-6">
                  {/* Special Incharge Roles */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                        <Award size={14} className="text-purple-700" />
                        <span>विशेष जिम्मेवारीहरू (Special Incharge Roles)</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          const staffForRole = detailedStaff;
                          setViewingTeacher(null);
                          openAssignRoleModal(staffForRole);
                        }}
                        className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <Award size={13} />
                        <span>जिम्मेवारी तोक्नुहोस् / सम्पादन</span>
                      </button>
                    </div>

                    {detailedStaff?.inchargeRole ? (
                      <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {detailedStaff.inchargeRole
                            .split(',')
                            .map((r: string) => r.trim())
                            .filter(Boolean)
                            .map((roleKey: string) => {
                              const info = INCHARGE_ROLES_CONFIG[roleKey] || {
                                label: roleKey,
                                nepali: roleKey,
                                color: 'text-purple-800',
                                bg: 'bg-purple-50',
                                border: 'border-purple-200',
                              };
                              return (
                                <span
                                  key={roleKey}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-black ${info.bg} ${info.border} ${info.color} shadow-2xs`}
                                >
                                  <Award size={13} />
                                  <span>{info.nepali} ({info.label})</span>
                                </span>
                              );
                            })}
                        </div>
                        {detailedStaff.inchargeTitle && (
                          <div className="p-3 bg-white rounded-xl border border-purple-100 text-xs font-bold text-purple-950">
                            📌 {detailedStaff.inchargeTitle}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-6 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                        <Award size={24} className="mx-auto text-gray-400 mb-1.5" />
                        <p className="text-xs font-bold text-gray-600">कुनै विशेष जिम्मेवारी तोकिएको छैन</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          परीक्षा प्रमुख, पुस्तकालय प्रमुख, लेखापाल, अनुशासन प्रमुख आदि जिम्मेवारी तोक्न सक्नुहुन्छ।
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Assigned Subjects */}
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                      <BookOpen size={14} className="text-blue-700" />
                      <span>अध्यापन गराउने विषयहरू (Assigned Subjects)</span>
                    </h3>
                    {detailedStaff?.subjects && detailedStaff.subjects.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {detailedStaff.subjects.map((sub: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-blue-50/50 border border-blue-200 flex items-center gap-2.5"
                          >
                            <BookOpen size={16} className="text-blue-700 shrink-0" />
                            <div>
                              <p className="text-xs font-extrabold text-blue-950">
                                {sub.subject?.name || sub.name || `Subject #${sub.subjectId || idx + 1}`}
                              </p>
                              {sub.subject?.code && (
                                <p className="text-[10px] font-mono font-bold text-blue-600">
                                  Code: {sub.subject.code}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                        <BookOpen size={24} className="mx-auto text-gray-400 mb-1.5" />
                        <p className="text-xs font-bold text-gray-600">कुनै विषय तोकिएको छैन</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          शिक्षक सम्पादन फाराम वा कक्षा व्यवस्थापनबाट विषयहरू जोड्न सक्नुहुन्छ।
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═════════ TAB 4: TASKS & DUTIES ═════════ */}
              {viewDetailsTab === 'tasks' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                      <ClipboardList size={14} className="text-[#1e3a5f]" />
                      <span>तोकिएका कार्य तथा प्रगति (Assigned Tasks)</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        const sId = detailedStaff?.id;
                        setViewingTeacher(null);
                        openTaskModal(undefined, sId);
                      }}
                      className="text-xs font-bold text-[#1e3a5f] hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={13} />
                      <span>नयाँ कार्य तोक्नुहोस् (+ Assign Task)</span>
                    </button>
                  </div>

                  {(() => {
                    const staffAssignedTasks = (tasksData || []).filter(
                      (t: any) => t.teacherId === detailedStaff?.id
                    );
                    const doneCount = staffAssignedTasks.filter(
                      (t: any) => t.status === 'COMPLETED'
                    ).length;

                    if (staffAssignedTasks.length === 0) {
                      return (
                        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                          <ClipboardList size={28} className="mx-auto text-gray-400 mb-2" />
                          <p className="text-xs font-bold text-gray-600">यस कर्मचारीलाई कुनै कार्य तोकिएको छैन</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            परीक्षा, बैठक, खेलकुद वा प्रशासन सम्बन्धी जिम्मेवारी दिन माथिको बटन प्रयोग गर्नुहोस्।
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-center justify-between text-xs font-bold text-indigo-950">
                          <span>कार्य प्रगति: {doneCount} / {staffAssignedTasks.length} सम्पन्न (Completed)</span>
                          <div className="w-32 bg-indigo-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{
                                width: `${(doneCount / staffAssignedTasks.length) * 100}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          {staffAssignedTasks.map((t: any) => {
                            const isDone = t.status === 'COMPLETED';
                            return (
                              <div
                                key={t.id}
                                className={`p-3.5 rounded-xl border transition flex items-start justify-between gap-3 ${
                                  isDone
                                    ? 'bg-gray-50/80 border-gray-200 opacity-80'
                                    : 'bg-white border-gray-200 shadow-2xs'
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className={`text-xs font-black ${isDone ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                      {t.title}
                                    </h4>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                                        t.priority === 'HIGH'
                                          ? 'bg-rose-100 text-rose-800'
                                          : t.priority === 'MEDIUM'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {t.priority}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                      {t.category}
                                    </span>
                                  </div>
                                  {t.description && (
                                    <p className="text-[11px] text-gray-600">{t.description}</p>
                                  )}
                                  {t.dueDateBs && (
                                    <p className="text-[10px] text-gray-400 font-mono">
                                      📅 म्याद (Due Date): {t.dueDateBs}
                                    </p>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    updateTaskStatusMutation.mutate({
                                      id: t.id,
                                      status: isDone ? 'PENDING' : 'COMPLETED',
                                    })
                                  }
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0 ${
                                    isDone
                                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                      : 'bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                                  }`}
                                >
                                  {isDone ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                                  <span>{isDone ? 'सम्पन्न (Done)' : 'बाँकी (Mark Done)'}</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-gray-400 font-mono">
                Staff ID: #{detailedStaff?.id} • नेपाल मावि ERP
              </span>
              <button
                type="button"
                onClick={() => setViewingTeacher(null)}
                className="rounded-xl border border-gray-300 bg-white hover:bg-gray-100 px-5 py-1.5 text-xs font-bold text-gray-700 shadow-2xs transition cursor-pointer"
              >
                बन्द गर्नुहोस् (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Display Order Manager Modal */}
      <DisplayOrderManagerModal
        isOpen={isReorderModalOpen}
        onClose={() => setIsReorderModalOpen(false)}
        staffList={allTeachers}
      />

      {/* Central Bank Directory Datalists (Auto-Fetch Suggestions for All Inputs) */}
      <datalist id="teachers-bank-list">
        {allKnownBanks.map((b: string) => (
          <option key={b} value={b} />
        ))}
      </datalist>
      <datalist id="teachers-branch-list">
        {allKnownBranches.map((br: string) => (
          <option key={br} value={br} />
        ))}
      </datalist>
    </div>
  );
}
