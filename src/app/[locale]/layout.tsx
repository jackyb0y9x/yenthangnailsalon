import React from 'react';
import { notFound } from 'next/navigation';
import { isValidLocale, LOCALES, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getPublicBusinessInfo, getPublicAnnouncements } from '@/lib/cms/public-data';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { FloatingSocialDock } from '@/components/public/SocialIcons';
import { LocalBusinessJsonLd } from '@/components/seo/LocalBusinessJsonLd';

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const dict = await getDictionary(locale);
  const businessInfo = await getPublicBusinessInfo();
  const announcements = await getPublicAnnouncements();
  const activeAnnouncement = announcements.find((a) => a.is_active) || null;

  const facebookUrl = businessInfo.facebookUrl ?? businessInfo.socialLinks?.facebook ?? '';
  const instagramUrl = businessInfo.instagramUrl ?? businessInfo.socialLinks?.instagram ?? '';
  const brandTitle =
    locale === 'vi'
      ? (businessInfo.websiteTitleVi || businessInfo.websiteTitle || businessInfo.salonName)
      : (businessInfo.websiteTitle || businessInfo.salonName);

  return (
    <div className="min-h-screen bg-salon-50/30 text-gray-900 font-sans antialiased flex flex-col overflow-x-clip">
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang = ${JSON.stringify(locale)};`,
        }}
      />
      <LocalBusinessJsonLd businessInfo={businessInfo} />
      <Header
        locale={locale as Locale}
        dict={dict}
        holidayNoticeActive={businessInfo.holidayNoticeActive}
        announcement={activeAnnouncement}
        businessInfo={businessInfo}
      />
      <main className="flex-1 w-full">{children}</main>
      <Footer
        locale={locale as Locale}
        dict={dict}
        businessInfo={businessInfo}
      />
      <FloatingSocialDock
        facebookUrl={facebookUrl}
        instagramUrl={instagramUrl}
        locale={locale}
        brandName={brandTitle}
      />
    </div>
  );
}
