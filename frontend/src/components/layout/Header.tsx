'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { todayBSFormatted } from '@/lib/nepali-date';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Menu,
  Bell,
  Calendar,
  User,
  LogOut,
  ChevronDown,
  School,
  KeyRound,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import TwoFactorSettingsModal from '@/components/TwoFactorSettingsModal';

interface HeaderProps {
  onMenuClick?: () => void;
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'ड्यासबोर्ड' },
  '/dashboard/students': { title: 'Students Management', subtitle: 'विद्यार्थी व्यवस्थापन' },
  '/dashboard/classes': { title: 'Classes & Subjects', subtitle: 'कक्षा र विषय' },
  '/dashboard/attendance': { title: 'Attendance System', subtitle: 'हाजिरी व्यवस्थापन' },
  '/dashboard/exams': { title: 'Exams & Marksheets', subtitle: 'परीक्षा र लब्धाङ्क पत्र' },
  '/dashboard/certificates': { title: 'Certificates (CC/TC)', subtitle: 'चारित्रिक तथा स्थानान्तरण प्रमाणपत्र' },
  '/dashboard/finance/income': { title: 'Income & Budget', subtitle: 'आम्दानी र सरकारी बजेट' },
  '/dashboard/finance/expenses': { title: 'Expense Management', subtitle: 'खर्च व्यवस्थापन' },
  '/dashboard/finance/fees': { title: 'Fee Collection', subtitle: 'शुल्क संकलन' },
  '/dashboard/finance/payroll': { title: 'Teacher Payroll', subtitle: 'शिक्षक तलब तथा भत्ता' },
  '/dashboard/teachers': { title: 'Teachers & Staff', subtitle: 'शिक्षक तथा कर्मचारी' },
  '/dashboard/library': { title: 'Library Management', subtitle: 'पुस्तकालय व्यवस्थापन' },
  '/dashboard/inventory': { title: 'Inventory (Jinsi)', subtitle: 'जिन्सी व्यवस्थापन' },
  '/dashboard/notices': { title: 'Notices & SMS', subtitle: 'सूचना तथा सन्देश' },
  '/dashboard/school': { title: 'School Profile & Settings', subtitle: 'विद्यालय विवरण र सेटिङ' },
  '/teacher': { title: 'Teacher Portal', subtitle: 'शिक्षक पोर्टल' },
  '/student': { title: 'Student Portal', subtitle: 'विद्यार्थी पोर्टल' },
};

import { useQuery, useQueryClient } from '@tanstack/react-query';

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const [isChangePassModalOpen, setIsChangePassModalOpen] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPass, setLoadingPass] = useState(false);

  // Fetch real-time user notifications
  const { data: notifData, refetch: refetchNotifs } = useQuery({
    queryKey: ['user-notifications', user?.id],
    queryFn: async () => {
      if (!user) return { notifications: [], unreadCount: 0 };
      const res = await api.get('/notifications?limit=30');
      return res.data?.data || { notifications: [], unreadCount: 0 };
    },
    enabled: Boolean(user?.id),
    refetchInterval: 6000, // 6s fast live polling
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Listen for instant Service Worker push message events
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NEW_NOTIFICATION') {
        refetchNotifs();
        queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    };
  }, [refetchNotifs, queryClient]);

  const notifList = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      refetchNotifs();
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
    } catch (e) {}
  };

  const deleteNotification = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      refetchNotifs();
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      toast.success('सूचना हटाइयो!');
    } catch (e) {}
  };

  const clearAllNotifications = async () => {
    try {
      await api.delete('/notifications/clear-all');
      refetchNotifs();
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      toast.success('सबै सूचना हटाइयो!');
    } catch (e) {}
  };

  const triggerTestNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('यो डिभाइसमा नोटिफिकेसन सपोर्ट छैन।');
      return;
    }

    let perm = Notification.permission;
    if (perm !== 'granted') {
      perm = await Notification.requestPermission();
    }

    if (perm !== 'granted') {
      toast.error('कृपया फोन सेटिङ वा ब्राउजरबाट Notification Allow गर्नुहोस्।');
      return;
    }

    const title = 'नेपाल मा.वि. सूचना (Test Alert)';
    const body = 'तपाईंको फोनमा Notification सफलतापूर्वक सक्रिय छ! 🔔';

    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/favicon-32x32.png',
          vibrate: [200, 100, 200, 100, 200],
          tag: 'nepal-mavi-test',
          renotify: true,
          data: { url: '/dashboard/notices' },
        } as any);
        toast.success('फोनको Notification Bar मा सूचना पठाइयो!');
        return;
      } catch (e) {}
    }

    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/favicon-32x32.png',
    });
    toast.success('फोनको Notification Bar मा सूचना पठाइयो!');
  };

  const handleNotificationClick = async (n: any) => {
    try {
      if (!n.isRead) {
        await api.patch(`/notifications/${n.id}/read`);
        refetchNotifs();
      }
    } catch (e) {}
    setNotifOpen(false);
    if (n.link) {
      router.push(n.link);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Current password is required.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setLoadingPass(true);
    try {
      await api.post('/users/change-my-password', { oldPassword: currentPassword, newPassword });
      toast.success('Your password has been changed successfully!');
      setIsChangePassModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setLoadingPass(false);
    }
  };

  const matchedPath = Object.keys(pageTitles).find(
    (k) => pathname === k || (k !== '/dashboard' && pathname.startsWith(k))
  );
  const currentTitle = matchedPath ? pageTitles[matchedPath] : { title: 'Nepal School ERP', subtitle: 'विद्यालय व्यवस्थापन' };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const displayName = user?.teacher?.fullName || user?.student?.fullName || user?.username || 'User';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-3 md:px-6 shadow-xs">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>

        <div>
          <h1 className="text-base md:text-lg font-bold text-[#1e3a5f] leading-tight">{currentTitle.title}</h1>
          <p className="text-[11px] text-gray-500 font-nepali hidden sm:block">{currentTitle.subtitle}</p>
        </div>
      </div>

      {/* Right: Date, Notifications, User Menu */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Nepali Date Badge */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-semibold text-[#1e3a5f]">
          <Calendar size={14} className="text-amber-500" />
          <span>BS {todayBSFormatted()}</span>
        </div>

        {/* Notifications Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-[#1e3a5f] transition-colors"
            title="सूचना तथा नोटिफिकेसन (Notifications)"
          >
            <Bell size={18} />
            {unreadCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white ring-2 ring-white animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-1.5 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] rounded-xl bg-white shadow-xl ring-1 ring-black/10 z-50 border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-3 py-2 bg-[#1e3a5f] text-white">
                <div className="flex items-center gap-1.5">
                  <Bell size={14} className="text-amber-400" />
                  <span className="font-bold text-xs">सूचना तथा सन्देश (Notifications)</span>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[10px] text-amber-300 hover:text-amber-200 font-bold cursor-pointer"
                    >
                      Mark read
                    </button>
                  )}
                  {notifList.length > 0 && (
                    <button
                      onClick={clearAllNotifications}
                      className="text-[10px] text-rose-300 hover:text-rose-100 font-bold cursor-pointer"
                      title="Clear all notifications"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 text-xs">
                {notifList.length === 0 ? (
                  <div className="py-6 text-center text-gray-400">
                    <Bell size={20} className="mx-auto mb-1 opacity-30" />
                    <span className="text-[11px]">कुनै नयाँ सूचना छैन</span>
                  </div>
                ) : (
                  notifList.map((n: any) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-2.5 hover:bg-slate-50 transition cursor-pointer flex gap-2.5 items-start group relative ${
                        !n.isRead ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${!n.isRead ? 'bg-blue-600' : 'bg-transparent'}`} />
                      <div className="min-w-0 flex-1 pr-4">
                        <p className="font-bold text-gray-900 text-xs leading-tight">{n.title}</p>
                        <p className="text-gray-600 text-[10px] line-clamp-2 mt-0.5 leading-tight">{n.message}</p>
                        <span className="text-[9px] text-gray-400 font-mono block mt-0.5">
                          {n.createdAtBs || new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => deleteNotification(n.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 p-1 rounded transition cursor-pointer shrink-0 absolute right-2 top-2"
                        title="हटाउनुहोस् (Delete notification)"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2 text-center">
                <Link
                  href="/dashboard/notices"
                  onClick={() => setNotifOpen(false)}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 block"
                >
                  View All Notices (सबै सूचना) →
                </Link>
                <button
                  type="button"
                  onClick={triggerTestNotification}
                  className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1 cursor-pointer transition shadow-2xs"
                  title="फोनको Notification Bar मा परीक्षण सूचना पठाउनुहोस्"
                >
                  <Bell size={11} />
                  <span>Test Notification 🔔</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e3a5f] text-white text-xs font-bold shadow-sm">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-xs font-bold text-gray-800 leading-none">{displayName}</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{user?.role || 'User'}</p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5 z-50 border border-gray-100">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-800">{displayName}</p>
                <p className="text-[11px] text-gray-500">{user?.role}</p>
              </div>

              {user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' ? (
                <Link
                  href="/dashboard/school"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <School size={14} className="text-gray-500" />
                  School Settings
                </Link>
              ) : null}

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setIs2FAModalOpen(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
              >
                <ShieldCheck size={14} className="text-emerald-600" />
                <span className="font-semibold">2FA Security (दुई-तह सुरक्षा)</span>
              </button>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setIsChangePassModalOpen(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <KeyRound size={14} className="text-amber-500" />
                <span>Change Password (पासवर्ड फेर्नुहोस्)</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
              >
                <LogOut size={14} />
                Logout (लगआउट)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── CHANGE PASSWORD MODAL ───────────────────────────────────────────── */}
      {isChangePassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-base text-[#1e3a5f] flex items-center gap-2">
                <KeyRound className="text-amber-500" size={18} />
                <span>Change My Password (पासवर्ड फेर्नुहोस्)</span>
              </h3>
              <button onClick={() => setIsChangePassModalOpen(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Current Password (हालको पासवर्ड)</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">New Password (नयाँ पासवर्ड)</label>
                <input
                  type="password"
                  placeholder="Enter new password (min 8 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Confirm New Password (पासवर्ड पुनः टाईप गर्नुहोस्)</label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsChangePassModalOpen(false)} className="px-4 py-2 border rounded-xl text-xs font-bold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingPass}
                  className="px-5 py-2 bg-[#1e3a5f] hover:bg-[#2a4f7c] text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50"
                >
                  {loadingPass ? 'Updating...' : 'Update Password Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TWO-FACTOR AUTHENTICATION (2FA) MODAL ──────────────────────────── */}
      <TwoFactorSettingsModal
        isOpen={is2FAModalOpen}
        onClose={() => setIs2FAModalOpen(false)}
      />
    </header>
  );
}
