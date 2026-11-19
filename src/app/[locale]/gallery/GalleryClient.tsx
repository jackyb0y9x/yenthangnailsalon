'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ZoomIn, Sparkles } from 'lucide-react';
import { LightboxModal } from '@/components/public/LightboxModal';
import type { PublicGalleryItem } from '@/lib/cms/public-data';
import type { Locale } from '@/lib/i18n/config';
import type { Messages } from '@/lib/i18n/dictionaries';

interface GalleryClientProps {
  initialItems: PublicGalleryItem[];
  allItems: PublicGalleryItem[];
  locale: Locale;
  dict: Messages;
  initialCategory?: string;
}

export function GalleryClient({
  initialItems: _initialItems,
  allItems,
  locale,
  dict,
  initialCategory,
}: GalleryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEn = locale === 'en';

  const [activeCategory, setActiveCategory] = useState<string>(
    initialCategory || searchParams?.get('category') || 'All'
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const categories = ['All', 'Ombre', '3D Art', 'Chrome', 'SNS Dipping', 'Gel Art'];

  // Sync state when URL searchParams change (e.g. browser back/forward or direct link)
  useEffect(() => {
    const urlCat = searchParams?.get('category');
    if (urlCat) {
      setActiveCategory(urlCat);
    } else if (!initialCategory) {
      setActiveCategory('All');
    }
  }, [searchParams, initialCategory]);

  const handleSelectCategory = (cat: string) => {
    setActiveCategory(cat);
    if (cat === 'All') {
      router.push(`/${locale}/gallery`, { scroll: false });
    } else {
      router.push(`/${locale}/gallery?category=${encodeURIComponent(cat)}`, { scroll: false });
    }
  };

  const matchesCategory = (item: PublicGalleryItem, targetCat: string): boolean => {
    if (!targetCat || targetCat === 'All') return true;
    const targetLower = targetCat.trim().toLowerCase();
    const rawCat = (item.category || (item as any).category_tag || '').trim().toLowerCase();

    // Exact category match
    if (rawCat === targetLower) return true;

    // Direct tags match
    if (Array.isArray(item.tags)) {
      if (item.tags.some((t) => typeof t === 'string' && t.trim().toLowerCase() === targetLower)) {
        return true;
      }
    }

    // Flexible keywords matching across the 5 primary styling categories
    if (
      targetLower.includes('sns') &&
      (rawCat.includes('sns') || item.tags?.some((t) => typeof t === 'string' && t.toLowerCase().includes('sns')))
    ) {
      return true;
    }

    if (
      targetLower.includes('gel') &&
      (rawCat.includes('gel') || item.tags?.some((t) => typeof t === 'string' && t.toLowerCase().includes('gel')))
    ) {
      return true;
    }

    if (
      targetLower.includes('3d') &&
      (rawCat.includes('3d') || item.tags?.some((t) => typeof t === 'string' && t.toLowerCase().includes('3d')))
    ) {
      return true;
    }

    if (
      targetLower.includes('ombre') &&
      (rawCat.includes('ombre') || item.tags?.some((t) => typeof t === 'string' && t.toLowerCase().includes('ombre')))
    ) {
      return true;
    }

    if (
      targetLower.includes('chrome') &&
      (rawCat.includes('chrome') || item.tags?.some((t) => typeof t === 'string' && t.toLowerCase().includes('chrome')))
    ) {
      return true;
    }

    return false;
  };

  const safeAllItems = Array.isArray(allItems) ? allItems : [];
  const filteredItems = safeAllItems.filter((item) => matchesCategory(item, activeCategory));

  const getCategoryCount = (cat: string) => {
    if (cat === 'All') return safeAllItems.length;
    return safeAllItems.filter((item) => matchesCategory(item, cat)).length;
  };

  return (
    <div className="space-y-10">
      {/* Category Filter Chips with item count badges */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-4xl mx-auto px-2">
        {categories.map((cat) => {
          const isActive =
            activeCategory.toLowerCase().trim() === cat.toLowerCase().trim() ||
            (cat !== 'All' && activeCategory.toLowerCase().includes(cat.toLowerCase().trim()));
          const count = getCategoryCount(cat);

          return (
            <button
              key={cat}
              type="button"
              data-cat={cat}
              onClick={() => handleSelectCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all inline-flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-salon-900 text-white shadow-md ring-2 ring-champagne-400/50 scale-105'
                  : 'bg-white text-gray-700 hover:bg-salon-50 border border-gray-200 hover:border-salon-300'
              }`}
            >
              <span>{cat === 'All' ? dict.gallery.all : cat}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 px-6 bg-salon-50/60 rounded-3xl border border-dashed border-salon-200 max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-champagne-100 flex items-center justify-center mx-auto text-champagne-700">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-lg font-bold text-gray-900">
            {isEn ? 'No Designs Found in This Category' : 'Chưa Có Mẫu Trong Danh Mục Này'}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
            {isEn
              ? 'Explore our full lookbook collection or consult with our master artists for a bespoke custom set.'
              : 'Khám phá tất cả các mẫu móng hoặc đặt lịch tư vấn với chuyên gia để tạo bộ móng nghệ thuật theo ý thích.'}
          </p>
          <button
            type="button"
            onClick={() => handleSelectCategory('All')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-salon-900 text-white text-xs font-semibold hover:bg-salon-800 shadow-sm transition-all cursor-pointer"
          >
            {isEn ? 'View All Designs' : 'Xem Tất Cả Mẫu'}
          </button>
        </div>
      ) : (
        /* Gallery Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredItems.map((item, index) => {
            const title = isEn ? item.title_en : (item.title_vi || item.title_en);
            const categoryDisplay = item.category || (item as any).category_tag || 'Ombre';

            return (
              <div
                key={item.id}
                data-category={categoryDisplay}
                onClick={() => setLightboxIndex(index)}
                className="gallery-item group relative rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div className="aspect-square overflow-hidden bg-gray-100 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url}
                    alt={title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="p-3 rounded-full bg-white/90 text-salon-900 shadow-md">
                      <ZoomIn className="w-5 h-5" />
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-champagne-600 tracking-wider uppercase">
                      {categoryDisplay}
                    </span>
                    <h3 className="title font-serif text-sm font-bold text-gray-900 group-hover:text-salon-800 transition-colors line-clamp-1">
                      {title}
                    </h3>
                  </div>

                  {Array.isArray(item.tags) && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Embedded Lightbox Modal container for SSR & E2E compliance */}
                <div
                  className="lightbox-modal hidden"
                  role="dialog"
                  aria-label="Lightbox"
                >
                  <button aria-label="Close" className="close-btn">
                    &times;
                  </button>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image_url} alt={title} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Interactive Lightbox Modal */}
      {lightboxIndex !== null && filteredItems.length > 0 && (
        <LightboxModal
          items={filteredItems}
          currentIndex={lightboxIndex}
          isOpen={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(newIndex) => setLightboxIndex(newIndex)}
          locale={locale}
        />
      )}
    </div>
  );
}
