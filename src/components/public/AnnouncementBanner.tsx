'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { X, Sparkles } from 'lucide-react';
import type { Locale } from '@/lib/i18n/config';

interface AnnouncementBannerProps {
  locale: Locale;
  badgeText?: string;
  messageEn?: string;
  messageVi?: string;
  linkUrl?: string;
}

export function AnnouncementBanner({
  locale,
  badgeText = 'PROMO',
  messageEn = 'Spring Promotion: 10% off SNS Full Sets this month!',
  messageVi = 'Ưu đãi mùa xuân: Giảm 10% cho trọn bộ móng nhúng SNS tháng này!',
  linkUrl = '/services',
}: AnnouncementBannerProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  const message = locale === 'vi' ? messageVi : messageEn;

  return (
    <div className="announcement-bar relative z-40 bg-gradient-to-r from-salon-800 via-salon-900 to-salon-800 text-white px-4 py-2 text-xs md:text-sm font-medium shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex-1 flex items-center justify-center gap-2 text-center flex-wrap">
          <span className="badge inline-flex items-center gap-1 rounded-full bg-champagne-400/20 text-champagne-200 border border-champagne-300/40 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
            <Sparkles className="w-3 h-3 text-champagne-300" />
            {badgeText}
          </span>
          <span className="text-gray-100 font-sans">{message}</span>
          {linkUrl && (
            <Link
              href={`/${locale}${linkUrl}`}
              className="text-champagne-300 hover:text-champagne-100 underline underline-offset-2 ml-1 font-semibold"
            >
              {locale === 'vi' ? 'Xem ngay →' : 'Explore →'}
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label={locale === 'vi' ? 'Đóng thông báo' : 'Dismiss announcement'}
          className="text-gray-300 hover:text-white p-1 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
