'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Clock, Star, Eye } from 'lucide-react';
import type { Locale } from '@/lib/i18n/config';

export interface ShowcaseItem {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  priceAud?: number;
  durationMinutes?: number;
  linkUrl: string;
  tags?: string[];
  badge?: string;
}

interface AlternatingShowcaseProps {
  items: ShowcaseItem[];
  locale: Locale;
  headingBadge?: string;
  headingTitle?: string;
  headingSubtitle?: string;
  viewAllLink?: string;
  viewAllText?: string;
  ctaText?: string;
}

export function AlternatingShowcase({
  items,
  locale,
  headingBadge,
  headingTitle,
  headingSubtitle,
  viewAllLink,
  viewAllText,
  ctaText,
}: AlternatingShowcaseProps) {
  const isEn = locale === 'en';

  return (
    <section className="alternating-showcase w-full overflow-hidden py-16 sm:py-24 space-y-16 bg-gradient-to-b from-white via-salon-50/40 to-white">
      {/* Section Header */}
      {(headingTitle || headingBadge) && (
        <div className="w-full px-4 sm:px-8 lg:px-16 2xl:px-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-champagne-200/80 pb-8">
            <div className="space-y-3 max-w-3xl">
              {headingBadge && (
                <div className="inline-flex items-center gap-2 rounded-full bg-salon-100/80 border border-champagne-300 px-3.5 py-1 text-xs text-salon-900 font-semibold tracking-wider uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-champagne-600" />
                  <span>{headingBadge}</span>
                </div>
              )}
              {headingTitle && (
                <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-salon-950">
                  {headingTitle}
                </h2>
              )}
              {headingSubtitle && (
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-2xl font-sans">
                  {headingSubtitle}
                </p>
              )}
            </div>

            {viewAllLink && viewAllText && (
              <Link
                href={viewAllLink}
                className="inline-flex items-center gap-2 rounded-full bg-white hover:bg-salon-50 text-salon-950 px-6 py-3 border border-champagne-300 font-semibold text-sm shadow-xs hover:shadow transition-all group shrink-0"
              >
                <span>{viewAllText}</span>
                <ArrowRight className="w-4 h-4 text-champagne-600 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Full-bleed alternating items list */}
      <div className="w-full space-y-12 sm:space-y-20">
        {items.map((item, index) => (
          <ShowcaseRow
            key={item.id}
            item={item}
            index={index}
            isEn={isEn}
            ctaText={ctaText || (isEn ? 'Book This Style' : 'Đặt Lịch Mẫu Này')}
          />
        ))}
      </div>
    </section>
  );
}

function ShowcaseRow({
  item,
  index,
  isEn,
  ctaText,
}: {
  item: ShowcaseItem;
  index: number;
  isEn: boolean;
  ctaText: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const isEven = index % 2 === 0;

  useEffect(() => {
    const node = rowRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(node);
        }
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rowRef}
      className={`w-full px-4 sm:px-8 lg:px-16 2xl:px-24 transition-all duration-1000 ease-out transform ${
        isVisible
          ? 'opacity-100 translate-x-0'
          : isEven
          ? 'opacity-0 -translate-x-16 sm:-translate-x-28'
          : 'opacity-0 translate-x-16 sm:translate-x-28'
      }`}
    >
      <div
        className="group relative rounded-3xl overflow-hidden bg-white border border-champagne-200/80 shadow-md hover:shadow-2xl transition-all duration-500 grid grid-cols-1 lg:grid-cols-12 items-stretch lg:h-[440px] xl:h-[460px]"
      >
        {/* Full-Bleed Image Half (Strictly Uniform Frame Across All Rows) */}
        <div
          className={`lg:col-span-7 relative overflow-hidden bg-salon-950 h-[260px] sm:h-[340px] md:h-[380px] lg:h-full ${
            isEven ? 'lg:order-1' : 'lg:order-2'
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          {/* Gradient Overlay for Cinematic Depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent lg:hidden" />

          {/* Floating Pill on image */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-champagne-300 border border-champagne-400/30 text-xs font-semibold uppercase tracking-wider shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-champagne-400" />
              <span>{item.category}</span>
            </span>
            {item.badge && (
              <span className="px-3 py-1 rounded-full bg-salon-800/80 backdrop-blur-md text-white text-xs font-semibold tracking-wide shadow-lg">
                {item.badge}
              </span>
            )}
          </div>

          {/* Mobile title overlay */}
          <div className="absolute bottom-4 left-4 right-4 z-10 text-white lg:hidden space-y-1">
            <p className="font-serif text-xl font-bold drop-shadow">
              {item.title}
            </p>
            {item.priceAud !== undefined && (
              <p className="font-mono text-sm text-champagne-300 font-bold">
                ${item.priceAud.toFixed(2)} AUD
              </p>
            )}
          </div>
        </div>

        {/* Editorial Content Half */}
        <div
          className={`lg:col-span-5 p-6 sm:p-8 lg:p-10 xl:p-12 flex flex-col justify-between space-y-5 lg:h-full ${
            isEven ? 'lg:order-2' : 'lg:order-1'
          }`}
        >
          <div className="space-y-4">
            <div className="hidden lg:flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-salon-700 uppercase bg-salon-50 px-3 py-1 rounded-full border border-salon-100">
                {item.category}
              </span>
              {item.durationMinutes && (
                <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {item.durationMinutes} {isEn ? 'mins' : 'phút'}
                </span>
              )}
            </div>

            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-salon-950 leading-snug group-hover:text-salon-800 transition-colors">
              {item.title}
            </h3>

            <p className="text-sm sm:text-base text-gray-600 leading-relaxed font-sans">
              {item.description}
            </p>

            {/* Tags / Features */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-medium text-salon-800 bg-salon-50/80 px-2.5 py-1 rounded-md border border-salon-100"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Pricing & CTA */}
          <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {item.priceAud !== undefined && (
              <div>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                  {isEn ? 'Starting Price' : 'Giá từ'}
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-salon-950">
                  ${item.priceAud.toFixed(2)} AUD
                </span>
              </div>
            )}

            <Link
              href={item.linkUrl}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-salon-900 to-salon-950 hover:from-salon-800 hover:to-salon-900 text-white font-semibold px-6 py-3 text-sm shadow-md hover:shadow-lg transition-all group/btn"
            >
              <span>{ctaText}</span>
              <ArrowRight className="w-4 h-4 text-champagne-300 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
