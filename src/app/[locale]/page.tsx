import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Sparkles, ArrowRight, Clock, Award, Gem, CheckCircle2, MapPin, Navigation, ExternalLink, Compass } from 'lucide-react';
import { isValidLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import {
  getPublicServices,
  getPublicGallery,
  getPublicBusinessInfo,
  getPublicHeroSection,
} from '@/lib/cms/public-data';
import { generateLocalizedMetadata } from '@/lib/seo/metadata';
import { OpeningStatusBadge } from '@/components/public/OpeningStatusBadge';
import { AlternatingShowcase, type ShowcaseItem } from '@/components/public/AlternatingShowcase';
import { FeaturedLookbookSlider } from '@/components/public/FeaturedLookbookSlider';
import { HeroTrustMetrics } from '@/components/public/HeroTrustMetrics';
import { buildOpeningHoursRows } from '@/lib/cms/opening-hours';

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
  const info = await getPublicBusinessInfo();

  const hasCustomEnTitle = info.websiteTitle && info.websiteTitle !== 'Glamour Nails & Beauty Lounge Sydney';
  const hasCustomViTitle = info.websiteTitleVi && info.websiteTitleVi !== 'Glamour Nails Sydney • Chăm Sóc Móng Cao Cấp';

  const title =
    locale === 'vi'
      ? (hasCustomViTitle ? info.websiteTitleVi! : dict.meta.homeTitle)
      : (hasCustomEnTitle ? info.websiteTitle! : dict.meta.homeTitle);

  const ogTitle =
    locale === 'vi'
      ? (hasCustomViTitle ? info.websiteTitleVi! : dict.meta.ogTitle)
      : (hasCustomEnTitle ? info.websiteTitle! : dict.meta.ogTitle);

  return generateLocalizedMetadata({
    locale,
    pathname: '',
    title,
    description: dict.meta.homeDesc,
    ogTitle,
  });
}

export default async function HomePage({
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
  const hero = await getPublicHeroSection();
  const services = await getPublicServices();
  const gallery = await getPublicGallery();
  const business = await getPublicBusinessInfo();

  const fullAddress = `${business.streetAddress}, ${business.suburb} ${business.state} ${business.postcode}, Australia`;
  const directMapUrl =
    business.googleMapsUrl ||
    `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`;
  const rawEmbedUrl = business.googleMapsEmbedUrl || '';
  const iframeMatch = rawEmbedUrl.match(/src=["']([^"']+)["']/i);
  const cleanEmbedUrl = iframeMatch ? iframeMatch[1] : rawEmbedUrl;
  const embedMapUrl =
    cleanEmbedUrl ||
    `https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;

  const heroHeadline = typedLocale === 'vi'
    ? (hero.headline_vi || hero.headline_en || dict.hero.headline)
    : (hero.headline_en || dict.hero.headline);

  const heroSubheadline = typedLocale === 'vi'
    ? (hero.subheadline_vi || hero.subheadline_en || dict.hero.subheadline)
    : (hero.subheadline_en || dict.hero.subheadline);

  const heroCtaText = typedLocale === 'vi'
    ? (hero.cta_text_vi || hero.cta_text_en || dict.hero.ctaPrimary)
    : (hero.cta_text_en || dict.hero.ctaPrimary);

  const heroCtaLink = hero.cta_link || `/${typedLocale}/contact`;
  const heroImageUrl = hero.image_url || "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1600&q=80";

  const featuredServicesList = services.filter((s) => s.is_featured);
  const showcaseServices = featuredServicesList.length > 0 ? featuredServicesList : services;
  const featuredServices = showcaseServices.slice(0, 6);
  const featuredGallery = gallery.filter((g) => g.is_featured);

  // Pull Alternating Showcase directly from live CMS Services (`/admin/cms?tab=services`)
  const alternatingItems: ShowcaseItem[] = showcaseServices.map((service, idx) => {
    const priceAud = Number(service.price_aud ?? (service.price_cents ? service.price_cents / 100 : 0));
    const fallbackImages = [
      'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=1200&q=80',
    ];

    return {
      id: service.id,
      title: isEn ? service.name_en : (service.name_vi || service.name_en),
      category: service.category,
      description: isEn
        ? (service.description_en || 'Bespoke nail artistry and holistic spa care crafted with hospital-grade hygiene in Sydney CBD.')
        : (service.description_vi || service.description_en || 'Dịch vụ chăm sóc móng và spa thư giãn cao cấp, thực hiện tỉ mỉ theo quy chuẩn vệ sinh y khoa tại Sydney CBD.'),
      imageUrl: service.image_url || fallbackImages[idx % fallbackImages.length],
      priceAud: Number.isFinite(priceAud) ? priceAud : 0,
      durationMinutes: Number(service.duration_minutes || 45),
      linkUrl: `/${typedLocale}/contact?service=${encodeURIComponent(service.id)}`,
      badge: service.is_featured
        ? (isEn
            ? (idx === 0 ? 'Most Requested' : 'Featured Service')
            : (idx === 0 ? 'Yêu Thích Nhất' : 'Dịch Vụ Nổi Bật'))
        : undefined,
    };
  });

  return (
    <div className="w-full pb-16 sm:pb-20 overflow-x-hidden">
      {/* Emergency Holiday Notice if active */}
      {business.holidayNoticeActive && (
        <div className="holiday-notice-banner w-full bg-amber-50 border-b border-amber-200 px-4 py-3.5 text-center text-amber-900 text-sm font-semibold flex items-center justify-center gap-2 shadow-xs">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            {typedLocale === 'vi'
              ? (business.holidayNoticeVi || business.holidayNoticeEn || 'Đóng cửa nghỉ lễ')
              : (business.holidayNoticeEn || 'Closed for Holiday')}
          </span>
        </div>
      )}

      {/* Full-Page Background Hero Section with Ambient Glow & Animated Overlay */}
      <section className="hero relative w-full min-h-[92vh] sm:min-h-screen flex items-center justify-center overflow-hidden border-b border-champagne-300/30">
        {/* Full-Page Background Image with subtle Ken-Burns effect */}
        <div className="absolute inset-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImageUrl}
            alt="Glamour Nails Sydney Luxury Lounge"
            className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000 ease-out"
            style={{
              filter: 'brightness(0.8) contrast(1.08)',
            }}
          />
          {/* Multi-layered luxury gradients for pristine readability & depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-salon-950 via-salon-950/70 to-salon-950/45 backdrop-blur-[1px]" />
          <div className="absolute inset-0 bg-radial from-transparent via-black/35 to-salon-950/90" />

          {/* Glowing Ambient Light Orbs */}
          <div className="absolute top-1/4 left-1/4 w-80 sm:w-96 h-80 sm:h-96 bg-champagne-400/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div
            className="absolute bottom-1/4 right-1/4 w-80 sm:w-96 h-80 sm:h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none animate-pulse"
            style={{ animationDelay: '1.5s' }}
          />
        </div>

        {/* Center-aligned Content Overlay */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-8 text-center text-white space-y-7 sm:space-y-9 py-20 sm:py-28">
          {/* Glowing Luxury Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-black/40 hover:bg-black/50 backdrop-blur-md border border-champagne-400/50 px-5 py-2 text-xs sm:text-sm font-semibold tracking-widest text-champagne-200 uppercase shadow-lg shadow-champagne-950/50 transition-all hover:scale-105">
            <Sparkles className="w-4 h-4 text-champagne-400 animate-spin-slow" />
            <span>{typedLocale === 'vi' ? 'Sydney CBD • Tiệm Móng Sang Trọng Đẳng Cấp' : 'Sydney CBD • Luxury Boutique Nail Sanctuary'}</span>
          </div>

          {/* Main Headline (Nghệ Thuật Làm Móng & Chăm Sóc Spa Thư Giãn Đẳng Cấp) */}
          <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.16] drop-shadow-xl px-1">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-champagne-100 via-champagne-200 to-amber-200">
              {typedLocale === 'vi'
                ? (heroHeadline || 'Nghệ Thuật Làm Móng & Chăm Sóc Spa Thư Giãn Đẳng Cấp')
                : (heroHeadline || 'Haute Nail Artistry & Bespoke Luxury Spa Sanctuary')}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg md:text-xl text-gray-200 max-w-3xl mx-auto font-sans leading-relaxed drop-shadow-sm font-light px-1">
            {typedLocale === 'vi'
              ? (heroSubheadline || 'Trải nghiệm đỉnh cao của dịch vụ làm móng chuẩn y khoa, sơn gel tráng gương tinh xảo và liệu trình chăm sóc spa thảo dược cao cấp tại trung tâm Sydney.')
              : heroSubheadline}
          </p>

          {/* Action Buttons & Status */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-5">
            <Link
              href={heroCtaLink.startsWith('/') ? heroCtaLink : `/${typedLocale}${heroCtaLink}`}
              className="cta w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-champagne-400 via-amber-300 to-champagne-400 hover:from-champagne-300 hover:to-amber-200 text-slate-950 font-bold px-7 sm:px-9 py-3.5 sm:py-4 min-h-[48px] text-sm sm:text-base shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95 border border-champagne-200"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>{heroCtaText}</span>
            </Link>

            <Link
              href={`/${typedLocale}/services`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/30 backdrop-blur-md font-semibold px-7 sm:px-8 py-3.5 sm:py-4 min-h-[48px] text-sm sm:text-base shadow-lg transition-all hover:scale-105"
            >
              <span>{dict.hero.ctaSecondary}</span>
              <ArrowRight className="w-4 h-4 text-champagne-300" />
            </Link>

            <div className="pt-1 sm:pt-0">
              <OpeningStatusBadge locale={typedLocale} isHoliday={business.holidayNoticeActive} />
            </div>
          </div>

          {/* Luxury Trust Metrics Card with Scroll-Triggered Count-Up & Scale-Up Animation */}
          <HeroTrustMetrics
            statClientsLabel={dict.hero.statClients}
            statRatingLabel={dict.hero.statRating}
            statHygieneLabel={dict.hero.statHygiene}
          />
        </div>
      </section>

      {/* Featured Lookbook Slider (Auto-sliding every 3000ms as requested) */}
      <FeaturedLookbookSlider
        items={featuredGallery.length > 0 ? featuredGallery : gallery}
        locale={typedLocale}
      />

      {/* Alternating Scroll Reveal Image Showcase (Full-Bleed Across Screen) */}
      <AlternatingShowcase
        items={alternatingItems}
        locale={typedLocale}
        headingBadge={isEn ? 'Curated Masterpieces' : 'Bộ Sưu Tập Đỉnh Cao'}
        headingTitle={isEn ? 'Edge-to-Edge Artistry Showcase' : 'Nghệ Thuật Làm Móng Tràn Viền'}
        headingSubtitle={
          isEn
            ? 'Discover our most celebrated nail styles, crafted with European dry E-file precision, hospital-grade hygiene, and premium non-toxic materials.'
            : 'Khám phá các thiết kế móng độc bản được săn đón nhất, thực hiện với kỹ thuật chuẩn châu Âu, an toàn y tế và vật liệu hữu cơ cao cấp.'
        }
        viewAllLink={`/${typedLocale}/services`}
        viewAllText={isEn ? 'Explore All Services' : 'Xem Tất Cả Dịch Vụ'}
        ctaText={isEn ? 'Book This Service' : 'Đặt Lịch Dịch Vụ Này'}
      />

      {/* Featured Services Section (Full Width Grid) */}
      <section className="w-full px-4 sm:px-8 lg:px-16 2xl:px-24 py-10 sm:py-14">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <span className="text-xs font-bold tracking-widest text-salon-700 uppercase block">
            {isEn ? 'Signature Services' : 'Dịch Vụ Tiêu Biểu'}
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-salon-950">
            {dict.services.title}
          </h2>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed font-sans">
            {dict.services.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredServices.map((service) => (
            <div
              key={service.id}
              data-category={service.category}
              className="service-card group rounded-3xl p-7 bg-white border border-champagne-200/70 hover:border-champagne-400 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-salon-800 bg-salon-50 px-3 py-1 rounded-full uppercase tracking-wide border border-salon-100">
                    {service.category}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1 font-mono font-medium">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {service.duration_minutes} {dict.services.duration}
                  </span>
                </div>

                <h3 className="font-serif text-xl font-bold text-salon-950 group-hover:text-salon-800 transition-colors">
                  {isEn ? service.name_en : (service.name_vi || service.name_en)}
                </h3>

                <p className="text-xs sm:text-sm text-gray-600 line-clamp-3 leading-relaxed">
                  {isEn ? service.description_en : (service.description_vi || service.description_en)}
                </p>
              </div>

              <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase font-semibold tracking-wider">
                    {dict.services.startingFrom}
                  </span>
                  <span className="text-xl font-bold font-mono text-salon-950">
                    ${service.price_aud.toFixed(2)} AUD
                  </span>
                </div>

                <Link
                  href={`/${typedLocale}/contact?service=${service.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-salon-50 hover:bg-salon-900 text-salon-900 hover:text-white px-4 py-2 text-xs font-semibold transition-all shadow-xs hover:shadow"
                >
                  <span>{dict.services.bookService}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* GST Notice Container */}
        <div className="mt-10 text-center text-xs text-gray-500 bg-salon-50/70 rounded-2xl py-3.5 px-6 border border-salon-100 max-w-xl mx-auto shadow-xs">
          <p className="gst-notice font-medium">
            All prices are inclusive of Australian GST (10%)
          </p>
        </div>
      </section>

      {/* Interactive Google Maps & Sydney CBD Location Sanctuary (Configured via CMS) */}
      <section id="location-map" className="w-full bg-gradient-to-b from-salon-950 via-slate-950 to-salon-950 text-white py-16 sm:py-20 border-y border-champagne-500/20 scroll-mt-24">
        <div className="w-full px-4 sm:px-8 lg:px-16 2xl:px-24 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-800/80">
            <div className="space-y-3 max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-champagne-950/70 border border-champagne-400/40 px-3.5 py-1 text-xs font-semibold tracking-widest text-champagne-300 uppercase">
                <MapPin className="w-3.5 h-3.5 text-champagne-400" />
                <span>{isEn ? 'Prime Sydney CBD Location' : 'Vị Trí Đắc Địa Trung Tâm Sydney'}</span>
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
                {isEn ? 'Find & Visit Our Boutique Salon' : 'Bản Đồ Vị Trí & Hướng Dẫn Đường Đi'}
              </h2>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-sans">
                {isEn
                  ? 'Conveniently located along George Street in Sydney CBD, mere steps from Wynyard Station, Circular Quay, and Bridge Street Light Rail.'
                  : 'Tọa lạc tại mặt tiền đường George Street sầm uất ngay trung tâm Sydney, chỉ cách ga Wynyard, Circular Quay và trạm Light Rail Bridge Street vài bước chân.'}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <a
                href={directMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-champagne-400 hover:bg-champagne-300 text-slate-950 font-bold px-6 py-3 text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all"
              >
                <Navigation className="w-4 h-4 text-slate-950" />
                <span>{isEn ? 'Get Directions' : 'Chỉ Đường Trên Google Maps'}</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-950/70" />
              </a>
            </div>
          </div>

          {/* Interactive Map Card Frame */}
          <div className="rounded-3xl overflow-hidden border border-champagne-400/30 shadow-2xl bg-slate-900/90 relative">
            {/* Top Info Bar inside Map Card */}
            <div className="px-5 py-3.5 bg-slate-950/85 backdrop-blur-md border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse ring-4 ring-emerald-500/20" />
                <span className="font-semibold text-white">
                  {business.streetAddress}, {business.suburb} {business.state} {business.postcode}
                </span>
                <span className="text-slate-500 hidden sm:inline">•</span>
                <span className="text-champagne-300 font-mono hidden sm:inline">Australia</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 text-[11px] font-medium">
                <Clock className="w-3.5 h-3.5 text-champagne-400" />
                <span>{isEn ? 'Open 7 Days • Late Night Thu' : 'Mở cửa 7 ngày • Thứ 5 mở muộn'}</span>
              </div>
            </div>

            {/* Embedded Google Map */}
            <div className="w-full h-[380px] sm:h-[460px] lg:h-[500px] bg-slate-950 relative">
              <iframe
                src={embedMapUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Google Maps Location"
                className="w-full h-full filter contrast-[1.02] brightness-[0.98]"
              />
            </div>

            {/* Bottom Quick Transit Highlights */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-champagne-400/10 text-champagne-400 flex items-center justify-center shrink-0 border border-champagne-400/20">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-white">{isEn ? 'Wynyard Station' : 'Ga Tàu Wynyard'}</p>
                  <p className="text-[11px] text-slate-400">{isEn ? '2 min walk via George St' : '2 phút đi bộ qua George St'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-champagne-400/10 text-champagne-400 flex items-center justify-center shrink-0 border border-champagne-400/20">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-white">{isEn ? 'Light Rail L2 / L3' : 'Tàu Điện Tuyến Nhẹ L2 / L3'}</p>
                  <p className="text-[11px] text-slate-400">{isEn ? 'Opposite Bridge St Stop' : 'Đối diện trạm Bridge Street'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-champagne-400/10 text-champagne-400 flex items-center justify-center shrink-0 border border-champagne-400/20">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-white">{isEn ? 'Secure Parking' : 'Bãi Đỗ Xe Tiện Lợi'}</p>
                  <p className="text-[11px] text-slate-400">{isEn ? 'Wilson Parking 188 George St' : 'Wilson Parking 188 George St'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full-Bleed Contact & Hours Sanctuary Card */}
      <section className="w-full px-4 sm:px-8 lg:px-16 2xl:px-24 pt-10 sm:pt-14">
        <div className="rounded-3xl bg-white border border-champagne-200/80 p-8 sm:p-12 lg:p-14 shadow-md grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-salon-700 block">
              {dict.contact.addressTitle}
            </span>
            <p className="font-serif text-xl font-bold text-salon-950 leading-snug">
              {business.streetAddress}, {business.suburb} {business.state} {business.postcode}
            </p>
            <p className="text-xs text-gray-500 font-mono">
              ABN: {business.abn}
            </p>
            <Link
              href="#location-map"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-salon-800 hover:text-salon-950 hover:underline pt-1"
            >
              <span>{isEn ? 'View Interactive Map' : 'Xem Bản Đồ & Chỉ Đường'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-champagne-600" />
            </Link>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-salon-700 block">
              {dict.contact.phoneTitle}
            </span>
            <p className="text-sm">
              <a
                href={`tel:${(business.phone || '+61 2 9123 4567').replace(/[^+\d]/g, '')}`}
                className="font-serif text-xl font-bold text-salon-950 hover:underline block"
              >
                {business.phone}
              </a>
              <a
                href={`tel:${(business.mobile || '0412 345 678').replace(/[^+\d]/g, '')}`}
                className="text-sm text-gray-600 hover:underline block font-mono mt-1"
              >
                {business.mobile}
              </a>
            </p>
            <p className="text-xs text-gray-500">
              {business.email}
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-salon-700 block">
              {dict.contact.hoursTitle}
            </span>
            <div className="text-sm text-gray-700 space-y-1">
              {buildOpeningHoursRows(business.openingHours).map((row) => (
                <div key={row.key} className="flex justify-between gap-2 text-xs sm:text-sm">
                  <span className="text-gray-500">{isEn ? row.labelEn : row.labelVi}:</span>
                  <span className={row.highlight ? 'font-semibold text-salon-900' : 'font-medium text-gray-800'}>
                    {isEn ? row.hoursTextEn : row.hoursTextVi}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
