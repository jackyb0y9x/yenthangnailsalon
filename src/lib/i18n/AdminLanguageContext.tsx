'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminDict, type AdminLocale } from './admin-dict';
import { Globe } from 'lucide-react';

interface AdminLanguageContextType {
  locale: AdminLocale;
  setLocale: (loc: AdminLocale) => void;
  toggleLocale: () => void;
  t: (typeof adminDict)['en'];
}

const AdminLanguageContext = createContext<AdminLanguageContextType>({
  locale: 'vi',
  setLocale: () => {},
  toggleLocale: () => {},
  t: adminDict.vi,
});

export function AdminLanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AdminLocale>('vi');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_locale') as AdminLocale;
      if (saved === 'en' || saved === 'vi') {
        setLocaleState(saved);
      }
    } catch {}
  }, []);

  const setLocale = (newLocale: AdminLocale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem('admin_locale', newLocale);
    } catch {}
  };

  const toggleLocale = () => {
    setLocale(locale === 'vi' ? 'en' : 'vi');
  };

  const t = adminDict[locale];

  return (
    <AdminLanguageContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
      {children}
    </AdminLanguageContext.Provider>
  );
}

export function useAdminLanguage() {
  return useContext(AdminLanguageContext);
}

export function AdminLanguageToggle() {
  const { locale, toggleLocale } = useAdminLanguage();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-xs transition-all cursor-pointer"
      title={locale === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
    >
      <Globe className="w-3.5 h-3.5 text-champagne-400" />
      <span>{locale === 'vi' ? '🇻🇳 Tiếng Việt' : '🇬🇧 English'}</span>
    </button>
  );
}
