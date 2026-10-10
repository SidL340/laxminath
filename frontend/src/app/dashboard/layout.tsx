'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ShieldAlert } from 'lucide-react';
import api from '@/lib/api';
import TwoFactorSettingsModal from '@/components/TwoFactorSettingsModal';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean | null>(null);

  const isPrivilegedRole = user && ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'].includes(user.role);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && isPrivilegedRole) {
      api.get('/auth/2fa/status')
        .then((res) => {
          setTwoFactorEnabled(res.data?.twoFactorEnabled ?? false);
        })
        .catch(() => {});
    }
  }, [user, isPrivilegedRole, is2FAModalOpen]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden w-full max-w-[100vw]">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden w-full max-w-full">
        <Header onMenuClick={() => setMobileOpen(true)} />
        
        {/* ── SECURITY 2FA ENFORCEMENT BANNER FOR ADMINS & ACCOUNTANTS ── */}
        {isPrivilegedRole && twoFactorEnabled === false && (
          <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold shadow-xs shrink-0 border-b border-amber-700/20">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldAlert size={16} className="text-amber-100 shrink-0" />
              <span className="truncate">
                सुरक्षा सूचना: प्रशासनिक तथा आर्थिक खाता सुरक्षित गर्न <strong>२-चरण प्रमाणीकरण (2FA)</strong> सक्रिय गर्नुहोस्।
              </span>
            </div>
            <button
              onClick={() => setIs2FAModalOpen(true)}
              className="px-3 py-1 bg-white text-amber-900 hover:bg-amber-50 rounded-lg text-[11px] font-extrabold shadow-xs transition shrink-0 cursor-pointer"
            >
              Enable 2FA Now →
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6 bg-slate-50/50 w-full max-w-full">
          {children}
        </main>
      </div>

      <TwoFactorSettingsModal
        isOpen={is2FAModalOpen}
        onClose={() => {
          setIs2FAModalOpen(false);
          // Refetch 2FA status
          if (isPrivilegedRole) {
            api.get('/auth/2fa/status')
              .then((res) => setTwoFactorEnabled(res.data?.twoFactorEnabled ?? false))
              .catch(() => {});
          }
        }}
      />
    </div>
  );
}

