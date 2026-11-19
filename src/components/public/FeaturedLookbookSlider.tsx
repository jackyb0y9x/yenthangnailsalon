'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, Eye } from 'lucide-react';
import type { PublicGalleryItem } from '@/lib/cms/public-data';

interface FeaturedLookbookSliderProps {
  items: PublicGalleryItem[];
  locale: string;
}

export function FeaturedLookbookSlider({ items, locale }: FeaturedLookbookSliderProps) {
  const displayItems = items && items.length > 0 ? items : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const isVi = locale === 'vi';

  const nextSlide = useCallback(() => {
    if (displayItems.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % displayItems.length);
  }, [displayItems.length]);

  const prevSlide = useCallback(() => {
    if (displayItems.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length);
  }, [displayItems.length]);

  // Auto next every 3000ms
  useEffect(() => {
    if (displayItems.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      nextSlide();
    }, 3000);

    return () => clearInterval(timer);
  }, [nextSlide, displayItems.length, isPaused]);

  // Touch handlers for mobile swipe
  const minSwipeDistance = 45;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) {
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      prevSlide();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') nextSlide();
    if (e.key === 'ArrowLeft') prevSlide();
  };

  if (displayItems.length === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={isVi ? 'Tuyệt Tác Mẫu Móng Độc Quyền' : 'Featured Nail Art Creations'}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="lookbook w-full py-6 sm:py-8 lg:py-10 bg-gradient-to-b from-white via-salon-50/40 to-white relative overflow-hidden focus:outline-none"
    >
      {/* Full-Screen Width Header Bar */}
      <div className="w-full px-4 sm:px-8 lg:px-14 xl:px-20 pb-4 sm:pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-3.5 border-b border-champagne-200/70">
          <div className="space-y-2.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-salon-100/80 border border-champagne-300 px-3.5 py-1 text-[11px] sm:text-xs text-salon-900 font-semibold tracking-wider uppercase shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-champagne-600 animate-spin-slow shrink-0" />
              <span>{isVi ? 'Tuyệt Tác Mẫu Móng Độc Quyền' : 'Signature Lookbook & Artistry'}</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-salon-950 leading-tight">
              {isVi ? 'Mẫu Móng Nổi Bật Tuyển Chọn' : 'Featured Nail Art Creations'}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed font-sans max-w-2xl">
              {isVi
                ? 'Chiêm ngưỡng những thiết kế ombré chuyển sắc, tráng gương chrome ngọc trai và đính đá pha lê Swarovski được yêu thích nhất tại Sydney.'
                : 'Experience our most sought-after ombre gradients, glazed chrome finishes, and hand-sculpted Swarovski crystal artistry in Sydney.'}
            </p>
          </div>

          {/* Navigation Controls & Counter */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            <div className="inline-flex items-center text-xs font-mono font-semibold text-salon-700 bg-salon-50 px-3.5 py-2 rounded-full border border-salon-200">
              <span className="text-salon-950 font-bold">
                {String(currentIndex + 1).padStart(2, '0')}
              </span>
              <span className="mx-1 text-gray-400">/</span>
              <span>{String(displayItems.length).padStart(2, '0')}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevSlide}
                aria-label={isVi ? 'Mẫu trước' : 'Previous slide'}
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full bg-white hover:bg-salon-900 text-salon-900 hover:text-white border border-champagne-300 shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                aria-label={isVi ? 'Mẫu tiếp theo' : 'Next slide'}
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full bg-salon-900 hover:bg-salon-800 text-white border border-salon-950 shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Screen Edge-to-Edge Carousel Viewport (100% width) */}
      <div
        className="relative w-full overflow-hidden border-y border-champagne-200/80 bg-white shadow-xl"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Animated 3000ms Slide Progress Line */}
        {!isPaused && displayItems.length > 1 && (
          <div className="absolute top-0 left-0 right-0 z-20 h-1 bg-black/15 overflow-hidden">
            <div
              key={currentIndex}
              className="h-full bg-gradient-to-r from-champagne-400 via-amber-400 to-pink-500 origin-left"
              style={{
                animation: 'sliderProgress 3000ms linear forwards',
              }}
            />
          </div>
        )}

        {/* Sliding Track */}
        <div
          className="gallery-grid flex transition-transform duration-700 ease-out"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {displayItems.map((item, idx) => {
            const localizedTitle =
              isVi && item.title_vi ? item.title_vi : item.title_en;
            const altText = `${localizedTitle} — ${item.category || item.category_tag || 'Nail Art'}`;

            return (
              <article
                key={item.id || idx}
                aria-roledescription="slide"
                aria-label={`${idx + 1} / ${displayItems.length}: ${localizedTitle}`}
                className="gallery-card w-full flex-shrink-0"
                style={{ minWidth: '100%' }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 w-full lg:h-[390px] xl:h-[420px]">
                  {/* Left Framed Image Showcase (Natural Proportions, Never Over-Zoomed) */}
                  <div className="lg:col-span-6 relative group overflow-hidden bg-salon-950 h-[250px] sm:h-[320px] md:h-[360px] lg:h-full flex items-center justify-center p-4 sm:p-6 lg:p-7">
                    {/* Ambient Blurred Backdrop matching the photo tones */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image_url}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover object-center scale-110 blur-2xl opacity-40 brightness-75 pointer-events-none select-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-black/25 pointer-events-none" />

                    {/* Centered Uncropped Nail Art Photo */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image_url}
                      alt={altText}
                      loading={idx === 0 ? 'eager' : 'lazy'}
                      className="relative z-10 max-w-full max-h-full w-auto h-auto object-contain rounded-xl shadow-2xl ring-1 ring-white/15 group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                    />

                    {/* Category Badge */}
                    <div className="absolute top-3.5 left-3.5 sm:top-5 sm:left-5 z-20">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-md text-champagne-200 border border-champagne-400/45 text-[11px] sm:text-xs font-semibold uppercase tracking-wider shadow-md">
                        <Sparkles className="w-3.5 h-3.5 text-champagne-300" />
                        {item.category || item.category_tag}
                      </span>
                    </div>

                    {/* Quick View in Gallery Link */}
                    <div className="absolute bottom-3.5 right-3.5 sm:bottom-5 sm:right-5 z-20">
                      <Link
                        href={`/${locale}/gallery`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-full bg-white/95 hover:bg-white text-salon-950 text-xs font-bold shadow-lg backdrop-blur-md transition-all hover:scale-105"
                      >
                        <Eye className="w-3.5 h-3.5 text-champagne-600" />
                        <span>{isVi ? 'Xem Trong Bộ Sưu Tập' : 'View in Gallery'}</span>
                      </Link>
                    </div>
                  </div>

                  {/* Right Editorial Content Panel */}
                  <div className="lg:col-span-6 p-5 sm:p-7 lg:p-8 xl:p-11 flex flex-col justify-between bg-gradient-to-br from-white via-salon-50/40 to-champagne-50/30 space-y-4 lg:h-full">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs font-semibold text-champagne-700 uppercase tracking-widest">
                        <span>{isVi ? 'Mẫu Móng Thịnh Hành' : 'Trending Nail Design'}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-champagne-500" />
                        <span className="text-salon-700">
                          {isVi ? 'Tự động chuyển 3s' : 'Auto-Slide 3s'}
                        </span>
                      </div>

                      <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-salon-950 leading-tight">
                        {localizedTitle}
                      </h3>

                      {item.title_vi && item.title_en && isVi && (
                        <p className="text-xs sm:text-sm text-gray-500 font-sans italic">
                          {item.title_en}
                        </p>
                      )}

                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {item.tags.map((tag: string, tIdx: number) => (
                            <span
                              key={tIdx}
                              className="text-xs bg-white text-salon-800 border border-champagne-200 px-3 py-1 rounded-full font-medium shadow-2xs"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="pt-6 border-t border-champagne-200/70 flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center lg:items-stretch xl:items-center gap-3">
                      <Link
                        href={`/${locale}/contact?service=${encodeURIComponent(
                          item.category || 'nail-art'
                        )}`}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-full bg-gradient-to-r from-salon-900 to-salon-950 hover:from-salon-800 hover:to-salon-900 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                      >
                        <Sparkles className="w-4 h-4 text-champagne-300 shrink-0" />
                        <span>{isVi ? 'Đặt Lịch Làm Mẫu Này' : 'Book This Design'}</span>
                      </Link>

                      <Link
                        href={`/${locale}/gallery`}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-full bg-white hover:bg-salon-50 text-salon-950 border border-champagne-300 text-sm font-semibold transition-all shadow-xs active:scale-[0.98]"
                      >
                        <span>{isVi ? 'Tất Cả Mẫu Móng' : 'Explore All Sets'}</span>
                        <ArrowRight className="w-4 h-4 text-champagne-600 shrink-0" />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Carousel Bottom Dot Indicators (Touch-friendly) */}
      {displayItems.length > 1 && (
        <div className="w-full px-4 pt-3.5 flex items-center justify-center gap-2">
          {displayItems.map((_, dotIdx) => (
            <button
              key={dotIdx}
              type="button"
              onClick={() => setCurrentIndex(dotIdx)}
              aria-label={
                isVi ? `Chuyển đến mẫu ${dotIdx + 1}` : `Jump to slide ${dotIdx + 1}`
              }
              aria-current={dotIdx === currentIndex ? 'true' : undefined}
              className="p-2 -m-1 inline-flex items-center justify-center"
            >
              <span
                className={`block h-2.5 rounded-full transition-all duration-300 ${
                  dotIdx === currentIndex
                    ? 'w-9 bg-salon-900'
                    : 'w-2.5 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            </button>
          ))}
        </div>
      )}

      {/* Global CSS for the 3000ms progress animation */}
      <style jsx global>{`
        @keyframes sliderProgress {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
      `}</style>
    </section>
  );
}
