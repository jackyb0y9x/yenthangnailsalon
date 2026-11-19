'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';

export function FacebookSvg({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.403.597 24 1.326 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.597 1.323-1.326V1.326C24 .597 23.403 0 22.675 0z" />
    </svg>
  );
}

export function InstagramSvg({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

interface SocialIconLinksProps {
  facebookUrl?: string;
  instagramUrl?: string;
  locale?: string;
  variant?: 'header' | 'footer' | 'mobile-drawer' | 'preview';
  brandName?: string;
}

export function SocialIconLinks({
  facebookUrl,
  instagramUrl,
  locale = 'vi',
  variant = 'header',
  brandName = 'Glamour Nails Sydney',
}: SocialIconLinksProps) {
  const isVi = locale === 'vi';
  const cleanFb = (facebookUrl || '').trim();
  const cleanIg = (instagramUrl || '').trim();

  if (!cleanFb && !cleanIg) return null;

  const fbLabel = isVi
    ? `Theo dõi ${brandName} trên Facebook`
    : `Follow ${brandName} on Facebook`;
  const igLabel = isVi
    ? `Theo dõi ${brandName} trên Instagram`
    : `Follow ${brandName} on Instagram`;

  if (variant === 'header') {
    return (
      <div className="flex items-center gap-2" aria-label={isVi ? 'Mạng xã hội' : 'Social Media'}>
        {cleanFb && (
          <a
            href={cleanFb}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={fbLabel}
            title="Facebook"
            className="group relative inline-flex items-center justify-center w-9 h-9 rounded-full p-[1.5px] transition-all duration-300 hover:-translate-y-1 hover:scale-110 hover:-rotate-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2]"
          >
            {/* Rotating neon sapphire halo */}
            <span
              aria-hidden="true"
              className="social-orb-ring absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#1877F2,#38BDF8,#818CF8,#1877F2)] opacity-75 group-hover:opacity-100 blur-[0.5px] transition-opacity"
            />
            <span className="social-sheen relative overflow-hidden w-full h-full rounded-full bg-gradient-to-br from-[#1877F2] via-[#1262D6] to-[#0A48A8] text-white flex items-center justify-center shadow-sm group-hover:shadow-[0_6px_20px_-2px_rgba(24,119,242,0.65)] transition-shadow">
              <FacebookSvg className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:scale-110" />
            </span>
          </a>
        )}

        {cleanIg && (
          <a
            href={cleanIg}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={igLabel}
            title="Instagram"
            className="group relative inline-flex items-center justify-center w-9 h-9 rounded-full p-[1.5px] transition-all duration-300 hover:-translate-y-1 hover:scale-110 hover:rotate-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DD2A7B]"
          >
            {/* Rotating aurora gradient halo */}
            <span
              aria-hidden="true"
              className="social-orb-ring absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#F58529,#DD2A7B,#8134AF,#515BD4,#F58529)] opacity-80 group-hover:opacity-100 blur-[0.5px] transition-opacity"
            />
            <span className="social-sheen relative overflow-hidden w-full h-full rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white flex items-center justify-center shadow-sm group-hover:shadow-[0_6px_20px_-2px_rgba(221,42,123,0.65)] transition-shadow">
              <InstagramSvg className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:scale-110" />
            </span>
          </a>
        )}
      </div>
    );
  }

  if (variant === 'mobile-drawer') {
    return (
      <div className="space-y-2.5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500 block">
          {isVi ? 'Kết Nối Mạng Xã Hội' : 'Follow Our Socials'}
        </span>
        <div className="grid grid-cols-2 gap-2.5">
          {cleanFb && (
            <a
              href={cleanFb}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={fbLabel}
              className="social-sheen relative overflow-hidden flex items-center justify-center gap-2 min-h-[46px] px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#1877F2] to-[#0A52C4] text-white text-xs font-semibold shadow-md active:scale-95 transition-transform"
            >
              <FacebookSvg className="w-4 h-4 shrink-0" />
              <span>Facebook</span>
            </a>
          )}
          {cleanIg && (
            <a
              href={cleanIg}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={igLabel}
              className="social-sheen relative overflow-hidden flex items-center justify-center gap-2 min-h-[46px] px-3 py-2.5 rounded-xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white text-xs font-semibold shadow-md active:scale-95 transition-transform"
            >
              <InstagramSvg className="w-4 h-4 shrink-0" />
              <span>Instagram</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  // Footer & CMS Preview variant
  return (
    <div className="flex flex-wrap items-center gap-3 pt-1" aria-label={isVi ? 'Mạng xã hội' : 'Social Media'}>
      {cleanFb && (
        <a
          href={cleanFb}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={fbLabel}
          className="group relative inline-flex items-center gap-2.5 rounded-full p-[1.5px] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
        >
          <span
            aria-hidden="true"
            className="social-orb-ring absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#1877F2,#38BDF8,#60A5FA,#1877F2)] opacity-75 group-hover:opacity-100 transition-opacity"
          />
          <span className="social-sheen relative overflow-hidden inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#1877F2] via-[#1262D6] to-[#0B4BB3] px-4 py-2 min-h-[40px] text-xs font-semibold text-white shadow-md group-hover:shadow-[0_8px_24px_-4px_rgba(24,119,242,0.7)] transition-shadow">
            <FacebookSvg className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:rotate-[-10deg] group-hover:scale-110" />
            <span>Facebook</span>
            <ExternalLink className="w-3 h-3 opacity-75 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </a>
      )}

      {cleanIg && (
        <a
          href={cleanIg}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={igLabel}
          className="group relative inline-flex items-center gap-2.5 rounded-full p-[1.5px] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DD2A7B]"
        >
          <span
            aria-hidden="true"
            className="social-orb-ring absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#F58529,#DD2A7B,#8134AF,#515BD4,#F58529)] opacity-80 group-hover:opacity-100 transition-opacity"
          />
          <span className="social-sheen relative overflow-hidden inline-flex items-center gap-2 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] px-4 py-2 min-h-[40px] text-xs font-semibold text-white shadow-md group-hover:shadow-[0_8px_24px_-4px_rgba(221,42,123,0.7)] transition-shadow">
            <InstagramSvg className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:rotate-[10deg] group-hover:scale-110" />
            <span>Instagram</span>
            <ExternalLink className="w-3 h-3 opacity-75 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </a>
      )}
    </div>
  );
}

interface FloatingSocialDockProps {
  facebookUrl?: string;
  instagramUrl?: string;
  locale?: string;
  brandName?: string;
}

/**
 * Floating Social Dock visible across BOTH Homepage and all Portal subpages.
 * Responsive for mobile (44px ergonomic touch targets) and desktop (luxury hover tooltip expansion).
 */
export function FloatingSocialDock({
  facebookUrl,
  instagramUrl,
  locale = 'vi',
  brandName = 'Glamour Nails Sydney',
}: FloatingSocialDockProps) {
  const isVi = locale === 'vi';
  const cleanFb = (facebookUrl || '').trim();
  const cleanIg = (instagramUrl || '').trim();

  if (!cleanFb && !cleanIg) return null;

  return (
    <aside
      aria-label={isVi ? 'Liên kết mạng xã hội nhanh' : 'Quick Social Media Links'}
      className="fixed right-3 bottom-4 sm:right-5 sm:bottom-6 z-30 flex flex-col items-end gap-3 pointer-events-none"
    >
      {cleanFb && (
        <a
          href={cleanFb}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={
            isVi ? `Mở trang Facebook của ${brandName}` : `Visit ${brandName} on Facebook`
          }
          className="social-float pointer-events-auto group relative flex items-center gap-2.5 focus-visible:outline-none"
        >
          {/* Expanding glass tooltip on desktop hover */}
          <span className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-950/90 backdrop-blur-md text-white text-xs font-semibold border border-[#38BDF8]/40 shadow-xl opacity-0 translate-x-3 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
            <span>Facebook</span>
            <span className="text-[10px] text-sky-300 font-normal">
              • {isVi ? 'Kết nối ngay' : 'Follow Us'}
            </span>
          </span>

          {/* Orb Icon Container */}
          <span className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full p-[2px] transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6 active:scale-95">
            {/* Pulse Aura */}
            <span
              aria-hidden="true"
              className="social-pulse-aura absolute inset-0 rounded-full bg-[#1877F2]/50"
            />
            {/* Spinning Conic Halo */}
            <span
              aria-hidden="true"
              className="social-orb-ring absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#1877F2,#38BDF8,#93C5FD,#1877F2)]"
            />
            {/* Glossy Core */}
            <span className="social-sheen relative overflow-hidden w-full h-full rounded-full bg-gradient-to-br from-[#1877F2] via-[#1262D6] to-[#083E96] text-white flex items-center justify-center shadow-[0_10px_25px_-5px_rgba(24,119,242,0.75)]">
              <FacebookSvg className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:scale-110" />
            </span>
          </span>
        </a>
      )}

      {cleanIg && (
        <a
          href={cleanIg}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={
            isVi ? `Mở trang Instagram của ${brandName}` : `Visit ${brandName} on Instagram`
          }
          className="social-float-delayed pointer-events-auto group relative flex items-center gap-2.5 focus-visible:outline-none"
        >
          {/* Expanding glass tooltip on desktop hover */}
          <span className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-950/90 backdrop-blur-md text-white text-xs font-semibold border border-[#DD2A7B]/45 shadow-xl opacity-0 translate-x-3 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F58529] animate-pulse" />
            <span>Instagram</span>
            <span className="text-[10px] text-pink-300 font-normal">
              • {isVi ? 'Xem mẫu mới' : 'Daily Lookbook'}
            </span>
          </span>

          {/* Orb Icon Container */}
          <span className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full p-[2px] transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 active:scale-95">
            {/* Pulse Aura */}
            <span
              aria-hidden="true"
              className="social-pulse-aura absolute inset-0 rounded-full bg-[#DD2A7B]/50"
            />
            {/* Spinning Conic Halo */}
            <span
              aria-hidden="true"
              className="social-orb-ring absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#F58529,#DD2A7B,#8134AF,#515BD4,#F58529)]"
            />
            {/* Glossy Core */}
            <span className="social-sheen relative overflow-hidden w-full h-full rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white flex items-center justify-center shadow-[0_10px_25px_-5px_rgba(221,42,123,0.75)]">
              <InstagramSvg className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:scale-110" />
            </span>
          </span>
        </a>
      )}
    </aside>
  );
}
