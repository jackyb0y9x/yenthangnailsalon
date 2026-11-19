import React from 'react';
import Link from 'next/link';
import { Phone, MapPin, Clock, ShieldCheck, Heart } from 'lucide-react';
import { SocialIconLinks } from '@/components/public/SocialIcons';
import type { Locale } from '@/lib/i18n/config';
import type { Messages } from '@/lib/i18n/dictionaries';
import type { BusinessInfo } from '@/lib/cms/public-data';

interface FooterProps {
  locale: Locale;
  dict: Messages;
  holidayNoticeActive?: boolean;
  businessInfo?: BusinessInfo;
}

export function Footer({ locale, dict, holidayNoticeActive = false, businessInfo }: FooterProps) {
  const isEn = locale === 'en';

  const brandTitle =
    locale === 'vi'
      ? (businessInfo?.websiteTitleVi || businessInfo?.websiteTitle || businessInfo?.salonName || dict.common.brandName)
      : (businessInfo?.websiteTitle || businessInfo?.salonName || dict.common.brandName);

  const brandTagline =
    locale === 'vi'
      ? (businessInfo?.websiteTaglineVi || businessInfo?.websiteTagline || 'Sydney CBD • Tiệm Nail Sang Trọng')
      : (businessInfo?.websiteTagline || 'Sydney CBD • Boutique Sanctuary');

  const logoUrl = businessInfo?.logoUrl;
  const facebookUrl = businessInfo?.facebookUrl ?? businessInfo?.socialLinks?.facebook ?? '';
  const instagramUrl = businessInfo?.instagramUrl ?? businessInfo?.socialLinks?.instagram ?? '';
  const displayAbn = businessInfo?.abn || '51 824 753 556';
  const displayPhone = businessInfo?.phone || '+61 2 9123 4567';
  const displayMobile = businessInfo?.mobile || '0412 345 678';
  const displayAddress = businessInfo?.streetAddress
    ? `${businessInfo.streetAddress}, ${businessInfo.suburb} ${businessInfo.state} ${businessInfo.postcode}`
    : dict.common.address;
  const phoneHref = `tel:${displayPhone.replace(/[^+\d]/g, '')}`;
  const mobileHref = `tel:${displayMobile.replace(/[^+\d]/g, '')}`;

  return (
    <footer className="bg-salon-950 text-gray-300 pt-16 pb-20 sm:pb-12 border-t border-salon-900 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-salon-900/80">
          {/* Column 1: Brand & Credo */}
          <div className="space-y-4">
            {logoUrl ? (
              <div className="h-10 flex items-center mb-1">
                <img
                  src={logoUrl}
                  alt={brandTitle}
                  className="h-10 w-auto max-w-[160px] object-contain rounded brightness-0 invert opacity-90"
                />
              </div>
            ) : null}
            <h3 className="font-serif text-2xl font-bold text-white tracking-tight">
              {brandTitle}
            </h3>
            <p className="text-xs tracking-widest uppercase text-champagne-300 font-medium">
              {brandTagline}
            </p>
            <p className="text-sm text-gray-400 leading-relaxed">
              {dict.footer.about}
            </p>
            <div className="pt-2 space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-salon-900/80 border border-salon-800 px-3 py-1 text-xs text-champagne-300 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-champagne-400" />
                ABN: {displayAbn}
              </span>
              {(facebookUrl || instagramUrl) && (
                <div className="pt-1">
                  <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-2">
                    {isEn ? 'Connect With Us' : 'Kết Nối Với Chúng Tôi'}
                  </p>
                  <SocialIconLinks
                    facebookUrl={facebookUrl}
                    instagramUrl={instagramUrl}
                    locale={locale}
                    variant="footer"
                    brandName={brandTitle}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Navigation Links */}
          <div className="space-y-4">
            <h4 className="text-white font-serif text-base font-semibold tracking-wide">
              {dict.footer.quickLinks}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href={`/${locale}`}
                  className="hover:text-champagne-300 transition-colors"
                >
                  {dict.nav.home}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/services`}
                  className="hover:text-champagne-300 transition-colors"
                >
                  {dict.nav.services}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/gallery`}
                  className="hover:text-champagne-300 transition-colors"
                >
                  {dict.nav.gallery}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/about`}
                  className="hover:text-champagne-300 transition-colors"
                >
                  {dict.nav.about}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/about#hygiene`}
                  className="hover:text-champagne-300 transition-colors text-champagne-200"
                >
                  {isEn ? 'Hygiene Protocols' : 'Tiêu Chuẩn Vệ Sinh'}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/contact`}
                  className="hover:text-champagne-300 transition-colors"
                >
                  {dict.nav.contact}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact Details */}
          <div className="space-y-4 contact-details">
            <h4 className="text-white font-serif text-base font-semibold tracking-wide">
              {dict.footer.contactInfo}
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-champagne-300 shrink-0 mt-0.5" />
                <p>
                  Address: {displayAddress}
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-champagne-300 shrink-0" />
                <p>
                  Phone:{' '}
                  <a
                    href={phoneHref}
                    className="hover:text-champagne-300 underline font-medium"
                  >
                    {displayPhone}
                  </a>
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-champagne-300 shrink-0" />
                <p>
                  Mobile:{' '}
                  <a
                    href={mobileHref}
                    className="hover:text-champagne-300 underline font-medium"
                  >
                    {displayMobile}
                  </a>
                </p>
              </div>
              <p className="text-xs text-gray-400 pt-1 font-mono">
                ABN: {displayAbn}
              </p>
              {holidayNoticeActive && (
                <div className="holiday-alert mt-2 p-2.5 rounded-lg bg-amber-950/80 border border-amber-800 text-amber-200 text-xs">
                  {isEn ? 'Closed for Public Holiday' : 'Nghỉ Lễ Đóng Cửa'}
                </div>
              )}
            </div>
          </div>

          {/* Column 4: Trading Hours & GST */}
          <div className="space-y-4">
            <h4 className="text-white font-serif text-base font-semibold tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-champagne-300" />
              <span>{dict.footer.openingHours}</span>
            </h4>
            <div className="space-y-1.5 text-xs text-gray-300">
              <p className="flex justify-between py-1 border-b border-salon-900">
                <span className="text-gray-400">{isEn ? 'Mon – Wed' : 'Thứ 2 – Thứ 4'}:</span>
                <span className="font-medium text-white">09:30 – 18:30</span>
              </p>
              <p className="flex justify-between py-1 border-b border-salon-900 text-champagne-300 font-semibold">
                <span>{isEn ? 'Thursday (Late)' : 'Thứ 5 (Mở muộn)'}:</span>
                <span>09:30 – 20:00</span>
              </p>
              <p className="flex justify-between py-1 border-b border-salon-900">
                <span className="text-gray-400">{isEn ? 'Friday' : 'Thứ 6'}:</span>
                <span className="font-medium text-white">09:30 – 19:00</span>
              </p>
              <p className="flex justify-between py-1 border-b border-salon-900">
                <span className="text-gray-400">{isEn ? 'Saturday' : 'Thứ 7'}:</span>
                <span className="font-medium text-white">09:00 – 18:00</span>
              </p>
              <p className="flex justify-between py-1 border-b border-salon-900">
                <span className="text-gray-400">{isEn ? 'Sunday' : 'Chủ Nhật'}:</span>
                <span className="font-medium text-white">10:00 – 17:00</span>
              </p>
              <p className="text-[11px] text-gray-400 pt-1">
                {dict.hours.timezoneNote}
              </p>
            </div>

            <div className="pt-2 text-xs text-champagne-200/90 font-medium">
              <p className="gst-disclaimer">
                All prices are inclusive of Australian GST (10%). Surcharges apply on public holidays.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>
            © {new Date().getFullYear()} {dict.common.brandName}. {dict.footer.rights}
          </p>
          <p className="flex items-center gap-1.5">
            <span>Boutique Vietnamese Nail Artistry in Sydney</span>
            <Heart className="w-3 h-3 text-salon-600 fill-salon-600" />
          </p>
        </div>
      </div>
    </footer>
  );
}
