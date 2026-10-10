'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  FileText,
  Printer,
  Plus,
  Search,
  Send,
  Building,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  BookOpen,
  Calendar,
  Type,
  Sliders,
  Image as ImageIcon,
  Upload,
  RotateCcw,
  ShieldCheck,
  Palette,
  Stamp,
  Save,
  Check,
  Layout,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Minimize2,
  Trash2,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── फन्ट सूची (Categorized Font Families) ──
const FONTS = [
  // Devanagari / Nepali
  { id: 'devanagari', name: 'मानक नेपाली युनिकोड (Noto Sans)', category: 'Nepali', css: '"Noto Sans Devanagari", "Segoe UI", sans-serif' },
  { id: 'kalimati', name: 'कालिमाटी सेरिफ (Kalimati Serif)', category: 'Nepali', css: '"Kalimati", "Noto Serif Devanagari", serif' },
  { id: 'mukta', name: 'मुक्ता देवनागरी (Mukta Clean)', category: 'Nepali', css: '"Mukta", "Noto Sans Devanagari", sans-serif' },
  { id: 'noto_serif', name: 'नेपाली नोट सेरिफ (Noto Serif)', category: 'Nepali', css: '"Noto Serif Devanagari", "Kalimati", Georgia, serif' },
  { id: 'martel', name: 'मार्तेल सरकारी अभिलेख (Martel Gov Style)', category: 'Nepali', css: '"Martel", "Noto Serif Devanagari", serif' },
  { id: 'preeti', name: 'प्रीति परम्परागत (Preeti / Times Look)', category: 'Nepali', css: '"Preeti", "Times New Roman", "Kalimati", serif' },
  { id: 'kantipur', name: 'कान्तिपुर बोल्ड (Kantipur Style)', category: 'Nepali', css: '"Kantipur", "Mukta", "Noto Sans Devanagari", sans-serif' },
  { id: 'rozha', name: 'रोजा वन हेडिङ (Rozha One Display)', category: 'Nepali', css: '"Rozha One", "Martel", serif' },
  { id: 'yatra', name: 'यात्रा क्लासिक (Yatra One Heritage)', category: 'Nepali', css: '"Yatra One", "Noto Serif Devanagari", cursive' },
  { id: 'sagarmatha', name: 'सगरमाथा सेरिफ (Sagarmatha Serif)', category: 'Nepali', css: '"Sagarmatha", "Kalimati", "Noto Serif Devanagari", serif' },
  { id: 'anek', name: 'अनेक आधुनिक (Anek Devanagari Modern)', category: 'Nepali', css: '"Anek Devanagari", "Poppins", sans-serif' },

  // English / Classic
  { id: 'times', name: 'Times New Roman (Official Classic Serif)', category: 'English', css: '"Times New Roman", Times, "Noto Serif Devanagari", serif' },
  { id: 'garamond', name: 'EB Garamond (Elegant Book Serif)', category: 'English', css: '"EB Garamond", Georgia, serif' },
  { id: 'playfair', name: 'Playfair Display (Premium Editorial)', category: 'English', css: '"Playfair Display", "Times New Roman", serif' },
  { id: 'merriweather', name: 'Merriweather (Executive Serif)', category: 'English', css: '"Merriweather", Georgia, serif' },
  { id: 'poppins', name: 'Poppins (Geometric Modern Sans)', category: 'English', css: '"Poppins", "Mukta", sans-serif' },
  { id: 'inter', name: 'Inter / Arial (Clean Corporate)', category: 'English', css: '"Inter", Arial, sans-serif' },
  { id: 'cinzel', name: 'Cinzel Formal (Royal Capital Header)', category: 'English', css: '"Cinzel", "Times New Roman", serif' },
];

const COLOR_PRESETS = [
  { id: 'dark-navy', name: 'Navy Blue', hex: '#0b1f3a' },
  { id: 'pure-black', name: 'Pure Black', hex: '#000000' },
  { id: 'royal-blue', name: 'Royal Blue', hex: '#1e3a5f' },
  { id: 'slate-gray', name: 'Slate Gray', hex: '#334155' },
  { id: 'crimson', name: 'Crimson Red', hex: '#991b1b' },
  { id: 'forest-green', name: 'Forest Green', hex: '#065f46' },
  { id: 'maroon', name: 'Maroon', hex: '#831843' },
];

const BORDER_STYLES = [
  { id: 'double-black', name: 'Classic Double Line (कालो दोहोरो रेखा)', css: '3px double #111' },
  { id: 'solid-navy', name: 'Navy Single Line (गाढा नीलो रेखा)', css: '2px solid #0b1f3a' },
  { id: 'solid-crimson', name: 'Crimson Gov Line (रातो सरकारी रेखा)', css: '2.5px solid #991b1b' },
  { id: 'thin-gray', name: 'Minimal Gray Line (पातलो रेखा)', css: '1px solid #94a3b8' },
  { id: 'none', name: 'No Border Line (रेखा नराख्ने)', css: 'none' },
];

export default function SchoolLettersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'composer' | 'register'>('composer');
  const [search, setSearch] = useState('');

  // 👁️ Panel Visibility Toggle (Allows full-width Letter preview)
  const [isControlsVisible, setIsControlsVisible] = useState<boolean>(true);

  // Active Settings Tab inside editor (Content | Letterhead | Typography | Assets)
  const [settingsTab, setSettingsTab] = useState<'content' | 'letterhead' | 'typography' | 'assets'>('content');

  // Fetch School Profile for official default info, logo & seal
  const { data: schoolProfile } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data || {};
    },
  });

  // ── Typography & Sizing State ──
  const [selectedFont, setSelectedFont] = useState<string>('devanagari');
  const [headerFontSizeNe, setHeaderFontSizeNe] = useState<number>(22);
  const [headerFontSizeEn, setHeaderFontSizeEn] = useState<number>(13);
  const [subHeaderFontSize, setSubHeaderFontSize] = useState<number>(11.5);
  const [subjectFontSize, setSubjectFontSize] = useState<number>(16);
  const [bodyFontSize, setBodyFontSize] = useState<number>(14.5);
  const [lineHeight, setLineHeight] = useState<number>(1.8);
  const [signatoryFontSize, setSignatoryFontSize] = useState<number>(13);
  const [metaFontSize, setMetaFontSize] = useState<number>(12.5);

  // ── Colors & Borders ──
  const [headerColor, setHeaderColor] = useState<string>('#0b1f3a');
  const [subjectColor, setSubjectColor] = useState<string>('#0b1f3a');
  const [textColor, setTextColor] = useState<string>('#111827');
  const [headerBorder, setHeaderBorder] = useState<string>('double-black');
  const [pageMargin, setPageMargin] = useState<'narrow' | 'standard' | 'wide'>('standard');

  // ── Asset Positions, Sizes & Transparency ──
  // 1. School Logo
  const [showLogo, setShowLogo] = useState<boolean>(true);
  const [logoPosition, setLogoPosition] = useState<'left' | 'center' | 'right' | 'hidden'>('left');
  const [logoSize, setLogoSize] = useState<number>(95);
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);

  // 2. School Official Seal (Round Seal)
  const [showSeal, setShowSeal] = useState<boolean>(true);
  const [sealPosition, setSealPosition] = useState<'header_center' | 'header_right' | 'beside_date' | 'watermark' | 'hidden'>('header_center');
  const [sealSize, setSealSize] = useState<number>(115);
  const [sealOpacity, setSealOpacity] = useState<number>(0.88);
  const [customSealUrl, setCustomSealUrl] = useState<string | null>(null);

  // 3. Headmaster Stamp / Seal (प्रधानाध्यापक पदिय छाप)
  const [showPrincipalSeal, setShowPrincipalSeal] = useState<boolean>(true);
  const [principalSealPosition, setPrincipalSealPosition] = useState<'below_name' | 'over_signature' | 'beside_name'>('below_name');
  const [principalSealSize, setPrincipalSealSize] = useState<number>(75);
  const [principalSealOpacity, setPrincipalSealOpacity] = useState<number>(0.88);
  const [customPrincipalSealUrl, setCustomPrincipalSealUrl] = useState<string | null>(null);

  // 4. Principal Signature
  const [includeSignature, setIncludeSignature] = useState<boolean>(false);
  const [signatureWidth, setSignatureWidth] = useState<number>(130);
  const [customSignatureUrl, setCustomSignatureUrl] = useState<string | null>(null);
  const [isPrincipalApproved, setIsPrincipalApproved] = useState<boolean>(true);
  const [showWatermark, setShowWatermark] = useState<boolean>(false);

  // ── Letter & Letterhead Form Content ──
  const [letterForm, setLetterForm] = useState({
    chalaniNo: 'चलानी-२०८३/०१',
    patraSankhya: '२०८३/०८४',
    letterDateBs: todayBS(),
    schoolNameNe: 'नेपाल माध्यमिक विद्यालय विश्रामपुर',
    schoolSubtitleNe: 'वृन्दावन न.पा.-२, विश्रामपुर, रौतहट',
    schoolEstdNe: '(स्थापित-२००७ साल)',
    schoolNameEn: 'NEPAL SECONDARY SCHOOL BISHRAMPUR',
    schoolSubtitleEn: 'Brindawan Municipality -2, Bishrampur, Rautahat',
    schoolEstdEn: 'Estd: 2007',
    contactInfo: 'फोन: ०५५-५२०००० | इमेल: info@nepalmavi.edu.np | प्यान नं: ६००१२३४५६',
    recipient: 'श्रीमान् शिक्षा विकास तथा समन्वय इकाई प्रमुख,\nरौतहट, गौर।',
    subject: 'कक्षा ११ र १२ को नियमित पठनपाठन सञ्चालन सम्बन्धमा।',
    salutation: 'महोदय,',
    body: `यस विद्यालयमा अध्ययनरत कक्षा ११ र १२ का सम्पूर्ण विद्यार्थी तथा अभिभावकहरूलाई जानकारी गराइन्छ कि मिति २०८३-०३-१७ गते बिहान ६:०० बजेदेखि कक्षा ११ र १२ को नियमित पठनपाठन सञ्चालन हुने भएकाले सबै विद्यार्थीहरू विद्यालय पोसाकमा समयमै उपस्थित भई नियमित रूपमा कक्षामा सहभागी हुन अनुरोध गरिन्छ।\n\nअनुपस्थित हुने विद्यार्थी स्वयं जिम्मेवार हुने व्यहोरा समेत जानकारी गराइन्छ।`,
    signatoryName: 'प्रेमलाल प्रसाद राउत',
    signatoryRole: 'प्रधानाध्यापक',
    category: 'GENERAL',
  });

  const [selectedLetterForPrint, setSelectedLetterForPrint] = useState<any>(null);

  // ── Auto-Load Saved Configuration from localStorage & School Profile ──
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedConfigRaw = localStorage.getItem('official_letterpad_config');
        if (savedConfigRaw) {
          const cfg = JSON.parse(savedConfigRaw);
          if (cfg.selectedFont) setSelectedFont(cfg.selectedFont);
          if (cfg.headerFontSizeNe) setHeaderFontSizeNe(cfg.headerFontSizeNe);
          if (cfg.headerFontSizeEn) setHeaderFontSizeEn(cfg.headerFontSizeEn);
          if (cfg.subHeaderFontSize) setSubHeaderFontSize(cfg.subHeaderFontSize);
          if (cfg.subjectFontSize) setSubjectFontSize(cfg.subjectFontSize);
          if (cfg.bodyFontSize) setBodyFontSize(cfg.bodyFontSize);
          if (cfg.lineHeight) setLineHeight(cfg.lineHeight);
          if (cfg.signatoryFontSize) setSignatoryFontSize(cfg.signatoryFontSize);
          if (cfg.metaFontSize) setMetaFontSize(cfg.metaFontSize);
          if (cfg.headerColor) setHeaderColor(cfg.headerColor);
          if (cfg.subjectColor) setSubjectColor(cfg.subjectColor);
          if (cfg.textColor) setTextColor(cfg.textColor);
          if (cfg.headerBorder) setHeaderBorder(cfg.headerBorder);
          if (cfg.pageMargin) setPageMargin(cfg.pageMargin);
          if (cfg.logoPosition) setLogoPosition(cfg.logoPosition);
          if (cfg.logoSize) setLogoSize(cfg.logoSize);
          if (cfg.sealPosition) setSealPosition(cfg.sealPosition);
          if (cfg.sealSize) setSealSize(cfg.sealSize);
          if (cfg.sealOpacity !== undefined) setSealOpacity(cfg.sealOpacity);
          if (cfg.principalSealPosition) setPrincipalSealPosition(cfg.principalSealPosition);
          if (cfg.principalSealSize) setPrincipalSealSize(cfg.principalSealSize);
          if (cfg.principalSealOpacity !== undefined) setPrincipalSealOpacity(cfg.principalSealOpacity);
          if (cfg.signatureWidth) setSignatureWidth(cfg.signatureWidth);
          if (cfg.showLogo !== undefined) setShowLogo(cfg.showLogo);
          if (cfg.showSeal !== undefined) setShowSeal(cfg.showSeal);
          if (cfg.showPrincipalSeal !== undefined) setShowPrincipalSeal(cfg.showPrincipalSeal);
          if (cfg.showWatermark !== undefined) setShowWatermark(cfg.showWatermark);
          if (cfg.includeSignature !== undefined) setIncludeSignature(cfg.includeSignature);

          if (cfg.schoolNameNe) {
            setLetterForm((prev) => ({
              ...prev,
              schoolNameNe: cfg.schoolNameNe || prev.schoolNameNe,
              schoolSubtitleNe: cfg.schoolSubtitleNe || prev.schoolSubtitleNe,
              schoolEstdNe: cfg.schoolEstdNe || prev.schoolEstdNe,
              schoolNameEn: cfg.schoolNameEn || prev.schoolNameEn,
              schoolSubtitleEn: cfg.schoolSubtitleEn || prev.schoolSubtitleEn,
              schoolEstdEn: cfg.schoolEstdEn || prev.schoolEstdEn,
              contactInfo: cfg.contactInfo !== undefined ? cfg.contactInfo : prev.contactInfo,
              signatoryName: cfg.signatoryName || prev.signatoryName,
              signatoryRole: cfg.signatoryRole || prev.signatoryRole,
            }));
          }
        }

        // Check individual assets in localStorage
        const savedLogo = localStorage.getItem('official_school_logo');
        const savedSeal = localStorage.getItem('official_school_seal');
        const savedPrincipalSeal = localStorage.getItem('official_principal_seal');
        const savedSign = localStorage.getItem('official_principal_signature');
        
        if (savedLogo) setCustomLogoUrl(savedLogo);
        if (savedSeal) setCustomSealUrl(savedSeal);
        if (savedPrincipalSeal) {
          setCustomPrincipalSealUrl(savedPrincipalSeal);
          setShowPrincipalSeal(true);
        }
        if (savedSign) {
          setCustomSignatureUrl(savedSign);
          setIncludeSignature(true);
        }
      } catch (err) {
        console.error('Failed to load letterpad preferences', err);
      }
    }

    // Sync from School Profile if available
    if (schoolProfile && Object.keys(schoolProfile).length > 0) {
      if (!customLogoUrl && schoolProfile.logoUrl) {
        setCustomLogoUrl(schoolProfile.logoUrl);
      }
      if (!customSealUrl && schoolProfile.sealUrl) {
        setCustomSealUrl(schoolProfile.sealUrl);
      }
      setLetterForm((prev) => ({
        ...prev,
        schoolNameNe: prev.schoolNameNe || schoolProfile.nameNepali || '',
        schoolSubtitleNe: prev.schoolSubtitleNe || schoolProfile.address || '',
        schoolEstdNe: prev.schoolEstdNe || (schoolProfile.estYear ? `(स्थापित-${schoolProfile.estYear} साल)` : ''),
        schoolNameEn: prev.schoolNameEn || schoolProfile.name || '',
        schoolSubtitleEn: prev.schoolSubtitleEn || `${schoolProfile.district || 'Rautahat'}, Nepal`,
        signatoryName: prev.signatoryName || schoolProfile.principalName || 'प्रधानाध्यापक',
      }));
    }
  }, [schoolProfile]);

  // Fetch letters register
  const { data: lettersData, isLoading } = useQuery({
    queryKey: ['school-letters', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const res = await api.get(`/letters?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  // ── Asset Upload Handlers ──
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomLogoUrl(dataUrl);
      setShowLogo(true);
      localStorage.setItem('official_school_logo', dataUrl);
      toast.success('विद्यालयको लोगो लोड भयो!');
    };
    reader.readAsDataURL(file);
  };

  const handleSealUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomSealUrl(dataUrl);
      setShowSeal(true);
      localStorage.setItem('official_school_seal', dataUrl);
      toast.success('विद्यालयको आधिकारिक छाप लोड भयो!');
    };
    reader.readAsDataURL(file);
  };

  const handlePrincipalSealUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomPrincipalSealUrl(dataUrl);
      setShowPrincipalSeal(true);
      localStorage.setItem('official_principal_seal', dataUrl);
      toast.success('प्रधानाध्यापकको पदिय छाप लोड भयो!');
    };
    reader.readAsDataURL(file);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomSignatureUrl(dataUrl);
      setIncludeSignature(true);
      localStorage.setItem('official_principal_signature', dataUrl);
      toast.success('हस्ताक्षर लोड भयो!');
    };
    reader.readAsDataURL(file);
  };

  // ── 💾 Save Everything Permanently (Forever) ──
  const saveAsPermanentDefault = async () => {
    try {
      const config = {
        selectedFont,
        headerFontSizeNe,
        headerFontSizeEn,
        subHeaderFontSize,
        subjectFontSize,
        bodyFontSize,
        lineHeight,
        signatoryFontSize,
        metaFontSize,
        headerColor,
        subjectColor,
        textColor,
        headerBorder,
        pageMargin,
        logoPosition,
        logoSize,
        sealPosition,
        sealSize,
        sealOpacity,
        principalSealPosition,
        principalSealSize,
        principalSealOpacity,
        signatureWidth,
        showLogo,
        showSeal,
        showPrincipalSeal,
        showWatermark,
        includeSignature,
        schoolNameNe: letterForm.schoolNameNe,
        schoolSubtitleNe: letterForm.schoolSubtitleNe,
        schoolEstdNe: letterForm.schoolEstdNe,
        schoolNameEn: letterForm.schoolNameEn,
        schoolSubtitleEn: letterForm.schoolSubtitleEn,
        schoolEstdEn: letterForm.schoolEstdEn,
        contactInfo: letterForm.contactInfo,
        signatoryName: letterForm.signatoryName,
        signatoryRole: letterForm.signatoryRole,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('official_letterpad_config', JSON.stringify(config));
        if (customLogoUrl) localStorage.setItem('official_school_logo', customLogoUrl);
        if (customSealUrl) localStorage.setItem('official_school_seal', customSealUrl);
        if (customPrincipalSealUrl) localStorage.setItem('official_principal_seal', customPrincipalSealUrl);
        if (customSignatureUrl) localStorage.setItem('official_principal_signature', customSignatureUrl);
      }

      await api.post('/school/profile', {
        logoUrl: customLogoUrl || undefined,
        sealUrl: customSealUrl || undefined,
        principalName: letterForm.signatoryName || undefined,
        nameNepali: letterForm.schoolNameNe || undefined,
        name: letterForm.schoolNameEn || undefined,
        address: letterForm.schoolSubtitleNe || undefined,
      });

      toast.success('💾 सबै सेटिङ, फन्ट, आकार, लोगो, छाप र हेडर सधैंको लागि सुरक्षित भयो!');
      queryClient.invalidateQueries({ queryKey: ['school-profile'] });
    } catch (err: any) {
      toast.success('💾 सेटिङहरू तपाईंको ब्राउजरमा सधैंको लागि सुरक्षित भयो!');
    }
  };

  // Reset to initial defaults
  const resetToFactoryDefaults = () => {
    if (confirm('के तपाईं सबै लेटरप्याड सेटिङहरू सुरुवाती अवस्थामा फर्काउन चाहनुहुन्छ?')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('official_letterpad_config');
      }
      setSelectedFont('devanagari');
      setHeaderFontSizeNe(22);
      setHeaderFontSizeEn(13);
      setSubHeaderFontSize(11.5);
      setSubjectFontSize(16);
      setBodyFontSize(14.5);
      setLineHeight(1.8);
      setSignatoryFontSize(13);
      setMetaFontSize(12.5);
      setHeaderColor('#0b1f3a');
      setSubjectColor('#0b1f3a');
      setTextColor('#111827');
      setHeaderBorder('double-black');
      setLogoPosition('left');
      setLogoSize(95);
      setSealPosition('header_center');
      setSealSize(115);
      setSealOpacity(0.88);
      setPrincipalSealPosition('below_name');
      setPrincipalSealSize(75);
      setPrincipalSealOpacity(0.88);
      setSignatureWidth(130);
      setShowLogo(true);
      setShowSeal(true);
      setShowPrincipalSeal(true);
      setShowWatermark(false);
      setIncludeSignature(false);
      toast.success('सुरुवाती सेटिङहरू पुन:स्थापित गरियो!');
    }
  };

  // Create & Dispatch Letter Mutation
  const createLetterMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/letters', letterForm);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`पत्र चलानी दर्ता भयो! चलानी नं: ${data.data?.chalaniNo}`);
      setSelectedLetterForPrint(data.data);
      queryClient.invalidateQueries({ queryKey: ['school-letters'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'पत्र दर्ता गर्न सकिएन');
    },
  });

  const activeFont = FONTS.find((f) => f.id === selectedFont) || FONTS[0];
  const activeFontCss = activeFont.css;
  const activeBorderCss = BORDER_STYLES.find((b) => b.id === headerBorder)?.css || '3px double #111';

  // ── High-Fidelity Print Engine ──
  const triggerLetterPrint = (letterObj?: any) => {
    const l = letterObj || letterForm;
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const schoolNe = l.schoolNameNe || letterForm.schoolNameNe;
    const subNe = l.schoolSubtitleNe || letterForm.schoolSubtitleNe;
    const estdNe = l.schoolEstdNe || letterForm.schoolEstdNe;
    const schoolEn = l.schoolNameEn || letterForm.schoolNameEn;
    const subEn = l.schoolSubtitleEn || letterForm.schoolSubtitleEn;
    const estdEn = l.schoolEstdEn || letterForm.schoolEstdEn;
    const contact = l.contactInfo || letterForm.contactInfo;

    const pageMarginCss = pageMargin === 'narrow' ? '10mm 15mm' : pageMargin === 'wide' ? '20mm 25mm' : '15mm 20mm';

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Letter - ${l.subject}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Anek+Devanagari:wght@400;600;700;800&family=Cinzel:wght@600;700;800;900&family=EB+Garamond:ital,wght@0,500;0,700;1,500&family=Martel:wght@600;800&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Mukta:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&family=Noto+Serif+Devanagari:wght@500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&family=Poppins:wght@400;500;600;700;800&family=Rozha+One&family=Yatra+One&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 portrait; margin: ${pageMarginCss}; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { 
              font-family: ${activeFontCss}; 
              margin: 0; 
              padding: 0; 
              background: #fff; 
              color: ${textColor}; 
              font-size: ${bodyFontSize}px; 
              line-height: ${lineHeight}; 
              position: relative;
            }
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 320px;
              height: 320px;
              opacity: ${showWatermark ? '0.07' : '0'};
              pointer-events: none;
              z-index: 0;
            }
            .letter-container {
              position: relative;
              z-index: 1;
            }
            .letterhead { 
              position: relative;
              padding-bottom: 12px; 
              margin-bottom: 20px; 
              border-bottom: ${activeBorderCss};
            }
            .emblem-left {
              position: absolute;
              left: 0;
              top: 50%;
              transform: translateY(-50%);
              width: ${logoSize}px;
              height: ${logoSize}px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .emblem-right {
              position: absolute;
              right: 0;
              top: 50%;
              transform: translateY(-50%);
              width: ${logoSize}px;
              height: ${logoSize}px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .emblem-center {
              display: flex;
              justify-content: center;
              margin-bottom: 8px;
            }
            .header-text {
              width: 100%;
              text-align: center;
              margin: 0 auto;
            }
            .header-center-seal {
              position: absolute;
              left: 50%;
              bottom: -${sealSize / 2}px;
              transform: translateX(-50%);
              width: ${sealSize}px;
              height: ${sealSize}px;
              pointer-events: none;
              z-index: 10;
              opacity: ${sealOpacity};
            }
            .header-right-seal {
              position: absolute;
              right: 10px;
              top: 0;
              width: ${sealSize}px;
              height: ${sealSize}px;
              pointer-events: none;
              z-index: 10;
              opacity: ${sealOpacity};
            }
            .school-ne {
              font-size: ${headerFontSizeNe}px;
              font-weight: 900;
              color: ${headerColor};
              margin: 0;
              line-height: 1.25;
            }
            .sub-ne {
              font-size: ${subHeaderFontSize}px;
              font-weight: bold;
              color: #222;
              margin: 2px 0 1px 0;
            }
            .estd-ne {
              font-size: ${subHeaderFontSize - 1}px;
              font-weight: 800;
              color: #333;
              margin: 0;
            }
            .school-en {
              font-size: ${headerFontSizeEn}px;
              font-weight: 900;
              color: ${headerColor};
              margin-top: 3px;
              text-transform: uppercase;
              font-family: Arial, sans-serif;
            }
            .sub-en {
              font-size: ${subHeaderFontSize - 1.5}px;
              font-weight: 700;
              color: #222;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .estd-en {
              font-size: ${subHeaderFontSize - 2}px;
              font-weight: bold;
              color: #444;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .contact-line {
              font-size: 10px;
              color: #555;
              margin-top: 3px;
              font-weight: 600;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              font-size: ${metaFontSize}px;
              font-weight: bold;
              margin-bottom: 16px;
            }
            .meta-left {
              display: flex;
              flex-direction: column;
              gap: 3px;
              text-align: left;
            }
            .meta-right {
              text-align: right;
            }
            .recipient-box { 
              font-size: ${bodyFontSize}px; 
              font-weight: bold; 
              margin-bottom: 16px; 
              white-space: pre-line; 
              line-height: 1.5; 
            }
            .subject-box { 
              text-align: center; 
              font-size: ${subjectFontSize}px; 
              font-weight: 900; 
              color: ${subjectColor};
              margin: 18px 0; 
              letter-spacing: 0.3px;
            }
            .salutation { 
              font-weight: bold; 
              margin-bottom: 12px; 
            }
            .letter-body { 
              text-align: justify; 
              text-indent: 40px; 
              font-size: ${bodyFontSize}px; 
              line-height: ${lineHeight}; 
              color: ${textColor};
              margin-bottom: 40px; 
              white-space: pre-line; 
            }
            .signatory-box { 
              float: right; 
              text-align: center; 
              min-width: 180px; 
              font-size: ${signatoryFontSize}px; 
              line-height: 1.4;
              position: relative;
            }
            .signature-area {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 48px;
              position: relative;
            }
            .signature-graphic {
              max-width: ${signatureWidth}px;
              max-height: 48px;
              object-fit: contain;
            }
            .principal-seal-img {
              max-height: ${principalSealSize}px;
              max-width: 140px;
              object-fit: contain;
              opacity: ${principalSealOpacity};
            }
            .sign-name {
              font-weight: 900;
              font-size: ${signatoryFontSize + 1}px;
              color: #111;
            }
            .sign-role {
              font-size: ${signatoryFontSize}px;
              font-weight: bold;
              color: #1e3a5f;
            }
          </style>
        </head>
        <body>
          <div class="watermark">
            ${customLogoUrl && showWatermark ? `<img src="${customLogoUrl}" style="width:100%;height:100%;object-fit:contain;"/>` : ''}
          </div>

          <div class="letter-container">
            <div class="letterhead">
              ${showLogo && logoPosition === 'center' && customLogoUrl ? `
                <div class="emblem-center">
                  <img src="${customLogoUrl}" style="width:${logoSize}px;height:${logoSize}px;object-fit:contain;border-radius:50%;"/>
                </div>
              ` : ''}

              ${showLogo && logoPosition === 'left' && customLogoUrl ? `
                <div class="emblem-left">
                  <img src="${customLogoUrl}" style="width:${logoSize}px;height:${logoSize}px;object-fit:contain;border-radius:50%;"/>
                </div>
              ` : ''}

              ${showLogo && logoPosition === 'right' && customLogoUrl ? `
                <div class="emblem-right">
                  <img src="${customLogoUrl}" style="width:${logoSize}px;height:${logoSize}px;object-fit:contain;border-radius:50%;"/>
                </div>
              ` : ''}

              <div class="header-text">
                <h1 class="school-ne">${schoolNe}</h1>
                <div class="sub-ne">${subNe}</div>
                ${estdNe ? `<div class="estd-ne">${estdNe}</div>` : ''}
                ${schoolEn ? `<div class="school-en">${schoolEn}</div>` : ''}
                ${subEn ? `<div class="sub-en">${subEn}</div>` : ''}
                ${estdEn ? `<div class="estd-en">${estdEn}</div>` : ''}
                ${contact ? `<div class="contact-line">${contact}</div>` : ''}
              </div>

              ${showSeal && sealPosition === 'header_center' && customSealUrl ? `
                <div class="header-center-seal">
                  <img src="${customSealUrl}" style="width:100%;height:100%;object-fit:contain;"/>
                </div>
              ` : ''}

              ${showSeal && sealPosition === 'header_right' && customSealUrl ? `
                <div class="header-right-seal">
                  <img src="${customSealUrl}" style="width:100%;height:100%;object-fit:contain;"/>
                </div>
              ` : ''}
            </div>

            <div class="meta-row">
              <div class="meta-left">
                ${l.patraSankhya ? `<div>पत्र संख्या: <strong>${l.patraSankhya}</strong></div>` : '<div>पत्र संख्या: <strong>२०८३/०८४</strong></div>'}
                ${l.chalaniNo ? `<div>चलानी नं.: <strong>${l.chalaniNo}</strong></div>` : ''}
              </div>
              <div class="meta-right">
                मिति: <strong>${l.letterDateBs || todayBS()}</strong>
              </div>
            </div>

            <div class="subject-box">
              विषय: ${l.subject}
            </div>

            ${l.recipient ? `<div class="recipient-box">${l.recipient}</div>` : ''}

            ${l.salutation ? `<div class="salutation">${l.salutation}</div>` : ''}

            <div class="letter-body">${l.body}</div>

            <div class="signatory-box">
              <div class="signature-area">
                ${showPrincipalSeal && principalSealPosition === 'over_signature' && customPrincipalSealUrl ? `
                  <div style="margin-bottom: -15px; z-index: 2; pointer-events: none;">
                    <img src="${customPrincipalSealUrl}" class="principal-seal-img" alt="Headmaster Seal" />
                  </div>
                ` : ''}

                ${includeSignature && isPrincipalApproved && customSignatureUrl ? `
                  <img src="${customSignatureUrl}" class="signature-graphic" alt="Signature" />
                ` : '<div style="height:32px;"></div>'}
              </div>

              <div class="sign-name">${l.signatoryName || 'प्रेमलाल प्रसाद राउत'}</div>
              <div class="sign-role">${l.signatoryRole || 'प्रधानाध्यापक'}</div>

              ${showPrincipalSeal && principalSealPosition === 'below_name' && customPrincipalSealUrl ? `
                <div style="margin-top: 4px; display: flex; justify-content: center;">
                  <img src="${customPrincipalSealUrl}" class="principal-seal-img" alt="Headmaster Seal" />
                </div>
              ` : ''}
            </div>
          </div>

          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const letters = lettersData || [];

  return (
    <div className="space-y-4 pb-12">
      {/* ── Top Bar with Tab Buttons & Hide/Show Panel Toggle ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
        <div>
          <h1 className="text-lg md:text-xl font-black text-[#1e3a5f] flex items-center gap-2">
            <FileText className="text-[#1e3a5f]" size={20} />
            <span>Official Letterpad System (विद्यालय लेटरप्याड)</span>
          </h1>
          <p className="text-[11px] text-gray-500 font-nepali">
            आधिकारिक पत्र सम्पादन, पूर्ण कस्टमाइजेसन, लोगो/छाप स्थिति तथा प्रिन्ट
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 👁️ Hide/Show Control Panel Button */}
          {activeTab === 'composer' && (
            <button
              onClick={() => setIsControlsVisible(!isControlsVisible)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                isControlsVisible
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-xs'
              }`}
            >
              {isControlsVisible ? (
                <>
                  <EyeOff size={14} />
                  <span>प्यानल लुकाउनुहोस् (Hide Panel)</span>
                </>
              ) : (
                <>
                  <Eye size={14} />
                  <span>सम्पादन प्यानल देखाउनुहोस् (Show Controls)</span>
                </>
              )}
            </button>
          )}

          {/* Tab Switcher */}
          <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-bold gap-1 shadow-inner">
            <button
              onClick={() => setActiveTab('composer')}
              className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'composer' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <Plus size={14} />
              <span>Compose (पत्र सम्पादन)</span>
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'register' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <BookOpen size={14} />
              <span>Chalani Book (चलानी दर्ता)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════ TAB 1: COMPOSER ════════════════════ */}
      {activeTab === 'composer' && (
        <div className={`grid grid-cols-1 gap-6 items-start ${isControlsVisible ? 'lg:grid-cols-12' : 'lg:grid-cols-1'}`}>
          {/* ── Left Settings & Form Panel (Collapsible 5 Cols) ── */}
          {isControlsVisible && (
            <div className="lg:col-span-5 rounded-2xl border border-gray-100 bg-white p-4 shadow-xs space-y-3.5 text-xs">
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h2 className="text-xs font-bold text-[#1e3a5f] flex items-center gap-1.5">
                  <Sliders size={15} />
                  <span>Letterpad Customizer (सेटिङ्स)</span>
                </h2>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={saveAsPermanentDefault}
                    className="text-[10px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-2.5 py-1 rounded-lg flex items-center gap-1 transition shadow-2xs cursor-pointer"
                    title="Save all changes forever"
                  >
                    <Save size={12} />
                    <span>💾 सधैंको लागि सुरक्षित</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetToFactoryDefaults}
                    className="text-[10px] font-bold text-gray-500 hover:text-rose-600 p-1 rounded hover:bg-gray-100 transition cursor-pointer"
                    title="Reset to initial default settings"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              </div>

              {/* Sub-tabs for Settings: Content | Letterhead | Typography | Assets */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl text-[10px] font-bold text-center">
                <button
                  type="button"
                  onClick={() => setSettingsTab('content')}
                  className={`py-1 rounded-lg transition cursor-pointer ${
                    settingsTab === 'content' ? 'bg-[#1e3a5f] text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📝 पत्र व्यहोरा
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab('letterhead')}
                  className={`py-1 rounded-lg transition cursor-pointer ${
                    settingsTab === 'letterhead' ? 'bg-[#1e3a5f] text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🏫 हेडर / ठेगाना
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab('typography')}
                  className={`py-1 rounded-lg transition cursor-pointer ${
                    settingsTab === 'typography' ? 'bg-[#1e3a5f] text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🔤 फन्ट र आकार
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab('assets')}
                  className={`py-1 rounded-lg transition cursor-pointer ${
                    settingsTab === 'assets' ? 'bg-[#1e3a5f] text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🖼️ लोगो / छाप
                </button>
              </div>

              {/* ── TAB CONTENT: 1. LETTER CONTENT ── */}
              {settingsTab === 'content' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-gray-700 mb-0.5">पत्र संख्या (Letter No):</label>
                      <input
                        type="text"
                        value={letterForm.patraSankhya}
                        onChange={(e) => setLetterForm({ ...letterForm, patraSankhya: e.target.value })}
                        className="erp-input font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-0.5">चलानी नं. (Chalani No):</label>
                      <input
                        type="text"
                        value={letterForm.chalaniNo}
                        onChange={(e) => setLetterForm({ ...letterForm, chalaniNo: e.target.value })}
                        className="erp-input font-bold text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block font-bold text-gray-700">मिति BS (Nepali Date - YYYY-MM-DD):</label>
                      <button
                        type="button"
                        onClick={() => setLetterForm((prev) => ({ ...prev, letterDateBs: todayBS() }))}
                        className="text-[10.5px] font-bold text-[#1e3a5f] bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1 cursor-pointer transition shadow-2xs"
                        title="आजको मिति स्वतः राख्नुहोस्"
                      >
                        <Calendar size={11} />
                        <span>आजको मिति ({todayBS()})</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={letterForm.letterDateBs}
                      onChange={(e) => setLetterForm({ ...letterForm, letterDateBs: e.target.value })}
                      placeholder={`YYYY-MM-DD (e.g. ${todayBS()})`}
                      className="erp-input font-bold font-mono text-xs"
                    />
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      💡 ढाँचा: <strong className="text-gray-600 font-mono">YYYY-MM-DD</strong> (स्वतः आजको मिति आउँछ, सम्पादन पनि गर्न सकिन्छ)
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-0.5">पत्रको विषय (Subject):</label>
                    <input
                      type="text"
                      value={letterForm.subject}
                      onChange={(e) => setLetterForm({ ...letterForm, subject: e.target.value })}
                      className="erp-input font-bold text-[#1e3a5f] text-xs"
                      placeholder="विषय..."
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-0.5">पाउने कार्यालय / व्यक्ति (Recipient):</label>
                    <textarea
                      rows={2}
                      value={letterForm.recipient}
                      onChange={(e) => setLetterForm({ ...letterForm, recipient: e.target.value })}
                      className="erp-input text-xs leading-relaxed"
                      placeholder="श्रीमान् ..."
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-0.5">सम्बोधन (Salutation):</label>
                    <input
                      type="text"
                      value={letterForm.salutation}
                      onChange={(e) => setLetterForm({ ...letterForm, salutation: e.target.value })}
                      className="erp-input font-semibold text-xs"
                      placeholder="महोदय / महाशय,"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-0.5">पत्रको मुख्य व्यहोरा (Letter Body):</label>
                    <textarea
                      rows={6}
                      value={letterForm.body}
                      onChange={(e) => setLetterForm({ ...letterForm, body: e.target.value })}
                      className="erp-input text-xs leading-relaxed font-nepali"
                      placeholder="व्यहोरा लेख्नुहोस्..."
                    />
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-slate-50 p-2.5 space-y-2">
                    <span className="font-bold text-gray-800 text-[11px] block">हस्ताक्षरकर्ता विवरण (Signatory):</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500">नाम (Name):</label>
                        <input
                          type="text"
                          value={letterForm.signatoryName}
                          onChange={(e) => setLetterForm({ ...letterForm, signatoryName: e.target.value })}
                          className="erp-input font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500">पद (Role):</label>
                        <input
                          type="text"
                          value={letterForm.signatoryRole}
                          onChange={(e) => setLetterForm({ ...letterForm, signatoryRole: e.target.value })}
                          className="erp-input text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB CONTENT: 2. LETTERHEAD EDITABLE DETAILS ── */}
              {settingsTab === 'letterhead' && (
                <div className="space-y-2.5">
                  <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-100 text-[11px] text-blue-900 font-medium">
                    💡 यहाँबाट विद्यालयको नाम, ठेगाना, सम्पर्क तथा बोर्डर परिवर्तन गर्नुहोस् र <strong>सधैंको लागि सुरक्षित</strong> गर्नुहोस्।
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-gray-700 mb-0.5">विद्यालय नाम (नेपाली):</label>
                    <input
                      type="text"
                      value={letterForm.schoolNameNe}
                      onChange={(e) => setLetterForm({ ...letterForm, schoolNameNe: e.target.value })}
                      className="erp-input font-bold text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">ठेगाना (नेपाली):</label>
                      <input
                        type="text"
                        value={letterForm.schoolSubtitleNe}
                        onChange={(e) => setLetterForm({ ...letterForm, schoolSubtitleNe: e.target.value })}
                        className="erp-input text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">स्थापना वर्ष / विवरण:</label>
                      <input
                        type="text"
                        value={letterForm.schoolEstdNe}
                        onChange={(e) => setLetterForm({ ...letterForm, schoolEstdNe: e.target.value })}
                        className="erp-input text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-gray-700 mb-0.5">School Name (English):</label>
                    <input
                      type="text"
                      value={letterForm.schoolNameEn}
                      onChange={(e) => setLetterForm({ ...letterForm, schoolNameEn: e.target.value })}
                      className="erp-input font-bold uppercase text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Address (English):</label>
                      <input
                        type="text"
                        value={letterForm.schoolSubtitleEn}
                        onChange={(e) => setLetterForm({ ...letterForm, schoolSubtitleEn: e.target.value })}
                        className="erp-input text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Estd Year (English):</label>
                      <input
                        type="text"
                        value={letterForm.schoolEstdEn}
                        onChange={(e) => setLetterForm({ ...letterForm, schoolEstdEn: e.target.value })}
                        className="erp-input text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">सम्पर्क लाइन (फोन / इमेल / प्यान):</label>
                    <input
                      type="text"
                      value={letterForm.contactInfo}
                      onChange={(e) => setLetterForm({ ...letterForm, contactInfo: e.target.value })}
                      className="erp-input text-xs"
                      placeholder="फोन: ... | इमेल: ... | प्यान नं: ..."
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-gray-700 mb-1">हेडर मुनिको बोर्डर रेखा (Header Border):</label>
                    <select
                      value={headerBorder}
                      onChange={(e) => setHeaderBorder(e.target.value)}
                      className="erp-input text-xs font-semibold bg-white cursor-pointer"
                    >
                      {BORDER_STYLES.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* ── TAB CONTENT: 3. TYPOGRAPHY & SIZE ADJUSTMENT ── */}
              {settingsTab === 'typography' && (
                <div className="space-y-3">
                  {/* Compact Font Dropdown */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-800 mb-1">फन्ट छनोट (Select Font Family):</label>
                    <select
                      value={selectedFont}
                      onChange={(e) => setSelectedFont(e.target.value)}
                      className="erp-input text-xs font-bold text-[#1e3a5f] bg-white cursor-pointer"
                    >
                      <optgroup label="-- देवनागरी / नेपाली फन्टहरू --">
                        {FONTS.filter((f) => f.category === 'Nepali').map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="-- English / Classic Fonts --">
                        {FONTS.filter((f) => f.category === 'English').map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Size Sliders Grid */}
                  <div className="space-y-2.5 pt-1">
                    {/* Header Nepali Name Size */}
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="flex justify-between text-[11px] text-gray-700 mb-1">
                        <span>विद्यालय नेपाली नाम आकार (Header Size):</span>
                        <strong className="font-mono text-[#1e3a5f]">{headerFontSizeNe}px</strong>
                      </div>
                      <input
                        type="range"
                        min="16"
                        max="32"
                        step="1"
                        value={headerFontSizeNe}
                        onChange={(e) => setHeaderFontSizeNe(parseInt(e.target.value, 10))}
                        className="w-full cursor-pointer accent-[#1e3a5f]"
                      />
                    </div>

                    {/* Header English Name Size */}
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="flex justify-between text-[11px] text-gray-700 mb-1">
                        <span>English Name Size:</span>
                        <strong className="font-mono text-[#1e3a5f]">{headerFontSizeEn}px</strong>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="18"
                        step="0.5"
                        value={headerFontSizeEn}
                        onChange={(e) => setHeaderFontSizeEn(parseFloat(e.target.value))}
                        className="w-full cursor-pointer accent-[#1e3a5f]"
                      />
                    </div>

                    {/* Subject Size */}
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="flex justify-between text-[11px] text-gray-700 mb-1">
                        <span>विषय आकार (Subject Size):</span>
                        <strong className="font-mono text-[#1e3a5f]">{subjectFontSize}px</strong>
                      </div>
                      <input
                        type="range"
                        min="13"
                        max="24"
                        step="1"
                        value={subjectFontSize}
                        onChange={(e) => setSubjectFontSize(parseInt(e.target.value, 10))}
                        className="w-full cursor-pointer accent-[#1e3a5f]"
                      />
                    </div>

                    {/* Body Size & Line Spacing */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <div className="flex justify-between text-[10.5px] text-gray-700 mb-1">
                          <span>अक्षर (Body Font):</span>
                          <strong className="font-mono">{bodyFontSize}px</strong>
                        </div>
                        <input
                          type="range"
                          min="11"
                          max="20"
                          step="0.5"
                          value={bodyFontSize}
                          onChange={(e) => setBodyFontSize(parseFloat(e.target.value))}
                          className="w-full cursor-pointer accent-[#1e3a5f]"
                        />
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <div className="flex justify-between text-[10.5px] text-gray-700 mb-1">
                          <span>लाइन स्पेसिङ:</span>
                          <strong className="font-mono">{lineHeight}x</strong>
                        </div>
                        <input
                          type="range"
                          min="1.4"
                          max="2.5"
                          step="0.1"
                          value={lineHeight}
                          onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                          className="w-full cursor-pointer accent-[#1e3a5f]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Colors Picker */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-200">
                    <span className="text-[10.5px] font-bold text-gray-700 block">हेडर तथा शीर्षक रङ (Colors):</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setHeaderColor(c.hex);
                            setSubjectColor(c.hex);
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-bold cursor-pointer transition ${
                            headerColor === c.hex ? 'border-[#1e3a5f] bg-blue-50 text-[#1e3a5f] ring-1 ring-[#1e3a5f]' : 'border-gray-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.hex }} />
                          <span>{c.name}</span>
                        </button>
                      ))}
                      <input
                        type="color"
                        value={headerColor}
                        onChange={(e) => {
                          setHeaderColor(e.target.value);
                          setSubjectColor(e.target.value);
                        }}
                        className="w-6 h-6 p-0 border border-gray-300 rounded cursor-pointer ml-auto"
                        title="Custom Color"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB CONTENT: 4. LOGO, SCHOOL SEAL, HEADMASTER SEAL & SIGNATURE ── */}
              {settingsTab === 'assets' && (
                <div className="space-y-3">
                  {/* Upload Cards Strip (4 items) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* 1. School Logo */}
                    <div className="p-2 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#1e3a5f]">१. विद्यालय लोगो:</span>
                        <input
                          type="checkbox"
                          checked={showLogo}
                          onChange={(e) => setShowLogo(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                      </div>
                      <label className="block py-1 px-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[9px] font-bold text-center cursor-pointer transition">
                        <Upload size={10} className="inline mr-0.5" />
                        <span>Upload Logo</span>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                      {customLogoUrl ? (
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-[8px] text-emerald-700 font-bold">✓ Loaded</span>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomLogoUrl(null);
                              localStorage.removeItem('official_school_logo');
                            }}
                            className="text-rose-600 hover:underline text-[8px]"
                          >
                            हटाउनुहोस्
                          </button>
                        </div>
                      ) : (
                        <span className="text-[8px] text-gray-400 block text-center">कुनै छैन</span>
                      )}
                    </div>

                    {/* 2. School Official Round Seal */}
                    <div className="p-2 bg-purple-50/60 rounded-xl border border-purple-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-purple-950">२. विद्यालय छाप:</span>
                        <input
                          type="checkbox"
                          checked={showSeal}
                          onChange={(e) => setShowSeal(e.target.checked)}
                          className="rounded text-purple-600"
                        />
                      </div>
                      <label className="block py-1 px-1 bg-purple-700 hover:bg-purple-800 text-white rounded text-[9px] font-bold text-center cursor-pointer transition">
                        <Upload size={10} className="inline mr-0.5" />
                        <span>Upload Seal</span>
                        <input type="file" accept="image/*" onChange={handleSealUpload} className="hidden" />
                      </label>
                      {customSealUrl ? (
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-[8px] text-emerald-700 font-bold">✓ Loaded</span>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomSealUrl(null);
                              localStorage.removeItem('official_school_seal');
                            }}
                            className="text-rose-600 hover:underline text-[8px]"
                          >
                            हटाउनुहोस्
                          </button>
                        </div>
                      ) : (
                        <span className="text-[8px] text-gray-400 block text-center">कुनै छैन</span>
                      )}
                    </div>

                    {/* 3. Headmaster Stamp / Seal (प्र.अ. पदिय छाप) */}
                    <div className="p-2 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-950">३. प्र.अ. पदिय छाप:</span>
                        <input
                          type="checkbox"
                          checked={showPrincipalSeal}
                          onChange={(e) => setShowPrincipalSeal(e.target.checked)}
                          className="rounded text-amber-600"
                        />
                      </div>
                      <label className="block py-1 px-1 bg-amber-700 hover:bg-amber-800 text-white rounded text-[9px] font-bold text-center cursor-pointer transition">
                        <Upload size={10} className="inline mr-0.5" />
                        <span>Upload Stamp</span>
                        <input type="file" accept="image/*" onChange={handlePrincipalSealUpload} className="hidden" />
                      </label>
                      {customPrincipalSealUrl ? (
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-[8px] text-emerald-700 font-bold">✓ Loaded</span>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomPrincipalSealUrl(null);
                              setShowPrincipalSeal(false);
                              localStorage.removeItem('official_principal_seal');
                            }}
                            className="text-rose-600 hover:underline text-[8px]"
                          >
                            हटाउनुहोस्
                          </button>
                        </div>
                      ) : (
                        <span className="text-[8px] text-gray-400 block text-center">कुनै छैन</span>
                      )}
                    </div>

                    {/* 4. Principal Signature */}
                    <div className="p-2 bg-slate-100 rounded-xl border border-slate-300 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-800">४. हस्ताक्षर:</span>
                        <input
                          type="checkbox"
                          checked={includeSignature}
                          onChange={(e) => setIncludeSignature(e.target.checked)}
                          className="rounded text-[#1e3a5f]"
                        />
                      </div>
                      <label className="block py-1 px-1 bg-[#1e3a5f] hover:bg-[#2a5280] text-white rounded text-[9px] font-bold text-center cursor-pointer transition">
                        <Upload size={10} className="inline mr-0.5" />
                        <span>Upload Sign</span>
                        <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                      </label>
                      {customSignatureUrl ? (
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-[8px] text-emerald-700 font-bold">✓ Loaded</span>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomSignatureUrl(null);
                              setIncludeSignature(false);
                              localStorage.removeItem('official_principal_signature');
                            }}
                            className="text-rose-600 hover:underline text-[8px]"
                          >
                            हटाउनुहोस्
                          </button>
                        </div>
                      ) : (
                        <span className="text-[8px] text-gray-400 block text-center">हातले गर्ने</span>
                      )}
                    </div>
                  </div>

                  {/* Logo Position Selector */}
                  <div className="space-y-1">
                    <span className="text-[10.5px] font-bold text-gray-700 block">लोगोको स्थान (Logo Position):</span>
                    <div className="grid grid-cols-4 gap-1 text-[10px] font-bold">
                      {(['left', 'center', 'right', 'hidden'] as const).map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setLogoPosition(pos)}
                          className={`py-1 rounded-lg border text-center transition cursor-pointer ${
                            logoPosition === pos ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-slate-50'
                          }`}
                        >
                          {pos === 'left' ? 'बायाँ (Left)' : pos === 'center' ? 'केन्द्र (Center)' : pos === 'right' ? 'दायाँ (Right)' : 'हटाउने'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Headmaster Stamp Placement (प्र.अ. पदिय छाप स्थान) */}
                  <div className="space-y-1 pt-1 border-t border-slate-200">
                    <span className="text-[10.5px] font-bold text-amber-900 block">प्रधानाध्यापक पदिय छाप स्थान (Headmaster Stamp Position):</span>
                    <div className="grid grid-cols-3 gap-1 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setPrincipalSealPosition('below_name')}
                        className={`py-1 px-1 rounded-lg border text-center transition cursor-pointer ${
                          principalSealPosition === 'below_name' ? 'bg-amber-700 text-white border-amber-700 shadow-2xs' : 'bg-white text-gray-700 border-gray-200'
                        }`}
                      >
                        📌 नाम मुनि (Below Name)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrincipalSealPosition('over_signature')}
                        className={`py-1 px-1 rounded-lg border text-center transition cursor-pointer ${
                          principalSealPosition === 'over_signature' ? 'bg-amber-700 text-white border-amber-700 shadow-2xs' : 'bg-white text-gray-700 border-gray-200'
                        }`}
                      >
                        ✍️ हस्ताक्षर माथि (Over Sign)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrincipalSealPosition('beside_name')}
                        className={`py-1 px-1 rounded-lg border text-center transition cursor-pointer ${
                          principalSealPosition === 'beside_name' ? 'bg-amber-700 text-white border-amber-700 shadow-2xs' : 'bg-white text-gray-700 border-gray-200'
                        }`}
                      >
                        📐 दायाँ छेउमा (Beside)
                      </button>
                    </div>
                  </div>

                  {/* Sizes & Transparency Sliders */}
                  <div className="space-y-2 pt-1">
                    {/* Logo Size */}
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="flex justify-between text-[10.5px] text-gray-700 mb-1">
                        <span>लोगोको आकार (Logo Size):</span>
                        <strong className="font-mono text-blue-900">{logoSize}px</strong>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="160"
                        step="5"
                        value={logoSize}
                        onChange={(e) => setLogoSize(parseInt(e.target.value, 10))}
                        className="w-full cursor-pointer accent-blue-600"
                      />
                    </div>

                    {/* School Seal Size & Transparency */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-purple-50/50 p-2 rounded-lg border border-purple-200">
                        <div className="flex justify-between text-[10px] text-purple-950 mb-1">
                          <span>विद्यालय छाप आकार:</span>
                          <strong className="font-mono">{sealSize}px</strong>
                        </div>
                        <input
                          type="range"
                          min="60"
                          max="180"
                          step="5"
                          value={sealSize}
                          onChange={(e) => setSealSize(parseInt(e.target.value, 10))}
                          className="w-full cursor-pointer accent-purple-700"
                        />
                      </div>
                      <div className="bg-purple-50/50 p-2 rounded-lg border border-purple-200">
                        <div className="flex justify-between text-[10px] text-purple-950 mb-1">
                          <span>छाप पारदर्शी (Opacity):</span>
                          <strong className="font-mono">{Math.round(sealOpacity * 100)}%</strong>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="1.0"
                          step="0.05"
                          value={sealOpacity}
                          onChange={(e) => setSealOpacity(parseFloat(e.target.value))}
                          className="w-full cursor-pointer accent-purple-700"
                        />
                      </div>
                    </div>

                    {/* Headmaster Stamp Size & Transparency */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-amber-50/60 p-2 rounded-lg border border-amber-200">
                        <div className="flex justify-between text-[10px] text-amber-950 mb-1">
                          <span>प्र.अ. छाप आकार (Size):</span>
                          <strong className="font-mono">{principalSealSize}px</strong>
                        </div>
                        <input
                          type="range"
                          min="45"
                          max="130"
                          step="5"
                          value={principalSealSize}
                          onChange={(e) => setPrincipalSealSize(parseInt(e.target.value, 10))}
                          className="w-full cursor-pointer accent-amber-700"
                        />
                      </div>
                      <div className="bg-amber-50/60 p-2 rounded-lg border border-amber-200">
                        <div className="flex justify-between text-[10px] text-amber-950 mb-1">
                          <span>प्र.अ. छाप पारदर्शी (Opacity):</span>
                          <strong className="font-mono">{Math.round(principalSealOpacity * 100)}%</strong>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="1.0"
                          step="0.05"
                          value={principalSealOpacity}
                          onChange={(e) => setPrincipalSealOpacity(parseFloat(e.target.value))}
                          className="w-full cursor-pointer accent-amber-700"
                        />
                      </div>
                    </div>

                    {/* Signature Width */}
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="flex justify-between text-[10.5px] text-gray-700 mb-1">
                        <span>हस्ताक्षर चौडाइ (Signature Width):</span>
                        <strong className="font-mono text-[#1e3a5f]">{signatureWidth}px</strong>
                      </div>
                      <input
                        type="range"
                        min="70"
                        max="200"
                        step="5"
                        value={signatureWidth}
                        onChange={(e) => setSignatureWidth(parseInt(e.target.value, 10))}
                        className="w-full cursor-pointer accent-[#1e3a5f]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => triggerLetterPrint()}
                  className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition shadow-2xs cursor-pointer text-xs"
                >
                  <Printer size={14} className="text-blue-600" />
                  <span>प्रिन्ट गर्नुहोस् (Print)</span>
                </button>
                <button
                  type="button"
                  disabled={createLetterMutation.isPending}
                  onClick={() => createLetterMutation.mutate()}
                  className="rounded-xl bg-[#1e3a5f] px-4 py-2 font-bold text-white hover:bg-[#2a5280] flex items-center gap-1.5 transition disabled:opacity-60 shadow-xs cursor-pointer text-xs"
                >
                  <Send size={13} />
                  <span>{createLetterMutation.isPending ? 'दर्ता हुँदैछ...' : 'चलानी दर्ता (Save)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Right Live Letterhead A4 Paper (Spans full when controls hidden) ── */}
          <div
            className={`${
              isControlsVisible ? 'lg:col-span-7' : 'lg:col-span-12 max-w-4xl mx-auto w-full'
            } transition-all duration-200`}
          >
            {/* Top Quick Bar above A4 */}
            <div className="flex items-center justify-between mb-2 text-xs px-1">
              <span className="text-gray-500 font-semibold flex items-center gap-1.5">
                <span>A4 Live Letter Preview</span>
                <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded font-mono">
                  Font: {activeFont.name}
                </span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerLetterPrint()}
                  className="px-3 py-1 bg-[#1e3a5f] text-white rounded-lg font-bold text-xs flex items-center gap-1.5 hover:bg-[#2a5280] shadow-xs cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Print A4 Letter</span>
                </button>
              </div>
            </div>

            {/* A4 Paper Sheet */}
            <div
              style={{ fontFamily: activeFontCss }}
              className="rounded-2xl border-2 border-gray-300 bg-white p-8 md:p-12 shadow-xl space-y-4 text-left min-h-[750px] relative overflow-hidden"
            >
              {/* Background Watermark */}
              {showWatermark && customLogoUrl && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 opacity-[0.06] pointer-events-none">
                  <img src={customLogoUrl} alt="Watermark" className="w-full h-full object-contain" />
                </div>
              )}

              {/* ── SCHOOL LETTERHEAD (Header Text Strictly Centered) ── */}
              <div
                style={{ borderBottom: activeBorderCss }}
                className="relative pb-3"
              >
                {/* Center Logo Option */}
                {showLogo && logoPosition === 'center' && customLogoUrl && (
                  <div className="flex justify-center mb-2">
                    <img
                      src={customLogoUrl}
                      alt="Logo"
                      style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
                      className="object-contain rounded-full"
                    />
                  </div>
                )}

                {/* Left Logo Option (Absolute - Never displaces the center of header text) */}
                {showLogo && logoPosition === 'left' && customLogoUrl && (
                  <div
                    style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
                    className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
                  >
                    <img
                      src={customLogoUrl}
                      alt="Logo"
                      style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
                      className="object-contain rounded-full"
                    />
                  </div>
                )}

                {/* Right Logo Option (Absolute - Never displaces the center of header text) */}
                {showLogo && logoPosition === 'right' && customLogoUrl && (
                  <div
                    style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
                  >
                    <img
                      src={customLogoUrl}
                      alt="Logo"
                      style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
                      className="object-contain rounded-full"
                    />
                  </div>
                )}

                {/* Strictly Centered Letterhead Texts */}
                <div className="w-full text-center space-y-0.5 mx-auto">
                  <h2
                    style={{ fontSize: `${headerFontSizeNe}px`, color: headerColor }}
                    className="font-black tracking-tight leading-tight"
                  >
                    {letterForm.schoolNameNe}
                  </h2>
                  <p
                    style={{ fontSize: `${subHeaderFontSize}px` }}
                    className="font-bold text-gray-900"
                  >
                    {letterForm.schoolSubtitleNe}
                  </p>
                  {letterForm.schoolEstdNe && (
                    <p
                      style={{ fontSize: `${subHeaderFontSize - 1}px` }}
                      className="font-bold text-gray-700"
                    >
                      {letterForm.schoolEstdNe}
                    </p>
                  )}
                  {letterForm.schoolNameEn && (
                    <h3
                      style={{ fontSize: `${headerFontSizeEn}px`, color: headerColor }}
                      className="font-black tracking-wider uppercase font-sans mt-1"
                    >
                      {letterForm.schoolNameEn}
                    </h3>
                  )}
                  {letterForm.schoolSubtitleEn && (
                    <p
                      style={{ fontSize: `${subHeaderFontSize - 1.5}px` }}
                      className="font-bold text-gray-800 font-sans"
                    >
                      {letterForm.schoolSubtitleEn}
                    </p>
                  )}
                  {letterForm.schoolEstdEn && (
                    <p
                      style={{ fontSize: `${subHeaderFontSize - 2}px` }}
                      className="font-bold text-gray-600 font-sans"
                    >
                      {letterForm.schoolEstdEn}
                    </p>
                  )}
                  {letterForm.contactInfo && (
                    <p className="text-[10px] font-semibold text-gray-500 pt-0.5">
                      {letterForm.contactInfo}
                    </p>
                  )}
                </div>

                {/* Header Center Stamp / Round Seal */}
                {showSeal && sealPosition === 'header_center' && customSealUrl && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      bottom: `-${sealSize / 2}px`,
                      transform: 'translateX(-50%)',
                      width: `${sealSize}px`,
                      height: `${sealSize}px`,
                      pointerEvents: 'none',
                      zIndex: 10,
                      opacity: sealOpacity,
                    }}
                    className="flex items-center justify-center"
                  >
                    <img
                      src={customSealUrl}
                      alt="School Seal"
                      style={{ width: `${sealSize}px`, height: `${sealSize}px` }}
                      className="object-contain"
                    />
                  </div>
                )}

                {/* Header Right Stamp / Round Seal */}
                {showSeal && sealPosition === 'header_right' && customSealUrl && (
                  <div
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '0',
                      width: `${sealSize}px`,
                      height: `${sealSize}px`,
                      pointerEvents: 'none',
                      zIndex: 10,
                      opacity: sealOpacity,
                    }}
                    className="flex items-center justify-center"
                  >
                    <img
                      src={customSealUrl}
                      alt="School Seal"
                      style={{ width: `${sealSize}px`, height: `${sealSize}px` }}
                      className="object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Patra Sankhya, Chalani No & Date Row */}
              <div
                style={{ fontSize: `${metaFontSize}px` }}
                className="flex justify-between items-start font-bold text-gray-800 pt-1"
              >
                <div className="flex flex-col gap-0.5 text-left">
                  {letterForm.patraSankhya && (
                    <div>पत्र संख्या: <span className="font-mono">{letterForm.patraSankhya}</span></div>
                  )}
                  {letterForm.chalaniNo && (
                    <div>चलानी नं.: <span className="font-mono">{letterForm.chalaniNo}</span></div>
                  )}
                </div>

                <div className="text-right">
                  मिति: <span className="font-mono font-black">{letterForm.letterDateBs || todayBS()}</span>
                </div>
              </div>

              {/* Subject Centered Bold */}
              <div
                style={{ fontSize: `${subjectFontSize}px`, color: subjectColor }}
                className="text-center font-black my-3 tracking-wide"
              >
                विषय: {letterForm.subject}
              </div>

              {/* Recipient */}
              {letterForm.recipient && (
                <div
                  style={{ fontSize: `${bodyFontSize}px` }}
                  className="font-bold text-gray-900 whitespace-pre-line leading-relaxed"
                >
                  {letterForm.recipient}
                </div>
              )}

              {/* Salutation */}
              {letterForm.salutation && (
                <div
                  style={{ fontSize: `${bodyFontSize}px` }}
                  className="font-bold text-gray-800"
                >
                  {letterForm.salutation}
                </div>
              )}

              {/* Letter Body */}
              <div
                style={{ fontSize: `${bodyFontSize}px`, lineHeight: lineHeight, color: textColor }}
                className="text-justify indent-10 whitespace-pre-line leading-relaxed"
              >
                {letterForm.body}
              </div>

              {/* ── Signatory Footer Right with Headmaster Stamp & Signature ── */}
              <div className="pt-8 flex justify-end">
                <div
                  style={{ fontSize: `${signatoryFontSize}px` }}
                  className="text-center min-w-[180px] space-y-0.5 relative"
                >
                  {/* Signature Area (With option to overlap Headmaster seal) */}
                  <div className="flex flex-col items-center justify-center min-h-[48px] mb-1 relative">
                    {/* Headmaster Stamp over signature if chosen */}
                    {showPrincipalSeal && principalSealPosition === 'over_signature' && customPrincipalSealUrl && (
                      <div
                        style={{
                          opacity: principalSealOpacity,
                          zIndex: 2,
                          pointerEvents: 'none',
                          marginBottom: '-15px',
                        }}
                      >
                        <img
                          src={customPrincipalSealUrl}
                          alt="Headmaster Stamp"
                          style={{ maxHeight: `${principalSealSize}px`, maxWidth: '140px' }}
                          className="object-contain"
                        />
                      </div>
                    )}

                    {/* Real signature only if uploaded */}
                    {includeSignature && isPrincipalApproved && customSignatureUrl ? (
                      <img
                        src={customSignatureUrl}
                        alt="Signature"
                        style={{ maxWidth: `${signatureWidth}px` }}
                        className="max-h-12 object-contain"
                      />
                    ) : (
                      <div className="h-8"></div>
                    )}
                  </div>

                  {/* Principal Name */}
                  <p
                    style={{ fontSize: `${signatoryFontSize + 1}px` }}
                    className="font-black text-gray-950"
                  >
                    {letterForm.signatoryName}
                  </p>

                  {/* Principal Designation */}
                  <p
                    style={{ fontSize: `${signatoryFontSize}px` }}
                    className="font-bold text-[#1e3a5f]"
                  >
                    {letterForm.signatoryRole}
                  </p>

                  {/* Headmaster Stamp directly below Principal Name & Role */}
                  {showPrincipalSeal && principalSealPosition === 'below_name' && customPrincipalSealUrl && (
                    <div
                      style={{
                        marginTop: '4px',
                        display: 'flex',
                        justifyContent: 'center',
                        opacity: principalSealOpacity,
                      }}
                    >
                      <img
                        src={customPrincipalSealUrl}
                        alt="Headmaster Stamp"
                        style={{ maxHeight: `${principalSealSize}px`, maxWidth: '140px' }}
                        className="object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ TAB 2: CHALANI BOOK REGISTER ════════════════════ */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Chalani No, Recipient, Subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs focus:border-[#1e3a5f] focus:bg-white focus:outline-hidden"
              />
            </div>
            <span className="text-xs text-gray-500 font-semibold">
              Total Registered Letters: <strong>{letters.length}</strong>
            </span>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-[#1e3a5f] text-white">
                <tr>
                  <th className="p-3.5 font-bold uppercase w-28">चलानी नं.</th>
                  <th className="p-3.5 font-bold uppercase w-24">मिति (BS)</th>
                  <th className="p-3.5 font-bold uppercase">पाउने कार्यालय / व्यक्ति</th>
                  <th className="p-3.5 font-bold uppercase">विषय</th>
                  <th className="p-3.5 font-bold uppercase">हस्ताक्षरकर्ता</th>
                  <th className="p-3.5 font-bold uppercase text-center w-20">प्रिन्ट</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      Loading chalani records...
                    </td>
                  </tr>
                ) : letters.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      No letters registered in Chalani book yet.
                    </td>
                  </tr>
                ) : (
                  letters.map((l: any) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-mono font-bold text-[#1e3a5f]">{l.chalaniNo}</td>
                      <td className="p-3.5 font-mono text-gray-600">{l.letterDateBs}</td>
                      <td className="p-3.5 font-medium text-gray-800 max-w-[200px] truncate">{l.recipient}</td>
                      <td className="p-3.5 font-bold text-gray-900 max-w-[250px] truncate">{l.subject}</td>
                      <td className="p-3.5 text-gray-600">{l.signatoryName || 'Principal'}</td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => triggerLetterPrint(l)}
                          className="rounded-lg p-1.5 text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
                          title="Print Letter"
                        >
                          <Printer size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
