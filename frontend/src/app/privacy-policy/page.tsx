'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Eye,
  FileText,
  School,
  Mail,
  Phone,
  MapPin,
  Globe,
  Trash2,
  AlertCircle,
  Database,
  Camera,
  FolderLock,
  UserCheck,
} from 'lucide-react';

export default function PrivacyPolicyPage() {
  const { data: school } = useQuery({
    queryKey: ['school-public-privacy'],
    queryFn: async () => {
      try {
        const res = await api.get('/school/public');
        return res.data?.data || null;
      } catch {
        return null;
      }
    },
  });

  const schoolName = school?.name || 'School ERP';
  const schoolNameNepali = school?.nameNepali || 'विद्यालय व्यवस्थापन';
  const schoolAddress = school?.address || 'Nepal';
  const schoolEmail = school?.email || 'info@school.edu.np';
  const schoolPhone = school?.phone || '+977-9800000000';
  const schoolWebsite = school?.website || '/';
  const principalName = school?.principalName || 'School Administration';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#1e3a5f] via-[#142d4c] to-[#0f243e] p-8 sm:p-10 text-white relative overflow-hidden">
          <div className="relative z-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-amber-300 hover:text-amber-200 mb-5 transition bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-xs"
            >
              <ArrowLeft size={14} />
              <span>गृहपृष्ठमा फर्कनुहोस् (Back to Home)</span>
            </Link>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
                <ShieldCheck className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Privacy Policy & Data Protection
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm font-medium mt-1">
                  {schoolName} ({schoolNameNepali}) Mobile Application & Web ERP
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-300 pt-4 mt-2 border-t border-white/10">
              <span><strong>Effective Date:</strong> Baisakh 1, 2081 B.S.</span>
              <span>•</span>
              <span><strong>Updated:</strong> 2083 B.S.</span>
              <span>•</span>
              <a
                href={schoolWebsite}
                target="_blank"
                rel="noreferrer"
                className="text-amber-300 hover:underline flex items-center gap-1 font-semibold"
              >
                <Globe size={13} />
                <span>{schoolWebsite.replace(/^https?:\/\//, '').replace(/\/$/, '') || 'School Website'}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-10 space-y-10 text-sm leading-relaxed text-slate-700">
          {/* Quick Summary Card */}
          <div className="rounded-2xl bg-blue-50/70 border border-blue-100 p-5 space-y-2">
            <div className="flex items-center gap-2 text-[#1e3a5f] font-bold text-sm">
              <AlertCircle size={18} className="text-blue-600 shrink-0" />
              <span>Privacy Overview & Commitment</span>
            </div>
            <p className="text-xs text-slate-600 leading-normal">
              <strong>{schoolName}</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;the School&quot;) is committed to safeguarding the privacy and security of students, parents, teachers, and school administrators using the School ERP application and web portal. We do not sell user data or display third-party advertisements. Data is solely used to facilitate school education, attendance, exam grading, academic reporting, and official Government of Nepal IEMIS record keeping.
            </p>
          </div>

          {/* Section 1: Introduction & App Identity */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#1e3a5f] flex items-center gap-2 border-b border-slate-100 pb-2">
              <School size={20} className="text-amber-600" />
              <span>1. Application Identity & Organization Details (परिचय)</span>
            </h2>
            <p>
              This Privacy Policy applies to the mobile application and associated web ERP portal maintained for:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="font-bold text-slate-800 block">Institution Name:</span>
                <span>{schoolName} {schoolNameNepali && `(${schoolNameNepali})`}</span>
              </div>
              <div>
                <span className="font-bold text-slate-800 block">Location:</span>
                <span>{schoolAddress}</span>
              </div>
              <div>
                <span className="font-bold text-slate-800 block">Official Website:</span>
                <a href={schoolWebsite} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline">
                  {schoolWebsite}
                </a>
              </div>
              <div>
                <span className="font-bold text-slate-800 block">Contact Email:</span>
                <span className="font-mono">{schoolEmail}</span>
              </div>
            </div>
          </section>

          {/* Section 2: Data Collected */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#1e3a5f] flex items-center gap-2 border-b border-slate-100 pb-2">
              <Database size={20} className="text-blue-600" />
              <span>2. Information We Collect (संकलन गरिने विवरण)</span>
            </h2>
            <p>
              To provide academic management, exam results, attendance tracking, and administrative services, we process the following data provided directly by school administrators, teachers, and students:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs sm:text-sm">
              <li><strong>Student Profile:</strong> Full name, date of birth (B.S./A.D.), gender, guardian contact information, class, section, roll number, student ID.</li>
              <li><strong>Academic Records:</strong> Marks, grades, exam attendance, teacher observations, report cards, and character certificate records.</li>
              <li><strong>Attendance Data:</strong> Daily attendance status (present, absent, leave, holiday) recorded by teachers or administrators.</li>
              <li><strong>Staff Information:</strong> Name, phone number, email address, role, salary and attendance records for administrative payroll processing.</li>
            </ul>
          </section>

          {/* Section 3: Data Security */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#1e3a5f] flex items-center gap-2 border-b border-slate-100 pb-2">
              <Lock size={20} className="text-emerald-600" />
              <span>3. Data Security & Storage (तथ्याङ्क सुरक्षा)</span>
            </h2>
            <p>
              We implement industry-standard encryption, role-based access control (RBAC), and multi-factor authentication (2FA) to protect all institutional and personal data.
            </p>
          </section>

          {/* Section 4: Contact Us */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-[#1e3a5f] flex items-center gap-2 border-b border-slate-100 pb-2">
              <Mail size={20} className="text-blue-600" />
              <span>4. Contact & Grievance Officer (सम्पर्क)</span>
            </h2>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-700">
                <School size={14} className="text-[#1e3a5f] shrink-0" />
                <span><strong>{schoolName}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin size={14} className="text-rose-600 shrink-0" />
                <span>{schoolAddress}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Mail size={14} className="text-amber-600 shrink-0" />
                <span>Email: <a href={`mailto:${schoolEmail}`} className="font-mono text-blue-600 hover:underline">{schoolEmail}</a></span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Phone size={14} className="text-emerald-600 shrink-0" />
                <span>Phone / Headmaster: {principalName} ({schoolPhone})</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Globe size={14} className="text-indigo-600 shrink-0" />
                <span>Website: <a href={schoolWebsite} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold hover:underline">{schoolWebsite}</a></span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 p-5 text-center text-xs text-slate-500 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} {schoolName}. All rights reserved.</span>
          <a href={schoolWebsite} target="_blank" rel="noreferrer" className="text-[#1e3a5f] font-bold hover:underline">
            {schoolWebsite.replace(/^https?:\/\//, '').replace(/\/$/, '') || 'School Website'}
          </a>
        </div>
      </div>
    </div>
  );
}
