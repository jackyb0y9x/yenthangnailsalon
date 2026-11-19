import React from 'react';

interface HeartParticle {
  id: number;
  left: string;
  size: number;
  fallDuration: string;
  fallDelay: string;
  twinkleDuration: string;
  twinkleDelay: string;
  swayPx: string;
  color: string;
  glowColor: string;
  desktopOnly?: boolean;
}

/**
 * Deterministic heart particles (SSR/hydration-safe, zero Math.random mismatch).
 * Uses Rose Gold, Soft Blush Pink, Pearl Rose & Champagne Gold tones matching the salon palette.
 */
const HEART_PARTICLES: HeartParticle[] = [
  { id: 1, left: '4%', size: 15, fallDuration: '14s', fallDelay: '-2s', twinkleDuration: '2.6s', twinkleDelay: '0s', swayPx: '18px', color: '#fb7185', glowColor: 'rgba(251,113,133,0.65)' },
  { id: 2, left: '10%', size: 11, fallDuration: '18s', fallDelay: '-9s', twinkleDuration: '3.2s', twinkleDelay: '-0.8s', swayPx: '-16px', color: '#f9a8d4', glowColor: 'rgba(249,168,212,0.65)', desktopOnly: true },
  { id: 3, left: '16%', size: 18, fallDuration: '16s', fallDelay: '-5s', twinkleDuration: '2.8s', twinkleDelay: '-1.3s', swayPx: '22px', color: '#f472b6', glowColor: 'rgba(244,114,182,0.65)' },
  { id: 4, left: '23%', size: 12, fallDuration: '20s', fallDelay: '-13s', twinkleDuration: '3.5s', twinkleDelay: '-0.4s', swayPx: '-20px', color: '#fda4af', glowColor: 'rgba(253,164,175,0.6)', desktopOnly: true },
  { id: 5, left: '29%', size: 14, fallDuration: '15s', fallDelay: '-7s', twinkleDuration: '2.4s', twinkleDelay: '-1.7s', swayPx: '16px', color: '#eab308', glowColor: 'rgba(234,179,8,0.55)' },
  { id: 6, left: '35%', size: 17, fallDuration: '19s', fallDelay: '-15s', twinkleDuration: '3.0s', twinkleDelay: '-0.6s', swayPx: '-24px', color: '#fb7185', glowColor: 'rgba(251,113,133,0.65)', desktopOnly: true },
  { id: 7, left: '42%', size: 12, fallDuration: '13.5s', fallDelay: '-4s', twinkleDuration: '2.5s', twinkleDelay: '-1.1s', swayPx: '15px', color: '#f43f5e', glowColor: 'rgba(244,63,94,0.6)' },
  { id: 8, left: '48%', size: 16, fallDuration: '17.5s', fallDelay: '-11s', twinkleDuration: '3.3s', twinkleDelay: '-2.0s', swayPx: '-18px', color: '#f9a8d4', glowColor: 'rgba(249,168,212,0.7)', desktopOnly: true },
  { id: 9, left: '54%', size: 13, fallDuration: '15.5s', fallDelay: '-1s', twinkleDuration: '2.7s', twinkleDelay: '-0.5s', swayPx: '20px', color: '#fda4af', glowColor: 'rgba(253,164,175,0.65)' },
  { id: 10, left: '61%', size: 19, fallDuration: '21s', fallDelay: '-16s', twinkleDuration: '3.6s', twinkleDelay: '-1.4s', swayPx: '-22px', color: '#f472b6', glowColor: 'rgba(244,114,182,0.65)', desktopOnly: true },
  { id: 11, left: '67%', size: 12, fallDuration: '14.5s', fallDelay: '-8s', twinkleDuration: '2.3s', twinkleDelay: '-0.9s', swayPx: '17px', color: '#fb7185', glowColor: 'rgba(251,113,133,0.65)' },
  { id: 12, left: '73%', size: 15, fallDuration: '18.5s', fallDelay: '-12s', twinkleDuration: '3.1s', twinkleDelay: '-1.8s', swayPx: '-19px', color: '#eab308', glowColor: 'rgba(234,179,8,0.55)', desktopOnly: true },
  { id: 13, left: '79%', size: 16, fallDuration: '16.5s', fallDelay: '-3.5s', twinkleDuration: '2.9s', twinkleDelay: '-0.2s', swayPx: '21px', color: '#f43f5e', glowColor: 'rgba(244,63,94,0.6)' },
  { id: 14, left: '84%', size: 11, fallDuration: '19.5s', fallDelay: '-14s', twinkleDuration: '3.4s', twinkleDelay: '-1.5s', swayPx: '-15px', color: '#f9a8d4', glowColor: 'rgba(249,168,212,0.7)', desktopOnly: true },
  { id: 15, left: '89%', size: 17, fallDuration: '15s', fallDelay: '-6.5s', twinkleDuration: '2.6s', twinkleDelay: '-1.0s', swayPx: '18px', color: '#fb7185', glowColor: 'rgba(251,113,133,0.65)' },
  { id: 16, left: '95%', size: 13, fallDuration: '17s', fallDelay: '-10s', twinkleDuration: '2.8s', twinkleDelay: '-0.3s', swayPx: '-16px', color: '#f472b6', glowColor: 'rgba(244,114,182,0.65)' },
  { id: 17, left: '19%', size: 10, fallDuration: '22s', fallDelay: '-18s', twinkleDuration: '2.4s', twinkleDelay: '-0.7s', swayPx: '14px', color: '#f472b6', glowColor: 'rgba(244,114,182,0.6)', desktopOnly: true },
  { id: 18, left: '58%', size: 11, fallDuration: '16s', fallDelay: '-13.5s', twinkleDuration: '2.5s', twinkleDelay: '-1.9s', swayPx: '-14px', color: '#fb7185', glowColor: 'rgba(251,113,133,0.6)', desktopOnly: true },
];

export function FallingHeartsEffect() {
  return (
    <div
      aria-hidden="true"
      className="falling-hearts-layer fixed inset-0 z-30 pointer-events-none overflow-hidden select-none"
    >
      {HEART_PARTICLES.map((heart) => (
        <span
          key={heart.id}
          className={`falling-heart-drop absolute -top-10 ${heart.desktopOnly ? 'hidden sm:block' : 'block'}`}
          style={{
            left: heart.left,
            animationDuration: heart.fallDuration,
            animationDelay: heart.fallDelay,
          }}
        >
          <span
            className="falling-heart-twinkle block"
            style={
              {
                '--heart-sway': heart.swayPx,
                animationDuration: heart.twinkleDuration,
                animationDelay: heart.twinkleDelay,
                filter: `drop-shadow(0 0 6px ${heart.glowColor})`,
              } as React.CSSProperties
            }
          >
            <svg
              width={heart.size}
              height={heart.size}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill={heart.color}
              />
              {/* Soft crystal highlight glint */}
              <circle cx="8.2" cy="7.6" r="1.4" fill="rgba(255,255,255,0.65)" />
            </svg>
          </span>
        </span>
      ))}
    </div>
  );
}
