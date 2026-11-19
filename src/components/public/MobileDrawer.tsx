'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Phone, MapPin, Clock, Sparkles } from 'lucide-react';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { OpeningStatusBadge } from '@/components/public/OpeningStatusBadge';
import { SocialIconLinks } from '@/components/public/SocialIcons';
import type { Locale } from '@/lib/i18n/config';
import type { Messages } from '@/lib/i18n/dictionaries';
import type { BusinessInfo } from '@/lib/cms/public-data';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  locale: Locale;
  dict: Messages;
  businessInfo?: BusinessInfo;
}

export function MobileDrawer({ isOpen, onClose, locale, dict, businessInfo }: MobileDrawerProps) {
  const pathname = usePathname();

  const brandTitle =
    locale === 'vi'
      ? (businessInfo?.websiteTitleVi || businessInfo?.websiteTitle || businessInfo?.salonName || dict.common.brandName)
      : (businessInfo?.websiteTitle || businessInfo?.salonName || dict.common.brandName);

  const brandTagline =
    locale === 'vi'
      ? (businessInfo?.websiteTaglineVi || businessInfo?.websiteTagline || 'Sydney CBD')
      : (businessInfo?.websiteTagline || 'Sydney CBD');

  const logoUrl = businessInfo?.logoUrl;
  const facebookUrl = businessInfo?.facebookUrl ?? businessInfo?.socialLinks?.facebook ?? '';
  const instagramUrl = businessInfo?.instagramUrl ?? businessInfo?.socialLinks?.instagram ?? '';

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const navLinks = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/services`, label: dict.nav.services },
    { href: `/${locale}/gallery`, label: dict.nav.gallery },
    { href: `/${locale}/about`, label: dict.nav.about },
    { href: `/${locale}/contact`, label: dict.nav.contact },
  ];

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-white shadow-2xl flex flex-col p-6 overflow-y-auto">
        <div className="flex items-center justify-between pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={brandTitle}
                className="h-10 w-auto max-w-[110px] object-contain rounded-md"
              />
            ) : null}
            <div>
              <span className="font-serif text-lg font-bold text-salon-950 tracking-tight block">
                {brandTitle}
              </span>
              <span className="text-xs text-salon-700 tracking-widest uppercase">
                {brandTagline}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={dict.nav.closeMenu}
            className="p-2 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Badge */}
        <div className="py-4 border-b border-gray-100">
          <OpeningStatusBadge locale={locale} />
        </div>

        {/* Navigation items */}
        <nav className="py-6 flex flex-col space-y-3">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-salon-50 text-salon-800 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Language Switcher */}
        <div className="py-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">{dict.nav.language}:</span>
          <LanguageSwitcher currentLocale={locale} />
        </div>

        {/* Social Media Links */}
        {(facebookUrl || instagramUrl) && (
          <div className="py-4 border-t border-gray-100">
            <SocialIconLinks
              facebookUrl={facebookUrl}
              instagramUrl={instagramUrl}
              locale={locale}
              variant="mobile-drawer"
              brandName={brandTitle}
            />
          </div>
        )}

        {/* Quick Contact & Action */}
        <div className="mt-auto pt-6 border-t border-gray-100 space-y-4">
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-salon-700 shrink-0" />
              <a
                href={`tel:${(businessInfo?.phone || dict.common.phone).replace(/[^+\d]/g, '')}`}
                className="hover:underline text-gray-800 font-medium"
              >
                {businessInfo?.phone || dict.common.phone}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-salon-700 shrink-0" />
              <a
                href={`tel:${(businessInfo?.mobile || dict.common.mobile).replace(/[^+\d]/g, '')}`}
                className="hover:underline text-gray-800 font-medium"
              >
                {businessInfo?.mobile || dict.common.mobile}
              </a>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-salon-700 shrink-0 mt-0.5" />
              <span>
                {businessInfo?.streetAddress
                  ? `${businessInfo.streetAddress}, ${businessInfo.suburb} ${businessInfo.state} ${businessInfo.postcode}`
                  : dict.common.address}
              </span>
            </div>
          </div>

          <Link
            href={`/${locale}/contact`}
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-salon-800 hover:bg-salon-900 text-white font-medium py-3 text-sm shadow-md transition-colors"
          >
            <Sparkles className="w-4 h-4 text-champagne-300" />
            <span>{dict.nav.bookNow}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
