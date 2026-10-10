'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import { numberToNepaliWords, toNepaliDigits } from '@/lib/nepali-number-words';
import {
  Building,
  Printer,
  FileText,
  CreditCard,
  Calendar,
  CheckCircle2,
  Users,
  Edit2,
  Download,
  RefreshCw,
  Image as ImageIcon,
  Upload,
  Trash2,
  Plus,
  Sliders,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface BankTransferLetterTabProps {
  schoolProfile: any;
  currentBulkStaffList: any[]; // { teacher, netPayable, bankAccountNo, post, taha }
  payrollsHistory: any[];
  bankAccountsData: any[];
  selectedYear: string;
  fromMonth: string;
  toMonth: string;
  monthCount: number;
}

interface EditableStaffRow {
  id: number | string;
  fullName: string;
  bankAccountNo: string;
  netPayable: number;
}

export default function BankTransferLetterTab({
  schoolProfile,
  currentBulkStaffList,
  payrollsHistory,
  bankAccountsData,
  selectedYear,
  fromMonth,
  toMonth,
  monthCount,
}: BankTransferLetterTabProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Central Bank Directory Query
  const { data: bankDirectoryData } = useQuery({
    queryKey: ['bank-directory'],
    queryFn: async () => {
      const res = await api.get('/teachers/banks/directory');
      return res.data || { data: [], allBanks: [], allBranches: [] };
    },
  });

  const allKnownBanks: string[] = bankDirectoryData?.allBanks || [];
  const allKnownBranches: string[] = bankDirectoryData?.allBranches || [];

  // Source selector: 'bulk' (current unsaved/active calculation) or 'history' (saved batch)
  const [dataSource, setDataSource] = useState<'bulk' | 'history'>('bulk');
  const [selectedHistoryPeriod, setSelectedHistoryPeriod] = useState<string>('');

  // 1. School Header & Logo Customization
  const [schoolNameNe, setSchoolNameNe] = useState<string>(
    schoolProfile?.nameNepali || 'नेपाल माध्यमिक विद्यालय (१०+२)'
  );
  const [schoolSubNe, setSchoolSubNe] = useState<string>(
    schoolProfile?.address || 'विश्रामपुर, वृन्दावन न.पा.-२, रौतहट'
  );
  const [schoolEstNe, setSchoolEstNe] = useState<string>(
    schoolProfile?.establishedYear ? `स्था: ${schoolProfile.establishedYear}` : 'स्था: २०४१'
  );
  const [schoolLogo, setSchoolLogo] = useState<string>(schoolProfile?.logo || '');
  const [showLogo, setShowLogo] = useState<boolean>(true);

  // 2. Letterpad Metadata Configuration
  const [patraSankhya, setPatraSankhya] = useState<string>(`२०८१/०८२`);
  const [chalaniNo, setChalaniNo] = useState<string>('१२५');
  const [letterDateBs, setLetterDateBs] = useState<string>(todayBS());

  // 3. Recipient Bank Details
  const [salutation, setSalutation] = useState<string>('श्रीमान् शाखा प्रबन्धक ज्यू,');
  const [bankName, setBankName] = useState<string>('माछापुच्छ्रे बैंक लिमिटेड');
  const [bankBranch, setBankBranch] = useState<string>('हर्सहा शाखा, रौतहट');
  const [chequeNo, setChequeNo] = useState<string>('CHQ-00982314');

  // 4. Subject & Body Text
  const [subjectText, setSubjectText] = useState<string>('विषय: रकम ट्रान्सफर गरी दिने बारे ।');
  const [kistaDetails, setKistaDetails] = useState<string>(
    `दोस्रो किस्ता (${fromMonth} देखि ${toMonth} सम्मको तलब भत्ता) ${selectedYear}`
  );
  const [bodyPrefix, setBodyPrefix] = useState<string>('उपर्युक्त सम्बन्धमा त्यस बैंकको नाउँमा');
  const [bodySuffix, setBodySuffix] = useState<string>(
    'को चेक थान एक यसै साथ पठाइएको छ । उक्त रकम यस विद्यालयका शिक्षक तथा कर्मचारीहरूको तपसिल बमोजिमको व्यक्तिगत बैंक खातामा'
  );
  const [bodyClosing, setBodyClosing] = useState<string>(
    'बापत रकम जम्मा (ट्रान्सफर) गरी दिनुहुन सादर अनुरोध छ ।'
  );

  // 5. Dual Signatures
  const [peshGarneTitle, setPeshGarneTitle] = useState<string>('लेखापाल / प्रशासन');
  const [peshGarneName, setPeshGarneName] = useState<string>('');
  const [sadrGarneTitle, setSadrGarneTitle] = useState<string>('प्रधानाध्यापक');
  const [sadrGarneName, setSadrGarneName] = useState<string>(
    schoolProfile?.principalName || 'प्रेमलाल प्रसाद राउत'
  );

  // Custom Editable Staff Rows State (allows manual additions/edits)
  const [customStaffList, setCustomStaffList] = useState<EditableStaffRow[]>([]);
  const [hasCustomEdits, setHasCustomEdits] = useState<boolean>(false);

  // Handle Logo Image Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('कृपया फोटो (PNG, JPG, JPEG) मात्र छनोट गर्नुहोस्।');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSchoolLogo(base64);
      setShowLogo(true);
      toast.success('विद्यालयको लोगो सफलतापूर्वक अपलोड भयो!');
    };
    reader.readAsDataURL(file);
  };

  // Sync bank details if selected from school's registered bank accounts
  const handleSelectSchoolBank = (bankId: string) => {
    const found = bankAccountsData?.find((b: any) => b.id.toString() === bankId);
    if (found) {
      setBankName(found.bankName || 'माछापुच्छ्रे बैंक लिमिटेड');
      setBankBranch(found.branch || 'रौतहट');
    }
  };

  // Resolve distinct history batches
  const availableHistoryBatches = useMemo(() => {
    const batches = new Map<string, any[]>();
    payrollsHistory?.forEach((p: any) => {
      const key = `${p.monthFrom || '2081-01'}_${p.monthTo || '2081-03'}`;
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key)?.push(p);
    });
    return Array.from(batches.entries()).map(([key, items]) => ({
      key,
      label: `${items[0]?.monthFrom} देखि ${items[0]?.monthTo} (${items.length} जना)`,
      items,
    }));
  }, [payrollsHistory]);

  // Derive initial active staff items
  const baseStaffItems: EditableStaffRow[] = useMemo(() => {
    if (dataSource === 'bulk') {
      return currentBulkStaffList
        .filter((item) => (item.netPayable || 0) > 0)
        .map((item) => ({
          id: item.teacherId || item.teacher?.id || Math.random(),
          fullName: item.teacher?.fullNameNepali || item.teacher?.fullName || 'कर्मचारी',
          bankAccountNo: item.teacher?.bankAccountNo || item.bankAccountNo || 'खाता उपलब्ध नभएको',
          netPayable: item.netPayable || 0,
        }));
    } else {
      const foundBatch =
        availableHistoryBatches.find((b) => b.key === selectedHistoryPeriod) ||
        availableHistoryBatches[0];
      if (!foundBatch) return [];
      return (foundBatch.items || []).map((p: any) => ({
        id: p.teacherId,
        fullName: p.teacher?.fullNameNepali || p.teacher?.fullName || 'कर्मचारी',
        bankAccountNo: p.teacher?.bankAccountNo || 'खाता उपलब्ध नभएको',
        netPayable: p.khudPaaunuParne || 0,
      }));
    }
  }, [dataSource, currentBulkStaffList, selectedHistoryPeriod, availableHistoryBatches]);

  // Effective staff items to render
  const effectiveStaffItems = useMemo(() => {
    if (hasCustomEdits && customStaffList.length > 0) {
      return customStaffList;
    }
    return baseStaffItems;
  }, [hasCustomEdits, customStaffList, baseStaffItems]);

  // Reset to auto-calculated list
  const handleResetStaffList = () => {
    setCustomStaffList(baseStaffItems);
    setHasCustomEdits(false);
    toast.success('कर्मचारी सूची रिसेट गरियो।');
  };

  // Modify row inline
  const handleUpdateRow = (index: number, field: keyof EditableStaffRow, val: any) => {
    const list = [...(hasCustomEdits ? customStaffList : baseStaffItems)];
    list[index] = { ...list[index], [field]: val };
    setCustomStaffList(list);
    setHasCustomEdits(true);
  };

  // Add new manual staff row
  const handleAddStaffRow = () => {
    const list = [...(hasCustomEdits ? customStaffList : baseStaffItems)];
    list.push({
      id: Date.now(),
      fullName: 'नयाँ कर्मचारीको नाम',
      bankAccountNo: '',
      netPayable: 0,
    });
    setCustomStaffList(list);
    setHasCustomEdits(true);
  };

  // Remove staff row
  const handleRemoveStaffRow = (index: number) => {
    const list = [...(hasCustomEdits ? customStaffList : baseStaffItems)];
    list.splice(index, 1);
    setCustomStaffList(list);
    setHasCustomEdits(true);
  };

  // Grand Total Net Transfer Amount
  const totalAmount = useMemo(() => {
    return effectiveStaffItems.reduce((sum, item) => sum + (Number(item.netPayable) || 0), 0);
  }, [effectiveStaffItems]);

  const amountInNepaliWords = useMemo(() => {
    return numberToNepaliWords(totalAmount);
  }, [totalAmount]);

  // ─── OFFICIAL PRINT GENERATOR (A4 LETTERPAD) ───
  const triggerPrintBankLetter = () => {
    const printWin = window.open('', '_blank', 'width=900,height=1100');
    if (!printWin) {
      alert('कृपया प्रिन्ट गर्न पप-अप अनुमति दिनुहोस्');
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>बैंक रकम ट्रान्सफर पत्र - ${schoolNameNe}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 15mm 15mm 15mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: "Noto Sans Devanagari", "Kalimati", "Preeti", "Segoe UI", Arial, sans-serif;
              font-size: 13.5px;
              color: #000;
              line-height: 1.6;
              margin: 0;
              padding: 0;
              background: #fff;
            }
            .letter-container {
              max-width: 780px;
              margin: 0 auto;
              padding: 5px;
            }
            .letterhead {
              border-bottom: 2.5px solid #1e3a5f;
              padding-bottom: 10px;
              margin-bottom: 12px;
              position: relative;
            }
            .letterhead-content {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 15px;
              text-align: center;
            }
            .school-logo {
              max-height: 70px;
              max-width: 70px;
              object-fit: contain;
            }
            .school-titles {
              flex: 1;
            }
            .school-main {
              font-size: 22px;
              font-weight: 900;
              color: #0b1f3a;
              margin: 0;
              letter-spacing: -0.2px;
            }
            .school-sub {
              font-size: 13.5px;
              font-weight: bold;
              color: #334155;
              margin: 2px 0 0 0;
            }
            .meta-strip {
              display: flex;
              justify-content: space-between;
              font-size: 13px;
              font-weight: bold;
              margin-top: 10px;
              border-top: 1px solid #e2e8f0;
              padding-top: 5px;
            }
            .recipient-block {
              margin-top: 16px;
              font-size: 13.5px;
              line-height: 1.45;
            }
            .subject-line {
              text-align: center;
              font-size: 14.5px;
              font-weight: 900;
              margin: 14px 0;
              text-decoration: underline;
              color: #0f172a;
            }
            .body-text {
              text-align: justify;
              font-size: 13.5px;
              text-indent: 40px;
              margin-bottom: 14px;
              line-height: 1.65;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 12px 0 16px 0;
              font-size: 12.5px;
            }
            th, td {
              border: 1px solid #000;
              padding: 6px 10px;
            }
            th {
              background: #f1f5f9;
              font-weight: 900;
              text-align: center;
            }
            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .text-right { text-align: right; font-family: monospace; font-size: 13px; font-weight: bold; }
            .grand-total {
              background: #f8fafc;
              font-weight: 900;
              font-size: 13.5px;
            }
            .words-box {
              font-size: 12.5px;
              font-weight: bold;
              margin-bottom: 12px;
              padding: 4px 0;
            }
            .signatures {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
              font-size: 13px;
              font-weight: bold;
              page-break-inside: avoid;
            }
            .sig-box {
              width: 220px;
              text-align: center;
              border-top: 1px dashed #000;
              padding-top: 6px;
            }
          </style>
        </head>
        <body>
          <div class="letter-container">
            <!-- 1. OFFICIAL SCHOOL LETTERHEAD -->
            <div class="letterhead">
              <div class="letterhead-content">
                ${
                  showLogo && schoolLogo
                    ? `<img src="${schoolLogo}" alt="Logo" class="school-logo" />`
                    : ''
                }
                <div class="school-titles">
                  <h1 class="school-main">${schoolNameNe}</h1>
                  <div class="school-sub">${schoolSubNe} (${schoolEstNe})</div>
                </div>
              </div>
              
              <div class="meta-strip">
                <div>पत्र संख्या: <strong>${patraSankhya}</strong></div>
                <div>चलानी नं.: <strong>${chalaniNo}</strong></div>
                <div>मिति: <strong>${letterDateBs}</strong> BS</div>
              </div>
            </div>

            <!-- 2. RECIPIENT BANK DETAILS -->
            <div class="recipient-block">
              <div>${salutation}</div>
              <div><strong>${bankName}</strong></div>
              <div>${bankBranch} ।</div>
            </div>

            <!-- 3. SUBJECT -->
            <div class="subject-line">
              ${subjectText}
            </div>

            <!-- 4. LETTER BODY PARAGRAPH -->
            <div class="body-text">
              ${bodyPrefix} <strong>रु. ${totalAmount.toLocaleString()} /- (अक्षरेपी ${amountInNepaliWords})</strong> को चेक नं. <strong>${chequeNo}</strong> ${bodySuffix} <strong>${kistaDetails}</strong> ${bodyClosing}
            </div>

            <!-- 5. STAFF DISPATCH TABLE (4 Columns: S.N, Name, Bank A/C, Amount) -->
            <table>
              <thead>
                <tr>
                  <th style="width: 10%;">क्र.सं.</th>
                  <th class="text-left" style="width: 44%;">कर्मचारीको नाम</th>
                  <th class="text-left" style="width: 26%;">खाता नम्बर</th>
                  <th class="text-right" style="width: 20%;">रकम (रू.)</th>
                </tr>
              </thead>
              <tbody>
                ${effectiveStaffItems
                  .map(
                    (item, idx) => `
                  <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td class="text-left"><strong>${item.fullName}</strong></td>
                    <td class="text-left" style="font-family: monospace;">${item.bankAccountNo || 'खाता नभएको'}</td>
                    <td class="text-right">${(Number(item.netPayable) || 0).toLocaleString()}</td>
                  </tr>
                `
                  )
                  .join('')}
                <tr class="grand-total">
                  <td colspan="3" class="text-left"><strong>कुल जम्मा (GRAND TOTAL):</strong></td>
                  <td class="text-right">रू ${totalAmount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div class="words-box">
              अक्षरेपी: <em>${amountInNepaliWords}</em>
            </div>

            <!-- 6. DUAL SIGNATURE FOOTER -->
            <div class="signatures">
              <div class="sig-box">
                पेश गर्ने<br/>
                ${peshGarneName ? `<strong>${peshGarneName}</strong><br/>` : ''}
                (${peshGarneTitle})
              </div>
              <div class="sig-box">
                सदर गर्ने<br/>
                <strong>${sadrGarneName}</strong><br/>
                ${sadrGarneTitle}
              </div>
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

  return (
    <div className="space-y-6">
      {/* ─── 1. FULL EDITABLE CONFIGURATION PANEL ─── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#1e3a5f] text-white rounded-xl shadow-2xs">
              <Building size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1e3a5f]">
                बैंक रकम ट्रान्सफर पत्र (Bank Salary Transfer Letter Generator)
              </h3>
              <p className="text-xs text-gray-500 font-nepali">
                लेटरप्याड, विद्यालय लोगो, बैंक विवरण, भाषा व्यहोरा र कर्मचारी रकम पूर्ण सम्पादन गरी १-क्लिकमा आधिकारिक A4 ढाँचामा प्रिन्ट गर्नुहोस्
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={triggerPrintBankLetter}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Printer size={16} />
              <span>प्रिन्ट आधिकारिक बैंक पत्र (Print Letterpad)</span>
            </button>
          </div>
        </div>

        {/* ── LOGO UPLOAD & SCHOOL HEADER CONTROLS ── */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Logo Box & Upload Trigger */}
              <div className="relative group">
                <div className="h-16 w-16 rounded-xl border-2 border-dashed border-blue-300 bg-white flex items-center justify-center overflow-hidden shadow-2xs">
                  {schoolLogo ? (
                    <img src={schoolLogo} alt="School Logo" className="h-full w-full object-contain p-1" />
                  ) : (
                    <ImageIcon className="text-blue-300" size={28} />
                  )}
                </div>
              </div>

              <div>
                <span className="font-extrabold text-gray-900 block text-xs">विद्यालयको लोगो (School Logo)</span>
                <p className="text-[11px] text-gray-500">पत्रको शिरोभागमा छाप्न लोगो अपलोड वा परिवर्तन गर्नुहोस्</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-900 border border-blue-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                  >
                    <Upload size={12} />
                    <span>लोगो छान्नुहोस्</span>
                  </button>
                  {schoolLogo && (
                    <button
                      type="button"
                      onClick={() => setSchoolLogo('')}
                      className="px-2 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Trash2 size={12} />
                      <span>हटाउनुहोस्</span>
                    </button>
                  )}
                  <label className="flex items-center gap-1.5 ml-2 cursor-pointer text-gray-700 font-bold">
                    <input
                      type="checkbox"
                      checked={showLogo}
                      onChange={(e) => setShowLogo(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>लोगो देखाउने</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-900 rounded-lg font-bold">
                कुल रकम: रु. {totalAmount.toLocaleString()} ({effectiveStaffItems.length} जना)
              </span>
            </div>
          </div>

          {/* Editable School Name, Address, Established Year */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-blue-100">
            <div>
              <label className="block font-bold text-gray-700 mb-0.5">विद्यालयको नाम (Header Name):</label>
              <input
                type="text"
                value={schoolNameNe}
                onChange={(e) => setSchoolNameNe(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2 font-bold bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-0.5">ठेगाना / स्थान (Address):</label>
              <input
                type="text"
                value={schoolSubNe}
                onChange={(e) => setSchoolSubNe(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2 font-semibold bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-0.5">स्थापना वर्ष (Established):</label>
              <input
                type="text"
                value={schoolEstNe}
                onChange={(e) => setSchoolEstNe(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2 font-semibold bg-white"
              />
            </div>
          </div>
        </div>

        {/* ── METADATA & RECIPIENT CONTROLS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">विवरणको स्रोत (Data Source):</label>
            <select
              value={dataSource}
              onChange={(e: any) => {
                setDataSource(e.target.value);
                setHasCustomEdits(false);
              }}
              className="w-full rounded-xl border border-gray-300 p-2 font-bold bg-slate-50 focus:bg-white"
            >
              <option value="bulk">चालु एकमुष्ट भरपाई (Current Bulk Sheet - {currentBulkStaffList.length} जना)</option>
              <option value="history">सुरक्षित गरिएको भरपाई (Saved Payroll History Batch)</option>
            </select>
          </div>

          {dataSource === 'history' && (
            <div>
              <label className="block font-bold text-gray-700 mb-1">भरपाई ब्याच छनौट:</label>
              <select
                value={selectedHistoryPeriod}
                onChange={(e) => {
                  setSelectedHistoryPeriod(e.target.value);
                  setHasCustomEdits(false);
                }}
                className="w-full rounded-xl border border-gray-300 p-2 font-bold bg-white"
              >
                {availableHistoryBatches.map((b) => (
                  <option key={b.key} value={b.key}>{b.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-bold text-gray-700 mb-1">विद्यालयको बैंक खाता छनोट:</label>
            <select
              onChange={(e) => handleSelectSchoolBank(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-2 bg-slate-50 focus:bg-white"
            >
              <option value="">-- दर्ता बैंक खाताबाट लोड गर्नुहोस् --</option>
              {bankAccountsData?.map((b: any) => (
                <option key={b.id} value={b.id.toString()}>
                  {b.bankName} - {b.accountNumber} ({b.branch || 'रौतहट'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">चेक नम्बर (Cheque No):</label>
            <input
              type="text"
              value={chequeNo}
              onChange={(e) => setChequeNo(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-2 font-mono font-bold bg-white"
            />
          </div>
        </div>

        {/* Editable Letterpad Meta & Bank Target */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <label className="block font-semibold text-gray-700 mb-0.5">पत्र संख्या:</label>
            <input
              type="text"
              value={patraSankhya}
              onChange={(e) => setPatraSankhya(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-1.5 font-bold bg-white"
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-0.5">चलानी नं.:</label>
            <input
              type="text"
              value={chalaniNo}
              onChange={(e) => setChalaniNo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-1.5 font-bold bg-white font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-0.5">मिति (BS):</label>
            <input
              type="text"
              value={letterDateBs}
              onChange={(e) => setLetterDateBs(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-1.5 font-bold bg-white font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-0.5">सम्बोधन:</label>
            <input
              type="text"
              value={salutation}
              onChange={(e) => setSalutation(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-1.5 font-semibold bg-white"
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-0.5">बैंकको नाम:</label>
            <input
              type="text"
              list="letterpad-bank-list"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-1.5 font-bold bg-white"
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-0.5">बैंक शाखा / ठेगाना:</label>
            <input
              type="text"
              list="letterpad-branch-list"
              value={bankBranch}
              onChange={(e) => setBankBranch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-1.5 bg-white"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-gray-700 mb-0.5">विषय (Subject):</label>
            <input
              type="text"
              value={subjectText}
              onChange={(e) => setSubjectText(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-1.5 bg-white font-bold text-blue-900"
            />
          </div>
          <div className="sm:col-span-4">
            <label className="block font-semibold text-gray-700 mb-0.5">किस्ता / तलब अवधि विवरण (Kista / Months):</label>
            <input
              type="text"
              value={kistaDetails}
              onChange={(e) => setKistaDetails(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-1.5 bg-white font-semibold"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block font-semibold text-gray-700 mb-0.5">पेश गर्ने पद / नाम:</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="पद (e.g. लेखापाल)"
                value={peshGarneTitle}
                onChange={(e) => setPeshGarneTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-1.5 bg-white font-semibold"
              />
              <input
                type="text"
                placeholder="नाम (वैकल्पिक)"
                value={peshGarneName}
                onChange={(e) => setPeshGarneName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-1.5 bg-white"
              />
            </div>
          </div>
          <div className="sm:col-span-3">
            <label className="block font-semibold text-gray-700 mb-0.5">सदर गर्ने प्रधानाध्यापकको नाम र पद:</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="नाम"
                value={sadrGarneName}
                onChange={(e) => setSadrGarneName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-1.5 bg-white font-bold"
              />
              <input
                type="text"
                placeholder="पद (e.g. प्रधानाध्यापक)"
                value={sadrGarneTitle}
                onChange={(e) => setSadrGarneTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-1.5 bg-white font-semibold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. LIVE INTERACTIVE LETTERPAD PREVIEW (४-महल: क्र.सं., नाम, खाता नं, रकम) ─── */}
      <div className="rounded-2xl border border-gray-300 bg-white p-8 shadow-md max-w-4xl mx-auto space-y-5 text-gray-900 font-serif">
        {/* Letterpad Header */}
        <div className="border-b-2 border-[#1e3a5f] pb-3 space-y-1">
          <div className="flex items-center justify-center gap-4 text-center">
            {showLogo && schoolLogo && (
              <img src={schoolLogo} alt="School Logo" className="h-16 w-16 object-contain" />
            )}
            <div>
              <h2 className="text-2xl font-extrabold text-[#0b1f3a] tracking-tight">
                {schoolNameNe}
              </h2>
              <p className="text-xs font-bold text-slate-600">
                {schoolSubNe} | {schoolEstNe}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs font-bold text-slate-700 pt-2 border-t border-slate-200 mt-2 font-mono">
            <div>पत्र संख्या: <span className="font-extrabold text-black">{patraSankhya}</span></div>
            <div>चलानी नं.: <span className="font-extrabold text-black">{chalaniNo}</span></div>
            <div>मिति: <span className="font-extrabold text-black">{letterDateBs} BS</span></div>
          </div>
        </div>

        {/* Recipient */}
        <div className="text-xs font-medium space-y-0.5">
          <div>{salutation}</div>
          <div className="font-bold text-sm text-[#1e3a5f]">{bankName}</div>
          <div>{bankBranch} ।</div>
        </div>

        {/* Subject */}
        <div className="text-center text-sm font-extrabold underline py-1 text-slate-900">
          {subjectText}
        </div>

        {/* Body Paragraph */}
        <div className="text-xs leading-relaxed text-justify indent-8">
          {bodyPrefix} <strong>रु. {totalAmount.toLocaleString()} /- (अक्षरेपी {amountInNepaliWords})</strong> को चेक नं. <strong>{chequeNo}</strong> {bodySuffix} <strong>{kistaDetails}</strong> {bodyClosing}
        </div>

        {/* Table Toolbar (Add Row / Reset) */}
        <div className="flex items-center justify-between text-xs font-sans pb-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700">तपसिल (Staff Bank Transfer Table - ४ महल):</span>
            {hasCustomEdits && (
              <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-extrabold">
                Custom Edited
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddStaffRow}
              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
            >
              <Plus size={12} />
              <span>कर्मचारी थप्नुहोस्</span>
            </button>
            {hasCustomEdits && (
              <button
                type="button"
                onClick={handleResetStaffList}
                className="px-2 py-1 text-gray-500 hover:text-gray-800 text-[11px] font-bold cursor-pointer"
              >
                रिसेट
              </button>
            )}
          </div>
        </div>

        {/* Table of Staff — 4 Columns strictly without "पद वा तह" */}
        <div className="overflow-x-auto border border-black rounded">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 font-extrabold">
              <tr className="border-b border-black">
                <th className="py-2 px-2 text-center w-12 border-r border-black">क्र.सं.</th>
                <th className="py-2 px-3 border-r border-black">कर्मचारीको नाम</th>
                <th className="py-2 px-3 border-r border-black">खाता नम्बर</th>
                <th className="py-2 px-3 text-right w-36">रकम (रू.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {effectiveStaffItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-400">
                    कुनै कर्मचारी विवरण फेला परेन। माथिबाट भरपाई छान्नुहोस् वा "कर्मचारी थप्नुहोस्" थिच्नुहोस्।
                  </td>
                </tr>
              ) : (
                effectiveStaffItems.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50 group">
                    <td className="py-1.5 px-2 text-center font-mono border-r border-black">{idx + 1}</td>
                    <td className="py-1.5 px-3 border-r border-black">
                      <input
                        type="text"
                        value={item.fullName}
                        onChange={(e) => handleUpdateRow(idx, 'fullName', e.target.value)}
                        className="w-full bg-transparent font-bold focus:bg-amber-50 focus:outline-hidden p-0.5 rounded"
                      />
                    </td>
                    <td className="py-1.5 px-3 border-r border-black">
                      <input
                        type="text"
                        value={item.bankAccountNo}
                        onChange={(e) => handleUpdateRow(idx, 'bankAccountNo', e.target.value)}
                        placeholder="खाता नम्बर"
                        className="w-full bg-transparent font-mono font-bold text-blue-900 focus:bg-amber-50 focus:outline-hidden p-0.5 rounded"
                      />
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          value={item.netPayable}
                          onChange={(e) => handleUpdateRow(idx, 'netPayable', parseFloat(e.target.value) || 0)}
                          className="w-28 text-right bg-transparent font-mono font-bold focus:bg-amber-50 focus:outline-hidden p-0.5 rounded"
                        />
                        {hasCustomEdits && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStaffRow(idx)}
                            className="text-rose-500 opacity-0 group-hover:opacity-100 transition p-0.5 hover:bg-rose-50 rounded"
                            title="हटाउनुहोस्"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
              <tr className="bg-slate-100 font-extrabold border-t-2 border-black">
                <td colSpan={3} className="py-2 px-3 border-r border-black text-left">कुल जम्मा (GRAND TOTAL):</td>
                <td className="py-2 px-3 text-right font-mono text-sm text-emerald-900">रू {totalAmount.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Nepali Words summary */}
        <div className="text-xs bg-emerald-50/70 border border-emerald-300 p-2.5 rounded text-emerald-950 font-bold">
          अक्षरेपी: <em>{amountInNepaliWords}</em>
        </div>

        {/* Signatures */}
        <div className="flex justify-between pt-10 text-xs font-bold">
          <div className="text-center border-t border-black pt-1 w-48">
            <div>पेश गर्ने</div>
            {peshGarneName && <div className="font-extrabold text-sm text-slate-800">{peshGarneName}</div>}
            <div className="text-[11px] text-gray-600 font-normal">({peshGarneTitle})</div>
          </div>
          <div className="text-center border-t border-black pt-1 w-48">
            <div>सदर गर्ने</div>
            <div className="font-extrabold text-sm text-[#1e3a5f]">{sadrGarneName}</div>
            <div className="text-[11px] text-gray-600 font-normal">{sadrGarneTitle}</div>
          </div>
        </div>
      </div>

      {/* Central Bank Directory Datalists (Auto-Fetch Suggestions) */}
      <datalist id="letterpad-bank-list">
        {allKnownBanks.map((b: string) => (
          <option key={b} value={b} />
        ))}
      </datalist>
      <datalist id="letterpad-branch-list">
        {allKnownBranches.map((br: string) => (
          <option key={br} value={br} />
        ))}
      </datalist>
    </div>
  );
}
