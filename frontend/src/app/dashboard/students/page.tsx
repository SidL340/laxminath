'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  Users,
  Plus,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Eye,
  Trash2,
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  Building,
  School,
  KeyRound,
  Sparkles,
  ArrowRightLeft,
  GraduationCap,
  PieChart,
  Cake,
  FileCheck,
  UserCheck,
  RotateCcw,
  BookOpen,
  TrendingUp,
  Award,
  Languages,
  HeartHandshake,
  BarChart3,
  RefreshCw,
  Pencil,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth-store';
import StudentPhotoUploadModal from '@/components/StudentPhotoUploadModal';

export default function StudentsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  // Tabs
  const [activeTab, setActiveTab] = useState<'directory' | 'admission' | 'upgrade' | 'transferred' | 'analytics'>('directory');
  const [analyticsViewMode, setAnalyticsViewMode] = useState<'chart' | 'table'>('chart');

  // Filters (IEMIS Standard Filter Bar: Year, Class, Section, Search)
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [search, setSearch] = useState('');
  const [forceLoadAll, setForceLoadAll] = useState(false);
  const [batchYearFilter, setBatchYearFilter] = useState('');
  const [analyticsYear, setAnalyticsYear] = useState('');

  // ── UPGRADE & PROMOTION PORTAL STATE ────────────────────────────────────
  const [promoteFromYear, setPromoteFromYear] = useState('');
  const [promoteFromClass, setPromoteFromClass] = useState('');
  const [promoteToYear, setPromoteToYear] = useState('');
  const [promoteToClass, setPromoteToClass] = useState('');
  const [studentPromoteState, setStudentPromoteState] = useState<{
    [id: number]: {
      action: 'PROMOTE' | 'REPEAT' | 'GRADUATE' | 'TRANSFER';
      targetClassId?: string;
      rollNo?: number | string;
      selected: boolean;
    };
  }>({});
  const [selectAllPromote, setSelectAllPromote] = useState(true);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importClassId, setImportClassId] = useState('');
  const [importAcademicYearId, setImportAcademicYearId] = useState('');
  const [treatNoEmisAsTransferred, setTreatNoEmisAsTransferred] = useState(true);
  const [isCreatingNewYear, setIsCreatingNewYear] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  // Resequence Roll Numbers Modal State
  const [isRollModalOpen, setIsRollModalOpen] = useState(false);
  const [rollTargetClassId, setRollTargetClassId] = useState('');
  const [rollSortBy, setRollSortBy] = useState('ALPHABETICAL');

  // Transfer Modal
  const [transferModalStudent, setTransferModalStudent] = useState<any>(null);
  const [transferForm, setTransferForm] = useState({
    transferSchoolName: '',
    transferEmisCode: '',
    transferAddress: '',
    transferDateBs: todayBS(),
    transferReason: 'Guardian relocation / higher studies',
    tcNumber: '',
  });

  // Password Reset Modal
  const [resetModalStudent, setResetModalStudent] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');

  // Photo Upload Modal State for Active Directory & Direct Update
  const [photoModalStudent, setPhotoModalStudent] = useState<{ id: number; name: string; photoUrl?: string | null } | null>(null);

  // Admission Camera & File Upload State
  const admissionFileInputRef = React.useRef<HTMLInputElement>(null);
  const admissionVideoRef = React.useRef<HTMLVideoElement>(null);
  const admissionStreamRef = React.useRef<MediaStream | null>(null);
  const [isAdmissionCameraOpen, setIsAdmissionCameraOpen] = useState(false);
  const [admissionPhotoSizeKb, setAdmissionPhotoSizeKb] = useState<number | null>(null);

  // Edit Modal Camera & File Upload State
  const editFileInputRef = React.useRef<HTMLInputElement>(null);
  const editVideoRef = React.useRef<HTMLVideoElement>(null);
  const editStreamRef = React.useRef<MediaStream | null>(null);
  const [isEditCameraOpen, setIsEditCameraOpen] = useState(false);
  const [editPhotoSizeKb, setEditPhotoSizeKb] = useState<number | null>(null);

  // Smart Client-Side Image Compressor ensuring <= 50 KB (Passport ratio 320x380)
  const compressImageTo50Kb = (img: HTMLImageElement): Promise<{ dataUrl: string; sizeKb: number }> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const targetWidth = 320;
      const targetHeight = 380;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve({ dataUrl: img.src, sizeKb: 50 });

      // Crop & center the portrait
      const sourceAspect = img.width / img.height;
      const targetAspect = targetWidth / targetHeight;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;

      if (sourceAspect > targetAspect) {
        sw = img.height * targetAspect;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / targetAspect;
        sy = (img.height - sh) / 2;
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

      // Iteratively compress to guarantee strictly <= 50 KB
      let quality = 0.85;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      let sizeInBytes = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 0.75);
      let sizeInKb = +(sizeInBytes / 1024).toFixed(1);

      while (sizeInKb > 48 && quality > 0.2) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        sizeInBytes = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 0.75);
        sizeInKb = +(sizeInBytes / 1024).toFixed(1);
      }

      resolve({ dataUrl, sizeKb: sizeInKb });
    });
  };

  // Admission Photo Handlers
  const handleAdmissionPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('कृपया मान्य फोटो फाइल (JPG, PNG, WEBP) छनोट गर्नुहोस्।');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const { dataUrl, sizeKb } = await compressImageTo50Kb(img);
        setAdmissionForm((prev) => ({ ...prev, photoUrl: dataUrl }));
        setAdmissionPhotoSizeKb(sizeKb);
        toast.success(`फोटो लोड भयो र स्वचालित ${sizeKb} KB (≤ 50KB) मा कम्प्रेस भयो!`);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const startAdmissionCamera = async () => {
    try {
      setIsAdmissionCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' },
        audio: false,
      });
      admissionStreamRef.current = stream;
      if (admissionVideoRef.current) {
        admissionVideoRef.current.srcObject = stream;
        admissionVideoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      toast.error('क्यामेरा सुरु गर्न सकिएन। कृपया क्यामेरा अनुमति जाँच गर्नुहोस् वा फाइल अपलोड गर्नुहोस्।');
      setIsAdmissionCameraOpen(false);
    }
  };

  const stopAdmissionCamera = () => {
    if (admissionStreamRef.current) {
      admissionStreamRef.current.getTracks().forEach((t) => t.stop());
      admissionStreamRef.current = null;
    }
    setIsAdmissionCameraOpen(false);
  };

  const captureAdmissionPhoto = () => {
    if (!admissionVideoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = admissionVideoRef.current.videoWidth || 640;
    canvas.height = admissionVideoRef.current.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(admissionVideoRef.current, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const img = new Image();
    img.onload = async () => {
      const { dataUrl, sizeKb } = await compressImageTo50Kb(img);
      setAdmissionForm((prev) => ({ ...prev, photoUrl: dataUrl }));
      setAdmissionPhotoSizeKb(sizeKb);
      stopAdmissionCamera();
      toast.success(`क्यामेराबाट फोटो खिचियो र स्वचालित ${sizeKb} KB मा सुरक्षित गरियो!`);
    };
    img.src = rawDataUrl;
  };

  // Edit Photo Handlers
  const handleEditPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('कृपया मान्य फोटो फाइल छनोट गर्नुहोस्।');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const { dataUrl, sizeKb } = await compressImageTo50Kb(img);
        setEditForm((prev: any) => ({ ...prev, photoUrl: dataUrl }));
        setEditPhotoSizeKb(sizeKb);
        toast.success(`फोटो स्वचालित ${sizeKb} KB मा कम्प्रेस भयो!`);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const startEditCamera = async () => {
    try {
      setIsEditCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' },
        audio: false,
      });
      editStreamRef.current = stream;
      if (editVideoRef.current) {
        editVideoRef.current.srcObject = stream;
        editVideoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      toast.error('क्यामेरा सुरु गर्न सकिएन।');
      setIsEditCameraOpen(false);
    }
  };

  const stopEditCamera = () => {
    if (editStreamRef.current) {
      editStreamRef.current.getTracks().forEach((t) => t.stop());
      editStreamRef.current = null;
    }
    setIsEditCameraOpen(false);
  };

  const captureEditPhoto = () => {
    if (!editVideoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = editVideoRef.current.videoWidth || 640;
    canvas.height = editVideoRef.current.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(editVideoRef.current, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const img = new Image();
    img.onload = async () => {
      const { dataUrl, sizeKb } = await compressImageTo50Kb(img);
      setEditForm((prev: any) => ({ ...prev, photoUrl: dataUrl }));
      setEditPhotoSizeKb(sizeKb);
      stopEditCamera();
      toast.success(`फोटो क्यामेराबाट खिचियो (${sizeKb} KB)!`);
    };
    img.src = rawDataUrl;
  };

  // Edit Student Modal State
  const [editModalStudent, setEditModalStudent] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({
    fullName: '',
    fullNameNepali: '',
    emisId: '',
    studentId: '',
    gender: 'Male',
    dateOfBirthBs: '',
    dateOfBirthAd: '',
    classId: '',
    rollNo: '',
    admissionDateBs: '',
    fatherName: '',
    motherName: '',
    guardianName: '',
    guardianContact: '',
    guardianRelation: '',
    address: '',
    bloodGroup: '',
    religion: '',
    ethnicity: '',
    disability: '',
    previousSchool: '',
    status: 'ACTIVE',
    isActive: true,
    batchYear: '',
    username: '',
    photoUrl: '',
  });

  // Delete Student Modal State
  const [deleteModalStudent, setDeleteModalStudent] = useState<any>(null);
  const [deletePermanent, setDeletePermanent] = useState<boolean>(false);

  // Admission Form State
  const [admissionForm, setAdmissionForm] = useState({
    fullName: '',
    fullNameNepali: '',
    emisId: '',
    gender: 'Male',
    dateOfBirthBs: '',
    classId: '',
    rollNo: '',
    admissionDateBs: todayBS(),
    fatherName: '',
    motherName: '',
    guardianName: '',
    guardianContact: '',
    parentCitizenshipNo: '',
    address: '',
    ethnicity: '',
    prevSchoolName: '',
    prevEmisCode: '',
    photoUrl: '',
    // Class 11 & 12 Specialized Fields
    facultyStream: 'Science',
    shift: 'Morning',
    seeGpa: '',
    seeSymbolNo: '',
    seeRegNo: '',
    electiveSubjects: [] as string[],
  });

  const [collectedDocs, setCollectedDocs] = useState<{ [key: string]: boolean }>({
    birthCertificate: false,
    transferCertificate: false,
    marksheet: false,
    photos: false,
    citizenshipCopy: false,
    seeMarksheet: false,
    seeCharacterCert: false,
    migrationCert: false,
  });

  // Fetch classes
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // Fetch Academic Years
  const { data: academicYearsData } = useQuery({
    queryKey: ['academic-years-all'],
    queryFn: async () => {
      const res = await api.get('/classes/academic-years/all');
      return res.data?.data || [];
    },
  });

  // Auto-select the Active Academic Year by default
  useEffect(() => {
    if (!selectedYear && academicYearsData && academicYearsData.length > 0) {
      const activeYear = academicYearsData.find((y: any) => y.isActive) || academicYearsData[0];
      if (activeYear) {
        setSelectedYear(String(activeYear.id));
      }
    }
  }, [academicYearsData, selectedYear]);

  // Check if selected admission class is Class 11 or 12
  const isClass11or12 = React.useMemo(() => {
    if (!admissionForm.classId || !classesData) return false;
    const cls = classesData.find((c: any) => String(c.id) === String(admissionForm.classId));
    if (!cls) return false;
    const name = (cls.name || '').toLowerCase();
    return name.includes('11') || name.includes('12') || name.includes('xi') || name.includes('xii') || name.includes('११') || name.includes('१२');
  }, [admissionForm.classId, classesData]);

  // Determine if on-demand filter or search is active
  // NOTE: Choosing only the year will NOT directly dump all students.
  // The user must select a Class, type a search keyword, or explicitly click "Load All".
  const isFilterActive = Boolean(
    (selectedClass && selectedClass !== '') ||
    (selectedSection && selectedSection !== 'all') ||
    search.trim().length >= 1 ||
    forceLoadAll
  );

  // Fetch Active Students On-Demand
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students', search, selectedYear, selectedClass, selectedSection, forceLoadAll],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedYear && selectedYear !== 'all') params.append('academicYearId', selectedYear);
      if (selectedClass && selectedClass !== 'all') params.append('classId', selectedClass);
      if (selectedSection && selectedSection !== 'all') params.append('section', selectedSection);
      params.append('limit', 'all');
      const res = await api.get(`/students?${params.toString()}`);
      return res.data;
    },
    enabled: activeTab === 'directory' && isFilterActive,
  });

  // Fetch Eligible Students for Class Promotion / Upgrade
  const { data: sourceClassStudents = [], isLoading: isSourceClassLoading } = useQuery({
    queryKey: ['promote-source-students', promoteFromYear, promoteFromClass],
    queryFn: async () => {
      if (!promoteFromClass) return [];
      const params = new URLSearchParams();
      if (promoteFromYear && promoteFromYear !== 'all') params.append('academicYearId', promoteFromYear);
      params.append('classId', promoteFromClass);
      params.append('limit', 'all');
      const res = await api.get(`/students?${params.toString()}`);
      return res.data?.data || [];
    },
    enabled: activeTab === 'upgrade' && Boolean(promoteFromClass),
  });

  // Fetch Transferred/Alumni Students
  const { data: transferredData, isLoading: isTransferredLoading } = useQuery({
    queryKey: ['transferred-students', batchYearFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (batchYearFilter) params.append('batchYear', batchYearFilter);
      const res = await api.get(`/students/transferred?${params.toString()}`);
      return res.data?.data || [];
    },
    enabled: activeTab === 'transferred',
  });

  // Fetch Student Analytics
  const { data: analyticsData, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ['student-analytics', analyticsYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (analyticsYear && analyticsYear !== 'all') params.append('academicYearId', analyticsYear);
      const res = await api.get(`/students/analytics?${params.toString()}`);
      return res.data?.data;
    },
    enabled: activeTab === 'analytics',
  });

  // Admission Mutation
  const admissionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/students/admission', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(
        `विद्यार्थी भर्ना सफल भयो! Login: ${data.data?.credentials?.username || 'Created'} (Pass: ${data.data?.credentials?.plainPassword || '123456'})`,
        { duration: 6000 }
      );
      // Reset form
      setAdmissionForm({
        fullName: '',
        fullNameNepali: '',
        emisId: '',
        gender: 'Male',
        dateOfBirthBs: '',
        classId: '',
        rollNo: '',
        admissionDateBs: todayBS(),
        fatherName: '',
        motherName: '',
        guardianName: '',
        guardianContact: '',
        parentCitizenshipNo: '',
        address: '',
        ethnicity: '',
        prevSchoolName: '',
        prevEmisCode: '',
        photoUrl: '',
        facultyStream: 'Science',
        shift: 'Morning',
        seeGpa: '',
        seeSymbolNo: '',
        seeRegNo: '',
        electiveSubjects: [],
      });
      setAdmissionPhotoSizeKb(null);
      setCollectedDocs({
        birthCertificate: false,
        transferCertificate: false,
        marksheet: false,
        photos: false,
        citizenshipCopy: false,
      });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student-analytics'] });
      setActiveTab('directory');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to complete admission');
    },
  });

  // Edit Student Mutation
  const editStudentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await api.put(`/students/${id}`, data);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'विद्यार्थीको सम्पूर्ण विवरण सफलतापूर्वक अद्यावधिक भयो!');
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['transferred-students'] });
      setEditModalStudent(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'विद्यार्थीको विवरण अद्यावधिक गर्न सकिएन।');
    },
  });

  // Delete Student Mutation
  const deleteStudentMutation = useMutation({
    mutationFn: async ({ id, permanent }: { id: number; permanent: boolean }) => {
      const res = await api.delete(`/students/${id}?permanent=${permanent}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'विद्यार्थी सफलतापूर्वक हटाइयो!');
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['transferred-students'] });
      queryClient.invalidateQueries({ queryKey: ['student-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setDeleteModalStudent(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'विद्यार्थी हटाउन सकिएन।');
    },
  });

  const handleOpenEdit = (student: any) => {
    const enrolment = student.classEnrollment?.[0];
    setEditModalStudent(student);
    setEditPhotoSizeKb(null);
    setEditForm({
      fullName: student.fullName || '',
      fullNameNepali: student.fullNameNepali || '',
      emisId: student.emisId || '',
      studentId: student.studentId || '',
      gender: student.gender || 'Male',
      dateOfBirthBs: student.dateOfBirthBs || '',
      dateOfBirthAd: student.dateOfBirthAd ? new Date(student.dateOfBirthAd).toISOString().slice(0, 10) : '',
      classId: enrolment?.classId ? String(enrolment.classId) : (enrolment?.class?.id ? String(enrolment.class.id) : ''),
      rollNo: enrolment?.rollNo !== undefined && enrolment?.rollNo !== null ? String(enrolment.rollNo) : '',
      admissionDateBs: student.admissionDateBs || '',
      fatherName: student.fatherName || '',
      motherName: student.motherName || '',
      guardianName: student.guardianName || '',
      guardianContact: student.guardianContact || student.phone || '',
      guardianRelation: student.guardianRelation || '',
      address: student.address || '',
      bloodGroup: student.bloodGroup || '',
      religion: student.religion || '',
      ethnicity: student.ethnicity || '',
      disability: student.disability || '',
      previousSchool: student.previousSchool || '',
      status: student.status || 'ACTIVE',
      isActive: student.isActive ?? true,
      batchYear: student.batchYear || '',
      username: student.user?.username || student.studentId || '',
      photoUrl: student.photoUrl || '',
    });
  };

  const handleAdmissionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!admissionForm.fullName || !admissionForm.guardianContact) {
      toast.error('कृपया विद्यार्थीको पूरा नाम र सम्पर्क नम्बर अनिवार्य भर्नुहोस्');
      return;
    }
    admissionMutation.mutate({
      ...admissionForm,
      collectedDocs,
    });
  };

  // Transfer Out Mutation
  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!transferModalStudent) return;
      const res = await api.post(`/students/${transferModalStudent.id}/transfer`, transferForm);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Student transferred out successfully');
      setTransferModalStudent(null);
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['transferred-students'] });
      queryClient.invalidateQueries({ queryKey: ['student-analytics'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to transfer student');
    },
  });

  // Reactivate Student Mutation
  const reactivateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/students/${id}/reactivate`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Student reactivated into active directory!');
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['transferred-students'] });
      queryClient.invalidateQueries({ queryKey: ['student-analytics'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to reactivate student');
    },
  });

  // Password Reset Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!resetModalStudent || !newPassword) return;
      const res = await api.post(`/students/${resetModalStudent.id}/reset-password`, {
        newPassword,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Password reset successfully!');
      setResetModalStudent(null);
      setNewPassword('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    },
  });

  // Quick Create Academic Year Mutation
  const quickCreateYearMutation = useMutation({
    mutationFn: async (yearName: string) => {
      const parts = yearName.split('-');
      const startBs = `${parts[0]}-01-01`;
      const endBs = parts[1] ? `${parts[0].slice(0, 2)}${parts[1]}-12-30` : `${parts[0]}-12-30`;
      const res = await api.post('/classes/academic-years', {
        year: yearName.trim(),
        startDateBs: startBs,
        endDateBs: endBs,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`नयाँ शैक्षिक सत्र "${data.data?.year}" थपियो!`);
      queryClient.invalidateQueries({ queryKey: ['academic-years-all'] });
      setImportAcademicYearId(String(data.data?.id));
      setIsCreatingNewYear(false);
      setNewYearInput('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create academic year');
    },
  });

  // Re-sequence Roll Numbers Mutation (Class-Wise 1..N)
  const autoRollMutation = useMutation({
    mutationFn: async ({
      classId,
      academicYearId,
      sortBy = 'ALPHABETICAL',
    }: {
      classId?: string;
      academicYearId?: string;
      sortBy?: string;
    }) => {
      const res = await api.post('/students/resequence-roll-numbers', {
        classId: classId && classId !== 'all' ? classId : undefined,
        academicYearId: academicYearId && academicYearId !== 'all' ? academicYearId : undefined,
        sortBy,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'कक्षागत रोल नम्बर सफलतापूर्वक मिलाइयो!');
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setIsRollModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'रोल नम्बर मिलाउन असफल भयो');
    },
  });

  // Bulk import mutation
  const bulkImportMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await api.post('/students/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => {
      const { created, upgradedOrEnrolled, updated, transferred, skipped, academicYear, errors } = data.results || {};
      const totalSuccess = (created || 0) + (upgradedOrEnrolled || 0) + (updated || 0) + (transferred || 0);
      toast.success(
        `आयात सफल! सत्र: ${academicYear || ''} (जम्मा ${totalSuccess}) | नयाँ: ${created || 0} | कक्षा इतिहास/अद्यावधिक: ${(upgradedOrEnrolled || 0) + (updated || 0)} | सरुवा अभिलेख: ${transferred || 0}`,
        { duration: 8000 }
      );
      if (errors?.length > 0) {
        toast.error(`${errors.length} पंक्तिका विवरण आयात हुन सकेन।`);
      }
      setIsImportModalOpen(false);
      setImportFile(null);
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['transferred-students'] });
      queryClient.invalidateQueries({ queryKey: ['student-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to import Excel');
    },
  });

  const [showFormatGuide, setShowFormatGuide] = useState(false);

  // Calculate age dynamically from BS or AD Date of Birth
  const computeStudentAge = (dobStr?: string | null): number | null => {
    if (!dobStr) return null;
    const match = String(dobStr).match(/^(\d{4})/);
    if (!match) return null;
    const birthYear = parseInt(match[1]);
    if (isNaN(birthYear)) return null;
    if (birthYear > 2000 && birthYear < 2100) {
      const age = 2082 - birthYear;
      return age > 0 && age < 100 ? age : null;
    }
    if (birthYear > 1950 && birthYear <= new Date().getFullYear()) {
      const age = new Date().getFullYear() - birthYear;
      return age > 0 && age < 100 ? age : null;
    }
    return null;
  };

  // Download Comprehensive IEMIS Excel / CSV Template
  const handleDownloadTemplate = () => {
    const headers = [
      'S.N',
      'IEMIS Code',
      'School',
      'Student IEMIS Id',
      'Student Name',
      'Student Name in Nepali',
      'Gender',
      'Father Name',
      'Mother Name',
      'Class',
      'Section',
      'Roll No',
      'Permanent Address',
      'Temporary Address',
      'DOB',
      'Age',
      'Blood Group',
      'Ethnicity',
      'Religion',
      'Disability Type',
      'Guardian Name',
      'Guardian Contact Number',
      'Guardian Relation',
      'Previous School',
      'Admission Date',
      'Is Transferred',
    ];

    const sampleRows = [
      [
        '1',
        '320160005',
        'Nepal Secondary School',
        '3201600058003308',
        'Aachal Kumari',
        'आँचल कुमारी',
        'Female',
        'Rajesh Raut Kurmi',
        'Gujeshwori Devi',
        '8',
        'A',
        '1',
        'Brindaban-1, Rautahat',
        'Brindaban-1, Rautahat',
        '2068-06-17',
        '14',
        'B+',
        'Madhesi (Kurmi)',
        'Hindu',
        'None',
        'Rajesh Raut Kurmi',
        '9825519506',
        'Father',
        'Bal Kalyan Ma.Vi.',
        '2081-01-15',
        'No',
      ],
      [
        '2',
        '320160005',
        'Nepal Secondary School',
        '3201600057601760',
        'Aachal Patel',
        'आँचल पटेल',
        'Female',
        'Rambishwas Patel',
        'Sima Devi',
        '6',
        'B',
        '2',
        'Brindaban-1, Rautahat',
        'Brindaban-1, Rautahat',
        '2072-10-11',
        '10',
        'O+',
        'Madhesi (Patel)',
        'Hindu',
        'None',
        'Rambishwas Patel',
        '9812345678',
        'Father',
        '',
        '2081-01-15',
        'No',
      ],
      [
        '3',
        '320160005',
        'Nepal Secondary School',
        '3201600058003388',
        'Aadesh Paswan',
        'आदेश पासवान',
        'Male',
        'Ram Adhar Paswan',
        'Anita Paswan',
        '2',
        'A',
        '1',
        'Brindaban-1, Rautahat',
        'Brindaban-1, Rautahat',
        '2075-07-27',
        '7',
        'A+',
        'Dalit (Paswan)',
        'Hindu',
        'None',
        'Ram Adhar Paswan',
        '9803456789',
        'Father',
        '',
        '2081-01-15',
        'No',
      ],
      [
        '4',
        '320160005',
        'Nepal Secondary School',
        '3201600057701806',
        'Aadhity Patel',
        'आदित्य पटेल',
        'Male',
        'Bachan Raut Kurmi',
        'Sharmila Devi',
        '6',
        'A',
        '3',
        'Brindaban-1, Rautahat',
        'Brindaban-1, Rautahat',
        '2069-06-30',
        '13',
        'AB+',
        'Madhesi (Kurmi)',
        'Hindu',
        'None',
        'Bachan Raut Kurmi',
        '9819876543',
        'Father',
        '',
        '2081-01-15',
        'No',
      ],
    ];

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...sampleRows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'iemis_student_full_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('नेपाल सरकार IEMIS मानक पूर्ण एक्सेल/CSV ढाँचा डाउनलोड भयो!');
  };

  const handleBulkImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      toast.error('कृपया Excel फाइल (.xlsx / .xls) छनोट गर्नुहोस्');
      return;
    }
    const formData = new FormData();
    formData.append('file', importFile);
    if (importClassId) formData.append('classId', importClassId);
    if (importAcademicYearId) formData.append('academicYearId', importAcademicYearId);
    formData.append('treatNoEmisAsTransferred', String(treatNoEmisAsTransferred));
    bulkImportMutation.mutate(formData);
  };

  // Bulk Student Upgrade / Promotion Mutation
  const bulkUpgradeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/students/bulk-upgrade', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'विद्यार्थी कक्षा स्तरोन्नति सफल भयो!', { duration: 7000 });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['transferred-students'] });
      queryClient.invalidateQueries({ queryKey: ['student-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['promote-source-students'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setStudentPromoteState({});
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'विद्यार्थी स्तरोन्नति गर्न सकिएन।');
    },
  });

  const students = studentsData?.data || [];
  const transferredList = transferredData || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f] flex items-center gap-2">
            <Users className="text-[#1e3a5f]" />
            <span>Student Management (विद्यार्थी प्रशासन)</span>
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            नयाँ भर्ना पोर्टल, चालु विद्यार्थी विवरण, स्थानान्तरण (Transfer-out) तथा शैक्षिक तथ्याङ्क विश्लेषण
          </p>
        </div>

        {/* Tab Navigation Pill */}
        <div className="flex flex-wrap rounded-xl bg-slate-200/80 p-1 text-xs font-bold gap-1 shadow-inner">
          <button
            onClick={() => setActiveTab('directory')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 ${
              activeTab === 'directory' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <Users size={14} />
            <span>Active Directory (विद्यार्थी सूची)</span>
          </button>
          <button
            onClick={() => setActiveTab('admission')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 ${
              activeTab === 'admission' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <UserCheck size={14} />
            <span>Admission Portal (नयाँ भर्ना)</span>
          </button>
          <button
            onClick={() => setActiveTab('upgrade')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 ${
              activeTab === 'upgrade' ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <GraduationCap size={15} className={activeTab === 'upgrade' ? 'text-amber-300' : 'text-emerald-600'} />
            <span>Upgrade Students (कक्षा स्तरोन्नति)</span>
          </button>
          <button
            onClick={() => setActiveTab('transferred')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 ${
              activeTab === 'transferred' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <ArrowRightLeft size={14} />
            <span>Transferred / Alumni (स्थानान्तरण)</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 ${
              activeTab === 'analytics' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <PieChart size={14} />
            <span>Demographics & Analytics (तथ्याङ्क)</span>
          </button>
        </div>
      </div>

      {/* ════════════════════ TAB 1: ACTIVE DIRECTORY ════════════════════ */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* IEMIS Standard Filter Bar: Year, Class, Section, Search & Actions */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
              {/* Year Filter */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Year (शैक्षिक सत्र) <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setSelectedClass('');
                    setForceLoadAll(false);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold focus:border-[#1e3a5f] focus:bg-white focus:outline-hidden transition"
                >
                  <option value="">Select Year (सत्र छनोट)</option>
                  {academicYearsData?.map((ay: any) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.year} {ay.isActive ? '⭐ (Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class Filter */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Class (कक्षा) <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setForceLoadAll(false);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold focus:border-[#1e3a5f] focus:bg-white focus:outline-hidden transition"
                >
                  <option value="">Select Class (कक्षा छनोट)</option>
                  <option value="all">All Classes (सबै कक्षा)</option>
                  {classesData
                    ?.filter((cls: any) => !selectedYear || String(cls.academicYearId) === String(selectedYear))
                    .map((cls: any) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} {cls.section ? `(${cls.section})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              {/* Section Filter */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Section (सेक्सन)
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => {
                    setSelectedSection(e.target.value);
                    setForceLoadAll(false);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold focus:border-[#1e3a5f] focus:bg-white focus:outline-hidden transition"
                >
                  <option value="all">All (सबै)</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                  <option value="D">Section D</option>
                </select>
              </div>

              {/* Search by student name/ID/contact */}
              <div className="md:col-span-1 lg:col-span-2">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Search Student (खोजी)
                </label>
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search name, IEMIS ID, phone..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setForceLoadAll(false);
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-slate-50/50 pl-9 pr-4 py-2 text-xs focus:border-[#1e3a5f] focus:bg-white focus:outline-hidden transition"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Clear / Reset Filter Button */}
              <div>
                {isFilterActive ? (
                  <button
                    onClick={() => {
                      setSelectedYear('');
                      setSelectedClass('');
                      setSelectedSection('all');
                      setSearch('');
                      setForceLoadAll(false);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition shadow-2xs"
                  >
                    <RotateCcw size={13} />
                    <span>रिसेट (Reset)</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setForceLoadAll(true)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition shadow-2xs"
                  >
                    <Users size={13} />
                    <span>सबै लोड (All)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="flex flex-wrap items-center justify-between border-t border-gray-100 pt-3 gap-2">
              <div className="flex items-center gap-2">
                {isFilterActive && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>
                      {isLoading ? 'खोज्दै...' : `जम्मा भेटिएका विद्यार्थी: ${studentsData?.total ?? students.length} जना`}
                    </span>
                  </span>
                )}
              </div>

              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setRollTargetClassId(selectedClass && selectedClass !== 'all' ? selectedClass : 'all');
                      setRollSortBy('ALPHABETICAL');
                      setIsRollModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
                    title="रोल नम्बर कक्षागत रूपमा १ देखि मिलाउनुहोस् (Class-Wise Roll No Sequence)"
                  >
                    <Sparkles size={14} className="text-indigo-600" />
                    <span>रोल नं. मिलाउनुहोस् (Auto Roll No)</span>
                  </button>

                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/students/credentials/export${selectedClass && selectedClass !== 'all' ? `?classId=${selectedClass}` : ''}`}
                    download
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-2xs"
                    title="Download IDs and login credentials for students"
                  >
                    <Download size={14} className="text-blue-600" />
                    <span>Export Logins</span>
                  </a>

                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-2xs"
                  >
                    <FileSpreadsheet size={14} />
                    <span>IEMIS Excel Import</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('admission')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2a5280] transition shadow-2xs"
                  >
                    <Plus size={14} />
                    <span>New Admission</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Students Content Area: Prompt when no filter vs Table when filtered */}
          {!isFilterActive ? (
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/40 via-white to-slate-50/60 p-8 md:p-12 text-center shadow-2xs">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-100 text-[#1e3a5f] flex items-center justify-center mb-4 shadow-xs">
                <School size={30} className="text-[#1e3a5f]" />
              </div>
              <h3 className="text-base md:text-lg font-extrabold text-[#1e3a5f] mb-1.5">
                कृपया कक्षा (Class) छनोट गर्नुहोस्
              </h3>
              <p className="text-xs text-gray-500 max-w-lg mx-auto mb-6 leading-relaxed">
                सत्र <strong>{academicYearsData?.find((y: any) => String(y.id) === String(selectedYear))?.year || 'छनोट गरिएको'}</strong> का विद्यार्थीहरू तथा रोल नम्बर हेर्न तलको कक्षा बटन थिच्नुहोस् वा माथिको खोज बाकस प्रयोग गर्नुहोस्।
              </p>

              {/* Quick Class Selector Buttons */}
              <div className="max-w-3xl mx-auto mb-6">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                  द्रुत कक्षा छनोट (Quick Select Class):
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {classesData
                    ?.filter((cls: any) => !selectedYear || String(cls.academicYearId) === String(selectedYear))
                    .map((cls: any) => (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => {
                          setSelectedClass(String(cls.id));
                          setForceLoadAll(false);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#1e3a5f] hover:text-white border border-gray-200 hover:border-[#1e3a5f] text-xs font-bold text-gray-700 transition shadow-2xs flex items-center gap-1.5 group cursor-pointer"
                      >
                        <GraduationCap size={14} className="text-slate-400 group-hover:text-amber-300 transition" />
                        <span>{cls.name}</span>
                        {cls.section && <span className="text-[10px] text-gray-400 group-hover:text-slate-200">({cls.section})</span>}
                      </button>
                    ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200/60 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setForceLoadAll(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  <Users size={14} />
                  <span>यस सत्रका सबै विद्यार्थी हेर्नुहोस् (Load All Students)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Past Academic Year Notification Alert */}
              {selectedYear && selectedYear !== 'all' && academicYearsData?.find((y: any) => String(y.id) === String(selectedYear) && !y.isActive) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 flex items-center justify-between text-xs text-amber-900 shadow-2xs">
                  <div className="flex items-center gap-2.5 font-medium">
                    <span className="p-1.5 rounded-lg bg-amber-200 text-amber-900 font-bold text-xs">📂 विगत सत्र</span>
                    <span>
                      तपाईं <strong>शैक्षिक सत्र {academicYearsData?.find((y: any) => String(y.id) === String(selectedYear))?.year}</strong> को विद्यार्थी ऐतिहासिक अभिलेख हेर्दै हुनुहुन्छ। यस सत्रका सम्पूर्ण विद्यार्थी तथा सरुवा भइसकेका विद्यार्थीहरूलाई स्पष्ट ब्याज सहित देखाइएको छ।
                    </span>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700">
                    <thead className="bg-[#1e3a5f] text-white">
                      <tr>
                        <th className="px-3 py-3.5 font-bold uppercase text-center w-14">Roll</th>
                        <th className="px-4 py-3.5 font-bold uppercase">Student Details</th>
                        <th className="px-4 py-3.5 font-bold uppercase">IEMIS ID</th>
                        <th className="px-4 py-3.5 font-bold uppercase">Class & Sec</th>
                        <th className="px-4 py-3.5 font-bold uppercase">Parent / Contact</th>
                        <th className="px-4 py-3.5 font-bold uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {isLoading ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-gray-400">
                            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
                            <p className="mt-2 text-xs">विद्यार्थी विवरण खोज्दै...</p>
                          </td>
                        </tr>
                      ) : students.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-gray-400">
                            <Users size={32} className="mx-auto text-gray-300 mb-2" />
                            <p className="text-sm font-semibold text-gray-600">छनोट गरिएको फिल्टर अनुसार कुनै विद्यार्थी फेला परेन</p>
                            <p className="text-xs text-gray-400">कृपया अन्य कक्षा, सत्र वा खोज शब्द प्रयोग गर्नुहोस्।</p>
                          </td>
                        </tr>
                      ) : (
                        students.map((student: any) => {
                          const enrollment = student.classEnrollment?.[0];
                          const isTransferred = student.status === 'TRANSFERRED' || !student.isActive;
                          return (
                            <tr key={student.id} className="hover:bg-blue-50/40 transition">
                              <td className="px-3 py-3 text-center">
                                {enrollment?.rollNo ? (
                                  <span className="inline-flex min-w-[24px] h-6 px-1.5 items-center justify-center rounded-lg bg-indigo-50 font-bold text-[11px] text-indigo-700 border border-indigo-100 shadow-2xs">
                                    {enrollment.rollNo}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 font-mono">—</span>
                                )}
                              </td>

                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="relative group shrink-0">
                                    {student.photoUrl ? (
                                      <img
                                        src={student.photoUrl}
                                        alt={student.fullName}
                                        onClick={() => setPhotoModalStudent({ id: student.id, name: student.fullName, photoUrl: student.photoUrl })}
                                        className="h-10 w-9 rounded-xl object-cover border border-slate-200 shadow-2xs cursor-pointer group-hover:ring-2 group-hover:ring-blue-500 transition"
                                        title="फोटो हेर्नुहोस् / परिवर्तन गर्नुहोस्"
                                      />
                                    ) : (
                                      <div
                                        onClick={() => setPhotoModalStudent({ id: student.id, name: student.fullName, photoUrl: null })}
                                        className={`flex h-10 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs cursor-pointer group-hover:ring-2 group-hover:ring-blue-500 transition ${
                                          isTransferred ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                        }`}
                                        title="फोटो अपलोड गर्नुहोस् (Click to upload photo)"
                                      >
                                        {student.fullName.slice(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setPhotoModalStudent({ id: student.id, name: student.fullName, photoUrl: student.photoUrl })}
                                      className="absolute -bottom-1 -right-1 bg-slate-800/80 hover:bg-blue-600 text-white p-0.5 rounded-md opacity-0 group-hover:opacity-100 transition shadow-xs cursor-pointer"
                                      title="फोटो खिच्नुहोस् / अपलोड गर्नुहोस्"
                                    >
                                      <Camera size={10} />
                                    </button>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-bold text-gray-900">{student.fullName}</p>
                                      {isTransferred ? (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                          सरुवा (Transferred)
                                        </span>
                                      ) : student.status === 'GRADUATED' ? (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                          उत्तीर्ण (Graduated)
                                        </span>
                                      ) : !student.isActive || student.status === 'PAST_RECORD' ? (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                          📁 विगत अभिलेख (Record Only)
                                        </span>
                                      ) : null}

                                      {/* Blood Group Badge */}
                                      {student.bloodGroup && (
                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                                          🩸 {student.bloodGroup}
                                        </span>
                                      )}

                                      {/* Ethnicity / Caste Badge */}
                                      {student.ethnicity && (
                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                                          {student.ethnicity}
                                        </span>
                                      )}
                                    </div>
                                    {student.fullNameNepali && (
                                      <p className="text-[10px] text-gray-500 font-nepali">{student.fullNameNepali}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 flex-wrap font-sans">
                                      {student.gender && (
                                        <span className={`font-semibold ${
                                          student.gender === 'Female' ? 'text-pink-600' : 'text-blue-600'
                                        }`}>
                                          {student.gender === 'Female' ? '♀ छात्रा (Female)' : student.gender === 'Male' ? '♂ छात्र (Male)' : student.gender}
                                        </span>
                                      )}
                                      {student.dateOfBirthBs && (
                                        <span>
                                          DOB: <strong className="font-mono text-gray-700">{student.dateOfBirthBs}</strong>
                                          {computeStudentAge(student.dateOfBirthBs) && (
                                            <span className="ml-1 text-emerald-700 font-bold">
                                              ({computeStudentAge(student.dateOfBirthBs)} वर्ष)
                                            </span>
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
                                  {student.studentId}
                                </span>
                              </td>

                          <td className="px-4 py-3">
                            {enrollment?.class ? (
                              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                !student.isActive ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-blue-50 text-blue-700'
                              }`}>
                                {enrollment.class.name} {enrollment.class.section ? `- ${enrollment.class.section}` : ''}
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400">
                                {!student.isActive ? 'विगत अभिलेख (Record Only)' : 'Not Assigned'}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <div className="text-xs">
                              <p className="font-medium text-gray-900">
                                {student.fatherName ? `बुवा: ${student.fatherName}` : (student.guardianName || '—')}
                              </p>
                              {student.motherName && (
                                <p className="text-[10px] text-gray-500">आमा: {student.motherName}</p>
                              )}
                              <p className="text-[10px] text-indigo-700 font-mono font-bold mt-0.5">
                                {student.guardianContact || student.phone || '—'}
                              </p>
                              {student.address && (
                                <p className="text-[10px] text-gray-400 truncate max-w-[180px]">{student.address}</p>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/dashboard/finance/fees?studentId=${student.id}`}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 transition"
                              >
                                <span>Fee</span>
                              </Link>
                              <Link
                                href={`/dashboard/students/${student.id}`}
                                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-[#1e3a5f] hover:text-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition"
                              >
                                <Eye size={12} />
                                <span>View</span>
                              </Link>
                              {isAdmin && (
                                <>
                                  <button
                                    onClick={() => handleOpenEdit(student)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white px-2 py-1 text-[11px] font-bold text-blue-700 transition"
                                    title="Edit all student details (सम्पूर्ण विवरण सम्पादन)"
                                  >
                                    <Pencil size={12} />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeleteModalStudent(student);
                                      setDeletePermanent(false);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white px-2 py-1 text-[11px] font-bold text-rose-700 transition"
                                    title="Delete / Deactivate student (विद्यार्थी मेटाउने)"
                                  >
                                    <Trash2 size={12} />
                                    <span>Delete</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setTransferModalStudent(student);
                                      setTransferForm({
                                        transferSchoolName: '',
                                        transferEmisCode: '',
                                        transferAddress: '',
                                        transferDateBs: todayBS(),
                                        transferReason: 'Guardian request / shifted to new location',
                                        tcNumber: `TC-${todayBS().split('-')[0]}-${student.studentId?.slice(-3) || '001'}`,
                                      });
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg bg-amber-50 hover:bg-amber-600 hover:text-white px-2 py-1 text-[11px] font-bold text-amber-700 transition"
                                    title="Transfer out to another school"
                                  >
                                    <ArrowRightLeft size={12} />
                                    <span>Transfer</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setResetModalStudent(student);
                                      setNewPassword('123456');
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg bg-purple-50 hover:bg-purple-600 hover:text-white px-2 py-1 text-[11px] font-semibold text-purple-700 transition"
                                    title="Reset student password"
                                  >
                                    <KeyRound size={12} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 bg-slate-50/50 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  Total Active Students: <strong className="font-bold text-gray-900">{students.length}</strong>
                </span>
              </div>
              <span className="text-[11px] text-gray-400 font-medium">Nepal Secondary School ERP Record</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )}

      {/* ════════════════════ TAB 2: ADMISSION PORTAL ════════════════════ */}
      {activeTab === 'admission' && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="border-b border-gray-100 pb-4 mb-6">
            <h2 className="text-lg font-extrabold text-[#1e3a5f] flex items-center gap-2">
              <UserCheck className="text-emerald-600" />
              <span>Student Admission & Intake Portal (विद्यार्थी नयाँ भर्ना फारम)</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              विद्यार्थीको व्यक्तिगत विवरण, अभिभावकको सम्पर्क, अघिल्लो विद्यालयको EMIS र संकलित कागजात चेकलिस्ट
            </p>
          </div>

          <form onSubmit={handleAdmissionSubmit} className="space-y-6 text-xs">
            {/* 1. Basic Student Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                <span>१. विद्यार्थीको व्यक्तिगत विवरण (Personal Details)</span>
              </h3>

              {/* Student Photo Card with Upload & Live Camera Capture (Strictly <= 50KB) */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-blue-50/40 to-indigo-50/30 border border-slate-200">
                {/* Photo Preview */}
                <div className="relative group shrink-0">
                  <div className="w-28 h-36 rounded-xl border-2 border-dashed border-blue-300 bg-white overflow-hidden flex flex-col items-center justify-center shadow-xs transition hover:border-blue-500">
                    {admissionForm.photoUrl ? (
                      <img
                        src={admissionForm.photoUrl}
                        alt="Student Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-3 text-center text-slate-400">
                        <Camera size={28} className="mb-1 text-slate-300" />
                        <span className="text-[10px] font-bold text-slate-500">विद्यार्थी फोटो</span>
                        <span className="text-[9px] text-slate-400">(PP Size ≤ 50KB)</span>
                      </div>
                    )}
                  </div>
                  {admissionForm.photoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setAdmissionForm((prev) => ({ ...prev, photoUrl: '' }));
                        setAdmissionPhotoSizeKb(null);
                      }}
                      className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-md hover:bg-rose-700 transition cursor-pointer"
                      title="फोटो हटाउनुहोस् (Remove)"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Controls & Instructions */}
                <div className="space-y-2 flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-500" />
                      <span>विद्यार्थीको पासपोर्ट साइज फोटो (Student Photo)</span>
                    </span>
                    {admissionPhotoSizeKb ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 size={11} /> {admissionPhotoSizeKb} KB (स्वतः कम्प्रेस ≤ 50KB)
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        अधिकतम ५० KB स्वचालित कन्भर्जन
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    विद्यार्थीको फोटो कम्प्युटर/मोबाइलबाट अपलोड गर्नुहोस् वा सिधै क्यामेराबाट खिच्नुहोस्। सिस्टमले फोटोलाई स्वतः मानक पासपोर्ट साइज (3:4) र <strong>५० KB भन्दा सानो</strong> साइजमा रूपान्तरण गर्दछ।
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                    <input
                      ref={admissionFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAdmissionPhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => admissionFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 shadow-2xs transition cursor-pointer"
                    >
                      <Upload size={14} className="text-blue-600" />
                      <span>फोटो अपलोड गर्नुहोस् (Upload Photo)</span>
                    </button>

                    <button
                      type="button"
                      onClick={startAdmissionCamera}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-2xs transition cursor-pointer"
                    >
                      <Camera size={14} />
                      <span>क्यामेराबाट खिच्नुहोस् (Take Photo)</span>
                    </button>

                    {admissionForm.photoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setAdmissionForm((prev) => ({ ...prev, photoUrl: '' }));
                          setAdmissionPhotoSizeKb(null);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-bold text-xs border border-slate-200 transition cursor-pointer"
                      >
                        <Trash2 size={12} />
                        <span>हटाउनुहोस्</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Name (English) *</label>
                  <input
                    required
                    type="text"
                    value={admissionForm.fullName}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, fullName: e.target.value })}
                    placeholder="e.g. Sujan Shrestha"
                    className="erp-input font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">पूरा नाम (नेपालीमा)</label>
                  <input
                    type="text"
                    value={admissionForm.fullNameNepali}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, fullNameNepali: e.target.value })}
                    placeholder="उदा. सुजन श्रेष्ठ"
                    className="erp-input font-nepali"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Gender (लिङ्ग) *</label>
                  <select
                    value={admissionForm.gender}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, gender: e.target.value })}
                    className="erp-input font-semibold"
                  >
                    <option value="Male">Male (पुरुष)</option>
                    <option value="Female">Female (महिला)</option>
                    <option value="Other">Other (अन्य)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Date of Birth (BS) *</label>
                  <input
                    type="text"
                    value={admissionForm.dateOfBirthBs}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, dateOfBirthBs: e.target.value })}
                    placeholder="2068-04-15"
                    className="erp-input font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">IEMIS ID (यदि छ भने)</label>
                  <input
                    type="text"
                    value={admissionForm.emisId}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, emisId: e.target.value })}
                    placeholder="Auto if empty"
                    className="erp-input font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Ethnicity / Caste (जाति)</label>
                  <input
                    type="text"
                    value={admissionForm.ethnicity}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, ethnicity: e.target.value })}
                    placeholder="Brahmin / Chhetri / Janajati / Dalit"
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Permanent Address (ठेगाना)</label>
                  <input
                    type="text"
                    value={admissionForm.address}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, address: e.target.value })}
                    placeholder="Municipality, Ward, District"
                    className="erp-input"
                  />
                </div>
              </div>
            </div>

            {/* 2. Academic Enrollment */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                <span>२. कक्षा भर्ना विवरण (Class & Academic Info)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Assign Class (भर्ना हुने कक्षा) *</label>
                  <select
                    value={admissionForm.classId}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, classId: e.target.value })}
                    className="erp-input font-semibold"
                  >
                    <option value="">Select Class</option>
                    {classesData?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section ? `(${c.section})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Roll Number</label>
                  <input
                    type="number"
                    value={admissionForm.rollNo}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, rollNo: e.target.value })}
                    placeholder="Auto sequence if empty"
                    className="erp-input font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Admission Date BS (भर्ना मिति)</label>
                  <input
                    type="text"
                    value={admissionForm.admissionDateBs}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, admissionDateBs: e.target.value })}
                    className="erp-input font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Previous School Name (पहिले पढेको विद्यालय)</label>
                  <input
                    type="text"
                    value={admissionForm.prevSchoolName}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, prevSchoolName: e.target.value })}
                    placeholder="e.g. Janakalyan Basic School"
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Previous School EMIS Code (पहिलेको विद्यालयको EMIS)</label>
                  <input
                    type="text"
                    value={admissionForm.prevEmisCode}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, prevEmisCode: e.target.value })}
                    placeholder="e.g. 320160001"
                    className="erp-input font-mono"
                  />
                </div>
              </div>
            </div>

            {/* ════ SPECIALIZED CLASS 11 & 12 STREAM / FACULTY & SEE SECTION ════ */}
            {isClass11or12 && (
              <div className="space-y-4 pt-2 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-blue-50/50 to-purple-50/40 border-2 border-indigo-200 shadow-xs animate-in fade-in">
                <div className="flex items-center justify-between border-b border-indigo-200 pb-2.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-600" />
                    <span>कक्षा ११ र १२ संकाय, सत्र तथा एसईई (SEE) विवरण (Class 11 & 12 Faculty & SEE Details)</span>
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-2xs">
                    NEB / Higher Secondary Intake
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Faculty / Stream */}
                  <div>
                    <label className="block font-black text-indigo-950 mb-1">
                      Faculty / Stream (संकाय) *
                    </label>
                    <select
                      value={admissionForm.facultyStream}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, facultyStream: e.target.value })}
                      className="erp-input font-bold border-indigo-300 focus:ring-indigo-500 bg-white"
                    >
                      <option value="Science">विज्ञान (Science)</option>
                      <option value="Management">व्यवस्थापन (Management)</option>
                      <option value="Education">शिक्षाशास्त्र (Education)</option>
                      <option value="Humanities">मानविकी (Humanities)</option>
                      <option value="Law">कानुन (Law)</option>
                    </select>
                  </div>

                  {/* Shift */}
                  <div>
                    <label className="block font-black text-indigo-950 mb-1">
                      Shift Allocation (सत्र) *
                    </label>
                    <select
                      value={admissionForm.shift}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, shift: e.target.value })}
                      className="erp-input font-bold border-indigo-300 focus:ring-indigo-500 bg-white"
                    >
                      <option value="Morning">बिहानी सत्र (Morning Shift - 6:30 AM)</option>
                      <option value="Day">दिवा सत्र (Day Shift - 10:00 AM)</option>
                    </select>
                  </div>

                  {/* SEE GPA */}
                  <div>
                    <label className="block font-black text-indigo-950 mb-1">
                      SEE GPA (एसईई ग्रेड पोइन्ट) *
                    </label>
                    <input
                      type="text"
                      value={admissionForm.seeGpa}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, seeGpa: e.target.value })}
                      placeholder="e.g. 3.65 (out of 4.0)"
                      className="erp-input font-mono font-bold border-indigo-300 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  {/* SEE Symbol Number */}
                  <div>
                    <label className="block font-black text-indigo-950 mb-1">
                      SEE Symbol No. (सिम्बोल नं.)
                    </label>
                    <input
                      type="text"
                      value={admissionForm.seeSymbolNo}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, seeSymbolNo: e.target.value })}
                      placeholder="e.g. 0281920Z"
                      className="erp-input font-mono font-bold border-indigo-300 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                </div>

                {/* SEE Registration Number & Stream Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block font-bold text-indigo-950 mb-1">
                      SEE Registration No. (एसईई दर्ता नं.)
                    </label>
                    <input
                      type="text"
                      value={admissionForm.seeRegNo}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, seeRegNo: e.target.value })}
                      placeholder="e.g. 78-12-0043"
                      className="erp-input font-mono border-indigo-300 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-indigo-950 mb-1">
                      Optional / Elective Subjects Selection (ऐच्छिक विषयहरू)
                    </label>
                    <div className="p-2.5 rounded-xl bg-white border border-indigo-200 text-[11px] text-indigo-900 flex flex-wrap gap-2">
                      {admissionForm.facultyStream === 'Science' && (
                        <>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 font-bold border border-indigo-200">Physics (भौतिक विज्ञान)</span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 font-bold border border-indigo-200">Chemistry (रसायन विज्ञान)</span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 font-bold border border-indigo-200">Biology / Mathematics</span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 font-bold border border-indigo-200">Computer Science</span>
                        </>
                      )}
                      {admissionForm.facultyStream === 'Management' && (
                        <>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 font-bold border border-indigo-200">Accountancy (लेखाविधि)</span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 font-bold border border-indigo-200">Economics (अर्थशास्त्र)</span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 font-bold border border-indigo-200">Business Studies</span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 font-bold border border-indigo-200">Computer / Hotel Mgt</span>
                        </>
                      )}
                      {admissionForm.facultyStream === 'Education' && (
                        <>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 font-bold border border-indigo-200">Pedagogy (शिक्षा सिद्धान्त)</span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 font-bold border border-indigo-200">English / Nepali Major</span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 font-bold border border-indigo-200">Health & Physical Edu</span>
                        </>
                      )}
                      {admissionForm.facultyStream === 'Humanities' && (
                        <>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 font-bold border border-indigo-200">Sociology (समाजशास्त्र)</span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 font-bold border border-indigo-200">Political Science</span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 font-bold border border-indigo-200">Mass Communication</span>
                        </>
                      )}
                      {admissionForm.facultyStream === 'Law' && (
                        <>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 font-bold border border-indigo-200">Jurisprudence (विधिशास्त्र)</span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 font-bold border border-indigo-200">Constitutional Law</span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 font-bold border border-indigo-200">Nepalese Legal System</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Parents & Guardians */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                <span>३. अभिभावक तथा सम्पर्क विवरण (Parents & Contact)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Father's Full Name (बुवाको नाम)</label>
                  <input
                    type="text"
                    value={admissionForm.fatherName}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, fatherName: e.target.value })}
                    placeholder="Father full name"
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mother's Full Name (आमाको नाम)</label>
                  <input
                    type="text"
                    value={admissionForm.motherName}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, motherName: e.target.value })}
                    placeholder="Mother full name"
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Guardian Contact Number * (सम्पर्क नं.)</label>
                  <input
                    required
                    type="tel"
                    value={admissionForm.guardianContact}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, guardianContact: e.target.value })}
                    placeholder="98XXXXXXXX"
                    className="erp-input font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Guardian Name (यदि बुवा/आमा बाहेक भए)</label>
                  <input
                    type="text"
                    value={admissionForm.guardianName}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, guardianName: e.target.value })}
                    placeholder="Guardian name & relationship"
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Parent Citizenship / ID No (नागरिकता नं.)</label>
                  <input
                    type="text"
                    value={admissionForm.parentCitizenshipNo}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, parentCitizenshipNo: e.target.value })}
                    placeholder="e.g. 32-01-75-01234"
                    className="erp-input font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 4. Document Verification Checklist */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                <FileCheck size={15} className="text-blue-600" />
                <span>४. संकलित कागजात चेकलिस्ट (Submitted Document Checklist)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-dashed border-gray-300 bg-slate-50/50">
                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-gray-200 cursor-pointer hover:border-emerald-500 transition">
                  <input
                    type="checkbox"
                    checked={collectedDocs.birthCertificate}
                    onChange={(e) => setCollectedDocs({ ...collectedDocs, birthCertificate: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="font-bold text-gray-900">Birth Certificate</p>
                    <p className="text-[10px] text-gray-500">जन्म दर्ता प्रमाणपत्र</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-gray-200 cursor-pointer hover:border-emerald-500 transition">
                  <input
                    type="checkbox"
                    checked={collectedDocs.transferCertificate}
                    onChange={(e) => setCollectedDocs({ ...collectedDocs, transferCertificate: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="font-bold text-gray-900">Transfer Certificate (TC)</p>
                    <p className="text-[10px] text-gray-500">चारित्रिक / स्थानान्तरण पत्र</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-gray-200 cursor-pointer hover:border-emerald-500 transition">
                  <input
                    type="checkbox"
                    checked={collectedDocs.marksheet}
                    onChange={(e) => setCollectedDocs({ ...collectedDocs, marksheet: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="font-bold text-gray-900">Previous Marksheet</p>
                    <p className="text-[10px] text-gray-500">अघिल्लो कक्षाको लब्धाङ्क पत्र</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-gray-200 cursor-pointer hover:border-emerald-500 transition">
                  <input
                    type="checkbox"
                    checked={collectedDocs.photos}
                    onChange={(e) => setCollectedDocs({ ...collectedDocs, photos: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="font-bold text-gray-900">PP Photos (2 copies)</p>
                    <p className="text-[10px] text-gray-500">पासपोर्ट साइज फोटो - २ प्रति</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-gray-200 cursor-pointer hover:border-emerald-500 transition">
                  <input
                    type="checkbox"
                    checked={collectedDocs.citizenshipCopy}
                    onChange={(e) => setCollectedDocs({ ...collectedDocs, citizenshipCopy: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="font-bold text-gray-900">Parent's Citizenship</p>
                    <p className="text-[10px] text-gray-500">अभिभावक नागरिकता प्रतिलिपि</p>
                  </div>
                </label>

                {/* Additional Class 11-12 Documents */}
                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-gray-200 cursor-pointer hover:border-emerald-500 transition">
                  <input
                    type="checkbox"
                    checked={collectedDocs.seeMarksheet}
                    onChange={(e) => setCollectedDocs({ ...collectedDocs, seeMarksheet: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="font-bold text-gray-900">SEE Grade-Sheet / Marksheet</p>
                    <p className="text-[10px] text-gray-500">एसईई लब्धाङ्क पत्र (SEE Marksheet)</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-gray-200 cursor-pointer hover:border-emerald-500 transition">
                  <input
                    type="checkbox"
                    checked={collectedDocs.seeCharacterCert}
                    onChange={(e) => setCollectedDocs({ ...collectedDocs, seeCharacterCert: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="font-bold text-gray-900">SEE Character Certificate</p>
                    <p className="text-[10px] text-gray-500">एसईई चारित्रिक प्रमाणपत्र</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-gray-200 cursor-pointer hover:border-emerald-500 transition">
                  <input
                    type="checkbox"
                    checked={collectedDocs.migrationCert}
                    onChange={(e) => setCollectedDocs({ ...collectedDocs, migrationCert: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="font-bold text-gray-900">Migration Certificate</p>
                    <p className="text-[10px] text-gray-500">माइग्रेसन प्रमाणपत्र (अन्य बोर्ड भए)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setActiveTab('directory')}
                className="rounded-xl border border-gray-200 px-5 py-2.5 font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={admissionMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 font-bold text-white hover:bg-emerald-700 shadow-md transition disabled:opacity-60"
              >
                {admissionMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Admitting Student...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Complete Admission (भर्ना दर्ता गर्नुहोस्)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ════════════════════ TAB 3: UPGRADE & PROMOTION PORTAL ════════════════════ */}
      {activeTab === 'upgrade' && (
        <div className="space-y-5">
          {/* Header Card */}
          <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-blue-50/60 p-5 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base md:text-lg font-black text-emerald-950 flex items-center gap-2">
                  <GraduationCap className="text-emerald-700" size={24} />
                  <span>Student Promotion & Class Upgrade Portal (विद्यार्थी कक्षा स्तरोन्नति पोर्टल)</span>
                </h2>
                <p className="text-xs text-emerald-900/80 mt-1 max-w-3xl leading-relaxed">
                  शैक्षिक सत्र समाप्तिपछि विद्यार्थीहरूलाई नयाँ शैक्षिक सत्रको अर्को कक्षामा स्तरोन्नति (Promote / Upgrade) गर्नुहोस्, कक्षा दोहोर्‍याउनुहोस् (Repeat), वा कक्षा १० र १२ का विद्यार्थीहरूलाई उत्तीर्ण (Graduate / Pass-out) गराउनुहोस्।
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition shadow-2xs"
                >
                  <FileSpreadsheet size={15} className="text-emerald-600" />
                  <span>IEMIS Excel बाट आयात गरी स्तरोन्नति</span>
                </button>
              </div>
            </div>

            {/* Dual Option Guidance Banner */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-emerald-200/60 text-[11px]">
              <div className="p-2.5 rounded-xl bg-white/80 border border-emerald-200/80 text-emerald-950 flex items-start gap-2">
                <Sparkles size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">विकल्प १ (Direct ERP Batch Upgrade):</strong>
                  <span>तलको फारमबाट वर्तमान कक्षा र नयाँ सत्रको कक्षा छनोट गरी एकै क्लिकमा सबै वा छानिएका विद्यार्थीहरूलाई स्तरोन्नति गर्नुहोस्।</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/80 border border-teal-200/80 text-teal-950 flex items-start gap-2">
                <FileSpreadsheet size={16} className="text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">विकल्प २ (Re-import Next Year IEMIS):</strong>
                  <span>यदि तपाईंसँग नयाँ वर्षको IEMIS Excel फाइल छ भने सिधै आयात गर्दा पनि प्रणालीले पुरानो विद्यार्थी पहिचान गरी स्वतः नयाँ कक्षामा जोड्दछ।</span>
                </div>
              </div>
            </div>
          </div>

          {/* Promotion Transition Control Card */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-gray-100 pb-2">
              <span>१. सत्र तथा कक्षा छनोट (Select Academic Year & Class Transition)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Left: Source Year & Class */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                <p className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">FROM</span>
                  <span>वर्तमान शैक्षिक सत्र तथा कक्षा (Current Class & Year)</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">वर्तमान शैक्षिक सत्र *</label>
                    <select
                      value={promoteFromYear}
                      onChange={(e) => setPromoteFromYear(e.target.value)}
                      className="erp-input bg-white text-xs"
                    >
                      <option value="">-- सत्र छनोट गर्नुहोस् --</option>
                      {academicYearsData?.map((ay: any) => (
                        <option key={ay.id} value={ay.id}>
                          {ay.year} {ay.isActive ? '⭐ (Active)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">वर्तमान कक्षा (From Class) *</label>
                    <select
                      value={promoteFromClass}
                      onChange={(e) => {
                        const newClassId = e.target.value;
                        setPromoteFromClass(newClassId);
                        setStudentPromoteState({});
                        // Auto-suggest next class if possible
                        const currentCls = classesData?.find((c: any) => String(c.id) === String(newClassId));
                        if (currentCls) {
                          const match = currentCls.name.match(/\d+/);
                          if (match) {
                            const nextNum = parseInt(match[0]) + 1;
                            const targetCls = classesData?.find((c: any) => c.name.includes(String(nextNum)) && (promoteToYear ? String(c.academicYearId) === String(promoteToYear) : true));
                            if (targetCls) setPromoteToClass(String(targetCls.id));
                          }
                        }
                      }}
                      className="erp-input bg-white text-xs font-bold"
                    >
                      <option value="">-- कक्षा छनोट गर्नुहोस् --</option>
                      {classesData
                        ?.filter((c: any) => !promoteFromYear || String(c.academicYearId) === String(promoteFromYear))
                        .map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.section ? `(${c.section})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Right: Target Year & Class */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
                <p className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">TO</span>
                  <span>नयाँ शैक्षिक सत्र तथा अर्को कक्षा (Target Next Class & Year)</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">नयाँ शैक्षिक सत्र (To Year) *</label>
                    <select
                      value={promoteToYear}
                      onChange={(e) => setPromoteToYear(e.target.value)}
                      className="erp-input bg-white text-xs font-bold text-emerald-900"
                    >
                      <option value="">-- नयाँ सत्र छनोट गर्नुहोस् --</option>
                      {academicYearsData?.map((ay: any) => (
                        <option key={ay.id} value={ay.id}>
                          {ay.year} {ay.isActive ? '⭐ (Active)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">नयाँ कक्षा (Target Class) *</label>
                    <select
                      value={promoteToClass}
                      onChange={(e) => setPromoteToClass(e.target.value)}
                      className="erp-input bg-white text-xs font-bold text-emerald-900"
                    >
                      <option value="">-- स्तरोन्नति हुने कक्षा छनोट --</option>
                      {classesData
                        ?.filter((c: any) => !promoteToYear || String(c.academicYearId) === String(promoteToYear))
                        .map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.section ? `(${c.section})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Student Roster & Promotion Actions Table */}
          {promoteFromClass ? (
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    २. विद्यार्थीहरूको स्तरोन्नति स्थिति (Student Promotion Roster)
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    प्रत्येक विद्यार्थीको लागि स्तरोन्नति (Promote), दोहोर्‍याउने (Repeat), वा उत्तीर्ण (Graduate) स्थिति चयन गर्नुहोस्।
                  </p>
                </div>

                {/* Batch Actions Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const updated: any = {};
                      sourceClassStudents.forEach((s: any) => {
                        updated[s.id] = { action: 'PROMOTE', selected: true, targetClassId: promoteToClass };
                      });
                      setStudentPromoteState(updated);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2.5 py-1 text-[11px] font-bold transition"
                  >
                    <CheckCircle2 size={13} />
                    <span>सबैलाई स्तरोन्नति (Promote All)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const updated: any = {};
                      sourceClassStudents.forEach((s: any) => {
                        updated[s.id] = { action: 'GRADUATE', selected: true };
                      });
                      setStudentPromoteState(updated);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 px-2.5 py-1 text-[11px] font-bold transition"
                  >
                    <GraduationCap size={13} />
                    <span>सबै उत्तीर्ण (Graduate All - SEE/12)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const updated: any = {};
                      sourceClassStudents.forEach((s: any) => {
                        updated[s.id] = { action: 'REPEAT', selected: true, targetClassId: promoteFromClass };
                      });
                      setStudentPromoteState(updated);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 px-2.5 py-1 text-[11px] font-bold transition"
                  >
                    <RotateCcw size={13} />
                    <span>सबै दोहोर्‍याउने (Repeat All)</span>
                  </button>
                </div>
              </div>

              {/* Roster Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1e3a5f] text-white">
                    <tr>
                      <th className="px-3 py-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={selectAllPromote}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setSelectAllPromote(isChecked);
                            const updated: any = { ...studentPromoteState };
                            sourceClassStudents.forEach((s: any) => {
                              updated[s.id] = {
                                ...(updated[s.id] || { action: 'PROMOTE', targetClassId: promoteToClass }),
                                selected: isChecked,
                              };
                            });
                            setStudentPromoteState(updated);
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                        />
                      </th>
                      <th className="px-3 py-3 text-center w-14">Roll</th>
                      <th className="px-4 py-3">Student Name (विद्यार्थी)</th>
                      <th className="px-4 py-3">IEMIS ID</th>
                      <th className="px-4 py-3 text-center">स्तरोन्नति कार्य (Promotion Action)</th>
                      <th className="px-4 py-3">नयाँ कक्षा (Target Class)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isSourceClassLoading ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-400">
                          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                          <p className="mt-2 text-xs">विद्यार्थी सूची लोड हुँदैछ...</p>
                        </td>
                      </tr>
                    ) : sourceClassStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-400">
                          <Users size={30} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-sm font-semibold text-gray-600">यो कक्षामा कुनै विद्यार्थी भेटिएन</p>
                          <p className="text-xs text-gray-400">कृपया अर्को कक्षा वा सत्र छनोट गर्नुहोस्।</p>
                        </td>
                      </tr>
                    ) : (
                      sourceClassStudents.map((s: any) => {
                        const curState = studentPromoteState[s.id] || { action: 'PROMOTE', selected: true, targetClassId: promoteToClass };
                        const isSelected = curState.selected !== false;
                        const action = curState.action || 'PROMOTE';
                        const enrollment = s.classEnrollment?.[0];

                        return (
                          <tr key={s.id} className={`hover:bg-slate-50 transition ${!isSelected ? 'opacity-50 bg-gray-50' : ''}`}>
                            <td className="px-3 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  setStudentPromoteState({
                                    ...studentPromoteState,
                                    [s.id]: {
                                      ...curState,
                                      selected: e.target.checked,
                                    },
                                  });
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                              />
                            </td>

                            <td className="px-3 py-3 text-center font-bold text-gray-600">
                              {enrollment?.rollNo || '—'}
                            </td>

                            <td className="px-4 py-3">
                              <p className="font-bold text-gray-900">{s.fullName}</p>
                              {s.fullNameNepali && (
                                <p className="text-[10px] text-gray-500 font-nepali">{s.fullNameNepali}</p>
                              )}
                              <span className="text-[10px] text-gray-400">
                                {s.gender || 'N/A'} | DOB: {s.dateOfBirthBs || '—'}
                              </span>
                            </td>

                            <td className="px-4 py-3 font-mono text-[11px] font-bold text-slate-700">
                              {s.studentId}
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStudentPromoteState({
                                      ...studentPromoteState,
                                      [s.id]: { ...curState, action: 'PROMOTE', selected: true, targetClassId: promoteToClass },
                                    });
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                                    action === 'PROMOTE'
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                                >
                                  <span>🟢 स्तरोन्नति</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setStudentPromoteState({
                                      ...studentPromoteState,
                                      [s.id]: { ...curState, action: 'REPEAT', selected: true, targetClassId: promoteFromClass },
                                    });
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                                    action === 'REPEAT'
                                      ? 'bg-amber-600 text-white shadow-2xs'
                                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  }`}
                                >
                                  <span>🟡 दोहोर्‍याउने</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setStudentPromoteState({
                                      ...studentPromoteState,
                                      [s.id]: { ...curState, action: 'GRADUATE', selected: true },
                                    });
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                                    action === 'GRADUATE'
                                      ? 'bg-blue-600 text-white shadow-2xs'
                                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                  }`}
                                >
                                  <span>🎓 उत्तीर्ण</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setStudentPromoteState({
                                      ...studentPromoteState,
                                      [s.id]: { ...curState, action: 'TRANSFER', selected: true },
                                    });
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                                    action === 'TRANSFER'
                                      ? 'bg-rose-600 text-white shadow-2xs'
                                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                  }`}
                                >
                                  <span>🔴 सरुवा</span>
                                </button>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              {action === 'GRADUATE' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                                  <GraduationCap size={12} /> उत्तीर्ण / Alumni
                                </span>
                              ) : action === 'TRANSFER' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                                  <ArrowRightLeft size={12} /> स्थानान्तरण / TC
                                </span>
                              ) : (
                                <select
                                  value={curState.targetClassId || promoteToClass || ''}
                                  onChange={(e) => {
                                    setStudentPromoteState({
                                      ...studentPromoteState,
                                      [s.id]: {
                                        ...curState,
                                        targetClassId: e.target.value,
                                      },
                                    });
                                  }}
                                  className="erp-input text-xs py-1 font-semibold"
                                >
                                  <option value="">-- कक्षा छनोट --</option>
                                  {classesData
                                    ?.filter((c: any) => !promoteToYear || String(c.academicYearId) === String(promoteToYear))
                                    .map((c: any) => (
                                      <option key={c.id} value={c.id}>
                                        {c.name} {c.section ? `(${c.section})` : ''}
                                      </option>
                                    ))}
                                </select>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Execution Action Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100 pt-4">
                <div className="text-xs text-gray-600">
                  <span>जम्मा छनोट भएका विद्यार्थी: </span>
                  <strong className="font-bold text-emerald-800">
                    {sourceClassStudents.filter((s: any) => (studentPromoteState[s.id]?.selected ?? true)).length} जना
                  </strong>
                </div>

                <button
                  type="button"
                  disabled={
                    bulkUpgradeMutation.isPending ||
                    !promoteToYear ||
                    sourceClassStudents.length === 0
                  }
                  onClick={() => {
                    const selectedList = sourceClassStudents
                      .filter((s: any) => (studentPromoteState[s.id]?.selected ?? true))
                      .map((s: any) => {
                        const st = studentPromoteState[s.id] || { action: 'PROMOTE', targetClassId: promoteToClass };
                        return {
                          studentId: s.id,
                          action: st.action || 'PROMOTE',
                          targetClassId: st.targetClassId || promoteToClass,
                        };
                      });

                    if (selectedList.length === 0) {
                      toast.error('कृपया कम्तीमा एक विद्यार्थी छनोट गर्नुहोस्।');
                      return;
                    }

                    if (confirm(`के तपाईं ${selectedList.length} जना विद्यार्थीहरूलाई नयाँ शैक्षिक सत्रमा स्तरोन्नति/अपग्रेड गर्न निश्चित हुनुहुन्छ?`)) {
                      bulkUpgradeMutation.mutate({
                        fromAcademicYearId: promoteFromYear ? parseInt(promoteFromYear) : null,
                        fromClassId: promoteFromClass ? parseInt(promoteFromClass) : null,
                        toAcademicYearId: parseInt(promoteToYear),
                        toClassId: promoteToClass ? parseInt(promoteToClass) : null,
                        studentPromotions: selectedList,
                      });
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-2.5 font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 transition"
                >
                  {bulkUpgradeMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>स्तरोन्नति कार्य जारी छ...</span>
                    </>
                  ) : (
                    <>
                      <GraduationCap size={16} />
                      <span>विद्यार्थी स्तरोन्नति कार्यान्वयन गर्नुहोस् (Execute Promotion)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-12 text-center shadow-2xs">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 shadow-xs">
                <GraduationCap size={30} />
              </div>
              <h3 className="text-base font-bold text-gray-800 mb-1">
                विद्यार्थी स्तरोन्नतिका लागि कक्षा छनोट गर्नुहोस्
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                माथिको फारमबाट वर्तमान शैक्षिक सत्र र कक्षा छनोट गर्नासाथ विद्यार्थीहरूको सूची यहाँ देखा पर्नेछ।
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════ TAB 4: TRANSFERRED & ALUMNI ════════════════════ */}
      {activeTab === 'transferred' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
            <div>
              <h2 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-amber-600" />
                <span>Transferred & Alumni Records (स्थानान्तरण तथा पूर्व विद्यार्थी अभिलेख)</span>
              </h2>
              <p className="text-xs text-gray-500 font-nepali">
                अर्को विद्यालयमा स्थानान्तरण भएका वा उत्तीर्ण भएर गएका विद्यार्थीहरूको स्थायी अभिलेख
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Filter by Batch Year (e.g. 2081)..."
                value={batchYearFilter}
                onChange={(e) => setBatchYearFilter(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-mono"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-[#1e3a5f] text-white">
                  <tr>
                    <th className="px-4 py-3.5 font-bold uppercase">Student Name</th>
                    <th className="px-4 py-3.5 font-bold uppercase">Status</th>
                    <th className="px-4 py-3.5 font-bold uppercase">Transferred To (जाने विद्यालय)</th>
                    <th className="px-4 py-3.5 font-bold uppercase">School EMIS</th>
                    <th className="px-4 py-3.5 font-bold uppercase">TC No / Date</th>
                    <th className="px-4 py-3.5 font-bold uppercase">Reason</th>
                    <th className="px-4 py-3.5 font-bold uppercase text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isTransferredLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
                        <p className="mt-2 text-xs">Loading records...</p>
                      </td>
                    </tr>
                  ) : transferredList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <ArrowRightLeft size={32} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm font-semibold text-gray-600">No transferred records</p>
                        <p className="text-xs text-gray-400">Students marked as transferred will appear here.</p>
                      </td>
                    </tr>
                  ) : (
                    transferredList.map((st: any) => (
                      <tr key={st.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900">{st.fullName}</p>
                          <p className="text-[10px] text-gray-400 font-mono">ID: {st.studentId}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              st.status === 'TRANSFERRED'
                                ? 'bg-amber-100 text-amber-800'
                                : st.status === 'GRADUATED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {st.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-800">{st.transferSchoolName || '—'}</p>
                          <p className="text-[10px] text-gray-500">{st.transferAddress || '—'}</p>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">
                          {st.transferEmisCode || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-mono font-bold text-purple-700">{st.tcNumber || '—'}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{st.transferDateBs || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate">
                          {st.transferReason || '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              if (confirm(`Reactivate ${st.fullName} back into active school directory?`)) {
                                reactivateMutation.mutate(st.id);
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white px-2.5 py-1 text-[11px] font-bold text-emerald-700 transition"
                            title="Reactivate student back to active school directory"
                          >
                            <RotateCcw size={12} />
                            <span>Reactivate</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ TAB 4: DEMOGRAPHICS & ANALYTICS ════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {isAnalyticsLoading ? (
            <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-100 p-8 shadow-xs">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-[#1e3a5f] border-t-transparent" />
              <p className="mt-3 text-xs font-semibold text-gray-600">लोड हुँदैछ... Fetching comprehensive demographic analytics...</p>
            </div>
          ) : (
            <>
              {/* Header Banner */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-[#1e3a5f] to-[#0f243e] p-5 rounded-2xl text-white shadow-md">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-white/10 rounded-xl">
                      <PieChart size={20} className="text-amber-400" />
                    </span>
                    <div>
                      <h2 className="text-base font-extrabold tracking-wide">Student Demographics & Academic Analytics</h2>
                      <p className="text-xs text-blue-100/80 font-nepali">विद्यार्थी जनसांख्यिकी, उत्तीर्ण दर, मातृभाषा तथा कक्षागत विस्तृत विश्लेषण</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                  {/* Academic Year Filter Dropdown */}
                  <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-xl px-2.5 py-1 backdrop-blur-xs">
                    <span className="text-[11px] font-bold text-blue-200">शैक्षिक सत्र:</span>
                    <select
                      value={analyticsYear}
                      onChange={(e) => setAnalyticsYear(e.target.value)}
                      className="bg-transparent text-xs font-bold text-white focus:outline-hidden cursor-pointer"
                    >
                      <option value="" className="text-gray-900 bg-white">-- सबै / सक्रिय सत्र (Active Year) --</option>
                      {academicYearsData?.map((ay: any) => (
                        <option key={ay.id} value={ay.id} className="text-gray-900 bg-white">
                          सत्र {ay.year} {ay.isActive ? '⭐ (चालू सत्र)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['student-analytics'] })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition backdrop-blur-xs border border-white/10 shadow-xs"
                    title="Reload Live Analytics Data"
                  >
                    <RefreshCw size={13} />
                    <span>Refresh Data</span>
                  </button>
                </div>
              </div>

              {/* ─── ROW 1: 5 KEY DEMOGRAPHIC & ACADEMIC KPI CARDS ─── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1. Active Enrolled Students */}
                <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/50 p-4 shadow-2xs relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Students</p>
                    <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                      <Users size={14} />
                    </span>
                  </div>
                  <p className="text-2xl font-black text-[#1e3a5f] mt-1.5">{analyticsData?.summary?.totalActive || 0}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-gray-600 pt-2 border-t border-blue-100/60 font-nepali">
                    <span>चालु भर्ना संख्या</span>
                    <span className="font-sans font-bold text-blue-700">कुल {analyticsData?.summary?.total || 0}</span>
                  </div>
                </div>

                {/* 2. Gender Ratio (Girls vs Boys) */}
                <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-white to-pink-50/50 p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gender Ratio</p>
                    <span className="p-1.5 rounded-lg bg-pink-100 text-pink-700">
                      <Sparkles size={14} />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="text-lg font-black text-blue-700">
                      ♂ {analyticsData?.rates?.boyPercentage || 0}%
                    </span>
                    <span className="text-xs text-gray-400 font-bold">:</span>
                    <span className="text-lg font-black text-pink-600">
                      ♀ {analyticsData?.rates?.girlPercentage || 0}%
                    </span>
                  </div>
                  {/* Visual Dual Progress Bar */}
                  <div className="mt-2">
                    <div className="h-2 w-full bg-pink-200 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${analyticsData?.rates?.boyPercentage ?? 0}%` }}
                        className="bg-blue-600 h-full"
                        title={`Boys: ${analyticsData?.genderDistribution?.MALE || 0}`}
                      />
                      <div
                        style={{ width: `${analyticsData?.rates?.girlPercentage ?? 0}%` }}
                        className="bg-pink-500 h-full"
                        title={`Girls: ${analyticsData?.genderDistribution?.FEMALE || 0}`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 font-bold mt-1">
                      <span className="text-blue-700">छात्र: {analyticsData?.genderDistribution?.MALE || 0}</span>
                      <span className="text-pink-600">छात्रा: {analyticsData?.genderDistribution?.FEMALE || 0}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Academic Passed Rate */}
                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/50 p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Passed Rate</p>
                    <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                      <Award size={14} />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <p className="text-2xl font-black text-emerald-700">{analyticsData?.rates?.passedRate ?? 0}%</p>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-100 px-1.5 py-0.5 rounded">
                      उत्तीर्ण
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="h-2 w-full bg-emerald-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${analyticsData?.rates?.passedRate ?? 0}%` }}
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      />
                    </div>
                    <p className="text-[10px] text-emerald-700 font-semibold mt-1 font-nepali">शैक्षिक स्तर तथा स्तरोन्नति</p>
                  </div>
                </div>

                {/* 4. Transferred vs Retention Rate */}
                <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/50 p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Retention Rate</p>
                    <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                      <ArrowRightLeft size={14} />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <p className="text-2xl font-black text-[#1e3a5f]">{analyticsData?.rates?.retentionRate ?? 0}%</p>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      स्था. {analyticsData?.rates?.transferredRate || 0}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="h-2 w-full bg-amber-200 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${analyticsData?.rates?.retentionRate ?? 0}%` }}
                        className="bg-[#1e3a5f] h-full"
                        title="Retention Rate"
                      />
                      <div
                        style={{ width: `${analyticsData?.rates?.transferredRate ?? 0}%` }}
                        className="bg-amber-500 h-full"
                        title="Transferred Rate"
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 font-semibold mt-1 font-nepali">
                      स्थानान्तरण: {analyticsData?.summary?.totalTransferred || 0} जना
                    </p>
                  </div>
                </div>

                {/* 5. Online Portal Login Users */}
                <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50 p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Portal Logins</p>
                    <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                      <KeyRound size={14} />
                    </span>
                  </div>
                  <p className="text-2xl font-black text-indigo-700 mt-1.5">{analyticsData?.summary?.activeUsersWithLogin || 0}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-indigo-900 pt-2 border-t border-indigo-100/60 font-nepali">
                    <span>अनलाइन अकाउन्ट</span>
                    <span className="font-sans font-bold text-indigo-600">
                      {analyticsData?.summary?.totalActive > 0
                        ? Math.round(((analyticsData?.summary?.activeUsersWithLogin || 0) / analyticsData?.summary?.totalActive) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* ─── ROW 2: CLASS-WISE ENROLLMENT & GENDER DISTRIBUTION (CHART & TABLE) ─── */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
                <div className="border-b border-gray-100 px-5 py-4 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-extrabold text-[#1e3a5f] uppercase tracking-wider flex items-center gap-2">
                      <Building size={16} className="text-[#1e3a5f]" />
                      <span>Class-wise Student Enrollment & Gender Distribution (कक्षागत विद्यार्थी संख्या)</span>
                    </h3>
                    <p className="text-[11px] text-gray-500 font-nepali mt-0.5">
                      शिशु (ECD) देखि कक्षा १२ सम्मको छात्र/छात्रा संख्या र लैंगिक अनुपात
                    </p>
                  </div>

                  {/* View Mode Toggle: Chart vs Table */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 self-start sm:self-auto shadow-2xs">
                    <button
                      onClick={() => setAnalyticsViewMode('chart')}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition ${
                        analyticsViewMode === 'chart'
                          ? 'bg-[#1e3a5f] text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <BarChart3 size={13} />
                      <span>Bar Chart</span>
                    </button>
                    <button
                      onClick={() => setAnalyticsViewMode('table')}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition ${
                        analyticsViewMode === 'table'
                          ? 'bg-[#1e3a5f] text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <FileCheck size={13} />
                      <span>Data Table</span>
                    </button>
                  </div>
                </div>

                {/* ── Visual Bar Chart Mode ── */}
                {analyticsViewMode === 'chart' ? (
                  <div className="p-6">
                    {/* Legend */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-gray-100 text-xs">
                      <div className="flex items-center gap-5">
                        <div className="flex items-center gap-2">
                          <span className="h-3.5 w-3.5 rounded-md bg-blue-600 shadow-2xs" />
                          <span className="font-bold text-gray-700">Boys (छात्र संख्या)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-3.5 w-3.5 rounded-md bg-pink-500 shadow-2xs" />
                          <span className="font-bold text-gray-700">Girls (छात्रा संख्या)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-3.5 w-3.5 rounded-md bg-purple-400 shadow-2xs" />
                          <span className="font-bold text-gray-700">Other (अन्य)</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-gray-500 font-nepali">
                        प्रत्येक कक्षामा छात्र र छात्राको तुलनात्मक बार
                      </span>
                    </div>

                    {/* Chart Container */}
                    {(!analyticsData?.classStats || analyticsData.classStats.length === 0) ? (
                      <div className="py-12 text-center text-gray-400 text-xs">
                        No class enrollment data available.
                      </div>
                    ) : (
                      <div className="mt-6">
                        {/* Calculate max total for scale */}
                        {(() => {
                          const maxClassTotal = Math.max(...analyticsData.classStats.map((c: any) => c.total || 1), 1);
                          return (
                            <div className="space-y-4">
                              {analyticsData.classStats.map((cs: any) => {
                                const total = cs.total || (cs.boys + cs.girls + cs.other);
                                const boyPct = total > 0 ? Math.round((cs.boys / total) * 100) : 0;
                                const girlPct = total > 0 ? Math.round((cs.girls / total) * 100) : 0;
                                const widthPct = Math.max(8, Math.round((total / maxClassTotal) * 100));

                                return (
                                  <div key={cs.id} className="group p-2.5 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-gray-100">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs mb-1.5">
                                      <div className="flex items-center gap-2">
                                        <span className="font-black text-[#1e3a5f] text-sm tracking-tight min-w-[130px]">
                                          {cs.name} {cs.section ? `(${cs.section})` : ''}
                                        </span>
                                        <span className="font-extrabold text-gray-900 bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md text-[11px] border border-blue-100">
                                          Total: {total}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3 text-[11px] font-mono">
                                        <span className="text-blue-700 font-bold">♂ {cs.boys} ({boyPct}%)</span>
                                        <span className="text-pink-600 font-bold">♀ {cs.girls} ({girlPct}%)</span>
                                        {cs.other > 0 && <span className="text-purple-600 font-bold">• {cs.other}</span>}
                                      </div>
                                    </div>

                                    {/* Multi-Segment Proportion Bar */}
                                    <div className="relative h-6 bg-slate-100 rounded-lg overflow-hidden flex items-center shadow-inner">
                                      {/* Total scale bar container */}
                                      <div style={{ width: `${widthPct}%` }} className="h-full flex transition-all duration-500">
                                        {cs.boys > 0 && (
                                          <div
                                            style={{ width: `${(cs.boys / total) * 100}%` }}
                                            className="bg-gradient-to-r from-blue-700 to-blue-500 h-full flex items-center justify-center text-[10px] font-bold text-white overflow-hidden px-1"
                                            title={`Boys: ${cs.boys} (${boyPct}%)`}
                                          >
                                            {cs.boys >= 3 ? `${cs.boys}` : ''}
                                          </div>
                                        )}
                                        {cs.girls > 0 && (
                                          <div
                                            style={{ width: `${(cs.girls / total) * 100}%` }}
                                            className="bg-gradient-to-r from-pink-500 to-rose-500 h-full flex items-center justify-center text-[10px] font-bold text-white overflow-hidden px-1"
                                            title={`Girls: ${cs.girls} (${girlPct}%)`}
                                          >
                                            {cs.girls >= 3 ? `${cs.girls}` : ''}
                                          </div>
                                        )}
                                        {cs.other > 0 && (
                                          <div
                                            style={{ width: `${(cs.other / total) * 100}%` }}
                                            className="bg-purple-500 h-full flex items-center justify-center text-[10px] font-bold text-white overflow-hidden px-1"
                                            title={`Other: ${cs.other}`}
                                          >
                                            {cs.other}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {/* Summary metrics footer */}
                        <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/50 p-3 rounded-xl">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-500">Total Active Classes:</span>
                            <span className="font-extrabold text-[#1e3a5f] font-mono">{analyticsData?.classStats?.length || 0}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-500">Avg Class Strength:</span>
                            <span className="font-extrabold text-blue-700 font-mono">
                              {analyticsData?.classStats?.length > 0
                                ? Math.round((analyticsData?.summary?.totalActive || 0) / analyticsData.classStats.length)
                                : 0} students
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-500">Gender Parity Index:</span>
                            <span className="font-extrabold text-emerald-700 font-mono">
                              {analyticsData?.rates?.boyPercentage > 0
                                ? (analyticsData?.rates?.girlPercentage / analyticsData?.rates?.boyPercentage).toFixed(2)
                                : '1.00'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Detailed Table Mode ── */
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-700">
                      <thead className="bg-[#1e3a5f] text-white">
                        <tr>
                          <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Class / Section (कक्षा)</th>
                          <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-center bg-blue-800">Boys (छात्र)</th>
                          <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-center bg-pink-800">Girls (छात्रा)</th>
                          <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-center">Other</th>
                          <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-center bg-slate-900">Total (जम्मा)</th>
                          <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-center">Gender Ratio Breakdown</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {analyticsData?.classStats?.map((cs: any) => {
                          const total = cs.total || (cs.boys + cs.girls + cs.other);
                          const boyPct = total > 0 ? Math.round((cs.boys / total) * 100) : 0;
                          const girlPct = total > 0 ? Math.round((cs.girls / total) * 100) : 0;
                          return (
                            <tr key={cs.id} className="hover:bg-blue-50/30 transition">
                              <td className="px-4 py-3 font-extrabold text-gray-900">
                                {cs.name} {cs.section ? `(${cs.section})` : ''}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-blue-700">{cs.boys}</td>
                              <td className="px-4 py-3 text-center font-bold text-pink-700">{cs.girls}</td>
                              <td className="px-4 py-3 text-center text-gray-500">{cs.other}</td>
                              <td className="px-4 py-3 text-center font-black text-gray-900 bg-slate-50">
                                {total}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2 max-w-[150px] mx-auto">
                                  <span className="text-[10px] font-mono text-blue-700 font-bold">{boyPct}%</span>
                                  <div className="flex-1 h-2 bg-pink-200 rounded-full overflow-hidden flex">
                                    <div style={{ width: `${boyPct}%` }} className="bg-blue-600 h-full" />
                                  </div>
                                  <span className="text-[10px] font-mono text-pink-600 font-bold">{girlPct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ─── ROW 3: MOTHER TONGUE & LANGUAGE DISTRIBUTION ─── */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-xs font-extrabold text-[#1e3a5f] uppercase tracking-wider flex items-center gap-2">
                      <Languages size={16} className="text-indigo-600" />
                      <span>Mother Tongue & Language Demographics (मातृभाषा अनुसार विद्यार्थी विवरण)</span>
                    </h3>
                    <p className="text-[11px] text-gray-500 font-nepali mt-0.5">
                      IEMIS अभिलेख तथा विद्यार्थी फारम अनुसार मातृभाषाको प्रतिशत तथा संख्या
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 self-start sm:self-auto font-nepali">
                    भाषिक विविधता सूचक
                  </span>
                </div>

                {/* Multi-segment Language Distribution Bar */}
                {analyticsData?.languages && analyticsData.languages.length > 0 && (
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                      {analyticsData.languages.map((lang: any, index: number) => {
                        const colors = [
                          'bg-blue-600',
                          'bg-emerald-600',
                          'bg-amber-500',
                          'bg-pink-500',
                          'bg-purple-600',
                          'bg-cyan-600',
                          'bg-rose-600',
                          'bg-indigo-600',
                        ];
                        const colorClass = colors[index % colors.length];
                        return (
                          <div
                            key={lang.name}
                            style={{ width: `${Math.max(lang.percentage, 2)}%` }}
                            className={`${colorClass} h-full transition-all duration-500`}
                            title={`${lang.name}: ${lang.count} (${lang.percentage}%)`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Language Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
                  {analyticsData?.languages?.map((lang: any, index: number) => {
                    const bgColors = [
                      'bg-blue-50 border-blue-200 text-blue-900',
                      'bg-emerald-50 border-emerald-200 text-emerald-900',
                      'bg-amber-50 border-amber-200 text-amber-900',
                      'bg-pink-50 border-pink-200 text-pink-900',
                      'bg-purple-50 border-purple-200 text-purple-900',
                      'bg-cyan-50 border-cyan-200 text-cyan-900',
                      'bg-rose-50 border-rose-200 text-rose-900',
                      'bg-indigo-50 border-indigo-200 text-indigo-900',
                    ];
                    const bgStyle = bgColors[index % bgColors.length];

                    return (
                      <div
                        key={lang.name}
                        className={`p-3.5 rounded-xl border ${bgStyle} shadow-2xs flex flex-col justify-between`}
                      >
                        <div className="flex items-start justify-between">
                          <p className="font-extrabold text-xs">{lang.name}</p>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80 border border-current">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-lg font-black font-mono">{lang.count}</span>
                          <span className="text-xs font-bold">{lang.percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ─── ROW 4: AGE DEMOGRAPHICS, INCLUSIVITY & BIRTHDAY CELEBRATIONS ─── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Age Group Demographics */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-4">
                  <div className="border-b border-gray-100 pb-2">
                    <h3 className="text-xs font-extrabold text-[#1e3a5f] uppercase tracking-wider flex items-center gap-2">
                      <Users size={15} />
                      <span>Age Groups (उमेर समूह वितरण)</span>
                    </h3>
                    <p className="text-[10px] text-gray-500 font-nepali">विद्यार्थीहरूको उमेर विभाजन</p>
                  </div>
                  <div className="space-y-3 pt-1">
                    {analyticsData?.ageGroups &&
                      Object.entries(analyticsData.ageGroups).map(([group, count]: [string, any]) => {
                        const totalActive = analyticsData?.summary?.totalActive || 1;
                        const pct = Math.round((count / totalActive) * 100);
                        return (
                          <div key={group} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span>Age {group} Years</span>
                              <span className="font-mono text-gray-700 font-bold">
                                {count} students ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${pct}%` }}
                                className="h-full bg-gradient-to-r from-[#1e3a5f] to-blue-500 rounded-full transition-all duration-500"
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* 2. Inclusivity & Special Needs Support */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-4">
                  <div className="border-b border-gray-100 pb-2">
                    <h3 className="text-xs font-extrabold text-[#1e3a5f] uppercase tracking-wider flex items-center gap-2">
                      <HeartHandshake size={15} className="text-emerald-600" />
                      <span>Inclusive Education (समावेशी शिक्षा)</span>
                    </h3>
                    <p className="text-[10px] text-gray-500 font-nepali">अपाङ्गता तथा फरक क्षमता स्थिति</p>
                  </div>
                  <div className="space-y-3 pt-1">
                    {analyticsData?.disabilityDistribution &&
                      Object.entries(analyticsData.disabilityDistribution).map(([type, count]: [string, any]) => {
                        const total = analyticsData?.summary?.total || 1;
                        const pct = Math.round((count / total) * 100);
                        const isSpecial = type.includes('अपाङ्गता') || type.includes('Differently');
                        return (
                          <div
                            key={type}
                            className={`p-3 rounded-xl border ${
                              isSpecial
                                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                                : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span>{type}</span>
                              <span className="font-mono font-black text-sm">{count}</span>
                            </div>
                            <div className="mt-2 h-2 w-full bg-white/80 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${pct}%` }}
                                className={`h-full rounded-full ${isSpecial ? 'bg-amber-500' : 'bg-emerald-600'}`}
                              />
                            </div>
                            <div className="mt-1 text-right text-[10px] font-mono font-bold">
                              {pct}% of students
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* 3. Birthdays This Month & Today */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-4">
                  <div className="border-b border-gray-100 pb-2">
                    <h3 className="text-xs font-extrabold text-[#1e3a5f] uppercase tracking-wider flex items-center gap-2">
                      <Cake size={15} className="text-pink-600" />
                      <span>Student Birthdays (जन्मदिन शुभकामना)</span>
                    </h3>
                    <p className="text-[10px] text-gray-500 font-nepali">आज र आगामी १४ दिन भित्रका जन्मदिन</p>
                  </div>
                  {(!analyticsData?.birthdaysThisMonth || analyticsData.birthdaysThisMonth.length === 0) ? (
                    <div className="py-8 text-center text-gray-400 text-xs">
                      No student birthdays recorded for this month.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {analyticsData.birthdaysThisMonth.map((st: any) => (
                        <div
                          key={st.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-pink-50/60 border border-pink-100 text-xs hover:bg-pink-100/50 transition"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-pink-200 text-pink-800 flex items-center justify-center font-bold text-xs shadow-2xs">
                              🎂
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{st.fullName || st.name}</p>
                              <p className="text-[10px] text-gray-500">
                                Class: {st.classEnrollment?.[0]?.class?.name || st.class || '—'}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-pink-700 bg-white px-2 py-0.5 rounded-lg border border-pink-200 shadow-2xs text-[11px]">
                            {st.dateOfBirthBs || st.dateBs || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── MODAL: TRANSFER OUT STUDENT ──────────────────────────────────── */}
      {transferModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1e3a5f]">Transfer Student Out (स्थानान्तरण फारम)</h3>
                <p className="text-[11px] text-gray-500">
                  {transferModalStudent.fullName} (ID: {transferModalStudent.studentId})
                </p>
              </div>
              <button onClick={() => setTransferModalStudent(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Destination School Name (जाने विद्यालयको नाम) *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Tribhuvan Secondary School"
                  value={transferForm.transferSchoolName}
                  onChange={(e) => setTransferForm({ ...transferForm, transferSchoolName: e.target.value })}
                  className="erp-input font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">School EMIS Code (विद्यालयको EMIS कोड)</label>
                  <input
                    type="text"
                    placeholder="e.g. 320160002"
                    value={transferForm.transferEmisCode}
                    onChange={(e) => setTransferForm({ ...transferForm, transferEmisCode: e.target.value })}
                    className="erp-input font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Transfer Date BS (मिति)</label>
                  <input
                    type="text"
                    value={transferForm.transferDateBs}
                    onChange={(e) => setTransferForm({ ...transferForm, transferDateBs: e.target.value })}
                    className="erp-input font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Destination Address (ठेगाना)</label>
                  <input
                    type="text"
                    placeholder="Kathmandu, Nepal"
                    value={transferForm.transferAddress}
                    onChange={(e) => setTransferForm({ ...transferForm, transferAddress: e.target.value })}
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">TC Number (प्रमाणपत्र / चलानी नं.)</label>
                  <input
                    type="text"
                    placeholder="TC-2081-001"
                    value={transferForm.tcNumber}
                    onChange={(e) => setTransferForm({ ...transferForm, tcNumber: e.target.value })}
                    className="erp-input font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Reason for Transfer (स्थानान्तरणको कारण)</label>
                <input
                  type="text"
                  value={transferForm.transferReason}
                  onChange={(e) => setTransferForm({ ...transferForm, transferReason: e.target.value })}
                  className="erp-input"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong>नोट:</strong> स्थानान्तरण गरेपछि विद्यार्थी चालु नामावलीबाट हटेर "स्थानान्तरण अभिलेख" मा
                सुरक्षित रहनेछ। भविष्यमा पुनः भर्ना भएमा एक क्लिकमै सक्रिय गर्न सकिनेछ।
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setTransferModalStudent(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={transferMutation.isPending || !transferForm.transferSchoolName}
                onClick={() => transferMutation.mutate()}
                className="rounded-xl bg-amber-600 px-5 py-2 font-bold text-white hover:bg-amber-700 transition disabled:opacity-60"
              >
                {transferMutation.isPending ? 'Processing...' : 'Confirm Transfer (स्थानान्तरण सम्पन्न गर्नुहोस्)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: RESET PASSWORD ────────────────────────────────────────── */}
      {resetModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-[#1e3a5f] flex items-center gap-2">
                <KeyRound size={15} />
                <span>Reset Password</span>
              </h3>
              <button onClick={() => setResetModalStudent(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div>
              <p className="text-gray-700 font-semibold mb-1">
                Student: <strong>{resetModalStudent.fullName}</strong>
              </p>
              <p className="text-gray-500 font-mono text-[11px] mb-3">
                Login ID: {resetModalStudent.studentId}
              </p>

              <label className="block font-bold text-gray-700 mb-1">New Password *</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 chars)"
                className="erp-input font-mono font-bold"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetModalStudent(null)}
                className="rounded-xl border border-gray-200 px-4 py-1.5 font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetPasswordMutation.isPending || !newPassword}
                onClick={() => resetPasswordMutation.mutate()}
                className="rounded-xl bg-[#1e3a5f] px-5 py-1.5 font-bold text-white hover:bg-[#2a5280] disabled:opacity-60"
              >
                {resetPasswordMutation.isPending ? 'Saving...' : 'Set Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: IEMIS EXCEL BULK IMPORT ───────────────────────────────── */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#1e3a5f] flex items-center gap-2">
                  <FileSpreadsheet className="text-emerald-600" size={20} />
                  <span>IEMIS Excel Bulk Import / विद्यार्थी आयात</span>
                </h2>
                <p className="text-[11px] text-gray-500">
                  नेपाल सरकारको आधिकारिक IEMIS Excel (.xlsx / .xls / .csv) बाट चालू वा विगतका शैक्षिक सत्रका विद्यार्थी आयात गर्नुहोस्
                </p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {/* Template Download & Format Guide Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-600 text-white">
                  <FileSpreadsheet size={16} />
                </span>
                <div>
                  <p className="text-xs font-bold text-emerald-950">आधिकारिक एक्सेल ढाँचा (Standard Excel Template)</p>
                  <p className="text-[10px] text-emerald-700">IEMIS तथा नेपाल मावि ERP अनुकूल एक्सेल ढाँचा</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFormatGuide(!showFormatGuide)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
                >
                  {showFormatGuide ? 'स्तम्भ ढाँचा लुकाउनुहोस्' : 'स्तम्भ विवरण (Columns Format)'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-[11px] font-bold text-white transition shadow-xs"
                >
                  <Download size={13} />
                  <span>ढाँचा डाउनलोड (Download Template)</span>
                </button>
              </div>
            </div>

            {/* Collapsible Format Guide Table */}
            {showFormatGuide && (
              <div className="rounded-xl border border-gray-200 bg-slate-50 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-gray-200">
                  <span className="font-extrabold text-[#1e3a5f]">Excel स्तम्भहरूको विवरण (Supported Columns):</span>
                  <span className="text-[10px] text-gray-500 font-mono">*.xlsx / *.xls / *.csv</span>
                </div>
                <div className="overflow-x-auto max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-200/80 text-gray-700 font-bold sticky top-0">
                      <tr>
                        <th className="p-1.5">Column Header (IEMIS स्तम्भ)</th>
                        <th className="p-1.5">Required?</th>
                        <th className="p-1.5">Sample Value (उदाहरण)</th>
                        <th className="p-1.5">विवरण</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white font-sans">
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Student IEMIS Id / Student Id</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1 rounded">वैकल्पिक</span></td>
                        <td className="p-1.5 font-mono text-gray-600">3201600058003308</td>
                        <td className="p-1.5 text-gray-600">विद्यार्थीको विशिष्ट पहिचान (दोहोरो भर्ना रोक्न र विगत सत्र लिङ्क गर्न)</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-emerald-800">Student Name / FullName</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-red-700 bg-red-50 px-1 rounded">अनिवार्य *</span></td>
                        <td className="p-1.5 text-gray-600">Aachal Kumari</td>
                        <td className="p-1.5 text-gray-600">विद्यार्थीको पूरा नाम (अङ्ग्रेजीमा)</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Student Name in Nepali</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 text-gray-600">आँचल कुमारी</td>
                        <td className="p-1.5 text-gray-600">नेपालीमा पूरा नाम</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Class</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1 rounded">वैकल्पिक</span></td>
                        <td className="p-1.5 text-gray-600">8 / 6 / 3 / 2 / Nursery</td>
                        <td className="p-1.5 text-gray-600">कक्षा स्वतः पहिचान तथा भर्ना हुन्छ</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Section</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 text-gray-600">A / B / C</td>
                        <td className="p-1.5 text-gray-600">कक्षा सेक्सनल समूह</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Gender</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 text-gray-600">Female / Male / छात्रा / छात्र</td>
                        <td className="p-1.5 text-gray-600">विद्यार्थीको लिंग</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">DOB (Date of Birth)</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 font-mono text-gray-600">2068-06-17 / 2075-07-27</td>
                        <td className="p-1.5 text-gray-600">जन्म मिति (वि.सं.) — उमेर स्वतः गणना हुन्छ</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-rose-700">Blood Group</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 font-mono text-gray-600">A+ / B+ / O+ / AB+ / O-</td>
                        <td className="p-1.5 text-gray-600">विद्यार्थीको रक्त समूह</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-amber-800">Ethnicity / Caste / Mother Tongue</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 text-gray-600">Dalit / Janajati / Madhesi / Kurmi / Bajjika</td>
                        <td className="p-1.5 text-gray-600">जात / जाति / मातृभाषा जनसांख्यिकी</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Religion</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 text-gray-600">Hindu / Islam / Buddhist / Christian</td>
                        <td className="p-1.5 text-gray-600">धर्म</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Father Name / Mother Name</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 text-gray-600">Rajesh Raut / Gujeshwori Devi</td>
                        <td className="p-1.5 text-gray-600">बुवा तथा आमाको नाम</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Guardian Name & Contact & Relation</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 font-mono text-gray-600">9825519506 (Father)</td>
                        <td className="p-1.5 text-gray-600">अभिभावकको नाम, फोन नम्बर र नाता</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Permanent Address</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 text-gray-600">Brindaban-1, Rautahat</td>
                        <td className="p-1.5 text-gray-600">स्थायी ठेगाना</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Disability Type</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 text-gray-600">No Disability / None / अपाङ्गता</td>
                        <td className="p-1.5 text-gray-600">समावेशी शिक्षा स्थिति</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Previous School</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 text-gray-600">Bal Kalyan Ma.Vi.</td>
                        <td className="p-1.5 text-gray-600">अघिल्लो विद्यालय</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Admission Date</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 font-mono text-gray-600">2081-01-15</td>
                        <td className="p-1.5 text-gray-600">भर्ना मिति (वि.सं.)</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-mono font-bold text-blue-700">Is Transferred</td>
                        <td className="p-1.5"><span className="text-[10px] font-bold text-gray-500">वैकल्पिक</span></td>
                        <td className="p-1.5 text-gray-600">No / Yes</td>
                        <td className="p-1.5 text-gray-600">सरुवा भइसकेका विद्यार्थीहरूलाई सिधै सरुवा अभिलेखमा राख्छ</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <form onSubmit={handleBulkImportSubmit} className="space-y-4 text-xs mt-3">
              {/* Rules & Intelligence Banner */}
              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-3.5 text-blue-900 space-y-2 text-[11px]">
                <div className="font-bold flex items-center gap-1.5 text-blue-800">
                  <Sparkles size={15} className="text-indigo-600" />
                  <span>प्रणालीगत स्मार्ट स्तरोन्नति तथा पहिचान (Smart Upgrade & Identity Linking):</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-blue-800/90 text-[10.5px]">
                  <li>
                    <strong>एउटै विद्यार्थी (Same Student ID):</strong> यदि सोही Student ID / EMIS Code को विद्यार्थी प्रणालीमा पहिले नै छ भने, दोहोरो खाता नबनाई सोही विद्यार्थीको कक्षा अभिलेख (History) मा यो सत्रको कक्षा जोडिन्छ।
                  </li>
                  <li>
                    <strong>विगत सत्र (Past Academic Year):</strong> विगत सत्रको फाइल आयात गर्दा विद्यार्थीको हालको सक्रिय कक्षा प्रभावित हुँदैन, ऐतिहासिक शैक्षिक अभिलेख सुरक्षित रहन्छ।
                  </li>
                </ul>
              </div>

              {/* Academic Year Selection */}
              <div className="rounded-xl border border-gray-200 bg-slate-50/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-gray-800">
                    शैक्षिक सत्र छनोट (Academic Year) *
                  </label>
                  {!isCreatingNewYear && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewYear(true)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                    >
                      <Plus size={13} /> नयाँ शैक्षिक सत्र थप्नुहोस्
                    </button>
                  )}
                </div>

                {isCreatingNewYear ? (
                  <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-blue-200">
                    <input
                      type="text"
                      placeholder="e.g. 2080-81 वा 2079-80"
                      value={newYearInput}
                      onChange={(e) => setNewYearInput(e.target.value)}
                      className="erp-input text-xs py-1.5 flex-1"
                    />
                    <button
                      type="button"
                      disabled={!newYearInput || quickCreateYearMutation.isPending}
                      onClick={() => quickCreateYearMutation.mutate(newYearInput)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs"
                    >
                      {quickCreateYearMutation.isPending ? 'थप्दै...' : 'सुरक्षित गर्नुहोस्'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewYear(false)}
                      className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg text-xs"
                    >
                      रद्द
                    </button>
                  </div>
                ) : (
                  <select
                    value={importAcademicYearId}
                    onChange={(e) => setImportAcademicYearId(e.target.value)}
                    className="erp-input bg-white font-medium"
                  >
                    <option value="">-- चालू / सक्रिय शैक्षिक सत्र (Active Year) --</option>
                    {academicYearsData?.map((ay: any) => (
                      <option key={ay.id} value={ay.id}>
                        सत्र: {ay.year} {ay.isActive ? '⭐ (चालू / सक्रिय सत्र - Active Year)' : '(विगत सत्र - Past Year)'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Missing EMIS ID / Transferred Toggle */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={treatNoEmisAsTransferred}
                    onChange={(e) => setTreatNoEmisAsTransferred(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-amber-950 block">
                      EMIS ID नभएका विद्यार्थीहरूलाई स्वतः 'सरुवा (Transferred)' अभिलेखमा राख्ने
                    </span>
                    <span className="text-[11px] text-amber-800 block mt-0.5">
                      विगतका सत्रमा विद्यालय छोडेका वा सरुवा भएका (EMIS ID नभएका) विद्यार्थीहरूलाई सक्रिय विद्यार्थी सूचीमा नराखी सरुवा/पूर्व विद्यार्थी (Transferred Alumni) अभिलेखमा सुरक्षित राख्छ।
                    </span>
                  </div>
                </label>
              </div>

              {/* Class Selection */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  निश्चित कक्षामा मात्र भर्ना गर्न चाहेमा छनोट गर्नुहोस् (वैकल्पिक / Optional):
                </label>
                <select
                  value={importClassId}
                  onChange={(e) => setImportClassId(e.target.value)}
                  className="erp-input"
                >
                  <option value="">Excel को 'CurrentClass' स्तम्भबाट स्वतः कक्षा पहिचान गर्ने (Smart Multi-Class)</option>
                  {classesData?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.section ? `(${c.section})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* File Upload Zone */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Select Excel (.xlsx / .xls) File *</label>
                <div className="mt-1 flex justify-center rounded-2xl border-2 border-dashed border-gray-200 px-6 pt-5 pb-6 text-center hover:border-emerald-400 transition bg-slate-50">
                  <div className="space-y-1 text-center">
                    <Upload size={28} className="mx-auto text-emerald-600 mb-1" />
                    <div className="flex text-xs text-gray-600 justify-center">
                      <label className="relative cursor-pointer rounded-md font-bold text-emerald-600 hover:underline">
                        <span>Browse file</span>
                        <input
                          type="file"
                          accept=".xlsx, .xls, .csv"
                          onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    {importFile ? (
                      <p className="text-xs font-bold text-emerald-700 mt-2 flex items-center justify-center gap-1">
                        <CheckCircle2 size={14} /> {importFile.name}
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-400">Nepal IEMIS Exported Excel Sheet (.xlsx / .xls)</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  रद्द गर्नुहोस् (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={!importFile || bulkImportMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 shadow-xs"
                >
                  {bulkImportMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>IEMIS विवरण प्रशोधन तथा आयात हुँदैछ...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>विद्यार्थी आयात गर्नुहोस् (Import Students)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════ EDIT STUDENT MODAL ════════════════════ */}
      {editModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-gray-100 my-8 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-[#1e3a5f] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Pencil size={18} className="text-amber-400" />
                  <span>विद्यार्थीको सम्पूर्ण विवरण सम्पादन (Edit Student Details)</span>
                </h3>
                <p className="text-xs text-blue-200 font-nepali mt-0.5">
                  {editModalStudent.fullName} ({editModalStudent.studentId || editModalStudent.emisId})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalStudent(null)}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editForm.fullName || !editForm.fullName.trim()) {
                  toast.error('विद्यार्थीको पूरा नाम अनिवार्य छ');
                  return;
                }
                editStudentMutation.mutate({
                  id: editModalStudent.id,
                  data: editForm,
                });
              }}
              className="p-6 space-y-6 max-h-[78vh] overflow-y-auto"
            >
              {/* Student Photo Section (Auto <= 50KB) */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="relative group shrink-0">
                  <div className="w-24 h-32 rounded-xl border-2 border-dashed border-blue-300 bg-white overflow-hidden flex flex-col items-center justify-center shadow-xs">
                    {editForm.photoUrl ? (
                      <img
                        src={editForm.photoUrl}
                        alt={editForm.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400">
                        <Camera size={24} className="mb-1 text-slate-300" />
                        <span className="text-[10px] font-bold text-slate-500">फोटो छैन</span>
                        <span className="text-[9px] text-slate-400">≤ 50KB</span>
                      </div>
                    )}
                  </div>
                  {editForm.photoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditForm((prev: any) => ({ ...prev, photoUrl: '' }));
                        setEditPhotoSizeKb(null);
                      }}
                      className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-md hover:bg-rose-700 transition cursor-pointer"
                      title="फोटो हटाउनुहोस्"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-500" />
                      <span>विद्यार्थी फोटो (Student Photo)</span>
                    </span>
                    {editPhotoSizeKb ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 size={11} /> {editPhotoSizeKb} KB (≤ 50KB)
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        स्वतः ५० KB मा कम्प्रेस हुन्छ
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    नयाँ फोटो फाइल अपलोड गर्नुहोस् वा क्यामेराबाट फोटो खिच्नुहोस्।
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleEditPhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-blue-50 hover:text-blue-700 shadow-2xs transition cursor-pointer"
                    >
                      <Upload size={13} className="text-blue-600" />
                      <span>फाइल छनोट (Upload)</span>
                    </button>
                    <button
                      type="button"
                      onClick={startEditCamera}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-2xs transition cursor-pointer"
                    >
                      <Camera size={13} />
                      <span>क्यामेरा (Camera)</span>
                    </button>
                    {editForm.photoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditForm((prev: any) => ({ ...prev, photoUrl: '' }));
                          setEditPhotoSizeKb(null);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-bold text-xs border border-slate-200 transition cursor-pointer"
                      >
                        <Trash2 size={12} />
                        <span>हटाउनुहोस्</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 1: Personal & Demographic Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-[#1e3a5f] tracking-wider border-b border-gray-200 pb-1.5 flex items-center gap-1.5">
                  <Users size={14} className="text-blue-600" />
                  <span>१. व्यक्तिगत तथा जनसांख्यिकीय विवरण (Personal & Demographics)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Full Name (अंग्रेजीमा पूरा नाम) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      className="erp-input text-xs"
                      placeholder="e.g. AARAV KUMAR YADAV"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Full Name (नेपालीमा नाम)
                    </label>
                    <input
                      type="text"
                      value={editForm.fullNameNepali || ''}
                      onChange={(e) => setEditForm({ ...editForm, fullNameNepali: e.target.value })}
                      className="erp-input text-xs font-nepali"
                      placeholder="उदा. आरव कुमार यादव"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Gender (लिङ्ग) *</label>
                    <select
                      value={editForm.gender || 'Male'}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                      className="erp-input text-xs font-semibold"
                    >
                      <option value="Male">Male (छात्र / पुरुष)</option>
                      <option value="Female">Female (छात्रा / महिला)</option>
                      <option value="Other">Other (अन्य)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Date of Birth BS (जन्म मिति वि.सं.)
                    </label>
                    <input
                      type="text"
                      value={editForm.dateOfBirthBs || ''}
                      onChange={(e) => setEditForm({ ...editForm, dateOfBirthBs: e.target.value })}
                      className="erp-input text-xs font-mono"
                      placeholder="YYYY-MM-DD (e.g. 2068-05-15)"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Blood Group (रक्त समूह)
                    </label>
                    <select
                      value={editForm.bloodGroup || ''}
                      onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                      className="erp-input text-xs font-semibold"
                    >
                      <option value="">-- छनोट गर्नुहोस् --</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Ethnicity / Caste (जाति / समूह)
                    </label>
                    <input
                      type="text"
                      value={editForm.ethnicity || ''}
                      onChange={(e) => setEditForm({ ...editForm, ethnicity: e.target.value })}
                      className="erp-input text-xs"
                      placeholder="उदा. Madhesi (Yadav), Dalit, Janajati"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Religion (धर्म)
                    </label>
                    <input
                      type="text"
                      value={editForm.religion || ''}
                      onChange={(e) => setEditForm({ ...editForm, religion: e.target.value })}
                      className="erp-input text-xs"
                      placeholder="उदा. Hindu, Buddhist, Islam"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Disability Status (अपाङ्गता)
                    </label>
                    <input
                      type="text"
                      value={editForm.disability || ''}
                      onChange={(e) => setEditForm({ ...editForm, disability: e.target.value })}
                      className="erp-input text-xs"
                      placeholder="None / सामान्य वा प्रकार"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Academic & Enrollment */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-[#1e3a5f] tracking-wider border-b border-gray-200 pb-1.5 flex items-center gap-1.5">
                  <GraduationCap size={15} className="text-emerald-600" />
                  <span>२. शैक्षिक तथा कक्षा भर्ना विवरण (Academic & Class Enrollment)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Class (कक्षा)</label>
                    <select
                      value={editForm.classId || ''}
                      onChange={(e) => setEditForm({ ...editForm, classId: e.target.value })}
                      className="erp-input text-xs font-bold text-[#1e3a5f]"
                    >
                      <option value="">-- कक्षा छनोट गर्नुहोस् --</option>
                      {classesData?.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.section ? `(${c.section})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Roll Number (रोल नं.)</label>
                    <input
                      type="number"
                      value={editForm.rollNo || ''}
                      onChange={(e) => setEditForm({ ...editForm, rollNo: e.target.value })}
                      className="erp-input text-xs font-mono font-bold"
                      placeholder="e.g. 1"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">IEMIS Code / ID</label>
                    <input
                      type="text"
                      value={editForm.emisId || ''}
                      onChange={(e) => setEditForm({ ...editForm, emisId: e.target.value })}
                      className="erp-input text-xs font-mono"
                      placeholder="e.g. 320160005..."
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Admission Date BS (भर्ना मिति)</label>
                    <input
                      type="text"
                      value={editForm.admissionDateBs || ''}
                      onChange={(e) => setEditForm({ ...editForm, admissionDateBs: e.target.value })}
                      className="erp-input text-xs font-mono"
                      placeholder="YYYY-MM-DD"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Student Status (अवस्था)</label>
                    <select
                      value={editForm.status || 'ACTIVE'}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value, isActive: e.target.value === 'ACTIVE' })}
                      className="erp-input text-xs font-bold"
                    >
                      <option value="ACTIVE">ACTIVE (सक्रिय)</option>
                      <option value="GRADUATED">GRADUATED (उत्तीर्ण / पूर्व)</option>
                      <option value="TRANSFERRED">TRANSFERRED (सरुवा भएको)</option>
                      <option value="DROPPED">DROPPED (निष्क्रिय)</option>
                      <option value="PAST_RECORD">PAST_RECORD (विगत अभिलेख)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Previous School (अघिल्लो विद्यालय)</label>
                    <input
                      type="text"
                      value={editForm.previousSchool || ''}
                      onChange={(e) => setEditForm({ ...editForm, previousSchool: e.target.value })}
                      className="erp-input text-xs"
                      placeholder="e.g. Janak Basic School"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Parents & Guardian Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-[#1e3a5f] tracking-wider border-b border-gray-200 pb-1.5 flex items-center gap-1.5">
                  <HeartHandshake size={15} className="text-rose-600" />
                  <span>३. अभिभावक तथा सम्पर्क ठेगाना (Parents & Guardian Details)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Father's Name (बुवाको नाम)</label>
                    <input
                      type="text"
                      value={editForm.fatherName || ''}
                      onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })}
                      className="erp-input text-xs"
                      placeholder="बुवाको नाम"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Mother's Name (आमाको नाम)</label>
                    <input
                      type="text"
                      value={editForm.motherName || ''}
                      onChange={(e) => setEditForm({ ...editForm, motherName: e.target.value })}
                      className="erp-input text-xs"
                      placeholder="आमाको नाम"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Guardian Name (अभिभावक)</label>
                    <input
                      type="text"
                      value={editForm.guardianName || ''}
                      onChange={(e) => setEditForm({ ...editForm, guardianName: e.target.value })}
                      className="erp-input text-xs"
                      placeholder="अभिभावकको नाम"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Guardian Contact (फोन नं.)</label>
                    <input
                      type="text"
                      value={editForm.guardianContact || ''}
                      onChange={(e) => setEditForm({ ...editForm, guardianContact: e.target.value })}
                      className="erp-input text-xs font-mono font-bold"
                      placeholder="98XXXXXXXX"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Guardian Relation (नाता)</label>
                    <input
                      type="text"
                      value={editForm.guardianRelation || ''}
                      onChange={(e) => setEditForm({ ...editForm, guardianRelation: e.target.value })}
                      className="erp-input text-xs"
                      placeholder="Father / Mother / Uncle"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Permanent Address (ठेगाना)</label>
                    <input
                      type="text"
                      value={editForm.address || ''}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="erp-input text-xs"
                      placeholder="उदा. Brindaban-1, Rautahat"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditModalStudent(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  रद्द गर्नुहोस् (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={editStudentMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-6 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-60"
                >
                  {editStudentMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>परिवर्तन सुरक्षित हुँदैछ...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>परिवर्तन सुरक्षित गर्नुहोस् (Save Changes)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════ RESEQUENCE ROLL NUMBERS MODAL ════════════════════ */}
      {isRollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200 space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700 shrink-0">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">
                    कक्षागत रोल नं. पुन: क्रमबद्ध गर्नुहोस् (Auto Roll No Setup)
                  </h3>
                  <p className="text-xs text-gray-500 font-nepali">
                    प्रत्येक कक्षाका विद्यार्थीहरूलाई १ देखि सुरु हुने गरी क्रमबद्ध गर्नुहोस्।
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRollModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Target Class Selection */}
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">
                  १. रोल नं. मिलाउने दायरा (Target Scope) <span className="text-red-500">*</span>
                </label>
                <select
                  value={rollTargetClassId}
                  onChange={(e) => setRollTargetClassId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold focus:border-indigo-500 focus:bg-white focus:outline-hidden"
                >
                  <option value="all">🌟 सबै कक्षाहरू (All Classes — प्रत्येक कक्षामा १ देखि)</option>
                  {classesData
                    ?.filter((cls: any) => !selectedYear || String(cls.academicYearId) === String(selectedYear))
                    .map((cls: any) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} {cls.section ? `(${cls.section})` : ''}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  {rollTargetClassId === 'all'
                    ? 'यसले सबै कक्षाका विद्यार्थीहरूलाई सम्बन्धित कक्षाभित्रै १, २, ३... गरी रोल नम्बर दिनेछ।'
                    : 'यसले छानिएको कक्षाका मात्र विद्यार्थीहरूको रोल नम्बर १ देखि क्रमबद्ध गर्नेछ।'}
                </p>
              </div>

              {/* Sorting Criteria */}
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">
                  २. क्रमबद्ध गर्ने आधार (Sort By) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      rollSortBy === 'ALPHABETICAL'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rollSort"
                      value="ALPHABETICAL"
                      checked={rollSortBy === 'ALPHABETICAL'}
                      onChange={(e) => setRollSortBy(e.target.value)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>वर्णानुक्रम (A to Z / क-ज्ञ)</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      rollSortBy === 'CURRENT_ROLL'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rollSort"
                      value="CURRENT_ROLL"
                      checked={rollSortBy === 'CURRENT_ROLL'}
                      onChange={(e) => setRollSortBy(e.target.value)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>हालको रोल नं. (Current Roll 1..N)</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      rollSortBy === 'ADMISSION_DATE'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rollSort"
                      value="ADMISSION_DATE"
                      checked={rollSortBy === 'ADMISSION_DATE'}
                      onChange={(e) => setRollSortBy(e.target.value)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>भर्ना मिति अनुसार (Admission Date)</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      rollSortBy === 'EMIS_ID'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rollSort"
                      value="EMIS_ID"
                      checked={rollSortBy === 'EMIS_ID'}
                      onChange={(e) => setRollSortBy(e.target.value)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>IEMIS कोड अनुसार (IEMIS Code)</span>
                  </label>
                </div>
              </div>

              {/* Informative Note */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-[11px] text-emerald-900 leading-relaxed font-nepali">
                ✓ <strong>नियम (Rule):</strong> प्रत्येक कक्षाका विद्यार्थीहरूको रोल नम्बर १ बाट सुरु भएर त्यस कक्षाका कुल विद्यार्थी संख्या (उदा. १ देखि ४५) सम्म कक्षागत रूपमा मात्र राखिनेछ ।
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsRollModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                रद्द (Cancel)
              </button>
              <button
                type="button"
                disabled={autoRollMutation.isPending}
                onClick={() => {
                  autoRollMutation.mutate({
                    classId: rollTargetClassId,
                    academicYearId: selectedYear,
                    sortBy: rollSortBy,
                  });
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-60"
              >
                {autoRollMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>क्रमबद्ध गरिँदैछ...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>रोल नम्बर लागू गर्नुहोस् (Apply Roll Numbers)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ DELETE STUDENT CONFIRMATION MODAL ════════════════════ */}
      {deleteModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-rose-100 p-2.5 text-rose-600 shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  विद्यार्थी हटाउने निश्चित गर्नुहोस्?
                </h3>
                <p className="text-xs text-gray-500 mt-1 font-nepali">
                  तपाईं <strong>{deleteModalStudent.fullName}</strong> (ID: {deleteModalStudent.studentId}) लाई हटाउन लाग्नुभएको छ।
                </p>
              </div>
            </div>

            {/* Permanent vs Soft Deactivate Option */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-2 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deletePermanent}
                  onChange={(e) => setDeletePermanent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span className="font-bold text-rose-900 block">
                    स्थायी रूपमा सबै रेकर्ड मेट्नुहोस् (Permanent Cascade Delete)
                  </span>
                  <span className="text-[11px] text-gray-600 block mt-0.5 leading-relaxed">
                    चेतावनी: यसले विद्यार्थीको दर्ता, हाजिरी, नम्बर तथा शुल्कका सबै रेकर्ड डेटाबेसबाट सधैँका लागि मेटाउनेछ। अनचेक गरेमा विद्यार्थी केवल निष्क्रिय (Inactive) हुनेछ।
                  </span>
                </div>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalStudent(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                रद्द (Cancel)
              </button>
              <button
                type="button"
                disabled={deleteStudentMutation.isPending}
                onClick={() =>
                  deleteStudentMutation.mutate({
                    id: deleteModalStudent.id,
                    permanent: deletePermanent,
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-60"
              >
                {deleteStudentMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>हटाउँदै...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>{deletePermanent ? 'स्थायी मेट्नुहोस् (Delete Forever)' : 'निष्क्रिय गर्नुहोस् (Deactivate)'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ STUDENT PHOTO UPLOAD MODAL ════════════════════ */}
      {photoModalStudent && (
        <StudentPhotoUploadModal
          studentId={photoModalStudent.id}
          studentName={photoModalStudent.name}
          currentPhotoUrl={photoModalStudent.photoUrl}
          isOpen={Boolean(photoModalStudent)}
          onClose={() => setPhotoModalStudent(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setPhotoModalStudent(null);
          }}
        />
      )}

      {/* ════════════════════ ADMISSION LIVE CAMERA CAPTURE MODAL ════════════════════ */}
      {isAdmissionCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
                <Camera size={18} className="text-blue-600" />
                <span>क्यामेराबाट फोटो खिच्नुहोस् (Live Camera Capture)</span>
              </h3>
              <button
                type="button"
                onClick={stopAdmissionCamera}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative aspect-[3/4] max-h-[360px] w-full mx-auto overflow-hidden rounded-xl bg-black border-2 border-slate-200 shadow-inner flex items-center justify-center">
              <video
                ref={admissionVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-4 rounded-xl border-2 border-dashed border-white/70 pointer-events-none flex items-center justify-center">
                <span className="text-[10px] text-white font-bold bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-xs">
                  अनुहार फ्रेमभित्र मिलाउनुहोस् (PP Size)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={stopAdmissionCamera}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                रद्द (Cancel)
              </button>
              <button
                type="button"
                onClick={captureAdmissionPhoto}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-md transition cursor-pointer"
              >
                <Camera size={15} />
                <span>फोटो खिच्नुहोस् (Capture Photo)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ EDIT PROFILE LIVE CAMERA CAPTURE MODAL ════════════════════ */}
      {isEditCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
                <Camera size={18} className="text-blue-600" />
                <span>क्यामेराबाट फोटो खिच्नुहोस् (Edit Profile Photo)</span>
              </h3>
              <button
                type="button"
                onClick={stopEditCamera}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative aspect-[3/4] max-h-[360px] w-full mx-auto overflow-hidden rounded-xl bg-black border-2 border-slate-200 shadow-inner flex items-center justify-center">
              <video
                ref={editVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-4 rounded-xl border-2 border-dashed border-white/70 pointer-events-none flex items-center justify-center">
                <span className="text-[10px] text-white font-bold bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-xs">
                  अनुहार फ्रेमभित्र मिलाउनुहोस् (PP Size)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={stopEditCamera}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                रद्द (Cancel)
              </button>
              <button
                type="button"
                onClick={captureEditPhoto}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-md transition cursor-pointer"
              >
                <Camera size={15} />
                <span>फोटो खिच्नुहोस् (Capture Photo)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
