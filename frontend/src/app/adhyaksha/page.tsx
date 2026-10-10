'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { todayBS, todayBSFormatted } from '@/lib/nepali-date';
import {
  School,
  Globe,
  ExternalLink,
  Calendar,
  Bell,
  Wrench,
  UserCheck,
  MessageSquare,
  Users,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  X,
  LogOut,
  Sparkles,
  Phone,
  ShieldCheck,
  Printer,
  ChevronRight,
  Eye,
  RefreshCw,
  Building,
  ClipboardList,
  AlertCircle,
  HelpCircle,
  FolderPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AcademicCalendar from '@/components/dashboard/AcademicCalendar';

interface SMCCommitteeMember {
  id: number;
  name: string;
  nameNepali?: string;
  post: string;
  representation: string;
  phone: string;
  tenure: string;
  isChair?: boolean;
}

export default function AdhyakshaPortalPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'events' | 'notices' | 'maintenance' | 'absentees' | 'grievances' | 'committee'
  >('overview');

  // Modals state
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);

  // Form states
  const [meetingData, setMeetingData] = useState({
    meetingTitle: 'विद्यालय व्यवस्थापन तथा शैक्षिक गुणस्तर अभिवृद्धि सम्बन्धी बैठक',
    meetingDateBs: todayBS(),
    meetingTime: 'अपराह्न १:०० बजे',
    venue: 'विद्यालय सभाहल / बैठक कक्ष',
    agenda: '१. शैक्षिक प्रगति तथा पठनपाठन समीक्षा\n२. विद्यालय भौतिक मर्मत सम्भार\n३. विद्यार्थी नियमितता तथा अभिभावक अन्तरक्रिया',
    targetAudience: 'ALL_STAFF',
  });

  const [noticeData, setNoticeData] = useState({
    title: '',
    body: '',
    type: 'ADMIN_DIRECTIVE',
    targetRole: 'TEACHER',
    postedDateBs: todayBS(),
  });

  const [memberForm, setMemberForm] = useState<Partial<SMCCommitteeMember>>({
    name: '',
    nameNepali: '',
    post: 'सदस्य (Member)',
    representation: 'अभिभावक प्रतिनिधि (Parent Rep)',
    phone: '',
    tenure: '2081-2084 BS',
    isChair: false,
  });

  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [issueStatus, setIssueStatus] = useState('IN_PROGRESS');
  const [chairpersonRemark, setChairpersonRemark] = useState('');

  // Absentee Filter States
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [absentSearchQuery, setAbsentSearchQuery] = useState<string>('');
  const [absentDateFilter, setAbsentDateFilter] = useState<string>('');

  // ── Queries ──
  // 1. School Management Committee Members
  const { data: committeeData, isLoading: isCommitteeLoading } = useQuery({
    queryKey: ['smc-committee'],
    queryFn: async () => {
      const res = await api.get('/school/management-committee');
      return res.data?.data || [];
    },
  });

  // 2. Weekly Absentee List (Privacy-Safe: Class, Roll, Name, Date)
  const { data: absentsData, isLoading: isAbsentsLoading } = useQuery({
    queryKey: ['weekly-absents', selectedClassId],
    queryFn: async () => {
      const params: any = {};
      if (selectedClassId && selectedClassId !== 'ALL') {
        params.classId = selectedClassId;
      }
      const res = await api.get('/attendance/weekly-absents', { params });
      return res.data?.data || [];
    },
  });

  // 3. Classes for filter
  const { data: classesData } = useQuery({
    queryKey: ['classes-list'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // 4. Notices & Directives
  const { data: noticesData, isLoading: isNoticesLoading } = useQuery({
    queryKey: ['notices-adhyaksha'],
    queryFn: async () => {
      const res = await api.get('/notices');
      return res.data?.data || [];
    },
  });

  // 5. Events & Calendar
  const { data: eventsData, isLoading: isEventsLoading } = useQuery({
    queryKey: ['events-adhyaksha'],
    queryFn: async () => {
      const res = await api.get('/events');
      return res.data?.data || [];
    },
  });

  // ── Mutations ──
  // 1. Call Meeting Mutation
  const callMeetingMutation = useMutation({
    mutationFn: async (payload: typeof meetingData) => {
      const res = await api.post('/school/meeting-call', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'बैठकको सूचना सम्पूर्ण शिक्षक तथा कर्मचारीहरूलाई पठाइयो!');
      setIsMeetingModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['notices-adhyaksha'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'बैठक आह्वान गर्न सकिएन।');
    },
  });

  // 2. Publish Notice Mutation
  const publishNoticeMutation = useMutation({
    mutationFn: async (payload: typeof noticeData) => {
      const res = await api.post('/notices', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('सूचना तथा निर्देशन सफलतापूर्वक सम्प्रेषण गरियो!');
      setIsNoticeModalOpen(false);
      setNoticeData({
        title: '',
        body: '',
        type: 'ADMIN_DIRECTIVE',
        targetRole: 'TEACHER',
        postedDateBs: todayBS(),
      });
      queryClient.invalidateQueries({ queryKey: ['notices-adhyaksha'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'सूचना जारी गर्न सकिएन।');
    },
  });

  // 3. Save Committee Members Mutation
  const updateCommitteeMutation = useMutation({
    mutationFn: async (updatedList: SMCCommitteeMember[]) => {
      const res = await api.post('/school/management-committee', { members: updatedList });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'व्यवस्थापन समिति विवरण अद्यावधिक भयो!');
      setIsMemberModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['smc-committee'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'समिति अद्यावधिक हुन सकेन।');
    },
  });

  // Handlers
  const handleAddOrEditMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.name?.trim()) {
      toast.error('कृपया सदस्यको नाम प्रविष्ट गर्नुहोस्।');
      return;
    }
    const currentList: SMCCommitteeMember[] = committeeData ? [...committeeData] : [];
    if (memberForm.id) {
      const idx = currentList.findIndex((m) => m.id === memberForm.id);
      if (idx !== -1) {
        currentList[idx] = memberForm as SMCCommitteeMember;
      }
    } else {
      const newMember: SMCCommitteeMember = {
        id: Date.now(),
        name: memberForm.name || '',
        nameNepali: memberForm.nameNepali || memberForm.name || '',
        post: memberForm.post || 'सदस्य (Member)',
        representation: memberForm.representation || 'अभिभावक प्रतिनिधि',
        phone: memberForm.phone || '',
        tenure: memberForm.tenure || '2081-2084 BS',
        isChair: memberForm.isChair || false,
      };
      currentList.push(newMember);
    }
    updateCommitteeMutation.mutate(currentList);
  };

  const handleDeleteMember = (id: number) => {
    if (confirm('के तपाईं यस सदस्यको विवरण हटाउन निश्चित हुनुहुन्छ?')) {
      const currentList: SMCCommitteeMember[] = committeeData ? committeeData.filter((m: any) => m.id !== id) : [];
      updateCommitteeMutation.mutate(currentList);
    }
  };

  // Filtered Absentees
  const filteredAbsents = useMemo(() => {
    if (!absentsData) return [];
    return absentsData.filter((item: any) => {
      const matchesSearch =
        !absentSearchQuery ||
        item.studentName?.toLowerCase().includes(absentSearchQuery.toLowerCase()) ||
        item.studentNameNepali?.includes(absentSearchQuery) ||
        item.className?.toLowerCase().includes(absentSearchQuery.toLowerCase()) ||
        String(item.rollNo).includes(absentSearchQuery);

      const matchesDate = !absentDateFilter || item.dateBs === absentDateFilter;
      return matchesSearch && matchesDate;
    });
  }, [absentsData, absentSearchQuery, absentDateFilter]);

  // Maintenance Issues (Extracted from notices of type TEACHER_REPORT, MAINTENANCE or GENERAL reports)
  const maintenanceIssues = useMemo(() => {
    if (!noticesData) return [];
    return noticesData.filter((n: any) =>
      ['TEACHER_REPORT', 'MAINTENANCE', 'COMPLAINT', 'URGENT'].includes(n.type) ||
      n.title?.toLowerCase().includes('मर्मत') ||
      n.title?.toLowerCase().includes('समस्या') ||
      n.title?.toLowerCase().includes('maintenance') ||
      n.title?.toLowerCase().includes('repair')
    );
  }, [noticesData]);

  // Grievances / Complaints
  const grievancesList = useMemo(() => {
    if (!noticesData) return [];
    return noticesData.filter((n: any) =>
      ['COMPLAINT', 'GRIEVANCE', 'SUGGESTION'].includes(n.type) ||
      n.title?.toLowerCase().includes('गुनासो') ||
      n.title?.toLowerCase().includes('सुझाव')
    );
  }, [noticesData]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 font-sans pb-10">
      {/* ─── 1. TOP EXECUTIVE BANNER & SCHOOL HEADER ───────────────────────────── */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[#1e3a5f] via-[#244874] to-[#1e3a5f] text-white shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-white/10 p-1 backdrop-blur-xs border border-white/20 flex items-center justify-center shrink-0">
              <School className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 text-[#1e3a5f] px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider">
                  <ShieldCheck size={10} />
                  <span>SMC Portal</span>
                </span>
                <span className="text-[10px] text-blue-200 hidden sm:inline font-medium">
                  वि.व्य.स. अध्यक्ष कार्यकक्ष
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-black tracking-wide text-white font-serif leading-tight">
                नेपाल माध्यमिक विद्यालय, विश्रामपुर
              </h1>
            </div>
          </div>

          {/* Right Action Center */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Live BS Date Badge */}
            <div className="bg-white/10 border border-white/15 px-2 py-1 rounded-lg text-right hidden sm:block">
              <span className="text-[9px] text-blue-200 block font-medium leading-none">आजको मिति</span>
              <span className="text-[11px] font-black text-amber-300 font-mono tracking-wide leading-tight">
                {todayBSFormatted()}
              </span>
            </div>

            {/* School Public Website Button */}
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white px-2 sm:px-2.5 py-1 text-[11px] font-bold transition border border-blue-400/30 shadow-2xs"
            >
              <Globe size={12} className="text-blue-200" />
              <span>वेबसाइट</span>
              <ExternalLink size={10} className="opacity-70" />
            </a>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-rose-600 text-white px-2 sm:px-2.5 py-1 text-[11px] font-bold transition border border-white/15"
              title="Logout"
            >
              <LogOut size={12} />
              <span className="hidden sm:inline">लगआउट</span>
            </button>
          </div>
        </div>

        {/* ─── TAB NAVIGATION BAR ────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-3 sm:px-5 border-t border-white/10">
          <nav className="flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-none text-[11px] sm:text-xs">
            {[
              { key: 'overview', label: 'कार्यकारी सारांश', sub: 'Overview', icon: ClipboardList },
              { key: 'events', label: 'शैक्षिक क्यालेन्डर', sub: 'Calendar', icon: Calendar },
              { key: 'notices', label: 'सूचना तथा निर्देशन', sub: 'Notices', icon: Bell },
              { key: 'maintenance', label: 'मर्मत तथा समस्याहरू', sub: 'Issues', icon: Wrench },
              { key: 'absentees', label: 'अनुपस्थित लगत', sub: 'Absentees', icon: UserCheck },
              { key: 'grievances', label: 'सुझाव तथा गुनासो', sub: 'Grievances', icon: MessageSquare },
              { key: 'committee', label: 'व्यवस्थापन समिति', sub: 'SMC', icon: Users },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition shrink-0 ${
                    isActive
                      ? 'bg-amber-400 text-[#1e3a5f] shadow-2xs font-black'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ─── MAIN CONTENT CONTAINER ───────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-3 sm:px-5 pt-3 sm:pt-4 space-y-3 sm:space-y-4">
        {/* ─── TOP ACTION BANNER ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs sm:text-sm font-black text-[#1e3a5f] font-serif">
                SMC Chairperson Portal
              </h2>
              <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-black">
              Active
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 leading-tight">
              Welcome
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setIsMeetingModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#1e3a5f] to-[#2b5282] hover:from-[#162a45] hover:to-[#224269] text-white px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold shadow-2xs transition"
            >
              <Send size={12} className="text-amber-400" />
              <span>Meeting Call</span>
            </button>

            <button
              onClick={() => setIsNoticeModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-black shadow-2xs transition"
            >
              <Plus size={13} />
              <span>सूचना / निर्देशन</span>
            </button>
          </div>
        </div>

        {/* ─── TAB 1: EXECUTIVE OVERVIEW ───────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-3 sm:space-y-4">
            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="bg-white rounded-xl border border-slate-200/80 p-2.5 sm:p-3 shadow-2xs space-y-0.5">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider">व्यवस्थापन समिति</span>
                  <Users size={14} className="text-blue-600" />
                </div>
                <div className="text-lg sm:text-xl font-black text-[#1e3a5f] font-mono">
                  {committeeData?.length || 6} <span className="text-[10px] font-normal text-slate-400">सदस्य</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200/80 p-2.5 sm:p-3 shadow-2xs space-y-0.5">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider">साप्ताहिक अनुपस्थित</span>
                  <UserCheck size={14} className="text-rose-600" />
                </div>
                <div className="text-lg sm:text-xl font-black text-rose-600 font-mono">
                  {absentsData?.length || 0} <span className="text-[10px] font-normal text-slate-400">विद्यार्थी अनुपस्थित</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200/80 p-2.5 sm:p-3 shadow-2xs space-y-0.5">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider">मर्मत सम्भार</span>
                  <Wrench size={14} className="text-amber-600" />
                </div>
                <div className="text-lg sm:text-xl font-black text-amber-600 font-mono">
                  {maintenanceIssues.length} <span className="text-[10px] font-normal text-slate-400">अनुरोध</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200/80 p-2.5 sm:p-3 shadow-2xs space-y-0.5">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider">सूचना तथा निर्देशन</span>
                  <Bell size={14} className="text-emerald-600" />
                </div>
                <div className="text-lg sm:text-xl font-black text-emerald-700 font-mono">
                  {noticesData?.length || 0} <span className="text-[10px] font-normal text-slate-400">जारी</span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Notices Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Left 2 Cols: Recent Notices & Meeting Directives */}
              <div className="lg:col-span-2 space-y-3">
                <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Bell size={14} className="text-blue-600" />
                      <h3 className="text-xs font-black text-[#1e3a5f]">
                       Recent Notices
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('notices')}
                      className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      <span>हेर्नुहोस्</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>

                  {isNoticesLoading ? (
                    <div className="py-4 text-center text-slate-400 text-[11px]">
                      <RefreshCw size={16} className="animate-spin mx-auto mb-1 opacity-50" />
                      सूचनाहरू लोड हुँदैछ...
                    </div>
                  ) : noticesData?.length === 0 ? (
                    <div className="py-4 text-center text-slate-400 text-[11px]">
                      हाल कुनै सूचना सम्प्रेषित गरिएको छैन।
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {noticesData.slice(0, 4).map((notice: any) => (
                        <div
                          key={notice.id}
                          className="rounded-lg border border-slate-100 bg-slate-50/70 p-2 sm:p-2.5 hover:bg-slate-50 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-[11px] sm:text-xs font-bold text-slate-800">
                              {notice.title}
                            </h4>
                            <span className="text-[9px] font-mono font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded shrink-0">
                              {notice.postedDateBs || notice.postedDateAd?.slice(0, 10)}
                            </span>
                          </div>
                          <p className="text-[10px] sm:text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-tight">
                            {notice.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Maintenance Quick Peek */}
                <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Wrench size={14} className="text-amber-600" />
                      <h3 className="text-xs font-black text-[#1e3a5f]">
                        विद्यालय मर्मत सम्भार तथा समस्याहरू
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('maintenance')}
                      className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      <span>हेर्नुहोस्</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>

                  {maintenanceIssues.length === 0 ? (
                    <div className="py-3 text-center text-slate-400 text-[11px]">
                      हाल कुनै मर्मत सम्बन्धी समस्या दर्ता भएको छैन।
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {maintenanceIssues.slice(0, 3).map((issue: any) => (
                        <div
                          key={issue.id}
                          className="p-2 sm:p-2.5 rounded-lg border border-amber-100 bg-amber-50/40 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] sm:text-xs font-bold text-slate-800 truncate">{issue.title}</div>
                            <div className="text-[10px] text-slate-500 truncate">{issue.body}</div>
                          </div>
                          <span className="shrink-0 text-[9px] font-bold bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded-full">
                            समीक्षा बाँकी
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right 1 Col: Committee Snapshot & Public Website Preview */}
              <div className="space-y-3">
                {/* Committee Directory Snapshot */}
                <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-3.5 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-indigo-600" />
                      <h3 className="text-xs font-black text-[#1e3a5f]">
                        व्यवस्थापन समिति (SMC)
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('committee')}
                      className="text-[10px] font-bold text-indigo-600 hover:underline"
                    >
                      व्यवस्थापन
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {committeeData?.slice(0, 4).map((member: SMCCommitteeMember) => (
                      <div
                        key={member.id}
                        className="p-1.5 sm:p-2 rounded-lg border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                            <span>{member.nameNepali || member.name}</span>
                            {member.isChair && (
                              <span className="text-[8px] bg-amber-400 text-[#1e3a5f] font-black px-1 py-0.2 rounded">
                                अध्यक्ष
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] text-slate-500">{member.post} • {member.representation}</div>
                        </div>
                        {member.phone && (
                          <span className="text-[9px] font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border">
                            {member.phone}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* School Website Card */}
                <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2e5987] rounded-xl sm:rounded-2xl p-3 sm:p-3.5 text-white shadow-2xs space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Globe size={14} className="text-amber-400" />
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                      विद्यालय पोर्टल
                    </h3>
                  </div>
                  <p className="text-[10px] text-blue-100 leading-tight">
                    विद्यालयको सूचना, नतिजा, तथा गतिविधिहरू सार्वजनिक वेबसाइटबाट हेर्न सकिन्छ।
                  </p>
                  <div>
                    <a
                      href="/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] text-[11px] font-black shadow-2xs transition"
                    >
                      <span>!Visit Us!</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: EVENTS & ACADEMIC CALENDAR ───────────────────────────────── */}
        {activeTab === 'events' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs">
              <div className="border-b border-slate-100 pb-2.5 mb-3">
                <h2 className="text-xs sm:text-sm font-black text-[#1e3a5f] flex items-center gap-1.5">
                  <Calendar size={16} className="text-blue-600" />
                  <span>शैक्षिक क्यालेन्डर तथा कार्यक्रमहरू</span>
                </h2>
                <p className="text-[10px] text-slate-500">
              Academic Calender & Events
                </p>
              </div>

              {/* Integrated Academic Calendar Component */}
              <div className="overflow-hidden">
                <AcademicCalendar />
              </div>
            </div>

            {/* Events List */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs space-y-2.5">
              <h3 className="text-xs font-black text-[#1e3a5f] uppercase tracking-wider">
                Upcoming School Events
              </h3>

              {isEventsLoading ? (
                <div className="py-4 text-center text-slate-400 text-xs">
                  <RefreshCw size={16} className="animate-spin mx-auto mb-1 opacity-50" />
                  कार्यक्रमहरू लोड हुँदैछ...
                </div>
              ) : eventsData?.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs">
                  हाल कुनै कार्यक्रम तालिकाबद्ध गरिएको छैन।
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {eventsData.map((ev: any) => (
                    <div
                      key={ev.id}
                      className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-[#1e3a5f] text-[11px] sm:text-xs truncate">{ev.title}</span>
                        <span className="text-[9px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold shrink-0">
                          {ev.dateBs || ev.startDateBs || ''}
                        </span>
                      </div>
                      {ev.description && (
                        <p className="text-[10px] text-slate-600 line-clamp-2 leading-tight">
                          {ev.description}
                        </p>
                      )}
                      <div className="text-[9px] text-slate-400 flex items-center gap-1 pt-0.5">
                        <Clock size={10} />
                        <span className="truncate">{ev.time || ''} • {ev.venue || ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 3: NOTICES & DIRECTIVES ─────────────────────────────────────── */}
        {activeTab === 'notices' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <h2 className="text-xs sm:text-sm font-black text-[#1e3a5f] flex items-center gap-1.5">
                    <Bell size={16} className="text-amber-500" />
                    <span>सूचना तथा अध्यक्षीय निर्देशन(Notices & Directives)</span>
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    शिक्षक, कर्मचारी तथा प्रशासनलाई जारी गरिएका आधिकारिक निर्देशन तथा परिपत्रहरू
                  </p>
                </div>

                <button
                  onClick={() => setIsNoticeModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-3 py-1.5 text-[11px] font-black shadow-2xs transition shrink-0"
                >
                  <Plus size={13} />
                  <span>सूचना / निर्देशन</span>
                </button>
              </div>

              {/* Notice Table / List */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-[11px] sm:text-xs">
                  <thead className="bg-[#1e3a5f] text-white font-bold">
                    <tr>
                      <th className="px-3 py-2">मिति</th>
                      <th className="px-3 py-2">शीर्षक</th>
                      <th className="px-3 py-2">वर्ग</th>
                      <th className="px-3 py-2">लक्षित समूह</th>
                      <th className="px-3 py-2">विवरण</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isNoticesLoading ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          <RefreshCw size={16} className="animate-spin mx-auto mb-1 opacity-50" />
                          सूचनाहरू लोड हुँदैछ...
                        </td>
                      </tr>
                    ) : noticesData?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          हाल कुनै सूचना उपलब्ध छैन।
                        </td>
                      </tr>
                    ) : (
                      noticesData.map((n: any) => (
                        <tr key={n.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-3 py-2 font-mono font-bold text-slate-600 whitespace-nowrap">
                            {n.postedDateBs || n.postedDateAd?.slice(0, 10)}
                          </td>
                          <td className="px-3 py-2 font-black text-[#1e3a5f] max-w-xs">
                            {n.title}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              {n.type || 'GENERAL'}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap font-bold text-slate-700">
                            {n.targetRole === 'TEACHER' ? 'शिक्षक' : n.targetRole === 'ADMIN' ? 'प्रशासन' : 'विद्यालय'}
                          </td>
                          <td className="px-3 py-2 text-slate-600 max-w-md line-clamp-2 leading-tight">
                            {n.body}
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

        {/* ─── TAB 4: MAINTENANCE & SCHOOL ISSUES ──────────────────────────────── */}
        {activeTab === 'maintenance' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs space-y-3">
              <div className="border-b border-slate-100 pb-2.5">
                <h2 className="text-xs sm:text-sm font-black text-[#1e3a5f] flex items-center gap-1.5">
                  <Wrench size={16} className="text-amber-600" />
                  <span>मर्मत सम्भार तथा समस्याहरू (Maintenance & Issues)</span>
                </h2>
                <p className="text-[10px] text-slate-500">
                  कक्षाकोठा, खानेपानी, शौचालय, विद्युत, बेन्च/डेस्क तथा भौतिक मर्मत सम्बन्धी जानकारी
                </p>
              </div>

              {maintenanceIssues.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <Wrench size={22} className="mx-auto mb-1 opacity-30 text-amber-600" />
                  हाल कुनै मर्मत सम्भार सम्बन्धी समस्या दर्ता भएको छैन।
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {maintenanceIssues.map((issue: any) => (
                    <div
                      key={issue.id}
                      className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            मर्मत तथा सहयोग
                          </span>
                          <h3 className="text-xs font-black text-[#1e3a5f] mt-0.5">{issue.title}</h3>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.2 rounded">
                          {issue.postedDateBs || '२०८१'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-tight bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                        {issue.body}
                      </p>

                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-[10px] font-bold text-slate-500">
                          स्थिति: <b className="text-amber-600">निरीक्षण आवश्यक</b>
                        </span>
                        <button
                          onClick={() => {
                            setSelectedIssue(issue);
                            setIsRemarkModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#1e3a5f] hover:bg-[#2b5282] text-white text-[10px] sm:text-xs font-bold transition"
                        >
                          निर्णय / टिप्पणी
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 5: WEEKLY ABSENTEE LOG (PRIVACY SAFE) ───────────────────────── */}
        {activeTab === 'absentees' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs space-y-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <div className="flex items-center gap-1.5">
                    <UserCheck size={16} className="text-rose-600" />
                    <h2 className="text-xs sm:text-sm font-black text-[#1e3a5f]">
                      साप्ताहिक अनुपस्थित विद्यार्थी लगत
                    </h2>
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[8px] font-black px-1.5 py-0.2 rounded-full">
                      Absenties
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                   Weekly Absentee Log
                  </p>
                </div>

                <div className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  No. of Absentee: <b className="text-rose-600 font-black">{filteredAbsents.length}</b>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 text-xs">
                <div className="relative flex-1 w-full">
                  <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="विद्यार्थीको नाम वा रोल नं खोजी..."
                    value={absentSearchQuery}
                    onChange={(e) => setAbsentSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs font-medium focus:ring-1 focus:ring-[#1e3a5f]"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <span className="font-bold text-slate-600 whitespace-nowrap text-xs">कक्षा:</span>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="rounded-md border border-slate-200 px-2 py-1 font-bold bg-white text-slate-800 text-xs"
                  >
                    <option value="ALL">सबै कक्षा</option>
                    {classesData?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section ? `(${c.section})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Absent Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-[11px] sm:text-xs">
                  <thead className="bg-[#1e3a5f] text-white font-bold">
                    <tr>
                      <th className="px-3 py-2">क्र.सं.</th>
                      <th className="px-3 py-2">कक्षा</th>
                      <th className="px-3 py-2">रोल नं</th>
                      <th className="px-3 py-2">विद्यार्थीको नाम</th>
                      <th className="px-3 py-2">अनुपस्थित मिति</th>
                      <th className="px-3 py-2 text-center">स्थिति</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isAbsentsLoading ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          <RefreshCw size={16} className="animate-spin mx-auto mb-1 opacity-50" />
                          लोड हुँदैछ...
                        </td>
                      </tr>
                    ) : filteredAbsents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          कुनै विद्यार्थी अनुपस्थित देखिएन।
                        </td>
                      </tr>
                    ) : (
                      filteredAbsents.map((abs: any, idx: number) => (
                        <tr key={abs.id || idx} className="hover:bg-slate-50/80 transition">
                          <td className="px-3 py-2 font-mono text-slate-500">{idx + 1}</td>
                          <td className="px-3 py-2 font-bold text-slate-800">{abs.className}</td>
                          <td className="px-3 py-2 font-mono font-black text-[#1e3a5f]">
                            {abs.rollNo || '—'}
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-bold text-slate-900 block">{abs.studentName}</span>
                            {abs.studentNameNepali && (
                              <span className="text-[9px] text-slate-500 block">{abs.studentNameNepali}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-slate-700">{abs.dateBs}</td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[9px] font-black uppercase bg-rose-100 text-rose-800">
                              ABSENT
                            </span>
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

        {/* ─── TAB 6: GRIEVANCES & COMPLAINTS ─────────────────────────────────── */}
        {activeTab === 'grievances' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs space-y-3">
              <div className="border-b border-slate-100 pb-2.5">
                <h2 className="text-xs sm:text-sm font-black text-[#1e3a5f] flex items-center gap-1.5">
                  <MessageSquare size={16} className="text-indigo-600" />
                  <span>गुनासो / सुझावहरू Grievances & Suggestions</span>
                </h2>
              </div>

              {grievancesList.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <MessageSquare size={22} className="mx-auto mb-1 opacity-30 text-indigo-600" />
                  हाल कुनै गुनासो वा सुझाव दर्ता भएको छैन।
                </div>
              ) : (
                <div className="space-y-2">
                  {grievancesList.map((g: any) => (
                    <div
                      key={g.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-800 text-[11px] sm:text-xs">{g.title}</span>
                        <span className="text-[9px] font-mono text-slate-500 bg-white px-1.5 py-0.2 rounded border">
                          {g.postedDateBs || '२०८१'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-tight">{g.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 7: SMC COMMITTEE DIRECTORY ─────────────────────────────────── */}
        {activeTab === 'committee' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <h2 className="text-xs sm:text-sm font-black text-[#1e3a5f] flex items-center gap-1.5">
                    <Users size={16} className="text-blue-600" />
                    <span>विद्यालय व्यवस्थापन समिति विवरण</span>
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    शिक्षा ऐन बमोजिम निर्वाचित/मनोनीतसदस्यीय पदाधिकारी विवरण तथा सम्पर्क
                  </p>
                </div>

                <button
                  onClick={() => {
                    setMemberForm({
                      name: '',
                      nameNepali: '',
                      post: 'सदस्य (Member)',
                      representation: 'अभिभावक प्रतिनिधि (Parent Rep)',
                      phone: '',
                      tenure: '',
                      isChair: false,
                    });
                    setIsMemberModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-[11px] font-black shadow-2xs transition shrink-0"
                >
                  <Plus size={13} />
                  <span>सदस्य थप्नुहोस्</span>
                </button>
              </div>

              {/* Committee Members Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {committeeData?.map((member: SMCCommitteeMember) => (
                  <div
                    key={member.id}
                    className={`rounded-xl border p-3 space-y-2 transition ${
                      member.isChair
                        ? 'border-amber-300 bg-amber-50/40 ring-1 ring-amber-300 shadow-2xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full ${
                            member.isChair
                              ? 'bg-amber-400 text-[#1e3a5f]'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {member.post}
                        </span>
                        <h3 className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">
                          {member.nameNepali || member.name}
                        </h3>
                        {member.nameNepali && member.name !== member.nameNepali && (
                          <span className="text-[10px] text-slate-500 block">{member.name}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setMemberForm(member);
                            setIsMemberModalOpen(true);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                          title="Edit"
                        >
                          <FileText size={13} />
                        </button>
                        {!member.isChair && (
                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                            title="Delete"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-0.5 text-[10px] sm:text-[11px] border-t border-slate-100 pt-1.5 text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">प्रतिनिधित्व:</span>
                        <span className="font-bold text-slate-800">{member.representation}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">सम्पर्क:</span>
                        <span className="font-mono font-bold text-slate-800">{member.phone || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">कार्यकाल:</span>
                        <span className="font-mono text-slate-800">{member.tenure}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── MODAL 1: CALL MEETING MODAL ──────────────────────────────────────── */}
      {isMeetingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-4 sm:p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Send className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs sm:text-sm font-black text-[#1e3a5f]">
                  बैठक आह्वान गर्नुहोस् (Call Meeting)
                </h3>
              </div>
              <button
                onClick={() => setIsMeetingModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                callMeetingMutation.mutate(meetingData);
              }}
              className="space-y-2.5 text-[11px] sm:text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-0.5">बैठकको शीर्षक (Title) *</label>
                <input
                  type="text"
                  required
                  value={meetingData.meetingTitle}
                  onChange={(e) => setMeetingData({ ...meetingData, meetingTitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold focus:ring-1 focus:ring-[#1e3a5f]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">बैठक मिति (Date BS) *</label>
                  <input
                    type="text"
                    required
                    value={meetingData.meetingDateBs}
                    onChange={(e) => setMeetingData({ ...meetingData, meetingDateBs: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono font-bold focus:ring-1 focus:ring-[#1e3a5f]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">समय (Time) *</label>
                  <input
                    type="text"
                    required
                    value={meetingData.meetingTime}
                    onChange={(e) => setMeetingData({ ...meetingData, meetingTime: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold focus:ring-1 focus:ring-[#1e3a5f]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">स्थान (Venue) *</label>
                <input
                  type="text"
                  required
                  value={meetingData.venue}
                  onChange={(e) => setMeetingData({ ...meetingData, venue: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold focus:ring-1 focus:ring-[#1e3a5f]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">छलफलका एजेन्डाहरू (Agenda) *</label>
                <textarea
                  required
                  rows={3}
                  value={meetingData.agenda}
                  onChange={(e) => setMeetingData({ ...meetingData, agenda: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-medium focus:ring-1 focus:ring-[#1e3a5f] leading-tight"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">उपस्थिति लक्षित समूह (Target)</label>
                <select
                  value={meetingData.targetAudience}
                  onChange={(e) => setMeetingData({ ...meetingData, targetAudience: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold bg-slate-50 text-xs"
                >
                  <option value="ALL_STAFF">सम्पूर्ण शिक्षक तथा कर्मचारी (All Staff)</option>
                  <option value="TEACHERS_ONLY">शिक्षक वर्ग मात्र (Teachers Only)</option>
                  <option value="ADMIN_ONLY">प्रशासन मात्र (Admin Only)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMeetingModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={callMeetingMutation.isPending}
                  className="px-3.5 py-1.5 rounded-lg bg-[#1e3a5f] hover:bg-[#2b5282] text-white font-black shadow-2xs transition text-xs"
                >
                  {callMeetingMutation.isPending ? 'सम्प्रेषण हुँदै...' : 'बैठक सम्प्रेषण गर्नुहोस्'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: PUBLISH NOTICE MODAL ────────────────────────────────────── */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-4 sm:p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Bell className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs sm:text-sm font-black text-[#1e3a5f]">
                  नयाँ सूचना वा निर्देशन जारी गर्नुहोस्
                </h3>
              </div>
              <button
                onClick={() => setIsNoticeModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                publishNoticeMutation.mutate(noticeData);
              }}
              className="space-y-2.5 text-[11px] sm:text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-0.5">सूचनाको शीर्षक (Title) *</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. भौतिक सरसफाइ तथा अतिरिक्त कक्षा "
                  value={noticeData.title}
                  onChange={(e) => setNoticeData({ ...noticeData, title: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold focus:ring-1 focus:ring-[#1e3a5f]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">वर्ग (Type)</label>
                  <select
                    value={noticeData.type}
                    onChange={(e) => setNoticeData({ ...noticeData, type: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold bg-slate-50 text-xs"
                  >
                    <option value="ADMIN_DIRECTIVE">अध्यक्षीय निर्देशन</option>
                    <option value="GENERAL">सामान्य सूचना</option>
                    <option value="URGENT">जरुरी परिपत्र</option>
                    <option value="ACADEMIC">शैक्षिक निर्देशन</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">जारी मिति (Date BS) *</label>
                  <input
                    type="text"
                    required
                    value={noticeData.postedDateBs}
                    onChange={(e) => setNoticeData({ ...noticeData, postedDateBs: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono font-bold focus:ring-1 focus:ring-[#1e3a5f]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">लक्षित समूह (Target Role)</label>
                <select
                  value={noticeData.targetRole}
                  onChange={(e) => setNoticeData({ ...noticeData, targetRole: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold bg-slate-50 text-xs"
                >
                  <option value="TEACHER">सम्पूर्ण शिक्षक तथा कर्मचारी</option>
                  <option value="ADMIN">प्रशासन (Admin)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">सूचना विवरण (Body) *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="यहाँ विस्तृत सूचना लेख्नुहोस्..."
                  value={noticeData.body}
                  onChange={(e) => setNoticeData({ ...noticeData, body: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-medium focus:ring-1 focus:ring-[#1e3a5f] leading-tight"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNoticeModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishNoticeMutation.isPending}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] font-black shadow-2xs transition text-xs"
                >
                  {publishNoticeMutation.isPending ? 'Publishing...' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: ADD/EDIT SMC MEMBER MODAL ──────────────────────────────── */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-4 sm:p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs sm:text-sm font-black text-[#1e3a5f]">
                  {memberForm.id ? 'समिति सदस्य सम्पादन' : 'नयाँ समिति सदस्य थप्नुहोस्'}
                </h3>
              </div>
              <button
                onClick={() => setIsMemberModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddOrEditMember} className="space-y-2.5 text-[11px] sm:text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-0.5">पूरा नाम*</label>
                <input
                  type="text"
                  required
                  placeholder="Enter the Member name"
                  value={memberForm.nameNepali || memberForm.name}
                  onChange={(e) =>
                    setMemberForm({ ...memberForm, nameNepali: e.target.value, name: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold focus:ring-1 focus:ring-[#1e3a5f]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">पद (Post) *</label>
                <select
                  value={memberForm.post}
                  onChange={(e) => setMemberForm({ ...memberForm, post: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold bg-slate-50 text-xs"
                >
                  <option value="अध्यक्ष (Chairperson)">अध्यक्ष (Chairperson)</option>
                  <option value="सदस्य (Member)">सदस्य (Member)</option>
                  <option value="सदस्य (Female Rep)">महिला सदस्य (Female Member)</option>
                  <option value="सदस्य (Teacher Rep)">शिक्षक प्रतिनिधि सदस्य (Teacher Rep)</option>
                  <option value="सदस्य सचिव (Member Secretary)">सदस्य सचिव (Member Secretary)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">प्रतिनिधित्व क्षेत्र (Representation) *</label>
                <select
                  value={memberForm.representation}
                  onChange={(e) => setMemberForm({ ...memberForm, representation: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold bg-slate-50 text-xs"
                >
                  <option value="अभिभावक प्रतिनिधि">अभिभावक प्रतिनिधि (Parent Rep)</option>
                  <option value="महिला अभिभावक">महिला अभिभावक (Female Guardian)</option>
                  <option value="स्थानीय बुद्धिजीवी / वडा प्रतिनिधि">स्थानीय बुद्धिजीवी / वडा प्रतिनिधि</option>
                  <option value="शिक्षक प्रतिनिधि">शिक्षक प्रतिनिधि (Teacher Rep)</option>
                  <option value="प्रधानाध्यापक (पदेन)">प्रधानाध्यापक (पदेन - Ex-Officio)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">सम्पर्क (Phone)</label>
                  <input
                    type="text"
                    value={memberForm.phone || ''}
                    onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono focus:ring-1 focus:ring-[#1e3a5f]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">कार्यकाल (Tenure)</label>
                  <input
                    type="text"
                    value={memberForm.tenure || ''}
                    onChange={(e) => setMemberForm({ ...memberForm, tenure: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono focus:ring-1 focus:ring-[#1e3a5f]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateCommitteeMutation.isPending}
                  className="px-3.5 py-1.5 rounded-lg bg-[#1e3a5f] hover:bg-[#2b5282] text-white font-black shadow-2xs transition text-xs"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: MAINTENANCE REMARKS MODAL ──────────────────────────────── */}
      {isRemarkModalOpen && selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-4 sm:p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-amber-600" />
                <h3 className="text-xs sm:text-sm font-black text-[#1e3a5f]">
                  अध्यक्षीय निर्णय तथा मर्मत निर्देशन
                </h3>
              </div>
              <button
                onClick={() => setIsRemarkModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 text-[11px] sm:text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[9px] font-bold text-slate-500 uppercase">समस्या:</span>
                <h4 className="font-bold text-[#1e3a5f] mt-0.5">{selectedIssue.title}</h4>
                <p className="text-slate-600 mt-0.5 leading-tight">{selectedIssue.body}</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">निर्णय / स्थिति (Action Status)</label>
                <select
                  value={issueStatus}
                  onChange={(e) => setIssueStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold bg-slate-50 text-xs"
                >
                  <option value="IN_PROGRESS">मर्मत प्रक्रिया अघि बढाइएको</option>
                  <option value="APPROVED">बजेट विनियोजन तथा स्वीकृत</option>
                  <option value="RESOLVED">मर्मत सम्पन्न</option>
                  <option value="UNDER_REVIEW">समितिमा छलफल हुने</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">अध्यक्षको टिप्पणी / निर्देशन</label>
                <textarea
                  rows={2.5}
                  placeholder="उदा. विद्यालय कोषबाट यथाशीघ्र मर्मत कार्य सम्पन्न गर्न निर्देशन दिइयो।"
                  value={chairpersonRemark}
                  onChange={(e) => setChairpersonRemark(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-medium focus:ring-1 focus:ring-[#1e3a5f]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRemarkModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 text-xs"
                >
                  बन्द गर्नुहोस्
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast.success('अध्यक्षीय टिप्पणी तथा मर्मत निर्देशन सुरक्षित गरियो!');
                    setIsRemarkModalOpen(false);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#1e3a5f] hover:bg-[#2b5282] text-white font-black shadow-2xs transition text-xs"
                >
                  टिप्पणी सुरक्षित गर्नुहोस्
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
