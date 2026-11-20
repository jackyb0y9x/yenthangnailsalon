'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';

interface HeroTrustMetricsProps {
  statClientsLabel: string;
  statRatingLabel: string;
  statHygieneLabel: string;
}

interface AnimatedMetricConfig {
  id: string;
  target: number;
  decimals: number;
  suffix: string;
  useComma?: boolean;
  showStar?: boolean;
  durationMs: number;
  delayMs: number;
  label: string;
}

function formatMetricValue(
  value: number,
  decimals: number,
  suffix: string,
  useComma?: boolean
): string {
  if (decimals > 0) {
    return `${value.toFixed(decimals)}${suffix}`;
  }
  const rounded = Math.round(value);
  return `${useComma ? rounded.toLocaleString('en-US') : rounded}${suffix}`;
}

export function HeroTrustMetrics({
  statClientsLabel,
  statRatingLabel,
  statHygieneLabel,
}: HeroTrustMetricsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [progresses, setProgresses] = useState<[number, number, number]>([0, 0, 0]);

  const metrics: AnimatedMetricConfig[] = [
    {
      id: 'clients',
      target: 15000,
      decimals: 0,
      suffix: '+',
      useComma: true,
      durationMs: 1850,
      delayMs: 0,
      label: statClientsLabel,
    },
    {
      id: 'rating',
      target: 4.9,
      decimals: 1,
      suffix: '',
      showStar: true,
      durationMs: 1650,
      delayMs: 140,
      label: statRatingLabel,
    },
    {
      id: 'hygiene',
      target: 100,
      decimals: 0,
      suffix: '%',
      durationMs: 1750,
      delayMs: 280,
      label: statHygieneLabel,
    },
  ];

  // Respect prefers-reduced-motion accessibility preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  // Trigger animation when scrolled into viewport (and reset when scrolled completely away)
  useEffect(() => {
    if (reducedMotion) {
      setInView(true);
      setProgresses([1, 1, 1]);
      return;
    }

    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setInView(true);
        } else if (entry.intersectionRatio === 0) {
          setInView(false);
          setProgresses([0, 0, 0]);
        }
      },
      { threshold: [0, 0.25] }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reducedMotion]);

  // Smooth count-up from 0 + synchronized scale growth (small -> large)
  useEffect(() => {
    if (reducedMotion) {
      setProgresses([1, 1, 1]);
      return;
    }
    if (!inView) {
      setProgresses([0, 0, 0]);
      return;
    }

    let rafId = 0;
    const startTime = performance.now();
    const durations = [1850, 1650, 1750];
    const delays = [0, 140, 280];

    const step = (now: number) => {
      const elapsed = now - startTime;
      const next: [number, number, number] = [0, 0, 0];
      let allDone = true;

      for (let i = 0; i < 3; i++) {
        const localElapsed = Math.max(0, elapsed - delays[i]);
        const rawT = Math.min(1, localElapsed / durations[i]);
        // Cubic ease-out for silky smooth deceleration
        const eased = 1 - Math.pow(1 - rawT, 3);
        next[i] = eased;
        if (rawT < 1) allDone = false;
      }

      setProgresses(next);

      if (!allDone) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [inView, reducedMotion]);

  return (
    <div
      ref={containerRef}
      className="pt-6 sm:pt-12 grid grid-cols-3 gap-2 sm:gap-6 max-w-3xl mx-auto text-center"
    >
      {metrics.map((metric, idx) => {
        const p = reducedMotion ? 1 : progresses[idx];
        const currentValue = metric.target * p;
        const formatted = formatMetricValue(
          currentValue,
          metric.decimals,
          metric.suffix,
          metric.useComma
        );
        const finalFormatted = formatMetricValue(
          metric.target,
          metric.decimals,
          metric.suffix,
          metric.useComma
        );

        // Smooth scale growth from 0.52 (small) -> 1.0 (full size) synced with count-up
        const numberScale = reducedMotion ? 1 : 0.52 + 0.48 * p;
        const cardScale = reducedMotion ? 1 : 0.88 + 0.12 * p;
        const cardOpacity = reducedMotion ? 1 : 0.35 + 0.65 * p;

        return (
          <div
            key={metric.id}
            style={{
              transform: `scale(${cardScale.toFixed(4)})`,
              opacity: cardOpacity,
            }}
            className="bg-black/35 backdrop-blur-md p-3 sm:p-5 rounded-2xl border border-white/15 shadow-lg will-change-transform"
          >
            <p
              aria-label={finalFormatted}
              style={{
                transform: `scale(${numberScale.toFixed(4)})`,
                transformOrigin: 'center center',
              }}
              className="font-serif text-lg sm:text-3xl font-bold text-champagne-200 tabular-nums inline-flex items-center justify-center gap-1 will-change-transform"
            >
              <span>{formatted}</span>
              {metric.showStar && (
                <Star
                  className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 fill-amber-400 inline shrink-0"
                  style={{
                    transform: `rotate(${((1 - p) * -90).toFixed(1)}deg)`,
                  }}
                />
              )}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-300 font-medium mt-1 leading-snug">
              {metric.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
