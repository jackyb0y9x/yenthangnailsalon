'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Sparkles, Gem } from 'lucide-react';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { OpeningStatusBadge } from '@/components/public/OpeningStatusBadge';
import { AnnouncementBanner } from '@/components/public/AnnouncementBanner';
import { MobileDrawer } from '@/components/public/MobileDrawer';
import { SocialIconLinks } from '@/components/public/SocialIcons';
import type { Locale } from '@/lib/i18n/config';
import type { Messages } from '@/lib/i18n/dictionaries';
import type { BusinessInfo } from '@/lib/cms/public-data';

interface HeaderProps {
  locale: Locale;
  dict: Messages;
  holidayNoticeActive?: boolean;
  announcement?: {
    badge_text: string;
    message_en: string;
    message_vi: string;
    link_url?: string;
    is_active: boolean;
  } | null;
  businessInfo?: BusinessInfo;
}

export function Header({
  locale,
  dict,
  holidayNoticeActive = false,
  announcement,
  businessInfo,
}: HeaderProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const pathname = usePathname();

  const brandTitle =
    locale === 'vi'
      ? (businessInfo?.websiteTitleVi || businessInfo?.websiteTitle || businessInfo?.salonName || dict.common.brandName)
      : (businessInfo?.websiteTitle || businessInfo?.salonName || dict.common.brandName);

  const brandTagline =
    locale === 'vi'
      ? (businessInfo?.websiteTaglineVi || businessInfo?.websiteTagline || 'Sydney CBD • Tiệm Nail Sang Trọng')
      : (businessInfo?.websiteTagline || 'Sydney CBD • Boutique Lounge');

  const logoUrl = businessInfo?.logoUrl;
  const facebookUrl = businessInfo?.facebookUrl ?? businessInfo?.socialLinks?.facebook ?? '';
  const instagramUrl = businessInfo?.instagramUrl ?? businessInfo?.socialLinks?.instagram ?? '';

  const navLinks = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/services`, label: dict.nav.services },
    { href: `/${locale}/gallery`, label: dict.nav.gallery },
    { href: `/${locale}/about`, label: dict.nav.about },
    { href: `/${locale}/contact`, label: dict.nav.contact },
  ];

  const showAnnouncement =
    announcement === undefined
      ? true
      : Boolean(announcement && announcement.is_active);

  const bannerBadge = announcement?.badge_text || dict.announcement.badge;
  const bannerEn = announcement?.message_en || "Spring Promotion: 10% off SNS Full Sets this month!";
  const bannerVi = announcement?.message_vi || announcement?.message_en || "Ưu đãi mùa xuân: Giảm 10% cho trọn bộ móng nhúng SNS tháng này!";
  const bannerLink = announcement?.link_url || "/services";

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-champagne-200/70 shadow-xs transition-colors">
        {/* Top Dismissible Announcement Banner */}
        {showAnnouncement && (
          <AnnouncementBanner
            locale={locale}
            badgeText={bannerBadge}
            messageEn={bannerEn}
            messageVi={bannerVi}
            linkUrl={bannerLink}
          />
        )}

        {/* Full-bleed edge-to-edge navbar container */}
        <div className="w-full px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="flex items-center justify-between h-16 sm:h-20 flex-nowrap gap-2 sm:gap-4">
            {/* Salon Brand Identity */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink lg:shrink-0">
              <Link href={`/${locale}`} className="group flex items-center gap-2.5 sm:gap-3 min-w-0">
                {logoUrl ? (
                  <div className="relative h-9 sm:h-12 flex items-center shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt={brandTitle}
                      className="h-9 sm:h-12 w-auto max-w-[120px] sm:max-w-[170px] object-contain transition-transform duration-300 group-hover:scale-105 rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-salon-900 via-salon-800 to-salon-950 text-champagne-300 flex items-center justify-center shrink-0 shadow-md border border-champagne-400/40 group-hover:scale-105 transition-transform duration-300">
                    <Gem className="w-4 h-4 sm:w-5 sm:h-5 text-champagne-300 drop-shadow" />
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="font-serif text-base sm:text-xl xl:text-2xl font-bold tracking-tight text-salon-950 group-hover:text-salon-800 transition-colors truncate max-w-[165px] sm:max-w-[260px] lg:max-w-[210px] xl:max-w-[290px] 2xl:max-w-none">
                    {brandTitle}
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-champagne-500 animate-pulse shrink-0" />
                    <span className="text-[9px] sm:text-xs text-salon-700 font-sans tracking-widest uppercase font-semibold truncate max-w-[150px] sm:max-w-[240px] lg:max-w-[195px] xl:max-w-none">
                      {brandTagline}
                    </span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation - Centered Floating Pill with Guaranteed No Wrap */}
            <nav
              aria-label={locale === 'vi' ? 'Điều hướng chính' : 'Primary Navigation'}
              className="hidden lg:flex items-center flex-nowrap shrink-0 gap-0.5 xl:gap-1.5 bg-salon-50/90 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-champagne-300/80 shadow-xs"
            >
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`whitespace-nowrap shrink-0 px-3 py-1.5 xl:px-4 xl:py-2 rounded-full text-xs xl:text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-salon-900 via-salon-850 to-salon-950 text-white font-semibold shadow-xs'
                        : 'text-gray-700 hover:text-salon-950 hover:bg-white/80'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Header Right Actions - Balanced & Guaranteed No Wrap */}
            <div className="hidden lg:flex items-center flex-nowrap shrink-0 gap-2 xl:gap-3">
              <div className="shrink-0">
                <SocialIconLinks
                  facebookUrl={facebookUrl}
                  instagramUrl={instagramUrl}
                  locale={locale}
                  variant="header"
                  brandName={brandTitle}
                />
              </div>
              <div className="shrink-0 hidden 2xl:block">
                <OpeningStatusBadge locale={locale} isHoliday={holidayNoticeActive} />
              </div>
              <div className="shrink-0">
                <LanguageSwitcher currentLocale={locale} />
              </div>
              <Link
                href={`/${locale}/contact`}
                className="shrink-0 whitespace-nowrap inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-salon-900 via-salon-850 to-salon-950 hover:from-salon-800 hover:to-salon-900 text-white px-4 py-2 xl:px-5 xl:py-2.5 text-xs xl:text-sm font-semibold shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] border border-champagne-400/30"
              >
                <Sparkles className="w-3.5 h-3.5 text-champagne-300" />
                <span>{dict.nav.bookNow}</span>
              </Link>
            </div>

            {/* Mobile Actions: Social Icons (sm+), Language Switcher & Hamburger Button */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 lg:hidden">
              <div className="hidden sm:flex items-center">
                <SocialIconLinks
                  facebookUrl={facebookUrl}
                  instagramUrl={instagramUrl}
                  locale={locale}
                  variant="header"
                  brandName={brandTitle}
                />
              </div>
              <LanguageSwitcher currentLocale={locale} />
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                aria-label={dict.nav.openMenu}
                className="p-2 sm:p-2.5 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl text-gray-700 hover:text-gray-900 hover:bg-salon-50 border border-gray-200 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile slide-out drawer */}
      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        locale={locale}
        dict={dict}
        businessInfo={businessInfo}
      />
    </>
  );
}
