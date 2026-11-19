'use client';

import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { useAdminLanguage, AdminLanguageToggle } from '@/lib/i18n/AdminLanguageContext';
import { ChangePasswordModal } from '@/components/admin/ChangePasswordModal';

interface AdminHeaderProps {
  userEmail?: string;
  role?: string;
}

export function AdminHeader({ userEmail = '', role = '' }: AdminHeaderProps) {
  const { t, locale } = useAdminLanguage();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-4 flex items-center justify-between gap-3 sticky top-0 z-20">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-serif font-bold text-white tracking-tight truncate">
            {t.portalTitle}
          </h2>
          <p className="text-xs text-slate-400 truncate">
            {t.portalSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsPasswordModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-champagne-300 hover:text-champagne-200 border border-slate-700 text-xs font-medium transition-colors"
            title={locale === 'vi' ? 'Đổi mật khẩu tài khoản hiện tại' : 'Change current account password'}
          >
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">
              {locale === 'vi' ? 'Đổi Mật Khẩu' : 'Change Password'}
            </span>
          </button>
          <AdminLanguageToggle />
          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-emerald-950/60 text-emerald-400 border border-emerald-800 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t.liveConnected}
          </span>
        </div>
      </header>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        userEmail={userEmail}
        role={role}
      />
    </>
  );
}
