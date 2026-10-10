'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Globe,
  Sparkles,
  Building,
  Save,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  Users,
  Award,
  BookOpen,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Laptop,
  FlaskConical,
  Library,
  Trophy,
  Shield,
  Bus,
  CheckCircle2,
  RefreshCw,
  Eye,
  Layers,
  Share2,
} from 'lucide-react';

const ICON_OPTIONS = [
  { value: 'Laptop', label: 'Laptop / IT' },
  { value: 'FlaskConical', label: 'Science / Lab' },
  { value: 'Library', label: 'Library' },
  { value: 'Trophy', label: 'Sports / Trophy' },
  { value: 'Shield', label: 'Security / CCTV' },
  { value: 'Bus', label: 'Bus / Transportation' },
  { value: 'BookOpen', label: 'Academics / Book' },
  { value: 'Award', label: 'Scholarship / Award' },
  { value: 'Users', label: 'Community / Student' },
];

export default function WebsiteCMSPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'hero' | 'about' | 'stats' | 'leadership' | 'facilities' | 'contact' | 'social'>('hero');
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Fetch Public / School Data
  const { data: schoolData, isLoading } = useQuery({
    queryKey: ['school-profile-cms'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data || {};
    },
  });

  // State for CMS Form
  const [formData, setFormData] = useState({
    name: '',
    nameNepali: '',
    shortName: '',
    motto: '',
    mottoNepali: '',
    estYear: '',
    emisCode: '',
    logoUrl: '',
    sealUrl: '',

    // Hero Section
    heroBadge: '',
    heroTitle: '',
    heroTitleNepali: '',
    heroSubtitle: '',

    // About Section
    aboutTitle: '',
    aboutText: '',
    aboutPoints: [] as string[],

    // Stats Section
    stats: [] as { label: string; value: string }[],

    // Leadership
    principalName: '',
    principalNameNepali: '',
    principalPhotoUrl: '',
    principalMessage: '',
    chairpersonName: '',
    chairpersonNameNepali: '',
    chairpersonPhotoUrl: '',
    chairpersonMessage: '',

    // Facilities
    facilities: [] as { id: string; title: string; description: string; icon: string }[],

    // Contact & Social
    address: '',
    addressNepali: '',
    phone: '',
    altPhone: '',
    email: '',
    website: '',
    socialLinks: {
      facebook: '',
      youtube: '',
      twitter: '',
      instagram: '',
      mapEmbedUrl: '',
    },
    admissionInfo: '',
  });

  // Load fetched data into state
  useEffect(() => {
    if (schoolData && Object.keys(schoolData).length > 0) {
      setFormData({
        name: schoolData.name || '',
        nameNepali: schoolData.nameNepali || '',
        shortName: schoolData.shortName || '',
        motto: schoolData.motto || '',
        mottoNepali: schoolData.mottoNepali || '',
        estYear: schoolData.estYear || '',
        emisCode: schoolData.emisCode || '',
        logoUrl: schoolData.logoUrl || '',
        sealUrl: schoolData.sealUrl || '',

        heroBadge: schoolData.heroBadge || 'नेपाल सरकार, शिक्षा मन्त्रालयद्वारा मान्यता प्राप्त',
        heroTitle: schoolData.heroTitle || schoolData.name || 'Excellence in Education',
        heroTitleNepali: schoolData.heroTitleNepali || schoolData.nameNepali || 'संस्कारयुक्त तथा गुणस्तरीय शिक्षा',
        heroSubtitle: schoolData.heroSubtitle || schoolData.motto || '',

        aboutTitle: schoolData.aboutTitle || 'हाम्रो विद्यालयको परिचय (About Our School)',
        aboutText: schoolData.aboutText || 'यस विद्यालय स्थापना कालदेखि नै विद्यार्थीहरूको चौतर्फी विकास, नैतिक मूल्य, आधुनिक वैज्ञानिक शिक्षा तथा व्यावहारिक ज्ञान प्रदान गर्न निरन्तर समर्पित छ।',
        aboutPoints: Array.isArray(schoolData.aboutPoints) && schoolData.aboutPoints.length > 0
          ? schoolData.aboutPoints
          : [
              'सबल शैक्षिक वातावरण: राष्ट्रिय परीक्षा बोर्ड (NEB) तथा सरकारी पाठ्यक्रममा आधारित उत्कृष्ट शिक्षण पद्धति।',
              'डिजिटल तथा प्रविधिमैत्री: कम्प्युटर ल्याब, स्मार्ट बोर्ड, अनलाइन उपस्थिति तथा अत्याधुनिक ERP व्यवस्थापन।',
              'छात्रवृत्ति सुविधा: जेहेन्दार, विपन्न तथा महिला विद्यार्थीहरूका लागि विशेष छात्रवृत्ति व्यवस्था।',
            ],

        stats: Array.isArray(schoolData.stats) && schoolData.stats.length > 0
          ? schoolData.stats
          : [
              { label: 'अध्ययनरत विद्यार्थी (Students)', value: '1,200+' },
              { label: 'अनुभवी शिक्षक/कर्मचारी (Faculty)', value: '45+' },
              { label: 'परीक्षा सफलता (Results)', value: '100%' },
              { label: 'स्थापना वर्ष (Established)', value: `${schoolData.estYear || '2060'} B.S.` },
            ],

        principalName: schoolData.principalName || '',
        principalNameNepali: schoolData.principalNameNepali || '',
        principalPhotoUrl: schoolData.principalPhotoUrl || '',
        principalMessage: schoolData.principalMessage || '',

        chairpersonName: schoolData.chairpersonName || '',
        chairpersonNameNepali: schoolData.chairpersonNameNepali || '',
        chairpersonPhotoUrl: schoolData.chairpersonPhotoUrl || '',
        chairpersonMessage: schoolData.chairpersonMessage || '',

        facilities: Array.isArray(schoolData.facilities) && schoolData.facilities.length > 0
          ? schoolData.facilities
          : [
              { id: '1', title: 'कम्प्युटर तथा आइटी ल्याब', description: 'इन्टरनेट जडित आधुनिक कम्प्युटरहरू तथा कोडिङ कक्षा।', icon: 'Laptop' },
              { id: '2', title: 'विज्ञान प्रयोगशाला', description: 'भौतिकशास्त्र, रसायनशास्त्र तथा जीवविज्ञानका प्रयोगात्मक ल्याब।', icon: 'FlaskConical' },
              { id: '3', title: 'समृद्ध पुस्तकालय', description: 'पाठ्यपुस्तक, सन्दर्भ ग्रन्थ, पत्रपत्रिका तथा सामान्य ज्ञान पुस्तकहरू।', icon: 'Library' },
              { id: '4', title: 'खेलकुद तथा अतिरिक्त क्रियाकलाप', description: 'फुटबल, भलिबल, ब्याडमिन्टन तथा अतिरिक्त क्रियाकलाप।', icon: 'Trophy' },
              { id: '5', title: 'सुरक्षित वातावरण र सीसीटीभी', description: 'चौबीसै घण्टा सीसीटीभी निगरानी र सुरक्षित कम्पाउन्ड।', icon: 'Shield' },
              { id: '6', title: 'यातायात / बस सेवा', description: 'विद्यार्थीहरूको सुरक्षित आवतजावतका लागि बस सुविधा।', icon: 'Bus' },
            ],

        address: schoolData.address || '',
        addressNepali: schoolData.addressNepali || '',
        phone: schoolData.phone || '',
        altPhone: schoolData.altPhone || '',
        email: schoolData.email || '',
        website: schoolData.website || '',
        socialLinks: typeof schoolData.socialLinks === 'object' && schoolData.socialLinks !== null
          ? {
              facebook: schoolData.socialLinks.facebook || '',
              youtube: schoolData.socialLinks.youtube || '',
              twitter: schoolData.socialLinks.twitter || '',
              instagram: schoolData.socialLinks.instagram || '',
              mapEmbedUrl: schoolData.socialLinks.mapEmbedUrl || '',
            }
          : { facebook: '', youtube: '', twitter: '', instagram: '', mapEmbedUrl: '' },
        admissionInfo: schoolData.admissionInfo || 'नयाँ शैक्षिक सत्रका लागि भर्ना खुला भएको छ।',
      });
    }
  }, [schoolData]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await api.post('/school/website', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('सार्वजनिक वेबसाइटको विवरण सफलतापूर्वक सुरक्षित भयो! (Website CMS saved!)');
      queryClient.invalidateQueries({ queryKey: ['school-profile-cms'] });
      queryClient.invalidateQueries({ queryKey: ['school-profile'] });
      queryClient.invalidateQueries({ queryKey: ['school-public'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save website content');
    },
  });

  // Handle Asset Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const body = new FormData();
    body.append('file', file);

    setUploadingField(field);
    try {
      const res = await api.post(`/school/upload-asset?type=${type}`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success && res.data.url) {
        setFormData((prev) => ({ ...prev, [field]: res.data.url }));
        toast.success('तस्वीर सफलतापूर्वक अपलोड भयो! (Uploaded successfully)');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'File upload failed');
    } finally {
      setUploadingField(null);
    }
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  // Facilities helpers
  const handleAddFacility = () => {
    setFormData((prev) => ({
      ...prev,
      facilities: [
        ...prev.facilities,
        {
          id: String(Date.now()),
          title: 'नयाँ सुविधा (New Facility)',
          description: 'यस सुविधाको छोटो विवरण यहाँ लेख्नुहोस्...',
          icon: 'Laptop',
        },
      ],
    }));
  };

  const handleUpdateFacility = (index: number, key: string, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.facilities];
      updated[index] = { ...updated[index], [key]: value };
      return { ...prev, facilities: updated };
    });
  };

  const handleDeleteFacility = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      facilities: prev.facilities.filter((_, i) => i !== index),
    }));
  };

  // Stats helpers
  const handleAddStat = () => {
    setFormData((prev) => ({
      ...prev,
      stats: [...prev.stats, { label: 'नयाँ विवरण (Label)', value: '100+' }],
    }));
  };

  const handleUpdateStat = (index: number, key: 'label' | 'value', value: string) => {
    setFormData((prev) => {
      const updated = [...prev.stats];
      updated[index] = { ...updated[index], [key]: value };
      return { ...prev, stats: updated };
    });
  };

  const handleDeleteStat = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      stats: prev.stats.filter((_, i) => i !== index),
    }));
  };

  // About points helpers
  const handleAddAboutPoint = () => {
    setFormData((prev) => ({
      ...prev,
      aboutPoints: [...prev.aboutPoints, 'नयाँ प्रमुख विशेषता...'],
    }));
  };

  const handleUpdateAboutPoint = (index: number, val: string) => {
    setFormData((prev) => {
      const updated = [...prev.aboutPoints];
      updated[index] = val;
      return { ...prev, aboutPoints: updated };
    });
  };

  const handleDeleteAboutPoint = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      aboutPoints: prev.aboutPoints.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Top Banner / Action Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1e3a5f] text-white flex items-center justify-center shadow-md">
            <Globe size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#1e3a5f]">
              Public Website CMS & Brand Studio
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              विद्यालयको आधिकारिक वेबसाइट र ब्रान्डिङ पूर्ण रूपमा परिमार्जन गर्नुहोस् (100% Dynamic)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition shadow-xs"
          >
            <Eye size={14} />
            <span>लाइभ वेबसाइट हेर्नुहोस् (Preview)</span>
            <ExternalLink size={12} className="opacity-60" />
          </a>

          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md disabled:opacity-50"
          >
            {saveMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>परिवर्तन सुरक्षित गर्नुहोस् (Save All)</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-bold text-slate-600">
        <button
          onClick={() => setActiveTab('hero')}
          className={`px-4 py-2.5 rounded-xl transition shrink-0 ${activeTab === 'hero' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'}`}
        >
          १. हेडर तथा मुख्य ब्यानर (Hero)
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2.5 rounded-xl transition shrink-0 ${activeTab === 'stats' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'}`}
        >
          २. तथ्याङ्क तथा काउन्टर (Stats)
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`px-4 py-2.5 rounded-xl transition shrink-0 ${activeTab === 'about' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'}`}
        >
          ३. विद्यालय परिचय (About Us)
        </button>
        <button
          onClick={() => setActiveTab('leadership')}
          className={`px-4 py-2.5 rounded-xl transition shrink-0 ${activeTab === 'leadership' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'}`}
        >
          ४. नेतृत्वको सन्देश (Messages)
        </button>
        <button
          onClick={() => setActiveTab('facilities')}
          className={`px-4 py-2.5 rounded-xl transition shrink-0 ${activeTab === 'facilities' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'}`}
        >
          ५. सुविधाहरू (Facilities)
        </button>
        <button
          onClick={() => setActiveTab('contact')}
          className={`px-4 py-2.5 rounded-xl transition shrink-0 ${activeTab === 'contact' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'hover:bg-slate-100 text-slate-700'}`}
        >
          ६. सम्पर्क तथा सामाजिक सञ्जाल (Contact & Links)
        </button>
      </div>

      {/* ── TAB 1: HERO & BRANDING ── */}
      {activeTab === 'hero' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-extrabold text-[#1e3a5f]">हेडर तथा मुख्य ब्यानर व्यवस्थापन (Hero & Branding)</h2>
            <p className="text-xs text-slate-500">विद्यालयको नाम, मूल मन्त्र (Motto) र गृहपृष्ठको ब्यानर पाठ यहाँ मिलाउनुहोस्</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">विद्यालयको नाम (English) *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. SHREE MODEL SECONDARY SCHOOL"
                className="w-full px-3.5 py-2.5 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">विद्यालयको नाम (नेपालीमा) *</label>
              <input
                type="text"
                value={formData.nameNepali}
                onChange={(e) => setFormData({ ...formData, nameNepali: e.target.value })}
                placeholder="e.g. श्री आदर्श माध्यमिक विद्यालय"
                className="w-full px-3.5 py-2.5 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">स्थापना वर्ष (B.S.)</label>
              <input
                type="text"
                value={formData.estYear}
                onChange={(e) => setFormData({ ...formData, estYear: e.target.value })}
                placeholder="e.g. 2060"
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">IEMIS कोड (EMIS Code)</label>
              <input
                type="text"
                value={formData.emisCode}
                onChange={(e) => setFormData({ ...formData, emisCode: e.target.value })}
                placeholder="e.g. 320160001"
                className="w-full px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">विद्यालयको मूल मन्त्र (Motto / Slogan)</label>
              <input
                type="text"
                value={formData.motto}
                onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
                placeholder="e.g. Quality Education for a Brighter Tomorrow (गुणस्तरीय शिक्षा, समृद्ध भविष्य)"
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">मान्यता प्राप्त ब्याड्ज (Accreditation Badge)</label>
              <input
                type="text"
                value={formData.heroBadge}
                onChange={(e) => setFormData({ ...formData, heroBadge: e.target.value })}
                placeholder="e.g. नेपाल सरकार, शिक्षा मन्त्रालयद्वारा मान्यता प्राप्त"
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ब्यानर मुख्य शीर्षक (Hero Title)</label>
              <input
                type="text"
                value={formData.heroTitle}
                onChange={(e) => setFormData({ ...formData, heroTitle: e.target.value })}
                placeholder="e.g. Excellence in Education & Character Building"
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ब्यानर नेपाली शीर्षक (Hero Title Nepali)</label>
              <input
                type="text"
                value={formData.heroTitleNepali}
                onChange={(e) => setFormData({ ...formData, heroTitleNepali: e.target.value })}
                placeholder="e.g. संस्कारयुक्त, प्रविधिमैत्री तथा गुणस्तरीय शिक्षाको उत्कृष्ट केन्द्र"
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">ब्यानर उपशीर्षक (Hero Subtitle / Description)</label>
              <textarea
                rows={3}
                value={formData.heroSubtitle}
                onChange={(e) => setFormData({ ...formData, heroSubtitle: e.target.value })}
                placeholder="A welcoming invitation and description of educational vision..."
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>

            {/* Logo and Seal Uploads */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <span className="block text-xs font-bold text-slate-700">विद्यालयको लोगो (School Logo)</span>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white border border-slate-300 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  {formData.logoUrl ? (
                    <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="space-y-1.5 flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    id="logo-upload"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'logoUrl', 'logo')}
                  />
                  <label
                    htmlFor="logo-upload"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f] hover:bg-[#2a5280] text-white text-xs font-bold rounded-lg cursor-pointer transition shadow-2xs"
                  >
                    <Upload size={13} />
                    <span>{uploadingField === 'logoUrl' ? 'अपलोड हुँदैछ...' : 'लोगो छान्नुहोस्'}</span>
                  </label>
                  <p className="text-[10px] text-slate-400">PNG, JPG वा WEBP (पारदर्शी पृष्ठभूमि सिफारिस गरिन्छ)</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <span className="block text-xs font-bold text-slate-700">विद्यालयको आधिकारिक छाप / सिल (Official Seal)</span>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white border border-slate-300 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  {formData.sealUrl ? (
                    <img src={formData.sealUrl} alt="Seal" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="space-y-1.5 flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    id="seal-upload"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'sealUrl', 'seal')}
                  />
                  <label
                    htmlFor="seal-upload"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg cursor-pointer transition shadow-2xs"
                  >
                    <Upload size={13} />
                    <span>{uploadingField === 'sealUrl' ? 'अपलोड हुँदैछ...' : 'छाप छान्नुहोस्'}</span>
                  </label>
                  <p className="text-[10px] text-slate-400">रातो वा निलो आधिकारिक छाप (Round Red/Blue Seal)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: STATS ── */}
      {activeTab === 'stats' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-[#1e3a5f]">तथ्याङ्क तथा काउन्टरहरू (Statistics & Numbers)</h2>
              <p className="text-xs text-slate-500">गृहपृष्ठमा देखिने विद्यार्थी संख्या, शिक्षक संख्या, नतिजा तथा अनुभव विवरण</p>
            </div>
            <button
              onClick={handleAddStat}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1e3a5f] font-bold text-xs transition"
            >
              <Plus size={14} />
              <span>नयाँ काउन्टर थप्नुहोस्</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.stats.map((st, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={st.value}
                    onChange={(e) => handleUpdateStat(idx, 'value', e.target.value)}
                    placeholder="e.g. 1,200+ or 100%"
                    className="w-full px-3 py-1.5 text-sm font-black text-[#1e3a5f] border border-slate-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={st.label}
                    onChange={(e) => handleUpdateStat(idx, 'label', e.target.value)}
                    placeholder="e.g. अध्ययनरत विद्यार्थी (Students)"
                    className="w-full px-3 py-1.5 text-xs text-slate-700 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <button
                  onClick={() => handleDeleteStat(idx)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: ABOUT US ── */}
      {activeTab === 'about' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-extrabold text-[#1e3a5f]">विद्यालय परिचय तथा विशेषता (About Us & Highlights)</h2>
            <p className="text-xs text-slate-500">विद्यालयको संक्षिप्त इतिहास, विशेषता तथा प्रमुख बुँदाहरू</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">परिचय शीर्षक (Section Title)</label>
              <input
                type="text"
                value={formData.aboutTitle}
                onChange={(e) => setFormData({ ...formData, aboutTitle: e.target.value })}
                placeholder="हाम्रो विद्यालयको परिचय (About Our School)"
                className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">विस्तृत परिचय विवरण (About Us Text)</label>
              <textarea
                rows={4}
                value={formData.aboutText}
                onChange={(e) => setFormData({ ...formData, aboutText: e.target.value })}
                placeholder="यस विद्यालयको स्थापना, उद्देश्य र उपलब्धिका बारेमा लेख्नुहोस्..."
                className="w-full px-3.5 py-2.5 text-xs leading-relaxed border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>

            {/* Bullet Highlights */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">प्रमुख विशेषता बुँदाहरू (Key Highlight Bullets)</label>
                <button
                  onClick={handleAddAboutPoint}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline"
                >
                  <Plus size={13} />
                  <span>बुँदा थप्नुहोस्</span>
                </button>
              </div>

              <div className="space-y-2">
                {formData.aboutPoints.map((pt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={pt}
                      onChange={(e) => handleUpdateAboutPoint(idx, e.target.value)}
                      className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white"
                    />
                    <button
                      onClick={() => handleDeleteAboutPoint(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: LEADERSHIP MESSAGES ── */}
      {activeTab === 'leadership' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8">
          {/* Principal */}
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[#1e3a5f]">प्रधानाध्यापकको सन्देश (Message from the Principal)</h3>
                <p className="text-xs text-slate-500">प्रधानाध्यापकको नाम, तस्विर र आधिकारिक सन्देश</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">प्रधानाध्यापकको नाम (English)</label>
                <input
                  type="text"
                  value={formData.principalName}
                  onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                  placeholder="e.g. Ram Kumar Sharma"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">प्रधानाध्यापकको नाम (नेपालीमा)</label>
                <input
                  type="text"
                  value={formData.principalNameNepali}
                  onChange={(e) => setFormData({ ...formData, principalNameNepali: e.target.value })}
                  placeholder="e.g. राम कुमार शर्मा"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              {/* Photo Upload */}
              <div className="md:col-span-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                  {formData.principalPhotoUrl ? (
                    <img src={formData.principalPhotoUrl} alt="Principal" className="w-full h-full object-cover" />
                  ) : (
                    <Users size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <input
                    type="file"
                    accept="image/*"
                    id="principal-photo-upload"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'principalPhotoUrl', 'principal')}
                  />
                  <label
                    htmlFor="principal-photo-upload"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    <Upload size={12} />
                    <span>{uploadingField === 'principalPhotoUrl' ? 'अपलोड हुँदैछ...' : 'तस्वीर अपलोड गर्नुहोस्'}</span>
                  </label>
                  <p className="text-[10px] text-slate-400">पासपोर्ट साइज वा स्पष्ट तस्विर</p>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">प्रधानाध्यापकको सन्देश पाठ (Message Body)</label>
                <textarea
                  rows={4}
                  value={formData.principalMessage}
                  onChange={(e) => setFormData({ ...formData, principalMessage: e.target.value })}
                  placeholder="आदरणीय अभिभावक, प्यारा विद्यार्थी भाइबहिनीहरू तथा शुभचिन्तक महानुभावहरू..."
                  className="w-full px-3.5 py-2.5 text-xs leading-relaxed border border-slate-300 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* SMC Chairperson / Adhyaksha */}
          <div className="space-y-5 pt-4 border-t border-slate-200">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-[#1e3a5f]">विद्यालय व्यवस्थापन समिति (SMC) अध्यक्षको सन्देश</h3>
              <p className="text-xs text-slate-500">अध्यक्षको नाम, तस्विर र सन्देश (ऐच्छिक)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">अध्यक्षको नाम (English)</label>
                <input
                  type="text"
                  value={formData.chairpersonName}
                  onChange={(e) => setFormData({ ...formData, chairpersonName: e.target.value })}
                  placeholder="e.g. Hari Prasad Pokhrel"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">अध्यक्षको नाम (नेपालीमा)</label>
                <input
                  type="text"
                  value={formData.chairpersonNameNepali}
                  onChange={(e) => setFormData({ ...formData, chairpersonNameNepali: e.target.value })}
                  placeholder="e.g. हरि प्रसाद पोखरेल"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              {/* Photo Upload */}
              <div className="md:col-span-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                  {formData.chairpersonPhotoUrl ? (
                    <img src={formData.chairpersonPhotoUrl} alt="Chairperson" className="w-full h-full object-cover" />
                  ) : (
                    <Users size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <input
                    type="file"
                    accept="image/*"
                    id="chair-photo-upload"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'chairpersonPhotoUrl', 'chairperson')}
                  />
                  <label
                    htmlFor="chair-photo-upload"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    <Upload size={12} />
                    <span>{uploadingField === 'chairpersonPhotoUrl' ? 'अपलोड हुँदैछ...' : 'तस्वीर अपलोड गर्नुहोस्'}</span>
                  </label>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">अध्यक्षको सन्देश (Chairperson Message)</label>
                <textarea
                  rows={3}
                  value={formData.chairpersonMessage}
                  onChange={(e) => setFormData({ ...formData, chairpersonMessage: e.target.value })}
                  placeholder="विद्यालय व्यवस्थापन समिति अध्यक्षको शुभकामना तथा सन्देश..."
                  className="w-full px-3.5 py-2.5 text-xs leading-relaxed border border-slate-300 rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: FACILITIES ── */}
      {activeTab === 'facilities' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-[#1e3a5f]">सुविधा तथा पूर्वाधार व्यवस्थापन (Facilities & Amenities)</h2>
              <p className="text-xs text-slate-500">कम्प्युटर ल्याब, विज्ञान ल्याब, पुस्तकालय, खेलकुद, सीसीटीभी, बस आदि सुविधाहरू</p>
            </div>
            <button
              onClick={handleAddFacility}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1e3a5f] font-bold text-xs transition"
            >
              <Plus size={14} />
              <span>नयाँ सुविधा थप्नुहोस्</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {formData.facilities.map((fac, idx) => (
              <div key={fac.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative group">
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={fac.icon || 'Laptop'}
                    onChange={(e) => handleUpdateFacility(idx, 'icon', e.target.value)}
                    className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 rounded-lg"
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleDeleteFacility(idx)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">सुविधाको नाम (Title)</label>
                  <input
                    type="text"
                    value={fac.title}
                    onChange={(e) => handleUpdateFacility(idx, 'title', e.target.value)}
                    placeholder="e.g. कम्प्युटर तथा आइटी ल्याब"
                    className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">छोटो विवरण (Description)</label>
                  <textarea
                    rows={2}
                    value={fac.description}
                    onChange={(e) => handleUpdateFacility(idx, 'description', e.target.value)}
                    placeholder="सुविधाको विवरण यहाँ लेख्नुहोस्..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 6: CONTACT & SOCIAL ── */}
      {activeTab === 'contact' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-extrabold text-[#1e3a5f]">सम्पर्क, ठेगाना तथा सामाजिक सञ्जाल लिङ्कहरू (Contact & Social)</h2>
            <p className="text-xs text-slate-500">फोन, ईमेल, ठेगाना, फेसबुक, युट्युब र गुगल म्याप लिङ्कहरू</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ठेगाना (Address in English)</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Bishrampur, Rautahat, Madhesh Province, Nepal"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ठेगाना (नेपालीमा)</label>
              <input
                type="text"
                value={formData.addressNepali}
                onChange={(e) => setFormData({ ...formData, addressNepali: e.target.value })}
                placeholder="e.g. विश्रामपुर, रौतहट, मधेश प्रदेश"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">मुख्य फोन / सम्पर्क नम्बर (Phone)</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+977-9800000000"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">वैकल्पिक फोन (Alt Phone)</label>
              <input
                type="text"
                value={formData.altPhone}
                onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                placeholder="+977-01-4000000"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">आधिकारिक ईमेल (Email)</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="info@school.edu.np"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">आधिकारिक डोमेन / वेबसाइट URL (Website Domain)</label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://myschool.edu.np"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>

            {/* Social Links */}
            <div className="md:col-span-2 pt-3 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">सामाजिक सञ्जाल तथा म्याप (Social Links & Map)</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">फेसबुक पेज लिङ्क (Facebook URL)</label>
                  <input
                    type="text"
                    value={formData.socialLinks.facebook}
                    onChange={(e) => setFormData({
                      ...formData,
                      socialLinks: { ...formData.socialLinks, facebook: e.target.value }
                    })}
                    placeholder="https://facebook.com/your-school"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">युट्युब च्यानल (YouTube URL)</label>
                  <input
                    type="text"
                    value={formData.socialLinks.youtube}
                    onChange={(e) => setFormData({
                      ...formData,
                      socialLinks: { ...formData.socialLinks, youtube: e.target.value }
                    })}
                    placeholder="https://youtube.com/@your-school"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">इन्स्टाग्राम / ट्विटर (Instagram / X)</label>
                  <input
                    type="text"
                    value={formData.socialLinks.instagram}
                    onChange={(e) => setFormData({
                      ...formData,
                      socialLinks: { ...formData.socialLinks, instagram: e.target.value }
                    })}
                    placeholder="https://instagram.com/your-school"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">गुगल म्याप Embed URL (Google Map Link)</label>
                  <input
                    type="text"
                    value={formData.socialLinks.mapEmbedUrl}
                    onChange={(e) => setFormData({
                      ...formData,
                      socialLinks: { ...formData.socialLinks, mapEmbedUrl: e.target.value }
                    })}
                    placeholder="Google Maps Embed URL"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">भर्ना सोधपुछ सूचना (Admission Notice)</label>
              <textarea
                rows={2}
                value={formData.admissionInfo}
                onChange={(e) => setFormData({ ...formData, admissionInfo: e.target.value })}
                placeholder="शैक्षिक सत्रका लागि नयाँ भर्ना खुला सम्बन्धी जानकारी..."
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating / Sticky Bottom Save Bar */}
      <div className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-slate-200 shadow-xl flex items-center justify-between gap-4">
        <p className="text-xs text-slate-600 hidden sm:block">
          💡 सबै परिवर्तनहरू तुरुन्तै सार्वजनिक वेबसाइट तथा ERP पोर्टलमा लागू हुनेछन्।
        </p>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
          >
            <Eye size={13} />
            <span>Preview Website</span>
          </a>

          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black inline-flex items-center gap-2 transition shadow-md disabled:opacity-50"
          >
            {saveMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Save Website Content</span>
          </button>
        </div>
      </div>
    </div>
  );
}
