'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS, bsToAD, adToBS } from '@/lib/nepali-date';
import {
  NEPAL_PROVINCES,
  getDistrictsByProvince,
  getLocalLevelsByDistrict,
  NEPAL_LOCAL_LEVELS,
} from '@/lib/nepal-753-locations';
import {
  Award,
  Printer,
  Search,
  Plus,
  FileText,
  X,
  School,
  CheckCircle2,
  Sliders,
  Sparkles,
  Save,
  RotateCcw,
  Eye,
  Type,
  Layout,
  Check,
  MapPin,
  Calendar,
  UserCheck,
  UserPlus,
  ChevronDown,
  Camera,
  Upload,
  Image as ImageIcon,
  Bookmark,
  FolderPlus,
  Trash2,
  Edit3,
  CheckCircle,
  Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import CertificatePhotoModal from '@/components/CertificatePhotoModal';

// Curated Rich Typography Options
export const CERTIFICATE_FONTS = [
  { id: 'algerian', name: 'Algerian (Ornate Engraved Capital)', family: 'Algerian, "Cinzel Decorative", "Playfair Display", serif' },
  { id: 'amasis', name: 'Amasis MT Pro (Humanist Book Serif)', family: '"Amasis MT Pro", "Amasis MT", "Merriweather", Georgia, serif' },
  { id: 'times', name: 'Times New Roman (Traditional Official)', family: '"Times New Roman", Times, "Noto Serif", serif' },
  { id: 'agency-fb', name: 'Agency FB (Condensed Architectural)', family: '"Agency FB", "Oswald", "Bebas Neue", sans-serif' },
  { id: 'georgia', name: 'Georgia (Classic Formal Serif)', family: 'Georgia, serif' },
  { id: 'cinzel', name: 'Cinzel (Royal Roman Classical)', family: '"Cinzel", serif' },
  { id: 'cinzel-dec', name: 'Cinzel Decorative (Ornate Heading)', family: '"Cinzel Decorative", cursive, serif' },
  { id: 'playfair', name: 'Playfair Display (Luxury High-Contrast)', family: '"Playfair Display", serif' },
  { id: 'great-vibes', name: 'Great Vibes (Flowing Calligraphy)', family: '"Great Vibes", cursive' },
  { id: 'alex-brush', name: 'Alex Brush (Elegant Script)', family: '"Alex Brush", cursive' },
  { id: 'merriweather', name: 'Merriweather (Readable Book Serif)', family: '"Merriweather", serif' },
  { id: 'eb-garamond', name: 'EB Garamond (Old Style Renaissance)', family: '"EB Garamond", serif' },
  { id: 'noto-devanagari', name: 'Noto Serif Devanagari (नेपाली/देवनागरी)', family: '"Noto Serif Devanagari", serif' },
  { id: 'mukta', name: 'Mukta (Modern Nepali/Devanagari)', family: '"Mukta", sans-serif' },
  { id: 'montserrat', name: 'Montserrat (Geometric Modern Sans)', family: '"Montserrat", sans-serif' },
  { id: 'poppins', name: 'Poppins (Clean Bold Sans)', family: '"Poppins", sans-serif' },
  { id: 'courier-prime', name: 'Courier Prime (Official Monospace)', family: '"Courier Prime", monospace' },
];

export interface CertLayoutConfig {
  pagePaddingTopMm: number;
  pagePaddingBottomMm: number;
  pagePaddingSideMm: number;

  schoolNameText: string;
  schoolAddressText: string;
  schoolProvinceText: string;
  schoolEstdText: string;

  schoolTitleFont: string;
  schoolTitleSize: number;
  schoolTitleColor: string;
  schoolTitleLetterSpacing: number;
  schoolTitleWeight: string;

  schoolSubtitleFont: string;
  schoolSubtitleSize: number;
  schoolSubtitleColor: string;

  schoolProvinceFont: string;
  schoolProvinceSize: number;
  schoolProvinceColor: string;

  schoolEstdFont: string;
  schoolEstdSize: number;
  schoolEstdColor: string;

  headerSpacingBottom: number;

  showIemisBadge: boolean;
  iemisBadgeText: string;
  iemisBadgeSize: number;
  iemisBadgeColor: string;
  showSeal: boolean;
  sealSize: number;
  customSealUrl?: string;

  // Background Customization & High Quality Options
  backgroundMode: 'default' | 'custom' | 'none' | 'ornate-border';
  customBackgroundUrl?: string;
  bgApplyToAll: boolean;
  bgApplyToBonafide: boolean;
  bgApplyToAppreciation: boolean;

  certTitleFont: string;
  certTitleSize: number;
  certTitleColor: string;
  certTitleLetterSpacing: number;
  certTitleTextTransform: 'uppercase' | 'none' | 'capitalize';
  certTitleShadow: boolean;
  certTitleMarginTop: number;
  certTitleMarginBottom: number;

  showPhotoFrame: boolean;
  photoFrameWidth: number;
  photoFrameHeight: number;
  photoFrameBorderColor: string;
  photoFrameBorderRadius: number;
  photoOffsetX: number;
  photoOffsetY: number;

  bodyFont: string;
  bodyFontSizeP1: number;
  bodyFontSizeP2: number;
  bodyFontSizeP3: number;
  bodyLineHeight: number;
  bodyTextColor: string;
  bodyTextAlign: 'justify' | 'left' | 'center';
  bodyIndent: number;
  bodyIndentP1: number;
  bodyIndentP2: number;
  bodyIndentP3: number;
  bodyParagraphSpacing: number;

  showParticularsBox: boolean;
  particularsFont: string;
  particularsFontSize: number;
  particularsColor: string;
  particularsLayout: 'vertical' | 'horizontal';
  particularsMarginTop: number;
  particularsMarginBottom: number;

  footerMarginTop: number;
  sigLineStyle: 'none' | 'clean-line' | 'solid-underline';
  sigFont: string;
  sigFontSize: number;
  sigTextColor: string;
  preparedByLabel: string;
  sealCenterLabel: string;
  principalLabel: string;

  showDateOfIssue: boolean;
  dateOfIssuePosition: 'left' | 'right' | 'center';
  dateOfIssueFontSize: number;
  dateOfIssueColor: string;
}

const DEFAULT_LAYOUT_CONFIG: CertLayoutConfig = {
  pagePaddingTopMm: 16,
  pagePaddingBottomMm: 12,
  pagePaddingSideMm: 24,

  schoolNameText: 'NEPAL SECONDARY SCHOOL',
  schoolAddressText: 'BRINDAWAN - 02, BISHRAMPUR, RAUTAHAT',
  schoolProvinceText: 'MADHESH PROVINCE, NEPAL',
  schoolEstdText: 'ESTD: 2007 B.S.',

  schoolTitleFont: 'Algerian, "Cinzel Decorative", "Playfair Display", serif',
  schoolTitleSize: 32,
  schoolTitleColor: '#dc2626',
  schoolTitleLetterSpacing: 1.0,
  schoolTitleWeight: '900',

  schoolSubtitleFont: '"Times New Roman", Times, "Noto Serif", serif',
  schoolSubtitleSize: 12.5,
  schoolSubtitleColor: '#1e3a5f',

  schoolProvinceFont: '"Times New Roman", Times, "Noto Serif", serif',
  schoolProvinceSize: 10.5,
  schoolProvinceColor: '#1e3a5f',

  schoolEstdFont: '"Times New Roman", Times, "Noto Serif", serif',
  schoolEstdSize: 11,
  schoolEstdColor: '#1e3a5f',

  headerSpacingBottom: 4,

  showIemisBadge: true,
  iemisBadgeText: 'IEMIS',
  iemisBadgeSize: 10.5,
  iemisBadgeColor: '#0284c7',
  showSeal: true,
  sealSize: 110,
  customSealUrl: '',

  backgroundMode: 'default',
  customBackgroundUrl: '',
  bgApplyToAll: true,
  bgApplyToBonafide: true,
  bgApplyToAppreciation: true,

  certTitleFont: 'Algerian, "Cinzel Decorative", "Playfair Display", serif',
  certTitleSize: 18,
  certTitleColor: '#581c87',
  certTitleLetterSpacing: 2.5,
  certTitleTextTransform: 'uppercase',
  certTitleShadow: true,
  certTitleMarginTop: 10,
  certTitleMarginBottom: 6,

  showPhotoFrame: true,
  photoFrameWidth: 88,
  photoFrameHeight: 108,
  photoFrameBorderColor: '#1f2937',
  photoFrameBorderRadius: 2,
  photoOffsetX: 0,
  photoOffsetY: 0,

  bodyFont: '"Amasis MT Pro", "Amasis MT", "Merriweather", Georgia, serif',
  bodyFontSizeP1: 13.5,
  bodyFontSizeP2: 13.5,
  bodyFontSizeP3: 13.5,
  bodyLineHeight: 2.1,
  bodyTextColor: '#111827',
  bodyTextAlign: 'justify',
  bodyIndent: 28,
  bodyIndentP1: 28,
  bodyIndentP2: 28,
  bodyIndentP3: 28,
  bodyParagraphSpacing: 6,

  showParticularsBox: true,
  particularsFont: 'sans-serif',
  particularsFontSize: 12,
  particularsColor: '#1e3a5f',
  particularsLayout: 'vertical',
  particularsMarginTop: 4,
  particularsMarginBottom: 8,

  footerMarginTop: 14,
  sigLineStyle: 'none',
  sigFont: 'Algerian, "Cinzel Decorative", "Playfair Display", serif',
  sigFontSize: 12,
  sigTextColor: '#86198f',
  preparedByLabel: 'Prepared By:',
  sealCenterLabel: 'Seal of School',
  principalLabel: 'Principal',

  showDateOfIssue: true,
  dateOfIssuePosition: 'left',
  dateOfIssueFontSize: 10.5,
  dateOfIssueColor: '#111827',
};

export interface SavedLayoutProfile {
  id: string;
  name: string;
  icon?: string;
  isCustom?: boolean;
  updatedAt: string;
  config: CertLayoutConfig;
}

export const DEFAULT_SAVED_PROFILES: SavedLayoutProfile[] = [
  {
    id: 'preset-nssb',
    name: 'NSSB',
    icon: '🎨',
    isCustom: true,
    updatedAt: '2083/01/01',
    config: DEFAULT_LAYOUT_CONFIG,
  },
];

export default function CertificatesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'issue' | 'history'>('issue');
  const [certType, setCertType] = useState<'CHARACTER' | 'TRANSFER' | 'BONAFIDE' | 'APPRECIATION'>('CHARACTER');

  // Single Persistent School Layout & Font Customization State (NSSB)
  const [layoutConfig, setLayoutConfig] = useState<CertLayoutConfig>(DEFAULT_LAYOUT_CONFIG);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [showLayoutDrawer, setShowLayoutDrawer] = useState(false);
  const [activeCustomizerSection, setActiveCustomizerSection] = useState<'fonts' | 'header' | 'background' | 'body' | 'footer' | 'margins'>('fonts');

  // Load layout from backend Cloud PostgreSQL database / localStorage on mount
  useEffect(() => {
    const fetchCloudSettings = async () => {
      try {
        const res = await api.get('/certificates/layout-settings');
        if (res.data?.data?.layoutConfig) {
          const loaded = { ...DEFAULT_LAYOUT_CONFIG, ...res.data.data.layoutConfig };
          setLayoutConfig(loaded);
          localStorage.setItem('nepal_mavi_cert_layout', JSON.stringify(loaded));
          return;
        }
      } catch (err) {
        console.warn('Using local certificate layout cache:', err);
      }

      // Fallback to localStorage
      try {
        const savedLayoutJson = localStorage.getItem('nepal_mavi_cert_layout');
        if (savedLayoutJson) {
          const parsed = JSON.parse(savedLayoutJson);
          setLayoutConfig({ ...DEFAULT_LAYOUT_CONFIG, ...parsed });
        }
      } catch (e) {}
    };

    fetchCloudSettings();
  }, []);

  // Save current layout config permanently to PostgreSQL Cloud DB and localStorage
  const handleSaveLayout = async (configToSave = layoutConfig) => {
    setIsSavingLayout(true);
    try {
      await api.post('/certificates/layout-settings', {
        layoutConfig: configToSave,
        activeProfileId: 'preset-nssb',
        savedProfiles: [
          {
            id: 'preset-nssb',
            name: 'NSSB',
            icon: '🎨',
            isCustom: true,
            updatedAt: new Date().toLocaleDateString('ne-NP') || new Date().toISOString().slice(0, 10),
            config: configToSave,
          },
        ],
      });
      localStorage.setItem('nepal_mavi_cert_layout', JSON.stringify(configToSave));
      toast.success('Certificate layout saved permanently for all computers! (सधैँका लागि सुरक्षित भयो)');
    } catch (apiErr) {
      console.warn('Cloud sync note, saved locally:', apiErr);
      localStorage.setItem('nepal_mavi_cert_layout', JSON.stringify(configToSave));
      toast.success('Certificate layout saved! (लेआउट सुरक्षित गरियो)');
    } finally {
      setIsSavingLayout(false);
    }
  };

  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Logo / Seal Upload Handler (Multipart upload to server for permanent static storage)
  const handleSealLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, SVG, WebP)');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/certificates/upload-asset?type=seal', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.success && res.data?.url) {
        const updated = { ...layoutConfig, customSealUrl: res.data.url };
        setLayoutConfig(updated);
        await handleSaveLayout(updated);
        toast.success('High-resolution Logo uploaded and saved permanently! (लोगो सधैँका लागि सुरक्षित भयो)');
        return;
      }
    } catch (err) {
      console.warn('Backend upload fallback to data URL:', err);
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      if (dataUrl) {
        const updated = { ...layoutConfig, customSealUrl: dataUrl };
        setLayoutConfig(updated);
        handleSaveLayout(updated);
        toast.success('Logo uploaded and saved! (लोगो सुरक्षित भयो)');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomSeal = () => {
    const updated = { ...layoutConfig, customSealUrl: '' };
    setLayoutConfig(updated);
    handleSaveLayout(updated);
    toast.success('Reverted to default school seal (पूर्वनिर्धारित मुहर लागू गरियो)');
  };

  const bgFileInputRef = useRef<HTMLInputElement>(null);

  // Background Upload Handler (Multipart upload to server for permanent Full HD storage)
  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, SVG, WebP)');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/certificates/upload-asset?type=background', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.success && res.data?.url) {
        const updated: CertLayoutConfig = {
          ...layoutConfig,
          customBackgroundUrl: res.data.url,
          backgroundMode: 'custom',
        };
        setLayoutConfig(updated);
        await handleSaveLayout(updated);
        toast.success('Full HD Background uploaded and saved permanently! (पृष्ठभूमि सधैँका लागि सुरक्षित भयो)');
        return;
      }
    } catch (err) {
      console.warn('Backend upload fallback to data URL:', err);
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      if (dataUrl) {
        const updated: CertLayoutConfig = {
          ...layoutConfig,
          customBackgroundUrl: dataUrl,
          backgroundMode: 'custom',
        };
        setLayoutConfig(updated);
        handleSaveLayout(updated);
        toast.success('Certificate background saved! (पृष्ठभूमि सुरक्षित गरियो)');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBackground = () => {
    const updated: CertLayoutConfig = {
      ...layoutConfig,
      customBackgroundUrl: '',
      backgroundMode: 'none',
    };
    setLayoutConfig(updated);
    handleSaveLayout(updated);
    toast.success('Certificate background set to Plain / No Background (सादा पृष्ठभूमि लागू गरियो)');
  };

  const handleResetDefaultBackground = () => {
    const updated: CertLayoutConfig = {
      ...layoutConfig,
      customBackgroundUrl: '',
      backgroundMode: 'default',
    };
    setLayoutConfig(updated);
    handleSaveLayout(updated);
    toast.success('Reset to default official certificate background (पूर्वनिर्धारित पृष्ठभूमि लागू गरियो)');
  };

  // Helper to determine exact background style per certificate type
  const getCertificateBgStyle = (type: 'CHARACTER' | 'TRANSFER' | 'BONAFIDE' | 'APPRECIATION') => {
    if (layoutConfig.backgroundMode === 'none') {
      return {
        backgroundImage: 'none',
        background: '#ffffff',
        border: '2px solid #cbd5e1',
        isImage: false,
      };
    }

    if (layoutConfig.backgroundMode === 'ornate-border') {
      return {
        backgroundImage: 'none',
        background: '#fffdfa',
        border: '6px double #b45309',
        outline: '2px solid #78350f',
        outlineOffset: '-10px',
        isImage: false,
      };
    }

    const applies =
      layoutConfig.bgApplyToAll ||
      type === 'CHARACTER' ||
      type === 'TRANSFER' ||
      (type === 'BONAFIDE' && layoutConfig.bgApplyToBonafide) ||
      (type === 'APPRECIATION' && layoutConfig.bgApplyToAppreciation);

    if (applies) {
      const imgUrl = layoutConfig.customBackgroundUrl || '/certificate_bg.jpg';
      return {
        backgroundImage: `url('${imgUrl}')`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        border: 'none',
        isImage: true,
        imgUrl,
      };
    }

    if (type === 'BONAFIDE') {
      return {
        backgroundImage: 'none',
        background: '#ffffff',
        border: '3px double #1e3a5f',
        isImage: false,
      };
    }

    return {
      backgroundImage: 'none',
      background: '#fffdfa',
      border: '4px double #b45309',
      isImage: false,
    };
  };

  // Student search & Manual Student Input
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [manualStudentName, setManualStudentName] = useState('');
  const [manualPhotoUrl, setManualPhotoUrl] = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Form fields
  const [issuedDateBs, setIssuedDateBs] = useState(todayBS());
  const [issuedDateAd, setIssuedDateAd] = useState(() => {
    try {
      return bsToAD(todayBS()) || new Date().toISOString().slice(0, 10);
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  });

  const handleIssuedDateBsChange = (val: string) => {
    setIssuedDateBs(val);
    try {
      const ad = bsToAD(val);
      if (ad) setIssuedDateAd(ad);
    } catch (e) {}
  };
  const [characterGrade, setCharacterGrade] = useState('EXCELLENT (उत्कृष्ट)');
  const [reasonForLeave, setReasonForLeave] = useState('Guardian relocation / higher studies');
  const [destinationSchool, setDestinationSchool] = useState('');
  const [appreciationFor, setAppreciationFor] = useState('Outstanding performance in Annual Sports & Academic Olympiad');
  const [conduct, setConduct] = useState('Good');
  const [issuedBy, setIssuedBy] = useState('Principal');
  const [selectedCertForPrint, setSelectedCertForPrint] = useState<any>(null);

  // Authentic Particulars
  const [studentTitle, setStudentTitle] = useState<'Miss.' | 'Mr.'>('Miss.');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');

  // Nepal 753 Local Level Address Hierarchy
  const [addrCountry, setAddrCountry] = useState('Nepal');
  const [addrProvince, setAddrProvince] = useState('Madhesh');
  const [addrDistrict, setAddrDistrict] = useState('Rautahat');
  const [addrLocalLevel, setAddrLocalLevel] = useState('Brindawan Municipality');
  const [addrWard, setAddrWard] = useState('2');
  const [permanentAddress, setPermanentAddress] = useState('Brindawan Municipality-2, Rautahat, Madhesh Province, Nepal');
  const [showAddressBuilder, setShowAddressBuilder] = useState(false);
  const [localLevelSearch, setLocalLevelSearch] = useState('');

  // Auto-assemble address when components change
  const updateFormattedAddress = (ll = addrLocalLevel, w = addrWard, dist = addrDistrict, prov = addrProvince, c = addrCountry) => {
    const wardPart = w ? `-${w}` : '';
    const formatted = `${ll}${wardPart}, ${dist}, ${prov} Province, ${c}`;
    setPermanentAddress(formatted);
  };

  // Automatic Year & Date Conversions
  const [passedYearBs, setPassedYearBs] = useState('');
  const [passedYearAd, setPassedYearAd] = useState('');
  const [dobBs, setDobBs] = useState('');
  const [dobAd, setDobAd] = useState('');

  const formatYearBS = (val: string) => {
    if (!val) return '';
    const num = val.replace(/\D/g, '');
    if (!num) return val;
    return `${num} B.S.`;
  };

  const formatYearAD = (val: string) => {
    if (!val) return '';
    const num = val.replace(/\D/g, '');
    if (!num) return val;
    return `${num} A.D.`;
  };

  const handlePassedYearBsChange = (val: string) => {
    const num = val.replace(/\D/g, '');
    if (!num) {
      setPassedYearBs('');
      setPassedYearAd('');
      return;
    }
    if (num.length >= 4) {
      const bsYr = parseInt(num.slice(0, 4), 10);
      setPassedYearBs(`${bsYr} B.S.`);
      if (bsYr > 1900 && bsYr < 2200) {
        setPassedYearAd(`${bsYr - 57} A.D.`);
      }
    } else {
      setPassedYearBs(val);
    }
  };

  const handlePassedYearAdChange = (val: string) => {
    const num = val.replace(/\D/g, '');
    if (!num) {
      setPassedYearAd('');
      setPassedYearBs('');
      return;
    }
    if (num.length >= 4) {
      const adYr = parseInt(num.slice(0, 4), 10);
      setPassedYearAd(`${adYr} A.D.`);
      if (adYr > 1800 && adYr < 2150) {
        setPassedYearBs(`${adYr + 57} B.S.`);
      }
    } else {
      setPassedYearAd(val);
    }
  };

  const handleDobBsChange = (val: string) => {
    setDobBs(val);
    // Convert YYYY-MM-DD or MM/DD/YYYY
    try {
      if (val.includes('-') && val.split('-').length === 3) {
        const ad = bsToAD(val);
        if (ad) setDobAd(ad);
      } else if (val.includes('/') && val.split('/').length === 3) {
        const parts = val.split('/');
        // Check if YYYY/MM/DD or MM/DD/YYYY
        if (parts[0].length === 4) {
          const ad = bsToAD(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`);
          if (ad) setDobAd(ad);
        } else if (parts[2].length === 4) {
          const ad = bsToAD(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
          if (ad) setDobAd(ad);
        }
      }
    } catch (e) {
      // ignore
    }
  };

  const handleDobAdChange = (val: string) => {
    setDobAd(val);
    try {
      if (val.includes('-') && val.split('-').length === 3) {
        const bs = adToBS(val);
        if (bs) setDobBs(bs);
      } else if (val.includes('/') && val.split('/').length === 3) {
        const parts = val.split('/');
        if (parts[2].length === 4) {
          const d = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
          if (!isNaN(d.getTime())) {
            const bs = adToBS(d.toISOString().slice(0, 10));
            if (bs) setDobBs(bs);
          }
        }
      }
    } catch (e) {
      // ignore
    }
  };

  // Exam Board & Level
  const [examBoard, setExamBoard] = useState('National Examinations Board');
  const [passedExamLevel, setPassedExamLevel] = useState('School Leaving Certificate Examination (Grade XII)');
  const [gpa, setGpa] = useState('');
  const [symbolNo, setSymbolNo] = useState('');
  const [nebRegNo, setNebRegNo] = useState('');
  const [preparedBy, setPreparedBy] = useState('Prepared By:');
  const [dateOfIssue, setDateOfIssue] = useState('5/21/2026');

  // Handle student select and auto-populate
  const handleSelectStudent = (st: any) => {
    setSelectedStudent(st);
    setSearchQuery('');
    setManualStudentName(st.fullName);
    const isFemale = (st.gender || '').toUpperCase() === 'FEMALE';
    setStudentTitle(isFemale ? 'Miss.' : 'Mr.');
    if (st.fatherName) setFatherName(st.fatherName);
    if (st.motherName) setMotherName(st.motherName);
    if (st.address) setPermanentAddress(st.address);
    if (st.dateOfBirthBs) handleDobBsChange(st.dateOfBirthBs);
    if (st.dateOfBirth) {
      const adDate = new Date(st.dateOfBirth);
      if (!isNaN(adDate.getTime())) {
        handleDobAdChange(`${adDate.getMonth() + 1}/${adDate.getDate()}/${adDate.getFullYear()}`);
      } else {
        handleDobAdChange(st.dateOfBirth.slice(0, 10));
      }
    }
    if (st.studentId) setNebRegNo(st.studentId);
    if (st.symbolNo) setSymbolNo(st.symbolNo);
    const cls = st.classEnrollment?.[0]?.class?.name || '12';
    if (cls.includes('12') || cls === 'XII') {
      setPassedExamLevel('School Leaving Certificate Examination (Grade XII)');
      setExamBoard('National Examinations Board');
    } else if (cls.includes('10') || cls === 'X') {
      setPassedExamLevel('Secondary Education Examination (Grade X)');
      setExamBoard('National Examinations Board');
    } else {
      setPassedExamLevel(`Secondary Education Examination (Grade ${cls})`);
    }
  };

  // Fetch student search
  const { data: searchResults } = useQuery({
    queryKey: ['students-cert-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const res = await api.get(`/students?search=${encodeURIComponent(searchQuery)}&limit=6`);
      return res.data?.data || [];
    },
    enabled: searchQuery.length >= 2,
  });

  // Fetch certificate history
  const { data: certsData, isLoading } = useQuery({
    queryKey: ['certificates'],
    queryFn: async () => {
      const res = await api.get('/certificates');
      return res.data?.data || [];
    },
  });

  // Fetch school info
  const { data: schoolData } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data;
    },
  });

  const effectiveSchoolName =
    layoutConfig.schoolNameText ||
    (schoolData?.name && !/[\u0900-\u097F]/.test(schoolData.name) ? schoolData.name : 'NEPAL SECONDARY SCHOOL');
  const effectiveSchoolAddress =
    layoutConfig.schoolAddressText ||
    (schoolData?.address && !/[\u0900-\u097F]/.test(schoolData.address)
      ? schoolData.address
      : 'BRINDAWAN - 02, BISHRAMPUR, RAUTAHAT');
  const effectiveSchoolProvince = layoutConfig.schoolProvinceText || 'MADHESH PROVINCE, NEPAL';
  const effectiveSchoolEstd = layoutConfig.schoolEstdText || `ESTD: ${schoolData?.estYear || '2007'} B.S.`;

  // Issue Certificate Mutation
  const issueCertMutation = useMutation({
    mutationFn: async () => {
      const effectiveStudentName = (selectedStudent?.fullName || manualStudentName || '').toUpperCase();
      if (!effectiveStudentName) {
        throw new Error('Please enter or select a student name');
      }

      const res = await api.post('/certificates/issue', {
        studentId: selectedStudent?.id || null,
        manualStudentName: effectiveStudentName,
        type: certType,
        issuedDateBs,
        issuedBy,
        remarks:
          certType === 'CHARACTER'
            ? `Character: ${characterGrade}`
            : certType === 'TRANSFER'
            ? `Transferred to: ${destinationSchool || 'New Institution'}`
            : appreciationFor,
        customData: {
          characterGrade,
          reasonForLeave,
          destinationSchool,
          appreciationFor,
          conduct,
          studentTitle,
          fatherName: (fatherName || '').toUpperCase(),
          motherName: (motherName || '').toUpperCase(),
          permanentAddress,
          passedYearBs,
          passedYearAd,
          examBoard,
          passedExamLevel,
          gpa,
          dobBs,
          dobAd,
          symbolNo,
          nebRegNo,
          preparedBy,
          dateOfIssue: issuedDateAd,
          dateOfIssueAd: issuedDateAd,
          dateOfIssueBs: issuedDateBs,
          studentName: effectiveStudentName,
          printCount: 1,
        },
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`${data.data?.type || certType} Certificate issued! Cert No: ${data.data?.certificateNo}`);
      setSelectedCertForPrint(data.data);
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to issue certificate');
    },
  });

  // Delete Certificate Mutation
  const deleteCertMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/certificates/${id}`);
      return res.data;
    },
    onSuccess: (res) => {
      toast.success(res?.message || 'Certificate deleted successfully! (प्रमाणपत्र हटाइयो)');
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete certificate');
    },
  });

  // Record Print Count Mutation
  const recordPrintMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/certificates/${id}/record-print`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
  });

  const handleDeleteCertificate = (cert: any) => {
    const sName = cert.student?.fullName || cert.data?.studentName || '';
    if (window.confirm(`के तपाईं विद्यार्थी "${sName}" को जारी प्रमाणपत्र (नं. ${cert.certificateNo}) मेटाउन निश्चित हुनुहुन्छ?\n\n(Are you sure you want to permanently delete this certificate record?)`)) {
      deleteCertMutation.mutate(cert.id);
    }
  };

  const effectiveName = (selectedStudent?.fullName || manualStudentName || '').toUpperCase();
  const effectivePhoto = selectedStudent?.photoUrl || manualPhotoUrl || '';

  const triggerCertificatePrint = (certObj?: any) => {
    const c = certObj || selectedCertForPrint;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const currentCertType = c?.type || certType;
    const certData = c?.data ? (typeof c.data === 'string' ? JSON.parse(c.data) : c.data) : {};
    const printCount = Number(certData.printCount) || (c?.printCount ? Number(c.printCount) : 1);
    const stName = (c?.student?.fullName || certData.studentName || effectiveName || '........................................').toUpperCase();
    const isFemale =
      certData.studentTitle === 'Miss.' ||
      studentTitle === 'Miss.' ||
      (c?.student?.gender || selectedStudent?.gender || '').toUpperCase() === 'FEMALE';
    const sTitle = certData.studentTitle || studentTitle || (isFemale ? 'Miss.' : 'Mr.');
    const sRelationship = isFemale ? 'daughter' : 'son';
    const sPronoun = isFemale ? 'She' : 'He';
    const sPronounLower = isFemale ? 'she' : 'he';
    const sPossessive = isFemale ? 'her' : 'his';

    const sFather = (certData.fatherName || fatherName || '........................................').toUpperCase();
    const sMother = (certData.motherName || motherName || '........................................').toUpperCase();
    const sAddress = certData.permanentAddress || permanentAddress || '........................................';
    const sPassedBs = certData.passedYearBs || passedYearBs || '................';
    const sPassedAd = certData.passedYearAd || passedYearAd || '................';
    const sBoard = certData.examBoard || examBoard || 'National Examinations Board';
    const sLevel = certData.passedExamLevel || passedExamLevel || 'School Leaving Certificate Examination (Grade XII)';
    const sGpa = certData.gpa || gpa || '........';
    const sDobBs = certData.dobBs || dobBs || '................';
    const sDobAd = certData.dobAd || dobAd || '................';
    const sSymbol = certData.symbolNo || symbolNo || '................';
    const sNeb = certData.nebRegNo || nebRegNo || '................';
    const sPhoto = c?.student?.photoUrl || effectivePhoto;
    const sIssueDateBs = c?.issuedDateBs || issuedDateBs || todayBS();
    const sIssueDateAd = (() => {
      if (certData?.dateOfIssueAd) return certData.dateOfIssueAd;
      if (c?.issuedDateAd) {
        return typeof c.issuedDateAd === 'string' ? c.issuedDateAd.slice(0, 10) : new Date(c.issuedDateAd).toISOString().slice(0, 10);
      }
      const raw = certData?.dateOfIssue || issuedDateAd;
      if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const yr = parseInt(raw.slice(0, 4), 10);
        if (yr < 2070) return raw; // Already AD date!
        try {
          const converted = bsToAD(raw);
          if (converted) return converted;
        } catch (e) {}
      }
      try {
        const converted = bsToAD(sIssueDateBs);
        if (converted) return converted;
      } catch (e) {}
      return new Date().toISOString().slice(0, 10);
    })();

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const rawSeal = layoutConfig.customSealUrl || schoolData?.sealUrl || '/school_seal_red.png';
    const sealLogoUrl = rawSeal.startsWith('data:') || rawSeal.startsWith('blob:') || rawSeal.startsWith('http://') || rawSeal.startsWith('https://')
      ? rawSeal
      : `${origin}${rawSeal.startsWith('/') ? '' : '/'}${rawSeal}`;

    const bgStyle = getCertificateBgStyle(currentCertType);
    const rawBg = bgStyle.isImage && bgStyle.imgUrl ? bgStyle.imgUrl : '';
    const fullBg = rawBg
      ? (rawBg.startsWith('data:') || rawBg.startsWith('blob:') || rawBg.startsWith('http://') || rawBg.startsWith('https://')
          ? rawBg
          : `${origin}${rawBg.startsWith('/') ? '' : '/'}${rawBg}`)
      : '';

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <base href="${origin}/">
          <title>${currentCertType} CERTIFICATE - ${stName}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Bebas+Neue&family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@600;700;800;900&family=Courier+Prime:wght@400;700&family=Dancing+Script:wght@600;700&family=EB+Garamond:ital,wght@0,500;0,700;1,500&family=Great+Vibes&family=Martel:wght@600;800&family=MedievalSharp&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@600;700;800;900&family=Mukta:wght@500;700;800&family=Noto+Serif+Devanagari:wght@500;700;900&family=Oswald:wght@500;700&family=Outfit:wght@600;700;800&family=Parisienne&family=Pinyon+Script&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&family=Poppins:wght@500;600;700;800&family=Rozha+One&family=Satisfy&family=UnifrakturMaguntia&family=Yatra+One&display=swap" rel="stylesheet">
          <style>
            @page {
              size: 297mm 210mm;
              margin: 0mm;
            }
            @media print {
              @page {
                size: 297mm 210mm;
                margin: 0mm;
              }
              *, *::before, *::after {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              html, body {
                width: 297mm !important;
                height: 210mm !important;
                max-width: 297mm !important;
                max-height: 210mm !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                background: #fff !important;
              }
              .cert-page {
                width: 297mm !important;
                height: 210mm !important;
                min-width: 297mm !important;
                min-height: 210mm !important;
                max-width: 297mm !important;
                max-height: 210mm !important;
                margin: 0 !important;
                page-break-inside: avoid !important;
                page-break-after: avoid !important;
                page-break-before: avoid !important;
                break-inside: avoid !important;
                overflow: hidden !important;
              }
              .cert-bg-hd-layer {
                width: 297mm !important;
                height: 210mm !important;
                max-width: 297mm !important;
                max-height: 210mm !important;
                object-fit: fill !important;
                image-rendering: high-quality !important;
                image-rendering: -webkit-optimize-contrast !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .school-seal-img {
                image-rendering: high-quality !important;
                image-rendering: -webkit-optimize-contrast !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            html, body {
              margin: 0;
              padding: 0;
              background: #fff;
              font-family: ${layoutConfig.bodyFont};
              color: #111;
              width: 297mm;
              height: 210mm;
            }
            .cert-page {
              width: 297mm;
              height: 210mm;
              max-width: 297mm;
              max-height: 210mm;
              margin: 0 auto;
              position: relative;
              overflow: hidden;
              box-sizing: border-box;
              background: ${bgStyle.background || '#ffffff'};
              ${bgStyle.border ? `border: ${bgStyle.border}; ${bgStyle.outline ? `outline: ${bgStyle.outline}; outline-offset: ${bgStyle.outlineOffset || '-8px'};` : ''}` : ''}
            }
            .cert-bg-hd-layer {
              position: absolute;
              top: 0;
              left: 0;
              width: 297mm;
              height: 210mm;
              max-width: 297mm;
              max-height: 210mm;
              object-fit: fill;
              z-index: 0;
              pointer-events: none;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: high-quality;
              image-rendering: auto;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .cert-content-wrapper {
              position: relative;
              z-index: 2;
              width: 100%;
              height: 100%;
              padding: ${layoutConfig.pagePaddingTopMm}mm ${layoutConfig.pagePaddingSideMm}mm ${layoutConfig.pagePaddingBottomMm}mm ${layoutConfig.pagePaddingSideMm}mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
            }
            .header-layout {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 16px;
              margin-bottom: ${layoutConfig.headerSpacingBottom}px;
            }
            .header-left {
              width: ${Math.max(130, layoutConfig.sealSize + 15)}px;
              min-width: ${Math.max(130, layoutConfig.sealSize + 15)}px;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
            }
            .iemis-badge {
              font-size: ${layoutConfig.iemisBadgeSize}px;
              font-weight: 800;
              color: ${layoutConfig.iemisBadgeColor};
              font-family: sans-serif;
              letter-spacing: 0.5px;
              margin-bottom: 2px;
            }
            .school-seal-img {
              width: ${layoutConfig.sealSize}px;
              height: ${layoutConfig.sealSize}px;
              max-width: none;
              object-fit: contain;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: high-quality;
            }
            .header-center {
              flex: 1;
              text-align: center;
              padding: 0 10px;
            }
            .school-title {
              font-size: ${layoutConfig.schoolTitleSize}px;
              font-weight: ${layoutConfig.schoolTitleWeight};
              color: ${layoutConfig.schoolTitleColor};
              font-family: ${layoutConfig.schoolTitleFont};
              letter-spacing: ${layoutConfig.schoolTitleLetterSpacing}px;
              margin: 0;
              text-transform: uppercase;
              line-height: 1.15;
            }
            .school-sub {
              font-size: ${layoutConfig.schoolSubtitleSize}px;
              font-weight: 700;
              color: ${layoutConfig.schoolSubtitleColor};
              font-family: ${layoutConfig.schoolSubtitleFont || layoutConfig.schoolTitleFont};
              text-transform: uppercase;
              margin-top: 2px;
              letter-spacing: 0.5px;
            }
            .school-prov {
              font-size: ${layoutConfig.schoolProvinceSize}px;
              font-weight: 700;
              color: ${layoutConfig.schoolProvinceColor};
              font-family: ${layoutConfig.schoolProvinceFont || layoutConfig.schoolTitleFont};
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .school-estd {
              font-size: ${layoutConfig.schoolEstdSize}px;
              font-weight: 700;
              color: ${layoutConfig.schoolEstdColor};
              font-family: ${layoutConfig.schoolEstdFont || layoutConfig.schoolTitleFont};
              margin-top: 1px;
            }
            .cert-banner {
              margin-top: ${layoutConfig.certTitleMarginTop}px;
              margin-bottom: ${layoutConfig.certTitleMarginBottom}px;
            }
            .cert-banner-text {
              font-size: ${layoutConfig.certTitleSize}px;
              font-weight: 900;
              color: ${layoutConfig.certTitleColor};
              font-family: ${layoutConfig.certTitleFont};
              letter-spacing: ${layoutConfig.certTitleLetterSpacing}px;
              text-transform: ${layoutConfig.certTitleTextTransform};
              ${layoutConfig.certTitleShadow ? 'text-shadow: 1px 1px 1px #e9d5ff;' : ''}
            }
            .header-right {
              width: ${Math.max(130, layoutConfig.sealSize + 15)}px;
              min-width: ${Math.max(130, layoutConfig.sealSize + 15)}px;
              display: flex;
              justify-content: flex-end;
            }
            .photo-frame {
              width: ${layoutConfig.photoFrameWidth}px;
              height: ${layoutConfig.photoFrameHeight}px;
              border: 1.5px solid ${layoutConfig.photoFrameBorderColor};
              border-radius: ${layoutConfig.photoFrameBorderRadius}px;
              transform: translate(${layoutConfig.photoOffsetX}px, ${layoutConfig.photoOffsetY}px);
              background: rgba(255,255,255,0.95);
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            }
            .photo-frame img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .content-section {
              text-align: ${layoutConfig.bodyTextAlign};
              line-height: ${layoutConfig.bodyLineHeight};
              color: ${layoutConfig.bodyTextColor};
              font-family: ${layoutConfig.bodyFont};
              margin: 4px 0 8px 0;
            }
            .content-p1 {
              margin: 0 0 ${layoutConfig.bodyParagraphSpacing}px 0;
              text-indent: ${layoutConfig.bodyIndentP1 ?? layoutConfig.bodyIndent}px;
              font-size: ${layoutConfig.bodyFontSizeP1}px;
            }
            .content-p2 {
              margin: 0 0 ${layoutConfig.bodyParagraphSpacing}px 0;
              text-indent: ${layoutConfig.bodyIndentP2 ?? layoutConfig.bodyIndent}px;
              font-size: ${layoutConfig.bodyFontSizeP2}px;
            }
            .content-p3 {
              margin: 0 0 ${layoutConfig.bodyParagraphSpacing}px 0;
              text-indent: ${layoutConfig.bodyIndentP3 ?? layoutConfig.bodyIndent}px;
              font-size: ${layoutConfig.bodyFontSizeP3}px;
            }
            .particulars-box {
              font-size: ${layoutConfig.particularsFontSize}px;
              font-weight: bold;
              color: ${layoutConfig.particularsColor};
              font-family: ${layoutConfig.particularsFont};
              line-height: 1.6;
              margin-top: ${layoutConfig.particularsMarginTop}px;
              margin-bottom: ${layoutConfig.particularsMarginBottom}px;
            }
            .particulars-box strong {
              font-family: monospace;
              font-size: 13px;
            }
            .footer-signatures-row {
              display: flex;
              align-items: flex-end;
              justify-content: space-between;
              margin-top: ${layoutConfig.footerMarginTop}px;
              font-family: ${layoutConfig.sigFont};
              font-size: ${layoutConfig.sigFontSize}px;
              color: ${layoutConfig.sigTextColor};
            }
            .sig-block {
              width: 150px;
              text-align: center;
            }
            .sig-line-solid {
              border-top: 1.5px solid ${layoutConfig.sigTextColor};
              margin-bottom: 5px;
              width: 100%;
            }
            .sig-line-underline {
              border-bottom: 1.5px solid ${layoutConfig.sigTextColor};
              margin-bottom: 5px;
              width: 100%;
            }
            .sig-title {
              font-weight: 700;
              letter-spacing: 0.5px;
            }
            .bottom-meta {
              display: flex;
              justify-content: space-between;
              font-size: ${layoutConfig.dateOfIssueFontSize}px;
              font-weight: 600;
              color: ${layoutConfig.dateOfIssueColor};
              font-family: sans-serif;
              margin-top: 4px;
            }
          </style>
        </head>
        <body>
          <div class="cert-page">
            ${
              fullBg
                ? `<img src="${fullBg}" class="cert-bg-hd-layer" alt="Certificate Background" onerror="if(this.src!=='${origin}/certificate_bg.jpg')this.src='${origin}/certificate_bg.jpg';" />`
                : ''
            }
            <div class="cert-content-wrapper">
              <!-- Header Layout -->
              <div class="header-layout">
              <div class="header-left">
                ${layoutConfig.showIemisBadge ? `<div class="iemis-badge">${layoutConfig.iemisBadgeText} ${schoolData?.emisCode || '320160005'}</div>` : ''}
                ${layoutConfig.showSeal ? `<img src="${sealLogoUrl}" alt="School Seal" class="school-seal-img" onerror="if(this.src!=='${origin}/school_seal_red.png')this.src='${origin}/school_seal_red.png';" />` : ''}
              </div>

              <div class="header-center">
                <h1 class="school-title">${effectiveSchoolName}</h1>
                <div class="school-sub">${effectiveSchoolAddress}</div>
                <div class="school-prov">${effectiveSchoolProvince}</div>
                <div class="school-estd">${effectiveSchoolEstd}</div>
                
                <div class="cert-banner">
                  <span class="cert-banner-text">${currentCertType === 'CHARACTER' || currentCertType === 'TRANSFER' ? 'CHARACTER / TRANSFER CERTIFICATE' : `${currentCertType} CERTIFICATE`}</span>
                </div>
              </div>

              <div class="header-right">
                ${
                  layoutConfig.showPhotoFrame
                    ? `<div class="photo-frame">
                        ${sPhoto ? `<img src="${sPhoto}" alt="Photo" />` : '<span style="font-size: 9px; color: #9ca3af; font-family: sans-serif; text-align: center;">PP Size<br/>Photo</span>'}
                      </div>`
                    : `<div style="width: ${Math.max(130, layoutConfig.sealSize + 15)}px;"></div>`
                }
              </div>
            </div>

            <!-- Body Content Paragraph-Wise -->
            <div class="content-section">
              ${
                currentCertType === 'CHARACTER' || currentCertType === 'TRANSFER'
                  ? `
                    <p class="content-p1">
                      This is to certify that ${sTitle} <strong style="font-weight: 800; text-transform: uppercase;">${stName}</strong> ${sRelationship} of Mr. <strong style="font-weight: 800; text-transform: uppercase;">${sFather}</strong> and Mrs. <strong style="font-weight: 800; text-transform: uppercase;">${sMother}</strong> permanent resident of <strong>${sAddress}</strong> was a regular student of this institution till <strong>${sPassedBs} (${sPassedAd})</strong>. ${sPronoun} has successfully completed ${sPossessive} ${sLevel}, conducted by the <strong>${sBoard}</strong>, Nepal with <strong>Grade Point Average (GPA) ${sGpa}</strong>. According to the records of this institution, ${sPossessive} date of birth is <strong>${sDobBs} B.S. (${sDobAd} A.D.)</strong>.
                    </p>
                    <p class="content-p2">
                      To the best of our knowledge and belief, ${sPronounLower} maintained good moral character during ${sPossessive} schooling at this institution.
                    </p>
                    <p class="content-p3">
                      We wish ${sPossessive} every success in ${sPossessive} future career.
                    </p>
                  `
                  : currentCertType === 'BONAFIDE'
                  ? `
                    <p class="content-p1">
                      This is to certify that ${sTitle} <strong style="font-weight: 800; text-transform: uppercase;">${stName}</strong>, ${sRelationship} of Mr. <strong style="font-weight: 800; text-transform: uppercase;">${sFather}</strong> and Mrs. <strong style="font-weight: 800; text-transform: uppercase;">${sMother}</strong>, student ID <strong>${sNeb}</strong>, is a bonafide and regular student of this school enrolled in Class <strong>${selectedStudent?.classEnrollment?.[0]?.class?.name || '10'}</strong> (Roll No: <strong>${selectedStudent?.classEnrollment?.[0]?.rollNo || '1'}</strong>) for the academic session <strong>2083 B.S.</strong>
                    </p>
                    <p class="content-p2">
                      According to the institution records, ${sPossessive} date of birth is <strong>${sDobBs} B.S.</strong> and ${sPossessive} permanent address is <strong>${sAddress}</strong>.
                    </p>
                    <p class="content-p3">
                      ${sPronoun} bears good moral conduct and this certificate is issued upon guardian request for official verification purposes.
                    </p>
                  `
                  : `
                    <p class="content-p1">
                      In recognition of exemplary commitment, distinguished character, and outstanding academic performance, this Certificate of Appreciation is proudly presented to:
                    </p>
                    <p style="text-align: center; font-size: ${layoutConfig.bodyFontSizeP1 + 5}px; font-weight: 900; text-transform: uppercase; color: #1e3a5f; margin: 12px 0; letter-spacing: 1.5px;">
                      ${stName}
                    </p>
                    <p class="content-p2">
                      For <strong>${appreciationFor}</strong> with commendable excellence in this institution.
                    </p>
                    <p class="content-p3">
                      We acknowledge and celebrate your achievements and wish you continued inspiration and success.
                    </p>
                  `
              }
            </div>

            <!-- Exam Details -->
            ${
              layoutConfig.showParticularsBox && (currentCertType === 'CHARACTER' || currentCertType === 'TRANSFER')
                ? `<div class="particulars-box">
                    <div>Symbol No.: <strong>${sSymbol}</strong></div>
                    <div>NEB Registration No.: <strong>${sNeb}</strong></div>
                    <div>Passed Year: <strong>${sPassedBs} ( ${sPassedAd} )</strong></div>
                  </div>`
                : ''
            }

            <!-- Signatures & Footer (NO DOTTED LINE) -->
            <div>
              <div class="footer-signatures-row">
                <div class="sig-block" style="text-align: left;">
                  ${layoutConfig.sigLineStyle === 'clean-line' ? '<div class="sig-line-solid"></div>' : ''}
                  ${layoutConfig.sigLineStyle === 'solid-underline' ? '<div class="sig-line-underline"></div>' : ''}
                  <div class="sig-title">${layoutConfig.preparedByLabel || 'Prepared By:'}</div>
                </div>

                <div class="sig-block" style="text-align: center;">
                  <div class="sig-title" style="text-transform: uppercase;">${layoutConfig.sealCenterLabel || 'Seal of School'}</div>
                </div>

                <div class="sig-block" style="text-align: right;">
                  ${layoutConfig.sigLineStyle === 'clean-line' ? '<div class="sig-line-solid"></div>' : ''}
                  ${layoutConfig.sigLineStyle === 'solid-underline' ? '<div class="sig-line-underline"></div>' : ''}
                  <div class="sig-title">${layoutConfig.principalLabel || 'Principal'}</div>
                </div>
              </div>

              ${
                layoutConfig.showDateOfIssue
                  ? `<div class="bottom-meta" style="justify-content: ${layoutConfig.dateOfIssuePosition === 'right' ? 'flex-end' : layoutConfig.dateOfIssuePosition === 'center' ? 'center' : 'flex-start'};">
                      <div>Date of Issue: <strong>${sIssueDateAd}</strong></div>
                    </div>`
                  : ''
              }
            </div>
          </div>
        </div>

          <script>
            function triggerPrint() {
              var bgImg = document.querySelector('.cert-bg-hd-layer');
              var sealImg = document.querySelector('.school-seal-img');
              var promises = [];
              if (document.fonts && document.fonts.ready) {
                promises.push(document.fonts.ready);
              }
              if (bgImg) {
                if (bgImg.complete && bgImg.naturalWidth > 0) {
                  if (bgImg.decode) promises.push(bgImg.decode().catch(function(){}));
                } else {
                  promises.push(new Promise(function(resolve) {
                    bgImg.onload = function() {
                      if (bgImg.decode) bgImg.decode().then(resolve).catch(resolve);
                      else resolve();
                    };
                    bgImg.onerror = resolve;
                  }));
                }
              }
              if (sealImg) {
                if (sealImg.complete && sealImg.naturalWidth > 0) {
                  if (sealImg.decode) promises.push(sealImg.decode().catch(function(){}));
                } else {
                  promises.push(new Promise(function(resolve) {
                    sealImg.onload = function() {
                      if (sealImg.decode) sealImg.decode().then(resolve).catch(resolve);
                      else resolve();
                    };
                    sealImg.onerror = resolve;
                  }));
                }
              }
              Promise.all(promises).then(function() {
                setTimeout(function() {
                  window.focus();
                  window.print();
                }, 300);
              }).catch(function() {
                setTimeout(function() { window.print(); }, 500);
              });
            }
            if (document.readyState === 'complete') {
              triggerPrint();
            } else {
              window.addEventListener('load', triggerPrint);
            }
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const certificates = certsData || [];

  const isFemaleSelected =
    studentTitle === 'Miss.' ||
    (selectedStudent?.gender || '').toUpperCase() === 'FEMALE';
  const currentTitle = studentTitle || (isFemaleSelected ? 'Miss.' : 'Mr.');
  const currentRelationship = isFemaleSelected ? 'daughter' : 'son';
  const currentPronoun = isFemaleSelected ? 'She' : 'He';
  const currentPronounLower = isFemaleSelected ? 'she' : 'he';
  const currentPossessive = isFemaleSelected ? 'her' : 'his';

  // Filtered districts and local levels
  const availableDistricts = getDistrictsByProvince(addrProvince);
  const availableLocalLevels = getLocalLevelsByDistrict(addrDistrict);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f] flex items-center gap-2">
            <Award className="text-[#1e3a5f]" />
            <span>Certificates (प्रमाणपत्र व्यवस्थापन)</span>
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            Character Certificate (CC), Transfer Certificate (TC), Bonafide तथा प्रशंसा पत्र निर्माण
          </p>
        </div>

        {/* Tab Pills & Layout Customizer Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowLayoutDrawer(!showLayoutDrawer)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs border ${
              showLayoutDrawer
                ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-200'
                : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-50'
            }`}
          >
            <Sliders size={14} className={showLayoutDrawer ? 'text-white' : 'text-purple-600'} />
            <span>Customize Layout & Typography (लेआउट तथा फन्ट मिलाउनुहोस्)</span>
          </button>

          <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-bold gap-1 shadow-inner">
            <button
              onClick={() => setActiveTab('issue')}
              className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 ${
                activeTab === 'issue' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <Award size={14} />
              <span>Issue Certificate (जारी)</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 ${
                activeTab === 'history' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <FileText size={14} />
              <span>Issued Archive ({certificates.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════ LAYOUT & TYPOGRAPHY CUSTOMIZER DRAWER ════════════════════ */}
      {showLayoutDrawer && (
        <div className="rounded-2xl border-2 border-purple-300 bg-gradient-to-r from-purple-50/50 via-white to-indigo-50/40 p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-purple-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-600 text-white shadow-xs">
                <Sliders size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-purple-950">
                    Certificate Typography & Layout Designer
                  </h3>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-300">
                    NSSB Official Layout
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  फन्ट, साइज, हेडर तथा मार्जिनहरू मिलाउनुहोस् र तल वा दायाँको बटन थिचेर सधैँका लागि सुरक्षित गर्नुहोस्।
                </p>
              </div>
            </div>

            {/* Actions: Save Permanently & Close */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveLayout()}
                disabled={isSavingLayout}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-md disabled:opacity-50"
              >
                <Save size={14} />
                <span>{isSavingLayout ? 'Saving...' : 'Save Permanently (सधैँका लागि सुरक्षित गर्नुहोस्)'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowLayoutDrawer(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Sub-Section Navigation */}
          <div className="flex flex-wrap border-b border-gray-200 text-xs font-bold gap-2">
            {[
              { id: 'fonts', label: '🔤 Fonts & Typography', sec: 'fonts' as const },
              { id: 'header', label: '🏛️ Header & School Seal', sec: 'header' as const },
              { id: 'background', label: '🖼️ Background & Quality (पृष्ठभूमि)', sec: 'background' as const },
              { id: 'body', label: '📝 Paragraph Sizes & Indents', sec: 'body' as const },
              { id: 'footer', label: '✍️ Signatures & Footer', sec: 'footer' as const },
              { id: 'margins', label: '📐 Spacing & Margins', sec: 'margins' as const },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveCustomizerSection(s.sec)}
                className={`px-3 py-1.5 border-b-2 transition ${
                  activeCustomizerSection === s.sec
                    ? 'border-purple-600 text-purple-700 font-extrabold'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* SECTION 1: FONTS & TYPOGRAPHY */}
          {activeCustomizerSection === 'fonts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-xs">
              <div className="space-y-1 bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                <label className="block font-bold text-gray-800">School Header Font (विद्यालयको नाम फन्ट):</label>
                <select
                  value={layoutConfig.schoolTitleFont}
                  onChange={(e) => setLayoutConfig({ ...layoutConfig, schoolTitleFont: e.target.value })}
                  className="erp-input font-bold text-xs"
                >
                  {CERTIFICATE_FONTS.map((f) => (
                    <option key={f.id} value={f.family}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500">Size: {layoutConfig.schoolTitleSize}px</label>
                    <input
                      type="range"
                      min="18"
                      max="34"
                      value={layoutConfig.schoolTitleSize}
                      onChange={(e) => setLayoutConfig({ ...layoutConfig, schoolTitleSize: Number(e.target.value) })}
                      className="w-full accent-purple-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Color</label>
                    <input
                      type="color"
                      value={layoutConfig.schoolTitleColor}
                      onChange={(e) => setLayoutConfig({ ...layoutConfig, schoolTitleColor: e.target.value })}
                      className="w-8 h-7 rounded border cursor-pointer block"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1 bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                <label className="block font-bold text-gray-800">Certificate Title Font (प्रमाणपत्र शीर्षक):</label>
                <select
                  value={layoutConfig.certTitleFont}
                  onChange={(e) => setLayoutConfig({ ...layoutConfig, certTitleFont: e.target.value })}
                  className="erp-input font-bold text-xs"
                >
                  {CERTIFICATE_FONTS.map((f) => (
                    <option key={f.id} value={f.family}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500">Size: {layoutConfig.certTitleSize}px</label>
                    <input
                      type="range"
                      min="14"
                      max="30"
                      value={layoutConfig.certTitleSize}
                      onChange={(e) => setLayoutConfig({ ...layoutConfig, certTitleSize: Number(e.target.value) })}
                      className="w-full accent-purple-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Color</label>
                    <input
                      type="color"
                      value={layoutConfig.certTitleColor}
                      onChange={(e) => setLayoutConfig({ ...layoutConfig, certTitleColor: e.target.value })}
                      className="w-8 h-7 rounded border cursor-pointer block"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1 bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                <label className="block font-bold text-gray-800">Body Paragraph Font (मुख्य व्यहोरा फन्ट):</label>
                <select
                  value={layoutConfig.bodyFont}
                  onChange={(e) => setLayoutConfig({ ...layoutConfig, bodyFont: e.target.value })}
                  className="erp-input font-bold text-xs"
                >
                  {CERTIFICATE_FONTS.map((f) => (
                    <option key={f.id} value={f.family}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500">Line Height: {layoutConfig.bodyLineHeight}</label>
                    <input
                      type="range"
                      min="1.6"
                      max="2.6"
                      step="0.1"
                      value={layoutConfig.bodyLineHeight}
                      onChange={(e) => setLayoutConfig({ ...layoutConfig, bodyLineHeight: Number(e.target.value) })}
                      className="w-full accent-purple-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Color</label>
                    <input
                      type="color"
                      value={layoutConfig.bodyTextColor}
                      onChange={(e) => setLayoutConfig({ ...layoutConfig, bodyTextColor: e.target.value })}
                      className="w-8 h-7 rounded border cursor-pointer block"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1 bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                <label className="block font-bold text-gray-800">Footer & Signatures Font (दस्तखत फन्ट):</label>
                <select
                  value={layoutConfig.sigFont}
                  onChange={(e) => setLayoutConfig({ ...layoutConfig, sigFont: e.target.value })}
                  className="erp-input font-bold text-xs"
                >
                  {CERTIFICATE_FONTS.map((f) => (
                    <option key={f.id} value={f.family}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500">Size: {layoutConfig.sigFontSize}px</label>
                    <input
                      type="range"
                      min="10"
                      max="18"
                      value={layoutConfig.sigFontSize}
                      onChange={(e) => setLayoutConfig({ ...layoutConfig, sigFontSize: Number(e.target.value) })}
                      className="w-full accent-purple-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Color</label>
                    <input
                      type="color"
                      value={layoutConfig.sigTextColor}
                      onChange={(e) => setLayoutConfig({ ...layoutConfig, sigTextColor: e.target.value })}
                      className="w-8 h-7 rounded border cursor-pointer block"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: HEADER & SCHOOL SEAL */}
          {activeCustomizerSection === 'header' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-xs">
              {/* Card 1: School Header & Address Typography */}
              <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                <label className="block font-bold text-gray-800">1. School Address (ठेगाना फन्ट र साइज)</label>
                <div>
                  <label className="text-[10px] text-gray-500">Address Line (English)</label>
                  <input
                    type="text"
                    value={layoutConfig.schoolAddressText}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, schoolAddressText: e.target.value })}
                    className="erp-input text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">Address Font Family</label>
                  <select
                    value={layoutConfig.schoolSubtitleFont}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, schoolSubtitleFont: e.target.value })}
                    className="erp-input font-bold text-xs"
                  >
                    {CERTIFICATE_FONTS.map((f) => (
                      <option key={f.id} value={f.family}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500">Size: {layoutConfig.schoolSubtitleSize}px</label>
                    <input
                      type="range"
                      min="9"
                      max="20"
                      step="0.5"
                      value={layoutConfig.schoolSubtitleSize}
                      onChange={(e) => setLayoutConfig({ ...layoutConfig, schoolSubtitleSize: Number(e.target.value) })}
                      className="w-full accent-purple-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Color</label>
                    <input
                      type="color"
                      value={layoutConfig.schoolSubtitleColor}
                      onChange={(e) => setLayoutConfig({ ...layoutConfig, schoolSubtitleColor: e.target.value })}
                      className="w-8 h-7 rounded border cursor-pointer block mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Province & Estd Typography */}
              <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                <label className="block font-bold text-gray-800">2. Province & ESTD (प्रदेश र स्थापना)</label>
                <div>
                  <label className="text-[10px] text-gray-500">Province & Country Line</label>
                  <input
                    type="text"
                    value={layoutConfig.schoolProvinceText}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, schoolProvinceText: e.target.value })}
                    className="erp-input text-xs font-semibold"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500">Province Size: {layoutConfig.schoolProvinceSize}px</label>
                    <input
                      type="range"
                      min="8"
                      max="18"
                      step="0.5"
                      value={layoutConfig.schoolProvinceSize}
                      onChange={(e) => setLayoutConfig({ ...layoutConfig, schoolProvinceSize: Number(e.target.value) })}
                      className="w-full accent-purple-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Color</label>
                    <input
                      type="color"
                      value={layoutConfig.schoolProvinceColor}
                      onChange={(e) => setLayoutConfig({ ...layoutConfig, schoolProvinceColor: e.target.value })}
                      className="w-8 h-7 rounded border cursor-pointer block mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500">ESTD Year Line</label>
                  <input
                    type="text"
                    value={layoutConfig.schoolEstdText}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, schoolEstdText: e.target.value })}
                    className="erp-input text-xs font-semibold"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500">ESTD Size: {layoutConfig.schoolEstdSize}px</label>
                    <input
                      type="range"
                      min="8"
                      max="18"
                      step="0.5"
                      value={layoutConfig.schoolEstdSize}
                      onChange={(e) => setLayoutConfig({ ...layoutConfig, schoolEstdSize: Number(e.target.value) })}
                      className="w-full accent-purple-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Color</label>
                    <input
                      type="color"
                      value={layoutConfig.schoolEstdColor}
                      onChange={(e) => setLayoutConfig({ ...layoutConfig, schoolEstdColor: e.target.value })}
                      className="w-8 h-7 rounded border cursor-pointer block mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Photo Location Offset (Top, Bottom, Left, Right) */}
              <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                <label className="block font-bold text-gray-800">3. Photo Location (फोटोको स्थान र साइज)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showPhoto"
                    checked={layoutConfig.showPhotoFrame}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, showPhotoFrame: e.target.checked })}
                    className="accent-purple-600 rounded"
                  />
                  <label htmlFor="showPhoto" className="font-semibold text-gray-700">
                    Show Photo Box
                  </label>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">↕ Vertical Shift (माथि / तल): {layoutConfig.photoOffsetY}px</label>
                  <input
                    type="range"
                    min="-60"
                    max="60"
                    value={layoutConfig.photoOffsetY}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, photoOffsetY: Number(e.target.value) })}
                    className="w-full accent-purple-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">↔ Horizontal Shift (बायाँ / दायाँ): {layoutConfig.photoOffsetX}px</label>
                  <input
                    type="range"
                    min="-60"
                    max="60"
                    value={layoutConfig.photoOffsetX}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, photoOffsetX: Number(e.target.value) })}
                    className="w-full accent-purple-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] text-gray-500">Width: {layoutConfig.photoFrameWidth}px</label>
                    <input
                      type="range"
                      min="60"
                      max="120"
                      value={layoutConfig.photoFrameWidth}
                      onChange={(e) => setLayoutConfig({ ...layoutConfig, photoFrameWidth: Number(e.target.value) })}
                      className="w-full accent-purple-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Height: {layoutConfig.photoFrameHeight}px</label>
                    <input
                      type="range"
                      min="70"
                      max="140"
                      value={layoutConfig.photoFrameHeight}
                      onChange={(e) => setLayoutConfig({ ...layoutConfig, photoFrameHeight: Number(e.target.value) })}
                      className="w-full accent-purple-600"
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: High-Res Logo / Seal Upload & Settings */}
              <div className="space-y-2 bg-white p-3 rounded-xl border border-purple-200 shadow-2xs">
                <label className="block font-bold text-gray-800 flex items-center justify-between">
                  <span>4. School Seal / Logo (लोगो तथा मुहर)</span>
                  <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded">High-DPI</span>
                </label>

                {/* Logo Preview & Upload Controls */}
                <div className="space-y-2 p-2.5 bg-purple-50/50 rounded-xl border border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-white rounded-lg border border-purple-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs p-1">
                      <img
                        src={layoutConfig.customSealUrl || schoolData?.sealUrl || '/school_seal_red.png'}
                        alt="Seal Preview"
                        className="w-full h-full object-contain"
                        style={{ imageRendering: '-webkit-optimize-contrast' }}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.endsWith('/school_seal_red.png')) {
                            target.src = '/school_seal_red.png';
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-[11px] font-extrabold text-purple-950 truncate">
                        {layoutConfig.customSealUrl
                          ? (layoutConfig.customSealUrl === schoolData?.logoUrl
                              ? 'विद्यालयको लोगो (School Logo)'
                              : layoutConfig.customSealUrl === schoolData?.sealUrl
                              ? 'विद्यालयको आधिकारिक छाप (Official Stamp)'
                              : 'कस्टम लोगो/मुहर (Custom Upload)')
                          : (schoolData?.sealUrl
                              ? 'विद्यालयको आधिकारिक छाप (Official Stamp)'
                              : 'पूर्वनिर्धारित मुहर (Default Red Seal)')}
                      </div>
                      <input
                        type="file"
                        ref={logoFileInputRef}
                        onChange={handleSealLogoUpload}
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-600 text-white text-[11px] font-bold hover:bg-purple-700 transition shadow-xs"
                      >
                        <Upload size={12} />
                        <span>Upload Custom Logo / Seal</span>
                      </button>
                    </div>
                  </div>

                  {/* One-Click Stamp / Logo Quick Switchers */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {schoolData?.sealUrl && (
                      <button
                        type="button"
                        onClick={async () => {
                          const updated = { ...layoutConfig, customSealUrl: schoolData.sealUrl };
                          setLayoutConfig(updated);
                          await handleSaveLayout(updated);
                          toast.success('विद्यालयको आधिकारिक छाप लागू गरियो! (Official Stamp Applied)');
                        }}
                        className={`px-2 py-1 border rounded text-[10px] font-bold transition text-center truncate ${
                          (layoutConfig.customSealUrl === schoolData.sealUrl || (!layoutConfig.customSealUrl && schoolData.sealUrl))
                            ? 'bg-amber-100 border-amber-400 text-amber-950 shadow-2xs font-extrabold'
                            : 'bg-amber-50/70 border-amber-200 text-amber-800 hover:bg-amber-100'
                        }`}
                        title="Use Official Stamp from School Settings"
                      >
                        आधिकारिक छाप (Stamp)
                      </button>
                    )}
                    {schoolData?.logoUrl && (
                      <button
                        type="button"
                        onClick={async () => {
                          const updated = { ...layoutConfig, customSealUrl: schoolData.logoUrl };
                          setLayoutConfig(updated);
                          await handleSaveLayout(updated);
                          toast.success('विद्यालयको लोगो लागू गरियो! (School Logo Applied)');
                        }}
                        className={`px-2 py-1 border rounded text-[10px] font-bold transition text-center truncate ${
                          layoutConfig.customSealUrl === schoolData.logoUrl
                            ? 'bg-blue-100 border-blue-400 text-blue-950 shadow-2xs font-extrabold'
                            : 'bg-blue-50/70 border-blue-200 text-blue-800 hover:bg-blue-100'
                        }`}
                        title="Use School Logo from School Settings"
                      >
                        विद्यालय लोगो (Logo)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        const updated = { ...layoutConfig, customSealUrl: '/school_seal_red.png' };
                        setLayoutConfig(updated);
                        await handleSaveLayout(updated);
                        toast.success('रातो मुहर लागू गरियो! (Red Seal Applied)');
                      }}
                      className={`px-2 py-1 border rounded text-[10px] font-bold transition text-center truncate ${
                        layoutConfig.customSealUrl === '/school_seal_red.png'
                          ? 'bg-rose-100 border-rose-400 text-rose-950 shadow-2xs font-extrabold'
                          : 'bg-rose-50/70 border-rose-200 text-rose-800 hover:bg-rose-100'
                      }`}
                    >
                      रातो मुहर (Red Seal)
                    </button>
                    {layoutConfig.customSealUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveCustomSeal}
                        className="px-2 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-[10px] font-semibold text-gray-700 transition text-center truncate"
                      >
                        पूर्वनिर्धारित रिसेट
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showSeal"
                    checked={layoutConfig.showSeal}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, showSeal: e.target.checked })}
                    className="accent-purple-600 rounded"
                  />
                  <label htmlFor="showSeal" className="font-semibold text-gray-700">
                    Show Seal / Logo
                  </label>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-bold">
                    Seal / Logo Display Size: {layoutConfig.sealSize}px (लोगो साइज ठूलो बनाउनुहोस्)
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="220"
                    value={layoutConfig.sealSize}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, sealSize: Number(e.target.value) })}
                    className="w-full accent-purple-600"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                  <input
                    type="checkbox"
                    id="showIemis"
                    checked={layoutConfig.showIemisBadge}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, showIemisBadge: e.target.checked })}
                    className="accent-purple-600 rounded"
                  />
                  <label htmlFor="showIemis" className="font-semibold text-gray-700">
                    Display IEMIS Code
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500">Badge Label</label>
                    <input
                      type="text"
                      value={layoutConfig.iemisBadgeText}
                      onChange={(e) => setLayoutConfig({ ...layoutConfig, iemisBadgeText: e.target.value })}
                      className="erp-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Color</label>
                    <input
                      type="color"
                      value={layoutConfig.iemisBadgeColor}
                      onChange={(e) => setLayoutConfig({ ...layoutConfig, iemisBadgeColor: e.target.value })}
                      className="w-8 h-7 rounded border cursor-pointer block mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: BACKGROUND & HIGH RESOLUTION CUSTOMIZATION */}
          {activeCustomizerSection === 'background' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1 text-xs">
              {/* Background Mode Selection */}
              <div className="space-y-3 bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs">
                <label className="block font-bold text-gray-800">
                  Background Frame Style (प्रमाणपत्र पृष्ठभूमि ढाँचा):
                </label>
                <div className="space-y-1.5">
                  {[
                    { id: 'default', label: '🛡️ Official Security Pattern (Default High-Res)', desc: 'Standard security background' },
                    { id: 'custom', label: '🖼️ Custom Uploaded Image (आफ्नो पृष्ठभूमि)', desc: 'Upload high-resolution JPG/PNG file' },
                    { id: 'ornate-border', label: '⚜️ Classic Gold Double Border (राजकीय बोर्डर)', desc: 'Sharp vector double border' },
                    { id: 'none', label: '⚪ Plain / No Background (सादा सेतो कागज)', desc: 'For printing on pre-printed school paper' },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition ${
                        layoutConfig.backgroundMode === opt.id
                          ? 'border-purple-600 bg-purple-50/60 font-bold text-purple-900'
                          : 'border-gray-200 text-gray-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="backgroundMode"
                        value={opt.id}
                        checked={layoutConfig.backgroundMode === opt.id}
                        onChange={() => setLayoutConfig({ ...layoutConfig, backgroundMode: opt.id as any })}
                        className="mt-0.5 accent-purple-600"
                      />
                      <div>
                        <div className="text-xs font-bold">{opt.label}</div>
                        <div className="text-[10px] text-gray-500 font-normal">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Upload High-Res Custom Background */}
              <div className="space-y-3 bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs">
                <label className="block font-bold text-gray-800">
                  Custom High-Res Background Image (नयाँ पृष्ठभूमि छान्नुहोस्):
                </label>
                <p className="text-[11px] text-gray-500">
                  कम्प्युटरबाट सफा, उच्च गुणस्तरको (High Resolution A4 Landscape) तस्बिर अपलोड गर्नुहोस्। यो सबै कम्प्युटरमा स्वतः सुरक्षित हुनेछ।
                </p>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => bgFileInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 hover:bg-purple-100 font-bold transition shadow-2xs"
                  >
                    <Upload size={15} />
                    <span>Upload Background Image (नयाँ पृष्ठभूमि अपलोड)</span>
                  </button>

                  {layoutConfig.customBackgroundUrl && (
                    <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      <img
                        src={layoutConfig.customBackgroundUrl}
                        alt="Current Custom Background"
                        className="w-16 h-11 object-cover rounded border border-gray-300"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.endsWith('/certificate_bg.jpg')) {
                            target.src = '/certificate_bg.jpg';
                          }
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10.5px] font-bold text-emerald-700 block truncate">Custom Background Active</span>
                        <button
                          type="button"
                          onClick={handleRemoveBackground}
                          className="text-[10px] text-rose-600 hover:underline font-semibold"
                        >
                          Remove Background (हटाउनुहोस्)
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleResetDefaultBackground}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 font-semibold text-[11px] transition"
                  >
                    <RotateCcw size={12} />
                    <span>Reset to Default NSSB Background (पूर्वनिर्धारित)</span>
                  </button>
                </div>
              </div>

              {/* Apply to Which Certificates */}
              <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs">
                <label className="block font-bold text-gray-800">
                  Apply Background To (कुन-कुन प्रमाणपत्रमा लागू गर्ने):
                </label>
                <p className="text-[10px] text-gray-400">
                  सबै प्रमाणपत्र वा इच्छा अनुसार छानिएका प्रमाणपत्रहरूमा पृष्ठभूमि लागू गर्नुहोस्:
                </p>

                <div className="space-y-2 pt-1 border-t border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={layoutConfig.bgApplyToAll}
                      onChange={(e) =>
                        setLayoutConfig({
                          ...layoutConfig,
                          bgApplyToAll: e.target.checked,
                          bgApplyToBonafide: e.target.checked,
                          bgApplyToAppreciation: e.target.checked,
                        })
                      }
                      className="accent-purple-600 rounded"
                    />
                    <span>All Certificates (सबै प्रमाणपत्रहरूमा लागू गर्नुहोस्)</span>
                  </label>

                  <div className="pl-5 space-y-1.5 text-gray-600">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="accent-purple-600 rounded opacity-60"
                      />
                      <span>Character & Transfer Certificate (CC / TC)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={layoutConfig.bgApplyToAll || layoutConfig.bgApplyToBonafide}
                        onChange={(e) =>
                          setLayoutConfig({
                            ...layoutConfig,
                            bgApplyToBonafide: e.target.checked,
                            bgApplyToAll: e.target.checked && layoutConfig.bgApplyToAppreciation,
                          })
                        }
                        className="accent-purple-600 rounded"
                      />
                      <span>Bonafide Student Certificate (बोनाफाइड प्रमाणपत्र)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={layoutConfig.bgApplyToAll || layoutConfig.bgApplyToAppreciation}
                        onChange={(e) =>
                          setLayoutConfig({
                            ...layoutConfig,
                            bgApplyToAppreciation: e.target.checked,
                            bgApplyToAll: e.target.checked && layoutConfig.bgApplyToBonafide,
                          })
                        }
                        className="accent-purple-600 rounded"
                      />
                      <span>Certificate of Appreciation (प्रशंसापत्र)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: PARAGRAPH-WISE SIZES & INDENTS */}
          {activeCustomizerSection === 'body' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-xs">
              <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                <label className="block font-bold text-gray-800">Paragraph 1 (Certification Body)</label>
                <div>
                  <label className="text-[10px] text-gray-500">Font Size: {layoutConfig.bodyFontSizeP1}px</label>
                  <input
                    type="range"
                    min="11"
                    max="18"
                    step="0.5"
                    value={layoutConfig.bodyFontSizeP1}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, bodyFontSizeP1: Number(e.target.value) })}
                    className="w-full accent-purple-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">Paragraph 1 Indent: {layoutConfig.bodyIndentP1}px</label>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={layoutConfig.bodyIndentP1}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, bodyIndentP1: Number(e.target.value) })}
                    className="w-full accent-purple-600"
                  />
                </div>
              </div>

              <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                <label className="block font-bold text-gray-800">Paragraph 2 (Character Assessment)</label>
                <div>
                  <label className="text-[10px] text-gray-500">Font Size: {layoutConfig.bodyFontSizeP2}px</label>
                  <input
                    type="range"
                    min="11"
                    max="18"
                    step="0.5"
                    value={layoutConfig.bodyFontSizeP2}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, bodyFontSizeP2: Number(e.target.value) })}
                    className="w-full accent-purple-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">Paragraph 2 Indent: {layoutConfig.bodyIndentP2}px</label>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={layoutConfig.bodyIndentP2}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, bodyIndentP2: Number(e.target.value) })}
                    className="w-full accent-purple-600"
                  />
                </div>
              </div>

              <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                <label className="block font-bold text-gray-800">Paragraph 3 (Wishes / Conclusion)</label>
                <div>
                  <label className="text-[10px] text-gray-500">Font Size: {layoutConfig.bodyFontSizeP3}px</label>
                  <input
                    type="range"
                    min="11"
                    max="18"
                    step="0.5"
                    value={layoutConfig.bodyFontSizeP3}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, bodyFontSizeP3: Number(e.target.value) })}
                    className="w-full accent-purple-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">Paragraph 3 Indent: {layoutConfig.bodyIndentP3}px</label>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={layoutConfig.bodyIndentP3}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, bodyIndentP3: Number(e.target.value) })}
                    className="w-full accent-purple-600"
                  />
                </div>
              </div>

              <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                <label className="block font-bold text-gray-800">Student Particulars Details</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showPart"
                    checked={layoutConfig.showParticularsBox}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, showParticularsBox: e.target.checked })}
                    className="accent-purple-600 rounded"
                  />
                  <label htmlFor="showPart" className="font-semibold text-gray-700">
                    Display Symbol No & NEB Reg Box
                  </label>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">Particulars Font Size: {layoutConfig.particularsFontSize}px</label>
                  <input
                    type="range"
                    min="10"
                    max="16"
                    value={layoutConfig.particularsFontSize}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, particularsFontSize: Number(e.target.value) })}
                    className="w-full accent-purple-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: SIGNATURES & FOOTER */}
          {activeCustomizerSection === 'footer' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs">
              <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                <label className="block font-bold text-gray-800">Signature Line Style (हस्ताक्षर रेखा)</label>
                <select
                  value={layoutConfig.sigLineStyle}
                  onChange={(e: any) => setLayoutConfig({ ...layoutConfig, sigLineStyle: e.target.value })}
                  className="erp-input font-bold text-xs"
                >
                  <option value="none">Plain Text (No Line - Default)</option>
                  <option value="clean-line">Clean Solid Line Above Title (सफा रेखा)</option>
                  <option value="solid-underline">Solid Underline (तल रेखा)</option>
                </select>
                <div className="space-y-1 mt-2">
                  <label className="text-[10px] text-gray-500">Footer Font</label>
                  <select
                    value={layoutConfig.sigFont}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, sigFont: e.target.value })}
                    className="erp-input font-bold text-xs"
                  >
                    {CERTIFICATE_FONTS.map((f) => (
                      <option key={f.id} value={f.family}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <div>
                    <label className="text-[10px] text-gray-500">Font Size: {layoutConfig.sigFontSize}px</label>
                    <input
                      type="range"
                      min="10"
                      max="18"
                      value={layoutConfig.sigFontSize}
                      onChange={(e) => setLayoutConfig({ ...layoutConfig, sigFontSize: Number(e.target.value) })}
                      className="w-full accent-purple-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Color</label>
                    <input
                      type="color"
                      value={layoutConfig.sigTextColor}
                      onChange={(e) => setLayoutConfig({ ...layoutConfig, sigTextColor: e.target.value })}
                      className="w-8 h-7 rounded border cursor-pointer block"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                <label className="block font-bold text-gray-800">Signature Titles (हस्ताक्षर पद)</label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Left title e.g. Prepared By:"
                    value={layoutConfig.preparedByLabel}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, preparedByLabel: e.target.value })}
                    className="erp-input text-xs font-semibold"
                  />
                  <input
                    type="text"
                    placeholder="Center title e.g. Seal of School"
                    value={layoutConfig.sealCenterLabel}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, sealCenterLabel: e.target.value })}
                    className="erp-input text-xs font-semibold"
                  />
                  <input
                    type="text"
                    placeholder="Right title e.g. Principal"
                    value={layoutConfig.principalLabel}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, principalLabel: e.target.value })}
                    className="erp-input text-xs font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                <label className="block font-bold text-gray-800">Date of Issue Position & Style</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showDate"
                    checked={layoutConfig.showDateOfIssue}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, showDateOfIssue: e.target.checked })}
                    className="accent-purple-600 rounded"
                  />
                  <label htmlFor="showDate" className="font-semibold text-gray-700">
                    Show Date of Issue
                  </label>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">Position</label>
                  <select
                    value={layoutConfig.dateOfIssuePosition}
                    onChange={(e: any) => setLayoutConfig({ ...layoutConfig, dateOfIssuePosition: e.target.value })}
                    className="erp-input font-bold text-xs"
                  >
                    <option value="left">Left Aligned (बायाँ)</option>
                    <option value="center">Center Aligned (बिचमा)</option>
                    <option value="right">Right Aligned (दायाँ)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: SPACING & MARGINS */}
          {activeCustomizerSection === 'margins' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs">
              <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                <label className="block font-bold text-gray-800">Page Margins (A4 Landscape)</label>
                <div>
                  <label className="text-[10px] text-gray-500">Top Margin: {layoutConfig.pagePaddingTopMm}mm</label>
                  <input
                    type="range"
                    min="8"
                    max="28"
                    value={layoutConfig.pagePaddingTopMm}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, pagePaddingTopMm: Number(e.target.value) })}
                    className="w-full accent-purple-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">Bottom Margin: {layoutConfig.pagePaddingBottomMm}mm</label>
                  <input
                    type="range"
                    min="6"
                    max="24"
                    value={layoutConfig.pagePaddingBottomMm}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, pagePaddingBottomMm: Number(e.target.value) })}
                    className="w-full accent-purple-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">Side Margin: {layoutConfig.pagePaddingSideMm}mm</label>
                  <input
                    type="range"
                    min="12"
                    max="36"
                    value={layoutConfig.pagePaddingSideMm}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, pagePaddingSideMm: Number(e.target.value) })}
                    className="w-full accent-purple-600"
                  />
                </div>
              </div>

              <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                <label className="block font-bold text-gray-800">Element Top/Bottom Offsets</label>
                <div>
                  <label className="text-[10px] text-gray-500">Footer Top Offset: {layoutConfig.footerMarginTop}px</label>
                  <input
                    type="range"
                    min="4"
                    max="30"
                    value={layoutConfig.footerMarginTop}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, footerMarginTop: Number(e.target.value) })}
                    className="w-full accent-purple-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">Title Top Offset: {layoutConfig.certTitleMarginTop}px</label>
                  <input
                    type="range"
                    min="4"
                    max="24"
                    value={layoutConfig.certTitleMarginTop}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, certTitleMarginTop: Number(e.target.value) })}
                    className="w-full accent-purple-600"
                  />
                </div>
              </div>

              <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-100 shadow-2xs flex flex-col justify-center">
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 text-[11px] text-purple-900 leading-relaxed">
                  💡 <strong>Tip:</strong> All typography selections, paragraph sizes, and offsets reflect directly on the certificate preview and in borderless A4 landscape print.
                </div>
              </div>
            </div>
          )}

          {/* Persistent Save Action Bar at the Bottom of Customizer */}
          <div className="pt-4 border-t border-purple-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/70 p-3 rounded-xl">
            <div className="flex items-center gap-2 text-[11px] text-gray-600 font-medium">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>
                परिवर्तनहरू प्रत्यक्ष देखिन्छन्। सधैँका लागि सुरक्षित गर्न दायाँको बटन थिच्नुहोस्।
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSaveLayout()}
              disabled={isSavingLayout}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-md disabled:opacity-50"
            >
              <Save size={14} />
              <span>{isSavingLayout ? 'Saving...' : 'Save Layout Changes (सधैँका लागि सुरक्षित गर्नुहोस्)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════ TAB 1: ISSUE CERTIFICATE ════════════════════ */}
      {activeTab === 'issue' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Step 1: Student Search or Direct Manual Entry */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] flex items-center gap-1.5">
                  <Search size={14} />
                  <span>1. Student Selection / Manual Entry</span>
                </h2>
                <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md">
                  {selectedStudent ? 'Database Student' : 'Manual / Past Student'}
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search enrolled student by name, ID or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="erp-input pl-9 text-xs"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              </div>

              {/* Search dropdown results */}
              {searchResults && searchResults.length > 0 && (
                <div className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-50 shadow-md max-h-48 overflow-y-auto">
                  {searchResults.map((st: any) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleSelectStudent(st)}
                      className="w-full p-2.5 text-left hover:bg-slate-50 transition flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-gray-900">{st.fullName}</div>
                        <div className="text-[10px] text-gray-500 font-nepali">
                          Class: {st.classEnrollment?.[0]?.class?.name || 'N/A'} | Roll: {st.classEnrollment?.[0]?.rollNo || 'N/A'} | ID: {st.studentId}
                        </div>
                      </div>
                      <span className="text-[10px] rounded bg-blue-50 px-2 py-0.5 font-bold text-blue-700">Select</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Student Name Direct Editable Input */}
              <div className="pt-1">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Student Full Name (विद्यार्थीको पूरा नाम - सधैँ क्यापिटल र बोल्ड):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={effectiveName}
                    onChange={(e) => {
                      setManualStudentName(e.target.value.toUpperCase());
                      if (selectedStudent) setSelectedStudent(null);
                    }}
                    placeholder="ENTER STUDENT FULL NAME..."
                    className="erp-input uppercase font-extrabold text-xs pl-8 text-gray-900"
                  />
                  <UserCheck className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  💡 Type name directly for past alumni or search from current database above. (Always Capital & Bold)
                </p>
              </div>
            </div>

            {/* Step 2: Certificate Type & Custom Info */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f] flex items-center gap-1.5">
                <Award size={14} />
                <span>2. Certificate Type & Particulars</span>
              </h2>

              {/* Certificate Type Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                {[
                  { id: 'CHARACTER', label: 'Character Certificate (CC)', icon: '📜' },
                  { id: 'TRANSFER', label: 'Transfer Certificate (TC)', icon: '🔄' },
                  { id: 'BONAFIDE', label: 'Bonafide Student', icon: '🎓' },
                  { id: 'APPRECIATION', label: 'Certificate of Appreciation', icon: '🏆' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCertType(t.id as any)}
                    className={`rounded-xl border p-2.5 text-left transition flex flex-col gap-1 ${
                      certType === t.id
                        ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f] font-extrabold ring-1 ring-[#1e3a5f]'
                        : 'border-gray-100 text-gray-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm">{t.icon}</span>
                    <span className="text-[11px] leading-tight">{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Particulars Fields */}
              <div className="space-y-3 pt-2 text-xs border-t border-gray-100">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Prefix</label>
                    <select
                      value={studentTitle}
                      onChange={(e: any) => setStudentTitle(e.target.value)}
                      className="erp-input font-bold"
                    >
                      <option value="Miss.">Miss.</option>
                      <option value="Mr.">Mr.</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Father's Full Name (बुवाको नाम)</label>
                    <input
                      type="text"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value.toUpperCase())}
                      placeholder="FATHER'S FULL NAME..."
                      className="erp-input uppercase font-extrabold text-gray-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Mother's Full Name (आमाको नाम)</label>
                    <input
                      type="text"
                      value={motherName}
                      onChange={(e) => setMotherName(e.target.value.toUpperCase())}
                      placeholder="MOTHER'S FULL NAME..."
                      className="erp-input uppercase font-extrabold text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1 flex items-center justify-between">
                      <span>Student Photo (पासपोर्ट फोटो)</span>
                      {effectivePhoto && (
                        <button
                          type="button"
                          onClick={() => {
                            setManualPhotoUrl('');
                            if (selectedStudent) setSelectedStudent({ ...selectedStudent, photoUrl: null });
                          }}
                          className="text-[10px] text-red-600 font-bold hover:underline"
                        >
                          Remove (हटाउनुहोस्)
                        </button>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                        {effectivePhoto ? (
                          <img src={effectivePhoto} alt="Photo" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={16} className="text-gray-400" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPhotoModal(true)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 font-bold text-xs transition shadow-2xs"
                      >
                        <Camera size={13} />
                        <span>{effectivePhoto ? 'Change Photo (फोटो बदल्नुहोस्)' : 'Upload / Snap Photo (फोटो लिनुहोस्)'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Structured Nepal 753 Address Selector */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-blue-950 flex items-center gap-1">
                      <MapPin size={13} className="text-blue-600" />
                      <span>Permanent Address (स्थायी ठेगाना):</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddressBuilder(!showAddressBuilder)}
                      className="text-[10px] text-blue-700 font-bold hover:underline"
                    >
                      {showAddressBuilder ? 'Hide Selector ▲' : 'Choose 753 Local Level ▼'}
                    </button>
                  </div>

                  {showAddressBuilder && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-blue-100 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-gray-600">Province (प्रदेश):</label>
                        <select
                          value={addrProvince}
                          onChange={(e) => {
                            const newProv = e.target.value;
                            setAddrProvince(newProv);
                            const dists = getDistrictsByProvince(newProv);
                            const newDist = dists[0] || '';
                            setAddrDistrict(newDist);
                            const lls = getLocalLevelsByDistrict(newDist);
                            const newLl = lls[0] || '';
                            setAddrLocalLevel(newLl);
                            updateFormattedAddress(newLl, addrWard, newDist, newProv, addrCountry);
                          }}
                          className="erp-input text-xs font-semibold"
                        >
                          {NEPAL_PROVINCES.map((p) => (
                            <option key={p} value={p}>
                              {p} Province
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-600">District (जिल्ला):</label>
                        <select
                          value={addrDistrict}
                          onChange={(e) => {
                            const newDist = e.target.value;
                            setAddrDistrict(newDist);
                            const lls = getLocalLevelsByDistrict(newDist);
                            const newLl = lls[0] || '';
                            setAddrLocalLevel(newLl);
                            updateFormattedAddress(newLl, addrWard, newDist, addrProvince, addrCountry);
                          }}
                          className="erp-input text-xs font-semibold"
                        >
                          {availableDistricts.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-600">Local Level (७५३ पालिका):</label>
                        <select
                          value={addrLocalLevel}
                          onChange={(e) => {
                            const newLl = e.target.value;
                            setAddrLocalLevel(newLl);
                            updateFormattedAddress(newLl, addrWard, addrDistrict, addrProvince, addrCountry);
                          }}
                          className="erp-input text-xs font-semibold"
                        >
                          {availableLocalLevels.map((ll) => (
                            <option key={ll} value={ll}>
                              {ll}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-600">Ward No (वडा नं):</label>
                        <input
                          type="number"
                          min="1"
                          max="35"
                          value={addrWard}
                          onChange={(e) => {
                            const newW = e.target.value;
                            setAddrWard(newW);
                            updateFormattedAddress(addrLocalLevel, newW, addrDistrict, addrProvince, addrCountry);
                          }}
                          className="erp-input text-xs font-bold font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* Final Editable Address Output */}
                  <input
                    type="text"
                    value={permanentAddress}
                    onChange={(e) => setPermanentAddress(e.target.value)}
                    className="erp-input font-semibold text-xs"
                    placeholder="e.g. Brindawan Municipality-3, Rautahat, Madhesh Province, Nepal"
                  />
                </div>

                {/* 2-Way Auto Date Year Conversion */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1 flex items-center justify-between">
                      <span>Passed Year (B.S.)</span>
                      <span className="text-[9px] text-blue-600 font-normal">Auto ⇄ A.D.</span>
                    </label>
                    <input
                      type="text"
                      value={passedYearBs}
                      onChange={(e) => handlePassedYearBsChange(e.target.value)}
                      placeholder="e.g. 2079 B.S."
                      className="erp-input font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1 flex items-center justify-between">
                      <span>Passed Year (A.D.)</span>
                      <span className="text-[9px] text-blue-600 font-normal">Auto ⇄ B.S.</span>
                    </label>
                    <input
                      type="text"
                      value={passedYearAd}
                      onChange={(e) => handlePassedYearAdChange(e.target.value)}
                      placeholder="e.g. 2022 A.D."
                      className="erp-input font-bold font-mono"
                    />
                  </div>
                </div>

                {/* Examination Board Dropdown & Editable */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Exam Board (परीक्षा बोर्ड):
                  </label>
                  <select
                    value={examBoard}
                    onChange={(e) => setExamBoard(e.target.value)}
                    className="erp-input font-bold text-xs"
                  >
                    <option value="National Examinations Board">National Examinations Board</option>
                    <option value="Office Controller of Examination">Office Controller of Examination</option>
                    <option value="National Examinations Board, Sanothimi, Bhaktapur">
                      National Examinations Board, Sanothimi, Bhaktapur
                    </option>
                  </select>
                </div>

                {/* Passed Exam / Level Dropdown & Editable */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Passed Exam / Level Title (तह / परीक्षा):
                  </label>
                  <select
                    value={passedExamLevel}
                    onChange={(e) => setPassedExamLevel(e.target.value)}
                    className="erp-input font-bold text-xs mb-1"
                  >
                    <option value="School Leaving Certificate Examination (Grade XII)">
                      School Leaving Certificate Examination (Grade XII)
                    </option>
                    <option value="Secondary Education Examination (Grade X)">
                      Secondary Education Examination (Grade X)
                    </option>
                    <option value="School Leaving Certificate Examination (Grade X)">
                      School Leaving Certificate Examination (Grade X)
                    </option>
                    <option value="Basic Education Examination (Grade VIII)">
                      Basic Education Examination (Grade VIII)
                    </option>
                  </select>
                  <input
                    type="text"
                    value={passedExamLevel}
                    onChange={(e) => setPassedExamLevel(e.target.value)}
                    className="erp-input font-semibold text-xs"
                    placeholder="Or type custom level name..."
                  />
                </div>

                {/* GPA & 2-Way DOB Auto Conversion */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">GPA</label>
                    <input
                      type="text"
                      value={gpa}
                      onChange={(e) => setGpa(e.target.value)}
                      className="erp-input font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">DOB (B.S.)</label>
                    <input
                      type="text"
                      value={dobBs}
                      onChange={(e) => handleDobBsChange(e.target.value)}
                      placeholder="YYYY-MM-DD"
                      className="erp-input font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">DOB (A.D.)</label>
                    <input
                      type="text"
                      value={dobAd}
                      onChange={(e) => handleDobAdChange(e.target.value)}
                      placeholder="MM/DD/YYYY"
                      className="erp-input font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Exam Symbol No.</label>
                    <input
                      type="text"
                      value={symbolNo}
                      onChange={(e) => setSymbolNo(e.target.value)}
                      className="erp-input font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">NEB / Student Reg. No.</label>
                    <input
                      type="text"
                      value={nebRegNo}
                      onChange={(e) => setNebRegNo(e.target.value)}
                      className="erp-input font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Issue Date (B.S.)</label>
                    <input
                      type="text"
                      value={issuedDateBs}
                      onChange={(e) => handleIssuedDateBsChange(e.target.value)}
                      className="erp-input font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-blue-900 mb-1">Issue Date (A.D. - प्रिन्ट हुने)</label>
                    <input
                      type="text"
                      value={issuedDateAd}
                      onChange={(e) => setIssuedDateAd(e.target.value)}
                      placeholder="YYYY-MM-DD"
                      className="erp-input font-mono font-bold text-blue-900 border-blue-300 bg-blue-50/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Issued By / Signatory</label>
                    <input
                      type="text"
                      value={issuedBy}
                      onChange={(e) => setIssuedBy(e.target.value)}
                      className="erp-input font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={issueCertMutation.isPending || !effectiveName}
                  onClick={() => issueCertMutation.mutate()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] py-3 text-xs font-bold text-white hover:bg-[#2a5280] transition shadow-xs disabled:opacity-50"
                >
                  <Award size={15} />
                  <span>
                    {issueCertMutation.isPending
                      ? 'Generating Certificate...'
                      : `Save & Issue ${certType} Certificate (प्रमाणपत्र जारी गर्नुहोस्)`}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Live Preview (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Eye size={14} />
                <span>Live Certificate Preview (प्रत्यक्ष पूर्वावलोकन)</span>
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={bgFileInputRef}
                  onChange={handleBackgroundUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => bgFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold hover:bg-amber-100 transition shadow-2xs"
                  title="Upload high quality custom certificate background image"
                >
                  <Upload size={13} />
                  <span>Upload Bg (पृष्ठभूमि)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLayoutDrawer(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold hover:bg-purple-100 transition shadow-2xs"
                >
                  <Sliders size={13} />
                  <span>Adjust Layout</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    triggerCertificatePrint({
                      type: certType,
                      student: selectedStudent,
                      issuedDateBs,
                      data: {
                        studentTitle,
                        fatherName,
                        motherName,
                        permanentAddress,
                        passedYearBs,
                        passedYearAd,
                        examBoard,
                        passedExamLevel,
                        gpa,
                        dobBs,
                        dobAd,
                        symbolNo,
                        nebRegNo,
                        preparedBy,
                        dateOfIssue: issuedDateAd,
                        dateOfIssueAd: issuedDateAd,
                        dateOfIssueBs: issuedDateBs,
                        characterGrade,
                        destinationSchool,
                        reasonForLeave,
                        appreciationFor,
                        studentName: effectiveName,
                      },
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1e3a5f] text-white text-xs font-bold hover:bg-[#2a5280] transition shadow-xs"
                >
                  <Printer size={13} />
                  <span>Print Direct (सिधै प्रिन्ट गर्नुहोस्)</span>
                </button>
              </div>
            </div>

            {/* Certificate Card Render (Dynamic Security Bg vs Clean Card Bg) */}
            {(() => {
              const bg = getCertificateBgStyle(certType);
              const headerSideWidth = Math.max(96, Math.round(layoutConfig.sealSize * 0.9));
              return (
                <div
                  className={`rounded-2xl shadow-xl text-center relative overflow-hidden flex flex-col justify-between ${
                    bg.border ? '' : 'border border-amber-900/20'
                  }`}
                  style={{
                    backgroundColor: bg.background || '#ffffff',
                    border: bg.border !== 'none' ? bg.border : undefined,
                    outline: bg.outline,
                    outlineOffset: bg.outlineOffset,
                    minHeight: '520px',
                    fontFamily: layoutConfig.bodyFont,
                  }}
                >
                  {bg.isImage && bg.imgUrl && (
                    <img
                      src={bg.imgUrl}
                      alt="Certificate Background"
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
                      style={{ imageRendering: '-webkit-optimize-contrast' }}
                    />
                  )}
                  <div
                    className="relative z-10 flex flex-col justify-between h-full"
                    style={{
                      padding: `${layoutConfig.pagePaddingTopMm * 1.3}px ${layoutConfig.pagePaddingSideMm * 1.3}px ${layoutConfig.pagePaddingBottomMm * 1.3}px ${layoutConfig.pagePaddingSideMm * 1.3}px`,
                      minHeight: '520px',
                    }}
                  >
                  {/* Header Layout */}
                  <div className="flex items-start justify-between gap-3">
                    {/* Left IEMIS + Seal */}
                    <div style={{ width: `${headerSideWidth}px` }} className="flex flex-col items-center text-center shrink-0">
                      {layoutConfig.showIemisBadge && (
                        <div
                          className="text-[9px] font-extrabold font-sans tracking-wide"
                          style={{ color: layoutConfig.iemisBadgeColor }}
                        >
                          {layoutConfig.iemisBadgeText} {schoolData?.emisCode || '320160005'}
                        </div>
                      )}
                      {layoutConfig.showSeal && (
                        <div
                          onClick={() => logoFileInputRef.current?.click()}
                          className="relative group cursor-pointer"
                          title="Click to upload/change School Logo"
                        >
                          <img
                            src={layoutConfig.customSealUrl || schoolData?.sealUrl || '/school_seal_red.png'}
                            alt="School Seal"
                            style={{
                              width: `${layoutConfig.sealSize * 0.85}px`,
                              height: `${layoutConfig.sealSize * 0.85}px`,
                              imageRendering: '-webkit-optimize-contrast',
                            }}
                            className="object-contain mt-0.5 transition group-hover:scale-105"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (!target.src.endsWith('/school_seal_red.png')) {
                                target.src = '/school_seal_red.png';
                              }
                            }}
                          />
                          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-purple-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap transition">
                            Change Logo
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Center School Titles */}
                    <div className="flex-1 text-center px-1">
                      <h1
                        className="leading-tight uppercase tracking-wider"
                        style={{
                          fontFamily: layoutConfig.schoolTitleFont,
                          fontSize: `${layoutConfig.schoolTitleSize * 0.75}px`,
                          color: layoutConfig.schoolTitleColor,
                          fontWeight: layoutConfig.schoolTitleWeight,
                          letterSpacing: `${layoutConfig.schoolTitleLetterSpacing}px`,
                        }}
                      >
                        {effectiveSchoolName}
                      </h1>
                      <div
                        className="font-bold uppercase tracking-wide mt-0.5"
                        style={{
                          fontFamily: layoutConfig.schoolSubtitleFont,
                          fontSize: `${layoutConfig.schoolSubtitleSize * 0.85}px`,
                          color: layoutConfig.schoolSubtitleColor,
                        }}
                      >
                        {effectiveSchoolAddress}
                      </div>
                      <div
                        className="font-bold uppercase tracking-wide"
                        style={{
                          fontFamily: layoutConfig.schoolProvinceFont,
                          fontSize: `${layoutConfig.schoolProvinceSize * 0.85}px`,
                          color: layoutConfig.schoolProvinceColor,
                        }}
                      >
                        {effectiveSchoolProvince}
                      </div>
                      <div
                        className="font-bold mt-0.5"
                        style={{
                          fontFamily: layoutConfig.schoolEstdFont,
                          fontSize: `${layoutConfig.schoolEstdSize * 0.85}px`,
                          color: layoutConfig.schoolEstdColor,
                        }}
                      >
                        {effectiveSchoolEstd}
                      </div>

                      <div
                        style={{
                          marginTop: `${layoutConfig.certTitleMarginTop * 0.7}px`,
                          marginBottom: `${layoutConfig.certTitleMarginBottom * 0.7}px`,
                        }}
                      >
                        <span
                          className="font-black uppercase tracking-widest"
                          style={{
                            fontFamily: layoutConfig.certTitleFont,
                            fontSize: `${layoutConfig.certTitleSize * 0.8}px`,
                            color: layoutConfig.certTitleColor,
                            letterSpacing: `${layoutConfig.certTitleLetterSpacing}px`,
                            textTransform: layoutConfig.certTitleTextTransform,
                            textShadow: layoutConfig.certTitleShadow ? '1px 1px 1px #e9d5ff' : 'none',
                          }}
                        >
                          {certType === 'CHARACTER' || certType === 'TRANSFER'
                            ? 'CHARACTER / TRANSFER CERTIFICATE'
                            : `${certType} CERTIFICATE`}
                        </span>
                      </div>
                    </div>

                    {/* Right Photo Frame */}
                    <div style={{ width: `${headerSideWidth}px` }} className="flex justify-end shrink-0">
                      {layoutConfig.showPhotoFrame ? (
                        <div
                          className="bg-white/90 flex items-center justify-center overflow-hidden shadow-2xs"
                          style={{
                            width: `${layoutConfig.photoFrameWidth * 0.8}px`,
                            height: `${layoutConfig.photoFrameHeight * 0.8}px`,
                            border: `1.5px solid ${layoutConfig.photoFrameBorderColor}`,
                            borderRadius: `${layoutConfig.photoFrameBorderRadius}px`,
                            transform: `translate(${layoutConfig.photoOffsetX * 0.8}px, ${layoutConfig.photoOffsetY * 0.8}px)`,
                          }}
                        >
                          {effectivePhoto ? (
                            <img
                              src={effectivePhoto}
                              alt="Photo"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[8px] text-gray-400 font-sans text-center leading-tight">
                              PP Size
                              <br />
                              Photo
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="w-16"></div>
                      )}
                    </div>
                  </div>

                  {/* Body Content Paragraph-Wise */}
                  <div
                    className="text-left space-y-2 py-2"
                    style={{
                      fontFamily: layoutConfig.bodyFont,
                      lineHeight: layoutConfig.bodyLineHeight,
                      color: layoutConfig.bodyTextColor,
                      textAlign: layoutConfig.bodyTextAlign,
                    }}
                  >
                    {certType === 'CHARACTER' || certType === 'TRANSFER' ? (
                      <>
                        <p style={{ textIndent: `${(layoutConfig.bodyIndentP1 ?? layoutConfig.bodyIndent) * 0.75}px`, fontSize: `${layoutConfig.bodyFontSizeP1 * 0.85}px` }}>
                          This is to certify that {currentTitle}{' '}
                          <strong className="text-black font-extrabold uppercase">{(effectiveName || '________________________').toUpperCase()}</strong>{' '}
                          {currentRelationship} of Mr.{' '}
                          <strong className="text-black font-extrabold uppercase">{(fatherName || '________________________').toUpperCase()}</strong> and Mrs.{' '}
                          <strong className="text-black font-extrabold uppercase">{(motherName || '________________________').toUpperCase()}</strong> permanent resident of{' '}
                          <strong className="text-black font-extrabold uppercase">{permanentAddress || '________________________________________________'}</strong> was a regular student of
                          this institution till{' '}
                          <strong className="text-black font-extrabold">
                            {passedYearBs ? `${passedYearBs} (${passedYearAd})` : '________ (________)'}
                          </strong>
                          . {currentPronoun} has successfully completed {currentPossessive}{' '}
                          <span className="font-bold">{passedExamLevel}</span>, conducted by the{' '}
                          <strong>{examBoard}</strong>, Nepal with{' '}
                          <strong className="text-black font-extrabold">Grade Point Average (GPA) {gpa || '____'}</strong>. According
                          to the records of this institution, {currentPossessive} date of birth is{' '}
                          <strong className="text-black font-extrabold">
                            {dobBs ? `${dobBs} B.S. (${dobAd} A.D.)` : '________ B.S. (________ A.D.)'}
                          </strong>
                          .
                        </p>
                        <p style={{ textIndent: `${(layoutConfig.bodyIndentP2 ?? layoutConfig.bodyIndent) * 0.75}px`, fontSize: `${layoutConfig.bodyFontSizeP2 * 0.85}px` }}>
                          To the best of our knowledge and belief, {currentPronounLower} maintained good moral character
                          during {currentPossessive} schooling at this institution.
                        </p>
                        <p style={{ textIndent: `${(layoutConfig.bodyIndentP3 ?? layoutConfig.bodyIndent) * 0.75}px`, fontSize: `${layoutConfig.bodyFontSizeP3 * 0.85}px` }}>
                          We wish {currentPossessive} every success in {currentPossessive} future career.
                        </p>
                      </>
                    ) : certType === 'BONAFIDE' ? (
                      <>
                        <p style={{ textIndent: `${(layoutConfig.bodyIndentP1 ?? layoutConfig.bodyIndent) * 0.75}px`, fontSize: `${layoutConfig.bodyFontSizeP1 * 0.85}px` }}>
                          This is to certify that {currentTitle}{' '}
                          <strong className="text-black font-extrabold uppercase">{(effectiveName || '________________________').toUpperCase()}</strong>, student ID{' '}
                          <strong className="font-mono text-black font-extrabold">
                            {selectedStudent?.studentId || nebRegNo || '________'}
                          </strong>
                          , is a bonafide and regular student of this school enrolled in Class{' '}
                          <strong className="text-black font-extrabold">
                            {selectedStudent?.classEnrollment?.[0]?.class?.name || '10'}
                          </strong>{' '}
                          (Roll No:{' '}
                          <strong className="text-black font-extrabold">
                            {selectedStudent?.classEnrollment?.[0]?.rollNo || '1'}
                          </strong>
                          ) for the academic session <strong>2083 B.S.</strong>
                        </p>
                        <p style={{ textIndent: `${(layoutConfig.bodyIndentP2 ?? layoutConfig.bodyIndent) * 0.75}px`, fontSize: `${layoutConfig.bodyFontSizeP2 * 0.85}px` }}>
                          According to the institution records, {currentPossessive} date of birth is{' '}
                          <strong className="text-black font-extrabold">{dobBs ? `${dobBs} B.S.` : '________ B.S.'}</strong> and permanent address is{' '}
                          <strong className="text-black font-extrabold uppercase">{permanentAddress || '________________________________________________'}</strong>.
                        </p>
                        <p style={{ textIndent: `${(layoutConfig.bodyIndentP3 ?? layoutConfig.bodyIndent) * 0.75}px`, fontSize: `${layoutConfig.bodyFontSizeP3 * 0.85}px` }}>
                          {currentPronoun} bears good moral conduct and this certificate is issued upon guardian request for official verification.
                        </p>
                      </>
                    ) : (
                      <>
                        <p style={{ textIndent: `${(layoutConfig.bodyIndentP1 ?? layoutConfig.bodyIndent) * 0.75}px`, fontSize: `${layoutConfig.bodyFontSizeP1 * 0.85}px` }}>
                          This Certificate of Appreciation is proudly presented to {currentTitle}{' '}
                          <strong className="text-black font-extrabold uppercase">{(effectiveName || '________________________').toUpperCase()}</strong>{' '}
                          in sincere recognition of {currentPossessive} outstanding performance, commendable dedication, and exemplary discipline at Shree Nepal Rastriya Secondary School.
                        </p>
                        <p style={{ textIndent: `${(layoutConfig.bodyIndentP2 ?? layoutConfig.bodyIndent) * 0.75}px`, fontSize: `${layoutConfig.bodyFontSizeP2 * 0.85}px` }}>
                          We highly appreciate {currentPossessive} valuable contribution and achievements during the academic session.
                        </p>
                        <p style={{ textIndent: `${(layoutConfig.bodyIndentP3 ?? layoutConfig.bodyIndent) * 0.75}px`, fontSize: `${layoutConfig.bodyFontSizeP3 * 0.85}px` }}>
                          We wish {currentPossessive} continued success and brilliance in all future endeavors.
                        </p>
                      </>
                    )}
                  </div>

              {/* Particulars Box */}
              {(certType === 'CHARACTER' || certType === 'TRANSFER') && layoutConfig.showParticularsBox && (
                <div
                  className="text-left font-bold space-y-0.5 my-1"
                  style={{
                    fontFamily: layoutConfig.particularsFont,
                    fontSize: `${layoutConfig.particularsFontSize * 0.85}px`,
                    color: layoutConfig.particularsColor,
                    marginTop: `${layoutConfig.particularsMarginTop}px`,
                    marginBottom: `${layoutConfig.particularsMarginBottom}px`,
                  }}
                >
                  <div>
                    Symbol No.: <span className="font-mono font-black text-black">{symbolNo || '________'}</span>
                  </div>
                  <div>
                    NEB Registration No.: <span className="font-mono font-black text-black">{nebRegNo || '________'}</span>
                  </div>
                  <div>
                    Passed Year:{' '}
                    <span className="font-mono font-black text-black">
                      {passedYearBs ? `${passedYearBs} ( ${passedYearAd} )` : '________ ( ________ )'}
                    </span>
                  </div>
                </div>
              )}

              {/* Clean Signatures Footer */}
              <div style={{ marginTop: `${layoutConfig.footerMarginTop}px` }}>
                <div
                  className="flex items-end justify-between font-bold"
                  style={{
                    fontFamily: layoutConfig.sigFont,
                    fontSize: `${layoutConfig.sigFontSize * 0.85}px`,
                    color: layoutConfig.sigTextColor,
                  }}
                >
                  {/* Prepared By Block */}
                  <div className="w-32 text-left">
                    {layoutConfig.sigLineStyle === 'clean-line' && (
                      <div
                        className="mb-1 w-full"
                        style={{ borderTop: `1.5px solid ${layoutConfig.sigTextColor}` }}
                      />
                    )}
                    {layoutConfig.sigLineStyle === 'solid-underline' && (
                      <div
                        className="mb-1 w-full"
                        style={{ borderBottom: `1.5px solid ${layoutConfig.sigTextColor}` }}
                      />
                    )}
                    <div>{layoutConfig.preparedByLabel || 'Prepared By:'}</div>
                  </div>

                  {/* Center School Seal Label */}
                  <div className="text-center">
                    <div className="uppercase tracking-wider">{layoutConfig.sealCenterLabel || 'Seal of School'}</div>
                  </div>

                  {/* Principal Block */}
                  <div className="w-32 text-right">
                    {layoutConfig.sigLineStyle === 'clean-line' && (
                      <div
                        className="mb-1 w-full"
                        style={{ borderTop: `1.5px solid ${layoutConfig.sigTextColor}` }}
                      />
                    )}
                    {layoutConfig.sigLineStyle === 'solid-underline' && (
                      <div
                        className="mb-1 w-full"
                        style={{ borderBottom: `1.5px solid ${layoutConfig.sigTextColor}` }}
                      />
                    )}
                    <div>{layoutConfig.principalLabel || issuedBy || 'Principal'}</div>
                  </div>
                </div>

                {layoutConfig.showDateOfIssue && (
                  <div
                    className="flex text-[9px] font-semibold font-sans mt-2"
                    style={{
                      color: layoutConfig.dateOfIssueColor,
                      justifyContent:
                        layoutConfig.dateOfIssuePosition === 'right'
                          ? 'flex-end'
                          : layoutConfig.dateOfIssuePosition === 'center'
                          ? 'center'
                          : 'flex-start',
                    }}
                  >
                    <div>Date of Issue: {issuedDateAd || (issuedDateBs ? bsToAD(issuedDateBs) : new Date().toISOString().slice(0, 10))}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
          </div>
        </div>
      )}

      {/* ════════════════════ TAB 2: ISSUED CERTIFICATE ARCHIVE ════════════════════ */}
      {activeTab === 'history' && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]">
              Issued Certificates Registry (जारी गरिएका प्रमाणपत्र अभिलेख)
            </h2>
            <span className="text-xs text-gray-500">
              Total Issued: <strong>{certificates.length}</strong>
            </span>
          </div>

          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#1e3a5f] text-white">
              <tr>
                <th className="p-3.5 font-bold uppercase">Certificate No</th>
                <th className="p-3.5 font-bold uppercase">Type</th>
                <th className="p-3.5 font-bold uppercase">Student Name</th>
                <th className="p-3.5 font-bold uppercase">Issue Date (BS)</th>
                <th className="p-3.5 font-bold uppercase">Issue Status / पटक</th>
                <th className="p-3.5 font-bold uppercase">Verification Code</th>
                <th className="p-3.5 font-bold uppercase text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Loading certificate records...
                  </td>
                </tr>
              ) : certificates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No certificates issued yet.
                  </td>
                </tr>
              ) : (
                certificates.map((cert: any) => {
                  const parsedCertData = cert.parsedData || (cert.data ? (typeof cert.data === 'string' ? (() => { try { return JSON.parse(cert.data); } catch (e) { return {}; } })() : cert.data) : {});
                  const printCount = Number(cert.printCount) || Number(parsedCertData?.printCount) || 1;
                  const sName = (cert.student?.fullName || parsedCertData?.studentName || '—').toUpperCase();
                  return (
                    <tr key={cert.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 font-mono font-bold text-[#1e3a5f]">{cert.certificateNo}</td>
                      <td className="p-3.5">
                        <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                          {cert.type}
                        </span>
                      </td>
                      <td className="p-3.5 font-extrabold uppercase text-gray-900">{sName}</td>
                      <td className="p-3.5 font-mono text-gray-600">{cert.issuedDateBs}</td>
                      <td className="p-3.5">
                        {printCount <= 1 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>१ पटक (1st Issue)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-900 border border-amber-300 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            <span>{printCount} पटक जारी (Copy #{printCount})</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-gray-500">{cert.verificationCode || '—'}</td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={async () => {
                              try {
                                await recordPrintMutation.mutateAsync(cert.id);
                              } catch (e) {
                                // proceed even if logging fails
                              }
                              triggerCertificatePrint(cert);
                            }}
                            className="rounded-lg p-1.5 text-blue-700 hover:bg-blue-50 transition"
                            title={`Re-print Certificate (जारी पटक: ${printCount})`}
                          >
                            <Printer size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteCertificate(cert)}
                            disabled={deleteCertMutation.isPending}
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-800 transition"
                            title="Delete this certificate permanently (प्रमाणपत्र अभिलेख मेटाउनुहोस्)"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Print Modal */}
      {selectedCertForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-[#1e3a5f]">Official Certificate Ready</span>
              <button onClick={() => setSelectedCertForPrint(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 border-2 border-dashed border-[#1e3a5f] rounded-xl bg-amber-50/20 text-center space-y-3 font-serif">
              <h3 className="text-base font-bold text-[#1e3a5f]">{selectedCertForPrint.type} CERTIFICATE</h3>
              <p className="text-xs font-mono text-gray-600">
                Cert No: <b>{selectedCertForPrint.certificateNo}</b>
              </p>
              <p className="text-sm font-extrabold uppercase text-gray-900">{(selectedCertForPrint.student?.fullName || effectiveName || '').toUpperCase()}</p>
              <p className="text-xs text-gray-500 font-sans">
                Verification Code: {selectedCertForPrint.verificationCode}
              </p>
            </div>

            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-center justify-between font-sans">
              <div className="space-y-0.5">
                <span className="font-bold">📄 Borderless A4 Landscape Settings:</span>
                <div className="text-gray-600 text-[10.5px]">
                  Print Dialog मा <strong>Layout: Landscape (तेर्सो)</strong>, <strong>Margins: None / Minimum</strong>, र <strong>Scale: 100% (Default)</strong> चयन गर्नुहोस्।
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedCertForPrint(null)}
                className="rounded-xl border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-600"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => triggerCertificatePrint(selectedCertForPrint)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-5 py-1.5 text-xs font-bold text-white hover:bg-[#2a5280]"
              >
                <Printer size={14} />
                <span>Print Certificate (प्रिन्ट गर्नुहोस्)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Capture & Passport Cropper Modal */}
      {showPhotoModal && (
        <CertificatePhotoModal
          isOpen={showPhotoModal}
          onClose={() => setShowPhotoModal(false)}
          currentPhotoUrl={manualPhotoUrl}
          onSavePhoto={(dataUrl) => {
            setManualPhotoUrl(dataUrl);
            setShowPhotoModal(false);
          }}
        />
      )}
    </div>
  );
}
