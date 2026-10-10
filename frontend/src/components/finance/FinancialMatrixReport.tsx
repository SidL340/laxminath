'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Filter,
  Search,
  Building,
  Landmark,
  Wallet,
  Users,
  Layers,
  ArrowUpDown,
  RefreshCw,
  Eye,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';
import SearchableSelect from '@/components/ui/SearchableSelect';

interface FinancialMatrixReportProps {
  defaultType?: 'INCOME' | 'EXPENSE';
  allowedTypes?: Array<'INCOME' | 'EXPENSE'>;
  initialFinancialYearId?: string;
  hideTypeSwitcher?: boolean;
}

export default function FinancialMatrixReport({
  defaultType = 'INCOME',
  allowedTypes = ['INCOME', 'EXPENSE'],
  initialFinancialYearId,
  hideTypeSwitcher = false,
}: FinancialMatrixReportProps) {
  const [reportType, setReportType] = useState<'INCOME' | 'EXPENSE'>(defaultType);
  const [selectedFyId, setSelectedFyId] = useState<string>(initialFinancialYearId || 'ACTIVE');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('ALL');
  const [selectedHeadId, setSelectedHeadId] = useState<string>('ALL');
  const [fromDateBs, setFromDateBs] = useState<string>('');
  const [toDateBs, setToDateBs] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'MATRIX' | 'PARTY_BREAKDOWN' | 'CATEGORY_SUMMARY'>('MATRIX');

  const [showAllHeads, setShowAllHeads] = useState(false);

  // 1. Fetch Financial Years
  const { data: financialYears = [] } = useQuery({
    queryKey: ['financial-years-all'],
    queryFn: async () => {
      const res = await api.get('/financial-years/all');
      return res.data?.data || [];
    },
  });

  // Fetch School Profile for Print Letterhead
  const { data: schoolProfile } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data || {};
    },
  });

  const activeFy = financialYears.find((f: any) => f.isActive) || financialYears[0];

  const resolvedFyQueryParam =
    selectedFyId === 'ALL'
      ? 'ALL'
      : selectedFyId === 'ACTIVE'
      ? activeFy?.id ? String(activeFy.id) : ''
      : selectedFyId;

  // 2. Fetch Matrix Report Data
  const {
    data: reportData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: [
      'finance-matrix-report',
      reportType,
      resolvedFyQueryParam,
      selectedCategoryId,
      selectedPartyId,
      selectedHeadId,
      fromDateBs,
      toDateBs,
      searchQuery,
      showAllHeads,
    ],
    queryFn: async () => {
      const res = await api.get('/finance-reports/matrix-report', {
        params: {
          type: reportType,
          financialYearId: resolvedFyQueryParam,
          categoryId: selectedCategoryId,
          partyId: selectedPartyId,
          headId: selectedHeadId,
          fromDateBs: fromDateBs || undefined,
          toDateBs: toDateBs || undefined,
          q: searchQuery || undefined,
          showAllHeads: showAllHeads ? 'true' : undefined,
        },
      });
      return res.data?.data || null;
    },
  });

  const isIncome = reportType === 'INCOME';

  // Resolved FY label
  const currentFyLabel = useMemo(() => {
    if (selectedFyId === 'ALL') return 'सबै आर्थिक वर्षहरू (All Fiscal Years)';
    if (reportData?.financialYear) {
      return `आ.व. ${reportData.financialYear.year || reportData.financialYear.name || reportData.financialYear.code}`;
    }
    const match = financialYears.find((f: any) => String(f.id) === String(selectedFyId));
    if (match) return `आ.व. ${match.year || match.name || match.code}`;
    return activeFy ? `आ.व. ${activeFy.year || activeFy.name || 'चालु'}` : 'चालु आ.व.';
  }, [selectedFyId, reportData, financialYears, activeFy]);

  // Columns & Rows
  const columns = reportData?.columns || [];
  const rows = reportData?.rows || [];
  const totals = reportData?.totals || {
    totalAmount: 0,
    bankTotal: 0,
    cashTotal: 0,
    headTotals: {},
    categoryTotals: {},
  };
  const partyBreakdown = reportData?.partyBreakdown || [];
  const availableCategories = reportData?.availableCategories || [];
  const availableParties = reportData?.availableParties || [];

  // Export to CSV Function
  const handleExportCSV = () => {
    if (!reportData) return;

    if (viewMode === 'PARTY_BREAKDOWN') {
      // Party Breakdown CSV
      const headers = ['क्र.सं.', 'पार्टी/स्रोतको नाम', 'पान नं.', 'प्रकार', 'कारोबार संख्या', ...columns.map((c: any) => `"${c.nameNepali || c.name}"`), 'कुल रकम (रू)'];
      const csvRows = [headers.join(',')];

      partyBreakdown.forEach((p: any, idx: number) => {
        const row = [
          idx + 1,
          `"${p.partyName?.replace(/"/g, '""') || ''}"`,
          `"${p.partyPan || ''}"`,
          `"${p.partyType || ''}"`,
          p.transactionCount,
          ...columns.map((col: any) => p.amountsByHead[col.id] ? Number(p.amountsByHead[col.id]).toFixed(2) : '0.00'),
          Number(p.totalAmount).toFixed(2),
        ];
        csvRows.push(row.join(','));
      });

      // Total row
      const totalRow = [
        '""',
        '"कुल जम्मा"',
        '""',
        '""',
        '""',
        ...columns.map((col: any) => Number(totals.headTotals[col.id] || 0).toFixed(2)),
        Number(totals.totalAmount).toFixed(2),
      ];
      csvRows.push(totalRow.join(','));

      const csvString = '\uFEFF' + csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${isIncome ? 'income' : 'expense'}_party_topic_breakdown_${todayBS()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Matrix Table CSV
    const headers = [
      'क्र.सं.',
      'मिति (BS)',
      'भौचर/बिल नं.',
      'पार्टी/विवरण',
      ...columns.map((c: any) => `"${c.nameNepali || c.name} (${c.code || ''})"`),
      'कुल जम्मा (रू)',
      'भुक्तानी माध्यम',
      'कैफियत',
    ];
    const csvRows = [headers.join(',')];

    rows.forEach((r: any) => {
      const row = [
        r.sn,
        `"${r.dateBs || ''}"`,
        `"${r.voucherNo || ''}"`,
        `"${r.partyName?.replace(/"/g, '""') || ''}"`,
        ...columns.map((col: any) => r.amountsByHead[col.id] ? Number(r.amountsByHead[col.id]).toFixed(2) : '0.00'),
        Number(r.amount).toFixed(2),
        `"${r.paymentMedium || ''}"`,
        `"${(r.remarks || '').replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(','));
    });

    // Grand total row
    const grandTotalRow = [
      '""',
      '"कुल जम्मा"',
      '""',
      '""',
      ...columns.map((col: any) => Number(totals.headTotals[col.id] || 0).toFixed(2)),
      Number(totals.totalAmount).toFixed(2),
      '""',
      '""',
    ];
    csvRows.push(grandTotalRow.join(','));

    // Bank row
    const bankRow = [
      '""',
      '"बैंक दाखिला/भुक्तानी"',
      '""',
      '""',
      ...columns.map(() => '""'),
      Number(totals.bankTotal).toFixed(2),
      '"BANK"',
      '""',
    ];
    csvRows.push(bankRow.join(','));

    // Cash row
    const cashRow = [
      '""',
      '"नगद दाखिला/भुक्तानी"',
      '""',
      '""',
      ...columns.map(() => '""'),
      Number(totals.cashTotal).toFixed(2),
      '"CASH"',
      '""',
    ];
    csvRows.push(cashRow.join(','));

    const csvString = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${isIncome ? 'income' : 'expense'}_matrix_ledger_${todayBS()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── OFFICIAL A4 LANDSCAPE PRINT GENERATOR ─────────────────────────────────
  const handlePrint = () => {
    const printWin = window.open('', '_blank', 'width=1200,height=800');
    if (!printWin) {
      alert('कृपया प्रिन्ट विन्डो खोल्न पप-अप अनुमति दिनुहोस् (Please allow popups for printing)');
      return;
    }

    const schoolName = schoolProfile?.nameNepali || schoolProfile?.name || 'नेपाल माध्यमिक विद्यालय';
    const schoolAddress = schoolProfile?.address || 'वृन्दावन न.पा.-२, विश्रामपुर, रौतहट';
    const emisCode = schoolProfile?.emisCode || '320160005';
    const titleText = isIncome ? 'निकासा तथा आम्दानी फाँटवारी प्रतिवेदन' : 'शीर्षकगत खर्च फाँटवारी प्रतिवेदन';

    const columnsHtml = columns.map((c: any) => `
      <th style="border: 1px solid #334155; padding: 6px 4px; text-align: right; font-size: 10px; background-color: #f1f5f9; min-width: 75px;">
        ${c.nameNepali || c.name}
        ${c.code ? `<div style="font-size: 8px; color: #64748b; font-weight: normal;">[${c.code}]</div>` : ''}
      </th>
    `).join('');

    const rowsHtml = rows.map((r: any, idx: number) => `
      <tr style="background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};">
        <td style="border: 1px solid #cbd5e1; padding: 5px 3px; text-align: center; font-size: 10px;">${r.sn}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 4px; font-size: 10px; white-space: nowrap;">${r.dateBs || '-'}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 4px; font-size: 10px; white-space: nowrap; font-weight: bold;">${r.voucherNo || r.billNo || '-'}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 4px; font-size: 10px;">${r.partyName || '-'}</td>
        ${columns.map((c: any) => {
          const val = r.amountsByHead[c.id];
          return `<td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: right; font-family: monospace; font-size: 10px;">${val ? Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>`;
        }).join('')}
        <td style="border: 1px solid #cbd5e1; padding: 5px 4px; text-align: right; font-family: monospace; font-size: 10px; font-weight: bold; background-color: #eff6ff;">
          ${Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 3px; text-align: center; font-size: 9px;">${r.paymentMedium || 'CASH'}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 4px; font-size: 9px; max-width: 140px;">${r.remarks || '-'}</td>
      </tr>
    `).join('');

    const totalsColsHtml = columns.map((c: any) => `
      <td style="border: 1px solid #334155; padding: 6px 4px; text-align: right; font-family: monospace; font-weight: 900; font-size: 10.5px;">
        ${Number(totals.headTotals[c.id] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
    `).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${titleText} — ${currentFyLabel}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 landscape;
              margin: 8mm 8mm 12mm 8mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0f172a;
              background-color: #fff;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header-box {
              text-align: center;
              border-bottom: 2px solid #1e3a5f;
              padding-bottom: 8px;
              margin-bottom: 10px;
            }
            .school-title {
              font-size: 20px;
              font-weight: 900;
              color: #1e3a5f;
              margin: 0 0 2px 0;
            }
            .school-sub {
              font-size: 12px;
              font-weight: bold;
              color: #475569;
              margin: 0 0 4px 0;
            }
            .doc-title-badge {
              display: inline-block;
              background: #f1f5f9;
              border: 1.5px solid #0f172a;
              padding: 3px 12px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 900;
              color: #0f172a;
              text-transform: uppercase;
              margin-top: 4px;
            }
            .meta-bar {
              display: flex;
              justify-content: space-between;
              font-size: 10.5px;
              font-weight: bold;
              margin-bottom: 8px;
              color: #334155;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            thead {
              display: table-header-group;
            }
            tfoot {
              display: table-footer-group;
            }
            .sig-section {
              margin-top: 30px;
              display: flex;
              justify-content: space-between;
              page-break-inside: avoid;
            }
            .sig-box {
              text-align: center;
              font-size: 11px;
              font-weight: bold;
              width: 180px;
            }
            .sig-line {
              border-top: 1px dashed #475569;
              margin-bottom: 5px;
              height: 1px;
            }
          </style>
        </head>
        <body>
          <div class="header-box">
            <h1 class="school-title">${schoolName}</h1>
            <p class="school-sub">${schoolAddress} | IEMIS: ${emisCode}</p>
            <div class="doc-title-badge">${titleText} (${currentFyLabel})</div>
          </div>

          <div class="meta-bar">
            <span><strong>आर्थिक वर्ष:</strong> ${currentFyLabel}</span>
            <span><strong>कुल भौचर संख्या:</strong> ${rows.length} वटा</span>
            <span><strong>सक्रिय शीर्षक:</strong> ${columns.length} वटा</span>
            <span><strong>प्रतिवेदन मिति:</strong> ${todayBS()} BS</span>
          </div>

          <table>
            <thead>
              <tr style="background-color: #f1f5f9; border: 1.5px solid #334155;">
                <th style="border: 1px solid #334155; padding: 6px 3px; font-size: 10px; width: 30px;">क्र.सं.</th>
                <th style="border: 1px solid #334155; padding: 6px 4px; font-size: 10px; white-space: nowrap;">मिति (BS)</th>
                <th style="border: 1px solid #334155; padding: 6px 4px; font-size: 10px; white-space: nowrap;">भौचर/बिल नं.</th>
                <th style="border: 1px solid #334155; padding: 6px 4px; font-size: 10px; min-width: 110px;">पार्टी / विवरण</th>
                ${columnsHtml}
                <th style="border: 1px solid #334155; padding: 6px 4px; font-size: 10px; text-align: right; background-color: #dbeafe; min-width: 85px;">
                  कुल रकम (रू)
                </th>
                <th style="border: 1px solid #334155; padding: 6px 3px; font-size: 9px; width: 45px;">माध्यम</th>
                <th style="border: 1px solid #334155; padding: 6px 4px; font-size: 9px; min-width: 90px;">कैफियत</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <!-- Grand Total -->
              <tr style="background-color: #fef3c7; border: 1.5px solid #334155; font-weight: bold;">
                <td colspan="4" style="border: 1px solid #334155; padding: 6px 4px; text-align: right; font-size: 11px; font-weight: 900;">
                  कुल जम्मा (Grand Total):
                </td>
                ${totalsColsHtml}
                <td style="border: 1px solid #334155; padding: 6px 4px; text-align: right; font-family: monospace; font-size: 11px; font-weight: 900; background-color: #bfdbfe;">
                  रू ${Number(totals.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td colspan="2" style="border: 1px solid #334155; text-align: center; font-size: 9px;">-</td>
              </tr>
              <!-- Bank -->
              <tr style="background-color: #f0fdf4; border: 1px solid #334155;">
                <td colspan="4" style="border: 1px solid #334155; padding: 5px 4px; text-align: right; font-size: 10px; font-weight: bold;">
                  ${isIncome ? 'बैंक दाखिला (Bank Inflow):' : 'बैंक भुक्तानी (Bank Payment):'}
                </td>
                <td colspan="${columns.length}" style="border: 1px solid #334155; padding: 5px 4px; text-align: center; font-size: 9px; color: #64748b; font-style: italic;">
                  चेक, बैंक ट्रान्सफर तथा अनलाइन मार्फत कारोबार भएको रकम
                </td>
                <td style="border: 1px solid #334155; padding: 5px 4px; text-align: right; font-family: monospace; font-size: 10px; font-weight: bold; background-color: #bbf7d0;">
                  रू ${Number(totals.bankTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td colspan="2" style="border: 1px solid #334155; text-align: center; font-size: 9px; font-weight: bold;">BANK</td>
              </tr>
              <!-- Cash -->
              <tr style="background-color: #fffbeb; border: 1px solid #334155;">
                <td colspan="4" style="border: 1px solid #334155; padding: 5px 4px; text-align: right; font-size: 10px; font-weight: bold;">
                  ${isIncome ? 'नगद दाखिला (Cash on Hand):' : 'नगद भुक्तानी (Cash Payment):'}
                </td>
                <td colspan="${columns.length}" style="border: 1px solid #334155; padding: 5px 4px; text-align: center; font-size: 9px; color: #64748b; font-style: italic;">
                  विद्यालय सेफ/ढुकुटीमा सिधै नगदी प्रवाह भएको रकम
                </td>
                <td style="border: 1px solid #334155; padding: 5px 4px; text-align: right; font-family: monospace; font-size: 10px; font-weight: bold; background-color: #fde68a;">
                  रू ${Number(totals.cashTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td colspan="2" style="border: 1px solid #334155; text-align: center; font-size: 9px; font-weight: bold;">CASH</td>
              </tr>
            </tfoot>
          </table>

          <div class="sig-section">
            <div class="sig-box">
              <div style="height: 35px;"></div>
              <div class="sig-line"></div>
              <div>तयार गर्ने (लेखापाल)</div>
              <div style="font-size: 9px; font-weight: normal; color: #64748b;">Accountant</div>
            </div>

            <div class="sig-box">
              <div style="height: 35px;"></div>
              <div class="sig-line"></div>
              <div>प्रमाणित गर्ने (प्रधानाध्यापक)</div>
              <div style="font-size: 9px; font-weight: normal; color: #64748b;">Headmaster / Principal</div>
            </div>

            <div class="sig-box">
              <div style="height: 35px;"></div>
              <div class="sig-line"></div>
              <div>अनुमोदन गर्ने (वि.व्य.स. अध्यक्ष)</div>
              <div style="font-size: 9px; font-weight: normal; color: #64748b;">SMC Chairperson</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="space-y-6">
      {/* ── TOP CONTROL PANEL & FILTERS (Hidden during print) ── */}
      <div className="no-print bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-4">
        {/* Row 1: Header & Type Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
                isIncome ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {isIncome ? 'आम्दानी तथा निकासा फाँटवारी' : 'खर्च तथा भुक्तानी फाँटवारी'}
              </span>
              <span className="text-xs text-slate-500 font-medium">{currentFyLabel}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mt-1">
              {isIncome
                ? 'निकासा तथा निजी स्रोतको आम्दानी फाँटवारी प्रतिवेदन'
                : 'शीर्षकगत तथा समूहगत खर्च फाँटवारी प्रतिवेदन'}
            </h2>
            <p className="text-xs text-slate-500">
              नेपाल सरकार विद्यालय लेखा ढाँचा अनुसार आर्थिक वर्ष, समूह, पार्टी र शीर्षकगत बहु-स्तम्भ लेजर
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!hideTypeSwitcher && allowedTypes.length > 1 && (
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setReportType('INCOME')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    isIncome
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  आम्दानी फाँटवारी
                </button>
                <button
                  type="button"
                  onClick={() => setReportType('EXPENSE')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    !isIncome
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  खर्च फाँटवारी
                </button>
              </div>
            )}

            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              title="ताजा गर्नुहोस्"
              className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Excel / CSV डाउनलोड
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              प्रिन्ट (A4 Landscape)
            </button>
          </div>
        </div>

        {/* Row 2: Comprehensive Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Fiscal Year Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              आर्थिक वर्ष (Fiscal Year)
            </label>
            <select
              value={selectedFyId}
              onChange={(e) => setSelectedFyId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ACTIVE">चालु आ.व. ({activeFy?.year || activeFy?.name || '२०८३/८४'})</option>
              <option value="ALL">सबै आर्थिक वर्षहरू (All Fiscal Years)</option>
              {financialYears.map((fy: any) => (
                <option key={fy.id} value={String(fy.id)}>
                  आ.व. {fy.year || fy.name || fy.code} {fy.isActive ? ' (चालु / Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              समूह / स्रोत वर्गीकरण (Category)
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                setSelectedHeadId('ALL');
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">सबै समूहहरू (All Categories)</option>
              {availableCategories.map((cat: any) => (
                <option key={cat.id} value={String(cat.id)}>
                  {cat.nameNepali || cat.name} ({cat.headsCount || 0} शीर्षक)
                </option>
              ))}
            </select>
          </div>

          {/* Party Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              पाउने/दिने पक्ष (Party / Vendor)
            </label>
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">सबै पार्टीहरू (All Parties)</option>
              {availableParties.map((p: any) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name} {p.panNumber ? `[${p.panNumber}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Head / Topic Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              शीर्षक (Topic / Head)
            </label>
            <select
              value={selectedHeadId}
              onChange={(e) => setSelectedHeadId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">सबै शीर्षकहरू (All Heads)</option>
              {columns.map((h: any) => (
                <option key={h.id} value={String(h.id)}>
                  {h.nameNepali || h.name} {h.code ? `(${h.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* From Date BS */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              मिति देखि (From BS)
            </label>
            <input
              type="text"
              placeholder="2081-04-01"
              value={fromDateBs}
              onChange={(e) => setFromDateBs(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* To Date BS */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              मिति सम्म (To BS)
            </label>
            <input
              type="text"
              placeholder="2082-03-31"
              value={toDateBs}
              onChange={(e) => setToDateBs(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Row 3: Search & View Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="भौचर नं., पार्टीको नाम, कैफियत वा शीर्षक खोज्नुहोस्..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Toggle: Only heads with entries vs All heads */}
            <button
              type="button"
              onClick={() => setShowAllHeads(!showAllHeads)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                !showAllHeads
                  ? 'bg-blue-50 text-blue-800 border-blue-200 font-bold shadow-2xs'
                  : 'bg-slate-100 text-slate-600 border-slate-300'
              }`}
              title="शून्य कारोबार भएका शीर्षकहरू तालिकाबाट लुकाउनुहोस् वा देखाउनुहोस्"
            >
              <CheckCircle className={`w-3.5 h-3.5 ${!showAllHeads ? 'text-blue-600' : 'text-slate-400'}`} />
              {!showAllHeads
                ? `सक्रिय शीर्षक मात्र (${columns.length} वटा)`
                : `सबै शीर्षकहरू (${reportData?.allColumnsCount || columns.length} वटा)`}
            </button>
          </div>

          {/* View Mode Buttons */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 self-stretch sm:self-auto justify-center">
            <button
              type="button"
              onClick={() => setViewMode('MATRIX')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'MATRIX'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              फाँटवारी तालिका (Matrix Ledger)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('PARTY_BREAKDOWN')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'PARTY_BREAKDOWN'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              पार्टीगत तथा शीर्षकगत संक्षेप (Party Breakdown)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('CATEGORY_SUMMARY')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'CATEGORY_SUMMARY'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              समूहगत सारांश (Category Summary)
            </button>
          </div>
        </div>
      </div>

      {/* ── SUMMARY STATS BAR (Screen only) ── */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">कुल जम्मा रकम</span>
            <div className={`p-1.5 rounded-lg ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900">
            रू {totals.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            कुल {rows.length} वटा भौचर / प्रविष्टिहरू
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">{isIncome ? 'बैंक दाखिला रकम' : 'बैंक भुक्तानी रकम'}</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-blue-700">
            रू {totals.bankTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            चेक, अनलाइन तथा बैंक ट्रान्सफर
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">{isIncome ? 'नगद दाखिला रकम' : 'नगद भुक्तानी रकम'}</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-amber-700">
            रू {totals.cashTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            विद्यालय सेफ / नगदी प्रवाह
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">कुल सक्रिय शीर्षकहरू</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-indigo-700">
            {columns.length} स्तम्भ
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            सम्बन्धित पार्टी/स्रोत: {partyBreakdown.length}
          </div>
        </div>
      </div>

      {/* ── PRINT-ONLY OFFICIAL GOVERNMENT HEADER ── */}
      <div className="hidden print:block text-center mb-6 pb-4 border-b-2 border-slate-800">
        <h1 className="text-lg font-bold uppercase tracking-wider text-slate-900">
          श्री नेपाल माध्यमिक विद्यालय
        </h1>
        <p className="text-xs font-medium text-slate-700">
          विश्रामपुर, बृन्दावन नगरपालिका-२, रौतहट, मधेश प्रदेश
        </p>
        <h2 className="text-sm font-bold text-slate-900 mt-2 underline">
          {currentFyLabel} मा {isIncome ? 'निकासा तथा निजी स्रोतको आम्दानी' : 'शीर्षकगत तथा समूहगत खर्च'} फाँटवारी विवरण (रू.)
        </h2>
        <div className="flex justify-between text-[10px] text-slate-600 mt-2 px-2">
          <span>विवरण अवधि: {fromDateBs ? `मिति ${fromDateBs}` : 'वर्ष सुरु'} देखि {toDateBs ? `मिति ${toDateBs}` : 'वर्ष अन्त्य'}</span>
          <span>प्रिन्ट मिति: {todayBS()}</span>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-xs">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">फाँटवारी प्रतिवेदन तयार हुँदैछ...</p>
          <p className="text-xs text-slate-400 mt-1">कृपया केही क्षण प्रतीक्षा गर्नुहोस्</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-xs">
          <Info className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">कुनै कारोबार फेला परेन</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            छानिएको आर्थिक वर्ष, समूह वा पार्टीका लागि कुनै {isIncome ? 'आम्दानी' : 'खर्च'} प्रविष्टि भेटिएन। कृपया फिल्टर परिवर्तन गरी पुन: प्रयास गर्नुहोस्।
          </p>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════════
              VIEW 1: MULTI-COLUMN MATRIX LEDGER TABLE (NEPAL GOVT FORMAT)
             ══════════════════════════════════════════════════════════════════ */}
          {viewMode === 'MATRIX' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto max-h-[750px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px] font-sans">
                  {/* Sticky Header */}
                  <thead className="bg-slate-100/90 backdrop-blur-xs text-slate-700 sticky top-0 z-20 shadow-xs">
                    <tr className="border-b border-slate-300">
                      <th className="p-2.5 font-bold text-center border-r border-slate-300 w-10">क्र.सं.</th>
                      <th className="p-2.5 font-bold border-r border-slate-300 whitespace-nowrap min-w-[85px]">मिति (BS)</th>
                      <th className="p-2.5 font-bold border-r border-slate-300 whitespace-nowrap min-w-[95px]">भौचर/बिल नं.</th>
                      <th className="p-2.5 font-bold border-r border-slate-300 whitespace-nowrap min-w-[140px]">
                        {isIncome ? 'पार्टी / स्रोत (Source)' : 'पाउने पक्ष / पार्टी (Paid To)'}
                      </th>

                      {/* Dynamic Columns for each Head */}
                      {columns.map((col: any) => (
                        <th
                          key={col.id}
                          className="p-2.5 font-bold text-right border-r border-slate-300 whitespace-nowrap min-w-[110px] bg-slate-50/60"
                        >
                          <div>{col.nameNepali || col.name}</div>
                          {col.code && <div className="text-[9px] text-slate-400 font-normal">[{col.code}]</div>}
                        </th>
                      ))}

                      <th className="p-2.5 font-bold text-right border-r border-slate-300 whitespace-nowrap min-w-[110px] bg-blue-50/80 text-blue-900">
                        कुल जम्मा (रू)
                      </th>
                      <th className="p-2.5 font-bold text-center border-r border-slate-300 whitespace-nowrap min-w-[90px]">
                        माध्यम
                      </th>
                      <th className="p-2.5 font-bold whitespace-nowrap min-w-[130px]">
                        कैफियत
                      </th>
                    </tr>
                  </thead>

                  {/* Body Rows */}
                  <tbody className="divide-y divide-slate-200">
                    {rows.map((row: any, rIdx: number) => (
                      <tr
                        key={row.id || rIdx}
                        className="hover:bg-blue-50/40 transition-colors even:bg-slate-50/30"
                      >
                        <td className="p-2 text-center border-r border-slate-200 text-slate-400 font-mono">
                          {row.sn}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-medium whitespace-nowrap text-slate-800">
                          {row.dateBs}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono text-slate-600 whitespace-nowrap">
                          {row.voucherNo}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-medium text-slate-800">
                          <div>{row.partyName}</div>
                          {row.partyPan && (
                            <span className="text-[9px] text-slate-400">PAN: {row.partyPan}</span>
                          )}
                        </td>

                        {/* Amount cells per head */}
                        {columns.map((col: any) => {
                          const val = row.amountsByHead[col.id];
                          return (
                            <td
                              key={col.id}
                              className={`p-2 text-right border-r border-slate-200 font-mono whitespace-nowrap ${
                                val ? 'font-semibold text-slate-900 bg-emerald-50/20' : 'text-slate-300'
                              }`}
                            >
                              {val ? val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                            </td>
                          );
                        })}

                        {/* Row Total */}
                        <td className="p-2 text-right border-r border-slate-200 font-bold font-mono text-slate-900 bg-blue-50/30 whitespace-nowrap">
                          रू {row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Payment Medium */}
                        <td className="p-2 text-center border-r border-slate-200 whitespace-nowrap">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              row.paymentMedium === 'CASH'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {row.paymentMedium === 'CASH' ? 'नगद (Cash)' : 'बैंक (Bank)'}
                          </span>
                        </td>

                        {/* Remarks */}
                        <td className="p-2 text-slate-500 truncate max-w-[180px]" title={row.remarks}>
                          {row.remarks || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Summary Footer Rows (Nepal Government Standard) */}
                  <tfoot className="border-t-2 border-slate-400 bg-slate-100 font-bold text-slate-900 sticky bottom-0 z-10 shadow-md">
                    {/* Grand Total Row */}
                    <tr className="bg-amber-50/90 border-b border-slate-300">
                      <td colSpan={4} className="p-2.5 text-right font-black border-r border-slate-300 tracking-wider">
                        कुल जम्मा (Grand Total):
                      </td>
                      {columns.map((col: any) => {
                        const hTot = totals.headTotals[col.id] || 0;
                        return (
                          <td
                            key={col.id}
                            className="p-2.5 text-right font-mono font-black border-r border-slate-300 whitespace-nowrap text-slate-900"
                          >
                            रू {hTot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        );
                      })}
                      <td className="p-2.5 text-right font-mono font-black border-r border-slate-300 whitespace-nowrap text-blue-900 bg-blue-100">
                        रू {totals.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td colSpan={2} className="p-2.5 text-center text-xs text-slate-500">
                        -
                      </td>
                    </tr>

                    {/* Bank Settlement Row */}
                    <tr className="bg-blue-50/70 border-b border-slate-300 text-blue-900">
                      <td colSpan={4} className="p-2 text-right font-bold border-r border-slate-300">
                        {isIncome ? 'बैंक दाखिला (Bank Deposit):' : 'बैंक भुक्तानी (Bank Payment):'}
                      </td>
                      <td colSpan={columns.length} className="p-2 text-center text-slate-400 border-r border-slate-300 italic text-[10px]">
                        चेक, बैंक ट्रान्सफर तथा अनलाइन मार्फत दाखिला/भुक्तानी भएको रकम
                      </td>
                      <td className="p-2 text-right font-mono font-bold border-r border-slate-300 whitespace-nowrap text-blue-900 bg-blue-100/70">
                        रू {totals.bankTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td colSpan={2} className="p-2 text-center text-[10px] text-blue-700">
                        बैंक खाता मार्फत
                      </td>
                    </tr>

                    {/* Cash Settlement Row */}
                    <tr className="bg-amber-50/50 text-amber-950">
                      <td colSpan={4} className="p-2 text-right font-bold border-r border-slate-300">
                        {isIncome ? 'नगद आम्दानी (Cash in Hand):' : 'नगद भुक्तानी (Cash Payment):'}
                      </td>
                      <td colSpan={columns.length} className="p-2 text-center text-slate-400 border-r border-slate-300 italic text-[10px]">
                        विद्यालय ढुकुटी/सेफमा नगद प्राप्त वा भुक्तानी भएको रकम
                      </td>
                      <td className="p-2 text-right font-mono font-bold border-r border-slate-300 whitespace-nowrap text-amber-900 bg-amber-100/70">
                        रू {totals.cashTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td colSpan={2} className="p-2 text-center text-[10px] text-amber-700">
                        नगदी प्रवाह
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VIEW 2: PARTY-WISE TOPIC-WISE BREAKDOWN TABLE
             ══════════════════════════════════════════════════════════════════ */}
          {viewMode === 'PARTY_BREAKDOWN' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {isIncome ? 'पार्टी/स्रोत अनुसार शीर्षकगत आम्दानी संक्षेप' : 'पाउने पक्ष (Party/Vendor) अनुसार शीर्षकगत खर्च संक्षेप'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    प्रत्येक पार्टी वा आपूर्तिकर्तासँग कुन शीर्षकमा कति कारोबार भयो हेर्नुहोस्
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                  कुल {partyBreakdown.length} पक्षहरू
                </span>
              </div>

              <div className="overflow-x-auto max-h-[750px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px] font-sans">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 z-20">
                    <tr className="border-b border-slate-300">
                      <th className="p-2.5 font-bold text-center border-r border-slate-300 w-10">क्र.सं.</th>
                      <th className="p-2.5 font-bold border-r border-slate-300 whitespace-nowrap min-w-[160px]">
                        पार्टी / संस्थाको नाम
                      </th>
                      <th className="p-2.5 font-bold border-r border-slate-300 whitespace-nowrap min-w-[90px]">
                        पान / भ्याट नं.
                      </th>
                      <th className="p-2.5 font-bold border-r border-slate-300 whitespace-nowrap min-w-[80px]">
                        प्रकार
                      </th>
                      <th className="p-2.5 font-bold text-center border-r border-slate-300 whitespace-nowrap min-w-[70px]">
                        कारोबार
                      </th>

                      {/* Head Columns */}
                      {columns.map((col: any) => (
                        <th
                          key={col.id}
                          className="p-2.5 font-bold text-right border-r border-slate-300 whitespace-nowrap min-w-[110px] bg-slate-50"
                        >
                          <div>{col.nameNepali || col.name}</div>
                          {col.code && <div className="text-[9px] text-slate-400 font-normal">[{col.code}]</div>}
                        </th>
                      ))}

                      <th className="p-2.5 font-bold text-right whitespace-nowrap min-w-[110px] bg-blue-50 text-blue-900">
                        कुल जम्मा (रू)
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {partyBreakdown.map((p: any, pIdx: number) => (
                      <tr
                        key={p.partyKey || pIdx}
                        className="hover:bg-blue-50/40 transition-colors even:bg-slate-50/30"
                      >
                        <td className="p-2 text-center border-r border-slate-200 text-slate-400 font-mono">
                          {pIdx + 1}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-semibold text-slate-900 whitespace-nowrap">
                          {p.partyName}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono text-slate-600 whitespace-nowrap">
                          {p.partyPan || '-'}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-slate-500 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 font-medium">
                            {p.partyType || '-'}
                          </span>
                        </td>
                        <td className="p-2 text-center border-r border-slate-200 font-mono text-slate-700">
                          {p.transactionCount} पटक
                        </td>

                        {/* Head Columns for Party */}
                        {columns.map((col: any) => {
                          const val = p.amountsByHead[col.id];
                          return (
                            <td
                              key={col.id}
                              className={`p-2 text-right border-r border-slate-200 font-mono whitespace-nowrap ${
                                val ? 'font-semibold text-slate-900 bg-emerald-50/20' : 'text-slate-300'
                              }`}
                            >
                              {val ? val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                            </td>
                          );
                        })}

                        {/* Total per Party */}
                        <td className="p-2 text-right font-mono font-bold text-slate-900 bg-blue-50/40 whitespace-nowrap">
                          रू {p.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Summary Row */}
                  <tfoot className="border-t-2 border-slate-400 bg-amber-50/90 font-bold text-slate-900 sticky bottom-0 z-10 shadow-md">
                    <tr>
                      <td colSpan={5} className="p-2.5 text-right font-black border-r border-slate-300 tracking-wider">
                        कुल जम्मा (Grand Total):
                      </td>
                      {columns.map((col: any) => {
                        const hTot = totals.headTotals[col.id] || 0;
                        return (
                          <td
                            key={col.id}
                            className="p-2.5 text-right font-mono font-black border-r border-slate-300 whitespace-nowrap text-slate-900"
                          >
                            रू {hTot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        );
                      })}
                      <td className="p-2.5 text-right font-mono font-black whitespace-nowrap text-blue-900 bg-blue-100">
                        रू {totals.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VIEW 3: CATEGORY & HEAD SUMMARY CARDS
             ══════════════════════════════════════════════════════════════════ */}
          {viewMode === 'CATEGORY_SUMMARY' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {availableCategories.map((cat: any) => {
                const catTotal = totals.categoryTotals[cat.id] || 0;
                const catPercentage = totals.totalAmount > 0 ? ((catTotal / totals.totalAmount) * 100).toFixed(1) : '0';
                const headsInCat = columns.filter((c: any) => c.categoryId === cat.id);

                return (
                  <div
                    key={cat.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          समूह #{cat.id}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          {catPercentage}%
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 mt-2">
                        {cat.nameNepali || cat.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {cat.name} • कुल {headsInCat.length} शीर्षकहरू
                      </p>

                      <div className="my-4 py-3 px-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[11px] text-slate-500 font-medium">समूहगत कुल रकम</div>
                        <div className="text-xl font-black text-slate-900 mt-0.5 font-mono">
                          रू {catTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>

                      {/* Head wise Breakdown inside Category */}
                      <div className="space-y-1.5 mt-3 max-h-48 overflow-y-auto pr-1">
                        {headsInCat.map((h: any) => {
                          const hAmt = totals.headTotals[h.id] || 0;
                          return (
                            <div
                              key={h.id}
                              className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0"
                            >
                              <span className="text-slate-700 truncate pr-2" title={h.nameNepali || h.name}>
                                {h.nameNepali || h.name}
                              </span>
                              <span className="font-mono font-semibold text-slate-900 whitespace-nowrap">
                                रू {hAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── PRINT-ONLY OFFICIAL SIGNATURES & STAMPS FOOTER ── */}
      <div className="hidden print:block mt-16 pt-8 border-t border-slate-400">
        <div className="grid grid-cols-4 text-center text-xs text-slate-800 font-semibold gap-4">
          <div>
            <div className="h-12"></div>
            <div className="border-t border-slate-600 pt-1">
              फाँटवारी तयार गर्ने<br />
              <span className="text-[10px] font-normal text-slate-500">(सहायक / कर्मचारी)</span>
            </div>
          </div>
          <div>
            <div className="h-12"></div>
            <div className="border-t border-slate-600 pt-1">
              जाँच गर्ने / लेखापाल<br />
              <span className="text-[10px] font-normal text-slate-500">(लेखा प्रमुख)</span>
            </div>
          </div>
          <div>
            <div className="h-12"></div>
            <div className="border-t border-slate-600 pt-1">
              प्रधानाध्यापक<br />
              <span className="text-[10px] font-normal text-slate-500">(प्रमाणित गर्ने अधिकारी)</span>
            </div>
          </div>
          <div>
            <div className="h-12"></div>
            <div className="border-t border-slate-600 pt-1">
              विद्यालयको छाप<br />
              <span className="text-[10px] font-normal text-slate-500">मिति: {todayBS()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
