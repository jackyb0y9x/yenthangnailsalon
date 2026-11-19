'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PublicGalleryItem } from '@/lib/cms/public-data';
import type { Locale } from '@/lib/i18n/config';

interface LightboxModalProps {
  items: PublicGalleryItem[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
  locale: Locale;
}

export function LightboxModal({
  items,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  locale,
}: LightboxModalProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const currentItem = items[currentIndex];

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 2.5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const handleNext = useCallback(() => {
    setZoomLevel(1);
    onNavigate((currentIndex + 1) % items.length);
  }, [currentIndex, items.length, onNavigate]);

  const handlePrev = useCallback(() => {
    setZoomLevel(1);
    onNavigate((currentIndex - 1 + items.length) % items.length);
  }, [currentIndex, items.length, onNavigate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, handleNext, handlePrev]);

  if (!isOpen || !currentItem) return null;

  const title = locale === 'vi' ? (currentItem.title_vi || currentItem.title_en) : currentItem.title_en;

  return (
    <div
      role="dialog"
      aria-label="Lightbox"
      aria-modal="true"
      className="lightbox-modal fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
    >
      {/* Top Header Bar */}
      <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between text-white z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div>
          <h3 className="text-base sm:text-lg font-serif font-semibold">{title}</h3>
          <span className="text-xs text-champagne-300 uppercase tracking-widest">
            {currentItem.category} • {currentIndex + 1} / {items.length}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-white/10 rounded-full p-1 border border-white/20">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              aria-label="Zoom Out"
              className="p-1.5 rounded-full hover:bg-white/20 disabled:opacity-40 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs px-2 font-mono">{zoomLevel.toFixed(1)}x</span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 2.5}
              aria-label="Zoom In"
              className="p-1.5 rounded-full hover:bg-white/20 disabled:opacity-40 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {zoomLevel > 1 && (
              <button
                type="button"
                onClick={handleResetZoom}
                aria-label="Reset Zoom"
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Close button with exact .close-btn class and &times; */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="close-btn text-white/80 hover:text-white text-3xl font-light px-3 py-1 leading-none rounded-full hover:bg-white/10 transition-colors"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Navigation Prev Button */}
      {items.length > 1 && (
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous Image"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 transition-all hover:scale-105"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Main Image Container */}
      <div className="relative max-w-5xl max-h-[85vh] w-full h-full flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentItem.image_url}
          alt={title}
          style={{ transform: `scale(${zoomLevel})` }}
          className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-200 select-none"
        />
      </div>

      {/* Navigation Next Button */}
      {items.length > 1 && (
        <button
          type="button"
          onClick={handleNext}
          aria-label="Next Image"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 transition-all hover:scale-105"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Tags Pill Bar */}
      {currentItem.tags && currentItem.tags.length > 0 && (
        <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-2 z-20 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/15 flex gap-2">
            {currentItem.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] text-gray-200 bg-white/10 px-2.5 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
