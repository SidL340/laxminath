'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, School, Lock, User, Globe, ExternalLink, ShieldCheck, KeyRound, ArrowLeft, Smartphone } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

const schema = z.object({
  username: z.string().min(1, 'Username required'),
  password: z.string().min(1, 'Password required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // ── 2FA State ──
  const [twoFactorPending, setTwoFactorPending] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);

  const router = useRouter();
  const { user, isLoading, login } = useAuthStore();

  const { data: school } = useQuery({
    queryKey: ['login-school-profile'],
    queryFn: async () => {
      try {
        const res = await api.get('/school/public');
        return res.data?.data || null;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const schoolName = school?.name || 'School ERP Portal';
  const schoolNameNepali = school?.nameNepali || 'विद्यालय व्यवस्थापन प्रणाली';
  const schoolLogo = school?.logoUrl || '/school_logo.png';
  const websiteUrl = school?.website || '/';
  const websiteDomain = school?.website ? school.website.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'सार्वजनिक वेबसाइट';

  const handleSuccessfulLogin = (loggedUser: any, token: string) => {
    login(loggedUser, token);
    toast.success(`Welcome, ${loggedUser.teacher?.fullName || loggedUser.student?.fullName || loggedUser.username}!`);

    const roleRoutes: Record<string, string> = {
      SUPER_ADMIN: '/dashboard',
      ADMIN: '/dashboard',
      ACCOUNTANT: '/dashboard/finance/fees',
      TEACHER: '/teacher',
      LIBRARIAN: '/dashboard/library',
      STUDENT: '/student',
      SMC_CHAIR: '/adhyaksha',
      CHAIRPERSON: '/adhyaksha',
      MANAGEMENT: '/adhyaksha',
    };
    router.replace(roleRoutes[loggedUser.role] || '/dashboard');
  };

  useEffect(() => {
    if (!isLoading && user) {
      const roleRoutes: Record<string, string> = {
        SUPER_ADMIN: '/dashboard',
        ADMIN: '/dashboard',
        ACCOUNTANT: '/dashboard/finance/fees',
        TEACHER: '/teacher',
        LIBRARIAN: '/dashboard/library',
        STUDENT: '/student',
        SMC_CHAIR: '/adhyaksha',
        CHAIRPERSON: '/adhyaksha',
        MANAGEMENT: '/adhyaksha',
      };
      router.replace(roleRoutes[user.role] || '/dashboard');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    router.prefetch('/dashboard');
    router.prefetch('/teacher');
    router.prefetch('/student');
    router.prefetch('/dashboard/finance/fees');
    router.prefetch('/adhyaksha');
  }, [router]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      
      // Handle 2FA intercept
      if (res.data.require2FA) {
        setTwoFactorPending(true);
        setTempToken(res.data.tempToken);
        setPendingUser(res.data.user);
        toast('Two-factor authentication code required', { icon: '🔐' });
        return;
      }

      const { token, user: loggedUser } = res.data;
      handleSuccessfulLogin(loggedUser, token);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const onVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode || !twoFactorCode.trim()) {
      toast.error('Please enter your 2FA or backup code.');
      return;
    }

    setVerifying2FA(true);
    try {
      const res = await api.post('/auth/2fa/login-verify', {
        tempToken,
        code: twoFactorCode.trim(),
      });

      if (res.data.usedBackupCode) {
        toast('Logged in using an emergency backup recovery code.', { icon: '⚠️' });
      }

      const { token, user: loggedUser } = res.data;
      handleSuccessfulLogin(loggedUser, token);
    } catch (err: any) {
      toast.error(err.response?.data?.message || '2FA verification failed. Please check code.');
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleCancel2FA = () => {
    setTwoFactorPending(false);
    setTempToken(null);
    setTwoFactorCode('');
    setUseBackupCode(false);
    setPendingUser(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2d5986] to-[#1e3a5f] flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />

      <div className="relative w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full shadow-2xl mb-3 p-2 ring-4 ring-amber-400/50">
            <img
              src={schoolLogo}
              alt={schoolName}
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/school_logo.png';
              }}
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-serif tracking-wide">{schoolName}</h1>
          <p className="text-amber-300 mt-1 text-xs font-bold font-nepali">{schoolNameNepali}</p>
        </div>

        {/* Official School Website Direct Link Badge */}
        <div className="mb-4 text-center">
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 shadow-xs backdrop-blur-xs transition text-xs font-bold"
          >
            <Globe size={13} className="text-amber-400" />
            <span>Visit Us: <strong className="text-amber-300 underline font-mono">{websiteDomain}</strong></span>
            <ExternalLink size={11} className="opacity-70" />
          </a>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-white/20">
          {!twoFactorPending ? (
            /* ── STEP 1: Standard Credentials Form ── */
            <>
              <div className="text-center mb-5">
                <h2 className="text-lg sm:text-xl font-extrabold text-[#1e3a5f]">Sign In / लगइन गर्नुहोस्</h2>
                <p className="text-xs text-gray-500 mt-0.5">Enter your student ID or assigned staff username</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Userid
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      {...register('username')}
                      type="text"
                      placeholder="Please Enter Your User Id"
                      className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] text-xs font-mono font-bold text-gray-900 bg-slate-50/50"
                      autoComplete="username"
                    />
                  </div>
                  {errors.username && <p className="text-red-500 text-[11px] mt-1">{errors.username.message}</p>}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter Password"
                      className="w-full pl-10 pr-10 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] text-xs font-mono text-gray-900 bg-slate-50/50"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-[11px] mt-1">{errors.password.message}</p>}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1e3a5f] hover:bg-[#2d5986] text-white py-2.5 sm:py-3 rounded-xl font-bold text-xs shadow-md transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 mt-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing in (लगइन हुँदैछ)...</span>
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>

                {/* Links & Quick Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-[11px] border-t border-gray-100">
                  <Link
                    href="/privacy-policy"
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 font-semibold"
                  >
                    <ShieldCheck size={12} className="text-emerald-600" />
                    <span>गोपनीयता नीति (Privacy Policy)</span>
                  </Link>
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold hover:underline"
                  >
                    <Globe size={12} />
                    <span>{websiteDomain}</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </form>
            </>
          ) : (
            /* ── STEP 2: Two-Factor Authentication (2FA) Verification Screen ── */
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 text-[#1e3a5f] rounded-2xl mb-2 border border-blue-100 shadow-inner">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-lg font-black text-[#1e3a5f]">2-Step Verification</h2>
                <p className="text-xs text-gray-500 mt-1">
                  सुरक्षा प्रमाणीकरण: <strong>{pendingUser?.fullName || pendingUser?.username}</strong>
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {useBackupCode 
                    ? 'Enter an emergency 8-character backup recovery code'
                    : 'Enter the 6-digit code from your Authenticator App (Google / Authy)'}
                </p>
              </div>

              <form onSubmit={onVerify2FA} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 text-center">
                    {useBackupCode ? 'Emergency Backup Recovery Code' : '6-Digit Authenticator Code'}
                  </label>
                  <div className="relative">
                    {useBackupCode ? (
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    ) : (
                      <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    )}
                    <input
                      type="text"
                      autoFocus
                      maxLength={useBackupCode ? 16 : 6}
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      placeholder={useBackupCode ? 'NSS-XXXX-XXXX' : '000000'}
                      className="w-full pl-10 pr-4 py-3 border-2 border-blue-200 focus:border-[#1e3a5f] rounded-xl focus:outline-none text-center font-mono font-black text-lg tracking-widest text-gray-900 bg-blue-50/30"
                    />
                  </div>
                </div>

                {/* Submit 2FA */}
                <button
                  type="submit"
                  disabled={verifying2FA}
                  className="w-full bg-[#1e3a5f] hover:bg-[#2d5986] text-white py-3 rounded-xl font-bold text-xs shadow-md transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {verifying2FA ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>प्रमाणीकरण हुँदैछ (Verifying)...</span>
                    </>
                  ) : (
                    'Verify & Continue (प्रमाणीकरण गर्नुहोस्)'
                  )}
                </button>

                {/* Toggle Backup Code vs Authenticator */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setUseBackupCode(!useBackupCode);
                      setTwoFactorCode('');
                    }}
                    className="text-blue-700 hover:text-blue-900 font-bold hover:underline cursor-pointer text-[11px]"
                  >
                    {useBackupCode ? 'Use Authenticator Code instead' : 'Lost phone? Use Backup Recovery Code'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel2FA}
                    className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 font-semibold cursor-pointer text-[11px]"
                  >
                    <ArrowLeft size={12} />
                    <span>Back</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <div className="text-center text-blue-200 text-xs mt-6 space-y-1">
          <p>© {new Date().getFullYear()} Nepal Secondary School ERP • All rights reserved</p>
          <p className="text-amber-300/90 font-bold text-[11px]">
            Designed & Developed by <strong className="text-white font-black">Nirmala Tech Innovations Pvt. Ltd.</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

