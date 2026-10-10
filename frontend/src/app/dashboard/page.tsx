'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { todayBSFormatted } from '@/lib/nepali-date';
import {
  Users,
  GraduationCap,
  TrendingUp,
  Wallet,
  UserX,
  BookOpen,
  Calendar,
  Bell,
  ArrowUpRight,
  School,
  FileSpreadsheet,
  Receipt,
  Award,
  Mail,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import AcademicCalendar from '@/components/dashboard/AcademicCalendar';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [showFunds, setShowFunds] = useState(false);

  useEffect(() => {
    if (user?.role === 'TEACHER') {
      router.replace('/teacher');
    } else if (user?.role === 'STUDENT') {
      router.replace('/student');
    }
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/school/dashboard');
      return res.data?.data;
    },
    enabled: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT',
  });

  const { data: execSummary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['executive-summary'],
    queryFn: async () => {
      const todayBs = todayBSFormatted();
      const res = await api.get('/finance-reports/executive-summary', { params: { todayBs } });
      return res.data?.data;
    },
    enabled: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT',
  });

  if (user?.role === 'TEACHER' || user?.role === 'STUDENT') {
    return (
      <div className="py-20 text-center text-gray-400">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
        <p className="mt-3 text-xs font-semibold">Redirecting to your Portal...</p>
      </div>
    );
  }

  const studentsTotal = data?.students?.total ?? 0;
  const teachersTotal = data?.teachers?.total ?? 0;
  const rastriyaTeachers = data?.teachers?.rastriya ?? 0;
  const nijiTeachers = data?.teachers?.nijiSroth ?? 0;
  const totalIncome = data?.finance?.income ?? 0;
  const totalExpense = data?.finance?.expense ?? 0;
  const balance = data?.finance?.balance ?? 0;
  const overdueIssues = data?.library?.overdueIssues ?? 0;

  // Executive summary metrics
  const feesToday = execSummary?.feeCollection?.today ?? 0;
  const feesTodayCount = execSummary?.feeCollection?.todayCount ?? 0;
  const feesMonth = execSummary?.feeCollection?.thisMonth ?? 0;
  const feesMonthCount = execSummary?.feeCollection?.thisMonthCount ?? 0;
  const feesYear = execSummary?.feeCollection?.thisFiscalYear ?? 0;

  const activeStudents = execSummary?.students?.activeCount ?? studentsTotal;
  const todayAbsent = execSummary?.students?.todayAbsentCount ?? 0;

  const totalBankBal = execSummary?.balances?.totalBankBalance ?? 0;
  const cashOnHand = execSummary?.balances?.cashOnHand ?? 0;
  const totalReceivables = execSummary?.dues?.totalReceivables ?? 0;
  const totalPayables = execSummary?.dues?.totalPayables ?? 0;
  const netPosition = execSummary?.financialPosition?.netPosition ?? 0;

  return (
    <div className="space-y-3 pb-6 max-w-7xl mx-auto">
      {/* ── 1. COMPACT WELCOME & STATUS BANNER ── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#1e3a5f] via-[#254b77] to-[#1e3a5f] px-4 py-3 text-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-400 text-[#1e3a5f] flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
              NM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white leading-tight font-nepali">
                  श्री नेपाल माध्यमिक विद्यालय विश्रामपुर
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/30 text-[10.5px] font-bold text-amber-300 font-nepali">
                  आ.व. {data?.academicYear?.year || '२०८१/८२'}
                </span>
              </div>
              <p className="text-[11px] text-blue-200 font-nepali">
                वृन्दावन न.पा.-२, विश्रामपुर, रौतहट • (स्थापित-२००७ साल) • BS {todayBSFormatted()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <Link
              href="/dashboard/students?tab=admission"
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 px-3 py-1.5 text-xs font-extrabold text-[#1e3a5f] shadow-2xs transition"
            >
              <Users size={13} />
              <span>+ New Admission</span>
            </Link>
            <Link
              href="/dashboard/leaves"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 px-3 py-1.5 text-xs font-bold text-white transition"
            >
              <UserCheck size={13} />
              <span>Leaves</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── 2. QUICK MANAGEMENT ACTIONS (DENSE 8-TILE ROW) ── */}
      <div className="rounded-xl border border-gray-100 bg-white p-2.5 shadow-2xs">
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
          <Link
            href="/dashboard/students?tab=admission"
            className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg border border-gray-100 hover:border-blue-300 hover:bg-blue-50/50 transition text-center group"
          >
            <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <Users size={14} />
            </div>
            <strong className="text-[11px] font-bold text-gray-800 leading-tight">भर्ना</strong>
            <span className="text-[9px] text-gray-400">Admission</span>
          </Link>

          <Link
            href="/dashboard/classes/routine"
            className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50/50 transition text-center group"
          >
            <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <Calendar size={14} />
            </div>
            <strong className="text-[11px] font-bold text-gray-800 leading-tight">रुटिन</strong>
            <span className="text-[9px] text-gray-400">Routine</span>
          </Link>

          <Link
            href="/dashboard/attendance"
            className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg border border-gray-100 hover:border-rose-300 hover:bg-rose-50/50 transition text-center group"
          >
            <div className="h-7 w-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <UserCheck size={14} />
            </div>
            <strong className="text-[11px] font-bold text-gray-800 leading-tight">हाजिरी</strong>
            <span className="text-[9px] text-gray-400">Attendance</span>
          </Link>

          <Link
            href="/dashboard/finance/fees"
            className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg border border-gray-100 hover:border-amber-300 hover:bg-amber-50/50 transition text-center group"
          >
            <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <Receipt size={14} />
            </div>
            <strong className="text-[11px] font-bold text-gray-800 leading-tight">रसिद</strong>
            <span className="text-[9px] text-gray-400">Fee Bill</span>
          </Link>

          <Link
            href="/dashboard/exams"
            className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg border border-gray-100 hover:border-purple-300 hover:bg-purple-50/50 transition text-center group"
          >
            <div className="h-7 w-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <Award size={14} />
            </div>
            <strong className="text-[11px] font-bold text-gray-800 leading-tight">सिट/नतिजा</strong>
            <span className="text-[9px] text-gray-400">Exams</span>
          </Link>

          <Link
            href="/dashboard/certificates"
            className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/50 transition text-center group"
          >
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <Award size={14} />
            </div>
            <strong className="text-[11px] font-bold text-gray-800 leading-tight">प्रमाणपत्र</strong>
            <span className="text-[9px] text-gray-400">Certificates</span>
          </Link>

          <Link
            href="/dashboard/letters"
            className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg border border-gray-100 hover:border-teal-300 hover:bg-teal-50/50 transition text-center group"
          >
            <div className="h-7 w-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <FileSpreadsheet size={14} />
            </div>
            <strong className="text-[11px] font-bold text-gray-800 leading-tight">चलानी</strong>
            <span className="text-[9px] text-gray-400">Letters</span>
          </Link>

          <Link
            href="/dashboard/leaves"
            className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg border border-gray-100 hover:border-amber-300 hover:bg-amber-50/50 transition text-center group"
          >
            <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <UserCheck size={14} />
            </div>
            <strong className="text-[11px] font-bold text-gray-800 leading-tight">बिदा</strong>
            <span className="text-[9px] text-gray-400">Leaves</span>
          </Link>
        </div>
      </div>

      {/* ── 3. EXECUTIVE KPI CARDS (DENSE 4-CARD GRID) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Card 1: Fee Collections Summary */}
        <div className="rounded-xl border border-blue-100 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
            <span className="uppercase">आजको संकलन (Fee Today)</span>
            <Receipt size={14} className="text-blue-600" />
          </div>
          <p className="text-lg font-black text-blue-900 font-mono mt-1">
            रू {isSummaryLoading ? '...' : feesToday.toLocaleString()}
          </p>
          <div className="flex items-center justify-between text-[10.5px] text-gray-500 mt-1 pt-1 border-t border-gray-100">
            <span>महिना: <b>रू {feesMonth.toLocaleString()}</b></span>
            <Link href="/dashboard/finance/fees" className="text-blue-600 hover:underline font-semibold">
              Fees →
            </Link>
          </div>
        </div>

        {/* Card 2: Students & Attendance */}
        <div className="rounded-xl border border-indigo-100 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
            <span className="uppercase">सक्रिय विद्यार्थी (Students)</span>
            <Users size={14} className="text-indigo-600" />
          </div>
          <p className="text-lg font-black text-indigo-950 font-mono mt-1">
            {isSummaryLoading ? '...' : activeStudents}
          </p>
          <div className="flex items-center justify-between text-[10.5px] text-gray-500 mt-1 pt-1 border-t border-gray-100">
            <span>आज अनुपस्थित: <b className="text-rose-600">{todayAbsent}</b> जना</span>
            <Link href="/dashboard/attendance" className="text-indigo-600 hover:underline font-semibold">
              हाजिरी →
            </Link>
          </div>
        </div>

        {/* Card 3: Teachers & Staff */}
        <div className="rounded-xl border border-emerald-100 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
            <span className="uppercase">शिक्षक तथा कर्मचारी (Staff)</span>
            <GraduationCap size={14} className="text-emerald-600" />
          </div>
          <p className="text-lg font-black text-emerald-950 font-mono mt-1">
            {teachersTotal}
          </p>
          <div className="flex items-center justify-between text-[10.5px] text-gray-500 mt-1 pt-1 border-t border-gray-100">
            <span>राहत/स्थायी: <b>{rastriyaTeachers}</b> | निजी: <b>{nijiTeachers}</b></span>
            <Link href="/dashboard/teachers" className="text-emerald-600 hover:underline font-semibold">
              Staff →
            </Link>
          </div>
        </div>

        {/* Card 4: Liquid Funds with Show/Hide toggle */}
        <div className="rounded-xl border border-amber-100 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
            <span className="uppercase">बैंक तथा नगद (Liquid Funds)</span>
            <button
              onClick={() => setShowFunds(!showFunds)}
              className="text-gray-400 hover:text-gray-700 p-0.5"
              title={showFunds ? 'Hide' : 'Show'}
            >
              {showFunds ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          <p className="text-lg font-black text-amber-900 font-mono mt-1">
            {showFunds ? `रू ${(totalBankBal + cashOnHand).toLocaleString()}` : '••••••••••'}
          </p>
          <div className="flex items-center justify-between text-[10.5px] text-gray-500 mt-1 pt-1 border-t border-gray-100">
            <span>बक्यौता: <b>रू {totalReceivables.toLocaleString()}</b></span>
            <Link href="/dashboard/finance" className="text-amber-700 hover:underline font-semibold">
              Finance →
            </Link>
          </div>
        </div>
      </div>

      {/* ── 4. MAIN SPLIT: ACADEMIC CALENDAR & FINANCIAL / ALERTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left 7 cols: Academic Calendar */}
        <div className="lg:col-span-7">
          <AcademicCalendar />
        </div>

        {/* Right 5 cols: Financial Summary + Live Alerts */}
        <div className="lg:col-span-5 space-y-3">
          {/* Financial Flow Card */}
          <div className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-extrabold text-[#1e3a5f] uppercase tracking-wide">
                Financial Summary (आर्थिक स्थिति)
              </h2>
              <Link href="/dashboard/finance" className="text-[10.5px] font-bold text-blue-600 hover:underline">
                Portal →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 my-1.5">
              <div className="rounded-lg bg-emerald-50/70 border border-emerald-100 p-2.5">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">कुल आम्दानी</span>
                <p className="text-sm font-black text-emerald-950 font-mono mt-0.5">रू {totalIncome.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-rose-50/70 border border-rose-100 p-2.5">
                <span className="text-[10px] font-bold text-rose-800 uppercase block">कुल खर्च</span>
                <p className="text-sm font-black text-rose-950 font-mono mt-0.5">रू {totalExpense.toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-2 rounded-lg bg-slate-50 p-2 border border-slate-100 text-[11px]">
              <div className="flex justify-between items-center font-bold text-gray-700 mb-1">
                <span>बजेट उपयोग (Utilization):</span>
                <span>{totalIncome > 0 ? Math.min(100, Math.round((totalExpense / totalIncome) * 100)) : 0}%</span>
              </div>
              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#1e3a5f] h-full rounded-full transition-all"
                  style={{ width: `${totalIncome > 0 ? Math.min(100, Math.round((totalExpense / totalIncome) * 100)) : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Alerts & Notice Actions */}
          <div className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold text-[#1e3a5f] uppercase tracking-wide flex items-center gap-1.5">
                <Bell size={13} className="text-amber-500" />
                <span>Notice Board & Alerts</span>
              </h2>
              <Link href="/dashboard/notices" className="text-[10.5px] font-bold text-blue-600 hover:underline">
                Notices →
              </Link>
            </div>

            <div className="space-y-1.5 text-xs">
              {overdueIssues > 0 && (
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center justify-between">
                  <span>📚 {overdueIssues} books overdue in Library</span>
                  <Link href="/dashboard/library" className="font-bold underline">Check</Link>
                </div>
              )}
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[11px] flex items-center justify-between">
                <span>📅 Academic Year: <strong>{data?.academicYear?.year || '2083/84'}</strong></span>
                <span className="text-gray-500 font-mono">Active</span>
              </div>
            </div>

            <Link
              href="/dashboard/notices"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#1e3a5f] hover:bg-[#2d5986] text-white text-xs font-bold transition shadow-2xs mt-2"
            >
              <Bell size={13} />
              <span>+ Create Notice / SMS Broadcast</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
