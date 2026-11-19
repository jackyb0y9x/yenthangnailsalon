import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, Sparkles, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { isValidLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getPublicServices } from '@/lib/cms/public-data';
import { generateLocalizedMetadata } from '@/lib/seo/metadata';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    pathname: '/services',
    title: dict.meta.servicesTitle,
    description: dict.meta.servicesDesc,
  });
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) {
    notFound();
  }

  const typedLocale = locale as Locale;
  const isEn = typedLocale === 'en';
  const dict = await getDictionary(typedLocale);
  const services = await getPublicServices();

  const categories = Array.from(new Set(services.map((s) => s.category)));

  return (
    <div className="py-12 md:py-20 space-y-16">
      {/* Header Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-salon-50 border border-salon-200 px-3.5 py-1 text-xs text-salon-800 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-champagne-500" />
          <span>{isEn ? 'Australian Salon Pricing (AUD)' : 'Bảng Giá Niêm Yết Tiền Úc (AUD)'}</span>
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-salon-950 tracking-tight">
          {dict.services.title}
        </h1>
        <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
          {dict.services.subtitle}
        </p>

        {/* GST Statement Banner */}
        <div className="pt-2">
          <p className="gst-notice inline-block rounded-xl bg-champagne-50 border border-champagne-200/80 px-4 py-2 text-xs font-semibold text-salon-900 shadow-xs">
            All prices are inclusive of Australian GST (10%)
          </p>
        </div>
      </section>

      {/* Services grouped by Category */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {categories.map((category) => {
          const categoryServices = services.filter((s) => s.category === category);

          return (
            <div key={category} className="space-y-6">
              <div className="border-b border-champagne-200/70 pb-3 flex items-center justify-between">
                <h2 className="font-serif text-2xl font-bold text-salon-950 tracking-tight">
                  {category}
                </h2>
                <span className="text-xs text-gray-500 font-mono">
                  {categoryServices.length} {isEn ? 'treatments' : 'dịch vụ'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryServices.map((service) => {
                  const title = isEn ? service.name_en : (service.name_vi || service.name_en);
                  const desc = isEn ? service.description_en : (service.description_vi || service.description_en);

                  return (
                    <div
                      key={service.id}
                      data-category={service.category}
                      className="service-card group rounded-2xl p-6 bg-white border border-gray-200/80 hover:border-salon-300 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-salon-800 bg-salon-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            {service.category}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {service.duration_minutes} {dict.services.duration}
                          </span>
                        </div>

                        <h3 className="font-serif text-xl font-bold text-salon-950 group-hover:text-salon-800 transition-colors">
                          {title}
                        </h3>

                        <p className="text-xs text-gray-600 leading-relaxed">
                          {desc}
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-gray-400 block uppercase font-medium">
                            {dict.services.startingFrom}
                          </span>
                          <span className="text-xl font-bold font-mono text-salon-950">
                            ${service.price_aud.toFixed(2)} AUD
                          </span>
                        </div>

                        <Link
                          href={`/${typedLocale}/contact?service=${service.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-salon-800 hover:bg-salon-900 text-white px-4 py-2 text-xs font-semibold shadow-xs hover:shadow transition-all"
                        >
                          <span>{dict.services.bookService}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* Hygiene and Quality Assurance Card */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-salon-950 text-white p-8 sm:p-12 shadow-xl border border-salon-900 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-champagne-300 text-xs uppercase tracking-widest font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Australian Safety Compliance</span>
            </div>
            <h3 className="font-serif text-2xl font-bold">
              Looking for a custom bespoke package or bridal party styling?
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              We offer personalized consultations for weddings, formal events, and group spa celebrations. All tools are hospital-grade autoclave sterilized.
            </p>
          </div>
          <Link
            href={`/${typedLocale}/contact`}
            className="inline-flex items-center gap-2 rounded-full bg-champagne-400 hover:bg-champagne-300 text-salon-950 font-semibold px-8 py-3.5 text-sm shadow-md transition-all shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>{dict.nav.bookNow}</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
