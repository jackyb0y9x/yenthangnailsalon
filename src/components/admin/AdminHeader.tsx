'use client';

import React from 'react';
import { useAdminLanguage, AdminLanguageToggle } from '@/lib/i18n/AdminLanguageContext';

export function AdminHeader() {
  const { t } = useAdminLanguage();

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-lg font-serif font-bold text-white tracking-tight">
          {t.portalTitle}
        </h2>
        <p className="text-xs text-slate-400">
          {t.portalSubtitle}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <AdminLanguageToggle />
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-emerald-950/60 text-emerald-400 border border-emerald-800 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {t.liveConnected}
        </span>
      </div>
    </header>
  );
}
