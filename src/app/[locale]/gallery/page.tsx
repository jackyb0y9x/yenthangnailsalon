import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { isValidLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getPublicGallery } from '@/lib/cms/public-data';
import { generateLocalizedMetadata } from '@/lib/seo/metadata';
import { GalleryClient } from './GalleryClient';

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
    pathname: '/gallery',
    title: dict.meta.galleryTitle,
    description: dict.meta.galleryDesc,
  });
}

export default async function GalleryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ category?: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialCategory = resolvedSearchParams.category;

  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);
  const allItems = await getPublicGallery();
  const initialItems = await getPublicGallery(initialCategory);

  return (
    <div className="py-12 md:py-20 space-y-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-salon-50 border border-salon-200 px-3.5 py-1 text-xs text-salon-800 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-champagne-500" />
          <span>Bespoke Nail Artistry Lookbook</span>
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-salon-950 tracking-tight">
          {dict.gallery.title}
        </h1>
        <p className="text-base text-gray-600 leading-relaxed">
          {dict.gallery.subtitle}
        </p>
      </div>

      {/* Interactive Gallery Component wrapped in Suspense */}
      <Suspense fallback={<div className="text-center py-12 text-sm text-gray-500">Loading gallery...</div>}>
        <GalleryClient
          initialItems={initialItems}
          allItems={allItems}
          locale={typedLocale}
          dict={dict}
          initialCategory={initialCategory}
        />
      </Suspense>
    </div>
  );
}
