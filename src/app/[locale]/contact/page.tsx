import React from 'react';
import { notFound } from 'next/navigation';
import { Phone, MapPin, Clock, ShieldCheck, Mail, Sparkles } from 'lucide-react';
import { isValidLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getPublicServices, getPublicBusinessInfo } from '@/lib/cms/public-data';
import { generateLocalizedMetadata } from '@/lib/seo/metadata';
import { ConsultationForm } from '@/components/public/ConsultationForm';
import { SocialIconLinks } from '@/components/public/SocialIcons';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) return {};
  const dict = await getDictionary(locale);

  return generateLocalizedMetadata({
    locale,
    pathname: '/contact',
    title: dict.meta.contactTitle,
    description: dict.meta.contactDesc,
  });
}

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ service?: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const preselectedServiceId = resolvedSearchParams.service;

  const typedLocale = locale as Locale;
  const isEn = typedLocale === 'en';
  const dict = await getDictionary(typedLocale);
  const services = await getPublicServices();
  const business = await getPublicBusinessInfo();

  return (
    <div className="py-12 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
      {/* Page Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-salon-50 border border-salon-200 px-3.5 py-1 text-xs text-salon-800 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-champagne-500" />
          <span>Sydney CBD Boutique Lounge</span>
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-salon-950 tracking-tight">
          {dict.contact.title}
        </h1>
        <p className="text-base text-gray-600 leading-relaxed">
          {dict.contact.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Column: Contact Cards & Australian Business Details */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl p-8 bg-white border border-gray-200 shadow-xs space-y-6">
            <h2 className="font-serif text-2xl font-bold text-salon-950 border-b border-gray-100 pb-4">
              {dict.contact.addressTitle}
            </h2>

            <div className="space-y-4 text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-salon-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">{dict.common.address}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Opposite Wynyard Station / George St Light Rail
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-salon-700 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Telephone (Landline)</p>
                  <a
                    href="tel:+61291234567"
                    className="font-bold text-salon-950 hover:underline font-mono"
                  >
                    +61 2 9123 4567
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-salon-700 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Australian Mobile / SMS</p>
                  <a
                    href="tel:+61412345678"
                    className="font-bold text-salon-950 hover:underline font-mono"
                  >
                    0412 345 678
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-salon-700 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Email Inquiries</p>
                  <a
                    href={`mailto:${business.email}`}
                    className="font-semibold text-salon-950 hover:underline"
                  >
                    {business.email}
                  </a>
                </div>
              </div>
            </div>

            {/* ABN Credential Verification */}
            <div className="pt-4 border-t border-gray-100 space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-salon-50/70 border border-salon-100 p-3 text-xs text-salon-900 font-mono">
                <ShieldCheck className="w-4 h-4 text-salon-700 shrink-0" />
                <span>ABN: 51 824 753 556</span>
              </div>

              {(business.facebookUrl || business.instagramUrl || business.socialLinks?.facebook || business.socialLinks?.instagram) && (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                    {isEn ? 'Direct Social Channels' : 'Kênh Mạng Xã Hội Chính Thức'}
                  </p>
                  <SocialIconLinks
                    facebookUrl={business.facebookUrl ?? business.socialLinks?.facebook}
                    instagramUrl={business.instagramUrl ?? business.socialLinks?.instagram}
                    locale={typedLocale}
                    variant="footer"
                    brandName={business.salonName}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Trading Hours Card */}
          <div className="rounded-2xl p-8 bg-salon-950 text-white shadow-xs space-y-4">
            <h3 className="font-serif text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-champagne-300" />
              <span>{dict.contact.hoursTitle}</span>
            </h3>

            <div className="space-y-2 text-xs text-gray-300">
              <div className="flex justify-between py-1.5 border-b border-salon-900">
                <span className="text-gray-400">Monday – Wednesday:</span>
                <span className="font-semibold text-white">09:30 – 18:30</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-salon-900 text-champagne-300 font-bold">
                <span>Thursday (Late Night):</span>
                <span>09:30 – 20:00</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-salon-900">
                <span className="text-gray-400">Friday:</span>
                <span className="font-semibold text-white">09:30 – 19:00</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-salon-900">
                <span className="text-gray-400">Saturday:</span>
                <span className="font-semibold text-white">09:00 – 18:00</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-salon-900">
                <span className="text-gray-400">Sunday:</span>
                <span className="font-semibold text-white">10:00 – 17:00</span>
              </div>
              <p className="text-[11px] text-gray-400 pt-1">
                {dict.hours.timezoneNote}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Consultation Inquiry Form */}
        <div className="lg:col-span-7">
          <ConsultationForm
            locale={typedLocale}
            dict={dict}
            services={services}
            preselectedServiceId={preselectedServiceId}
          />
        </div>
      </div>
    </div>
  );
}
