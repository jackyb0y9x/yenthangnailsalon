import React from 'react';
import type { Locale } from '@/lib/i18n/config';

interface OpeningStatusBadgeProps {
  locale?: Locale;
  isHoliday?: boolean;
  className?: string;
}

export function OpeningStatusBadge({
  locale = 'en',
  isHoliday = false,
  className = '',
}: OpeningStatusBadgeProps) {
  const isEn = locale === 'en';
  const statusText = isHoliday
    ? isEn
      ? 'Closed for Holiday'
      : 'Nghỉ Lễ Đóng Cửa'
    : isEn
    ? 'Open Now — Closes at 8:00 PM'
    : 'Đang Mở Cửa — Đóng lúc 8:00 PM';

  return (
    <span
      className={`status-badge inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-all ${
        isHoliday
          ? 'closed bg-amber-50 text-amber-800 border border-amber-200'
          : 'open bg-emerald-50 text-emerald-800 border border-emerald-200'
      } ${className}`}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isHoliday ? 'bg-amber-400' : 'bg-emerald-400'
          }`}
        />
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            isHoliday ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
        />
      </span>
      <span>{statusText}</span>
    </span>
  );
}
