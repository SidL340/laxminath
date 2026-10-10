'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { todayBS, todayBSFormatted, bsToAD } from '@/lib/nepali-date';
import {
  GraduationCap,
  CalendarCheck,
  Award,
  Bell,
  BookOpen,
  Calendar,
  Save,
  CheckCircle2,
  Users,
  User,
  School,
  Globe,
  ExternalLink,
  X,
  Clock,
  FileText,
  Check,
  AlertTriangle,
  PhoneCall,
  UserCheck,
  UserX,
  CheckCheck,
  AlertCircle,
  RefreshCw,
  Send,
  CheckSquare,
  DollarSign,
  Layers,
  LayoutDashboard,
  ArrowRight,
  Sparkles,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  Trophy,
  Laptop,
  Trash2,
  ShieldAlert,
  Wrench,
  Search,
  Plus,
  Edit2,
  Medal,
  Flag,
  Flame,
  Activity,
  FlaskConical,
  Compass,
  FileBarChart,
  ClipboardList,
  Sliders,
  UserMinus,
  ChevronRight,
  Eye,
  Receipt,
  Wallet,
  CreditCard,
  TrendingDown,
  Banknote,
  CheckCircle,
  Landmark,
  Building,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import AcademicCalendar from '@/components/dashboard/AcademicCalendar';
import { numberToNepaliWords, toNepaliDigits } from '@/lib/nepali-number-words';

const DAYS_MAP: Record<number, string> = {
  1: 'आइतबार (Sunday)',
  2: 'सोमबार (Monday)',
  3: 'मंगलबार (Tuesday)',
  4: 'बुधबार (Wednesday)',
  5: 'बिहीबार (Thursday)',
  6: 'शुक्रबार (Friday)',
  7: 'शनिबार (Saturday)',
};

const SHORT_DAYS_MAP: Record<number, string> = {
  1: 'आइत (Sun)',
  2: 'सोम (Mon)',
  3: 'मंगल (Tue)',
  4: 'बुध (Wed)',
  5: 'बिही (Thu)',
  6: 'शुक्र (Fri)',
  7: 'शनि (Sat)',
};

export default function TeacherPortalPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const teacherId = user?.teacher?.id;

  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'attendance'
    | 'exam_duties'
    | 'daily_log'
    | 'tasks'
    | 'routine'
    | 'leaves'
    | 'students_leave'
    | 'salary_peshki'
    | 'incharge_exam'
    | 'incharge_library'
    | 'incharge_account'
    | 'incharge_discipline'
    | 'incharge_eca'
    | 'incharge_coordinator'
    | 'incharge_lab'
    | 'incharge_special'
    | 'notices'
  >((tabFromUrl as any) || 'overview');

  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl as any);
    }
  }, [tabFromUrl]);

  const switchTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === 'overview') {
      router.replace('/teacher', { scroll: false });
    } else {
      router.replace(`/teacher?tab=${tab}`, { scroll: false });
    }
  };

  const [isMyInfoOpen, setIsMyInfoOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Exam Hall Attendance State for Assigned Invigilator / Incharge
  const [activeExamDutyForAttendance, setActiveExamDutyForAttendance] = useState<any | null>(null);
  const [examHallAttendanceRoster, setExamHallAttendanceRoster] = useState<Record<number, { status: string; bookletNo: string; remarks: string }>>({});
  const [hallRosterSearch, setHallRosterSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [dailyLog, setDailyLog] = useState('');
  const [selectedClassLog, setSelectedClassLog] = useState('');

  // Class Attendance State for Teacher
  const [selectedAttendanceClass, setSelectedAttendanceClass] = useState<string>('');
  const [attendanceDateBs, setAttendanceDateBs] = useState<string>(todayBS());
  const [attendanceRosterMap, setAttendanceRosterMap] = useState<Record<number, { status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE'; remark: string; leaveType: string }>>({});
  const [attendanceRosterSearch, setAttendanceRosterSearch] = useState('');

  // Daily Teaching Log Form State
  const [logFormClassId, setLogFormClassId] = useState<string>('');
  const [logFormSubjectId, setLogFormSubjectId] = useState<string>('');
  const [logFormSubjectName, setLogFormSubjectName] = useState<string>('');
  const [logFormDateBs, setLogFormDateBs] = useState<string>(todayBS());
  const [logFormPeriodNo, setLogFormPeriodNo] = useState<number | ''>(1);
  const [logFormTopic, setLogFormTopic] = useState<string>('');
  const [logFormOutcome, setLogFormOutcome] = useState<string>('');
  const [logFormHomework, setLogFormHomework] = useState<string>('');
  const [logFormMethod, setLogFormMethod] = useState<string>('व्याख्या तथा छलफल (Discussion & Lecture)');
  const [logFilterDateBs, setLogFilterDateBs] = useState<string>(todayBS());
  const [logFilterClassId, setLogFilterClassId] = useState<string>('');
  const [logFormIsSubstitute, setLogFormIsSubstitute] = useState(false);
  const todayDayNum = useMemo(() => new Date().getDay() + 1, []); // 1 (Sun) to 7 (Sat)
  const [selectedRoutineDay, setSelectedRoutineDay] = useState<number>(() => {
    return new Date().getDay() + 1; // 1 (Sun) to 7 (Sat)
  });
  const [routineViewMode, setRoutineViewMode] = useState<'day' | 'week'>('day');
  const [teacherNoticeFilter, setTeacherNoticeFilter] = useState('ALL');

  // ─── 1. DISCIPLINE INCHARGE STATE ───
  const [disciplineIncidents, setDisciplineIncidents] = useState<any[]>([
    {
      id: 1,
      studentName: 'Aachal Kumari',
      classId: '8',
      className: 'Class 8',
      dateBs: todayBS(),
      category: 'UNIFORM',
      categoryLabel: 'पोशाक उल्लंघन (Improper Uniform)',
      severity: 'LOW',
      action: 'Verbal Warning (सचेत गराइएको)',
      parentCalled: false,
      notes: 'विद्यालय पोशाक तथा जुत्ता पूरा नभएको, भोलि पूर्ण पोशाकमा आउन निर्देशन।',
      status: 'RESOLVED',
    },
    {
      id: 2,
      studentName: 'Rohan Shah',
      classId: '10',
      className: 'Class 10',
      dateBs: todayBS(),
      category: 'TRUANCY',
      categoryLabel: 'कक्षा छाडेर भागेको (Bunking / Truancy)',
      severity: 'HIGH',
      action: 'Parent Called (अभिभावक बोलाइएको)',
      parentCalled: true,
      notes: 'चौथो घण्टीपछि विद्यालय पर्खाल नाघेर गएको, अभिभावकलाई फोन गरी जानकारी दिइएको।',
      status: 'PENDING_REVIEW',
    },
    {
      id: 3,
      studentName: 'Bikash Patel',
      classId: '9',
      className: 'Class 9',
      dateBs: '2083-05-12',
      category: 'FIGHTING',
      categoryLabel: 'झैझगडा / अभद्र व्यवहार (Misconduct)',
      severity: 'MEDIUM',
      action: 'Written Apology & Counseling (लिखित माफीनामा)',
      parentCalled: true,
      notes: 'साथीसँग बेन्च विवादमा हातपात गरेको, सम्झाइबुझाई लिखित प्रतिबद्धता गराइएको।',
      status: 'RESOLVED',
    },
  ]);
  const [disciplineSearch, setDisciplineSearch] = useState('');
  const [disciplineCategoryFilter, setDisciplineCategoryFilter] = useState('ALL');
  const [isAddIncidentModalOpen, setIsAddIncidentModalOpen] = useState(false);
  const [incidentStudent, setIncidentStudent] = useState('');
  const [incidentClassId, setIncidentClassId] = useState('');
  const [incidentCategory, setIncidentCategory] = useState('UNIFORM');
  const [incidentSeverity, setIncidentSeverity] = useState('LOW');
  const [incidentAction, setIncidentAction] = useState('Verbal Warning (सचेत गराइएको)');
  const [incidentParentCalled, setIncidentParentCalled] = useState(false);
  const [incidentNotes, setIncidentNotes] = useState('');

  // ─── 2. SPORTS & ECA INCHARGE STATE ───
  const [houseScores, setHouseScores] = useState({
    RED: 440,
    BLUE: 410,
    GREEN: 485,
    YELLOW: 425,
  });
  const [ecaEvents, setEcaEvents] = useState<any[]>([
    {
      id: 1,
      name: 'अन्तर-सदन वक्तृत्वकला प्रतियोगिता (Inter-House Speech)',
      topic: 'नेपालमा प्राविधिक शिक्षाको महत्त्व र आवश्यकता',
      dateBs: '2083-05-08',
      category: 'LITERARY',
      firstWinner: 'अन्जली यादव (Grade 10, Green House)',
      secondWinner: 'रोशन महतो (Grade 9, Red House)',
      thirdWinner: 'सुस्मिता कुँवर (Grade 8, Yellow House)',
      status: 'COMPLETED',
    },
    {
      id: 2,
      name: 'शुक्रबारे अन्तर-कक्षा हाजिरीजवाफ (Friday Quiz Contest)',
      topic: 'सामान्य ज्ञान तथा विज्ञान प्रविधि',
      dateBs: '2083-05-15',
      category: 'QUIZ',
      firstWinner: 'Class 10 A (Blue House Team)',
      secondWinner: 'Class 9 B (Green House Team)',
      thirdWinner: 'Class 8 (Red House Team)',
      status: 'COMPLETED',
    },
    {
      id: 3,
      name: 'अन्तर-सदन भलिबल रनिङ शिल्ड प्रतियोगिता (Annual Volleyball Shield)',
      topic: 'सिनियर छात्र भलिबल टुर्नामेन्ट',
      dateBs: '2083-05-22',
      category: 'SPORTS',
      firstWinner: 'Green House (हरियो सदन)',
      secondWinner: 'Red House (रातो सदन)',
      thirdWinner: 'Yellow House (पहेंलो सदन)',
      status: 'UPCOMING',
    },
  ]);
  const [isAddEcaEventModalOpen, setIsAddEcaEventModalOpen] = useState(false);
  const [ecaEventName, setEcaEventName] = useState('');
  const [ecaEventTopic, setEcaEventTopic] = useState('');
  const [ecaEventDateBs, setEcaEventDateBs] = useState(todayBS());
  const [ecaCategory, setEcaCategory] = useState('SPORTS');
  const [ecaWinner1, setEcaWinner1] = useState('');
  const [ecaWinner2, setEcaWinner2] = useState('');
  const [ecaWinner3, setEcaWinner3] = useState('');

  // Sports Equipment Inventory
  const [sportsItems, setSportsItems] = useState<any[]>([
    { id: 1, name: 'Cosco Football (Size 5)', category: 'Football', totalQty: 6, availableQty: 4, inUse: 2, condition: 'Good (राम्रो)' },
    { id: 2, name: 'Spikewell Volleyball & Net Set', category: 'Volleyball', totalQty: 5, availableQty: 3, inUse: 2, condition: 'Good (राम्रो)' },
    { id: 3, name: 'Yonex Badminton Racket & Shuttles', category: 'Badminton', totalQty: 10, availableQty: 8, inUse: 2, condition: 'Fair (मध्यम)' },
    { id: 4, name: 'Stag Table Tennis Board & Bats', category: 'Table Tennis', totalQty: 4, availableQty: 4, inUse: 0, condition: 'Excellent' },
    { id: 5, name: 'Tournament Wooden Chess Sets', category: 'Chess', totalQty: 8, availableQty: 7, inUse: 1, condition: 'Good (राम्रो)' },
    { id: 6, name: 'Carrom Board (Large) with Striker', category: 'Carrom', totalQty: 4, availableQty: 3, inUse: 1, condition: 'Good (राम्रो)' },
    { id: 7, name: 'Digital Stopwatch & Whistles', category: 'Track & Field', totalQty: 6, availableQty: 6, inUse: 0, condition: 'Working' },
    { id: 8, name: 'Emergency Sports First-Aid Kit', category: 'Medical', totalQty: 2, availableQty: 2, inUse: 0, condition: 'Fully Stocked' },
  ]);

  // ─── 3. ACADEMIC COORDINATOR STATE ───
  const [substitutions, setSubstitutions] = useState<any[]>([
    {
      id: 1,
      dateBs: todayBS(),
      absentTeacher: 'रामप्रसाद यादव (Maths)',
      classId: '10',
      className: 'Class 10 A',
      periodNo: 3,
      assignedTeacher: 'सन्तोष कुमार झा',
      subjectToTeach: 'अनिवार्य गणित (अभ्यास ५.२ रिभिजन)',
      status: 'CONFIRMED',
    },
    {
      id: 2,
      dateBs: todayBS(),
      absentTeacher: 'अनिता श्रेष्ठ (English)',
      classId: '8',
      className: 'Class 8',
      periodNo: 5,
      assignedTeacher: 'दिनेश पटेल',
      subjectToTeach: 'English Grammar (Tense practice)',
      status: 'CONFIRMED',
    },
  ]);
  const [isAddSubModalOpen, setIsAddSubModalOpen] = useState(false);
  const [subAbsentTeacher, setSubAbsentTeacher] = useState('');
  const [subClassId, setSubClassId] = useState('');
  const [subPeriodNo, setSubPeriodNo] = useState<number>(1);
  const [subAssignedTeacher, setSubAssignedTeacher] = useState('');
  const [subSubject, setSubSubject] = useState('');
  const [coordSelectedClassId, setCoordSelectedClassId] = useState<string>('');

  // ─── 4. LAB & IT INCHARGE STATE ───
  const [labSubTab, setLabSubTab] = useState<'science' | 'computer' | 'maintenance'>('science');
  const [scienceChemicals, setScienceChemicals] = useState<any[]>([
    { id: 1, name: 'Hydrochloric Acid (HCl 35%)', formula: 'HCl', stock: '2.5 Litres', shelfLife: '2085 BS', hazard: 'Corrosive (खतरनाक)', status: 'SAFE' },
    { id: 2, name: 'Sulphuric Acid (H2SO4 Concentrated)', formula: 'H2SO4', stock: '1.5 Litres', shelfLife: '2085 BS', hazard: 'Corrosive', status: 'LOCKED' },
    { id: 3, name: 'Sodium Hydroxide Pellets (NaOH)', formula: 'NaOH', stock: '800 Grams', shelfLife: '2086 BS', hazard: 'Basic/Caustic', status: 'SAFE' },
    { id: 4, name: 'Blue & Red Litmus Paper Strips', formula: 'Indicator', stock: '12 Packs', shelfLife: '2087 BS', hazard: 'Non-Hazardous', status: 'AVAILABLE' },
    { id: 5, name: 'Compound Optical Microscopes (1000x)', formula: 'Optics', stock: '8 Units', shelfLife: 'Good', hazard: 'Precision', status: 'ALL_WORKING' },
    { id: 6, name: 'Borosilicate Test Tubes & Beakers', formula: 'Glassware', stock: '65 Pieces', shelfLife: 'N/A', hazard: 'Fragile', status: 'AVAILABLE' },
    { id: 7, name: 'Physics Prism, Convex/Concave Lenses', formula: 'Optics', stock: '14 Sets', shelfLife: 'Good', hazard: 'Fragile', status: 'AVAILABLE' },
    { id: 8, name: 'Human Skeleton & Anatomy Chart Model', formula: 'Biology', stock: '2 Models', shelfLife: 'Good', hazard: 'None', status: 'IN_PLACE' },
  ]);

  const [pcWorkstations, setPcWorkstations] = useState<any[]>([
    { id: 'PC-01', cpu: 'Core i5 10th Gen / 8GB RAM', os: 'Windows 11 Pro', status: 'ONLINE', internet: 'Fast (100 Mbps)', userGroup: 'Students' },
    { id: 'PC-02', cpu: 'Core i5 10th Gen / 8GB RAM', os: 'Windows 11 Pro', status: 'ONLINE', internet: 'Fast (100 Mbps)', userGroup: 'Students' },
    { id: 'PC-03', cpu: 'Core i5 10th Gen / 8GB RAM', os: 'Windows 11 Pro', status: 'ONLINE', internet: 'Fast (100 Mbps)', userGroup: 'Students' },
    { id: 'PC-04', cpu: 'Core i5 10th Gen / 8GB RAM', os: 'Windows 11 Pro', status: 'ONLINE', internet: 'Fast (100 Mbps)', userGroup: 'Students' },
    { id: 'PC-05', cpu: 'Core i5 10th Gen / 8GB RAM', os: 'Windows 11 Pro', status: 'ONLINE', internet: 'Fast (100 Mbps)', userGroup: 'Students' },
    { id: 'PC-06', cpu: 'Core i3 9th Gen / 4GB RAM', os: 'Windows 10', status: 'MAINTENANCE', internet: 'Offline (RAM upgrade)', userGroup: 'Students' },
    { id: 'PC-07', cpu: 'Core i5 10th Gen / 8GB RAM', os: 'Windows 11 Pro', status: 'ONLINE', internet: 'Fast (100 Mbps)', userGroup: 'Students' },
    { id: 'PC-08', cpu: 'Core i5 10th Gen / 8GB RAM', os: 'Windows 11 Pro', status: 'ONLINE', internet: 'Fast (100 Mbps)', userGroup: 'Students' },
    { id: 'PC-TEACHER', cpu: 'Core i7 11th Gen / 16GB RAM', os: 'Windows 11 Pro', status: 'ONLINE', internet: 'Master Server', userGroup: 'Lab Instructor' },
    { id: 'PROJECTOR-01', cpu: 'BenQ Full HD Smart Projector', os: 'Android TV', status: 'ONLINE', internet: 'WiFi Connected', userGroup: 'Lab Screen' },
    { id: 'PRINTER-01', cpu: 'EPSON L3150 Wi-Fi Tank Printer', os: 'Network Driver', status: 'ONLINE', internet: 'Active (Ink 85%)', userGroup: 'Printing' },
  ]);

  const [labPracticalBookings, setLabPracticalBookings] = useState<any[]>([
    {
      id: 1,
      dateBs: todayBS(),
      classId: '10',
      className: 'Class 10',
      labType: 'SCIENCE',
      periodNo: 4,
      topic: 'Preparation of Oxygen Gas (O2) in Laboratory & Test with burning splinter',
      teacher: 'दिनेश पटेल',
    },
    {
      id: 2,
      dateBs: todayBS(),
      classId: '9',
      className: 'Class 9',
      labType: 'COMPUTER',
      periodNo: 6,
      topic: 'HTML Table, Form Design & CSS Basics',
      teacher: 'कम्प्युटर शिक्षक',
    },
  ]);
  const [isBookLabModalOpen, setIsBookLabModalOpen] = useState(false);
  const [bookClassId, setBookClassId] = useState('');
  const [bookLabType, setBookLabType] = useState('SCIENCE');
  const [bookPeriodNo, setBookPeriodNo] = useState(1);
  const [bookTopic, setBookTopic] = useState('');
  const [bookTeacher, setBookTeacher] = useState(user?.teacher?.fullName || 'Teacher');

  // ─── 5. SPECIAL INCHARGE STATE ───
  const [specialCommitteeTab, setSpecialCommitteeTab] = useState<'canteen' | 'infrastructure' | 'events' | 'pta'>('canteen');
  const [committeeMinutes, setCommitteeMinutes] = useState<any[]>([
    {
      id: 1,
      dateBs: '2083-05-10',
      committee: 'दिवा खाजा तथा क्यान्टिन समिति (Canteen Committee)',
      title: 'दिवा खाजा गुणस्तर अनुगमन तथा साप्ताहिक मेन्यु निर्धारण',
      attendees: 'प्रधानाध्यापक, संयोजक, अभिभावक प्रतिनिधि, भान्छे प्रमुख',
      decisions: 'साप्ताहिक खाजामा ताजा गेडागुडी, अण्डा र हलुवा अनिवार्य समावेश गर्ने। पिउने पानी फिल्टर हरेक १५ दिनमा सफा गर्ने।',
    },
    {
      id: 2,
      dateBs: '2083-05-02',
      committee: 'भौतिक पूर्वाधार तथा मर्मत समिति (Infrastructure Committee)',
      title: 'वर्षायामको पानी निकास तथा कक्षा ९ को छाना मर्मत',
      attendees: 'समिति प्रमुख, विद्यालय इन्जिनियर, वडा प्रतिनिधि',
      decisions: 'कक्षा ९ को ढलान वाटरप्रूफिङ गर्ने र नयाँ खेलकुद मैदान निकास नाली निर्माण सुरु गर्ने।',
    },
  ]);
  const [isAddMinuteModalOpen, setIsAddMinuteModalOpen] = useState(false);
  const [minuteDateBs, setMinuteDateBs] = useState(todayBS());
  const [minuteCommittee, setMinuteCommittee] = useState('दिवा खाजा तथा क्यान्टिन समिति');
  const [minuteTitle, setMinuteTitle] = useState('');
  const [minuteAttendees, setMinuteAttendees] = useState('');
  const [minuteDecisions, setMinuteDecisions] = useState('');

  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // Profile Edit State
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPanNo, setEditPanNo] = useState('');

  // Teacher Leave Form State
  const [leaveStartDate, setLeaveStartDate] = useState(todayBS());
  const [leaveEndDate, setLeaveEndDate] = useState(todayBS());
  const [leaveDaysCount, setLeaveDaysCount] = useState(1);
  const [leaveReason, setLeaveReason] = useState('');

  // Edit Teacher Leave State
  const [editingLeave, setEditingLeave] = useState<any>(null);
  const [isEditLeaveModalOpen, setIsEditLeaveModalOpen] = useState(false);
  const [editLeaveStartDate, setEditLeaveStartDate] = useState('');
  const [editLeaveEndDate, setEditLeaveEndDate] = useState('');
  const [editLeaveDaysCount, setEditLeaveDaysCount] = useState(1);
  const [editLeaveReason, setEditLeaveReason] = useState('');

  // Notice Form State
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [noticeTargetClassId, setNoticeTargetClassId] = useState('');
  const [sendSms, setSendSms] = useState(false);

  // Problem to Admin Form State
  const [problemTitle, setProblemTitle] = useState('');
  const [problemCategory, setProblemCategory] = useState('FACILITIES');
  const [problemPriority, setProblemPriority] = useState('NORMAL');
  const [problemBody, setProblemBody] = useState('');

  // 1. Fetch Classes
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // Fetch School Profile (for dynamic print headers)
  const { data: school } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data;
    },
  });

  // 2. Fetch Notices
  const { data: noticesData } = useQuery({
    queryKey: ['notices-teacher'],
    queryFn: async () => {
      const res = await api.get('/notices');
      return res.data?.data || [];
    },
  });

  // 3. Fetch Exams
  const { data: examsData } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const res = await api.get('/exams');
      return res.data?.data || [];
    },
  });

  // 4. Fetch Teacher's Routine
  const { data: teacherRoutine, isLoading: isRoutineLoading } = useQuery({
    queryKey: ['teacher-routine', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const res = await api.get(`/routine/teacher/${teacherId}`);
      return res.data?.data || [];
    },
    enabled: !!teacherId,
  });

  // 5. Fetch Teacher's Own Leaves
  const { data: myLeaves, isLoading: isMyLeavesLoading } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: async () => {
      const res = await api.get('/leaves/my');
      return res.data?.data || [];
    },
  });

  // 6. Fetch Student Leaves if Class Teacher
  const { data: classPendingLeavesData, isLoading: isClassLeavesLoading } = useQuery({
    queryKey: ['class-pending-leaves'],
    queryFn: async () => {
      const res = await api.get('/leaves/class-pending');
      return res.data;
    },
  });

  const studentLeaves = classPendingLeavesData?.data || [];
  const myAssignedClasses = classesData?.filter((c: any) => c.classTeacherId === teacherId) || [];
  const pendingStudentLeavesCount = studentLeaves.filter((l: any) => l.status === 'PENDING').length;

  // 7. Fetch Assigned Tasks & Duties
  const { data: myTasksData, isLoading: isMyTasksLoading } = useQuery({
    queryKey: ['my-staff-tasks'],
    queryFn: async () => {
      const res = await api.get('/staff-tasks');
      return res.data?.data || [];
    },
  });

  // 8. Fetch Teacher Detailed Profile (with Incharge Role)
  const { data: teacherDetails } = useQuery({
    queryKey: ['teacher-details', teacherId],
    queryFn: async () => {
      if (!teacherId) return null;
      const res = await api.get(`/teachers/${teacherId}`);
      return res.data?.data || null;
    },
    enabled: !!teacherId,
  });

  // 9. Fetch Teacher's Teaching Logs (Filtered)
  const { data: teacherLogsData, isLoading: isTeacherLogsLoading } = useQuery({
    queryKey: ['teacher-daily-logs', teacherId, logFilterDateBs, logFilterClassId],
    queryFn: async () => {
      if (!teacherId) return [];
      const params = new URLSearchParams();
      params.append('teacherId', String(teacherId));
      if (logFilterDateBs) params.append('dateBs', logFilterDateBs);
      if (logFilterClassId) params.append('classId', logFilterClassId);
      const res = await api.get(`/daily-logs?${params.toString()}`);
      return res.data?.data?.logs || [];
    },
    enabled: !!teacherId,
  });

  // Create Teaching Log Mutation
  const createTeachingLogMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/daily-logs', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-daily-logs'] });
      setLogFormTopic('');
      setLogFormOutcome('');
      setLogFormHomework('');
      setDailyLog('');
      toast.success(data.message || 'Teaching log saved successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save teaching log.');
    },
  });

  // Delete Teaching Log Mutation
  const deleteTeachingLogMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/daily-logs/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-daily-logs'] });
      toast.success('Teaching log deleted.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete log.');
    },
  });

  // 10. Fetch Teacher's Own Peshki (Salary Advances)
  const { data: myPeshkiRes, isLoading: isMyPeshkiLoading } = useQuery({
    queryKey: ['my-peshki-list', teacherId],
    queryFn: async () => {
      if (!teacherId) return { data: [], summary: {} };
      try {
        const res = await api.get('/peshki', { params: { teacherId } });
        return res.data;
      } catch (err: any) {
        if (err.response?.status === 404) {
          const fallback = await api.get('/payroll/peshki', { params: { teacherId } });
          return fallback.data;
        }
        return { data: [], summary: {} };
      }
    },
    enabled: !!teacherId,
  });

  const myPeshkiList: any[] = myPeshkiRes?.data || [];
  const myPeshkiSummary = myPeshkiRes?.summary || {
    totalAdvanceGiven: 0,
    totalRemaining: 0,
    totalSettled: 0,
    activeCount: 0,
    settledCount: 0,
  };

  // 11. Fetch Teacher's Own Payroll History
  const { data: myPayrollRes, isLoading: isMyPayrollLoading } = useQuery({
    queryKey: ['my-payroll-history', teacherId],
    queryFn: async () => {
      if (!teacherId) return { data: [] };
      const res = await api.get('/payroll', { params: { teacherId } });
      return res.data;
    },
    enabled: !!teacherId,
  });

  const myPayrollList: any[] = myPayrollRes?.data || [];

  // 12. Fetch Teacher's Own Bank Accounts
  const { data: myBankAccounts = [], isLoading: isMyBankAccountsLoading } = useQuery({
    queryKey: ['my-bank-accounts', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const res = await api.get(`/teachers/${teacherId}/bank-accounts`);
      return res.data?.data || [];
    },
    enabled: !!teacherId,
  });

  // Central Bank Directory (Standard & Auto-Saved Banks & Branches)
  const { data: bankDirectoryData } = useQuery({
    queryKey: ['bank-directory'],
    queryFn: async () => {
      const res = await api.get('/teachers/banks/directory');
      return res.data || { data: [], allBanks: [], allBranches: [] };
    },
  });

  const allKnownBanks: string[] = bankDirectoryData?.allBanks || [];
  const allKnownBranches: string[] = bankDirectoryData?.allBranches || [];

  // ─── TEACHER CLASS ATTENDANCE HOOKS ───
  const isSuperAdminOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const myAssignedAttendanceClasses = isSuperAdminOrAdmin
    ? (classesData || [])
    : (classesData?.filter((c: any) => c.classTeacherId === teacherId) || []);

  useEffect(() => {
    if (classesData?.length > 0 && !selectedAttendanceClass) {
      const myAssigned = teacherId ? classesData.find((c: any) => c.classTeacherId === teacherId) : null;
      const target = myAssigned || (isSuperAdminOrAdmin ? classesData[0] : null);
      if (target) {
        setSelectedAttendanceClass(String(target.id));
      }
    }
  }, [classesData, selectedAttendanceClass, teacherId, isSuperAdminOrAdmin]);

  const {
    data: teacherClassAttendanceRes,
    isLoading: isTeacherAttendanceLoading,
    refetch: refetchTeacherAttendance,
  } = useQuery({
    queryKey: ['teacher-class-attendance', selectedAttendanceClass, attendanceDateBs],
    queryFn: async () => {
      if (!selectedAttendanceClass) return { data: [], isHoliday: false, holidayRemark: null };
      const res = await api.get(`/attendance/class/${selectedAttendanceClass}?dateBs=${attendanceDateBs}`);
      return res.data || { data: [], isHoliday: false, holidayRemark: null };
    },
    enabled: !!selectedAttendanceClass,
  });

  const attendanceStudentsList: any[] = teacherClassAttendanceRes?.data || [];
  const isAttendanceHoliday = teacherClassAttendanceRes?.isHoliday || false;
  const attendanceHolidayRemark = teacherClassAttendanceRes?.holidayRemark || null;

  useEffect(() => {
    if (attendanceStudentsList.length > 0) {
      const initialMap: Record<number, { status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE'; remark: string; leaveType: string }> = {};
      attendanceStudentsList.forEach((st: any) => {
        initialMap[st.id] = {
          status: (st.attendance?.status as any) || 'PRESENT',
          remark: st.attendance?.remark || '',
          leaveType: st.attendance?.leaveType || '',
        };
      });
      setAttendanceRosterMap(initialMap);
    }
  }, [attendanceStudentsList]);

  const saveTeacherAttendanceMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/attendance', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-class-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-class'] });
      toast.success(data?.message || 'विद्यार्थी हाजिरी सफलतापूर्वक सुरक्षित भयो!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'हाजिरी सुरक्षित गर्न सकिएन।');
    },
  });

  // 13. Fetch Teacher's Assigned Exam Duties & Invigilation Halls
  const { data: myExamDutiesData = [], isLoading: isExamDutiesLoading, refetch: refetchMyExamDuties } = useQuery({
    queryKey: ['my-exam-duties', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const res = await api.get('/exams/my-duties');
      return res.data?.data || [];
    },
    enabled: !!teacherId,
  });

  const todayExamDuties = (myExamDutiesData || []).filter((d: any) => d.examDateBs === todayBS());

  // Active Exam Duty Hall Roster Query (Loaded when teacher opens attendance modal)
  const { data: activeHallRosterData, isLoading: isActiveHallRosterLoading } = useQuery({
    queryKey: [
      'teacher-hall-roster',
      activeExamDutyForAttendance?.examId,
      activeExamDutyForAttendance?.examDateBs,
      activeExamDutyForAttendance?.shift,
      activeExamDutyForAttendance?.roomId,
    ],
    queryFn: async () => {
      if (!activeExamDutyForAttendance) return null;
      const params = new URLSearchParams({
        dateBs: activeExamDutyForAttendance.examDateBs,
        shift: activeExamDutyForAttendance.shift,
        roomId: String(activeExamDutyForAttendance.roomId),
      });
      const res = await api.get(`/exams/${activeExamDutyForAttendance.examId}/attendance?${params.toString()}`);
      return res.data?.data || null;
    },
    enabled: !!activeExamDutyForAttendance,
  });

  const activeHallStudents: any[] = activeHallRosterData?.students || [];

  // Populate local attendance roster state when hall data arrives
  useEffect(() => {
    if (activeHallStudents && activeHallStudents.length > 0) {
      const initialMap: Record<number, { status: string; bookletNo: string; remarks: string }> = {};
      activeHallStudents.forEach((s) => {
        initialMap[s.studentId] = {
          status: s.status || 'PRESENT',
          bookletNo: s.bookletNo || '',
          remarks: s.remarks || '',
        };
      });
      setExamHallAttendanceRoster(initialMap);
    } else {
      setExamHallAttendanceRoster({});
    }
  }, [activeHallStudents]);

  // Save Exam Hall Attendance Mutation (Teacher Action)
  const saveHallAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!activeExamDutyForAttendance) throw new Error('No active exam duty selected.');
      if (activeHallStudents.length === 0) throw new Error('No students seated in this exam hall.');

      const attendanceList = activeHallStudents.map((s) => {
        const local = examHallAttendanceRoster[s.studentId] || { status: 'PRESENT', bookletNo: '', remarks: '' };
        return {
          studentId: s.studentId,
          classId: s.classId,
          subjectId: s.subjectId,
          status: local.status,
          bookletNo: local.bookletNo,
          remarks: local.remarks,
        };
      });

      const res = await api.post(`/exams/${activeExamDutyForAttendance.examId}/attendance`, {
        dateBs: activeExamDutyForAttendance.examDateBs,
        shift: activeExamDutyForAttendance.shift,
        roomId: activeExamDutyForAttendance.roomId,
        attendanceList,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'परीक्षा हलको विद्यार्थी हाजिरी सुरक्षित भयो!');
      queryClient.invalidateQueries({ queryKey: ['teacher-hall-roster'] });
      queryClient.invalidateQueries({ queryKey: ['exam-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['marks'] });
      refetchMyExamDuties();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'हाजिरी सुरक्षित गर्न सकिएन');
    },
  });

  // Teacher Bank Account Modals State & Mutations
  const [isTeacherBankModalOpen, setIsTeacherBankModalOpen] = useState(false);
  const [editingTeacherAccount, setEditingTeacherAccount] = useState<any>(null);
  const [teacherBankForm, setTeacherBankForm] = useState({
    bankName: '',
    accountNumber: '',
    branch: '',
    accountType: 'SALARY',
    isPrimary: false,
    remarks: '',
  });

  const addTeacherBankMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post(`/teachers/${teacherId}/bank-accounts`, data);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'बैंक खाता सफलतापूर्वक थपियो!');
      setIsTeacherBankModalOpen(false);
      setEditingTeacherAccount(null);
      queryClient.invalidateQueries({ queryKey: ['my-bank-accounts', teacherId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-details', teacherId] });
      queryClient.invalidateQueries({ queryKey: ['bank-directory'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add bank account');
    },
  });

  const updateTeacherBankMutation = useMutation({
    mutationFn: async ({ accountId, data }: { accountId: number; data: any }) => {
      const res = await api.put(`/teachers/${teacherId}/bank-accounts/${accountId}`, data);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'बैंक खाता विवरण अद्यावधिक भयो!');
      setIsTeacherBankModalOpen(false);
      setEditingTeacherAccount(null);
      queryClient.invalidateQueries({ queryKey: ['my-bank-accounts', teacherId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-details', teacherId] });
      queryClient.invalidateQueries({ queryKey: ['bank-directory'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-details', teacherId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update bank account');
    },
  });

  const setPrimaryTeacherBankMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const res = await api.patch(`/teachers/${teacherId}/bank-accounts/${accountId}/primary`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'मुख्य तलब खाता सेट गरियो!');
      queryClient.invalidateQueries({ queryKey: ['my-bank-accounts', teacherId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-details', teacherId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to set primary bank account');
    },
  });

  const deleteTeacherBankMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const res = await api.delete(`/teachers/${teacherId}/bank-accounts/${accountId}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'बैंक खाता हटाइयो।');
      queryClient.invalidateQueries({ queryKey: ['my-bank-accounts', teacherId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-details', teacherId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete bank account');
    },
  });

  // Salary & Peshki Modals State
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);
  const [selectedPeshkiVoucher, setSelectedPeshkiVoucher] = useState<any | null>(null);
  const [selectedPeshkiSchedule, setSelectedPeshkiSchedule] = useState<any | null>(null);

  const myTasks: any[] = myTasksData || [];
  const pendingTasksCount = myTasks.filter((t) => t.status !== 'COMPLETED').length;

  // ─── ASSIGNED CLASSES & SUBJECTS RESOLUTION FOR TEACHING LOGS ───
  // 1. All unique assigned classes for this teacher
  const teacherAssignedClasses = React.useMemo(() => {
    const classMap = new Map<number, any>();

    // From Routine:
    teacherRoutine?.forEach((r: any) => {
      if (r.class) classMap.set(r.class.id, r.class);
    });

    // From Class Teacher of:
    myAssignedClasses?.forEach((c: any) => {
      classMap.set(c.id, c);
    });

    // From Classes where subject is assigned to this teacher:
    classesData?.forEach((c: any) => {
      if (c.subjects?.some((cs: any) => cs.teacherId === teacherId)) {
        classMap.set(c.id, c);
      }
    });

    return Array.from(classMap.values());
  }, [teacherRoutine, myAssignedClasses, classesData, teacherId]);

  // Display classes for the form: if isSubstitute is true or no assigned classes found, show all school classes; otherwise show strictly assigned classes!
  const availableClassesForLog = React.useMemo(() => {
    if (logFormIsSubstitute || teacherAssignedClasses.length === 0) {
      return classesData || [];
    }
    return teacherAssignedClasses;
  }, [logFormIsSubstitute, teacherAssignedClasses, classesData]);

  // 2. Assigned subjects for currently selected class in log form
  const availableSubjectsForLog = React.useMemo(() => {
    if (!logFormClassId) return [];
    const cId = Number(logFormClassId);
    const subMap = new Map<number, any>();

    // From Routine for this class:
    teacherRoutine?.filter((r: any) => r.classId === cId && r.subject).forEach((r: any) => {
      subMap.set(r.subject.id, r.subject);
    });

    // From ClassSubject assigned to teacher:
    const currentClass = classesData?.find((c: any) => c.id === cId);
    currentClass?.subjects?.forEach((cs: any) => {
      if (cs.teacherId === teacherId && cs.subject) {
        subMap.set(cs.subject.id, cs.subject);
      }
    });

    // From teacher's overall subjects:
    teacherDetails?.subjects?.forEach((ts: any) => {
      if (ts.subject) {
        subMap.set(ts.subject.id, ts.subject);
      }
    });

    return Array.from(subMap.values());
  }, [logFormClassId, teacherRoutine, classesData, teacherDetails, teacherId]);

  // 3. Routine periods for the selected routine day
  const routinePeriodsForDay = React.useMemo(() => {
    return (teacherRoutine || []).filter((r: any) => r.dayOfWeek === selectedRoutineDay && !r.isBreak);
  }, [teacherRoutine, selectedRoutineDay]);

  // Routine periods specifically for today
  const todayRoutinePeriods = React.useMemo(() => {
    return (teacherRoutine || [])
      .filter((r: any) => r.dayOfWeek === todayDayNum && !r.isBreak)
      .sort((a: any, b: any) => (a.periodNo || 0) - (b.periodNo || 0));
  }, [teacherRoutine, todayDayNum]);

  // Only days that have routine periods scheduled for this teacher (Show ONLY which is checked / scheduled!)
  const activeTeacherRoutineDays = React.useMemo(() => {
    const daysWithPeriods = [1, 2, 3, 4, 5, 6, 7].filter((day) =>
      (teacherRoutine || []).some((r: any) => r.dayOfWeek === day && !r.isBreak)
    );
    return daysWithPeriods.length > 0 ? daysWithPeriods : [1, 2, 3, 4, 5, 6];
  }, [teacherRoutine]);

  // Quick Task Status Update Mutation
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
      queryClient.invalidateQueries({ queryKey: ['my-staff-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-details'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update task status');
    },
  });

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!teacherId) throw new Error('Teacher record not found.');
      const res = await api.put(`/teachers/${teacherId}`, {
        fullName: editFullName,
        phone: editPhone,
        email: editEmail,
        address: editAddress,
        panNo: editPanNo,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Your teacher profile details updated successfully!');
      setIsEditProfileModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    },
  });

  const applyLeaveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/leaves/apply', {
        startDateBs: leaveStartDate,
        endDateBs: leaveEndDate,
        totalDays: leaveDaysCount,
        reason: leaveReason,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('बिदाको निवेदन दर्ता भयो! स्वीकृतिका लागि प्रशासनलाई सम्पर्क गर्नुहोस्।');
      setIsLeaveModalOpen(false);
      setLeaveReason('');
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'बिदा आवेदन पठाउन सकिएन।');
    },
  });

  const updateLeaveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await api.put(`/leaves/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('बिदाको निवेदन सफलतापूर्वक परिमार्जन गरियो!');
      setIsEditLeaveModalOpen(false);
      setEditingLeave(null);
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'बिदा परिमार्जन गर्न सकिएन।');
    },
  });

  const deleteLeaveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/leaves/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('तपाईंको बिदा आवेदन रद्द गरियो।');
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'बिदा रद्द गर्न सकिएन।');
    },
  });

  const reviewStudentLeaveMutation = useMutation({
    mutationFn: async ({ leaveId, status, remarks }: { leaveId: number; status: 'APPROVED' | 'REJECTED'; remarks?: string }) => {
      const res = await api.post(`/leaves/${leaveId}/review`, { status, remarks });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'निर्णय सुरक्षित भयो!');
      queryClient.invalidateQueries({ queryKey: ['class-pending-leaves'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'कारबाही गर्न सकिएन।');
    },
  });

  const sendNoticeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/notices', {
        title: noticeTitle,
        body: noticeBody,
        type: 'CLASS',
        targetClassId: noticeTargetClassId ? parseInt(noticeTargetClassId) : null,
        postedDateBs: todayBS(),
        sendSms,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Notice dispatched to students successfully!');
      setIsNoticeModalOpen(false);
      setNoticeTitle('');
      setNoticeBody('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to send notice');
    },
  });

  const reportProblemMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/notices', {
        title: `[Teacher Report - ${problemPriority}] ${problemTitle} (${problemCategory})`,
        body: problemBody,
        type: 'TEACHER_REPORT',
        targetRole: 'ADMIN',
        postedDateBs: todayBS(),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Problem/Report submitted to Principal & Administration!');
      setIsProblemModalOpen(false);
      setProblemTitle('');
      setProblemBody('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    },
  });

  const printTeacherRoutine = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const weekDays = activeTeacherRoutineDays;
    const daysHtml = weekDays.map((d) => {
      const dayEntries = (teacherRoutine || []).filter((r: any) => r.dayOfWeek === d);
      const rows = dayEntries.length > 0
        ? dayEntries.map((r: any) => `
          <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; margin-bottom: 6px; background: #fff;">
            <div style="display: flex; justify-content: space-between; font-weight: bold; color: #1e3a5f; font-size: 11px;">
              <span>Period ${r.periodNo} (${r.startTime} - ${r.endTime})</span>
              ${r.roomNo ? `<span style="font-size: 10px; color: #b45309; background: #fef3c7; padding: 1px 4px; border-radius: 3px;">Room: ${r.roomNo}</span>` : ''}
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 3px; color: #334155;">
              <span style="font-weight: 700;">${r.class?.name || ''} ${r.class?.section ? `(${r.class.section})` : ''}</span>
              <span style="color: #047857; font-weight: 600;">${r.subject?.name || '—'}</span>
            </div>
          </div>
        `).join('')
        : `<div style="text-align: center; color: #94a3b8; font-style: italic; font-size: 11px; padding: 10px;">यस दिन कुनै कक्षा छैन (No Period)</div>`;

      return `
        <div style="border: 1px solid #94a3b8; border-radius: 8px; padding: 10px; background: #f8fafc; break-inside: avoid;">
          <div style="font-weight: 800; font-size: 13px; color: #1e3a5f; border-bottom: 2px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px; display: flex; justify-content: space-between;">
            <span>${DAYS_MAP[d]}</span>
            <span style="font-size: 11px; font-weight: normal; color: #475569;">${dayEntries.length} Classes</span>
          </div>
          ${rows}
        </div>
      `;
    }).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Teacher Timetable - ${displayName}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px; }
            .school-name { font-size: 16px; font-weight: 900; color: #1e3a5f; }
            .meta { font-size: 12px; font-weight: bold; margin: 6px 0 12px 0; display: flex; justify-content: space-between; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
            .footer { margin-top: 25px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school-name">${school?.nameNepali || school?.name || ''}</div>
            <div style="font-size: 11px; color: #555;">Teacher Weekly Timetable (शिक्षक कार्यतालिका) • Academic Session 2083/84</div>
          </div>
          <div class="meta">
            <div>शिक्षकको नाम: <u>${displayName}</u></div>
            <div>पद / जिम्मेवारी: <u>${teacherProfile.inchargeRole || 'शिक्षक'}</u></div>
            <div>मुद्रण मिति: <u>BS ${todayBSFormatted()}</u></div>
          </div>
          <div class="grid">
            ${daysHtml}
          </div>
          <div class="footer">
            <div>शिक्षकको हस्ताक्षर: __________________</div>
            <div>शैक्षिक प्रमुख / In-Charge: __________________</div>
            <div>प्रधानाध्यापक: __________________</div>
          </div>
          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const displayName = user?.teacher?.fullName || user?.username || 'Teacher';

  const todayRoutines = (teacherRoutine || []).filter((r: any) => r.dayOfWeek === todayDayNum);
  const pendingTasks = (myTasksData || []).filter((t: any) => t.status !== 'COMPLETED');
  const leaveStats = {
    remainingDays: Math.max(0, 18 - (myLeaves || []).filter((l: any) => l.status === 'APPROVED').length),
  };

  const teacherProfile = teacherDetails || (user?.teacher as any) || {};
  const inchargeString = teacherProfile.inchargeRole || '';
  const inchargeRolesList = inchargeString
    .split(',')
    .map((r: string) => r.trim().toUpperCase())
    .filter(Boolean);

  const hasExamIncharge =
    inchargeRolesList.includes('EXAM_INCHARGE') || inchargeRolesList.includes('EXAM');
  const hasLibraryIncharge =
    inchargeRolesList.includes('LIBRARIAN') ||
    inchargeRolesList.includes('LIBRARY') ||
    user?.role === 'LIBRARIAN';
  const hasAccountantIncharge =
    inchargeRolesList.includes('ACCOUNTANT') ||
    inchargeRolesList.includes('ACCOUNT') ||
    user?.role === 'ACCOUNTANT';
  const hasCoordinatorIncharge =
    inchargeRolesList.includes('ACADEMIC_COORDINATOR') ||
    inchargeRolesList.includes('COORDINATOR');
  const hasDisciplineIncharge =
    inchargeRolesList.includes('DISCIPLINE_INCHARGE') ||
    inchargeRolesList.includes('DISCIPLINE');
  const hasEcaIncharge =
    inchargeRolesList.includes('ECA_INCHARGE') ||
    inchargeRolesList.includes('ECA') ||
    inchargeRolesList.includes('SPORTS');
  const hasLabIncharge =
    inchargeRolesList.includes('LAB_INCHARGE') ||
    inchargeRolesList.includes('LAB') ||
    inchargeRolesList.includes('IT');
  const hasSpecialIncharge =
    inchargeRolesList.includes('OTHER') ||
    inchargeRolesList.includes('SPECIAL');
  const hasAnyInchargeRole =
    inchargeRolesList.length > 0 ||
    ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'LIBRARIAN'].includes(user?.role || '');

  return (
    <div className="max-w-5xl mx-auto min-h-screen px-3 sm:px-4 py-3 sm:py-4 space-y-3 font-sans pb-16">
      {/* ─── 1. MOBILE-LOCKED TOP HEADER ───────────────────── */}
      {activeTab === 'overview' ? (
        <div className="no-print rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#1e3a5f] via-[#244774] to-[#122843] p-3 sm:p-4 text-white shadow-sm space-y-2.5">
          {/* School Name & Website Link Row */}
          <div className="flex items-center justify-between border-b border-white/15 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-amber-400 text-[#1e3a5f] flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                NM
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black tracking-wide text-white leading-tight">
                  {school?.nameNepali || school?.name || ''}
                </h2>
                <p className="text-[9px] sm:text-[10px] text-blue-200">
                  {school?.address || ''}{school?.district ? ', ' + school.district : ''} • शिक्षक तथा कर्मचारी पोर्टल
                </p>
              </div>
            </div>

            <a
              href={school?.website || '/'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-2.5 py-0.5 text-[10px] font-black shadow-xs transition shrink-0"
            >
              <Globe size={11} />
              <span>वेबसाइट</span>
              <ExternalLink size={9} />
            </a>
          </div>

          {/* Teacher Identity & My Info Button */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 pt-0.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-amber-400 text-[#1e3a5f] flex items-center justify-center font-black text-base sm:text-lg shadow shrink-0">
                {displayName.charAt(0)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-amber-300">शिक्षक ड्यासबोर्ड</span>
                  <span className="text-[9px] bg-white/20 text-blue-100 px-1.5 py-0.2 rounded font-mono whitespace-nowrap">
                    BS {todayBS()}
                  </span>
                </div>
                <h1 className="text-xs sm:text-sm md:text-base font-black text-white font-serif leading-tight break-words">
                  नमस्ते, {displayName}!
                </h1>
                <p className="text-[10px] sm:text-[11px] text-blue-200 font-medium truncate">
                  {teacherProfile.inchargeRole ? (
                    <span className="text-amber-300 font-bold">{teacherProfile.inchargeRole}</span>
                  ) : (
                    'शिक्षक / कर्मचारी'
                  )}
                  {myAssignedClasses.length > 0 && ` • ${myAssignedClasses.map((c: any) => c.name).join(', ')}`}
                </p>
              </div>
            </div>

            {/* My Info Button */}
            <button
              type="button"
              onClick={() => setIsMyInfoOpen(true)}
              className="shrink-0 inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs shadow-2xs border border-white/20 transition cursor-pointer"
            >
              <User size={12} className="text-amber-400" />
              <span>मेरो विवरण</span>
            </button>
          </div>
        </div>
      ) : (
        /* Slim Header for Sub-Tabs with Back Button */
        <div className="no-print rounded-xl sm:rounded-2xl bg-[#1e3a5f] p-2.5 sm:p-3 text-white shadow-sm flex items-center justify-between gap-2">
          <button
            onClick={() => switchTab('overview')}
            className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] font-black px-2.5 sm:px-3 py-1.5 rounded-lg text-xs shadow-xs transition active:scale-95 cursor-pointer shrink-0"
          >
            <span>← मुख्य मेनु</span>
          </button>

          <div className="text-center truncate px-1">
            <span className="text-[10px] text-blue-200 block uppercase font-bold leading-tight">Teacher Portal</span>
            <strong className="text-xs sm:text-sm text-white truncate block">
              {displayName}
            </strong>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsMyInfoOpen(true)}
              className="p-1.5 bg-white/15 hover:bg-white/25 text-amber-300 rounded-lg text-xs"
              title="मेरो विवरण"
            >
              <User size={13} />
            </button>
            <a
              href={school?.website || '/'}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs"
              title="School Website"
            >
              <Globe size={13} />
            </a>
          </div>
        </div>
      )}

      {/* ─── TAB 1: OVERVIEW / DASHBOARD (RESPONSIVE FITTED GRID) ─── */}
      {activeTab === 'overview' && (
        <div className="space-y-2.5 sm:space-y-3">
          {/* Active Class or Exam Duty Alert Banner */}
          {todayExamDuties.length > 0 && (
            <div
              onClick={() => switchTab('exam_duties')}
              className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 flex items-center justify-between gap-2 cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Award size={18} className="text-amber-700 shrink-0 animate-bounce" />
                <div className="truncate">
                  <span className="text-[10px] font-black text-rose-700 uppercase block">आजको परीक्षा हल ड्युटी</span>
                  <p className="text-xs font-bold text-[#1e3a5f] truncate">
                    {todayExamDuties.map((d: any) => `${d.room?.name || `Room ${d.roomId}`} (${d.dutyRole === 'HALL_INCHARGE' ? 'इन्चार्ज' : 'निरीक्षक'})`).join(', ')}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black bg-amber-400 text-[#1e3a5f] px-2 py-0.5 rounded-md shrink-0">
                हाजिरी →
              </span>
            </div>
          )}

          {myAssignedClasses.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <School size={18} className="text-emerald-700 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">मुख्य कक्षा शिक्षक (Class Teacher)</span>
                  <p className="text-xs font-extrabold text-emerald-950 truncate">
                    {myAssignedClasses.map((c: any) => `${c.name}${c.section ? ` (${c.section})` : ''}`).join(', ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {pendingStudentLeavesCount > 0 && (
                  <button
                    onClick={() => switchTab('students_leave')}
                    className="rounded-lg bg-amber-400 text-[#1e3a5f] px-2 py-1 text-[10px] font-bold shadow-2xs"
                  >
                    {pendingStudentLeavesCount} बिदा बाँकी
                  </button>
                )}
                <Link
                  href="/dashboard/attendance"
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[10px] font-bold text-white shadow-2xs transition"
                >
                  हाजिरी →
                </Link>
              </div>
            </div>
          )}

          {/* Quick 3 Metrics Pill Row */}
          <div className="grid grid-cols-3 gap-2">
            {/* Today's Classes */}
            <div
              onClick={() => switchTab('routine')}
              className="rounded-xl border border-gray-100 bg-white p-2 sm:p-2.5 shadow-2xs hover:border-blue-300 active:scale-98 transition cursor-pointer text-center"
            >
              <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 block uppercase">आजको घण्टी</span>
              <p className="text-sm sm:text-base font-black font-mono text-[#1e3a5f] leading-tight">
                {todayRoutines.length}
              </p>
              <span className="text-[9px] text-blue-600 font-semibold">पिरियडहरू</span>
            </div>

            {/* Leave Balance */}
            <div
              onClick={() => switchTab('leaves')}
              className="rounded-xl border border-gray-100 bg-white p-2 sm:p-2.5 shadow-2xs hover:border-amber-300 active:scale-98 transition cursor-pointer text-center"
            >
              <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 block uppercase">बिदा मौज्दात</span>
              <p className="text-sm sm:text-base font-black font-mono text-amber-700 leading-tight">
                {leaveStats?.remainingDays !== undefined ? leaveStats.remainingDays : '—'}
              </p>
              <span className="text-[9px] text-amber-600 font-semibold">दिन बाँकी</span>
            </div>

            {/* Pending Tasks */}
            <div
              onClick={() => switchTab('tasks')}
              className="rounded-xl border border-gray-100 bg-white p-2 sm:p-2.5 shadow-2xs hover:border-rose-300 active:scale-98 transition cursor-pointer text-center"
            >
              <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 block uppercase">कार्यभार</span>
              <p className="text-sm sm:text-base font-black font-mono text-rose-700 leading-tight">
                {pendingTasks.length}
              </p>
              <span className="text-[9px] text-rose-600 font-semibold">पेन्डिङ कार्य</span>
            </div>
          </div>

          {/* ─── FITTED GRID OF ACTION BUTTONS (RESPONSIVE GRID) ─── */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-0.5">
            {/* 1. Daily Teaching Log & Homework */}
            <button
              type="button"
              onClick={() => switchTab('daily_log')}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-blue-100 hover:border-blue-400 shadow-2xs hover:shadow-xs active:scale-95 transition text-center group cursor-pointer"
            >
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-1 group-hover:bg-blue-600 group-hover:text-white transition shrink-0">
                <BookOpen size={15} />
              </div>
              <strong className="text-[11px] font-black text-gray-900 leading-tight">दैनिक डायरी</strong>
              <span className="text-[9px] text-gray-400 font-medium truncate max-w-full">Daily Log/HW</span>
            </button>

            {/* 2. Take Class Attendance */}
            <button
              type="button"
              onClick={() => switchTab('attendance')}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-emerald-100 hover:border-emerald-400 shadow-2xs hover:shadow-xs active:scale-95 transition text-center group cursor-pointer"
            >
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-1 group-hover:bg-emerald-600 group-hover:text-white transition shrink-0">
                <CalendarCheck size={15} />
              </div>
              <strong className="text-[11px] font-black text-gray-900 leading-tight">विद्यार्थी हाजिरी</strong>
              <span className="text-[9px] text-gray-400 font-medium truncate max-w-full">Attendance</span>
            </button>

            {/* 3. My Timetable / Routine */}
            <button
              type="button"
              onClick={() => switchTab('routine')}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-indigo-100 hover:border-indigo-400 shadow-2xs hover:shadow-xs active:scale-95 transition text-center group cursor-pointer"
            >
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-1 group-hover:bg-indigo-600 group-hover:text-white transition shrink-0">
                <Clock size={15} />
              </div>
              <strong className="text-[11px] font-black text-gray-900 leading-tight">समय तालिका</strong>
              <span className="text-[9px] text-gray-400 font-medium truncate max-w-full">Routine</span>
            </button>

            {/* 4. My Leave Applications */}
            <button
              type="button"
              onClick={() => switchTab('leaves')}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-amber-100 hover:border-amber-400 shadow-2xs hover:shadow-xs active:scale-95 transition text-center group cursor-pointer"
            >
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-1 group-hover:bg-amber-500 group-hover:text-white transition shrink-0">
                <FileText size={15} />
              </div>
              <strong className="text-[11px] font-black text-gray-900 leading-tight">मेरो बिदा</strong>
              <span className="text-[9px] text-gray-400 font-medium truncate max-w-full">My Leaves</span>
            </button>

            {/* 5. Student Leave Approvals */}
            <button
              type="button"
              onClick={() => switchTab('students_leave')}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-purple-100 hover:border-purple-400 shadow-2xs hover:shadow-xs active:scale-95 transition text-center group cursor-pointer"
            >
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mb-1 group-hover:bg-purple-600 group-hover:text-white transition shrink-0">
                <UserCheck size={15} />
              </div>
              <strong className="text-[11px] font-black text-gray-900 leading-tight">विद्यार्थी बिदा</strong>
              <span className="text-[9px] text-gray-400 font-medium truncate max-w-full">Leaves ({pendingStudentLeavesCount})</span>
            </button>

            {/* 6. Exam Duties */}
            <button
              type="button"
              onClick={() => switchTab('exam_duties')}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-rose-100 hover:border-rose-400 shadow-2xs hover:shadow-xs active:scale-95 transition text-center group cursor-pointer"
            >
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center mb-1 group-hover:bg-rose-600 group-hover:text-white transition shrink-0">
                <Award size={15} />
              </div>
              <strong className="text-[11px] font-black text-gray-900 leading-tight">परीक्षा ड्युटी</strong>
              <span className="text-[9px] text-gray-400 font-medium truncate max-w-full">Exam Duties</span>
            </button>

            {/* 7. Salary & Advance Ledger */}
            <button
              type="button"
              onClick={() => switchTab('salary_peshki')}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-teal-100 hover:border-teal-400 shadow-2xs hover:shadow-xs active:scale-95 transition text-center group cursor-pointer"
            >
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-1 group-hover:bg-teal-600 group-hover:text-white transition shrink-0">
                <Receipt size={15} />
              </div>
              <strong className="text-[11px] font-black text-gray-900 leading-tight">तलब / पेश्की</strong>
              <span className="text-[9px] text-gray-400 font-medium truncate max-w-full">Salary</span>
            </button>

            {/* 8. My Tasks & Deadlines */}
            <button
              type="button"
              onClick={() => switchTab('tasks')}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-orange-100 hover:border-orange-400 shadow-2xs hover:shadow-xs active:scale-95 transition text-center group cursor-pointer"
            >
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center mb-1 group-hover:bg-orange-600 group-hover:text-white transition shrink-0">
                <CheckCircle size={15} />
              </div>
              <strong className="text-[11px] font-black text-gray-900 leading-tight">कार्यभार</strong>
              <span className="text-[9px] text-gray-400 font-medium truncate max-w-full">Tasks ({pendingTasks.length})</span>
            </button>

            {/* 9. School Notices */}
            <button
              type="button"
              onClick={() => switchTab('notices')}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-sky-100 hover:border-sky-400 shadow-2xs hover:shadow-xs active:scale-95 transition text-center group cursor-pointer"
            >
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center mb-1 group-hover:bg-sky-600 group-hover:text-white transition shrink-0">
                <Bell size={15} />
              </div>
              <strong className="text-[11px] font-black text-gray-900 leading-tight">सूचनाहरू</strong>
              <span className="text-[9px] text-gray-400 font-medium truncate max-w-full">Notices ({noticesData?.length || 0})</span>
            </button>

            {/* 10. Academic Calendar */}
            <button
              type="button"
              onClick={() => setIsCalendarModalOpen(true)}
              className="col-span-full flex items-center justify-center gap-2 p-2 rounded-xl bg-gradient-to-r from-slate-900 via-[#1e3a5f] to-slate-900 text-white shadow-2xs hover:shadow active:scale-98 transition cursor-pointer"
            >
              <Calendar size={13} className="text-amber-400" />
              <strong className="text-[11px] font-extrabold">शैक्षिक क्यालेन्डर (Academic Calendar)</strong>
            </button>
          </div>

          {/* Incharge Hubs Row if Teacher Has Incharge Roles */}
          {hasAnyInchargeRole && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={11} className="text-indigo-600" />
                  विशेष जिम्मेवारी हबहरू (Incharge Hubs)
                </span>
                <span className="text-[8.5px] text-indigo-700 font-bold bg-indigo-200/60 px-1 py-0.2 rounded">
                  Authorized
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {hasExamIncharge && (
                  <button
                    type="button"
                    onClick={() => switchTab('incharge_exam')}
                    className="p-1.5 bg-white rounded-lg border border-indigo-100 text-center hover:border-indigo-300 shadow-2xs transition cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-indigo-900 block truncate">परीक्षा इन्चार्ज</span>
                    <span className="text-[8.5px] text-gray-400">Exam Hub</span>
                  </button>
                )}
                {hasCoordinatorIncharge && (
                  <button
                    type="button"
                    onClick={() => switchTab('incharge_coordinator')}
                    className="p-1.5 bg-white rounded-lg border border-indigo-100 text-center hover:border-indigo-300 shadow-2xs transition cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-indigo-900 block truncate">शैक्षिक संयोजक</span>
                    <span className="text-[8.5px] text-gray-400">Coordinator</span>
                  </button>
                )}
                {hasDisciplineIncharge && (
                  <button
                    type="button"
                    onClick={() => switchTab('incharge_discipline')}
                    className="p-1.5 bg-white rounded-lg border border-indigo-100 text-center hover:border-indigo-300 shadow-2xs transition cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-indigo-900 block truncate">अनुशासन इन्चार्ज</span>
                    <span className="text-[8.5px] text-gray-400">Discipline</span>
                  </button>
                )}
                {hasEcaIncharge && (
                  <button
                    type="button"
                    onClick={() => switchTab('incharge_eca')}
                    className="p-1.5 bg-white rounded-lg border border-indigo-100 text-center hover:border-indigo-300 shadow-2xs transition cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-indigo-900 block truncate">अतिरिक्त (ECA)</span>
                    <span className="text-[8.5px] text-gray-400">ECA/Sports</span>
                  </button>
                )}
                {hasLabIncharge && (
                  <button
                    type="button"
                    onClick={() => switchTab('incharge_lab')}
                    className="p-1.5 bg-white rounded-lg border border-indigo-100 text-center hover:border-indigo-300 shadow-2xs transition cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-indigo-900 block truncate">प्रयोगशाला/IT</span>
                    <span className="text-[8.5px] text-gray-400">Lab Incharge</span>
                  </button>
                )}
                {hasSpecialIncharge && (
                  <button
                    type="button"
                    onClick={() => switchTab('incharge_special')}
                    className="p-1.5 bg-white rounded-lg border border-indigo-100 text-center hover:border-indigo-300 shadow-2xs transition cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-indigo-900 block truncate">विशेष जिम्मेवारी</span>
                    <span className="text-[8.5px] text-gray-400">Special Hub</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── 3. TEACHER "MY INFO" (मेरो विवरण) POPUP MODAL ────────────────── */}
      {isMyInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#1e3a5f] to-[#122843] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={18} className="text-amber-400" />
                <h3 className="text-sm font-black tracking-wide">
                  शिक्षक विवरण (Teacher Profile)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMyInfoOpen(false)}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 overflow-y-auto">
              {/* Profile Card Top */}
              <div className="flex items-center gap-3.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                <div className="h-16 w-16 rounded-2xl bg-amber-400 text-[#1e3a5f] font-black text-2xl flex items-center justify-center shadow shrink-0">
                  {displayName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full inline-block">
                    {teacherProfile.designation || 'शिक्षक / प्राध्यापक'}
                  </span>
                  <h4 className="text-base font-black text-gray-900 truncate mt-0.5">
                    {displayName}
                  </h4>
                  <p className="text-xs text-gray-500 font-mono">
                    शिक्षक कोड: <b>{teacherProfile.teacherCode || (user?.teacher as any)?.teacherCode || 'NM-TCH'}</b>
                  </p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase">ईमेल</span>
                  <p className="font-semibold text-gray-800 truncate">{teacherProfile.email || (user as any)?.email || '—'}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase">मोबाइल नं.</span>
                  <p className="font-semibold text-gray-800 font-mono">{teacherProfile.phone || '—'}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase">विषय / विशेषज्ञता</span>
                  <p className="font-semibold text-gray-800 truncate">{teacherProfile.specialization || 'सामान्य'}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase">रक्त समूह (Blood Group)</span>
                  <p className="font-bold text-rose-700">{teacherProfile.bloodGroup || 'O+'}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase">नियुक्ति मिति</span>
                  <p className="font-semibold text-gray-800 font-mono">{teacherProfile.joiningDateBs || '—'} BS</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase">आपतकालीन सम्पर्क</span>
                  <p className="font-semibold text-gray-800 font-mono">{teacherProfile.emergencyContact || '—'}</p>
                </div>
              </div>

              {/* Incharge Responsibilities */}
              {inchargeRolesList.length > 0 && (
                <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 space-y-1">
                  <span className="text-[10px] font-bold text-indigo-900 uppercase block">तोकिएको विशेष जिम्मेवारी (Incharge Roles)</span>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {inchargeRolesList.map((role: string, idx: number) => (
                      <span key={idx} className="text-[10px] font-extrabold bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded-md">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bank Details Note */}
              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/70 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">बैंक खाता विवरण</span>
                  <p className="font-semibold text-gray-800 text-[11px]">
                    {teacherProfile.bankName || 'बैंक'} • {teacherProfile.bankAccountNo ? `AC: ${teacherProfile.bankAccountNo}` : 'खाता प्रविष्ट छैन'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMyInfoOpen(false);
                    switchTab('salary_peshki');
                  }}
                  className="text-[10px] font-black text-blue-700 hover:underline cursor-pointer"
                >
                  लेजर हेर्नुहोस् →
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <a
                href={school?.website || '/'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-[#1e3a5f] font-bold hover:underline"
              >
                <Globe size={13} />
                <span>{school?.website ? school.website.replace(/^https?:\/\//, '') : 'विद्यालय वेबसाइट'}</span>
              </a>
              <button
                type="button"
                onClick={() => setIsMyInfoOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs cursor-pointer transition"
              >
                बन्द गर्नुहोस् (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. ACADEMIC CALENDAR MODAL ───────────────────────────────────── */}
      {isCalendarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#1e3a5f] to-[#122843] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-amber-400" />
                <h3 className="text-sm font-black tracking-wide">
                  शैक्षिक पात्रो तथा क्यालेन्डर (Academic Calendar)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCalendarModalOpen(false)}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3 overflow-y-auto">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900">
                📅 <b>शैक्षिक सत्र २०८३/८४:</b> विद्यालयको सम्पूर्ण परीक्षा, बिदा, चाडपर्व तथा अतिरिक्त क्रियाकलापहरूको आधिकारिक क्यालेन्डर।
              </div>

              <div className="rounded-2xl border border-gray-200 overflow-hidden bg-slate-50 aspect-4/3 flex items-center justify-center p-4">
                <iframe
                  src="/calendar"
                  className="w-full h-full rounded-xl border border-gray-200 bg-white"
                  title="Nepal Mavi Academic Calendar"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-gray-500 font-mono text-[11px]">मिति: BS {todayBS()}</span>
                <Link
                  href="/calendar"
                  target="_blank"
                  className="inline-flex items-center gap-1 text-blue-700 font-bold hover:underline"
                >
                  <span>पूरा क्यालेन्डर नयाँ ट्याबमा खोल्नुहोस्</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCalendarModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs cursor-pointer transition"
              >
                बन्द गर्नुहोस् (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: CLASS ATTENDANCE (विद्यार्थी हाजिरी) ───────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-5">
          {/* Header Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-900 p-5 text-white shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-lg mb-1.5 shadow-2xs">
                <CalendarCheck size={14} />
                <span>Classroom Daily Student Attendance</span>
              </div>
              <h2 className="text-xl font-extrabold text-white">कक्षा विद्यार्थी हाजिरी (Class Attendance)</h2>
              <p className="text-xs text-emerald-100 mt-0.5 font-nepali">
                कक्षाका विद्यार्थीहरूको दैनिक हाजिरी लिनुहोस् र एक क्लिकमा सुरक्षित गर्नुहोस् ।
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => refetchTeacherAttendance()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-xs transition cursor-pointer"
              >
                <RefreshCw size={13} className={isTeacherAttendanceLoading ? 'animate-spin' : ''} />
                <span>रिफ्रेस (Refresh)</span>
              </button>
            </div>
          </div>

          {/* Warning banner if teacher is not assigned to any class */}
          {!isSuperAdminOrAdmin && myAssignedAttendanceClasses.length === 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-2xs">
                <AlertCircle size={26} />
              </div>
              <h3 className="text-base font-black text-amber-900">
                तपाईंलाई कुनै पनि कक्षाको कक्षा शिक्षक (Class Teacher) तोकिएको छैन
              </h3>
              <p className="text-xs text-amber-800/90 max-w-xl mx-auto leading-relaxed font-nepali">
                विद्यालयको नयाँ नियम अनुसार केवल आधिकारिक रूपमा तोकिएको <strong>कक्षा शिक्षक (Class Teacher)</strong> ले मात्र आफ्नो कक्षाका विद्यार्थीहरूको दैनिक हाजिरी लिन र सुरक्षित गर्न सक्नुहुन्छ ।
                यदि तपाईं कुनै कक्षाको कक्षा शिक्षक हुनुहुन्छ भने कृपया विद्यालय प्रशासन (Admin Portal) मा सम्पर्क गरी कक्षा तोक्न लगाउनुहोस् ।
              </p>
            </div>
          )}

          {/* Class, Date and Quick Stats Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Class Selector */}
              <div className="sm:col-span-5">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Class (कक्षा छान्नुहोस्) *
                </label>
                <select
                  value={selectedAttendanceClass}
                  onChange={(e) => setSelectedAttendanceClass(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                >
                  <option value="">-- कक्षा चयन गर्नुहोस् --</option>
                  {myAssignedAttendanceClasses.map((c: any) => {
                    const isMyClass = c.classTeacherId === teacherId;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section ? `(${c.section})` : ''} {isMyClass ? '★ (तपाईंको कक्षा)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Date Selector */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Attendance Date (हाजिरी मिति BS) *
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={attendanceDateBs}
                    onChange={(e) => setAttendanceDateBs(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-mono font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setAttendanceDateBs(todayBS())}
                    className="px-2.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold whitespace-nowrap transition cursor-pointer"
                  >
                    आज (Today)
                  </button>
                </div>
              </div>

              {/* Mark All Present & Action */}
              <div className="sm:col-span-3 flex sm:justify-end items-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (attendanceStudentsList.length === 0) return;
                    const updated: Record<number, { status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE'; remark: string; leaveType: string }> = { ...attendanceRosterMap };
                    attendanceStudentsList.forEach((st: any) => {
                      updated[st.id] = {
                        ...(updated[st.id] || { remark: '', leaveType: '' }),
                        status: 'PRESENT',
                      };
                    });
                    setAttendanceRosterMap(updated);
                    toast.success('सबै विद्यार्थीलाई उपस्थित (Present) चिन्ह लगाइयो!');
                  }}
                  disabled={attendanceStudentsList.length === 0}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-2xs transition cursor-pointer disabled:opacity-50"
                >
                  <CheckCheck size={14} />
                  <span>सबै हाजिर (Mark All Present)</span>
                </button>
              </div>
            </div>

            {/* Holiday Notice if today is marked as holiday */}
            {isAttendanceHoliday && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium">
                <AlertCircle size={16} className="text-amber-600 shrink-0" />
                <span>
                  <strong>सूचना (Holiday Note):</strong> {attendanceHolidayRemark || 'यस मितिमा विद्यालय विदा तोकिएको छ । तथापि तपाईं हाजिरी सुरक्षित गर्न सक्नुहुन्छ ।'}
                </span>
              </div>
            )}

            {/* Attendance Summary Stat Badges */}
            {attendanceStudentsList.length > 0 && (() => {
              const total = attendanceStudentsList.length;
              let presentCount = 0;
              let absentCount = 0;
              let lateCount = 0;
              let leaveCount = 0;

              attendanceStudentsList.forEach((st: any) => {
                const s = attendanceRosterMap[st.id]?.status || 'PRESENT';
                if (s === 'PRESENT') presentCount++;
                else if (s === 'ABSENT') absentCount++;
                else if (s === 'LATE') lateCount++;
                else if (s === 'LEAVE') leaveCount++;
              });

              return (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-gray-100">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">कुल विद्यार्थी</span>
                    <strong className="text-base font-black text-gray-900">{total}</strong>
                  </div>
                  <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-100 text-center">
                    <span className="text-[10px] text-emerald-700 font-bold uppercase block">उपस्थित (P)</span>
                    <strong className="text-base font-black text-emerald-800">{presentCount}</strong>
                    <span className="text-[9px] text-emerald-600 font-bold ml-1">
                      ({total > 0 ? Math.round((presentCount / total) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="bg-rose-50/80 p-2.5 rounded-xl border border-rose-100 text-center">
                    <span className="text-[10px] text-rose-700 font-bold uppercase block">अनुपस्थित (A)</span>
                    <strong className="text-base font-black text-rose-800">{absentCount}</strong>
                  </div>
                  <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-100 text-center">
                    <span className="text-[10px] text-amber-700 font-bold uppercase block">ढिला (L)</span>
                    <strong className="text-base font-black text-amber-800">{lateCount}</strong>
                  </div>
                  <div className="bg-purple-50/80 p-2.5 rounded-xl border border-purple-100 text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-purple-700 font-bold uppercase block">बिदा (Leave)</span>
                    <strong className="text-base font-black text-purple-800">{leaveCount}</strong>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Search Bar & Attendance Roster */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
            <div className="p-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-emerald-700" />
                <h3 className="font-extrabold text-xs text-gray-900">
                  विद्यार्थी नामावली तथा हाजिरी तालिका (Student Attendance Roster)
                </h3>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full">
                  {attendanceStudentsList.length} Students
                </span>
              </div>

              {/* Student Search */}
              <div className="relative w-full sm:w-64">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="विद्यार्थी वा रोल नं. खोज्नुहोस्..."
                  value={attendanceRosterSearch}
                  onChange={(e) => setAttendanceRosterSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {isTeacherAttendanceLoading ? (
              <div className="py-16 text-center text-gray-400 space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs">विद्यार्थी विवरण तथा हाजिरी लोड हुँदैछ...</p>
              </div>
            ) : attendanceStudentsList.length === 0 ? (
              <div className="py-16 text-center text-gray-400 space-y-2">
                <Users size={32} className="mx-auto text-gray-300" />
                <p className="text-xs font-bold text-gray-600">यस कक्षामा कुनै विद्यार्थी भेटिएन वा कक्षा चयन गरिएको छैन ।</p>
                <p className="text-[11px] text-gray-400">कृपया माथिबाट उपयुक्त कक्षा चयन गर्नुहोस् ।</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {/* Roster Items */}
                {attendanceStudentsList
                  .filter((st: any) => {
                    if (!attendanceRosterSearch.trim()) return true;
                    const q = attendanceRosterSearch.toLowerCase();
                    const name = (st.fullName || '').toLowerCase();
                    const roll = String(st.rollNo || '');
                    const emis = String(st.studentId || '');
                    return name.includes(q) || roll.includes(q) || emis.includes(q);
                  })
                  .map((st: any, idx: number) => {
                    const curState = attendanceRosterMap[st.id] || { status: 'PRESENT', remark: '', leaveType: '' };
                    const status = curState.status;

                    return (
                      <div
                        key={st.id}
                        className={`p-3 sm:p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition ${
                          status === 'ABSENT'
                            ? 'bg-rose-50/40 hover:bg-rose-50/70'
                            : status === 'LATE'
                            ? 'bg-amber-50/40 hover:bg-amber-50/70'
                            : status === 'LEAVE'
                            ? 'bg-purple-50/40 hover:bg-purple-50/70'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Student Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {st.rollNo ? String(st.rollNo).padStart(2, '0') : idx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <strong className="text-xs font-black text-gray-900 truncate">
                                {st.fullName}
                              </strong>
                              {st.gender && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 uppercase">
                                  {st.gender}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono flex items-center gap-2 mt-0.5">
                              <span>Roll: <strong className="text-gray-700">{st.rollNo || 'N/A'}</strong></span>
                              <span>•</span>
                              <span>EMIS: <strong className="text-gray-700">{st.studentId || st.emisNumber || 'N/A'}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Status Toggles & Remarks */}
                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                          {/* 4 Status Buttons */}
                          <div className="inline-flex rounded-xl bg-gray-100 p-0.5 border border-gray-200">
                            {/* PRESENT */}
                            <button
                              type="button"
                              onClick={() => {
                                setAttendanceRosterMap((prev) => ({
                                  ...prev,
                                  [st.id]: { ...(prev[st.id] || { remark: '', leaveType: '' }), status: 'PRESENT' },
                                }));
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                                status === 'PRESENT'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-gray-600 hover:text-emerald-700'
                              }`}
                            >
                              <Check size={12} />
                              <span>उपस्थित (P)</span>
                            </button>

                            {/* ABSENT */}
                            <button
                              type="button"
                              onClick={() => {
                                setAttendanceRosterMap((prev) => ({
                                  ...prev,
                                  [st.id]: { ...(prev[st.id] || { remark: '', leaveType: '' }), status: 'ABSENT' },
                                }));
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                                status === 'ABSENT'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'text-gray-600 hover:text-rose-700'
                              }`}
                            >
                              <UserX size={12} />
                              <span>अनुपस्थित (A)</span>
                            </button>

                            {/* LATE */}
                            <button
                              type="button"
                              onClick={() => {
                                setAttendanceRosterMap((prev) => ({
                                  ...prev,
                                  [st.id]: { ...(prev[st.id] || { remark: '', leaveType: '' }), status: 'LATE' },
                                }));
                              }}
                              className={`px-2 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                                status === 'LATE'
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'text-gray-600 hover:text-amber-700'
                              }`}
                            >
                              <Clock size={12} />
                              <span>ढिला (L)</span>
                            </button>

                            {/* LEAVE */}
                            <button
                              type="button"
                              onClick={() => {
                                setAttendanceRosterMap((prev) => ({
                                  ...prev,
                                  [st.id]: { ...(prev[st.id] || { remark: '', leaveType: '' }), status: 'LEAVE' },
                                }));
                              }}
                              className={`px-2 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                                status === 'LEAVE'
                                  ? 'bg-purple-600 text-white shadow-xs'
                                  : 'text-gray-600 hover:text-purple-700'
                              }`}
                            >
                              <FileText size={12} />
                              <span>बिदा (Lv)</span>
                            </button>
                          </div>

                          {/* Optional Remark Input */}
                          <input
                            type="text"
                            placeholder="कैफियत (Remark)..."
                            value={curState.remark || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAttendanceRosterMap((prev) => ({
                                ...prev,
                                [st.id]: { ...(prev[st.id] || { status: 'PRESENT', leaveType: '' }), remark: val },
                              }));
                            }}
                            className="w-full sm:w-40 rounded-lg border border-gray-200 px-2 py-1 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Bottom Save Bar */}
            {attendanceStudentsList.length > 0 && (
              <div className="p-4 bg-slate-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-gray-500 font-nepali">
                  * हाजिरी प्रविष्टि पश्चात तलको बटन थिची सुरक्षित गर्नुहोस्।
                </p>

                <button
                  type="button"
                  onClick={() => {
                    if (!selectedAttendanceClass) {
                      toast.error('कक्षा चयन गर्नुहोस्।');
                      return;
                    }
                    const entries = Object.entries(attendanceRosterMap).map(([studentId, data]) => ({
                      studentId: Number(studentId),
                      status: data.status,
                      remark: data.remark || undefined,
                      leaveType: data.leaveType || undefined,
                    }));

                    saveTeacherAttendanceMutation.mutate({
                      classId: selectedAttendanceClass,
                      dateBs: attendanceDateBs,
                      dateAd: bsToAD(attendanceDateBs),
                      entries,
                    });
                  }}
                  disabled={saveTeacherAttendanceMutation.isPending}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] active:scale-95 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>
                    {saveTeacherAttendanceMutation.isPending
                      ? 'हाजिरी सुरक्षित हुँदैछ...'
                      : 'हाजिरी सुरक्षित गर्नुहोस् (Save Attendance)'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: DAILY TEACHING LOG (दैनिक शिक्षण डायरी) ────────────────────── */}
      {activeTab === 'daily_log' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-[#1e3a5f] via-[#264b77] to-[#1e3a5f] p-5 text-white shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-[#1e3a5f] font-black text-xs rounded-lg mb-1.5 shadow-2xs">
                <BookOpen size={14} />
                <span>Teacher Daily Diary & Classroom Teaching Log</span>
              </div>
              <h2 className="text-xl font-extrabold text-white">दैनिक शिक्षण लग तथा सिकाइ सहजीकरण डायरी</h2>
              <p className="text-xs text-blue-200 mt-0.5 font-nepali">
                प्रत्येक घण्टीमा पढाएको पाठ, सिकाइ उपलब्धि तथा विद्यार्थीलाई दिएको गृहकार्य रेकर्ड गर्नुहोस्। यो विवरण विद्यार्थी र प्रशासनले पनि हेर्न सक्नेछन्।
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="bg-white/20 px-3.5 py-2 rounded-xl text-white font-black backdrop-blur-xs">
                {teacherLogsData?.length || 0} Lessons Recorded
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 Cols: Quick Add Lesson Log Form */}
            <div className="lg:col-span-5 rounded-3xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
              <div className="border-b border-gray-100 pb-3 flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-base text-[#1e3a5f] flex items-center gap-2">
                    <BookOpen size={18} className="text-amber-500" />
                    <span>Record Lesson Taught (पाठ प्रविष्टि)</span>
                  </h3>
                  <p className="text-xs text-gray-500 font-nepali">
                    घण्टी तालिकाबाट सिधै छान्नुहोस् वा तल कक्षा र विषय चयन गर्नुहोस्
                  </p>
                </div>

                <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 cursor-pointer bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                  <input
                    type="checkbox"
                    checked={logFormIsSubstitute}
                    onChange={(e) => setLogFormIsSubstitute(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>सट्टा घण्टी (Substitute)</span>
                </label>
              </div>

              {/* ─── 1. TIMETABLE ROUTINE SELECTOR BAR ─── */}
              <div className="rounded-2xl bg-gradient-to-br from-blue-50/60 via-slate-50 to-indigo-50/40 p-3.5 border border-blue-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-blue-900 flex items-center gap-1.5 uppercase tracking-wide">
                    <Clock size={13} className="text-blue-600" />
                    <span>तपाईंको रुटिन तालिका (My Timetable):</span>
                  </span>

                  {/* Day Picker */}
                  <select
                    value={selectedRoutineDay}
                    onChange={(e) => setSelectedRoutineDay(Number(e.target.value))}
                    className="text-[11px] font-bold text-[#1e3a5f] bg-white border border-blue-200 rounded-lg px-2 py-0.5 shadow-2xs"
                  >
                    <option value={1}>आइतबार (Sun)</option>
                    <option value={2}>सोमबार (Mon)</option>
                    <option value={3}>मंगलबार (Tue)</option>
                    <option value={4}>बुधबार (Wed)</option>
                    <option value={5}>बिहीबार (Thu)</option>
                    <option value={6}>शुक्रबार (Fri)</option>
                  </select>
                </div>

                {routinePeriodsForDay.length === 0 ? (
                  <div className="p-3 bg-white/80 rounded-xl border border-dashed border-blue-200 text-center text-xs text-gray-500">
                    यस दिनमा कुनै रुटिन तालिका तोकिएको छैन । तल फारमबाट कक्षा र घण्टी छान्नुहोस् ।
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {routinePeriodsForDay.map((r: any) => {
                      const isSelected =
                        Number(logFormClassId) === r.classId &&
                        logFormPeriodNo === r.periodNo &&
                        (logFormSubjectName === r.subject?.name || !logFormSubjectName);

                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setLogFormClassId(String(r.classId));
                            setLogFormPeriodNo(r.periodNo);
                            if (r.subject) {
                              setLogFormSubjectId(String(r.subject.id));
                              setLogFormSubjectName(r.subject.name);
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-md scale-[1.02]'
                              : 'bg-white hover:bg-blue-50/80 text-gray-800 border-blue-200/80 shadow-2xs'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-black text-xs">
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${isSelected ? 'bg-amber-400 text-[#1e3a5f]' : 'bg-blue-100 text-blue-900'}`}>
                                घण्टी {r.periodNo}
                              </span>
                              <span className="truncate text-[11px]">{r.class?.name}</span>
                            </div>
                            <div className={`text-[11px] font-bold mt-0.5 truncate ${isSelected ? 'text-blue-100' : 'text-blue-700'}`}>
                              {r.subject?.name || 'Subject'}
                              {r.startTime && <span className="font-mono text-[10px] opacity-75 ml-1">({r.startTime})</span>}
                            </div>
                          </div>
                          {isSelected ? (
                            <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
                          ) : (
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                              छान्नुहोस्
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ─── 2. DETAILED LESSON ENTRY FORM ─── */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!logFormClassId) {
                    toast.error('Please select an assigned class.');
                    return;
                  }
                  if (!logFormTopic.trim()) {
                    toast.error('Please enter the lesson topic taught.');
                    return;
                  }

                  createTeachingLogMutation.mutate({
                    teacherId,
                    classId: logFormClassId,
                    subjectId: logFormSubjectId || undefined,
                    subjectName: logFormSubjectName || undefined,
                    dateBs: logFormDateBs || todayBS(),
                    periodNo: logFormPeriodNo || 1,
                    topicTaught: logFormTopic.trim(),
                    learningOutcome: logFormOutcome.trim() || undefined,
                    homework: logFormHomework.trim() || undefined,
                    teachingMethod: logFormMethod.trim() || undefined,
                    status: 'COMPLETED',
                  });
                }}
                className="space-y-3.5 text-xs"
              >
                {/* Class & Period Selectors */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      {logFormIsSubstitute ? 'Class (सम्पूर्ण कक्षाहरू) *' : 'Assigned Class (तोकिएको कक्षा) *'}
                    </label>
                    <select
                      required
                      value={logFormClassId}
                      onChange={(e) => {
                        const newCId = e.target.value;
                        setLogFormClassId(newCId);
                        // Auto-fill subject if only 1 subject assigned in this class
                        const subs = (classesData?.find((c: any) => c.id === Number(newCId))?.subjects || [])
                          .filter((cs: any) => cs.teacherId === teacherId)
                          .map((cs: any) => cs.subject)
                          .filter(Boolean);
                        if (subs.length === 1) {
                          setLogFormSubjectId(String(subs[0].id));
                          setLogFormSubjectName(subs[0].name);
                        }
                      }}
                      className="erp-input font-bold"
                    >
                      <option value="">-- कक्षा छान्नुहोस् --</option>
                      {availableClassesForLog?.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.section ? `(${c.section})` : ''}
                        </option>
                      ))}
                    </select>
                    {!logFormIsSubstitute && teacherAssignedClasses.length > 0 && (
                      <span className="text-[10px] text-blue-700 font-bold block mt-0.5">
                        ✓ {teacherAssignedClasses.length} assigned classes
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Period (घण्टी) *</label>
                    <select
                      value={logFormPeriodNo}
                      onChange={(e) => setLogFormPeriodNo(Number(e.target.value))}
                      className="erp-input font-bold"
                      required
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => {
                        const matchingRoutine = routinePeriodsForDay.find((r: any) => r.periodNo === p);
                        return (
                          <option key={p} value={p}>
                            Period {p} {matchingRoutine ? `(${matchingRoutine.class?.name} - ${matchingRoutine.subject?.name})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Subject & Date Selectors */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      {logFormIsSubstitute ? 'Subject (विषय) *' : 'Assigned Subject (तोकिएको विषय) *'}
                    </label>
                    {availableSubjectsForLog.length > 0 && !logFormIsSubstitute ? (
                      <select
                        required
                        value={logFormSubjectName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLogFormSubjectName(val);
                          const matching = availableSubjectsForLog.find((s: any) => s.name === val);
                          if (matching) setLogFormSubjectId(String(matching.id));
                        }}
                        className="erp-input font-bold"
                      >
                        <option value="">-- विषय छान्नुहोस् --</option>
                        {availableSubjectsForLog.map((s: any) => (
                          <option key={s.id} value={s.name}>
                            {s.name} {s.code ? `(${s.code})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        placeholder="e.g. Science / Math / नेपाली"
                        value={logFormSubjectName}
                        onChange={(e) => setLogFormSubjectName(e.target.value)}
                        className="erp-input font-bold"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Date (मिति BS) *</label>
                    <input
                      type="text"
                      required
                      value={logFormDateBs}
                      onChange={(e) => setLogFormDateBs(e.target.value)}
                      className="erp-input font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Topic Taught */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Lesson Topic Taught (पढाइएको पाठ / शीर्षक) *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="e.g. Chapter 5: Human Circulatory System - Blood vessels & Heart structure"
                    value={logFormTopic}
                    onChange={(e) => setLogFormTopic(e.target.value)}
                    className="erp-input font-medium"
                  />
                </div>

                {/* Learning Outcome */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Learning Outcome (सिकाइ उपलब्धि):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Students can sketch and label heart chambers"
                    value={logFormOutcome}
                    onChange={(e) => setLogFormOutcome(e.target.value)}
                    className="erp-input"
                  />
                </div>

                {/* Homework Assigned */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Homework / Assignment (गृहकार्य / कक्षाकार्य):
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Solve Q1 to Q6 from exercise 5.2 and make a summary note"
                    value={logFormHomework}
                    onChange={(e) => setLogFormHomework(e.target.value)}
                    className="erp-input font-medium"
                  />
                </div>

                {/* Teaching Method */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Teaching Method / Materials (विधि र सामग्री):
                  </label>
                  <select
                    value={logFormMethod}
                    onChange={(e) => setLogFormMethod(e.target.value)}
                    className="erp-input"
                  >
                    <option value="व्याख्या तथा छलफल (Discussion & Lecture)">व्याख्या तथा छलफल (Discussion & Lecture)</option>
                    <option value="प्रयोगात्मक तथा ल्याब कार्य (Practical & Lab)">प्रयोगात्मक तथा ल्याब कार्य (Practical & Lab)</option>
                    <option value="समूह कार्य तथा प्रस्तुतीकरण (Group Work)">समूह कार्य तथा प्रस्तुतीकरण (Group Work)</option>
                    <option value="परियोजना कार्य (Project-Based Learning)">परियोजना कार्य (Project-Based Learning)</option>
                    <option value="मल्टिमिडिया तथा स्मार्ट बोर्ड (Smart Board / ICT)">मल्टिमिडिया तथा स्मार्ट बोर्ड (Smart Board / ICT)</option>
                    <option value="प्रश्न-उत्तर तथा अभ्यास (Q&A & Practice)">प्रश्न-उत्तर तथा अभ्यास (Q&A & Practice)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={createTeachingLogMutation.isPending}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] py-3 font-extrabold text-white shadow-md hover:shadow-lg transition cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <Save size={16} />
                  <span>
                    {createTeachingLogMutation.isPending
                      ? 'Saving Lesson Log...'
                      : 'Save Teaching Log (डायरी सुरक्षित गर्नुहोस्)'}
                  </span>
                </button>
              </form>
            </div>

            {/* Right 7 Cols: History of Teaching Logs */}
            <div className="lg:col-span-7 space-y-4">
              {/* Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-2xs">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-600">Date (मिति):</label>
                  <input
                    type="text"
                    value={logFilterDateBs}
                    onChange={(e) => setLogFilterDateBs(e.target.value)}
                    className="rounded-xl border border-gray-200 px-2.5 py-1 text-xs font-mono font-bold bg-slate-50 w-28"
                  />
                  <button
                    type="button"
                    onClick={() => setLogFilterDateBs(todayBS())}
                    className="px-2 py-1 bg-blue-50 text-blue-800 rounded-lg text-[10px] font-bold"
                  >
                    Today
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={logFilterClassId}
                    onChange={(e) => setLogFilterClassId(e.target.value)}
                    className="rounded-xl border border-gray-200 px-2.5 py-1 text-xs font-bold bg-slate-50"
                  >
                    <option value="">All Classes</option>
                    {classesData?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section ? `(${c.section})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Logs List Cards */}
              {isTeacherLogsLoading ? (
                <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
                  <p className="text-xs">Loading your lesson logs...</p>
                </div>
              ) : !teacherLogsData || teacherLogsData.length === 0 ? (
                <div className="py-16 text-center text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-white p-6 space-y-2">
                  <BookOpen size={36} className="mx-auto text-gray-300 mb-1" />
                  <p className="text-sm font-bold text-gray-700">कुनै शिक्षण लग फेला परेन (No logs for this date)</p>
                  <p className="text-xs text-gray-400">दायाँ तर्फको फारमबाट आफ्नो दैनिक पाठ र गृहकार्य लग सुरक्षित गर्नुहोस्।</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teacherLogsData.map((log: any) => (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#1e3a5f] text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                            {log.periodNo ? `PERIOD ${log.periodNo}` : 'HOUR'}
                          </span>
                          <strong className="text-sm text-gray-900">
                            {log.class?.name} ({log.class?.section || 'A'}) • {log.subject?.name || log.subjectName || 'General'}
                          </strong>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            सम्पन्न
                          </span>
                          <button
                            onClick={() => {
                              if (confirm('Delete this lesson log?')) {
                                deleteTeachingLogMutation.mutate(log.id);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-rose-600 rounded"
                            title="Delete Log"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">पढाइएको पाठ (Topic Taught):</span>
                        <p className="text-xs text-gray-800 font-semibold mt-0.5">{log.topicTaught}</p>
                      </div>

                      {log.learningOutcome && (
                        <div className="text-[11px] text-emerald-800 font-medium">
                          <span>🎯 सिकाइ उपलब्धि: </span>
                          <span>{log.learningOutcome}</span>
                        </div>
                      )}

                      {log.homework && (
                        <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs text-amber-950">
                          <strong className="block text-[10px] uppercase font-black text-amber-900">
                            📝 गृहकार्य (Homework):
                          </strong>
                          <p className="font-bold mt-0.5">{log.homework}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: MY ASSIGNED TASKS & INCHARGE DUTIES ───────────────────────── */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Incharge Role Header Card */}
          {teacherDetails?.inchargeRole ? (
            <div className="rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-purple-950 font-extrabold text-xs rounded-lg mb-1.5">
                  <Award size={14} />
                  <span>Your Special Incharge Role (तपाईंको विभागीय जिम्मेवारी)</span>
                </div>
                <h2 className="text-xl font-extrabold">
                  {teacherDetails.inchargeTitle || teacherDetails.inchargeRole}
                </h2>
                <p className="text-xs text-purple-200 mt-0.5 font-nepali">
                  विद्यालय प्रशासनद्वारा तपाईंलाई तोकिएका मुख्य जिम्मेवारी तथा कार्यहरू तल दिइएका छन्। कार्य सम्पन्न भएपछि स्थिति परिवर्तन गर्नुहोस्।
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="bg-white/20 px-3 py-1.5 rounded-xl text-white font-bold">
                  {myTasks.filter((t) => t.status === 'COMPLETED').length} / {myTasks.length} Done
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <CheckSquare size={18} className="text-purple-700" />
                  <span>My Assigned Tasks & Duties (मेरा कार्य जिम्मेवारीहरू)</span>
                </h2>
                <p className="text-xs text-gray-500">
                  प्रशासनबाट तपाईंलाई तोकिएका कार्यहरूको प्रगति स्थिति अद्यावधिक गर्नुहोस्।
                </p>
              </div>
            </div>
          )}

          {/* Filter Status Buttons */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-100 shadow-2xs">
            <span className="text-xs font-bold text-gray-500 px-2">Filter:</span>
            {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setTaskStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  taskStatusFilter === st
                    ? 'bg-[#1e3a5f] text-white'
                    : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? `All (${myTasks.length})` : st}
              </button>
            ))}
          </div>

          {/* Task Cards List */}
          {isMyTasksLoading ? (
            <div className="py-16 text-center text-gray-400">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              <p className="mt-2 text-xs">कार्यहरू लोड हुँदैछन्...</p>
            </div>
          ) : myTasks.length === 0 ? (
            <div className="py-16 text-center text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-white">
              <CheckSquare size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-700">कुनै कार्य जिम्मेवारी बाँकी छैन!</p>
              <p className="text-xs text-gray-400">प्रशासनले कार्य तोकेपछि यहाँ सूची देखिनेछ।</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myTasks
                .filter((t) => (taskStatusFilter === 'ALL' ? true : t.status === taskStatusFilter))
                .map((task: any) => {
                  const isCompleted = task.status === 'COMPLETED';
                  const isInProgress = task.status === 'IN_PROGRESS';
                  const isUrgent = task.priority === 'URGENT';

                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-2xl border transition bg-white shadow-2xs space-y-3 ${
                        isCompleted ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3
                              className={`text-sm font-extrabold text-gray-900 ${
                                isCompleted ? 'line-through text-gray-400' : ''
                              }`}
                            >
                              {task.title}
                            </h3>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                              {task.category}
                            </span>
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-extrabold ${
                                isUrgent
                                  ? 'bg-rose-100 text-rose-800'
                                  : task.priority === 'HIGH'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-50 text-blue-800'
                              }`}
                            >
                              {task.priority}
                            </span>
                          </div>

                          {task.description && (
                            <p className="text-xs text-gray-600 font-nepali">{task.description}</p>
                          )}

                          <div className="flex items-center gap-3 text-xs text-gray-500 pt-1 font-mono">
                            <span>📅 Due: <b>{task.dueDateBs || '—'}</b></span>
                            {task.remarks && <span className="text-purple-800 font-sans font-semibold">Note: {task.remarks}</span>}
                          </div>
                        </div>

                        {/* Status Change Action */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() =>
                              updateTaskStatusMutation.mutate({
                                id: task.id,
                                status: isCompleted ? 'PENDING' : isInProgress ? 'COMPLETED' : 'IN_PROGRESS',
                              })
                            }
                            disabled={updateTaskStatusMutation.isPending}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer ${
                              isCompleted
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : isInProgress
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                            }`}
                          >
                            {isCompleted ? <Check size={14} /> : <Clock size={14} />}
                            <span>
                              {isCompleted
                                ? 'Completed (सम्पन्न भयो ✓)'
                                : isInProgress
                                ? 'In Progress (सञ्चालनमा)'
                                : 'Mark In Progress'}
                            </span>
                          </button>

                          {!isCompleted && (
                            <button
                              onClick={() =>
                                updateTaskStatusMutation.mutate({
                                  id: task.id,
                                  status: 'COMPLETED',
                                })
                              }
                              disabled={updateTaskStatusMutation.isPending}
                              className="px-3 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold transition cursor-pointer"
                              title="Mark as Completed directly"
                            >
                              ✓ Done
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: MY TEACHING TIMETABLE / ROUTINE ────────────────────────── */}
      {activeTab === 'routine' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-5">
            {/* Header & Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <Clock className="text-[#1e3a5f]" size={20} />
                  <span>My Teaching Schedule & Timetable (मेरो दैनिक तथा साप्ताहिक कार्यतालिका)</span>
                </h2>
                <p className="text-xs text-gray-500 font-nepali mt-0.5">
                  शिक्षक: <strong className="text-gray-800">{displayName}</strong> • बार अनुसारका पठनपाठन घण्टीहरू, कोठा तथा विषय विवरण
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* View Mode Switcher */}
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-gray-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setRoutineViewMode('day')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      routineViewMode === 'day'
                        ? 'bg-[#1e3a5f] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>☀️ दिन अनुसार (Day View)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoutineViewMode('week')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      routineViewMode === 'week'
                        ? 'bg-[#1e3a5f] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>📋 सम्पूर्ण हप्ता (Week View)</span>
                  </button>
                </div>

                {/* Print Timetable */}
                <button
                  type="button"
                  onClick={printTeacherRoutine}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs cursor-pointer"
                >
                  <Printer size={14} className="text-blue-600" />
                  <span>प्रिन्ट गर्नुहोस् (Print)</span>
                </button>
              </div>
            </div>

            {/* Day Selector Pills Bar */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-gray-200">
              <span className="text-[11px] font-black text-[#1e3a5f] px-1.5 flex items-center gap-1">
                <Calendar size={13} className="text-blue-600" />
                <span>बार:</span>
              </span>

              {/* Today shortcut pill */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRoutineDay(todayDayNum);
                  setRoutineViewMode('day');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 shadow-2xs ${
                  selectedRoutineDay === todayDayNum && routineViewMode === 'day'
                    ? 'bg-amber-400 text-[#1e3a5f] ring-1 ring-amber-300'
                    : 'bg-amber-100/80 hover:bg-amber-200 text-amber-900'
                }`}
              >
                <span>☀️ आज ({SHORT_DAYS_MAP[todayDayNum] || 'Today'})</span>
              </button>

              {/* Active Days Buttons (Strictly show checked / scheduled days) */}
              {activeTeacherRoutineDays.map((d) => {
                const count = (teacherRoutine || []).filter((r: any) => r.dayOfWeek === d && !r.isBreak).length;
                const isSelected = selectedRoutineDay === d && routineViewMode === 'day';
                const isToday = d === todayDayNum;

                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setSelectedRoutineDay(d);
                      setRoutineViewMode('day');
                    }}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 border ${
                      isSelected
                        ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-2xs'
                        : isToday
                        ? 'bg-white text-[#1e3a5f] border-amber-300 ring-1 ring-amber-300 hover:bg-amber-50'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{SHORT_DAYS_MAP[d]}</span>
                    {count > 0 ? (
                      <span className={`text-[9.5px] font-extrabold px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {count}
                      </span>
                    ) : (
                      <span className="text-[9px] text-gray-400">विश्राम</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Loading & Empty states */}
            {isRoutineLoading ? (
              <div className="py-12 text-center text-gray-400">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <p className="mt-1 text-xs">रुटिन लोड हुँदैछ...</p>
              </div>
            ) : !teacherRoutine || teacherRoutine.length === 0 ? (
              <div className="py-10 text-center text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-slate-50/50">
                <Clock size={30} className="mx-auto text-gray-300 mb-1.5" />
                <p className="text-xs font-bold text-gray-700">तपाईंको नाममा कुनै घण्टी तोकिएको छैन।</p>
                <p className="text-[11px] text-gray-400">प्रशासनले कक्षा रुटिन तयार गरेपछि यहाँ तालिका देखिनेछ।</p>
              </div>
            ) : routineViewMode === 'day' ? (
              /* ─── SINGLE DAY COMPACT FITTED VIEW ─── */
              <div className="space-y-2.5">
                <div className="flex items-center justify-between bg-blue-50/90 border border-blue-200 px-3 py-1.5 rounded-xl text-xs">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-[#1e3a5f]">
                      {DAYS_MAP[selectedRoutineDay]}
                    </h3>
                    {selectedRoutineDay === todayDayNum && (
                      <span className="text-[9.5px] font-black bg-amber-400 text-[#1e3a5f] px-1.5 py-0.2 rounded-full">
                        आज
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-blue-950 bg-white px-2 py-0.5 rounded-lg border border-blue-200 font-mono">
                    {routinePeriodsForDay.length} घण्टी
                  </span>
                </div>

                {routinePeriodsForDay.length === 0 ? (
                  /* Special Friendly Empty Banner for Saturday / Sunday / Off Days */
                  <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gradient-to-b from-slate-50 to-white space-y-1.5">
                    <Sparkles size={26} className="mx-auto text-amber-500 mb-1" />
                    <p className="text-xs font-extrabold text-gray-800">
                      {selectedRoutineDay === 7 || selectedRoutineDay === 1
                        ? `✨ यस दिन (${DAYS_MAP[selectedRoutineDay]}) विद्यालयमा कक्षा सञ्चालन छैन (Holiday)!`
                        : `✨ यस दिन (${DAYS_MAP[selectedRoutineDay]}) तपाईंको कुनै कक्षा तालिका छैन (Free Day)!`}
                    </p>
                    <p className="text-[11px] text-gray-500 font-nepali max-w-md mx-auto">
                      अन्य दिनहरूको रुटिन हेर्न माथिका बारहरूमा क्लिक गर्नुहोस् वा सम्पूर्ण हप्ताको तालिका हेर्नुहोस्।
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {routinePeriodsForDay
                      .sort((a: any, b: any) => (a.periodNo || 0) - (b.periodNo || 0))
                      .map((r: any) => (
                        <div
                          key={r.id}
                          className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs space-y-1.5 hover:border-blue-300 transition"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-[11px] text-[#1e3a5f] bg-blue-50 border border-blue-100 px-1.5 py-0.2 rounded">
                              घण्टी {r.periodNo}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono font-bold text-gray-500">
                                {r.startTime} - {r.endTime}
                              </span>
                              {r.roomNo && (
                                <span className="text-[9.5px] font-mono font-bold text-amber-800 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                  Rm {r.roomNo}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-slate-900 truncate">
                              {r.class?.name} {r.class?.section ? `(${r.class?.section})` : ''}
                            </span>
                            <span className="text-[10.5px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0 truncate max-w-[130px]">
                              {r.subject?.name || '—'}
                            </span>
                          </div>

                          {/* Quick Jump to Daily Log */}
                          <button
                            type="button"
                            onClick={() => {
                              setLogFormClassId(String(r.classId));
                              setLogFormSubjectId(String(r.subjectId || ''));
                              setLogFormSubjectName(r.subject?.name || '');
                              setLogFormPeriodNo(r.periodNo || 1);
                              setLogFormDateBs(todayBS());
                              setActiveTab('daily_log');
                            }}
                            className="w-full py-1 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 text-[10.5px] font-black transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <BookOpen size={12} className="text-blue-700" />
                            <span>पाठ डायरी दर्ता गर्नुहोस् (Log Lesson) →</span>
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              /* ─── FULL WEEK VIEW (COMPACT GRID) ─── */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {activeTeacherRoutineDays.map((day) => {
                  const dayEntries = teacherRoutine.filter((r: any) => r.dayOfWeek === day && !r.isBreak);
                  const isToday = day === todayDayNum;

                  return (
                    <div
                      key={day}
                      className={`rounded-xl border p-2.5 space-y-2 transition ${
                        isToday
                          ? 'border-amber-300 bg-amber-50/40 ring-1 ring-amber-300 shadow-2xs'
                          : 'border-gray-200 bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-gray-200/80 pb-1">
                        <div className="flex items-center gap-1">
                          <span className="font-extrabold text-[11px] text-[#1e3a5f]">{DAYS_MAP[day]}</span>
                          {isToday && (
                            <span className="text-[9px] font-black bg-amber-400 text-[#1e3a5f] px-1 py-0.2 rounded-full">
                              आज
                            </span>
                          )}
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                          dayEntries.length > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {dayEntries.length} घण्टी
                        </span>
                      </div>

                      {dayEntries.length === 0 ? (
                        <p className="text-[11px] text-gray-400 italic text-center py-2">कुनै कक्षा छैन (No Period)</p>
                      ) : (
                        <div className="space-y-1">
                          {dayEntries
                            .sort((a: any, b: any) => (a.periodNo || 0) - (b.periodNo || 0))
                            .map((r: any) => (
                              <div
                                key={r.id}
                                className="p-1.5 rounded-lg bg-white border border-gray-200/90 shadow-2xs text-xs space-y-0.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-black text-[10.5px] text-gray-900 truncate">
                                    {r.periodNo}. {r.class?.name} {r.class?.section ? `(${r.class?.section})` : ''}
                                  </span>
                                  <span className="text-[9.5px] font-mono text-gray-500">
                                    {r.startTime}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-blue-900 font-bold truncate max-w-[120px]">
                                    {r.subject?.name || 'विषय'}
                                  </span>
                                  {r.roomNo && (
                                    <span className="text-amber-800 font-mono">
                                      Rm {r.roomNo}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: MY LEAVE APPLICATIONS ─────────────────────────────────── */}
      {activeTab === 'leaves' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <FileText className="text-[#1e3a5f]" size={20} />
                  <span>My Leave Applications (मेरो बिदाको अभिलेख)</span>
                </h2>
                <p className="text-xs text-gray-500 font-nepali">
                  शिक्षकको बिदा केवल प्रधानाध्यापक वा प्रशासनबाट स्वीकृत भएपछि मात्र लागू हुनेछ।
                </p>
              </div>

              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <FileText size={14} />
                <span>नयाँ बिदा आवेदन दिनुहोस् (Apply for Leave)</span>
              </button>
            </div>

            {/* Admin call reminder notice */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5 mb-4">
              <PhoneCall size={18} className="text-amber-700 shrink-0" />
              <span>
                <b>सूचना:</b> बिदाको निवेदन दर्ता गरेपछि तत्काल स्वीकृतिका लागि प्रशासन वा प्रधानाध्यापकलाई सम्पर्क गर्नुहोस्।
              </span>
            </div>

            {isMyLeavesLoading ? (
              <div className="py-12 text-center text-gray-400">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-xs">आवेदनहरू लोड हुँदैछन्...</p>
              </div>
            ) : !myLeaves || myLeaves.length === 0 ? (
              <div className="py-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                <FileText size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-bold text-gray-700">कुनै बिदा आवेदन फेला परेन।</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {myLeaves.map((l: any) => (
                  <div key={l.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-gray-900">
                          {l.startDateBs} देखि {l.endDateBs} सम्म ({l.totalDays} दिन)
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            l.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : l.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {l.status === 'APPROVED' ? '✓ स्वीकृत (Approved)' : l.status === 'REJECTED' ? '✕ अस्वीकृत (Rejected)' : '⏳ विचाराधीन (Pending)'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">कारण: {l.reason}</p>
                      {l.reviewedByName && (
                        <p className="text-[11px] text-gray-400">
                          निर्णयकर्ता: {l.reviewedByName} {l.reviewRemarks && `| कैफियत: ${l.reviewRemarks}`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-gray-400 font-mono">
                        दर्ता मिति: {new Date(l.createdAt).toLocaleDateString()}
                      </span>

                      {l.status === 'PENDING' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLeave(l);
                              setEditLeaveStartDate(l.startDateBs);
                              setEditLeaveEndDate(l.endDateBs);
                              setEditLeaveDaysCount(l.totalDays || 1);
                              setEditLeaveReason(l.reason);
                              setIsEditLeaveModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            ✏️ सम्पादन (Edit)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('के तपाईं यो बिदाको निवेदन रद्द गर्न चाहनुहुन्छ?')) {
                                deleteLeaveMutation.mutate(l.id);
                              }
                            }}
                            disabled={deleteLeaveMutation.isPending}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            🗑️ रद्द (Cancel)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: STUDENT LEAVE APPROVALS (STRICT CLASS TEACHER) ─────────── */}
      {activeTab === 'students_leave' && myAssignedClasses.length > 0 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <UserCheck className="text-emerald-700" size={20} />
                  <span>Student Leave Requests (मेरो कक्षाका विद्यार्थीहरूको बिदा आवेदन)</span>
                </h2>
                <p className="text-xs text-gray-500 font-nepali">
                  तपाईं कक्षा शिक्षक हुनुभएको कक्षाका विद्यार्थीहरूको बिदा तपाईंले मात्र स्वीकृत गर्न सक्नुहुन्छ।
                </p>
              </div>
            </div>

            {isClassLeavesLoading ? (
              <div className="py-12 text-center text-gray-400">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                <p className="mt-2 text-xs">विद्यार्थी आवेदनहरू लोड हुँदैछन्...</p>
              </div>
            ) : !studentLeaves || studentLeaves.length === 0 ? (
              <div className="py-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                <UserCheck size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-bold text-gray-700">कुनै नयाँ बिदा आवेदन छैन।</p>
                <p className="text-xs text-gray-400">विद्यार्थीहरूले बिदा आवेदन दिएपछि यहाँ देखिनेछ।</p>
              </div>
            ) : (
              <div className="space-y-3">
                {studentLeaves.map((l: any) => (
                  <div
                    key={l.id}
                    className="p-4 rounded-xl border border-gray-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-gray-900">
                          {l.student?.fullName}
                        </span>
                        <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                          {l.class?.name} {l.class?.section ? `(${l.class?.section})` : ''} | Roll #{l.student?.classEnrollment?.[0]?.rollNo || '1'}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            l.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : l.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {l.status === 'APPROVED' ? '✓ स्वीकृत' : l.status === 'REJECTED' ? '✕ अस्वीकृत' : '⏳ विचाराधीन'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700">
                        <b>बिदा अवधि:</b> {l.startDateBs} देखि {l.endDateBs} सम्म ({l.totalDays} दिन)
                      </p>
                      <p className="text-xs text-gray-600">
                        <b>कारण (Reason):</b> {l.reason}
                      </p>
                      {l.reviewedByName && (
                        <p className="text-[11px] text-gray-400">
                          स्वीकृत/अस्वीकृत गर्ने: {l.reviewedByName} {l.reviewRemarks && `(कैफियत: ${l.reviewRemarks})`}
                        </p>
                      )}
                    </div>

                    {l.status === 'PENDING' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => reviewStudentLeaveMutation.mutate({ leaveId: l.id, status: 'APPROVED' })}
                          disabled={reviewStudentLeaveMutation.isPending}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                        >
                          <Check size={14} />
                          <span>स्वीकृत (Approve)</span>
                        </button>
                        <button
                          onClick={() => {
                            const remarks = prompt('अस्वीकृत गर्नुको कारण (वैकल्पिक):');
                            reviewStudentLeaveMutation.mutate({ leaveId: l.id, status: 'REJECTED', remarks: remarks || undefined });
                          }}
                          disabled={reviewStudentLeaveMutation.isPending}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                        >
                          <X size={14} />
                          <span>अस्वीकृत (Reject)</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: EXAM INCHARGE SUB-PORTAL ─────────────────────────────────── */}
      {activeTab === 'incharge_exam' && (
        <div className="space-y-6">
          {/* Header Console Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-purple-950 font-black text-xs rounded-lg mb-2 shadow-xs">
                <Award size={14} />
                <span>परीक्षा शाखा नियन्त्रण कक्ष (Examination Department Console)</span>
              </div>
              <h2 className="text-xl font-extrabold">
                {teacherDetails.inchargeTitle || 'Exam Incharge (परीक्षा प्रमुख)'}
              </h2>
              <p className="text-xs text-purple-200 mt-1">
                परीक्षा तालिका निर्माण, प्रवेश पत्र (Admit Card) छपाई, सिट प्लानिङ, प्राप्ताङ्क लेजर तथा नतिजा प्रकाशन व्यवस्थापन
              </p>
            </div>
            <Link
              href="/dashboard/exams"
              className="inline-flex items-center gap-2 bg-white text-purple-950 hover:bg-purple-50 px-4 py-2.5 rounded-xl text-xs font-black shadow-xs transition shrink-0"
            >
              <span>Full Exam Dashboard (पूर्ण मोड्युल)</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Quick Launch Cards for Exam Incharge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/dashboard/exams"
              className="p-4 rounded-2xl border border-purple-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 group-hover:scale-110 transition">
                  <Calendar size={20} />
                </div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  तालिका
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Exam Schedules & Routine</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                परीक्षा तालिका, विषय, पूर्णाङ्क तथा समय व्यवस्थापन
              </p>
            </Link>

            <Link
              href="/dashboard/exams/admit-cards"
              className="p-4 rounded-2xl border border-indigo-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 group-hover:scale-110 transition">
                  <Printer size={20} />
                </div>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  प्रवेश पत्र
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Admit Card Generator</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                विद्यार्थी परीक्षा प्रवेश पत्र तथा फोटो सहितको कार्ड छपाई
              </p>
            </Link>

            <Link
              href="/dashboard/exams/seat-planning"
              className="p-4 rounded-2xl border border-amber-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 group-hover:scale-110 transition">
                  <Users size={20} />
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  सिट योजना
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Seat Planning & Halls</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                रोल नम्बर अनुसार सिट योजना, हल र डेस्क स्लिप
              </p>
            </Link>

            <Link
              href="/dashboard/certificates"
              className="p-4 rounded-2xl border border-emerald-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-110 transition">
                  <Award size={20} />
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  प्रमाणपत्र
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Certificates & Character</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                चारित्रिक प्रमाणपत्र तथा स्थानान्तरण प्रमाणपत्र (TC)
              </p>
            </Link>
          </div>

          {/* Active Exams & Tasks List */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-2xl border border-purple-100 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b pb-2.5">
                <h3 className="font-extrabold text-sm text-purple-950 flex items-center gap-2">
                  <Award size={16} className="text-purple-700" />
                  <span>Active Examinations (चालु तथा आगामी परीक्षाहरू)</span>
                </h3>
                <Link
                  href="/dashboard/exams"
                  className="text-[11px] font-bold text-purple-700 hover:underline"
                >
                  Manage All →
                </Link>
              </div>

              {examsData?.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs bg-slate-50 rounded-xl">
                  कुनै सक्रिय परीक्षा फेला परेन।
                </div>
              ) : (
                <div className="space-y-2.5">
                  {examsData?.map((exam: any) => (
                    <div
                      key={exam.id}
                      className="p-3 rounded-xl bg-purple-50/40 border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-extrabold text-xs text-purple-950">
                          {exam.name} {exam.nameNepali ? `(${exam.nameNepali})` : ''}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                          📅 {exam.startDateBs} देखि {exam.endDateBs} सम्म • Shift: {exam.shift || 'DAY'}
                        </p>
                        <p className="text-[10px] text-purple-800 font-bold mt-1">
                          कक्षा: {exam.examClasses?.map((ec: any) => ec.class?.name).join(', ') || 'सबै कक्षा'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        <Link
                          href={`/dashboard/exams?tab=schedules&examId=${exam.id}`}
                          className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-[10px] shadow-2xs transition"
                        >
                          📅 Routine & Shifts
                        </Link>
                        <Link
                          href={`/dashboard/exams/admit-cards?examId=${exam.id}`}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] shadow-2xs transition"
                        >
                          🪪 Admit Cards
                        </Link>
                        <Link
                          href={`/dashboard/exams/seat-planning?examId=${exam.id}`}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-[#1e3a5f] font-bold text-[10px] shadow-2xs transition"
                        >
                          🪑 Seat Plan
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Exam Duties / Tasks */}
            <div className="lg:col-span-5 rounded-2xl border border-purple-100 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b pb-2.5">
                <h3 className="font-extrabold text-sm text-purple-950 flex items-center gap-2">
                  <CheckSquare size={16} className="text-purple-700" />
                  <span>Exam Incharge Duties (परीक्षा जिम्मेवारी)</span>
                </h3>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  {myTasksData?.filter((t: any) => t.category === 'EXAM' && t.status !== 'COMPLETED').length} Pending
                </span>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {myTasksData?.filter((t: any) => t.category === 'EXAM').length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">कुनै परीक्षा कार्य तोकिएको छैन।</p>
                ) : (
                  myTasksData
                    ?.filter((t: any) => t.category === 'EXAM')
                    .map((task: any) => {
                      const isDone = task.status === 'COMPLETED';
                      return (
                        <div
                          key={task.id}
                          className={`p-2.5 rounded-xl border text-xs transition ${
                            isDone ? 'bg-emerald-50/50 border-emerald-200 opacity-70' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isDone}
                                onChange={() =>
                                  updateTaskStatusMutation.mutate({
                                    id: task.id,
                                    status: isDone ? 'PENDING' : 'COMPLETED',
                                  })
                                }
                                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                              />
                              <div>
                                <span className={`font-bold block ${isDone ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                  {task.title}
                                </span>
                                {task.description && (
                                  <span className="text-[10px] text-gray-500 block">{task.description}</span>
                                )}
                              </div>
                            </label>
                            <span className="text-[9px] font-mono font-bold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded shrink-0">
                              {task.dueDateBs}
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: LIBRARY INCHARGE SUB-PORTAL ───────────────────────────────── */}
      {activeTab === 'incharge_library' && (
        <div className="space-y-6">
          {/* Header Console Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-blue-900 via-sky-900 to-indigo-950 text-white p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-blue-950 font-black text-xs rounded-lg mb-2 shadow-xs">
                <BookOpen size={14} />
                <span>पुस्तकालय व्यवस्थापन कक्ष (Library Department Console)</span>
              </div>
              <h2 className="text-xl font-extrabold">
                {teacherDetails.inchargeTitle || 'Librarian Incharge (पुस्तकालय प्रमुख)'}
              </h2>
              <p className="text-xs text-blue-200 mt-1">
                पुस्तक दर्ता तथा वर्गीकरण, विद्यार्थी तथा शिक्षकलाई पुस्तक वितरण (Issue), फिर्ता (Return) र जरिवाना हिसाब
              </p>
            </div>
            <Link
              href="/dashboard/library"
              className="inline-flex items-center gap-2 bg-white text-blue-950 hover:bg-blue-50 px-4 py-2.5 rounded-xl text-xs font-black shadow-xs transition shrink-0"
            >
              <span>Full Library Dashboard (पुस्तकालय पूर्ण मोड्युल)</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Quick Launch Cards for Library Incharge */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/dashboard/library"
              className="p-5 rounded-2xl border border-blue-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 group-hover:scale-110 transition">
                  <BookOpen size={22} />
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  पुस्तक सूची
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Book Catalog & Inventory</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                सबै पुस्तकहरूको सूची, वर्गीकरण, लेखक र नयाँ पुस्तक प्रविष्टि
              </p>
            </Link>

            <Link
              href="/dashboard/library"
              className="p-5 rounded-2xl border border-emerald-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-110 transition">
                  <Users size={22} />
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  जारी (Issue)
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Issue Books to Students / Staff</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                विद्यार्थी तथा शिक्षकलाई पुस्तक जारी, बारकोड स्क्यान र म्याद
              </p>
            </Link>

            <Link
              href="/dashboard/library"
              className="p-5 rounded-2xl border border-amber-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 group-hover:scale-110 transition">
                  <Clock size={22} />
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  फिर्ता र जरिवाना
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Book Returns & Overdue Tracker</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                पुस्तक फिर्ता लिने, समय नाघेका किताबहरू र जरिवाना हिसाब
              </p>
            </Link>
          </div>

          {/* Library Duties / Tasks */}
          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="font-extrabold text-sm text-blue-950 flex items-center gap-2">
                <CheckSquare size={16} className="text-blue-700" />
                <span>Library Incharge Duties (पुस्तकालय जिम्मेवारी तथा कार्यहरू)</span>
              </h3>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                {myTasksData?.filter((t: any) => t.category === 'LIBRARY' && t.status !== 'COMPLETED').length} Pending
              </span>
            </div>

            <div className="space-y-2">
              {myTasksData?.filter((t: any) => t.category === 'LIBRARY').length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">कुनै पुस्तकालय कार्य तोकिएको छैन।</p>
              ) : (
                myTasksData
                  ?.filter((t: any) => t.category === 'LIBRARY')
                  .map((task: any) => {
                    const isDone = task.status === 'COMPLETED';
                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-xl border text-xs transition ${
                          isDone ? 'bg-emerald-50/50 border-emerald-200 opacity-70' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-start gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() =>
                                updateTaskStatusMutation.mutate({
                                  id: task.id,
                                  status: isDone ? 'PENDING' : 'COMPLETED',
                                })
                              }
                              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                            />
                            <div>
                              <span className={`font-bold text-sm block ${isDone ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {task.title}
                              </span>
                              {task.description && (
                                <span className="text-xs text-gray-500 block mt-0.5">{task.description}</span>
                              )}
                            </div>
                          </label>
                          <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded shrink-0">
                            Due: {task.dueDateBs}
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: ACCOUNTANT INCHARGE SUB-PORTAL ────────────────────────────── */}
      {activeTab === 'incharge_account' && (
        <div className="space-y-6">
          {/* Header Console Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-emerald-950 font-black text-xs rounded-lg mb-2 shadow-xs">
                <DollarSign size={14} />
                <span>लेखा तथा आर्थिक प्रशासन कक्ष (Finance & Account Console)</span>
              </div>
              <h2 className="text-xl font-extrabold">
                {teacherDetails.inchargeTitle || 'Accountant / Finance Incharge (लेखापाल / लेखा प्रमुख)'}
              </h2>
              <p className="text-xs text-emerald-200 mt-1">
                विद्यार्थी शुल्क संकलन र बिलिङ, दैनिक खर्च प्रविष्टि, कर्मचारी तलब भुक्तानी तथा आय-व्यय प्रतिवेदन
              </p>
            </div>
            <Link
              href="/dashboard/finance"
              className="inline-flex items-center gap-2 bg-white text-emerald-950 hover:bg-emerald-50 px-4 py-2.5 rounded-xl text-xs font-black shadow-xs transition shrink-0"
            >
              <span>Full Finance Portal (लेखा पूर्ण मोड्युल)</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Quick Launch Cards for Accountant */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/dashboard/finance/fees"
              className="p-4 rounded-2xl border border-emerald-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-110 transition">
                  <DollarSign size={20} />
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  शुल्क
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Student Fee Collection</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                विद्यार्थी मासिक शुल्क संकलन, बिलिङ र रसिद छपाई
              </p>
            </Link>

            <Link
              href="/dashboard/finance/expenses"
              className="p-4 rounded-2xl border border-rose-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 group-hover:scale-110 transition">
                  <FileText size={20} />
                </div>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                  खर्च
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Expense Vouchers & Bills</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                दैनिक विद्यालय खर्च प्रविष्टि, भौचर र भुक्तानी
              </p>
            </Link>

            <Link
              href="/dashboard/finance/payroll"
              className="p-4 rounded-2xl border border-indigo-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 group-hover:scale-110 transition">
                  <Users size={20} />
                </div>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  तलब
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Staff Payroll & Salaries</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                कर्मचारी तलब शिट, सञ्चय कोष र पे-स्लिप
              </p>
            </Link>

            <Link
              href="/dashboard/finance/reports"
              className="p-4 rounded-2xl border border-blue-100 bg-white shadow-2xs hover:shadow-md transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 group-hover:scale-110 transition">
                  <FileSpreadsheet size={20} />
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  प्रतिवेदन
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Financial Reports & Audit</h3>
              <p className="text-[11px] text-gray-500 font-nepali">
                आम्दानी-खर्च, ब्यालेन्स सिट तथा अडिट रिपोर्ट
              </p>
            </Link>
          </div>

          {/* Account Duties / Tasks */}
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="font-extrabold text-sm text-emerald-950 flex items-center gap-2">
                <CheckSquare size={16} className="text-emerald-700" />
                <span>Accounting Duties (लेखा जिम्मेवारी तथा कार्यहरू)</span>
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                {myTasksData?.filter((t: any) => t.category === 'ACCOUNT' && t.status !== 'COMPLETED').length} Pending
              </span>
            </div>

            <div className="space-y-2">
              {myTasksData?.filter((t: any) => t.category === 'ACCOUNT').length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">कुनै लेखा कार्य तोकिएको छैन।</p>
              ) : (
                myTasksData
                  ?.filter((t: any) => t.category === 'ACCOUNT')
                  .map((task: any) => {
                    const isDone = task.status === 'COMPLETED';
                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-xl border text-xs transition ${
                          isDone ? 'bg-emerald-50/50 border-emerald-200 opacity-70' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-start gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() =>
                                updateTaskStatusMutation.mutate({
                                  id: task.id,
                                  status: isDone ? 'PENDING' : 'COMPLETED',
                                })
                              }
                              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                            />
                            <div>
                              <span className={`font-bold text-sm block ${isDone ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {task.title}
                              </span>
                              {task.description && (
                                <span className="text-xs text-gray-500 block mt-0.5">{task.description}</span>
                              )}
                            </div>
                          </label>
                          <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded shrink-0">
                            Due: {task.dueDateBs}
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: DISCIPLINE INCHARGE SUB-PORTAL (अनुशासन प्रमुख) ──────────── */}
      {activeTab === 'incharge_discipline' && (
        <div className="space-y-6">
          {/* Header Console Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-rose-900 via-pink-950 to-slate-900 text-white p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-rose-950 font-black text-xs rounded-lg mb-2 shadow-xs">
                <ShieldCheck size={14} />
                <span>विद्यार्थी आचारसंहिता तथा अनुशासन कक्ष (Student Discipline & Conduct Console)</span>
              </div>
              <h2 className="text-xl font-extrabold">
                {teacherDetails.inchargeTitle || 'Discipline Incharge (अनुशासन प्रमुख)'}
              </h2>
              <p className="text-xs text-rose-200 mt-1">
                दैनिक पोशाक निरीक्षण, समयपालना, आचारसंहिता उल्लंघन अभिलेख, विद्यार्थी परामर्श तथा अभिभावक सम्पर्क
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddIncidentModalOpen(true)}
                className="inline-flex items-center gap-2 bg-amber-400 text-rose-950 hover:bg-amber-300 px-4 py-2.5 rounded-xl text-xs font-black shadow-xs transition shrink-0 cursor-pointer"
              >
                <Plus size={15} />
                <span>Log Incident (घटना दर्ता)</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border border-rose-100 bg-white shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-rose-600">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">कुल घटना दर्ता</span>
                <ShieldAlert size={18} />
              </div>
              <p className="text-2xl font-black text-gray-900">{disciplineIncidents.length}</p>
              <p className="text-[11px] text-gray-400">यस शैक्षिक सत्रमा दर्ता भएका केसहरू</p>
            </div>

            <div className="p-4 rounded-2xl border border-amber-100 bg-white shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-amber-600">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">अभिभावक बोलाई</span>
                <PhoneCall size={18} />
              </div>
              <p className="text-2xl font-black text-amber-700">
                {disciplineIncidents.filter((i) => i.parentCalled).length}
              </p>
              <p className="text-[11px] text-gray-400">अभिभावकसँग प्रत्यक्ष छलफल भएको</p>
            </div>

            <div className="p-4 rounded-2xl border border-emerald-100 bg-white shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">समाधान भएका केसहरू</span>
                <CheckCircle2 size={18} />
              </div>
              <p className="text-2xl font-black text-emerald-700">
                {disciplineIncidents.filter((i) => i.status === 'RESOLVED').length}
              </p>
              <p className="text-[11px] text-gray-400">परामर्श तथा सुधार पश्चात बन्द</p>
            </div>

            <div className="p-4 rounded-2xl border border-blue-100 bg-white shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-blue-600">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">दैनिक गेट निरीक्षण</span>
                <UserCheck size={18} />
              </div>
              <p className="text-2xl font-black text-blue-700">सञ्चालनमा</p>
              <p className="text-[11px] text-gray-400">पोशाक तथा समयपालना अनुगमन</p>
            </div>
          </div>

          {/* Incident Log & Actions Table */}
          <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                  <ShieldAlert size={18} className="text-rose-600" />
                  <span>Student Misconduct & Counseling Registry (अनुशासन तथा परामर्श अभिलेख)</span>
                </h3>
                <p className="text-xs text-gray-500">विद्यार्थीहरूको कमजोरी सुधारका लागि गरिएका निर्णयहरू</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search student or issue..."
                    value={disciplineSearch}
                    onChange={(e) => setDisciplineSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 border rounded-xl text-xs font-medium w-48 focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <select
                  value={disciplineCategoryFilter}
                  onChange={(e) => setDisciplineCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 border rounded-xl text-xs font-bold bg-slate-50"
                >
                  <option value="ALL">All Categories (सबै विधा)</option>
                  <option value="UNIFORM">पोशाक (Uniform)</option>
                  <option value="TRUANCY">कक्षा बङ्क (Truancy)</option>
                  <option value="FIGHTING">झैझगडा (Fighting)</option>
                  <option value="HOMEWORK">गृहकार्य (Homework)</option>
                  <option value="OTHER">अन्य (Other)</option>
                </select>
                <button
                  onClick={() => setIsAddIncidentModalOpen(true)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus size={14} />
                  <span>New Entry</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-gray-700 border-b border-gray-200">
                    <th className="p-3 font-bold">मिति (Date BS)</th>
                    <th className="p-3 font-bold">विद्यार्थी (Student)</th>
                    <th className="p-3 font-bold">कक्षा (Class)</th>
                    <th className="p-3 font-bold">प्रकृति (Category)</th>
                    <th className="p-3 font-bold">गम्भीरता (Severity)</th>
                    <th className="p-3 font-bold">कारबाही / परामर्श (Action)</th>
                    <th className="p-3 font-bold">अभिभावक</th>
                    <th className="p-3 font-bold">स्थिति (Status)</th>
                    <th className="p-3 font-bold text-right">कार्य (Action)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {disciplineIncidents
                    .filter((inc) => {
                      if (disciplineCategoryFilter !== 'ALL' && inc.category !== disciplineCategoryFilter) return false;
                      if (
                        disciplineSearch &&
                        !inc.studentName.toLowerCase().includes(disciplineSearch.toLowerCase()) &&
                        !inc.notes.toLowerCase().includes(disciplineSearch.toLowerCase())
                      ) {
                        return false;
                      }
                      return true;
                    })
                    .map((inc) => (
                      <tr key={inc.id} className="hover:bg-rose-50/30 transition">
                        <td className="p-3 font-mono font-bold text-gray-700">{inc.dateBs}</td>
                        <td className="p-3 font-extrabold text-gray-900">{inc.studentName}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-800">
                            {inc.className}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-rose-900">{inc.categoryLabel}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              inc.severity === 'HIGH'
                                ? 'bg-rose-100 text-rose-800'
                                : inc.severity === 'MEDIUM'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {inc.severity}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-gray-800">
                          <div>{inc.action}</div>
                          {inc.notes && <div className="text-[10px] text-gray-500 mt-0.5">{inc.notes}</div>}
                        </td>
                        <td className="p-3">
                          {inc.parentCalled ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                              <PhoneCall size={12} />
                              <span>सम्पर्क भयो</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400">भएको छैन</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              inc.status === 'RESOLVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {inc.status === 'RESOLVED' ? 'समाधान (Resolved)' : 'निगरानीमा (Review)'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setDisciplineIncidents((prev) =>
                                prev.map((item) =>
                                  item.id === inc.id
                                    ? { ...item, status: item.status === 'RESOLVED' ? 'PENDING_REVIEW' : 'RESOLVED' }
                                    : item
                                )
                              );
                              toast.success('Incident status updated!');
                            }}
                            className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          >
                            Toggle Status
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Discipline Tasks & Guidelines */}
          <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="font-extrabold text-sm text-rose-950 flex items-center gap-2">
                <CheckSquare size={16} className="text-rose-700" />
                <span>Discipline Incharge Duties & Action Directives (अनुशासन कार्यहरू)</span>
              </h3>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                {myTasksData?.filter((t: any) => t.category === 'DISCIPLINE' && t.status !== 'COMPLETED').length} Pending
              </span>
            </div>

            <div className="space-y-2">
              {myTasksData?.filter((t: any) => t.category === 'DISCIPLINE').length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">कुनै अनुशासन कार्य तोकिएको छैन।</p>
              ) : (
                myTasksData
                  ?.filter((t: any) => t.category === 'DISCIPLINE')
                  .map((task: any) => {
                    const isDone = task.status === 'COMPLETED';
                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-xl border text-xs transition ${
                          isDone ? 'bg-emerald-50/50 border-emerald-200 opacity-70' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-start gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() =>
                                updateTaskStatusMutation.mutate({
                                  id: task.id,
                                  status: isDone ? 'PENDING' : 'COMPLETED',
                                })
                              }
                              className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                            />
                            <div>
                              <span className={`font-bold text-sm block ${isDone ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {task.title}
                              </span>
                              {task.description && (
                                <span className="text-xs text-gray-500 block mt-0.5">{task.description}</span>
                              )}
                            </div>
                          </label>
                          <span className="text-[10px] font-mono font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded shrink-0">
                            Due: {task.dueDateBs}
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: SPORTS & ECA INCHARGE SUB-PORTAL (खेलकुद तथा अतिरिक्त क्रियाकलाप) ─── */}
      {activeTab === 'incharge_eca' && (
        <div className="space-y-6">
          {/* Header Console Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-amber-700 via-orange-800 to-slate-900 text-white p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-amber-950 font-black text-xs rounded-lg mb-2 shadow-xs">
                <Trophy size={14} />
                <span>खेलकुद तथा अतिरिक्त क्रियाकलाप कक्ष (Sports & ECA Console)</span>
              </div>
              <h2 className="text-xl font-extrabold">
                {teacherDetails.inchargeTitle || 'Sports & ECA Incharge (खेलकुद तथा क्रियाकलाप प्रमुख)'}
              </h2>
              <p className="text-xs text-amber-200 mt-1">
                सदन व्यवस्थापन, खेलकुद प्रतियोगिता, शुक्रबारे अतिरिक्त क्रियाकलाप, सामग्री अभिलेख तथा पुरस्कार वितरण
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddEcaEventModalOpen(true)}
                className="inline-flex items-center gap-2 bg-white text-amber-950 hover:bg-amber-50 px-4 py-2.5 rounded-xl text-xs font-black shadow-xs transition shrink-0 cursor-pointer"
              >
                <Plus size={15} />
                <span>Plan ECA Event (नयाँ कार्यक्रम)</span>
              </button>
            </div>
          </div>

          {/* 4 Houses Leaderboard Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                <Medal size={18} className="text-amber-600" />
                <span>Four Houses Standings & Points (चार सदन अंक तालिका 2083/84)</span>
              </h3>
              <span className="text-xs text-gray-500">Live House Points Tally</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Red House */}
              <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-b from-red-50 to-white p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-600 text-white">
                    रातो सदन (Red)
                  </span>
                  <Flame size={20} className="text-red-600" />
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-3xl font-black text-red-950">{houseScores.RED}</span>
                  <span className="text-[11px] font-bold text-red-700">Points</span>
                </div>
                <div className="text-[11px] text-gray-600 space-y-0.5 pt-1 border-t border-red-100">
                  <p><b>Captain:</b> सुजल साह (Gr 10)</p>
                  <p><b>Motto:</b> Courage & Passion</p>
                </div>
                <div className="flex items-center gap-1.5 pt-2">
                  <button
                    onClick={() => {
                      setHouseScores((s) => ({ ...s, RED: s.RED + 10 }));
                      toast.success('+10 Points awarded to Red House!');
                    }}
                    className="flex-1 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold cursor-pointer"
                  >
                    +10 Pts
                  </button>
                  <button
                    onClick={() => {
                      setHouseScores((s) => ({ ...s, RED: Math.max(0, s.RED - 5) }));
                      toast.error('-5 Points penalty for Red House!');
                    }}
                    className="px-2 py-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-[10px] font-bold cursor-pointer"
                  >
                    -5 Pts
                  </button>
                </div>
              </div>

              {/* Blue House */}
              <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-b from-blue-50 to-white p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-600 text-white">
                    नीलो सदन (Blue)
                  </span>
                  <Compass size={20} className="text-blue-600" />
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-3xl font-black text-blue-950">{houseScores.BLUE}</span>
                  <span className="text-[11px] font-bold text-blue-700">Points</span>
                </div>
                <div className="text-[11px] text-gray-600 space-y-0.5 pt-1 border-t border-blue-100">
                  <p><b>Captain:</b> प्रिया ठाकुर (Gr 10)</p>
                  <p><b>Motto:</b> Wisdom & Unity</p>
                </div>
                <div className="flex items-center gap-1.5 pt-2">
                  <button
                    onClick={() => {
                      setHouseScores((s) => ({ ...s, BLUE: s.BLUE + 10 }));
                      toast.success('+10 Points awarded to Blue House!');
                    }}
                    className="flex-1 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold cursor-pointer"
                  >
                    +10 Pts
                  </button>
                  <button
                    onClick={() => {
                      setHouseScores((s) => ({ ...s, BLUE: Math.max(0, s.BLUE - 5) }));
                      toast.error('-5 Points penalty for Blue House!');
                    }}
                    className="px-2 py-1 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 text-[10px] font-bold cursor-pointer"
                  >
                    -5 Pts
                  </button>
                </div>
              </div>

              {/* Green House */}
              <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-b from-emerald-50 to-white p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white">
                    हरियो सदन (Green) 🏆
                  </span>
                  <Trophy size={20} className="text-emerald-600" />
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-3xl font-black text-emerald-950">{houseScores.GREEN}</span>
                  <span className="text-[11px] font-bold text-emerald-700">Leader (अग्रणी)</span>
                </div>
                <div className="text-[11px] text-gray-600 space-y-0.5 pt-1 border-t border-emerald-100">
                  <p><b>Captain:</b> अन्जली यादव (Gr 10)</p>
                  <p><b>Motto:</b> Growth & Harmony</p>
                </div>
                <div className="flex items-center gap-1.5 pt-2">
                  <button
                    onClick={() => {
                      setHouseScores((s) => ({ ...s, GREEN: s.GREEN + 10 }));
                      toast.success('+10 Points awarded to Green House!');
                    }}
                    className="flex-1 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer"
                  >
                    +10 Pts
                  </button>
                  <button
                    onClick={() => {
                      setHouseScores((s) => ({ ...s, GREEN: Math.max(0, s.GREEN - 5) }));
                      toast.error('-5 Points penalty for Green House!');
                    }}
                    className="px-2 py-1 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-[10px] font-bold cursor-pointer"
                  >
                    -5 Pts
                  </button>
                </div>
              </div>

              {/* Yellow House */}
              <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-b from-amber-50 to-white p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-900">
                    पहेंलो सदन (Yellow)
                  </span>
                  <Sparkles size={20} className="text-amber-600" />
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-3xl font-black text-amber-950">{houseScores.YELLOW}</span>
                  <span className="text-[11px] font-bold text-amber-700">Points</span>
                </div>
                <div className="text-[11px] text-gray-600 space-y-0.5 pt-1 border-t border-amber-100">
                  <p><b>Captain:</b> अमित महतो (Gr 10)</p>
                  <p><b>Motto:</b> Honor & Excellence</p>
                </div>
                <div className="flex items-center gap-1.5 pt-2">
                  <button
                    onClick={() => {
                      setHouseScores((s) => ({ ...s, YELLOW: s.YELLOW + 10 }));
                      toast.success('+10 Points awarded to Yellow House!');
                    }}
                    className="flex-1 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 text-[10px] font-bold cursor-pointer"
                  >
                    +10 Pts
                  </button>
                  <button
                    onClick={() => {
                      setHouseScores((s) => ({ ...s, YELLOW: Math.max(0, s.YELLOW - 5) }));
                      toast.error('-5 Points penalty for Yellow House!');
                    }}
                    className="px-2 py-1 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 text-[10px] font-bold cursor-pointer"
                  >
                    -5 Pts
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Friday ECA Planner & Results */}
          <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                  <Flag size={18} className="text-amber-600" />
                  <span>Friday ECA & Annual Sports Events (शुक्रबारे अतिरिक्त क्रियाकलाप अभिलेख)</span>
                </h3>
                <p className="text-xs text-gray-500">वक्तृत्वकला, हाजिरीजवाफ, चित्रकला, खेलकुद तथा विजेता नामावली</p>
              </div>
              <button
                onClick={() => setIsAddEcaEventModalOpen(true)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-[#1e3a5f] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus size={14} />
                <span>Add Event / Winners</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ecaEvents.map((evt) => (
                <div key={evt.id} className="p-4 rounded-2xl border border-gray-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        📅 {evt.dateBs}
                      </span>
                      <h4 className="font-extrabold text-sm text-gray-900 mt-1.5">{evt.name}</h4>
                      {evt.topic && <p className="text-[11px] text-gray-500 italic mt-0.5">विषय: {evt.topic}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs border-t border-gray-200/80 pt-2 font-medium">
                    <div className="flex items-center gap-1.5 text-amber-900">
                      <span>🥇</span>
                      <span><b>1st:</b> {evt.firstWinner || 'TBD'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <span>🥈</span>
                      <span><b>2nd:</b> {evt.secondWinner || 'TBD'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-800">
                      <span>🥉</span>
                      <span><b>3rd:</b> {evt.thirdWinner || 'TBD'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sports Inventory Tracker */}
          <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                <Activity size={18} className="text-amber-600" />
                <span>Sports Goods & Equipment Inventory (खेलकुद सामग्री अभिलेख)</span>
              </h3>
              <span className="text-xs text-gray-500">उपकरण संख्या तथा मौज्दात</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {sportsItems.map((item) => (
                <div key={item.id} className="p-3 rounded-xl border border-gray-100 bg-slate-50/70 space-y-1 text-xs">
                  <div className="flex items-center justify-between font-bold text-gray-900">
                    <span>{item.name}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px]">
                      {item.category}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-600 pt-1">
                    <span>कुल: <b>{item.totalQty}</b></span>
                    <span>उपलब्ध: <b className="text-emerald-700">{item.availableQty}</b></span>
                    <span>जारी: <b className="text-rose-700">{item.inUse}</b></span>
                  </div>
                  <p className="text-[10px] text-gray-400">स्थिति: {item.condition}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: ACADEMIC COORDINATOR SUB-PORTAL (शैक्षिक संयोजक) ───────────── */}
      {activeTab === 'incharge_coordinator' && (
        <div className="space-y-6">
          {/* Header Console Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 text-white p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-indigo-950 font-black text-xs rounded-lg mb-2 shadow-xs">
                <Layers size={14} />
                <span>शैक्षिक समन्वय तथा अनुगमन कक्ष (Academic Coordination Console)</span>
              </div>
              <h2 className="text-xl font-extrabold">
                {teacherDetails.inchargeTitle || 'Academic Coordinator (शैक्षिक संयोजक)'}
              </h2>
              <p className="text-xs text-indigo-200 mt-1">
                मास्टर घण्टी तालिका, दैनिक सट्टा शिक्षक व्यवस्थापन, पाठ्यक्रम प्रगति अनुगमन तथा शिक्षक दैनिक डायरी रुजु
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddSubModalOpen(true)}
                className="inline-flex items-center gap-2 bg-amber-400 text-indigo-950 hover:bg-amber-300 px-4 py-2.5 rounded-xl text-xs font-black shadow-xs transition shrink-0 cursor-pointer"
              >
                <Plus size={15} />
                <span>Assign Substitute (सट्टा शिक्षक तोक्नुहोस्)</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border border-indigo-100 bg-white shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-indigo-600">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">कुल सक्रिय कक्षाहरू</span>
                <School size={18} />
              </div>
              <p className="text-2xl font-black text-gray-900">{classesData?.length ?? 0}</p>
              <p className="text-[11px] text-gray-400">शिशु कक्षा (ECD) देखि कक्षा १२ सम्म</p>
            </div>

            <div className="p-4 rounded-2xl border border-purple-100 bg-white shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-purple-600">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">आजको सट्टा शिक्षक</span>
                <Users size={18} />
              </div>
              <p className="text-2xl font-black text-purple-800">{substitutions.length}</p>
              <p className="text-[11px] text-gray-400">अनुपस्थित शिक्षकको स्थानमा खटाइएको</p>
            </div>

            <div className="p-4 rounded-2xl border border-emerald-100 bg-white shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">पाठ्यक्रम प्रगति औसत</span>
                <FileBarChart size={18} />
              </div>
              <p className="text-2xl font-black text-emerald-700">74%</p>
              <p className="text-[11px] text-gray-400">दोस्रो त्रैमासिक लक्ष्य अनुसार</p>
            </div>

            <div className="p-4 rounded-2xl border border-amber-100 bg-white shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-amber-600">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">दैनिक डायरी प्रविष्टि</span>
                <BookOpen size={18} />
              </div>
              <p className="text-2xl font-black text-amber-700">नियमित</p>
              <p className="text-[11px] text-gray-400">शिक्षक दैनिक लग अनुगमन</p>
            </div>
          </div>

          {/* Teacher Substitution & Proxy Desk */}
          <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                  <Users size={18} className="text-indigo-600" />
                  <span>Teacher Substitution & Proxy Arrangement (सट्टा शिक्षक व्यवस्थापन)</span>
                </h3>
                <p className="text-xs text-gray-500">बिदामा बसेका शिक्षकको घण्टीमा अन्य शिक्षकको कार्यविभाजन</p>
              </div>
              <button
                onClick={() => setIsAddSubModalOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus size={14} />
                <span>Assign Proxy</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-gray-700 border-b border-gray-200">
                    <th className="p-3 font-bold">मिति (Date BS)</th>
                    <th className="p-3 font-bold">कक्षा (Class)</th>
                    <th className="p-3 font-bold">घण्टी (Period)</th>
                    <th className="p-3 font-bold">अनुपस्थित शिक्षक (Absent)</th>
                    <th className="p-3 font-bold">खटाइएका सट्टा शिक्षक (Substitute)</th>
                    <th className="p-3 font-bold">सिकाउने विषय / कार्य (Subject/Task)</th>
                    <th className="p-3 font-bold">स्थिति</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {substitutions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-indigo-50/30 transition">
                      <td className="p-3 font-mono font-bold text-gray-700">{sub.dateBs}</td>
                      <td className="p-3 font-extrabold text-indigo-950">{sub.className}</td>
                      <td className="p-3 font-bold text-gray-800">घण्टी {sub.periodNo}</td>
                      <td className="p-3 text-rose-700 font-bold">{sub.absentTeacher}</td>
                      <td className="p-3 text-emerald-800 font-extrabold flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span>{sub.assignedTeacher}</span>
                      </td>
                      <td className="p-3 text-gray-700">{sub.subjectToTeach}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Syllabus Progress Tracking */}
          <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                  <FileBarChart size={18} className="text-indigo-600" />
                  <span>Syllabus Completion Tracking (पाठ्यक्रम प्रगति अनुगमन)</span>
                </h3>
                <p className="text-xs text-gray-500">कक्षागत तथा विषयगत पाठ्यभार सम्पन्न प्रतिशत</p>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                2nd Term Target: 75%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-gray-200 bg-slate-50 space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-900">
                  <span>Class 10 - Compulsory Maths</span>
                  <span className="text-emerald-700">78%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                </div>
                <p className="text-[10px] text-gray-500">Unit 11 of 14 Completed • Teacher: रामप्रसाद यादव</p>
              </div>

              <div className="p-3 rounded-xl border border-gray-200 bg-slate-50 space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-900">
                  <span>Class 10 - Science & Tech</span>
                  <span className="text-indigo-700">72%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '72%' }}></div>
                </div>
                <p className="text-[10px] text-gray-500">Unit 13 of 18 Completed • Teacher: दिनेश पटेल</p>
              </div>

              <div className="p-3 rounded-xl border border-gray-200 bg-slate-50 space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-900">
                  <span>Class 9 - English</span>
                  <span className="text-blue-700">80%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '80%' }}></div>
                </div>
                <p className="text-[10px] text-gray-500">Unit 12 of 15 Completed • Teacher: अनिता श्रेष्ठ</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: LAB & IT INCHARGE SUB-PORTAL (प्रयोगशाला तथा IT प्रमुख) ─────── */}
      {activeTab === 'incharge_lab' && (
        <div className="space-y-6">
          {/* Header Console Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-cyan-900 via-teal-950 to-slate-900 text-white p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-cyan-950 font-black text-xs rounded-lg mb-2 shadow-xs">
                <Laptop size={14} />
                <span>विज्ञान तथा कम्प्युटर प्रयोगशाला कक्ष (Science & IT Lab Console)</span>
              </div>
              <h2 className="text-xl font-extrabold">
                {teacherDetails.inchargeTitle || 'Science & IT Lab Incharge (प्रयोगशाला प्रमुख)'}
              </h2>
              <p className="text-xs text-cyan-200 mt-1">
                रसायन, भौतिक तथा जीव विज्ञान उपकरण व्यवस्थापन, कम्प्युटर ल्याब, इन्टरनेट तथा प्रयोगात्मक कक्षा तालिका
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBookLabModalOpen(true)}
                className="inline-flex items-center gap-2 bg-amber-400 text-cyan-950 hover:bg-amber-300 px-4 py-2.5 rounded-xl text-xs font-black shadow-xs transition shrink-0 cursor-pointer"
              >
                <Plus size={15} />
                <span>Book Practical Lab (प्रयोगात्मक कक्षा दर्ता)</span>
              </button>
            </div>
          </div>

          {/* Sub-nav: Science Lab vs Computer Lab */}
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            <button
              onClick={() => setLabSubTab('science')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                labSubTab === 'science'
                  ? 'bg-cyan-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FlaskConical size={15} />
              <span>Science Laboratory (विज्ञान प्रयोगशाला)</span>
            </button>
            <button
              onClick={() => setLabSubTab('computer')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                labSubTab === 'computer'
                  ? 'bg-cyan-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Laptop size={15} />
              <span>Computer & IT Lab (कम्प्युटर ल्याब)</span>
            </button>
          </div>

          {labSubTab === 'science' ? (
            <div className="space-y-6">
              {/* Science Chemicals & Glassware Registry */}
              <div className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                      <FlaskConical size={18} className="text-cyan-700" />
                      <span>Chemicals & Apparatus Inventory (रसायन तथा प्रयोगशाला उपकरण अभिलेख)</span>
                    </h3>
                    <p className="text-xs text-gray-500">एसिड, बेस, सूक्ष्मदर्शक यन्त्र तथा भौतिक उपकरण मौज्दात</p>
                  </div>
                  <span className="text-xs font-bold bg-cyan-50 text-cyan-800 px-2.5 py-1 rounded-lg">
                    {scienceChemicals.length} Items Listed
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {scienceChemicals.map((chem) => (
                    <div key={chem.id} className="p-3 rounded-xl border border-gray-200 bg-slate-50 space-y-1.5 text-xs">
                      <div className="flex items-start justify-between">
                        <span className="font-extrabold text-gray-900">{chem.name}</span>
                      </div>
                      <p className="text-[11px] font-mono text-cyan-800">Formula/Type: {chem.formula}</p>
                      <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1 border-t">
                        <span>Stock: <b>{chem.stock}</b></span>
                        <span className="px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-900 text-[9px] font-black">
                          {chem.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lab Bookings Register */}
              <div className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                    <Calendar size={18} className="text-cyan-700" />
                    <span>Practical Sessions Scheduled (प्रयोगात्मक कक्षा तालिका)</span>
                  </h3>
                  <button
                    onClick={() => setIsBookLabModalOpen(true)}
                    className="text-xs font-bold text-cyan-700 hover:underline cursor-pointer"
                  >
                    + Book Lab Session
                  </button>
                </div>

                <div className="space-y-2">
                  {labPracticalBookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-xl bg-cyan-50/40 border border-cyan-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-extrabold text-cyan-950 text-sm">{b.topic}</span>
                        <div className="flex items-center gap-3 text-[11px] text-gray-600 mt-0.5">
                          <span>📅 मिति: {b.dateBs}</span>
                          <span>🏫 {b.className}</span>
                          <span>⏰ घण्टी: {b.periodNo}</span>
                          <span>👨‍🏫 शिक्षक: {b.teacher}</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-cyan-700 text-white shrink-0 self-start sm:self-auto">
                        {b.labType} LAB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Computer Workstations Grid */}
              <div className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                      <Laptop size={18} className="text-cyan-700" />
                      <span>Computer Lab PC Status & Workstations (कम्प्युटर कार्यस्थल स्थिति)</span>
                    </h3>
                    <p className="text-xs text-gray-500">२४ वटा विद्यार्थी कम्प्युटर, शिक्षक मास्टर PC र स्मार्ट प्रोजेक्टर</p>
                  </div>
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg">
                    Internet: High Speed (Active)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {pcWorkstations.map((pc) => (
                    <div
                      key={pc.id}
                      className={`p-3 rounded-xl border text-center space-y-1 text-xs transition ${
                        pc.status === 'ONLINE'
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-amber-200 bg-amber-50/40'
                      }`}
                    >
                      <div className="flex justify-center">
                        <Laptop
                          size={24}
                          className={pc.status === 'ONLINE' ? 'text-emerald-600' : 'text-amber-600'}
                        />
                      </div>
                      <p className="font-extrabold text-gray-900">{pc.id}</p>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black ${
                          pc.status === 'ONLINE'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {pc.status}
                      </span>
                      <p className="text-[10px] text-gray-500 truncate">{pc.cpu}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: SPECIAL INCHARGE SUB-PORTAL (विशेष जिम्मेवारी तथा समिति) ──────── */}
      {activeTab === 'incharge_special' && (
        <div className="space-y-6">
          {/* Header Console Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-gray-900 to-slate-950 text-white p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-lg mb-2 shadow-xs">
                <Sparkles size={14} />
                <span>विशेष जिम्मेवारी तथा समिति कार्य कक्ष (Special Responsibilities Console)</span>
              </div>
              <h2 className="text-xl font-extrabold">
                {teacherDetails.inchargeTitle || 'Special Committee Incharge (विशेष जिम्मेवारी)'}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                खाजा तथा क्यान्टिन समिति, पूर्वाधार निर्माण तथा मर्मत, वार्षिकोत्सव तथा विशेष बैठक निर्णय अभिलेख
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddMinuteModalOpen(true)}
                className="inline-flex items-center gap-2 bg-amber-400 text-slate-950 hover:bg-amber-300 px-4 py-2.5 rounded-xl text-xs font-black shadow-xs transition shrink-0 cursor-pointer"
              >
                <Plus size={15} />
                <span>Record Minute (निर्णय दर्ता)</span>
              </button>
            </div>
          </div>

          {/* Committee Meeting Minutes Book */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                  <ClipboardList size={18} className="text-slate-700" />
                  <span>Committee Meeting Minutes & Decisions (समिति बैठक तथा निर्णय पुस्तिका)</span>
                </h3>
                <p className="text-xs text-gray-500">विशेष समितिहरूका निर्णयहरू र कार्यान्वयन स्थिति</p>
              </div>
              <button
                onClick={() => setIsAddMinuteModalOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus size={14} />
                <span>New Minute</span>
              </button>
            </div>

            <div className="space-y-3">
              {committeeMinutes.map((min) => (
                <div key={min.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-2">
                    <div>
                      <span className="font-extrabold text-sm text-slate-900">{min.title}</span>
                      <p className="text-[11px] text-slate-600 font-bold mt-0.5">{min.committee}</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded self-start sm:self-auto">
                      📅 मिति: {min.dateBs}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-700 space-y-1">
                    <p><b>उपस्थिति:</b> {min.attendees}</p>
                    <p><b>प्रमुख निर्णयहरू:</b> {min.decisions}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: EXAM DUTIES & HALL ATTENDANCE (मेरो परीक्षा हल ड्युटी तथा हाजिरी) ─── */}
      {activeTab === 'exam_duties' && (
        <div className="space-y-6">
          {/* Header Console Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-[#1e3a5f] via-[#2a5280] to-[#1e3a5f] text-white p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-[#1e3a5f] font-black text-xs rounded-lg mb-2 shadow-xs">
                <CalendarCheck size={14} />
                <span>परीक्षा शाखा कार्यविभाजन (Examination Duties & Hall Roster)</span>
              </div>
              <h2 className="text-xl font-extrabold flex items-center gap-2">
                <span>मेरो परीक्षा हल ड्युटी तथा हाजिरी</span>
                <span className="text-xs bg-white/20 font-bold px-2.5 py-0.5 rounded-full">
                  {displayName}
                </span>
              </h2>
              <p className="text-xs text-blue-200 mt-1">
                परीक्षा हल इन्चार्ज (Hall Incharge) तथा निरीक्षक (Invigilator) को जिम्मेवारी, सिट प्लान अनुसार विद्यार्थी हाजिरी तथा विवरण
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => refetchMyExamDuties()}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
              >
                <Activity size={14} className="text-amber-300" />
                <span>रिफ्रेस (Refresh)</span>
              </button>
            </div>
          </div>

          {/* Key Metric Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900">आजको परीक्षा ड्युटी (Today)</span>
                <div className="h-8 w-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
                  <Clock size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-rose-950 mt-2">
                {todayExamDuties.length}
              </p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                {todayExamDuties.length > 0 ? 'आज हलमा उपस्थित भई हाजिरी लिनुहोस्' : 'आज कुनै परीक्षा ड्युटी छैन'}
              </p>
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900">जम्मा तोकिएको ड्युटी (Total)</span>
                <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Award size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-indigo-950 mt-2">
                {myExamDutiesData.length}
              </p>
              <p className="text-[11px] text-indigo-700 mt-0.5">
                यस शैक्षिक सत्रमा तोकिएका कुल परीक्षा ड्युटीहरू
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">हल इन्चार्ज भूमिका (Hall Incharge)</span>
                <div className="h-8 w-8 rounded-xl bg-amber-500 text-[#1e3a5f] flex items-center justify-center font-bold">
                  <ShieldCheck size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-950 mt-2">
                {myExamDutiesData.filter((d: any) => d.dutyRole === 'HALL_INCHARGE').length}
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                परीक्षा हलको मुख्य जिम्मेवारी तथा अनुशासन
              </p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">निरीक्षक भूमिका (Invigilator)</span>
                <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Users size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-blue-950 mt-2">
                {myExamDutiesData.filter((d: any) => d.dutyRole === 'INVIGILATOR').length}
              </p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                परीक्षा हल निरीक्षण तथा सहयोग
              </p>
            </div>
          </div>

          {/* ─── TODAY'S ACTIVE DUTIES SECTION ─── */}
          {todayExamDuties.length > 0 && (
            <div className="rounded-2xl border-2 border-rose-300 bg-gradient-to-r from-rose-50/70 via-amber-50/50 to-rose-50/70 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                  <h3 className="font-black text-base text-rose-950">
                    आजको परीक्षा हल ड्युटी (Today&apos;s Active Exam Duties) — {todayBS()}
                  </h3>
                </div>
                <span className="text-xs font-bold text-rose-800 bg-rose-200/80 px-2.5 py-1 rounded-full">
                  {todayExamDuties.length} वटा हल तोकिएको
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {todayExamDuties.map((duty: any) => (
                  <div
                    key={duty.id}
                    className="rounded-2xl border border-rose-200 bg-white p-5 shadow-2xs space-y-3.5 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            duty.dutyRole === 'HALL_INCHARGE'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-blue-100 text-blue-900 border border-blue-300'
                          }`}>
                            {duty.dutyRole === 'HALL_INCHARGE' ? '⭐ हल इन्चार्ज (Hall Incharge)' : '👤 निरीक्षक (Invigilator)'}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            Shift: {duty.shift}
                          </span>
                        </div>
                        <h4 className="text-lg font-black text-gray-900 mt-1.5 flex items-center gap-2">
                          <School size={18} className="text-[#1e3a5f]" />
                          <span>{duty.room?.name || `Room ${duty.roomId}`}</span>
                          {duty.room?.roomNo && (
                            <span className="text-xs text-gray-500 font-normal">({duty.room.roomNo})</span>
                          )}
                        </h4>
                        <p className="text-xs text-blue-900 font-bold mt-0.5">
                          {duty.exam?.name || 'Exam'}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {duty.status || 'ASSIGNED'}
                        </span>
                        {duty.reportingTime && (
                          <p className="text-[11px] text-gray-500 mt-1">
                            ⏰ रिपोर्टिङ: <b>{duty.reportingTime}</b>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                      <div className="text-gray-600">
                        <span>हल क्षमता: <b>{duty.room?.capacity || '—'} सिट</b></span>
                        {duty.room?.benchCount && <span> | बेन्च: <b>{duty.room.benchCount}</b></span>}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        भवन: <b>{duty.room?.building || 'मुख्य भवन'}</b>
                      </div>
                    </div>

                    {duty.remarks && (
                      <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        💡 <b>कैफियत:</b> {duty.remarks}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setActiveExamDutyForAttendance(duty)}
                        className="flex-1 py-2.5 bg-[#1e3a5f] hover:bg-[#2a5280] text-amber-300 font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <UserCheck size={16} />
                        <span>विद्यार्थी हाजिरी लिनुहोस् (Take Attendance)</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── ALL ASSIGNED EXAM DUTIES TABLE / ROSTER ─── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                  <CalendarCheck size={18} className="text-[#1e3a5f]" />
                  <span>तोकिएको परीक्षा ड्युटी तालिका (Assigned Exam Duty Schedule)</span>
                </h3>
                <p className="text-xs text-gray-500">
                  तपाईंलाई तोकिएका सम्पूर्ण परीक्षा मिति, हल तथा जिम्मेवारीहरूको विस्तृत सूची
                </p>
              </div>
              <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-xl self-start sm:self-auto">
                कुल ड्युटी: {myExamDutiesData.length}
              </span>
            </div>

            {isExamDutiesLoading ? (
              <div className="py-12 text-center text-xs text-gray-400">परीक्षा ड्युटी लोड हुँदैछ...</div>
            ) : myExamDutiesData.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                <CalendarCheck className="mx-auto text-gray-300 mb-2" size={36} />
                <p className="text-xs font-bold text-gray-700">तपाईंलाई कुनै परीक्षा ड्युटी तोकिएको छैन</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  परीक्षा शाखाले परीक्षा हल तथा मिति अनुसार ड्युटी तोकेपछि यहाँ प्रदर्शित हुनेछ।
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-gray-700 border-b border-gray-200 font-bold">
                      <th className="py-3 px-3">क्र.सं.</th>
                      <th className="py-3 px-3">परीक्षा मिति (Date BS)</th>
                      <th className="py-3 px-3">परीक्षाको नाम (Exam)</th>
                      <th className="py-3 px-3">परीक्षा हल / कोठा (Hall/Room)</th>
                      <th className="py-3 px-3">शिफ्ट (Shift)</th>
                      <th className="py-3 px-3">जिम्मेवारी भूमिका (Duty Role)</th>
                      <th className="py-3 px-3">रिपोर्टिङ समय</th>
                      <th className="py-3 px-3">स्थिति (Status)</th>
                      <th className="py-3 px-3 text-right">कार्य (Action)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {myExamDutiesData.map((duty: any, idx: number) => {
                      const isToday = duty.examDateBs === todayBS();
                      return (
                        <tr
                          key={duty.id}
                          className={`hover:bg-slate-50/80 transition ${
                            isToday ? 'bg-amber-50/40 font-semibold' : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-gray-500 font-mono">{idx + 1}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-gray-900">{duty.examDateBs}</span>
                              {isToday && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-600 text-white animate-pulse">
                                  आज
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-bold text-[#1e3a5f]">
                            {duty.exam?.name || 'Exam'}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-gray-900">{duty.room?.name || `Room ${duty.roomId}`}</div>
                            <div className="text-[10px] text-gray-500">
                              {duty.room?.building || 'मुख्य भवन'} {duty.room?.roomNo ? `(${duty.room.roomNo})` : ''}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800">
                              {duty.shift}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 ${
                              duty.dutyRole === 'HALL_INCHARGE'
                                ? 'bg-amber-100 text-amber-950 border border-amber-300'
                                : 'bg-blue-100 text-blue-950 border border-blue-300'
                            }`}>
                              {duty.dutyRole === 'HALL_INCHARGE' ? '⭐ हल इन्चार्ज' : '👤 निरीक्षक'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-600 font-mono">
                            {duty.reportingTime || '—'}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {duty.status || 'ASSIGNED'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setActiveExamDutyForAttendance(duty)}
                              className="px-3 py-1.5 bg-[#1e3a5f] hover:bg-[#2a5280] text-amber-300 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                            >
                              <UserCheck size={14} />
                              <span>हाजिरी लिनुहोस्</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: TEACHER SALARY & PESHKI PORTAL (मेरो तलब तथा पेस्की विवरण) ─── */}
      {activeTab === 'salary_peshki' && (
        <div className="space-y-6">
          {/* Header Console Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-[#1e3a5f] via-[#2a5280] to-[#1e3a5f] text-white p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-[#1e3a5f] font-black text-xs rounded-lg mb-2 shadow-xs">
                <DollarSign size={14} />
                <span>शिक्षक तथा कर्मचारी तलब र पेस्की व्यवस्थापन (Salary & Advance Console)</span>
              </div>
              <h2 className="text-xl font-extrabold flex items-center gap-2">
                <span>मेरो तलब तथा पेस्की विवरण</span>
                <span className="text-xs bg-white/20 font-bold px-2.5 py-0.5 rounded-full">
                  {displayName}
                </span>
              </h2>
              <p className="text-xs text-blue-200 mt-1">
                नेपाल सरकारको आधिकारिक नियम बमोजिम तलब निकासा, क.सं. कोष, बीमा, सा.सु. कर, चालु पेस्की तथा पे-स्लिप भरपाई
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="bg-white/10 backdrop-blur-xs border border-white/20 px-3.5 py-2 rounded-xl">
                <p className="text-[10px] text-blue-200">पद / श्रेणी</p>
                <p className="font-extrabold">{teacherDetails?.post || 'शिक्षक'} {teacherDetails?.shreni ? `(${teacherDetails.shreni})` : ''}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-xs border border-white/20 px-3.5 py-2 rounded-xl">
                <p className="text-[10px] text-blue-200">बैंक खाता नं.</p>
                <p className="font-extrabold font-mono">{teacherDetails?.bankAccountNo || '—'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-xs border border-white/20 px-3.5 py-2 rounded-xl">
                <p className="text-[10px] text-blue-200">स्थायी लेखा नं. (PAN)</p>
                <p className="font-extrabold font-mono">{teacherDetails?.panNo || '—'}</p>
              </div>
            </div>
          </div>

          {/* Key Metric Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">मासिक आधार तलब (Basic)</span>
                <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Banknote size={16} />
                </div>
              </div>
              <p className="text-xl font-extrabold text-blue-950 mt-2">
                रु. {(teacherDetails?.basicSalary || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                ग्रेड दर: रु. {(teacherDetails?.gradeAmount || 0)} (तह: {teacherDetails?.taha || '—'})
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">सक्रिय पेस्की बाँकी (Remaining)</span>
                <div className="h-8 w-8 rounded-xl bg-amber-500 text-[#1e3a5f] flex items-center justify-center font-bold">
                  <Wallet size={16} />
                </div>
              </div>
              <p className="text-xl font-extrabold text-amber-950 mt-2">
                रु. {myPeshkiSummary.totalRemaining.toLocaleString()}
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                {myPeshkiSummary.activeCount > 0 ? `${myPeshkiSummary.activeCount} वटा पेस्की कट्टी हुन बाँकी` : 'कुनै पेस्की बाँकी छैन'}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">कुल फर्स्यौट भएको पेस्की</span>
                <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <CheckCircle size={16} />
                </div>
              </div>
              <p className="text-xl font-extrabold text-emerald-950 mt-2">
                रु. {myPeshkiSummary.totalSettled.toLocaleString()}
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                अहिलेसम्म तलबबाट कट्टी / चुक्ता भएको
              </p>
            </div>

            <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900">पछिल्लो खुद निकासा (Net Disbursed)</span>
                <div className="h-8 w-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                  <Receipt size={16} />
                </div>
              </div>
              <p className="text-xl font-extrabold text-purple-950 mt-2">
                रु. {(myPayrollList[0]?.khudPaaunuParne || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-purple-700 mt-0.5">
                {myPayrollList[0] ? `${myPayrollList[0].monthFrom} - ${myPayrollList[0].monthTo} (${myPayrollList[0].status})` : 'कुनै तलब निकासा छैन'}
              </p>
            </div>
          </div>

          {/* ─── SECTION 0: MY BANK ACCOUNTS (मेरो बैंक खाताहरू) ─── */}
          <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                  <Landmark size={18} className="text-emerald-700" />
                  <span>मेरो बैंक खाता विवरणहरू (My Registered Bank Accounts)</span>
                </h3>
                <p className="text-xs text-gray-500">
                  विद्यालयबाट तलब तथा भत्ता प्राप्त हुने मुख्य बैंक खाता तथा अन्य कोष (CIT / सञ्चय कोष) खाताहरू
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingTeacherAccount(null);
                  setTeacherBankForm({
                    bankName: '',
                    accountNumber: '',
                    branch: '',
                    accountType: 'SALARY',
                    isPrimary: myBankAccounts.length === 0,
                    remarks: '',
                  });
                  setIsTeacherBankModalOpen(true);
                }}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer self-start sm:self-auto"
              >
                <Plus size={14} />
                <span>+ नयाँ बैंक खाता थप्नुहोस्</span>
              </button>
            </div>

            {isMyBankAccountsLoading ? (
              <div className="py-6 text-center text-xs text-gray-400">बैंक खाता लोड हुँदैछ...</div>
            ) : myBankAccounts.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed border-emerald-200/80 rounded-2xl bg-emerald-50/20">
                <Landmark className="mx-auto text-emerald-400 mb-1.5" size={32} />
                <p className="text-xs font-bold text-gray-700">तपाईंको कुनै बैंक खाता दर्ता भएको छैन</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  तलब निकासा तथा बैंक ट्रान्सफरको लागि माथिको &apos;+ नयाँ बैंक खाता थप्नुहोस्&apos; बटन थिची खाता दर्ता गर्नुहोस्।
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {myBankAccounts.map((acc: any) => {
                  const typeCfg = {
                    SALARY: { nepali: 'तलब खाता (Salary)', color: 'text-emerald-800', bg: 'bg-emerald-50 border-emerald-200' },
                    SAVINGS: { nepali: 'बचत खाता (Savings)', color: 'text-blue-800', bg: 'bg-blue-50 border-blue-200' },
                    CIT: { nepali: 'नागरिक लगानी कोष (CIT)', color: 'text-purple-800', bg: 'bg-purple-50 border-purple-200' },
                    EPF: { nepali: 'कर्मचारी सञ्चय कोष (EPF)', color: 'text-indigo-800', bg: 'bg-indigo-50 border-indigo-200' },
                    OTHER: { nepali: 'अन्य खाता', color: 'text-slate-800', bg: 'bg-slate-50 border-slate-200' },
                  }[acc.accountType as string] || { nepali: acc.accountType, color: 'text-slate-800', bg: 'bg-slate-50 border-slate-200' };

                  return (
                    <div
                      key={acc.id}
                      className={`rounded-2xl border p-4 transition space-y-2.5 ${
                        acc.isPrimary
                          ? 'bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 border-emerald-300 shadow-xs'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-sm text-gray-900">{acc.bankName}</h4>
                            {acc.isPrimary && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black shadow-2xs">
                                <Star size={10} className="fill-white" />
                                <span>मुख्य तलब खाता (Primary)</span>
                              </span>
                            )}
                          </div>
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border mt-1 ${typeCfg.bg} ${typeCfg.color}`}>
                            {typeCfg.nepali}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTeacherAccount(acc);
                              setTeacherBankForm({
                                bankName: acc.bankName,
                                accountNumber: acc.accountNumber,
                                branch: acc.branch || '',
                                accountType: acc.accountType || 'SALARY',
                                isPrimary: acc.isPrimary || false,
                                remarks: acc.remarks || '',
                              });
                              setIsTeacherBankModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition cursor-pointer"
                            title="सम्पादन गर्नुहोस्"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`के तपाईं यो बैंक खाता (${acc.accountNumber}) हटाउन निश्चित हुनुहुन्छ?`)) {
                                deleteTeacherBankMutation.mutate(acc.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
                            title="हटाउनुहोस्"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-gray-400 font-sans text-[10px] block">खाता नम्बर:</span>
                          <span className="font-extrabold text-blue-950 text-xs tracking-wider">{acc.accountNumber}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-sans text-[10px] block">शाखा (Branch):</span>
                          <span className="font-bold text-gray-800 text-xs font-sans">{acc.branch || '—'}</span>
                        </div>
                      </div>

                      {!acc.isPrimary && (
                        <button
                          type="button"
                          onClick={() => setPrimaryTeacherBankMutation.mutate(acc.id)}
                          disabled={setPrimaryTeacherBankMutation.isPending}
                          className="w-full py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Star size={12} />
                          <span>यस खातालाई मुख्य तलब खाता बनाउनुहोस्</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── SECTION 1: PESHKI ADVANCE TRACKING ─── */}
          <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                  <Wallet size={18} className="text-amber-600" />
                  <span>तलब पेस्की विवरण तथा किस्ता कट्टी प्रगति (My Salary Advances)</span>
                </h3>
                <p className="text-xs text-gray-500">
                  विद्यालय प्रशासनबाट प्राप्त पेस्की रकम र प्रत्येक चौमासिक/मासिक तलबबाट कट्टी हुने किस्ता तालिका
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-amber-50 text-amber-900 px-3 py-1 rounded-lg border border-amber-200">
                  कुल पेस्की: रु. {myPeshkiSummary.totalAdvanceGiven.toLocaleString()}
                </span>
              </div>
            </div>

            {isMyPeshkiLoading ? (
              <div className="py-8 text-center text-xs text-gray-400">पेस्की विवरण लोड हुँदैछ...</div>
            ) : myPeshkiList.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                <Wallet className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-xs font-bold text-gray-600">तपाईंको कुनै पेस्की विवरण अभिलेखमा छैन</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Peshki advances issued by administration will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myPeshkiList.map((p: any) => {
                  const settled = (p.amount || 0) - (p.remainingAmount || 0);
                  const percent = Math.min(100, Math.round(((settled) / (p.amount || 1)) * 100));

                  return (
                    <div
                      key={p.id}
                      className={`rounded-2xl border p-4 space-y-3 transition ${
                        p.status === 'ACTIVE'
                          ? 'border-amber-300 bg-gradient-to-br from-amber-50/40 to-white shadow-xs'
                          : p.status === 'SETTLED'
                          ? 'border-emerald-200 bg-slate-50/50'
                          : 'border-gray-200 bg-gray-50/40 opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-extrabold text-gray-900">
                              रु. {p.amount.toLocaleString()}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                p.status === 'ACTIVE'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : p.status === 'SETTLED'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              {p.status === 'ACTIVE' ? '⏳ कट्टी बाँकी (Active)' : p.status === 'SETTLED' ? '✅ पूर्ण फर्स्यौट (Settled)' : 'रद्द (Cancelled)'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 font-medium mt-0.5">
                            प्रयोजन / कारण: <b>{p.reason || 'घरायसी प्रयोजन'}</b>
                          </p>
                        </div>

                        <button
                          onClick={() => setSelectedPeshkiVoucher(p)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-gray-700 border border-gray-200 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                        >
                          <Printer size={12} />
                          <span>भौचर हेर्नुहोस्</span>
                        </button>
                      </div>

                      {/* Advance Details Grid */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/70 p-2.5 rounded-xl border border-gray-100">
                        <div>
                          <span className="text-gray-500">📅 निकासा मिति:</span>
                          <p className="font-bold text-gray-800">BS {p.givenDateBs}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">💳 भुक्तानी माध्यम:</span>
                          <p className="font-bold text-gray-800">
                            {p.paymentMode === 'CASH' ? '💵 नगद (Cash)' : p.paymentMode === 'CHEQUE' ? `📝 चेक (${p.chequeNo || '—'})` : '🏦 बैंक ट्रान्सफर'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">📆 कट्टी हुने अवधि:</span>
                          <p className="font-bold text-amber-900">
                            {p.deductFromMonth} देखि {p.deductToMonth} ({p.deductYearBs})
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">💵 मासिक किस्ता:</span>
                          <p className="font-bold text-blue-900">
                            रु. {p.monthlyDeduction?.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Repayment Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-600">
                            फर्स्यौट: <b>रु. {settled.toLocaleString()}</b> ({percent}%)
                          </span>
                          <span className="font-extrabold text-amber-900">
                            बाँकी: रु. {p.remainingAmount.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              percent === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Settlements History log */}
                      {p.settlements && p.settlements.length > 0 && (
                        <div className="pt-2 border-t border-gray-100 space-y-1">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">कट्टी / भुक्तानी इतिहास:</p>
                          <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                            {p.settlements.map((s: any) => (
                              <div key={s.id} className="flex items-center justify-between text-[10px] bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                <span>
                                  {s.type === 'PAYROLL_DEDUCTION' ? '📋 तलब कट्टी' : '💵 नगद दाखिला'} (BS {s.settledDateBs})
                                </span>
                                <span className="font-bold text-emerald-800">
                                  - रु. {s.amount.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── SECTION 2: PAYROLL & PAY SLIPS HISTORY ─── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                  <Receipt size={18} className="text-blue-600" />
                  <span>आधिकारिक तलब निकासा तथा पे-स्लिप इतिहास (My Official Pay Slips)</span>
                </h3>
                <p className="text-xs text-gray-500">
                  विद्यालयद्वारा निकासा भएको चौमासिक/मासिक तलब भरपाई, कट्टी तथा खुद भुक्तानी विवरण
                </p>
              </div>
              <span className="text-xs font-bold bg-blue-50 text-blue-900 px-3 py-1 rounded-lg border border-blue-200">
                कुल निकासा: {myPayrollList.length} पटक
              </span>
            </div>

            {isMyPayrollLoading ? (
              <div className="py-8 text-center text-xs text-gray-400">तलब विवरण लोड हुँदैछ...</div>
            ) : myPayrollList.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                <Receipt className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-xs font-bold text-gray-600">कुनै तलब निकासा अभिलेख भेटिएन</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Approved payroll records generated by the school will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3">क्र.सं.</th>
                      <th className="p-3">अवधि / महिना</th>
                      <th className="p-3">आर्थिक वर्ष</th>
                      <th className="p-3 text-right">मूल+ग्रेड तलब</th>
                      <th className="p-3 text-right">कुल तलब+भत्ता (P)</th>
                      <th className="p-3 text-right">क.सं. कोष (Q)</th>
                      <th className="p-3 text-right text-rose-700">सा.सु. कर १% (Y)</th>
                      <th className="p-3 text-right text-amber-700 bg-amber-50/70">पेस्की कट्टी</th>
                      <th className="p-3 text-right text-emerald-900 font-extrabold bg-emerald-50/70">खुद प्राप्त (Z)</th>
                      <th className="p-3 text-center">स्थिति</th>
                      <th className="p-3 text-center">पे-स्लिप</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {myPayrollList.map((pr: any, idx: number) => (
                      <tr key={pr.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-mono text-gray-500">{idx + 1}</td>
                        <td className="p-3 font-bold text-gray-900">
                          {pr.monthFrom} देखि {pr.monthTo}
                          <span className="block text-[10px] font-normal text-gray-500">
                            ({pr.monthCount || 3} महिना)
                          </span>
                        </td>
                        <td className="p-3 font-mono text-gray-600">
                          {pr.academicYear?.name || pr.financialYear?.name || '—'}
                        </td>
                        <td className="p-3 text-right font-mono">
                          रु. {(pr.gradeSahitTalab || pr.moolTalab || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-blue-900">
                          रु. {(pr.traimasikTalan || pr.jammaTalabBhata || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono text-gray-600">
                          {pr.ssk20Pct ? `रु. ${pr.ssk20Pct.toLocaleString()}` : '—'}
                        </td>
                        <td className="p-3 text-right font-mono text-rose-700">
                          रु. {(pr.samajikSurakshaKar1Pct || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-amber-800 bg-amber-50/50">
                          {pr.peshkiDeduction ? `रु. ${pr.peshkiDeduction.toLocaleString()}` : '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-extrabold text-emerald-900 bg-emerald-50/50 text-sm">
                          रु. {(pr.khudPaaunuParne || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              pr.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {pr.status === 'PAID' ? 'भुक्तान भएको' : 'स्वीकृत'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setSelectedPayslip(pr)}
                            className="px-2.5 py-1 bg-[#1e3a5f] hover:bg-[#2a5280] text-white rounded-lg text-[10px] font-bold flex items-center gap-1 mx-auto shadow-2xs transition cursor-pointer"
                          >
                            <Eye size={12} />
                            <span>पे-स्लिप हेर्नुहोस्</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: TEACHER NOTICES & ANNOUNCEMENTS (सूचना तथा सन्देश केन्द्र) ─── */}
      {activeTab === 'notices' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-[#1e3a5f] via-[#2a5280] to-[#1e3a5f] text-white p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-[#1e3a5f] font-black text-xs rounded-lg mb-2 shadow-xs">
                <Bell size={14} />
                <span>विद्यालय सूचना तथा सन्देश केन्द्र (Notices & Announcements Hub)</span>
              </div>
              <h2 className="text-xl font-extrabold flex items-center gap-2">
                <span>सूचना तथा परिपत्रहरू</span>
                <span className="text-xs bg-white/20 font-bold px-2.5 py-0.5 rounded-full">
                  कुल {noticesData?.length || 0} सूचनाहरू
                </span>
              </h2>
              <p className="text-xs text-blue-200 mt-1">
                प्रशासन, परीक्षा शाखा, बिदा तथा शैक्षिक परिपत्रहरूको आधिकारिक अभिलेख
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => switchTab('overview')}
                className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] font-black px-4 py-2 rounded-xl text-xs shadow-xs transition active:scale-95 cursor-pointer"
              >
                <span>← मुख्य मेनु</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: 'ALL', label: 'सबै (All)' },
                { key: 'GENERAL', label: '📌 साधारण' },
                { key: 'EXAM', label: '📢 परीक्षा' },
                { key: 'HOLIDAY', label: '🏖️ बिदा' },
                { key: 'EVENT', label: '🎉 कार्यक्रम' },
                { key: 'ABSENT_ALERT', label: '🚨 अनुपस्थित' },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setTeacherNoticeFilter(f.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    teacherNoticeFilter === f.key
                      ? 'bg-[#1e3a5f] text-white shadow-xs'
                      : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-gray-500 font-medium">
              देखाउँदै: <b>{noticesData?.filter((n: any) => teacherNoticeFilter === 'ALL' || n.type === teacherNoticeFilter).length || 0}</b> सूचना
            </span>
          </div>

          {/* Notices Grid */}
          {(!noticesData || noticesData.length === 0) ? (
            <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-3xl bg-white space-y-3">
              <Bell className="mx-auto text-gray-300" size={48} />
              <p className="text-sm font-bold text-gray-700">कुनै सूचना फेला परेन</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                विद्यालय प्रशासन वा शिक्षक शाखाबाट जारी गरिएका नयाँ सूचनाहरू यहाँ देखिनेछन्।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {noticesData
                .filter((n: any) => teacherNoticeFilter === 'ALL' || n.type === teacherNoticeFilter)
                .map((notice: any) => {
                  const typeBadge = {
                    GENERAL: { label: '📌 साधारण सूचना', bg: 'bg-blue-50 text-blue-800 border-blue-200' },
                    EXAM: { label: '📢 परीक्षा सूचना', bg: 'bg-purple-50 text-purple-800 border-purple-200' },
                    HOLIDAY: { label: '🏖️ बिदा सूचना', bg: 'bg-amber-50 text-amber-900 border-amber-300' },
                    EVENT: { label: '🎉 कार्यक्रम', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                    ABSENT_ALERT: { label: '🚨 अनुपस्थित सूचना', bg: 'bg-rose-50 text-rose-800 border-rose-200' },
                    FEE_REMINDER: { label: '💰 शुल्क सूचना', bg: 'bg-teal-50 text-teal-800 border-teal-200' },
                  }[notice.type as string] || { label: `📌 ${notice.type || 'सूचना'}`, bg: 'bg-slate-100 text-slate-800 border-slate-200' };

                  return (
                    <div
                      key={notice.id}
                      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs hover:shadow-xs transition space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${typeBadge.bg}`}>
                            {typeBadge.label}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-gray-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            BS {notice.postedDateBs || 'हालै'}
                          </span>
                        </div>

                        <h3 className="text-base font-extrabold text-[#1e3a5f] font-serif leading-snug">
                          {notice.title}
                        </h3>

                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                          {notice.body}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
                        <span className="font-semibold">
                          लक्ष्य: <b>{notice.targetRole === 'ALL' ? 'सम्पूर्ण शिक्षक तथा विद्यार्थी' : notice.targetRole === 'TEACHER' ? 'सबै शिक्षकहरू' : (notice.targetClass?.name ? `कक्षा: ${notice.targetClass.name}` : notice.targetRole || 'विद्यालय')}</b>
                        </span>
                        <span className="text-gray-400">श्री नेपाल माध्यमिक विद्यालय</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: OFFICIAL PAY SLIP PRINT VIEW (तलब पे-स्लिप भरपाई) ─────────── */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-base text-[#1e3a5f] flex items-center gap-2">
                <Receipt size={18} className="text-amber-500" />
                <span>आधिकारिक तलब पे-स्लिप भरपाई (Official Salary Slip)</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const printWin = window.open('', '_blank');
                    if (!printWin) return;
                    printWin.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>Pay Slip - ${displayName}</title>
                          <style>
                            @page { size: A4 portrait; margin: 12mm; }
                            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; }
                            body { margin: 0; padding: 10px; color: #111; font-size: 12px; }
                            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px; }
                            .school-name { font-size: 18px; font-weight: 900; color: #1e3a5f; }
                            .sub { font-size: 11px; color: #475569; }
                            .title { font-size: 13px; font-weight: 800; background: #f1f5f9; padding: 4px; margin: 8px 0; border: 1px solid #cbd5e1; }
                            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
                            .card { border: 1px solid #cbd5e1; padding: 8px; border-radius: 6px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11px; }
                            th, td { border: 1px solid #cbd5e1; padding: 4px 6px; }
                            th { background: #f8fafc; font-weight: bold; text-align: left; }
                            .net-box { margin-top: 10px; border: 2px solid #1e3a5f; background: #f8fafc; padding: 8px; font-size: 13px; font-weight: 800; }
                            .footer { margin-top: 35px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; }
                          </style>
                        </head>
                        <body>
                          <div class="header">
                            <div class="school-name">${school?.nameNepali || school?.name || ''}</div>
                            <div class="sub">${school?.address || ''}${school?.district ? ', ' + school.district : ''}</div>
                            <div class="title">शिक्षक तथा कर्मचारी तलब निकासा भरपाई (Pay Slip)</div>
                          </div>
                          <div class="grid">
                            <div class="card">
                              <div><b>नाम:</b> ${displayName}</div>
                              <div><b>पद / तह:</b> ${teacherDetails?.post || 'शिक्षक'} (${teacherDetails?.taha || '—'})</div>
                              <div><b>बैंक खाता नं:</b> ${teacherDetails?.bankAccountNo || '—'}</div>
                            </div>
                            <div class="card">
                              <div><b>अवधि:</b> ${selectedPayslip.monthFrom} देखि ${selectedPayslip.monthTo} (${selectedPayslip.monthCount || 3} महिना)</div>
                              <div><b>आर्थिक वर्ष:</b> ${selectedPayslip.academicYear?.name || selectedPayslip.financialYear?.name || 'चालु'}</div>
                              <div><b>PAN नं:</b> ${teacherDetails?.panNo || '—'}</div>
                            </div>
                          </div>

                          <div class="grid">
                            <div>
                              <b>आय विवरण (Earnings)</b>
                              <table>
                                <tr><td>मूल तलब (A)</td><td style="text-align: right;">रु. ${(selectedPayslip.moolTalab || 0).toLocaleString()}</td></tr>
                                <tr><td>ग्रेड रकम (D)</td><td style="text-align: right;">रु. ${(selectedPayslip.gradeRakam || 0).toLocaleString()}</td></tr>
                                <tr><td>क.सं. कोष थप १०% (F)</td><td style="text-align: right;">रु. ${(selectedPayslip.karmachari10Pct || 0).toLocaleString()}</td></tr>
                                <tr><td>बीमा थप (G)</td><td style="text-align: right;">रु. ${(selectedPayslip.bimaThap || 0).toLocaleString()}</td></tr>
                                <tr><td>जम्मा मासिक तलब (H)</td><td style="text-align: right; font-weight: bold;">रु. ${(selectedPayslip.kulTalab || 0).toLocaleString()}</td></tr>
                                <tr><td>जम्मा भत्ता (N)</td><td style="text-align: right;">रु. ${(selectedPayslip.jammaBhata || 0).toLocaleString()}</td></tr>
                                <tr><td>मासिक कुल (O)</td><td style="text-align: right; font-weight: bold;">रु. ${(selectedPayslip.jammaTalabBhata || 0).toLocaleString()}</td></tr>
                                <tr style="background: #f1f5f9; font-weight: bold;"><td>कुल चौमासिक तलब (P)</td><td style="text-align: right;">रु. ${(selectedPayslip.traimasikTalan || 0).toLocaleString()}</td></tr>
                              </table>
                            </div>
                            <div>
                              <b>कट्टी विवरण (Deductions)</b>
                              <table>
                                <tr><td>क.सं. कोष २०% (Q)</td><td style="text-align: right;">रु. ${(selectedPayslip.ssk20Pct || 0).toLocaleString()}</td></tr>
                                <tr><td>बीमा कट्टी (S)</td><td style="text-align: right;">रु. ${(selectedPayslip.bimaKati || 0).toLocaleString()}</td></tr>
                                <tr><td>कर्मचारी कोष सापटी (R)</td><td style="text-align: right;">रु. ${(selectedPayslip.karmachariKoshSapati || 0).toLocaleString()}</td></tr>
                                <tr><td>जम्मा कट्टी (T)</td><td style="text-align: right; font-weight: bold;">रु. ${(selectedPayslip.jammaKati || 0).toLocaleString()}</td></tr>
                                <tr><td>सामाजिक सुरक्षा कर १% (Y)</td><td style="text-align: right; color: #b91c1c;">रु. ${(selectedPayslip.samajikSurakshaKar1Pct || 0).toLocaleString()}</td></tr>
                                <tr style="background: #fef3c7; font-weight: bold; color: #92400e;">
                                  <td>पेस्की कट्टी (Peshki Deduct)</td>
                                  <td style="text-align: right;">रु. ${(selectedPayslip.peshkiDeduction || 0).toLocaleString()}</td>
                                </tr>
                              </table>
                            </div>
                          </div>

                          <div class="net-box">
                            <div style="display: flex; justify-content: space-between;">
                              <span>खुद भुक्तानी पाउने रकम (Net Payable Z):</span>
                              <span style="font-size: 16px; color: #047857;">रु. ${(selectedPayslip.khudPaaunuParne || 0).toLocaleString()}</span>
                            </div>
                            <div style="font-size: 11px; font-weight: normal; margin-top: 4px; color: #334155;">
                              अक्षरेपी: <b>${numberToNepaliWords(selectedPayslip.khudPaaunuParne || 0)}</b>
                            </div>
                          </div>

                          <div class="footer">
                            <div>प्राप्त गर्नेको हस्ताक्षर: __________________</div>
                            <div>लेखापाल: __________________</div>
                            <div>प्रधानाध्यापक: __________________</div>
                          </div>
                          <script>
                            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
                          </script>
                        </body>
                      </html>
                    `);
                    printWin.document.close();
                  }}
                  className="px-3 py-1.5 bg-[#1e3a5f] hover:bg-[#2a5280] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer size={14} />
                  <span>प्रिन्ट गर्नुहोस्</span>
                </button>
                <button onClick={() => setSelectedPayslip(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: Two column salary details */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <p className="text-gray-500 text-[11px]">शिक्षकको नाम / पद:</p>
                  <p className="font-extrabold text-gray-900">{displayName} ({teacherDetails?.post || 'शिक्षक'})</p>
                  <p className="text-gray-500 text-[11px] mt-1">बैंक खाता: <b>{teacherDetails?.bankAccountNo || '—'}</b></p>
                </div>
                <div>
                  <p className="text-gray-500 text-[11px]">भुक्तानी अवधि:</p>
                  <p className="font-extrabold text-blue-900">{selectedPayslip.monthFrom} देखि {selectedPayslip.monthTo} ({selectedPayslip.monthCount || 3} महिना)</p>
                  <p className="text-gray-500 text-[11px] mt-1">PAN नं: <b>{teacherDetails?.panNo || '—'}</b></p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Earnings */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-3 space-y-1.5">
                  <p className="font-extrabold text-emerald-950 border-b border-emerald-200 pb-1">आय विवरण (Earnings)</p>
                  <div className="flex justify-between text-gray-700"><span>मूल तलब (A):</span><span className="font-mono">रु. {(selectedPayslip.moolTalab || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between text-gray-700"><span>ग्रेड रकम (D):</span><span className="font-mono">रु. {(selectedPayslip.gradeRakam || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between text-gray-700"><span>क.सं. कोष थप १०% (F):</span><span className="font-mono">रु. {(selectedPayslip.karmachari10Pct || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between text-gray-700"><span>बीमा थप (G):</span><span className="font-mono">रु. {(selectedPayslip.bimaThap || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between text-gray-700"><span>जम्मा भत्ता (N):</span><span className="font-mono">रु. {(selectedPayslip.jammaBhata || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between font-extrabold text-emerald-950 pt-1 border-t border-emerald-200">
                    <span>कुल चौमासिक तलब (P):</span>
                    <span className="font-mono">रु. {(selectedPayslip.traimasikTalan || 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="rounded-2xl border border-rose-200 bg-rose-50/30 p-3 space-y-1.5">
                  <p className="font-extrabold text-rose-950 border-b border-rose-200 pb-1">कट्टी विवरण (Deductions)</p>
                  <div className="flex justify-between text-gray-700"><span>क.सं. कोष २०% (Q):</span><span className="font-mono">रु. {(selectedPayslip.ssk20Pct || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between text-gray-700"><span>बीमा कट्टी (S):</span><span className="font-mono">रु. {(selectedPayslip.bimaKati || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between text-gray-700"><span>क.सं. कोष सापटी (R):</span><span className="font-mono">रु. {(selectedPayslip.karmachariKoshSapati || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between text-rose-800"><span>सामाजिक सुरक्षा कर १% (Y):</span><span className="font-mono">रु. {(selectedPayslip.samajikSurakshaKar1Pct || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between font-extrabold text-amber-900 bg-amber-100/70 px-2 py-1 rounded">
                    <span>पेस्की कट्टी (Peshki Deduct):</span>
                    <span className="font-mono">रु. {(selectedPayslip.peshkiDeduction || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Net box */}
              <div className="rounded-2xl bg-[#1e3a5f] text-white p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-200">खुद भुक्तानी पाउने रकम (Net Disbursed)</p>
                  <p className="text-xs text-amber-300 mt-0.5">
                    अक्षरेपी: {numberToNepaliWords(selectedPayslip.khudPaaunuParne || 0)}
                  </p>
                </div>
                <span className="text-2xl font-black text-amber-400 font-mono">
                  रु. {(selectedPayslip.khudPaaunuParne || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: PESHkI ADVANCE VOUCHER PRINT VIEW ─────────────────────────── */}
      {selectedPeshkiVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-base text-amber-950 flex items-center gap-2">
                <Wallet size={18} className="text-amber-600" />
                <span>कर्मचारी तलब पेस्की भौचर (Advance Voucher)</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const printWin = window.open('', '_blank');
                    if (!printWin) return;
                    printWin.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>Peshki Voucher - ${displayName}</title>
                          <style>
                            @page { size: A4 portrait; margin: 15mm; }
                            * { box-sizing: border-box; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; }
                            body { margin: 0; padding: 15px; color: #111; font-size: 13px; }
                            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 15px; }
                            .school-name { font-size: 18px; font-weight: 900; color: #1e3a5f; }
                            .sub { font-size: 12px; color: #475569; }
                            .title { font-size: 14px; font-weight: 800; background: #fef3c7; border: 1px solid #f59e0b; padding: 5px; margin-top: 10px; text-align: center; }
                            .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                            .table td { border: 1px solid #cbd5e1; padding: 8px 12px; }
                            .table td.label { background: #f8fafc; font-weight: bold; width: 35%; }
                            .terms { margin-top: 15px; padding: 10px; border: 1px dashed #cbd5e1; background: #fafafa; font-size: 12px; line-height: 1.6; }
                            .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; }
                          </style>
                        </head>
                        <body>
                          <div class="header">
                            <div class="school-name">${school?.nameNepali || school?.name || ''}</div>
                            <div class="sub">${school?.address || ''}${school?.district ? ', ' + school.district : ''}</div>
                            <div class="title">कर्मचारी तलब पेस्की निकासा भौचर (Staff Advance Voucher)</div>
                          </div>

                          <table class="table">
                            <tr><td class="label">पेस्की पाउनेको नाम:</td><td><b>${displayName}</b></td></tr>
                            <tr><td class="label">पद तथा तह:</td><td>${teacherDetails?.post || 'शिक्षक'} (${teacherDetails?.taha || '—'})</td></tr>
                            <tr><td class="label">पेस्की निकासा मिति:</td><td>BS ${selectedPeshkiVoucher.givenDateBs}</td></tr>
                            <tr><td class="label">पेस्की रकम:</td><td><b>रु. ${selectedPeshkiVoucher.amount.toLocaleString()}</b></td></tr>
                            <tr><td class="label">अक्षरेपी:</td><td>${numberToNepaliWords(selectedPeshkiVoucher.amount)}</td></tr>
                            <tr><td class="label">भुक्तानी माध्यम:</td><td>${selectedPeshkiVoucher.paymentMode === 'CASH' ? 'नगद (Cash)' : selectedPeshkiVoucher.paymentMode === 'CHEQUE' ? `चेक नं. ${selectedPeshkiVoucher.chequeNo || '—'}` : 'बैंक ट्रान्सफर'}</td></tr>
                            <tr><td class="label">पेस्की लिनुको प्रयोजन:</td><td>${selectedPeshkiVoucher.reason || 'घरायसी प्रयोजन'}</td></tr>
                            <tr><td class="label">कट्टी हुने समयावधि:</td><td>${selectedPeshkiVoucher.deductFromMonth} देखि ${selectedPeshkiVoucher.deductToMonth} सम्म (${selectedPeshkiVoucher.deductYearBs})</td></tr>
                            <tr><td class="label">मासिक किस्ता कट्टी:</td><td>रु. ${selectedPeshkiVoucher.monthlyDeduction?.toLocaleString()}</td></tr>
                            <tr><td class="label">हाल बाँकी पेस्की:</td><td><b>रु. ${selectedPeshkiVoucher.remainingAmount?.toLocaleString()}</b></td></tr>
                          </table>

                          <div class="terms">
                            <b>शर्त तथा प्रतिबद्धता:</b> माथि उल्लिखित पेस्की रकम मैले बुझिलिएँ । तोकिएको अवधिभित्र मेरो तलबबाट किस्ताबन्दी रुपमा रकम कट्टी गरी फर्स्यौट गर्न म मञ्जुर गर्दछु।
                          </div>

                          <div class="footer">
                            <div>पेस्की बुझिलिनेको हस्ताक्षर: __________________</div>
                            <div>लेखापाल: __________________</div>
                            <div>प्रधानाध्यापक: __________________</div>
                          </div>

                          <script>
                            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
                          </script>
                        </body>
                      </html>
                    `);
                    printWin.document.close();
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-[#1e3a5f] font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer size={14} />
                  <span>प्रिन्ट गर्नुहोस्</span>
                </button>
                <button onClick={() => setSelectedPeshkiVoucher(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                <div className="flex justify-between"><span className="text-gray-600">पेस्की रकम:</span><span className="font-extrabold text-amber-950 text-base">रु. {selectedPeshkiVoucher.amount.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">अक्षरेपी:</span><span className="font-bold text-gray-800">{numberToNepaliWords(selectedPeshkiVoucher.amount)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">मिति:</span><span className="font-bold">BS {selectedPeshkiVoucher.givenDateBs}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">कट्टी तालिका:</span><span className="font-bold text-blue-900">{selectedPeshkiVoucher.deductFromMonth} देखि {selectedPeshkiVoucher.deductToMonth} ({selectedPeshkiVoucher.deductYearBs})</span></div>
                <div className="flex justify-between"><span className="text-gray-600">मासिक किस्ता:</span><span className="font-bold">रु. {selectedPeshkiVoucher.monthlyDeduction?.toLocaleString()}</span></div>
                <div className="flex justify-between border-t border-amber-200 pt-2"><span className="text-gray-600">हाल बाँकी रकम:</span><span className="font-extrabold text-rose-800">रु. {selectedPeshkiVoucher.remainingAmount?.toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: APPLY FOR TEACHER LEAVE ───────────────────────────────── */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1e3a5f]">Apply for Teacher Leave (बिदाको निवेदन)</h3>
                <p className="text-xs text-gray-500">प्रधानाध्यापक तथा प्रशासन समक्ष बिदाको निवेदन पेश गर्नुहोस्</p>
              </div>
              <button onClick={() => setIsLeaveModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                applyLeaveMutation.mutate();
              }}
              className="space-y-3 text-xs"
            >
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <b>स्मरण रहोस्:</b> बिदा दर्ता भएपछि तुरुन्त स्वीकृतिका लागि प्रशासनलाई सम्पर्क गर्नुहोस्।
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">सुरु मिति (Start Date BS) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2083-05-10"
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="erp-input font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">अन्तिम मिति (End Date BS) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2083-05-12"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="erp-input font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">कुल दिन संख्या (Total Days) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={leaveDaysCount}
                  onChange={(e) => setLeaveDaysCount(parseInt(e.target.value) || 1)}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">बिदाको कारण / निवेदन (Reason / Application) *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="श्री प्रधानाध्यापक ज्यू, मलाई घरायसी अत्यावश्यक काम परेको हुनाले मिति... देखि... सम्म बिदा पाउन निवेदन गर्दछु।"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="erp-input leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyLeaveMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-5 py-2 font-bold text-white disabled:opacity-60 cursor-pointer"
                >
                  {applyLeaveMutation.isPending ? 'दर्ता हुँदैछ...' : 'बिदा निवेदन बुझाउनुहोस् (Submit)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT TEACHER LEAVE ────────────────────────────────────── */}
      {isEditLeaveModalOpen && editingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1e3a5f]">Edit Teacher Leave (बिदाको निवेदन सम्पादन)</h3>
                <p className="text-xs text-gray-500">प्रशासनले निर्णय लिनु अघि विवरण परिमार्जन गर्नुहोस्</p>
              </div>
              <button
                onClick={() => {
                  setIsEditLeaveModalOpen(false);
                  setEditingLeave(null);
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateLeaveMutation.mutate({
                  id: editingLeave.id,
                  data: {
                    startDateBs: editLeaveStartDate,
                    endDateBs: editLeaveEndDate,
                    totalDays: editLeaveDaysCount,
                    reason: editLeaveReason,
                  },
                });
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">सुरु मिति (Start Date BS) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2083-05-10"
                    value={editLeaveStartDate}
                    onChange={(e) => setEditLeaveStartDate(e.target.value)}
                    className="erp-input font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">अन्तिम मिति (End Date BS) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2083-05-12"
                    value={editLeaveEndDate}
                    onChange={(e) => setEditLeaveEndDate(e.target.value)}
                    className="erp-input font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">कुल दिन संख्या (Total Days) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={editLeaveDaysCount}
                  onChange={(e) => setEditLeaveDaysCount(parseInt(e.target.value) || 1)}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">बिदाको कारण / निवेदन (Reason / Application) *</label>
                <textarea
                  required
                  rows={4}
                  value={editLeaveReason}
                  onChange={(e) => setEditLeaveReason(e.target.value)}
                  className="erp-input leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditLeaveModalOpen(false);
                    setEditingLeave(null);
                  }}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  रद्द (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={updateLeaveMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-5 py-2 font-bold text-white disabled:opacity-60 cursor-pointer"
                >
                  {updateLeaveMutation.isPending ? 'सुरक्षित हुँदैछ...' : 'परिमार्जन सुरक्षित गर्नुहोस् (Update)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: SEND CLASS NOTICE ────────────────────────────────────── */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1e3a5f]">Send Notice to Class (कक्षालाई सूचना)</h3>
                <p className="text-xs text-gray-500">Notice will appear in student/parent portals.</p>
              </div>
              <button onClick={() => setIsNoticeModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendNoticeMutation.mutate();
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Class *</label>
                <select
                  required
                  value={noticeTargetClassId}
                  onChange={(e) => setNoticeTargetClassId(e.target.value)}
                  className="erp-input font-bold"
                >
                  <option value="">Select Target Class</option>
                  {classesData?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.section ? `(${c.section})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Notice Title *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Unit Test Announcement / Homework Notice"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Notice Content *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type notice message to students..."
                  value={noticeBody}
                  onChange={(e) => setNoticeBody(e.target.value)}
                  className="erp-input leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={sendSms}
                    onChange={(e) => setSendSms(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Send SMS to Parents (Sparrow SMS)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsNoticeModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendNoticeMutation.isPending}
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2 font-bold text-[#1e3a5f] disabled:opacity-60"
                >
                  {sendNoticeMutation.isPending ? 'Sending...' : 'Dispatch Notice (सूचना पठाउनुहोस्)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: REPORT PROBLEM TO ADMIN ──────────────────────────────── */}
      {isProblemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-rose-700">Report Problem to Admin (प्रशासनलाई समस्या वा माग)</h3>
                <p className="text-xs text-gray-500">Send an issue directly to the Principal and School Management.</p>
              </div>
              <button onClick={() => setIsProblemModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                reportProblemMutation.mutate();
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Issue Category *</label>
                  <select
                    value={problemCategory}
                    onChange={(e) => setProblemCategory(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="FACILITIES">Classroom / Facility (कोठा तथा पूर्वाधार)</option>
                    <option value="TEACHING_MATERIALS">Teaching Materials (शैक्षिक सामग्री / मार्कर)</option>
                    <option value="DISCIPLINE">Student Discipline (विद्यार्थी अनुशासन)</option>
                    <option value="LEAVE_REQUEST">Leave / Substitute (बिदा तथा सट्टा शिक्षक)</option>
                    <option value="OTHER">Other Issue (अन्य समस्या)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Urgency / Priority *</label>
                  <select
                    value={problemPriority}
                    onChange={(e) => setProblemPriority(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="NORMAL">Normal Priority (सामान्य)</option>
                    <option value="URGENT">Urgent (तत्काल समाधान आवश्यक)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Problem Subject / Title *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Whiteboard damaged in Class 9 / Need Science Lab chemicals"
                  value={problemTitle}
                  onChange={(e) => setProblemTitle(e.target.value)}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Detailed Description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain the problem in detail and what assistance is needed from the Principal/Admin..."
                  value={problemBody}
                  onChange={(e) => setProblemBody(e.target.value)}
                  className="erp-input leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsProblemModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportProblemMutation.isPending}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2 font-bold text-white disabled:opacity-60"
                >
                  {reportProblemMutation.isPending ? 'Submitting...' : 'Submit Report to Admin (प्रतिवेदन बुझाउनुहोस्)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: LOG DISCIPLINE INCIDENT ───────────────────────────────── */}
      {isAddIncidentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-base text-rose-950 flex items-center gap-2">
                <ShieldAlert size={18} className="text-rose-600" />
                <span>Log Student Incident / Misconduct (अनुशासन उल्लंघन दर्ता)</span>
              </h3>
              <button onClick={() => setIsAddIncidentModalOpen(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const matchedClass = classesData?.find((c: any) => String(c.id) === String(incidentClassId));
                const categoryLabelsMap: Record<string, string> = {
                  UNIFORM: 'पोशाक उल्लंघन (Improper Uniform)',
                  TRUANCY: 'कक्षा बङ्क / भगौडा (Truancy)',
                  FIGHTING: 'झैझगडा / अभद्र व्यवहार (Misconduct)',
                  HOMEWORK: 'गृहकार्य नगरेको (No Homework)',
                  OTHER: 'अन्य आचरण समस्या (Other)',
                };
                const newInc = {
                  id: Date.now(),
                  studentName: incidentStudent,
                  classId: incidentClassId,
                  className: matchedClass ? `${matchedClass.name} ${matchedClass.section || ''}` : 'Class',
                  dateBs: todayBS(),
                  category: incidentCategory,
                  categoryLabel: categoryLabelsMap[incidentCategory] || incidentCategory,
                  severity: incidentSeverity,
                  action: incidentAction,
                  parentCalled: incidentParentCalled,
                  notes: incidentNotes,
                  status: 'PENDING_REVIEW',
                };
                setDisciplineIncidents((prev) => [newInc, ...prev]);
                toast.success('Discipline incident logged successfully!');
                setIsAddIncidentModalOpen(false);
                setIncidentStudent('');
                setIncidentClassId('');
                setIncidentNotes('');
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">विद्यार्थीको पुरा नाम (Student Full Name) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Patel"
                  value={incidentStudent}
                  onChange={(e) => setIncidentStudent(e.target.value)}
                  className="erp-input font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">कक्षा (Class) *</label>
                  <select
                    required
                    value={incidentClassId}
                    onChange={(e) => setIncidentClassId(e.target.value)}
                    className="erp-input font-bold"
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
                  <label className="block font-bold text-gray-700 mb-1">विधा / प्रकृति (Category) *</label>
                  <select
                    value={incidentCategory}
                    onChange={(e) => setIncidentCategory(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="UNIFORM">पोशाक (Improper Uniform)</option>
                    <option value="TRUANCY">कक्षा बङ्क (Truancy / Bunking)</option>
                    <option value="FIGHTING">झैझगडा (Fighting / Abuse)</option>
                    <option value="HOMEWORK">गृहकार्य (Homework Default)</option>
                    <option value="OTHER">अन्य (Other Misconduct)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">गम्भीरता स्तर (Severity) *</label>
                  <select
                    value={incidentSeverity}
                    onChange={(e) => setIncidentSeverity(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="LOW">सामान्य (Low / First Offense)</option>
                    <option value="MEDIUM">मध्यम (Medium / Repeated)</option>
                    <option value="HIGH">गम्भीर (High / Severe)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">लिएको निर्णय / परामर्श (Action) *</label>
                  <select
                    value={incidentAction}
                    onChange={(e) => setIncidentAction(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="Verbal Warning (सचेत गराइएको)">Verbal Warning (सचेत गराइएको)</option>
                    <option value="Written Apology (लिखित प्रतिबद्धता)">Written Apology (लिखित प्रतिबद्धता)</option>
                    <option value="Parent Called (अभिभावक बोलाई)">Parent Called (अभिभावक बोलाई)</option>
                    <option value="Counseling Session (विशेष परामर्श)">Counseling Session (विशेष परामर्श)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">विवरण तथा कैफियत (Incident Details & Notes)</label>
                <textarea
                  rows={3}
                  placeholder="घटनाको संक्षिप्त विवरण, विद्यार्थीको प्रतिक्रिया..."
                  value={incidentNotes}
                  onChange={(e) => setIncidentNotes(e.target.value)}
                  className="erp-input leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="incParent"
                  checked={incidentParentCalled}
                  onChange={(e) => setIncidentParentCalled(e.target.checked)}
                  className="rounded text-rose-600 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="incParent" className="font-bold text-rose-900 cursor-pointer">
                  अभिभावकलाई फोन सम्पर्क गरियो (Parent contacted via Phone)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddIncidentModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-gray-600"
                >
                  रद्द (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  दर्ता गर्नुहोस् (Save Incident)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD ECA EVENT / WINNERS ─────────────────────────────────── */}
      {isAddEcaEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-base text-amber-950 flex items-center gap-2">
                <Trophy size={18} className="text-amber-600" />
                <span>Plan ECA Event & Record Winners (अतिरिक्त क्रियाकलाप तथा विजेता)</span>
              </h3>
              <button onClick={() => setIsAddEcaEventModalOpen(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const newEvt = {
                  id: Date.now(),
                  name: ecaEventName,
                  topic: ecaEventTopic,
                  dateBs: ecaEventDateBs,
                  category: ecaCategory,
                  firstWinner: ecaWinner1,
                  secondWinner: ecaWinner2,
                  thirdWinner: ecaWinner3,
                  status: 'COMPLETED',
                };
                setEcaEvents((prev) => [newEvt, ...prev]);
                toast.success('ECA event and results recorded!');
                setIsAddEcaEventModalOpen(false);
                setEcaEventName('');
                setEcaEventTopic('');
                setEcaWinner1('');
                setEcaWinner2('');
                setEcaWinner3('');
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">कार्यक्रमको नाम (Event Name) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. शुक्रबारे हाजिरीजवाफ / वक्तृत्वकला / चित्रकला"
                  value={ecaEventName}
                  onChange={(e) => setEcaEventName(e.target.value)}
                  className="erp-input font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">मिति (Date BS) *</label>
                  <input
                    type="text"
                    required
                    value={ecaEventDateBs}
                    onChange={(e) => setEcaEventDateBs(e.target.value)}
                    className="erp-input font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">विधा (Category) *</label>
                  <select
                    value={ecaCategory}
                    onChange={(e) => setEcaCategory(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="SPORTS">खेलकुद (Sports & Athletics)</option>
                    <option value="LITERARY">साहित्यिक (Speech / Essay / Poetry)</option>
                    <option value="QUIZ">हाजिरीजवाफ (General Quiz)</option>
                    <option value="CULTURAL">सांस्कृतिक (Dance / Song / Drama)</option>
                    <option value="ART">चित्रकला (Drawing / Art)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">कार्यक्रमको शीर्षक / विषय (Topic / Theme)</label>
                <input
                  type="text"
                  placeholder="e.g. वातावरणीय संरक्षण र हाम्रो दायित्व"
                  value={ecaEventTopic}
                  onChange={(e) => setEcaEventTopic(e.target.value)}
                  className="erp-input font-medium"
                />
              </div>

              <div className="space-y-2 border-t border-gray-100 pt-2">
                <p className="font-bold text-gray-800">विजेताहरूको विवरण (Winners Podium):</p>
                <div>
                  <label className="block text-[11px] font-bold text-amber-900 mb-0.5">🥇 प्रथम स्थान (1st Place):</label>
                  <input
                    type="text"
                    placeholder="e.g. अञ्जु साह (Grade 10, Green House)"
                    value={ecaWinner1}
                    onChange={(e) => setEcaWinner1(e.target.value)}
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">🥈 द्वितीय स्थान (2nd Place):</label>
                  <input
                    type="text"
                    placeholder="e.g. सन्तोष यादव (Grade 9, Red House)"
                    value={ecaWinner2}
                    onChange={(e) => setEcaWinner2(e.target.value)}
                    className="erp-input"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 mb-0.5">🥉 तृतीय स्थान (3rd Place):</label>
                  <input
                    type="text"
                    placeholder="e.g. कविता कुँवर (Grade 8, Yellow House)"
                    value={ecaWinner3}
                    onChange={(e) => setEcaWinner3(e.target.value)}
                    className="erp-input"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddEcaEventModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-gray-600"
                >
                  रद्द (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-[#1e3a5f] font-black rounded-xl shadow-xs cursor-pointer"
                >
                  सुरक्षित गर्नुहोस् (Save Event)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ASSIGN TEACHER SUBSTITUTION / PROXY ─────────────────────── */}
      {isAddSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-base text-indigo-950 flex items-center gap-2">
                <Layers size={18} className="text-indigo-600" />
                <span>Assign Teacher Substitution (सट्टा शिक्षक कार्यविभाजन)</span>
              </h3>
              <button onClick={() => setIsAddSubModalOpen(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const matchedClass = classesData?.find((c: any) => String(c.id) === String(subClassId));
                const newSub = {
                  id: Date.now(),
                  dateBs: todayBS(),
                  absentTeacher: subAbsentTeacher,
                  classId: subClassId,
                  className: matchedClass ? `${matchedClass.name} ${matchedClass.section || ''}` : 'Class',
                  periodNo: subPeriodNo,
                  assignedTeacher: subAssignedTeacher,
                  subjectToTeach: subSubject,
                  status: 'CONFIRMED',
                };
                setSubstitutions((prev) => [newSub, ...prev]);
                toast.success('Teacher substitution assigned successfully!');
                setIsAddSubModalOpen(false);
                setSubAbsentTeacher('');
                setSubAssignedTeacher('');
                setSubSubject('');
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">कक्षा (Class) *</label>
                  <select
                    required
                    value={subClassId}
                    onChange={(e) => setSubClassId(e.target.value)}
                    className="erp-input font-bold"
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
                  <label className="block font-bold text-gray-700 mb-1">घण्टी (Period No.) *</label>
                  <select
                    value={subPeriodNo}
                    onChange={(e) => setSubPeriodNo(parseInt(e.target.value) || 1)}
                    className="erp-input font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                      <option key={p} value={p}>
                        घण्टी {p} (Period {p})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-rose-700 mb-1">अनुपस्थित शिक्षकको नाम (Absent Teacher) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. रामप्रसाद यादव"
                  value={subAbsentTeacher}
                  onChange={(e) => setSubAbsentTeacher(e.target.value)}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-emerald-800 mb-1">खटाइने सट्टा शिक्षक (Substitute Teacher) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. दिनेश पटेल"
                  value={subAssignedTeacher}
                  onChange={(e) => setSubAssignedTeacher(e.target.value)}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">सिकाउने विषय तथा निर्देशन (Subject & Task) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. गणित अभ्यास ५.२ कक्षाकार्य तथा रिभिजन"
                  value={subSubject}
                  onChange={(e) => setSubSubject(e.target.value)}
                  className="erp-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddSubModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-gray-600"
                >
                  रद्द (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  तोक्नुहोस् (Assign Proxy)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: BOOK LAB PRACTICAL SESSION ──────────────────────────────── */}
      {isBookLabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-base text-cyan-950 flex items-center gap-2">
                <Laptop size={18} className="text-cyan-700" />
                <span>Book Practical Lab Session (प्रयोगात्मक कक्षा दर्ता)</span>
              </h3>
              <button onClick={() => setIsBookLabModalOpen(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const matchedClass = classesData?.find((c: any) => String(c.id) === String(bookClassId));
                const newBooking = {
                  id: Date.now(),
                  dateBs: todayBS(),
                  classId: bookClassId,
                  className: matchedClass ? `${matchedClass.name} ${matchedClass.section || ''}` : 'Class',
                  labType: bookLabType,
                  periodNo: bookPeriodNo,
                  topic: bookTopic,
                  teacher: bookTeacher,
                };
                setLabPracticalBookings((prev) => [newBooking, ...prev]);
                toast.success('Practical Lab session booked successfully!');
                setIsBookLabModalOpen(false);
                setBookTopic('');
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">प्रयोगशाला प्रकार (Lab Type) *</label>
                  <select
                    value={bookLabType}
                    onChange={(e) => setBookLabType(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="SCIENCE">विज्ञान प्रयोगशाला (Science Lab)</option>
                    <option value="COMPUTER">कम्प्युटर ल्याब (Computer Lab)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">कक्षा (Target Class) *</label>
                  <select
                    required
                    value={bookClassId}
                    onChange={(e) => setBookClassId(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="">Select Class</option>
                    {classesData?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section ? `(${c.section})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">घण्टी (Period No.) *</label>
                  <select
                    value={bookPeriodNo}
                    onChange={(e) => setBookPeriodNo(parseInt(e.target.value) || 1)}
                    className="erp-input font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                      <option key={p} value={p}>
                        घण्टी {p} (Period {p})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">प्रयोग गराउने शिक्षक (Teacher)</label>
                  <input
                    type="text"
                    value={bookTeacher}
                    onChange={(e) => setBookTeacher(e.target.value)}
                    className="erp-input font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">प्रयोगात्मक शीर्षक तथा सामग्री (Practical Experiment / Topic) *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. अम्ल, क्षार र लवणको लिटमस परीक्षण तथा सुचकको प्रयोग..."
                  value={bookTopic}
                  onChange={(e) => setBookTopic(e.target.value)}
                  className="erp-input leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsBookLabModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-gray-600"
                >
                  रद्द (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-700 hover:bg-cyan-800 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  दर्ता गर्नुहोस् (Book Session)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: RECORD COMMITTEE MEETING MINUTE ─────────────────────────── */}
      {isAddMinuteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-950 flex items-center gap-2">
                <ClipboardList size={18} className="text-slate-700" />
                <span>Record Committee Minute (समिति बैठक निर्णय दर्ता)</span>
              </h3>
              <button onClick={() => setIsAddMinuteModalOpen(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const newMin = {
                  id: Date.now(),
                  dateBs: minuteDateBs,
                  committee: minuteCommittee,
                  title: minuteTitle,
                  attendees: minuteAttendees,
                  decisions: minuteDecisions,
                };
                setCommitteeMinutes((prev) => [newMin, ...prev]);
                toast.success('Committee meeting minute recorded successfully!');
                setIsAddMinuteModalOpen(false);
                setMinuteTitle('');
                setMinuteAttendees('');
                setMinuteDecisions('');
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">समिति (Committee) *</label>
                  <select
                    value={minuteCommittee}
                    onChange={(e) => setMinuteCommittee(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="दिवा खाजा तथा क्यान्टिन समिति">दिवा खाजा तथा क्यान्टिन समिति</option>
                    <option value="भौतिक पूर्वाधार तथा मर्मत समिति">भौतिक पूर्वाधार तथा मर्मत समिति</option>
                    <option value="अभिभावक-शिक्षक सम्बन्ध समिति (PTA)">अभिभावक-शिक्षक सम्बन्ध समिति (PTA)</option>
                    <option value="वार्षिकोत्सव तथा विशेष कार्यक्रम समिति">वार्षिकोत्सव तथा कार्यक्रम समिति</option>
                    <option value="अन्य विशेष समिति">अन्य विशेष समिति</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">बैठक मिति (Date BS) *</label>
                  <input
                    type="text"
                    required
                    value={minuteDateBs}
                    onChange={(e) => setMinuteDateBs(e.target.value)}
                    className="erp-input font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">बैठकको मुख्य विषय / एजेन्डा (Agenda / Title) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. दिवा खाजा गुणस्तर अनुगमन तथा सरसफाइ"
                  value={minuteTitle}
                  onChange={(e) => setMinuteTitle(e.target.value)}
                  className="erp-input font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">उपस्थित सदस्यहरू (Attendees) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. प्रधानाध्यापक, समिति संयोजक, अभिभावक प्रतिनिधि, शिक्षक"
                  value={minuteAttendees}
                  onChange={(e) => setMinuteAttendees(e.target.value)}
                  className="erp-input"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">प्रमुख निर्णयहरू (Key Decisions Made) *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="बैठकमा भएका सर्वसम्मत निर्णयहरू तथा कार्यदिशा..."
                  value={minuteDecisions}
                  onChange={(e) => setMinuteDecisions(e.target.value)}
                  className="erp-input leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddMinuteModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-gray-600"
                >
                  रद्द (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  निर्णय सुरक्षित गर्नुहोस् (Save Minute)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT TEACHER PROFILE MODAL ────────────────────────────────────── */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-base text-[#1e3a5f]">
                ✏️ Edit My Profile Details (शिक्षक विवरण सम्पादन)
              </h3>
              <button onClick={() => setIsEditProfileModalOpen(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateProfileMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name (पुरा नाम)</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number (फोन नं.)</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email (इमेल)</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Address (ठेगाना)</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 border rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">PAN Number (पान नं.)</label>
                  <input
                    type="text"
                    value={editPanNo}
                    onChange={(e) => setEditPanNo(e.target.value)}
                    className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditProfileModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="px-5 py-2 bg-[#1e3a5f] hover:bg-[#2a4f7c] text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50"
                >
                  {updateProfileMutation.isPending ? 'Updating...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TEACHER BANK ACCOUNT ADD / EDIT MODAL ─────────────────────────── */}
      {isTeacherBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <Landmark size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1e3a5f]">
                    {editingTeacherAccount ? 'बैंक खाता विवरण सम्पादन (Edit Bank Account)' : 'नयाँ बैंक खाता थप्नुहोस् (Add Bank Account)'}
                  </h3>
                  <p className="text-xs text-gray-500 font-nepali">
                    Personal & Official Salary Bank Accounts
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsTeacherBankModalOpen(false);
                  setEditingTeacherAccount(null);
                }}
                className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!teacherBankForm.bankName || !teacherBankForm.accountNumber) {
                  toast.error('बैंकको नाम र खाता नम्बर अनिवार्य छ।');
                  return;
                }
                if (editingTeacherAccount) {
                  updateTeacherBankMutation.mutate({
                    accountId: editingTeacherAccount.id,
                    data: teacherBankForm,
                  });
                } else {
                  addTeacherBankMutation.mutate(teacherBankForm);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  बैंकको नाम (Bank Name) *
                </label>
                <input
                  type="text"
                  required
                  list="teacher-portal-bank-list"
                  placeholder="उदा: Machhapuchchhre Bank Ltd. / Rastriya Banijya Bank"
                  value={teacherBankForm.bankName}
                  onChange={(e) => setTeacherBankForm({ ...teacherBankForm, bankName: e.target.value })}
                  className="erp-input font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    खाता नम्बर (Account Number) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="उदा: 12345678901234"
                    value={teacherBankForm.accountNumber}
                    onChange={(e) => setTeacherBankForm({ ...teacherBankForm, accountNumber: e.target.value })}
                    className="erp-input font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    शाखा (Branch)
                  </label>
                  <input
                    type="text"
                    list="teacher-portal-branch-list"
                    placeholder="उदा: Garuda / Gaur Branch"
                    value={teacherBankForm.branch}
                    onChange={(e) => setTeacherBankForm({ ...teacherBankForm, branch: e.target.value })}
                    className="erp-input"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  खाता प्रकार (Account Type) *
                </label>
                <select
                  value={teacherBankForm.accountType}
                  onChange={(e) => setTeacherBankForm({ ...teacherBankForm, accountType: e.target.value })}
                  className="erp-input font-bold text-[#1e3a5f]"
                >
                  <option value="SALARY">तलब खाता (Primary Salary Account)</option>
                  <option value="SAVINGS">व्यक्तिगत बचत खाता (Personal Savings)</option>
                  <option value="CIT">नागरिक लगानी कोष (CIT Account)</option>
                  <option value="EPF">कर्मचारी सञ्चय कोष (EPF Account)</option>
                  <option value="OTHER">अन्य खाता (Other)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  कैफियत (Remarks / Purpose)
                </label>
                <input
                  type="text"
                  placeholder="उदा: भत्ता तथा सरकारी तलबको लागि..."
                  value={teacherBankForm.remarks}
                  onChange={(e) => setTeacherBankForm({ ...teacherBankForm, remarks: e.target.value })}
                  className="erp-input"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <label className="flex items-center gap-2 font-bold text-emerald-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={teacherBankForm.isPrimary}
                    onChange={(e) => setTeacherBankForm({ ...teacherBankForm, isPrimary: e.target.checked })}
                    className="rounded text-emerald-600 w-4 h-4 cursor-pointer"
                  />
                  <span>यस खातालाई मेरो मुख्य तलब भुक्तानी खाता (Primary Salary Account) बनाउने</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsTeacherBankModalOpen(false);
                    setEditingTeacherAccount(null);
                  }}
                  className="px-4 py-2 border rounded-xl font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  रद्द (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={addTeacherBankMutation.isPending || updateTeacherBankMutation.isPending}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 size={15} />
                  <span>
                    {addTeacherBankMutation.isPending || updateTeacherBankMutation.isPending
                      ? 'सुरक्षित हुँदैछ...'
                      : editingTeacherAccount
                      ? 'परिवर्तन सुरक्षित गर्नुहोस्'
                      : 'बैंक खाता सुरक्षित गर्नुहोस्'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EXAM HALL STUDENT ATTENDANCE (परीक्षा हल विद्यार्थी हाजिरी) ─── */}
      {activeExamDutyForAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-5xl rounded-3xl bg-white shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#1e3a5f] via-[#2a5280] to-[#1e3a5f] text-white p-4 sm:p-5 flex items-start justify-between gap-3 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-[#1e3a5f] uppercase tracking-wider">
                    {activeExamDutyForAttendance.dutyRole === 'HALL_INCHARGE' ? '⭐ हल इन्चार्ज (Hall Incharge)' : '👤 निरीक्षक (Invigilator)'}
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-200 bg-white/10 px-2.5 py-0.5 rounded-md">
                    📅 मिति: {activeExamDutyForAttendance.examDateBs}
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-200 bg-white/10 px-2.5 py-0.5 rounded-md">
                    Shift: {activeExamDutyForAttendance.shift}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white flex items-center gap-2 mt-1">
                  <CalendarCheck size={20} className="text-amber-400" />
                  <span>परीक्षा हल विद्यार्थी हाजिरी (Exam Hall Attendance)</span>
                </h3>
                <p className="text-xs text-blue-200">
                  <b>{activeExamDutyForAttendance.exam?.name || 'Exam'}</b> &bull; हल/कोठा: <b>{activeExamDutyForAttendance.room?.name || `Room ${activeExamDutyForAttendance.roomId}`}</b>
                  {activeExamDutyForAttendance.room?.roomNo && ` (${activeExamDutyForAttendance.room.roomNo})`}
                  {activeExamDutyForAttendance.room?.building && ` - ${activeExamDutyForAttendance.room.building}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const printWin = window.open('', '_blank');
                    if (!printWin) return;

                    const pCount = activeHallStudents.filter((s: any) => (examHallAttendanceRoster[s.studentId]?.status || s.status || 'PRESENT') === 'PRESENT').length;
                    const aCount = activeHallStudents.filter((s: any) => (examHallAttendanceRoster[s.studentId]?.status || s.status) === 'ABSENT').length;
                    const lCount = activeHallStudents.filter((s: any) => (examHallAttendanceRoster[s.studentId]?.status || s.status) === 'LATE').length;

                    printWin.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>Exam Hall Attendance & Signature Roster - ${activeExamDutyForAttendance.room?.name || 'Room'}</title>
                          <style>
                            @page { size: A4 portrait; margin: 8mm 10mm; }
                            body { font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 10px; margin: 0; padding: 0; color: #111; line-height: 1.25; }
                            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 5px; margin-bottom: 8px; }
                            .school-name { font-size: 15px; font-weight: 800; color: #1e3a5f; text-transform: uppercase; }
                            .sub-header { font-size: 11px; font-weight: 600; color: #444; margin-top: 1px; }
                            .doc-title { font-size: 12.5px; font-weight: 800; color: #991b1b; margin-top: 4px; text-decoration: underline; }
                            .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 4px; margin-bottom: 8px; font-size: 10px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 10px; font-size: 9.5px; }
                            th, td { border: 1px solid #475569; padding: 4px 5px; text-align: left; vertical-align: middle; }
                            th { background: #f1f5f9; font-weight: 800; color: #0f172a; text-transform: uppercase; font-size: 9px; }
                            .text-center { text-align: center; }
                            .font-mono { font-family: monospace; }
                            .badge-present { color: #047857; font-weight: bold; }
                            .badge-absent { color: #b91c1c; font-weight: bold; background: #fee2e2; }
                            .sign-cell { height: 26px; border: 1px solid #64748b; background: #fafafa; }
                            .summary-box { display: flex; justify-content: space-between; margin-top: 8px; padding: 5px 10px; background: #f8fafc; border: 1px solid #cbd5e1; font-weight: bold; font-size: 10px; border-radius: 4px; }
                            .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 30px; padding-top: 10px; font-size: 10px; }
                            .sig-line { border-top: 1px dashed #475569; text-align: center; font-size: 10px; padding-top: 4px; }
                          </style>
                        </head>
                        <body>
                          <div class="header">
                            <div class="school-name">श्री नेपाल राष्ट्रिय माध्यमिक विद्यालय</div>
                            <div class="sub-header">गरुडा-४, रौतहट, मधेस प्रदेश, नेपाल</div>
                            <div class="doc-title">परीक्षा हल विद्यार्थी हाजिरी तथा हस्ताक्षर फाराम (EXAM HALL ATTENDANCE & SIGNATURE ROSTER)</div>
                          </div>

                          <div class="meta-grid">
                            <div><b>परीक्षा:</b> ${activeExamDutyForAttendance.exam?.name || 'Examination'}</div>
                            <div><b>मिति:</b> ${activeExamDutyForAttendance.examDateBs}</div>
                            <div><b>शिफ्ट:</b> ${activeExamDutyForAttendance.shift}</div>
                            <div><b>हल/कोठा:</b> ${activeExamDutyForAttendance.room?.name || 'Room'} (${activeExamDutyForAttendance.room?.roomNo || '—'})</div>
                            <div style="grid-column: span 2;"><b>हल इन्चार्ज / निरीक्षक:</b> ${displayName} (${activeExamDutyForAttendance.dutyRole === 'HALL_INCHARGE' ? 'हल इन्चार्ज' : 'निरीक्षक'})</div>
                            <div style="grid-column: span 2;"><b>भवन / ब्लक:</b> ${activeExamDutyForAttendance.room?.building || 'मुख्य भवन'}</div>
                          </div>

                          <table>
                            <thead>
                              <tr>
                                <th style="width: 24px;" class="text-center">क्र.सं.</th>
                                <th style="width: 40px;" class="text-center">रोल नं</th>
                                <th style="width: 75px;" class="text-center">सिम्बोल / EMIS</th>
                                <th>विद्यार्थीको नाम (Student Name)</th>
                                <th style="width: 55px;">कक्षा</th>
                                <th style="width: 55px;" class="text-center">सिट/बेन्च</th>
                                <th style="width: 100px;">आजको विषय (Today)</th>
                                <th style="width: 105px;">भोलिको विषय (Tomorrow)</th>
                                <th style="width: 65px;">उत्तरपुस्तिका नं</th>
                                <th style="width: 95px;" class="text-center">विद्यार्थीको हस्ताक्षर (Sign)</th>
                                <th style="width: 40px;" class="text-center">हाजिरी</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${activeHallStudents.map((s: any, idx: number) => {
                                const local = examHallAttendanceRoster[s.studentId] || { status: s.status || 'PRESENT', bookletNo: s.bookletNo || '', remarks: '' };
                                const emisOrSym = s.symbolNo || s.emisId || s.studentCode || '—';
                                const todaySub = s.todaySubjectName || s.subjectName || '—';
                                const tomorrowSub = s.tomorrowSubjectName || '—';

                                return `
                                  <tr>
                                    <td class="text-center font-mono font-bold">${idx + 1}</td>
                                    <td class="text-center font-mono font-bold">${s.rollNo || '—'}</td>
                                    <td class="text-center font-mono">${emisOrSym}</td>
                                    <td><strong>${s.fullName || s.studentName}</strong></td>
                                    <td>${s.className} ${s.section ? `(${s.section})` : ''}</td>
                                    <td class="text-center font-mono">${s.seatLabel || s.benchNumber || '—'}</td>
                                    <td><strong>${todaySub}</strong></td>
                                    <td style="color: #1e3a5f; font-weight: 600;">${tomorrowSub}</td>
                                    <td class="font-mono"></td>
                                    <td class="sign-cell"></td>
                                    <td class="text-center font-mono"></td>
                                  </tr>
                                `;
                              }).join('')}
                            </tbody>
                          </table>

                          <div class="summary-box">
                            <div>कुल सिट संख्या: <b>${activeHallStudents.length}</b></div>
                            <div>उपस्थित (Present): <b>_______</b></div>
                            <div>अनुपस्थित (Absent): <b>_______</b></div>
                            <div>निष्काशित (Expelled): <b>_______</b></div>
                          </div>

                          <div class="signatures">
                            <div class="sig-line">
                              <b>${displayName}</b><br/>
                              ${activeExamDutyForAttendance.dutyRole === 'HALL_INCHARGE' ? 'हल इन्चार्जको हस्ताक्षर' : 'निरीक्षकको हस्ताक्षर'}
                            </div>
                            <div class="sig-line">
                              <b>........................................</b><br/>
                              सिट योजना / परीक्षा समिति
                            </div>
                            <div class="sig-line">
                              <b>........................................</b><br/>
                              केन्द्राध्यक्ष / प्रधानाध्यापक
                            </div>
                          </div>

                          <script>
                            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
                          </script>
                        </body>
                      </html>
                    `);
                    printWin.document.close();
                  }}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>हाजिरी सिट प्रिन्ट (Print Roster)</span>
                </button>
                <button
                  onClick={() => setActiveExamDutyForAttendance(null)}
                  className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Quick Metrics & Controls Bar */}
            <div className="p-3.5 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-3 py-1 rounded-xl bg-white border border-gray-200 font-bold text-gray-700 shadow-2xs">
                  कुल विद्यार्थी: <b className="text-gray-950">{activeHallStudents.length}</b>
                </span>
                <span className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 font-bold text-emerald-800 shadow-2xs">
                  उपस्थित: <b className="text-emerald-950">
                    {activeHallStudents.filter((s: any) => (examHallAttendanceRoster[s.studentId]?.status || s.status || 'PRESENT') === 'PRESENT').length}
                  </b>
                </span>
                <span className="px-3 py-1 rounded-xl bg-rose-50 border border-rose-200 font-bold text-rose-800 shadow-2xs">
                  अनुपस्थित: <b className="text-rose-950">
                    {activeHallStudents.filter((s: any) => (examHallAttendanceRoster[s.studentId]?.status || s.status) === 'ABSENT').length}
                  </b>
                </span>
              </div>

              <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
                <div className="relative w-full sm:w-56">
                  <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search name, roll, EMIS..."
                    value={hallRosterSearch}
                    onChange={(e) => setHallRosterSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border rounded-xl text-xs font-medium bg-white focus:ring-1 focus:ring-[#1e3a5f]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newMap: Record<number, { status: string; bookletNo: string; remarks: string }> = {};
                    activeHallStudents.forEach((s: any) => {
                      const prev = examHallAttendanceRoster[s.studentId] || { bookletNo: '', remarks: '' };
                      newMap[s.studentId] = {
                        status: 'PRESENT',
                        bookletNo: prev.bookletNo || '',
                        remarks: prev.remarks || '',
                      };
                    });
                    setExamHallAttendanceRoster(newMap);
                    toast.success('सबै विद्यार्थीलाई उपस्थित (PRESENT) चिन्ह लगाइयो');
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <CheckCircle2 size={14} />
                  <span>सबै उपस्थित (Mark All Present)</span>
                </button>
              </div>
            </div>

            {/* Modal Body: Interactive Student Roster Table */}
            <div className="overflow-y-auto flex-1 p-4">
              {isActiveHallRosterLoading ? (
                <div className="py-16 text-center text-xs text-gray-400">
                  विद्यार्थी सिट प्लान लोड हुँदैछ...
                </div>
              ) : activeHallStudents.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                  <School className="mx-auto text-gray-300 mb-2" size={40} />
                  <p className="text-sm font-bold text-gray-700">यस परीक्षा हलमा कुनै विद्यार्थी सिट प्लान गरिएको छैन</p>
                  <p className="text-xs text-gray-400 mt-1">
                    परीक्षा शाखाले सिट योजना (Seat Plan) निर्माण गरेपछि विद्यार्थीहरू यहाँ देखा पर्नेछन्।
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-gray-800 border-b border-gray-200 font-bold text-[11px]">
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-2 w-14 text-center">रोल नं</th>
                        <th className="py-2.5 px-2.5 w-24 text-center">EMIS / सिम्बोल</th>
                        <th className="py-2.5 px-3">विद्यार्थीको नाम (Student Name)</th>
                        <th className="py-2.5 px-2 w-20">कक्षा</th>
                        <th className="py-2.5 px-2 w-24 text-center">बेन्च / सिट</th>
                        <th className="py-2.5 px-3 w-36">आजको विषय (Today)</th>
                        <th className="py-2.5 px-3 w-36">भोलिको विषय (Tomorrow)</th>
                        <th className="py-2.5 px-3 w-40 text-center">हाजिरी स्थिति</th>
                        <th className="py-2.5 px-2 w-28">उत्तरपुस्तिका नं</th>
                        <th className="py-2.5 px-2 w-16 text-center">हस्ताक्षर</th>
                        <th className="py-2.5 px-3 w-32">कैफियत</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activeHallStudents
                        .filter((s: any) => {
                          if (!hallRosterSearch) return true;
                          const q = hallRosterSearch.toLowerCase();
                          return (
                            (s.fullName || s.studentName || '').toLowerCase().includes(q) ||
                            String(s.rollNo || '').includes(q) ||
                            String(s.symbolNo || '').toLowerCase().includes(q) ||
                            String(s.emisId || s.studentCode || '').toLowerCase().includes(q) ||
                            (s.className || '').toLowerCase().includes(q)
                          );
                        })
                        .map((s: any, idx: number) => {
                          const currentRec = examHallAttendanceRoster[s.studentId] || {
                            status: s.status || 'PRESENT',
                            bookletNo: s.bookletNo || '',
                            remarks: s.remarks || '',
                          };
                          const isAbsent = currentRec.status === 'ABSENT';
                          const emisOrSym = s.symbolNo || s.emisId || s.studentCode || '—';
                          const todaySub = s.todaySubjectName || s.subjectName || '—';
                          const tomorrowSub = s.tomorrowSubjectName || '—';
                          const isSignVerified = !isAbsent && currentRec.remarks?.includes('[SIGN_OK]');

                          return (
                            <tr
                              key={s.studentId}
                              className={`transition ${
                                isAbsent ? 'bg-rose-50/60' : 'hover:bg-slate-50/60'
                              }`}
                            >
                              <td className="py-2 px-3 text-center text-gray-400 font-mono">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-2 text-center font-mono font-bold text-gray-700">
                                {s.rollNo || '—'}
                              </td>
                              <td className="py-2 px-2.5 text-center font-mono font-bold text-blue-900 text-[10.5px]">
                                {emisOrSym}
                              </td>
                              <td className="py-2 px-3 font-extrabold text-gray-900">
                                <div>{s.fullName || s.studentName}</div>
                                {s.fullNameNepali && (
                                  <div className="text-[10px] text-gray-400 font-normal">{s.fullNameNepali}</div>
                                )}
                              </td>
                              <td className="py-2 px-2 text-gray-700 font-medium">
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 font-bold text-[10.5px]">
                                  {s.className} {s.section ? `(${s.section})` : ''}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-center">
                                <span className="px-1.5 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-800 text-[10.5px]">
                                  {s.seatLabel || s.benchNumber || `B-${s.benchNo}`}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-bold text-purple-900 text-[11px]">
                                  {todaySub}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-semibold text-[#1e3a5f] text-[11px]">
                                  {tomorrowSub}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExamHallAttendanceRoster((prev) => ({
                                        ...prev,
                                        [s.studentId]: {
                                          ...currentRec,
                                          status: 'PRESENT',
                                        },
                                      }));
                                    }}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                                      currentRec.status === 'PRESENT'
                                        ? 'bg-emerald-600 text-white shadow-2xs ring-1 ring-emerald-600'
                                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                    }`}
                                  >
                                    उपस्थित
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExamHallAttendanceRoster((prev) => ({
                                        ...prev,
                                        [s.studentId]: {
                                          ...currentRec,
                                          status: 'ABSENT',
                                        },
                                      }));
                                    }}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                                      currentRec.status === 'ABSENT'
                                        ? 'bg-rose-600 text-white shadow-2xs ring-1 ring-rose-600'
                                        : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                                    }`}
                                  >
                                    अनुपस्थित
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExamHallAttendanceRoster((prev) => ({
                                        ...prev,
                                        [s.studentId]: {
                                          ...currentRec,
                                          status: 'LATE',
                                        },
                                      }));
                                    }}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                                      currentRec.status === 'LATE'
                                        ? 'bg-amber-500 text-white shadow-2xs ring-1 ring-amber-500'
                                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                                    }`}
                                  >
                                    ढिलो
                                  </button>
                                </div>
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  disabled={isAbsent}
                                  placeholder={isAbsent ? 'Absent' : 'Booklet...'}
                                  value={currentRec.bookletNo || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setExamHallAttendanceRoster((prev) => ({
                                      ...prev,
                                      [s.studentId]: {
                                        ...currentRec,
                                        bookletNo: val,
                                      },
                                    }));
                                  }}
                                  className="w-full px-2 py-1 border border-gray-200 rounded-lg text-[11px] font-mono font-semibold focus:ring-1 focus:ring-[#1e3a5f] disabled:bg-gray-100"
                                />
                              </td>
                              <td className="py-2 px-2 text-center">
                                <input
                                  type="checkbox"
                                  disabled={isAbsent}
                                  checked={isSignVerified}
                                  onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    let newRem = (currentRec.remarks || '').replace('[SIGN_OK]', '').trim();
                                    if (isChecked) {
                                      newRem = newRem ? `${newRem} [SIGN_OK]` : '[SIGN_OK]';
                                    }
                                    setExamHallAttendanceRoster((prev) => ({
                                      ...prev,
                                      [s.studentId]: {
                                        ...currentRec,
                                        remarks: newRem,
                                      },
                                    }));
                                  }}
                                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                                  title="हस्ताक्षर लिइयो / प्रमाणित गरियो (Signature Captured)"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  placeholder="कैफियत..."
                                  value={(currentRec.remarks || '').replace('[SIGN_OK]', '').trim()}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const hasSign = (currentRec.remarks || '').includes('[SIGN_OK]');
                                    setExamHallAttendanceRoster((prev) => ({
                                      ...prev,
                                      [s.studentId]: {
                                        ...currentRec,
                                        remarks: hasSign ? `${val} [SIGN_OK]`.trim() : val,
                                      },
                                    }));
                                  }}
                                  className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-[#1e3a5f]"
                                />
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <p className="text-[11px] text-gray-500 text-center sm:text-left">
                💡 <b>सूचना:</b> अनुपस्थित (ABSENT) चिन्ह लगाइएका विद्यार्थीहरूको परीक्षा रेकर्डमा स्वतः अनुपस्थित अभिलेख हुनेछ।
              </p>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setActiveExamDutyForAttendance(null)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-white text-xs cursor-pointer"
                >
                  बन्द गर्नुहोस् (Close)
                </button>
                <button
                  type="button"
                  disabled={saveHallAttendanceMutation.isPending || activeHallStudents.length === 0}
                  onClick={() => saveHallAttendanceMutation.mutate()}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={15} />
                  <span>
                    {saveHallAttendanceMutation.isPending
                      ? 'सुरक्षित हुँदैछ...'
                      : 'हाजिरी सुरक्षित तथा सिङ्क गर्नुहोस् (Save & Sync)'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Central Bank Directory Datalists (Auto-Fetch Suggestions) */}
      <datalist id="teacher-portal-bank-list">
        {allKnownBanks.map((b: string) => (
          <option key={b} value={b} />
        ))}
      </datalist>
      <datalist id="teacher-portal-branch-list">
        {allKnownBranches.map((br: string) => (
          <option key={br} value={br} />
        ))}
      </datalist>
    </div>
  );
}
