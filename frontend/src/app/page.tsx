'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  School,
  GraduationCap,
  BookOpen,
  Award,
  Users,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  Bell,
  Shield,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Laptop,
  FlaskConical,
  Library,
  Trophy,
  Bus,
  CheckCircle,
  Menu,
  X,
  LogIn,
  LayoutDashboard,
  Globe,
  Share2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const renderFacilityIcon = (iconName?: string) => {
  switch (iconName) {
    case 'Laptop': return <Laptop size={24} />;
    case 'FlaskConical': return <FlaskConical size={24} />;
    case 'Library': return <Library size={24} />;
    case 'Trophy': return <Trophy size={24} />;
    case 'Shield': return <Shield size={24} />;
    case 'Bus': return <Bus size={24} />;
    case 'BookOpen': return <BookOpen size={24} />;
    case 'Award': return <Award size={24} />;
    case 'Users': return <Users size={24} />;
    default: return <Sparkles size={24} />;
  }
};

export default function SchoolHomePage() {
  const { user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [inquiryForm, setInquiryForm] = useState({
    studentName: '',
    guardianName: '',
    phone: '',
    classLevel: 'Class 11',
    message: '',
  });
  const [inquirySubmitted, setInquirySubmitted] = useState(false);

  // Fetch Public School Profile & Dynamic CMS Data
  const { data: school, isLoading: isSchoolLoading } = useQuery({
    queryKey: ['school-public'],
    queryFn: async () => {
      try {
        const res = await api.get('/school/public');
        return res.data?.data || null;
      } catch (e) {
        return null;
      }
    },
  });

  // Fetch Public Notices
  const { data: notices = [], isLoading: isNoticesLoading } = useQuery({
    queryKey: ['notices-public'],
    queryFn: async () => {
      try {
        const res = await api.get('/notices/public');
        return res.data?.data || [];
      } catch (e) {
        return [];
      }
    },
  });

  // Dynamic School Attributes with clean, professional fallbacks
  const schoolName = school?.name || 'SCHOOL NAME';
  const schoolNameNepali = school?.nameNepali || 'विद्यालयको नाम';
  const schoolAddress = school?.address || school?.addressNepali || 'Nepal';
  const schoolPhone = school?.phone || '+977-9800000000';
  const schoolAltPhone = school?.altPhone || '';
  const schoolEmail = school?.email || 'info@school.edu.np';
  const estYear = school?.estYear || '2060';
  const emisCode = school?.emisCode || '';
  const motto = school?.motto || school?.mottoNepali || 'Quality Education for a Brighter Tomorrow (गुणस्तरीय शिक्षा, समृद्ध भविष्य)';
  const logoUrl = school?.logoUrl || '/school_logo.png';
  const sealUrl = school?.sealUrl || '/school_seal_red.png';

  // CMS Content
  const heroBadge = school?.heroBadge || 'नेपाल सरकार, शिक्षा मन्त्रालयद्वारा मान्यता प्राप्त';
  const heroTitle = school?.heroTitle || schoolName;
  const heroTitleNepali = school?.heroTitleNepali || schoolNameNepali;
  const heroSubtitle = school?.heroSubtitle || motto;

  const aboutTitle = school?.aboutTitle || 'हाम्रो विद्यालयको परिचय (About Our School)';
  const aboutText = school?.aboutText || 'यस विद्यालय स्थापना कालदेखि नै विद्यार्थीहरूको चौतर्फी विकास, नैतिक मूल्य, आधुनिक वैज्ञानिक शिक्षा तथा व्यावहारिक ज्ञान प्रदान गर्न निरन्तर समर्पित छ।';
  const aboutPoints = Array.isArray(school?.aboutPoints) && school.aboutPoints.length > 0
    ? school.aboutPoints
    : [
        'सबल शैक्षिक वातावरण: राष्ट्रिय परीक्षा बोर्ड (NEB) तथा सरकारी पाठ्यक्रममा आधारित उत्कृष्ट शिक्षण पद्धति।',
        'डिजिटल तथा प्रविधिमैत्री: कम्प्युटर ल्याब, स्मार्ट बोर्ड, अनलाइन उपस्थिति तथा अत्याधुनिक ERP व्यवस्थापन।',
        'छात्रवृत्ति सुविधा: जेहेन्दार, विपन्न तथा महिला विद्यार्थीहरूका लागि विशेष छात्रवृत्ति व्यवस्था।',
      ];

  const stats = Array.isArray(school?.stats) && school.stats.length > 0
    ? school.stats
    : [
        { label: 'अध्ययनरत विद्यार्थी (Students)', value: '1,000+' },
        { label: 'अनुभवी शिक्षक/कर्मचारी (Faculty)', value: '40+' },
        { label: 'परीक्षा सफलता (Results)', value: '100%' },
        { label: 'स्थापना वर्ष (Established)', value: `${estYear} B.S.` },
      ];

  const facilities = Array.isArray(school?.facilities) && school.facilities.length > 0
    ? school.facilities
    : [
        { id: '1', title: 'कम्प्युटर तथा आइटी ल्याब', description: 'इन्टरनेट जडित आधुनिक कम्प्युटरहरू तथा प्राविधिक सीप विकास कक्षा।', icon: 'Laptop' },
        { id: '2', title: 'विज्ञान प्रयोगशाला', description: 'भौतिकशास्त्र, रसायनशास्त्र तथा जीवविज्ञानका प्रयोगात्मक कक्षाहरूका लागि पूर्ण सामग्रीयुक्त ल्याब।', icon: 'FlaskConical' },
        { id: '3', title: 'समृद्ध पुस्तकालय', description: 'पाठ्यपुस्तक, सन्दर्भ ग्रन्थ, पत्रपत्रिका तथा सामान्य ज्ञानका हजारौं पुस्तकहरू।', icon: 'Library' },
        { id: '4', title: 'खेलकुद तथा अतिरिक्त क्रियाकलाप', description: 'फुटबल, भलिबल, ब्याडमिन्टन, वादविवाद तथा सांस्कृतिक कार्यक्रमहरू।', icon: 'Trophy' },
        { id: '5', title: 'सुरक्षित वातावरण र सीसीटीभी', description: 'चौबीसै घण्टा सीसीटीभी निगरानी, सुरक्षित कम्पाउन्ड तथा प्राथमिक उपचार।', icon: 'Shield' },
        { id: '6', title: 'यातायात / बस सुविधा', description: 'विद्यार्थीहरूको सुरक्षित आवतजावतका लागि व्यवस्थित यातायात।', icon: 'Bus' },
      ];

  const principalName = school?.principalName || 'Principal';
  const principalNameNepali = school?.principalNameNepali || 'प्रधानाध्यापक';
  const principalPhoto = school?.principalPhotoUrl || '';
  const principalMessage = school?.principalMessage || school?.principalMessageNepali || 'यस विद्यालयमा यहाँहरूलाई हार्दिक स्वागत गर्दछौं। हामी हाम्रा विद्यार्थीहरूलाई चरित्रवान, अनुशासित, सिर्जनशील तथा आधुनिक प्रविधिमा अब्बल बनाउन निरन्तर समर्पित छौं।';

  const chairpersonName = school?.chairpersonName || '';
  const chairpersonNameNepali = school?.chairpersonNameNepali || '';
  const chairpersonPhoto = school?.chairpersonPhotoUrl || '';
  const chairpersonMessage = school?.chairpersonMessage || '';

  const socialLinks = school?.socialLinks || {};
  const admissionInfo = school?.admissionInfo || 'नयाँ शैक्षिक सत्रका लागि भर्ना खुला भएको छ।';

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryForm.studentName || !inquiryForm.phone) {
      toast.error('कृपया विद्यार्थीको नाम र फोन नम्बर भर्नुहोस्');
      return;
    }
    setInquirySubmitted(true);
    toast.success('तपाईंको सोधपुछ सफलतापूर्वक दर्ता भयो! विद्यालय प्रशासनले छिट्टै सम्पर्क गर्नेछ।');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-[#1e3a5f] selection:text-white">
      {/* ── Top Announcement & Contact Bar ── */}
      <div className="bg-[#0f2442] text-slate-200 text-xs py-2 px-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <MapPin size={13} className="text-amber-400 shrink-0" />
              <span>{schoolAddress}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <Phone size={13} className="text-amber-400 shrink-0" />
              <span>{schoolPhone}</span>
            </span>
            {schoolEmail && (
              <span className="hidden md:inline-flex items-center gap-1.5 text-slate-300">
                <Mail size={13} className="text-amber-400 shrink-0" />
                <span>{schoolEmail}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {emisCode && (
              <span className="text-[11px] bg-white/10 px-2.5 py-0.5 rounded-full font-mono text-amber-300 border border-white/10">
                EMIS: {emisCode}
              </span>
            )}
            {estYear && (
              <span className="text-[11px] bg-white/10 px-2.5 py-0.5 rounded-full text-slate-300">
                ESTD: {estYear} B.S.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Sticky Header ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo & School Identity */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-2xs group-hover:scale-105 transition">
              <img
                src={logoUrl}
                alt={schoolName}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/school_logo.png';
                }}
              />
            </div>
            <div>
              <div className="text-base md:text-xl font-black text-[#1e3a5f] leading-tight tracking-tight">
                {schoolName}
              </div>
              <div className="text-xs md:text-sm font-semibold text-rose-700">
                {schoolNameNepali}
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-bold text-slate-700">
            <a href="#home" className="hover:text-[#1e3a5f] transition">गृहपृष्ठ (Home)</a>
            <a href="#about" className="hover:text-[#1e3a5f] transition">परिचय (About)</a>
            <a href="#leadership" className="hover:text-[#1e3a5f] transition">सन्देश (Message)</a>
            <a href="#facilities" className="hover:text-[#1e3a5f] transition">सुविधाहरू (Facilities)</a>
            <a href="#notices" className="hover:text-[#1e3a5f] transition">सूचनाहरू (Notices)</a>
            <a href="#inquiry" className="hover:text-[#1e3a5f] transition">भर्ना सोधपुछ (Admission)</a>
            <a href="#contact" className="hover:text-[#1e3a5f] transition">सम्पर्क (Contact)</a>
          </nav>

          {/* Action / ERP Login Button */}
          <div className="flex items-center gap-2">
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs md:text-sm transition shadow-sm"
              >
                <LayoutDashboard size={15} />
                <span>ड्यासबोर्ड (Dashboard)</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] text-white font-bold text-xs md:text-sm transition shadow-sm"
              >
                <LogIn size={15} />
                <span>ERP लगइन (Login)</span>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 font-semibold text-sm">
            <a onClick={() => setMobileMenuOpen(false)} href="#home" className="block py-1 text-slate-800">गृहपृष्ठ (Home)</a>
            <a onClick={() => setMobileMenuOpen(false)} href="#about" className="block py-1 text-slate-800">परिचय (About)</a>
            <a onClick={() => setMobileMenuOpen(false)} href="#leadership" className="block py-1 text-slate-800">सन्देश (Message)</a>
            <a onClick={() => setMobileMenuOpen(false)} href="#facilities" className="block py-1 text-slate-800">सुविधाहरू (Facilities)</a>
            <a onClick={() => setMobileMenuOpen(false)} href="#notices" className="block py-1 text-slate-800">सूचनाहरू (Notices)</a>
            <a onClick={() => setMobileMenuOpen(false)} href="#inquiry" className="block py-1 text-slate-800">भर्ना सोधपुछ (Admission)</a>
            <a onClick={() => setMobileMenuOpen(false)} href="#contact" className="block py-1 text-slate-800">सम्पर्क (Contact)</a>
          </div>
        )}
      </header>

      {/* ── HERO SECTION ── */}
      <section id="home" className="relative overflow-hidden bg-gradient-to-b from-[#1e3a5f] to-[#0f2442] text-white py-20 md:py-28 px-4">
        <div className="absolute top-0 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-6xl mx-auto text-center relative z-10 space-y-6">
          {heroBadge && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs md:text-sm font-bold text-amber-300">
              <Sparkles size={14} />
              <span>{heroBadge}</span>
            </div>
          )}

          <h1 className="text-3xl md:text-6xl font-black tracking-tight leading-tight uppercase font-serif drop-shadow-md">
            {heroTitle}
          </h1>

          <p className="text-lg md:text-2xl font-bold text-rose-300">
            {heroTitleNepali}
          </p>

          <p className="max-w-3xl mx-auto text-slate-200 text-sm md:text-lg leading-relaxed font-light">
            {heroSubtitle}
          </p>

          {/* Action buttons */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#inquiry"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <span>नयाँ भर्ना सोधपुछ (Admission Open)</span>
              <ArrowRight size={16} />
            </a>

            <a
              href="#notices"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold text-sm transition backdrop-blur-xs"
            >
              <Bell size={16} className="text-amber-300" />
              <span>ताजा सूचनाहरू हेर्नुहोस्</span>
            </a>

            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-md"
            >
              <LogIn size={16} />
              <span>विद्यार्थी/शिक्षक ERP पोर्टल</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS COUNTER BAR ── */}
      <section className="bg-white border-y border-slate-200 py-8 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((st: any, idx: number) => {
            const colors = ['text-[#1e3a5f]', 'text-emerald-700', 'text-amber-600', 'text-rose-700'];
            const colorClass = colors[idx % colors.length];
            return (
              <div key={idx} className="space-y-1">
                <div className={`text-2xl md:text-4xl font-black ${colorClass}`}>{st.value}</div>
                <div className="text-xs md:text-sm font-semibold text-slate-600">{st.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── ABOUT & HIGHLIGHTS ── */}
      <section id="about" className="py-16 md:py-24 px-4 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#1e3a5f] font-extrabold text-xs">
              <School size={14} />
              <span>{aboutTitle}</span>
            </div>

            <h2 className="text-2xl md:text-4xl font-black text-[#1e3a5f] leading-tight">
              {heroTitleNepali || 'गुणस्तरीय शिक्षाको उत्कृष्ट केन्द्र'}
            </h2>

            <p className="text-slate-600 text-sm md:text-base leading-relaxed">
              {aboutText}
            </p>

            <div className="space-y-3 pt-2">
              {aboutPoints.map((pt: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-xs md:text-sm text-slate-700">{pt}</p>
                </div>
              ))}
            </div>
          </div>

          {/* School Emblem & Seal Card */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl flex flex-col items-center text-center space-y-6 relative overflow-hidden">
            <div className="w-36 h-36 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-center p-3 shadow-inner">
              <img
                src={sealUrl}
                alt="School Seal"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/school_seal_red.png';
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="text-lg font-black text-[#1e3a5f] uppercase tracking-wide">
                आधिकारिक शैक्षिक पहिचान
              </div>
              {emisCode && (
                <p className="text-xs text-slate-500 max-w-sm">
                  इमिस कोड (IEMIS Code): <strong className="font-mono text-slate-800">{emisCode}</strong>
                </p>
              )}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs font-semibold text-amber-900">
                &ldquo;विद्या धनं सर्व धनं प्रधानम्&rdquo;
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LEADERSHIP MESSAGES ── */}
      <section id="leadership" className="bg-slate-100 py-16 md:py-20 px-4">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Principal Message */}
          <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-200 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-slate-100 pb-6">
              <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-amber-400 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
                {principalPhoto ? (
                  <img src={principalPhoto} alt={principalName} className="w-full h-full object-cover" />
                ) : (
                  <Users size={36} className="text-[#1e3a5f]" />
                )}
              </div>
              <div className="text-center sm:text-left space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  प्रधानाध्यापकको सन्देश (Message from the Principal)
                </div>
                <h3 className="text-xl md:text-2xl font-black text-[#1e3a5f]">
                  {principalName} {principalNameNepali && `(${principalNameNepali})`}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  प्रधानाध्यापक, {schoolName}
                </p>
              </div>
            </div>

            <div className="text-slate-700 text-sm md:text-base leading-relaxed space-y-4">
              <p className="whitespace-pre-wrap">{principalMessage}</p>
            </div>
          </div>

          {/* Chairperson Message (If configured) */}
          {chairpersonMessage && (
            <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-200 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-slate-100 pb-6">
                <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-blue-500 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
                  {chairpersonPhoto ? (
                    <img src={chairpersonPhoto} alt={chairpersonName} className="w-full h-full object-cover" />
                  ) : (
                    <Users size={36} className="text-[#1e3a5f]" />
                  )}
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-700">
                    विद्यालय व्यवस्थापन समिति (SMC) अध्यक्षको सन्देश
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-[#1e3a5f]">
                    {chairpersonName} {chairpersonNameNepali && `(${chairpersonNameNepali})`}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    अध्यक्ष, विद्यालय व्यवस्थापन समिति, {schoolName}
                  </p>
                </div>
              </div>

              <div className="text-slate-700 text-sm md:text-base leading-relaxed space-y-4">
                <p className="whitespace-pre-wrap">{chairpersonMessage}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── FACILITIES & INFRASTRUCTURE ── */}
      <section id="facilities" className="py-16 md:py-24 px-4 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs">
            <Award size={14} />
            <span>हाम्रा प्रमुख सुविधाहरू</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-[#1e3a5f]">
            अत्याधुनिक शैक्षिक पूर्वाधार तथा सुविधाहरू
          </h2>
          <p className="text-xs md:text-sm text-slate-600">
            विद्यार्थीहरूको समग्र सिकाइ अनुभवलाई सहज, रोचक र प्रभावकारी बनाउन उपलब्ध सुविधाहरू:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((fac: any, idx: number) => (
            <div
              key={fac.id || idx}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition space-y-3"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1e3a5f] flex items-center justify-center font-bold">
                {renderFacilityIcon(fac.icon)}
              </div>
              <h4 className="text-base font-extrabold text-[#1e3a5f]">{fac.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {fac.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PUBLIC NOTICES SECTION ── */}
      <section id="notices" className="bg-slate-100 py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-900 font-bold text-xs mb-2">
                <Bell size={14} />
                <span>आधिकारिक सूचना पाटी</span>
              </div>
              <h2 className="text-2xl md:text-4xl font-black text-[#1e3a5f]">
                विद्यालयका ताजा सूचना तथा परिपत्रहरू
              </h2>
            </div>
            <Link
              href="/login"
              className="text-xs font-bold text-[#1e3a5f] hover:underline inline-flex items-center gap-1"
            >
              <span>सबै सूचना पोर्टलबाट हेर्नुहोस्</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {isNoticesLoading ? (
            <div className="p-12 text-center text-slate-400 font-medium">सूचनाहरू लोड हुँदैछ...</div>
          ) : notices.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200">
              हाल कुनै नयाँ सार्वजनिक सूचना उपलब्ध छैन।
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {notices.map((n: any) => (
                <div
                  key={n.id}
                  onClick={() => setSelectedNotice(n)}
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200 text-[10px]">
                        {n.priority || 'NORMAL'}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-[#1e3a5f] group-hover:text-blue-700 transition line-clamp-2">
                      {n.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {n.content}
                    </p>
                  </div>

                  <div className="text-[11px] font-bold text-blue-700 inline-flex items-center gap-1 group-hover:translate-x-1 transition">
                    <span>विस्तृत विवरण पढ्नुहोस्</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── ADMISSION INQUIRY & CONTACT ── */}
      <section id="inquiry" className="py-16 md:py-24 px-4 max-w-6xl mx-auto">
        <div className="bg-gradient-to-br from-[#1e3a5f] to-[#0f2442] rounded-3xl p-8 md:p-14 text-white shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/20 text-amber-300 font-bold text-xs border border-amber-400/30">
                <GraduationCap size={15} />
                <span>{admissionInfo}</span>
              </div>

              <h2 className="text-2xl md:text-4xl font-black leading-tight tracking-tight">
                आफ्ना बालबालिकाको उज्ज्वल भविष्यका लागि आजै भर्ना सोधपुछ गर्नुहोस्
              </h2>

              <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
                हाम्रो विद्यालयमा आधुनिक पाठ्यक्रममा आधारित उत्कृष्ट सिकाइ वातावरण छ। फारम भरेर पठाउनुहोस्, हाम्रो परामर्श टोलीले तपाईंलाई तुरुन्त सम्पर्क गर्नेछ।
              </p>

              <div className="space-y-3 pt-2 text-xs md:text-sm text-slate-200">
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-amber-400 shrink-0" />
                  <span>सम्पर्क हटलाइन: <strong>{schoolPhone}</strong></span>
                </div>
                {schoolAltPhone && (
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-amber-400 shrink-0" />
                    <span>वैकल्पिक फोन: <strong>{schoolAltPhone}</strong></span>
                  </div>
                )}
                {schoolEmail && (
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-amber-400 shrink-0" />
                    <span>ईमेल: <strong>{schoolEmail}</strong></span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-amber-400 shrink-0" />
                  <span>कार्यालय समय: <strong>आइतबार देखि शुक्रबार (१०:०० AM - ४:०० PM)</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Inquiry Form */}
            <div className="bg-white rounded-2xl p-6 md:p-8 text-slate-800 shadow-xl">
              {inquirySubmitted ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle size={32} />
                  </div>
                  <h4 className="text-lg font-black text-[#1e3a5f]">धन्यवाद! फारम दर्ता भयो</h4>
                  <p className="text-xs text-slate-600">
                    हाम्रो विद्यालय प्रशासनले छिट्टै तपाईंको फोन नम्बर <strong>{inquiryForm.phone}</strong> मा सम्पर्क गर्नेछ।
                  </p>
                  <button
                    onClick={() => {
                      setInquirySubmitted(false);
                      setInquiryForm({ studentName: '', guardianName: '', phone: '', classLevel: 'Class 11', message: '' });
                    }}
                    className="mt-4 px-4 py-2 bg-[#1e3a5f] text-white rounded-xl text-xs font-bold"
                  >
                    अर्को सोधपुछ पठाउनुहोस्
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-4">
                  <h3 className="text-base font-black text-[#1e3a5f]">अनलाइन भर्ना सोधपुछ फारम</h3>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">विद्यार्थीको पूरा नाम *</label>
                    <input
                      type="text"
                      required
                      value={inquiryForm.studentName}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, studentName: e.target.value })}
                      placeholder="Student's Full Name"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">अभिभावकको नाम</label>
                      <input
                        type="text"
                        value={inquiryForm.guardianName}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, guardianName: e.target.value })}
                        placeholder="Guardian Name"
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">सम्पर्क फोन नम्बर *</label>
                      <input
                        type="tel"
                        required
                        value={inquiryForm.phone}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                        placeholder="Phone / Mobile No."
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">भर्ना हुन चाहेको कक्षा</label>
                    <select
                      value={inquiryForm.classLevel}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, classLevel: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                    >
                      <option value="Pre-Primary / Nursery">पूर्व-प्राथमिक (Nursery / KG)</option>
                      <option value="Class 1 to 5">प्राथमिक (Class 1 - 5)</option>
                      <option value="Class 6 to 8">आधारभूत (Class 6 - 8)</option>
                      <option value="Class 9 to 10">माध्यमिक (Class 9 - 10)</option>
                      <option value="Class 11 Science">+2 विज्ञान (Science)</option>
                      <option value="Class 11 Management">+2 व्यवस्थापन (Management)</option>
                      <option value="Class 11 Education/Humanities">+2 शिक्षा / मानविकी</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">सन्देश वा सोधपुछ (वैकल्पिक)</label>
                    <textarea
                      rows={2}
                      value={inquiryForm.message}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                      placeholder="Any specific questions or inquiries..."
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition shadow-md"
                  >
                    सोधपुछ पठाउनुहोस् (Submit Inquiry)
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contact" className="bg-[#0f2442] text-slate-300 border-t border-slate-800 pt-14 pb-8 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
          {/* Col 1: Identity */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white p-1">
                <img src={logoUrl} alt={schoolName} className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="text-base font-black text-white">{schoolName}</div>
                <div className="text-xs font-semibold text-rose-400">{schoolNameNepali}</div>
              </div>
            </div>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              {motto}
            </p>
            <div className="text-xs text-slate-400 space-y-1">
              <div>📍 ठेगाना: {schoolAddress}</div>
              <div>📞 फोन: {schoolPhone}</div>
              {schoolEmail && <div>✉️ ईमेल: {schoolEmail}</div>}
            </div>

            {/* Social Links */}
            {(socialLinks.facebook || socialLinks.youtube || socialLinks.twitter || socialLinks.instagram) && (
              <div className="flex items-center gap-3 pt-2">
                {socialLinks.facebook && (
                  <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white/10 hover:bg-blue-600 text-white transition text-xs">
                    Facebook
                  </a>
                )}
                {socialLinks.youtube && (
                  <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white/10 hover:bg-red-600 text-white transition text-xs">
                    YouTube
                  </a>
                )}
                {socialLinks.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-white/10 hover:bg-pink-600 text-white transition text-xs">
                    Instagram
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-3">
            <h5 className="text-xs font-extrabold uppercase text-white tracking-wider">द्रुत लिङ्कहरू (Quick Links)</h5>
            <ul className="space-y-2 text-xs text-slate-400 font-semibold">
              <li><a href="#home" className="hover:text-white transition">गृहपृष्ठ</a></li>
              <li><a href="#about" className="hover:text-white transition">विद्यालय परिचय</a></li>
              <li><a href="#leadership" className="hover:text-white transition">नेतृत्वको सन्देश</a></li>
              <li><a href="#facilities" className="hover:text-white transition">सुविधाहरू</a></li>
              <li><a href="#notices" className="hover:text-white transition">सूचना पाटी</a></li>
            </ul>
          </div>

          {/* Col 3: Portal Login */}
          <div className="space-y-3">
            <h5 className="text-xs font-extrabold uppercase text-white tracking-wider">ERP व्यवस्थापन प्रणाली</h5>
            <p className="text-xs text-slate-400 leading-relaxed">
              शिक्षक, विद्यार्थी तथा प्रशासनका लागि एकीकृत डिजिटल सफ्टवेयर पोर्टल।
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow"
            >
              <LogIn size={14} />
              <span>ERP पोर्टल प्रवेश गर्नुहोस्</span>
            </Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div>
            © {new Date().getFullYear()} {schoolName}. सर्वाधिकार सुरक्षित। (All Rights Reserved)
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="hover:text-slate-300">गोपनीयता नीति (Privacy)</Link>
            <Link href="/login" className="hover:text-slate-300">कर्मचारी लगइन (Staff Portal)</Link>
          </div>
        </div>
      </footer>

      {/* ── NOTICE VIEW MODAL ── */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedNotice(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Calendar size={13} />
              <span>{new Date(selectedNotice.createdAt).toLocaleDateString()}</span>
              <span className="ml-auto px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 text-[10px]">
                {selectedNotice.priority || 'NORMAL'}
              </span>
            </div>
            <h3 className="text-lg font-black text-[#1e3a5f] leading-snug">
              {selectedNotice.title}
            </h3>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs md:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
              {selectedNotice.content}
            </div>
            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedNotice(null)}
                className="px-5 py-2 bg-[#1e3a5f] text-white rounded-xl text-xs font-bold hover:bg-[#2a5280]"
              >
                बन्द गर्नुहोस् (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
