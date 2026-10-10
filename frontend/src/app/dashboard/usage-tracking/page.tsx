'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBSFormatted } from '@/lib/nepali-date';
import {
  Users,
  Activity,
  ShieldCheck,
  Laptop,
  Smartphone,
  Tablet,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Radio,
  GraduationCap,
  BookMarked,
  Receipt,
  Shield,
  UserCog,
  History,
  FileCheck,
  Clock,
  Layers,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function AppUsageTrackingPage() {
  const [activeTab, setActiveTab] = useState<'audit' | 'logins'>('audit');

  // Filters for Login Logs
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [filterDateBs, setFilterDateBs] = useState<string>('');

  // Filters for System Audit Logs (10-Day retention)
  const [auditEntity, setAuditEntity] = useState<string>('ALL');
  const [auditAction, setAuditAction] = useState<string>('ALL');
  const [auditRole, setAuditRole] = useState<string>('ALL');
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [auditPage, setAuditPage] = useState<number>(1);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  // 1. Fetch Summary & Live Stats (auto-refreshes every 30 seconds)
  const { data: summaryResponse, isLoading: isSummaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['usage-tracking-summary'],
    queryFn: async () => {
      const res = await api.get('/usage-tracking/summary');
      return res.data?.data;
    },
    refetchInterval: 30000,
  });

  // 2. Fetch Detailed Login Audit Logs
  const { data: logsResponse, isLoading: isLogsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['usage-tracking-logs', selectedRole, searchQuery, filterDateBs, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRole !== 'ALL') params.append('role', selectedRole);
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (filterDateBs.trim()) params.append('dateBs', filterDateBs.trim());
      params.append('page', String(page));
      params.append('limit', '40');

      const res = await api.get(`/usage-tracking/logs?${params.toString()}`);
      return res.data?.data;
    },
    refetchInterval: 60000,
  });

  // 3. Fetch 10-Day System Change Audit Logs
  const { data: auditLogsResponse, isLoading: isAuditLoading, refetch: refetchAuditLogs } = useQuery({
    queryKey: ['system-audit-logs', auditEntity, auditAction, auditRole, auditSearch, auditPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (auditEntity !== 'ALL') params.append('entity', auditEntity);
      if (auditAction !== 'ALL') params.append('action', auditAction);
      if (auditRole !== 'ALL') params.append('role', auditRole);
      if (auditSearch.trim()) params.append('q', auditSearch.trim());
      params.append('page', String(auditPage));
      params.append('limit', '30');

      const res = await api.get(`/usage-tracking/system-audit-logs?${params.toString()}`);
      return res.data?.data;
    },
    refetchInterval: 30000,
  });

  const summary = summaryResponse || {};
  const logsList = logsResponse?.logs || [];
  const auditLogsList = auditLogsResponse?.logs || [];
  const roleStats = summary.roleStats || {};
  const deviceStats = summary.deviceStats || {};
  const trend = summary.sevenDaysTrend || [];
  const onlineUsers = summary.onlineUsersList || [];

  const getRoleBadge = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return { bg: 'bg-rose-100 text-rose-800 border-rose-200', label: 'Admin', icon: Shield };
      case 'TEACHER':
        return { bg: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Teacher', icon: GraduationCap };
      case 'STUDENT':
        return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Student', icon: Users };
      case 'LIBRARIAN':
        return { bg: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Librarian', icon: BookMarked };
      case 'ACCOUNTANT':
        return { bg: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Accountant', icon: Receipt };
      default:
        return { bg: 'bg-gray-100 text-gray-800 border-gray-200', label: role || 'User', icon: UserCog };
    }
  };

  const getActionBadge = (action: string) => {
    const act = (action || '').toUpperCase();
    switch (act) {
      case 'CREATE':
        return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'CREATE (सिर्जना)' };
      case 'UPDATE':
        return { bg: 'bg-blue-100 text-blue-800 border-blue-200', label: 'UPDATE (परिमार्जन)' };
      case 'DELETE':
        return { bg: 'bg-red-100 text-red-800 border-red-200', label: 'DELETE (हटाएको)' };
      case 'ISSUE':
        return { bg: 'bg-purple-100 text-purple-800 border-purple-200', label: 'ISSUE (जारी)' };
      case 'SETTINGS_CHANGE':
        return { bg: 'bg-amber-100 text-amber-800 border-amber-200', label: 'SETTINGS (सेटिङ्स)' };
      case 'PASSWORD_RESET':
      case 'PASSWORD_CHANGE':
        return { bg: 'bg-orange-100 text-orange-800 border-orange-200', label: 'SECURITY (पासवर्ड)' };
      default:
        return { bg: 'bg-gray-100 text-gray-800 border-gray-200', label: act };
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ─── 1. TOP HEADER ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1e3a5f] via-[#264b77] to-[#1e3a5f] p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400 text-emerald-950 px-2.5 py-0.5 text-[11px] font-black uppercase shadow-xs">
                <Radio size={12} className="animate-pulse text-emerald-900" />
                <span>Live System Monitoring & 10-Day Audit Log</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 text-blue-100 px-2.5 py-0.5 text-[11px] font-bold font-mono">
                <Calendar size={12} />
                <span>BS {todayBSFormatted()}</span>
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-wide text-white font-serif">
              प्रणाली परिवर्तन लग तथा प्रयोग अनुगमन (Audit & Activity Tracking)
            </h1>
            <p className="text-xs text-blue-200">
              १० दिनको प्रणाली अडिट लग (कुन प्रयोगकर्ताले के परिवर्तन गर्‍यो), १०-मिनेट स्वतः लगआउट सुरक्षा र प्रत्यक्ष अनलाइन अनुगमन
            </p>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={() => {
              refetchSummary();
              refetchLogs();
              refetchAuditLogs();
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 text-xs font-black shadow-xs transition backdrop-blur-xs"
          >
            <RefreshCw size={14} />
            <span>Refresh All (रिफ्रेस)</span>
          </button>
        </div>

        {/* Top Tab Bar */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-white/15">
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition shadow-xs ${
              activeTab === 'audit'
                ? 'bg-amber-400 text-gray-950 font-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <History size={16} />
            <span>१०-दिने प्रणाली परिवर्तन लग (10-Day System Change Audit Logs)</span>
            <span className="ml-1 bg-black/20 text-xs px-2 py-0.5 rounded-full">
              {auditLogsResponse?.total ?? 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('logins')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition shadow-xs ${
              activeTab === 'logins'
                ? 'bg-amber-400 text-gray-950 font-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Activity size={16} />
            <span>लगिन तथा अनलाइन सत्र (Login Logs & Active Sessions)</span>
            <span className="ml-1 bg-black/20 text-xs px-2 py-0.5 rounded-full">
              {logsResponse?.total ?? 0}
            </span>
          </button>
        </div>
      </div>

      {/* ─── 2. SUMMARY METRIC CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Logins Today */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Logins Today (आजका लगइन)</span>
            <Activity size={16} className="text-blue-600" />
          </div>
          <p className="text-3xl font-black font-mono text-[#1e3a5f] mt-1.5">
            {summary.totalLoginsToday ?? 0}
          </p>
          <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
            Total session logins today
          </span>
        </div>

        {/* Unique Users Today */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Active Users Today (सक्रिय प्रयोगकर्ता)</span>
            <Users size={16} className="text-purple-600" />
          </div>
          <p className="text-3xl font-black font-mono text-purple-700 mt-1.5">
            {summary.distinctUsersTodayCount ?? 0}
          </p>
          <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
            Distinct accounts logged in
          </span>
        </div>

        {/* Currently Online */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-800 uppercase">Currently Online (अहिले अनलाइन)</span>
            <Radio size={16} className="text-emerald-600 animate-pulse" />
          </div>
          <p className="text-3xl font-black font-mono text-emerald-700 mt-1.5">
            {summary.activeUsersOnlineCount ?? 0}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
            Auto-logout on 10m inactivity
          </span>
        </div>

        {/* 10-Day Changes Total */}
        <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-800 uppercase">10-Day Audit Changes</span>
            <History size={16} className="text-amber-600" />
          </div>
          <p className="text-3xl font-black font-mono text-amber-900 mt-1.5">
            {auditLogsResponse?.total ?? 0}
          </p>
          <span className="text-[10px] text-amber-700 font-medium block mt-0.5">
            Changes retained for 10 days
          </span>
        </div>
      </div>

      {/* ─── TAB 1: 10-DAY SYSTEM CHANGE AUDIT LOGS ──────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
          {/* Informational Banner */}
          <div className="flex items-start gap-3 bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 text-blue-900 text-xs">
            <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-950">
                १०-दिने प्रणाली परिवर्तन तथा परिमार्जन ट्र्याकिङ (10-Day Strict Retention Audit Vault)
              </p>
              <p className="mt-0.5 text-blue-800">
                साइट वा डाटाबेसमा भएका सम्पूर्ण नयाँ सिर्जना (Create), परिमार्जन (Update), डिलिसन (Delete), प्रमाणपत्र जारी (Issue), सेटिङ्स परिवर्तन र पासवर्ड परिवर्तनहरू कुन प्रयोगकर्ता, भूमिका र IP बाट कहिले गरियो भन्ने विवरण यहाँ १० दिनसम्म सुरक्षित रहन्छ। १० दिन पुराना लगहरू स्वतः सफा (Purge) हुन्छन्।
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Entity Filter */}
              <div className="flex items-center gap-1.5">
                <Layers size={14} className="text-gray-400" />
                <select
                  value={auditEntity}
                  onChange={(e) => {
                    setAuditEntity(e.target.value);
                    setAuditPage(1);
                  }}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1e3a5f]"
                >
                  <option value="ALL">All Entities (सबै क्षेत्रहरू)</option>
                  <option value="CERTIFICATE">Certificate (प्रमाणपत्र)</option>
                  <option value="CERTIFICATE_LAYOUT">Certificate Layout (ढाँचा सेटिङ)</option>
                  <option value="CERTIFICATE_TEMPLATE">Certificate Template (ढाँचा)</option>
                  <option value="STUDENT">Student (विद्यार्थी)</option>
                  <option value="TEACHER">Teacher / Staff (शिक्षक)</option>
                  <option value="USER">User Account (प्रयोगकर्ता खाता)</option>
                  <option value="INCOME">Income / Finance (आम्दानी)</option>
                  <option value="EXPENSE">Expense (खर्च)</option>
                  <option value="FEE">Fee Collection (शुल्क संकलन)</option>
                  <option value="SCHOOL_PROFILE">School Profile (विद्यालय विवरण)</option>
                  <option value="SYSTEM_BACKUP">Database Backup (ब्याकअप)</option>
                </select>
              </div>

              {/* Action Filter */}
              <div className="flex items-center gap-1.5">
                <Filter size={14} className="text-gray-400" />
                <select
                  value={auditAction}
                  onChange={(e) => {
                    setAuditAction(e.target.value);
                    setAuditPage(1);
                  }}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1e3a5f]"
                >
                  <option value="ALL">All Actions (सबै कार्यहरू)</option>
                  <option value="CREATE">CREATE (नयाँ थप)</option>
                  <option value="UPDATE">UPDATE (परिमार्जन)</option>
                  <option value="DELETE">DELETE (डिलिसन)</option>
                  <option value="ISSUE">ISSUE (जारी गरिएको)</option>
                  <option value="SETTINGS_CHANGE">SETTINGS (सेटिङ्स परिवर्तन)</option>
                  <option value="PASSWORD_RESET">PASSWORD RESET (पासवर्ड रिसेट)</option>
                  <option value="PASSWORD_CHANGE">PASSWORD CHANGE (पासवर्ड परिवर्तन)</option>
                </select>
              </div>

              {/* Role Filter */}
              <select
                value={auditRole}
                onChange={(e) => {
                  setAuditRole(e.target.value);
                  setAuditPage(1);
                }}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1e3a5f]"
              >
                <option value="ALL">All Roles (सबै भूमिका)</option>
                <option value="ADMIN">Admin / Super Admin</option>
                <option value="TEACHER">Teacher</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="LIBRARIAN">Librarian</option>
                <option value="STUDENT">Student</option>
              </select>

              {/* Search */}
              <div className="relative min-w-[220px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search user, action, details..."
                  value={auditSearch}
                  onChange={(e) => {
                    setAuditSearch(e.target.value);
                    setAuditPage(1);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-3 py-2 text-xs font-medium text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-gray-500">
              Total: <b>{auditLogsResponse?.total ?? 0}</b> records (10 Days)
            </span>
          </div>

          {/* Audit Logs Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1e3a5f] text-white uppercase text-[11px] font-black tracking-wider">
                <tr>
                  <th className="px-3 py-3 w-12">#</th>
                  <th className="px-4 py-3">प्रयोगकर्ता (User)</th>
                  <th className="px-3 py-3">कार्य (Action)</th>
                  <th className="px-3 py-3">क्षेत्र (Entity)</th>
                  <th className="px-4 py-3">विवरण (Description)</th>
                  <th className="px-4 py-3">मिति तथा समय (Timestamp)</th>
                  <th className="px-3 py-3">IP Address</th>
                  <th className="px-3 py-3 text-center">विवरण</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isAuditLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2 opacity-50" />
                      <span>Loading 10-day audit records...</span>
                    </td>
                  </tr>
                ) : auditLogsList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      कुनै प्रणाली परिवर्तन लग फेला परेन। (No system changes recorded matching filters in the last 10 days)
                    </td>
                  </tr>
                ) : (
                  auditLogsList.map((log: any, idx: number) => {
                    const roleBadge = getRoleBadge(log.role);
                    const RoleIcon = roleBadge.icon;
                    const actionBadge = getActionBadge(log.action);
                    const logDate = new Date(log.createdAt);
                    const timeFormatted = logDate.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });
                    const isExpanded = expandedLogId === log.id;

                    return (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-slate-50/80 transition">
                          <td className="px-3 py-3 font-mono text-gray-500">
                            {(auditPage - 1) * 30 + idx + 1}
                          </td>

                          {/* User */}
                          <td className="px-4 py-3">
                            <strong className="text-gray-900 block font-bold leading-tight">
                              {log.fullName || log.username || 'System'}
                            </strong>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] text-blue-700">
                                @{log.username || 'system'}
                              </span>
                              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-black border ${roleBadge.bg}`}>
                                <RoleIcon size={9} />
                                <span>{roleBadge.label}</span>
                              </span>
                            </div>
                          </td>

                          {/* Action */}
                          <td className="px-3 py-3">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${actionBadge.bg}`}>
                              {actionBadge.label}
                            </span>
                          </td>

                          {/* Entity */}
                          <td className="px-3 py-3">
                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[10px] font-bold border border-slate-200">
                              {log.entity}
                            </span>
                          </td>

                          {/* Description */}
                          <td className="px-4 py-3 max-w-xs md:max-w-md">
                            <span className="text-gray-800 font-medium leading-snug block">
                              {log.description}
                            </span>
                            {log.entityId && (
                              <span className="text-[10px] font-mono text-gray-400 block mt-0.5">
                                Ref ID: {log.entityId}
                              </span>
                            )}
                          </td>

                          {/* Timestamp */}
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-gray-800 block">
                              {timeFormatted}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono block">
                              {log.createdAtBs || logDate.toISOString().slice(0, 10)}
                            </span>
                          </td>

                          {/* IP */}
                          <td className="px-3 py-3 font-mono text-gray-600">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] border border-slate-200 inline-block">
                              {log.ipAddress || '127.0.0.1'}
                            </span>
                          </td>

                          {/* Inspect Toggle */}
                          <td className="px-3 py-3 text-center">
                            {log.details ? (
                              <button
                                type="button"
                                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-2 py-1 rounded-md border border-blue-200 transition"
                              >
                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                <span>{isExpanded ? 'Hide' : 'Details'}</span>
                              </button>
                            ) : (
                              <span className="text-gray-300 text-[11px]">—</span>
                            )}
                          </td>
                        </tr>

                        {/* Expanded Details Row */}
                        {isExpanded && log.details && (
                          <tr className="bg-slate-900 text-slate-100 text-[11px]">
                            <td colSpan={8} className="p-4">
                              <div className="space-y-1">
                                <span className="font-bold text-amber-400 text-xs uppercase tracking-wider block">
                                  Payload & Modification Details (JSON):
                                </span>
                                <pre className="bg-black/40 p-3 rounded-lg overflow-x-auto text-emerald-400 font-mono text-[11px] border border-white/10 whitespace-pre-wrap max-h-64">
                                  {(() => {
                                    try {
                                      return JSON.stringify(JSON.parse(log.details), null, 2);
                                    } catch {
                                      return log.details;
                                    }
                                  })()}
                                </pre>
                                {log.userAgent && (
                                  <p className="text-[10px] text-gray-400 font-mono pt-1">
                                    Browser User-Agent: {log.userAgent}
                                  </p>
                                )}
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

          {/* Pagination */}
          {auditLogsResponse?.totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
              <span className="text-gray-500 font-medium">
                Page <b>{auditPage}</b> of <b>{auditLogsResponse.totalPages}</b> ({auditLogsResponse.total} total audit records)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-lg border border-gray-200 bg-white font-bold text-gray-700 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={auditPage >= auditLogsResponse.totalPages}
                  onClick={() => setAuditPage((p) => p + 1)}
                  className="px-3 py-1 rounded-lg border border-gray-200 bg-white font-bold text-gray-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: LOGIN LOGS & ACTIVE SESSIONS ──────────────────────────────── */}
      {activeTab === 'logins' && (
        <div className="space-y-6">
          {/* Role & Device distribution cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Role Breakdown */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-3">
              <h3 className="font-extrabold text-xs text-[#1e3a5f] uppercase tracking-wider flex items-center gap-1.5">
                <Users size={14} className="text-blue-600" />
                <span>Today's Logins by Role (भूमिका अनुसार लगइन)</span>
              </h3>

              <div className="space-y-2 text-xs pt-1">
                {[
                  { label: 'Students (विद्यार्थीहरू)', count: roleStats.STUDENT || 0, color: 'bg-emerald-500', text: 'text-emerald-700' },
                  { label: 'Teachers (शिक्षकहरू)', count: roleStats.TEACHER || 0, color: 'bg-blue-500', text: 'text-blue-700' },
                  { label: 'Librarians (पुस्तकालय)', count: roleStats.LIBRARIAN || 0, color: 'bg-purple-500', text: 'text-purple-700' },
                  { label: 'Accountants (लेखापाल)', count: roleStats.ACCOUNTANT || 0, color: 'bg-amber-500', text: 'text-amber-700' },
                  { label: 'Admins (प्रशासक)', count: roleStats.ADMIN || 0, color: 'bg-rose-500', text: 'text-rose-700' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                    <span className="font-medium text-gray-700">{item.label}</span>
                    <span className={`font-mono font-black ${item.text}`}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Device Distribution */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-3">
              <h3 className="font-extrabold text-xs text-[#1e3a5f] uppercase tracking-wider flex items-center gap-1.5">
                <Laptop size={14} className="text-emerald-600" />
                <span>Device Platform Distribution (उपकरण विवरण)</span>
              </h3>

              <div className="space-y-2.5 text-xs pt-1">
                <div className="flex items-center justify-between py-1 border-b border-gray-50">
                  <div className="flex items-center gap-2 text-gray-700 font-medium">
                    <Smartphone size={14} className="text-emerald-600" />
                    <span>Mobile Phones (मोबाइल)</span>
                  </div>
                  <span className="font-mono font-black text-emerald-700">{deviceStats.Mobile || 0}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-gray-50">
                  <div className="flex items-center gap-2 text-gray-700 font-medium">
                    <Laptop size={14} className="text-blue-600" />
                    <span>Desktop / Laptops (कम्प्युटर)</span>
                  </div>
                  <span className="font-mono font-black text-blue-700">{deviceStats.Desktop || 0}</span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2 text-gray-700 font-medium">
                    <Tablet size={14} className="text-purple-600" />
                    <span>Tablets / iPads (ट्याब्लेट)</span>
                  </div>
                  <span className="font-mono font-black text-purple-700">{deviceStats.Tablet || 0}</span>
                </div>
              </div>
            </div>

            {/* 7-Day Trend */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-3">
              <h3 className="font-extrabold text-xs text-[#1e3a5f] uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={14} className="text-purple-600" />
                <span>7-Day Login Activity Trend</span>
              </h3>

              <div className="space-y-1.5 text-xs pt-1">
                {trend.map((t: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-0.5">
                    <span className="font-mono text-gray-600 text-[11px]">{t.dateBs || t.date}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full"
                          style={{ width: `${Math.min(100, ((t.count || 0) / 50) * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono font-black text-gray-900 text-xs w-6 text-right">
                        {t.count || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Login Logs Table */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Role Filter */}
                <select
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1e3a5f]"
                >
                  <option value="ALL">All Roles (सबै भूमिका)</option>
                  <option value="ADMIN">Admin / Super Admin</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="ACCOUNTANT">Accountant</option>
                  <option value="LIBRARIAN">Librarian</option>
                  <option value="STUDENT">Student</option>
                </select>

                {/* Search */}
                <div className="relative min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search username, name, IP..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-3 py-2 text-xs font-medium text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1e3a5f]"
                  />
                </div>
              </div>

              <span className="text-xs font-mono font-bold text-gray-500">
                Total: <b>{logsResponse?.total ?? 0}</b> logins
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1e3a5f] text-white uppercase text-[11px] font-black tracking-wider">
                  <tr>
                    <th className="px-3 py-3 w-12">#</th>
                    <th className="px-4 py-3">प्रयोगकर्ता (User)</th>
                    <th className="px-3 py-3">भूमिका (Role)</th>
                    <th className="px-4 py-3">लगइन समय (Login Time)</th>
                    <th className="px-3.5 py-3">उपकरण (Device & Browser)</th>
                    <th className="px-4 py-3">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLogsLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2 opacity-50" />
                        <span>Loading login audit trails...</span>
                      </td>
                    </tr>
                  ) : logsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        No login events recorded matching the filter.
                      </td>
                    </tr>
                  ) : (
                    logsList.map((log: any, idx: number) => {
                      const roleBadge = getRoleBadge(log.role);
                      const RoleIcon = roleBadge.icon;
                      const loginDate = new Date(log.loginAt);
                      const timeFormatted = loginDate.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      });

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-3 py-3 font-mono text-gray-500">
                            {(page - 1) * 40 + idx + 1}
                          </td>

                          {/* User */}
                          <td className="px-4 py-3">
                            <strong className="text-gray-900 block font-bold leading-tight">
                              {log.fullName || log.username}
                            </strong>
                            <span className="font-mono text-[10px] text-blue-700 block mt-0.5">
                              @{log.username}
                            </span>
                          </td>

                          {/* Role */}
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${roleBadge.bg}`}>
                              <RoleIcon size={10} />
                              <span>{roleBadge.label}</span>
                            </span>
                          </td>

                          {/* Login Time */}
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-gray-800 block">
                              {timeFormatted}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono block">
                              {log.loginDateBs || loginDate.toISOString().slice(0, 10)}
                            </span>
                          </td>

                          {/* Device */}
                          <td className="px-3.5 py-3">
                            <div className="flex items-center gap-1.5">
                              {log.deviceType === 'Mobile' ? (
                                <Smartphone size={13} className="text-emerald-600" />
                              ) : log.deviceType === 'Tablet' ? (
                                <Tablet size={13} className="text-purple-600" />
                              ) : (
                                <Laptop size={13} className="text-blue-600" />
                              )}
                              <span className="font-bold text-gray-700 text-[11px]">
                                {log.deviceType || 'Desktop'}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono truncate max-w-[160px] block mt-0.5">
                              {log.userAgent}
                            </span>
                          </td>

                          {/* IP */}
                          <td className="px-4 py-3 font-mono text-gray-600">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200 inline-block">
                              {log.ipAddress || '127.0.0.1'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {logsResponse?.totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                <span className="text-gray-500 font-medium">
                  Page <b>{page}</b> of <b>{logsResponse.totalPages}</b> ({logsResponse.total} total login records)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-lg border border-gray-200 bg-white font-bold text-gray-700 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= logsResponse.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 rounded-lg border border-gray-200 bg-white font-bold text-gray-700 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
