'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type LanguageMode = 'ne' | 'en' | 'both';

interface LanguageContextType {
  lang: LanguageMode;
  setLang: (lang: LanguageMode) => void;
  /**
   * Helper function: returns nepali, english, or combined string based on current language mode.
   * @param npText Nepali version (e.g. "भुक्तानी बाँकी हिसाब")
   * @param enText English version (e.g. "Accounts Payable")
   * @param bothText Optional custom combined string. If omitted, defaults to `${enText} (${npText})`
   */
  l: (npText: string, enText: string, bothText?: string) => string;
  /**
   * Dictionary translator with fallback
   */
  t: (key: string, defaultNp?: string, defaultEn?: string) => string;
}

const translations: Record<string, { ne: string; en: string; both?: string }> = {
  // Navigation & Page Titles
  'nav.dashboard': { ne: 'ड्यासबोर्ड', en: 'Dashboard' },
  'nav.students': { ne: 'विद्यार्थीहरू', en: 'Students' },
  'nav.teachers': { ne: 'शिक्षक तथा कर्मचारी', en: 'Teachers & Staff' },
  'nav.classes': { ne: 'कक्षा तथा रुटिन', en: 'Classes & Routine' },
  'nav.attendance': { ne: 'दैनिक हाजिरी', en: 'Daily Attendance' },
  'nav.exams': { ne: 'परीक्षा तथा लब्धाङ्क', en: 'Exams & Marks' },
  'nav.seat_planning': { ne: 'परीक्षा सिट योजना', en: 'Seat Planning' },
  'nav.certificates': { ne: 'प्रमाणपत्र व्यवस्थापन', en: 'Certificates (CC/TC)' },
  'nav.finance': { ne: 'आर्थिक व्यवस्थापन', en: 'Financial Management' },
  'nav.income': { ne: 'आम्दानी तथा बजेट', en: 'Income & Grants' },
  'nav.expenses': { ne: 'खर्च प्रविष्टि', en: 'Expenses Entry' },
  'nav.payables': { ne: 'भुक्तानी गर्न बाँकी हिसाब', en: 'Accounts Payable' },
  'nav.fees': { ne: 'शुल्क संकलन', en: 'Fee Collection' },
  'nav.payroll': { ne: 'शिक्षक कर्मचारी तलब', en: 'Staff Payroll' },
  'nav.budget': { ne: 'बजेट विनियोजन', en: 'Budget & Variance' },
  'nav.journal': { ne: 'गोश्वारा भौचर', en: 'Journal Vouchers' },
  'nav.reports': { ne: 'वित्तीय प्रतिवेदन', en: 'Financial Reports' },
  'nav.heads': { ne: 'शीर्षक व्यवस्थापन', en: 'Account Masters & Heads' },
  'nav.inventory': { ne: 'जिन्सी व्यवस्थापन', en: 'Inventory (Jinsi)' },
  'nav.library': { ne: 'पुस्तकालय व्यवस्थापन', en: 'Library Desk' },
  'nav.notices': { ne: 'सूचना तथा सन्देश', en: 'Notices & SMS' },
  'nav.school': { ne: 'विद्यालय विवरण र सेटिङ', en: 'School Profile & Settings' },
  'nav.logout': { ne: 'लगआउट', en: 'Logout' },

  // Common UI Actions
  'action.add': { ne: 'थप्नुहोस्', en: 'Add' },
  'action.save': { ne: 'सुरक्षित गर्नुहोस्', en: 'Save' },
  'action.cancel': { ne: 'रद्द गर्नुहोस्', en: 'Cancel' },
  'action.delete': { ne: 'हटाउनुहोस्', en: 'Delete' },
  'action.edit': { ne: 'सम्पादन गर्नुहोस्', en: 'Edit' },
  'action.print': { ne: 'प्रिन्ट गर्नुहोस्', en: 'Print' },
  'action.search': { ne: 'खोज्नुहोस्...', en: 'Search...' },
  'action.filter': { ne: 'फिल्टर', en: 'Filter' },
  'action.export': { ne: 'निर्यात (Export)', en: 'Export' },
  'action.clear': { ne: 'सफा गर्नुहोस्', en: 'Clear' },
  'action.select_all': { ne: 'सबै छनोट', en: 'Select All' },

  // Financial & Common Table Headers
  'label.date': { ne: 'मिति (BS)', en: 'Date (BS)' },
  'label.voucher_no': { ne: 'भौचर नं.', en: 'Voucher No' },
  'label.bill_no': { ne: 'बिल नं.', en: 'Bill No' },
  'label.party': { ne: 'पाउने व्यक्ति/संस्था (पार्टी)', en: 'Recipient / Vendor' },
  'label.topic': { ne: 'खर्च शीर्षक', en: 'Expense Topic' },
  'label.amount': { ne: 'रकम (रू)', en: 'Amount (Rs)' },
  'label.status': { ne: 'स्थिति', en: 'Status' },
  'label.actions': { ne: 'कार्यहरू', en: 'Actions' },
  'label.fiscal_year': { ne: 'आर्थिक वर्ष', en: 'Fiscal Year' },
  'label.academic_year': { ne: 'शैक्षिक सत्र', en: 'Academic Year' },
  'label.total': { ne: 'कुल जम्मा', en: 'Total' },
  'label.balance_due': { ne: 'तिर्न बाँकी बक्यौता', en: 'Balance Due' },
  'label.paid_amount': { ne: 'भुक्तान रकम', en: 'Paid Amount' },
  'label.opening_due': { ne: 'सुरु बाँकी दायित्व', en: 'Opening Due' },
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'both',
  setLang: () => {},
  l: (np, en, both) => both || `${en} (${np})`,
  t: (key, np, en) => en || key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageMode>('both');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('nepal_school_lang') as LanguageMode | null;
      if (saved && (saved === 'ne' || saved === 'en' || saved === 'both')) {
        setLangState(saved);
      }
    } catch {
      // ignore localstorage errors
    }
  }, []);

  const setLang = (newLang: LanguageMode) => {
    setLangState(newLang);
    try {
      localStorage.setItem('nepal_school_lang', newLang);
    } catch {
      // ignore
    }
  };

  const l = (npText: string, enText: string, bothText?: string): string => {
    if (lang === 'ne') return npText;
    if (lang === 'en') return enText;
    return bothText || `${enText} (${npText})`;
  };

  const t = (key: string, defaultNp?: string, defaultEn?: string): string => {
    const entry = translations[key];
    if (entry) {
      if (lang === 'ne') return entry.ne;
      if (lang === 'en') return entry.en;
      return entry.both || `${entry.en} (${entry.ne})`;
    }
    if (lang === 'ne') return defaultNp || key;
    if (lang === 'en') return defaultEn || defaultNp || key;
    return defaultEn && defaultNp ? `${defaultEn} (${defaultNp})` : (defaultNp || defaultEn || key);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, l, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
