'use client';

import React, { useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LOCALES, LOCALE_CONFIGS, type Locale } from '@/lib/i18n/config';

export function getLocalizedPath(
  currentPathname: string,
  targetLocale: Locale,
  searchParamsString?: string
): string {
  if (!currentPathname) return `/${targetLocale}`;
  const segments = currentPathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return `/${targetLocale}`;
  }

  if (LOCALES.includes(segments[0] as Locale)) {
    segments[0] = targetLocale;
  } else {
    segments.unshift(targetLocale);
  }

  const newPath = `/${segments.join('/')}`;
  return searchParamsString ? `${newPath}?${searchParamsString}` : newPath;
}

interface LanguageSwitcherProps {
  currentLocale: Locale;
  className?: string;
}

export function LanguageSwitcher({ currentLocale, className = '' }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const [isPending, startTransition] = useTransition();

  const handleSwitch = (newLocale: Locale) => {
    if (newLocale === currentLocale) return;

    // Set cookie for persistence
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    const searchStr = typeof window !== 'undefined' ? window.location.search.replace(/^\?/, '') : '';
    const targetUrl = getLocalizedPath(pathname, newLocale, searchStr);
    startTransition(() => {
      router.push(targetUrl);
    });
  };

  return (
    <div
      role="group"
      aria-label="Language selector"
      className={`inline-flex items-center rounded-full border border-champagne-300 bg-white/90 p-1 shadow-sm ${className}`}
    >
      {LOCALES.map((locale) => {
        const config = LOCALE_CONFIGS[locale];
        const isActive = locale === currentLocale;

        return (
          <button
            key={locale}
            type="button"
            disabled={isPending}
            onClick={() => handleSwitch(locale)}
            aria-pressed={isActive}
            className={`lang-switch flex items-center space-x-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
              isActive
                ? 'bg-salon-700 text-white shadow'
                : 'text-gray-700 hover:bg-salon-50 hover:text-salon-800'
            }`}
          >
            <span>{config.flag}</span>
            <span>{locale.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}
