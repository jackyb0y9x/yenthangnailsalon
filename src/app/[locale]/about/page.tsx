import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ShieldCheck,
  Award,
  Heart,
  CheckCircle2,
  Sparkles,
  Flame,
  Trash2,
  Droplets,
  MapPin,
  Navigation,
  ExternalLink,
  Train,
  Car,
} from 'lucide-react';
import { isValidLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import {
  getPublicStaff,
  getPublicBusinessInfo,
  getPublicAboutStory,
} from '@/lib/cms/public-data';
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
    pathname: '/about',
    title: dict.meta.aboutTitle,
    description: dict.meta.aboutDesc,
    ogTitle: dict.meta.ogTitle,
  });
}

export default async function AboutPage({
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
  const [staffMembers, business, story] = await Promise.all([
    getPublicStaff(),
    getPublicBusinessInfo(),
    getPublicAboutStory(),
  ]);

  const storyBadge = isEn
    ? story.badge_en || story.badge_vi || 'Our Heritage & Values'
    : story.badge_vi || story.badge_en || 'Di Sản & Giá Trị Cốt Lõi';
  const pageTitle = isEn
    ? story.page_title_en || story.page_title_vi || dict.about.title
    : story.page_title_vi || story.page_title_en || dict.about.title;
  const pageSubtitle = isEn
    ? story.page_subtitle_en || story.page_subtitle_vi || dict.about.subtitle
    : story.page_subtitle_vi || story.page_subtitle_en || dict.about.subtitle;
  const storyEyebrow = isEn
    ? story.story_eyebrow_en || story.story_eyebrow_vi || 'Sydney CBD Sanctuary'
    : story.story_eyebrow_vi || story.story_eyebrow_en || 'Không Gian Đẳng Cấp Sydney CBD';
  const storyTitle = isEn
    ? story.story_title_en || story.story_title_vi || dict.about.storyTitle
    : story.story_title_vi || story.story_title_en || dict.about.storyTitle;
  const storyP1 = isEn
    ? story.story_p1_en || story.story_p1_vi || dict.about.storyP1
    : story.story_p1_vi || story.story_p1_en || dict.about.storyP1;
  const storyP2 = isEn
    ? story.story_p2_en || story.story_p2_vi || dict.about.storyP2
    : story.story_p2_vi || story.story_p2_en || dict.about.storyP2;
  const storyP3 = isEn
    ? story.story_p3_en || story.story_p3_vi || ''
    : story.story_p3_vi || story.story_p3_en || '';
  const storyImage =
    story.image_url ||
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80';
  const stat1Value = isEn
    ? story.stat1_value_en || story.stat1_value_vi || '8+ Years'
    : story.stat1_value_vi || story.stat1_value_en || '8+ Năm';
  const stat1Label = isEn
    ? story.stat1_label_en || story.stat1_label_vi || 'Sydney CBD Excellence'
    : story.stat1_label_vi || story.stat1_label_en || 'Kinh Nghiệm Tại Sydney CBD';
  const stat2Value = isEn
    ? story.stat2_value_en || story.stat2_value_vi || '15,000+'
    : story.stat2_value_vi || story.stat2_value_en || '15.000+';
  const stat2Label = isEn
    ? story.stat2_label_en || story.stat2_label_vi || 'Satisfied Clients'
    : story.stat2_label_vi || story.stat2_label_en || 'Khách Hàng Hài Lòng';

  const googleMapsUrl =
    business.googleMapsUrl ||
    `https://maps.google.com/?q=${encodeURIComponent(
      `${business.streetAddress}, ${business.suburb} ${business.state} ${business.postcode} Australia`
    )}`;

  const googleMapsEmbedUrl =
    business.googleMapsEmbedUrl ||
    `https://maps.google.com/maps?q=${encodeURIComponent(
      `${business.streetAddress}, ${business.suburb} ${business.state} ${business.postcode} Australia`
    )}&t=&z=16&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="w-full py-12 md:py-20 space-y-20 sm:space-y-28 overflow-x-hidden">
      {/* Hero Header */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-salon-50 border border-salon-200 px-3.5 py-1 text-xs text-salon-800 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-champagne-500" />
          <span>{storyBadge}</span>
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-salon-950 tracking-tight">
          {pageTitle}
        </h1>
        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed font-sans">
          {pageSubtitle}
        </p>
      </section>

      {/* Salon Story Section */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 relative">
            <div className="rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={storyImage}
                alt={storyTitle}
                className="w-full h-[450px] object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-bold tracking-widest text-salon-700 uppercase">
              {storyEyebrow}
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-salon-950 leading-tight">
              {storyTitle}
            </h2>
            {storyP1 && (
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-sans whitespace-pre-line">
                {storyP1}
              </p>
            )}
            {storyP2 && (
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-sans whitespace-pre-line">
                {storyP2}
              </p>
            )}
            {storyP3 && (
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-sans whitespace-pre-line">
                {storyP3}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-salon-50 text-salon-800">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{stat1Value}</h4>
                  <p className="text-xs text-gray-500">{stat1Label}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-salon-50 text-salon-800">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{stat2Value}</h4>
                  <p className="text-xs text-gray-500">{stat2Label}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hygiene Section with Exact Anchor #hygiene and Verbatim Text */}
      <section
        id="hygiene"
        className="w-full bg-salon-950 text-white py-16 md:py-24 border-y border-salon-900"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-salon-900 border border-salon-800 px-4 py-1 text-xs text-champagne-300 uppercase tracking-widest font-semibold">
              <ShieldCheck className="w-4 h-4" />
              {dict.about.hygieneTitle}
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Medical-grade autoclave sterilization and disposable files.
            </h2>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-sans">
              We operate under hospital-grade infection control protocols. Your health, cuticle integrity, and total peace of mind are never compromised.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1 */}
            <div className="rounded-2xl p-8 bg-salon-900/60 border border-salon-800/80 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-champagne-400/10 text-champagne-300 flex items-center justify-center border border-champagne-400/20">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-white">
                {dict.about.hygienePillar1Title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-sans">
                {dict.about.hygienePillar1Desc}
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="rounded-2xl p-8 bg-salon-900/60 border border-salon-800/80 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-champagne-400/10 text-champagne-300 flex items-center justify-center border border-champagne-400/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-white">
                {dict.about.hygienePillar2Title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-sans">
                {dict.about.hygienePillar2Desc}
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="rounded-2xl p-8 bg-salon-900/60 border border-salon-800/80 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-champagne-400/10 text-champagne-300 flex items-center justify-center border border-champagne-400/20">
                <Droplets className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-white">
                {dict.about.hygienePillar3Title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-sans">
                {dict.about.hygienePillar3Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Meet Our Master Technicians */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-semibold tracking-widest text-salon-700 uppercase block">
            {dict.about.teamTitle}
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-salon-950">
            {dict.about.teamSubtitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {staffMembers.map((staff) => (
            <div
              key={staff.id}
              className="group rounded-2xl overflow-hidden bg-white border border-gray-200/80 shadow-xs hover:shadow-xl transition-all duration-300"
            >
              <div className="aspect-[4/5] overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={staff.image_url}
                  alt={staff.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="p-5 space-y-2">
                <span className="text-[10px] font-bold text-champagne-600 tracking-wider uppercase block">
                  {isEn ? staff.role_title_en : staff.role_title_vi}
                </span>
                <h3 className="font-serif text-lg font-bold text-salon-950">
                  {staff.name}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                  {isEn ? (staff.bio_en || staff.bio_vi || '') : (staff.bio_vi || staff.bio_en || '')}
                </p>

                <div className="flex flex-wrap gap-1 pt-2">
                  {staff.specializations.map((spec) => (
                    <span
                      key={spec}
                      className="text-[10px] bg-salon-50 text-salon-800 px-2 py-0.5 rounded-md font-medium"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Location & Google Map Section */}
      <section id="location-map" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-salon-50 border border-salon-200 px-3.5 py-1 text-xs text-salon-800 font-semibold tracking-wider uppercase">
            <MapPin className="w-3.5 h-3.5 text-champagne-600" />
            <span>{isEn ? 'Location & Sanctuary' : 'Vị Trí & Không Gian Salon'}</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-salon-950">
            {isEn ? 'Visit Our Sydney CBD Sanctuary' : 'Ghé Thăm Salon Tại Trung Tâm Sydney'}
          </h2>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed font-sans">
            {isEn
              ? 'Conveniently situated along historic George Street, moments away from Wynyard Station and Circular Quay.'
              : 'Tọa lạc tại vị trí đắc địa trên đường George Street, chỉ cách ga Wynyard và Circular Quay vài bước chân.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Interactive Google Map Frame */}
          <div className="lg:col-span-7 rounded-3xl overflow-hidden border-2 border-champagne-300 shadow-xl bg-white relative min-h-[380px] sm:min-h-[460px] flex flex-col">
            <iframe
              src={googleMapsEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Glamour Nails Sydney Google Maps Location"
              className="flex-1 w-full min-h-[340px]"
            />
            <div className="p-4 bg-white/95 backdrop-blur-md border-t border-gray-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-salon-950">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{business.streetAddress}, {business.suburb} {business.state} {business.postcode}</span>
              </div>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-salon-900 hover:bg-salon-950 text-white text-xs font-semibold shadow-xs hover:shadow transition-all shrink-0"
              >
                <span>{isEn ? 'Open in Google Maps' : 'Mở bằng Google Maps'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Location Information & Transit Guide Card */}
          <div className="lg:col-span-5 rounded-3xl bg-white border border-champagne-200/80 p-8 sm:p-10 shadow-md flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold tracking-widest text-salon-700 uppercase block">
                  {dict.contact.addressTitle}
                </span>
                <p className="font-serif text-2xl font-bold text-salon-950 leading-snug">
                  {business.streetAddress}
                </p>
                <p className="text-base text-gray-700">
                  {business.suburb}, {business.state} {business.postcode}, Australia
                </p>
                <p className="text-xs text-gray-500 font-mono pt-1">
                  ABN: {business.abn}
                </p>
              </div>

              {/* Transit & Accessibility Highlights */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <span className="text-xs font-bold tracking-widest text-gray-500 uppercase block">
                  {isEn ? 'Getting Here' : 'Hướng Dẫn Đi Lại'}
                </span>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-salon-50 text-salon-800 flex items-center justify-center shrink-0 border border-salon-100">
                      <Train className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">
                        {isEn ? 'By Train & Metro' : 'Tàu Hỏa & Metro'}
                      </p>
                      <p className="text-xs text-gray-600 leading-relaxed font-sans">
                        {isEn
                          ? '2-minute stroll from Wynyard Station (George St Exit) or Circular Quay Station.'
                          : 'Đi bộ 2 phút từ ga Wynyard (lối ra George St) hoặc ga Circular Quay.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-salon-50 text-salon-800 flex items-center justify-center shrink-0 border border-salon-100">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">
                        {isEn ? 'Sydney Light Rail' : 'Tàu Điện Tuyến Nhẹ (Light Rail)'}
                      </p>
                      <p className="text-xs text-gray-600 leading-relaxed font-sans">
                        {isEn
                          ? 'Conveniently opposite Bridge Street Light Rail Stop (L2 / L3 lines).'
                          : 'Nằm đối diện trạm Bridge Street Light Rail (các tuyến L2 / L3).'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-salon-50 text-salon-800 flex items-center justify-center shrink-0 border border-salon-100">
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">
                        {isEn ? 'Parking Facilities' : 'Bãi Đậu Xe Ô Tô'}
                      </p>
                      <p className="text-xs text-gray-600 leading-relaxed font-sans">
                        {isEn
                          ? 'Undercover parking available at Wilson Parking 188 George St & Grosvenor Place.'
                          : 'Bãi đỗ xe có mái che an toàn tại Wilson Parking 188 George St & Grosvenor Place.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex items-center justify-between gap-4">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-bold text-salon-800 hover:text-salon-950 hover:underline"
              >
                <MapPin className="w-4 h-4 text-champagne-600" />
                <span>{isEn ? 'Get Driving Directions' : 'Xem Lộ Trình Lái Xe'}</span>
              </a>

              <Link
                href={`/${typedLocale}/contact`}
                className="inline-flex items-center gap-2 rounded-full bg-salon-900 hover:bg-salon-950 text-white font-semibold px-5 py-2.5 text-xs shadow-sm hover:shadow transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-champagne-300" />
                <span>{dict.nav.bookNow}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
