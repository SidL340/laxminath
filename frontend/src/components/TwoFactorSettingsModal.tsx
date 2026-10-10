'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  KeyRound,
  Copy,
  Check,
  Download,
  AlertTriangle,
  X,
  Lock,
  RefreshCw,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface TwoFactorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TwoFactorSettingsModal({ isOpen, onClose }: TwoFactorSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [remainingCodes, setRemainingCodes] = useState(0);

  // Setup Wizard State: 'idle' | 'setup' | 'backup_codes' | 'disable_confirm'
  const [viewState, setViewState] = useState<'idle' | 'setup' | 'backup_codes' | 'disable_confirm'>('idle');
  
  // Setup data
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [secretKey, setSecretKey] = useState<string>('');
  const [verifyCode, setVerifyCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  // Disable data
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  // Fetch status on open
  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setViewState('idle');
      setVerifyCode('');
      setDisablePassword('');
      setDisableCode('');
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/2fa/status');
      setIsEnabled(res.data.twoFactorEnabled);
      setRemainingCodes(res.data.remainingBackupCodes || 0);
    } catch (err: any) {
      console.error('Failed to fetch 2FA status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSetup = async () => {
    setLoading(true);
    try {
      const res = await api.post('/auth/2fa/setup');
      setQrCodeUrl(res.data.qrCodeUrl);
      setSecretKey(res.data.secret);
      setViewState('setup');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start 2FA setup.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode || verifyCode.trim().length !== 6) {
      toast.error('Please enter the 6-digit code from your authenticator app.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/2fa/enable', {
        secret: secretKey,
        code: verifyCode.trim(),
      });
      setIsEnabled(true);
      setBackupCodes(res.data.backupCodes || []);
      setRemainingCodes(res.data.backupCodes?.length || 8);
      setViewState('backup_codes');
      toast.success('Two-factor authentication enabled successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid verification code. Please check time sync.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword && !disableCode) {
      toast.error('Please enter your password or current 2FA code.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/2fa/disable', {
        password: disablePassword,
        code: disableCode,
      });
      setIsEnabled(false);
      setRemainingCodes(0);
      setViewState('idle');
      toast.success('Two-Factor Authentication has been disabled.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to disable 2FA.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    const password = window.prompt('Please enter your current account password to regenerate backup codes:');
    if (!password) return;

    setLoading(true);
    try {
      const res = await api.post('/auth/2fa/regenerate-backup-codes', { password });
      setBackupCodes(res.data.backupCodes || []);
      setRemainingCodes(res.data.backupCodes?.length || 8);
      setViewState('backup_codes');
      toast.success('New backup codes generated!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to regenerate backup codes.');
    } finally {
      setLoading(false);
    }
  };

  const copySecretKey = () => {
    navigator.clipboard.writeText(secretKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    toast.success('Setup key copied to clipboard!');
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
    toast.success('Backup codes copied!');
  };

  const downloadBackupCodes = () => {
    const content = `Nepal Secondary School ERP - Emergency Backup Recovery Codes\nGenerated: ${new Date().toLocaleString()}\n\n` +
      backupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      `\n\nNote: Each code can only be used ONCE for emergency login if you lose access to your Authenticator App.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nepal-mavi-erp-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#1e3a5f] to-[#2d5986] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide">Two-Factor Authentication (2FA)</h2>
              <p className="text-[11px] text-blue-200 font-medium">दुई-तह प्रमाणीकरण सुरक्षा व्यवस्थापन</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {viewState === 'idle' && (
            <div className="space-y-5">
              {/* Status Banner */}
              <div className={`p-4 rounded-2xl border flex items-start gap-4 ${
                isEnabled
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/80 border-amber-200 text-amber-900'
              }`}>
                <div className="p-2.5 rounded-xl bg-white shadow-xs">
                  {isEnabled ? (
                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="w-6 h-6 text-amber-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm">
                      Status: {isEnabled ? 'सक्रिय (ENABLED)' : 'निष्क्रिय (DISABLED)'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isEnabled ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'
                    }`}>
                      {isEnabled ? 'Active' : 'Not Configured'}
                    </span>
                  </div>
                  <p className="text-xs mt-1 text-slate-600 leading-relaxed">
                    {isEnabled
                      ? 'तपाईंको खाता Google Authenticator / Authy द्वारा सुरक्षित छ। प्रत्येक लगइनमा ६-अंकको कोड आवश्यक पर्दछ।'
                      : '2FA ले तपाईंको खातालाई थप सुरक्षा प्रदान गर्दछ। पासवर्ड थाहा भए पनि प्रमाणीकरण कोड बिना कसैले लगइन गर्न सक्दैन।'}
                  </p>
                </div>
              </div>

              {/* Action Details */}
              {isEnabled ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-700">
                      <span>Emergency Recovery Codes</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-mono">
                        {remainingCodes} available
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      फोन हराएमा वा पहुँच नभएमा तपाईं यी रिकभरी कोड प्रयोग गरी लगइन गर्न सक्नुहुन्छ।
                    </p>
                    <button
                      type="button"
                      onClick={handleRegenerateBackupCodes}
                      className="inline-flex items-center gap-1.5 text-blue-700 hover:text-blue-900 font-bold hover:underline cursor-pointer pt-1"
                    >
                      <RefreshCw size={13} />
                      <span>Generate New Backup Codes</span>
                    </button>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setViewState('disable_confirm')}
                      className="w-full py-2.5 px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <ShieldAlert size={15} />
                      <span>Disable 2FA (2FA निष्क्रिय गर्नुहोस्)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <Smartphone size={16} className="text-[#1e3a5f]" />
                      <span>How 2FA Works:</span>
                    </p>
                    <ol className="list-decimal list-inside space-y-1 pl-1 text-[11.5px]">
                      <li>Install <strong>Google Authenticator</strong> or <strong>Authy</strong> on your mobile phone.</li>
                      <li>Scan the QR code shown during setup.</li>
                      <li>Enter the 6-digit verification code to lock in your security.</li>
                    </ol>
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleStartSetup}
                    className="w-full py-3 px-4 rounded-xl bg-[#1e3a5f] hover:bg-[#2d5986] text-white font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Shield size={16} />
                    <span>Setup Two-Factor Authentication Now</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: SETUP WIZARD (SCAN QR CODE) ── */}
          {viewState === 'setup' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] uppercase">
                  Step 1 of 2
                </span>
                <h3 className="font-black text-base text-slate-900">Scan QR Code in Authenticator App</h3>
                <p className="text-xs text-slate-500">
                  Google Authenticator वा Authy एप खोली तलको QR कोड स्क्यान गर्नुहोस्
                </p>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48 rounded-xl shadow-xs border bg-white p-2" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded-xl">
                    <span className="text-xs text-gray-400">Loading QR...</span>
                  </div>
                )}

                {/* Manual Code Option */}
                <div className="mt-3 text-center w-full">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Manual Setup Key (यदि क्यामेरा चल्दैन भने):</p>
                  <div className="flex items-center justify-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-xs font-bold text-slate-700">
                    <span className="tracking-wider">{secretKey}</span>
                    <button
                      type="button"
                      onClick={copySecretKey}
                      className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900 cursor-pointer"
                      title="Copy Key"
                    >
                      {copiedKey ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Verify Form */}
              <form onSubmit={handleConfirmEnable} className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 text-center">
                    Enter 6-Digit Code from Authenticator:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    placeholder="123456"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full py-2.5 px-4 text-center font-mono font-black text-xl tracking-widest border-2 border-blue-200 focus:border-[#1e3a5f] rounded-xl focus:outline-none bg-blue-50/20"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setViewState('idle')}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || verifyCode.length !== 6}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check size={16} />
                    <span>Verify & Activate</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── STEP 3: BACKUP CODES DISPLAY ── */}
          {viewState === 'backup_codes' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="inline-flex p-2 bg-emerald-100 text-emerald-800 rounded-full mb-1">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="font-black text-base text-slate-900">Save Your Emergency Backup Codes</h3>
                <p className="text-xs text-slate-500">
                  यी रिकभरी कोडहरू सुरक्षित ठाउँमा राख्नुहोस्। प्रत्येक कोड एक पटक मात्र प्रयोग गर्न सकिन्छ।
                </p>
              </div>

              {/* Codes Grid */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="grid grid-cols-2 gap-2 font-mono text-xs font-black text-slate-800 text-center">
                  {backupCodes.map((code, idx) => (
                    <div key={idx} className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyBackupCodes}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedBackup ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedBackup ? 'Copied!' : 'Copy All'}</span>
                </button>
                <button
                  type="button"
                  onClick={downloadBackupCodes}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Download .TXT</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewState('idle')}
                className="w-full py-3 rounded-xl bg-[#1e3a5f] hover:bg-[#2d5986] text-white font-black text-xs shadow-md transition cursor-pointer mt-2"
              >
                I Have Saved My Backup Codes
              </button>
            </div>
          )}

          {/* ── STEP 4: DISABLE 2FA CONFIRMATION ── */}
          {viewState === 'disable_confirm' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-red-800">Security Warning</p>
                  <p className="mt-0.5 text-red-700">
                    Disabling Two-Factor Authentication will reduce your account's protection level.
                  </p>
                </div>
              </div>

              <form onSubmit={handleDisable2FA} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Enter Account Password:
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      placeholder="Your login password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="text-center text-xs text-slate-400 font-bold">— OR —</div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Enter Current 6-Digit 2FA Code:
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Current 2FA code"
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setViewState('idle')}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || (!disablePassword && !disableCode)}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    Confirm Disable
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
