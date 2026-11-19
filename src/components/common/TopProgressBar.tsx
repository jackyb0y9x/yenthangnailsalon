'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function startGlobalLoading() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:loading:start'));
  }
}

export function stopGlobalLoading() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:loading:stop'));
  }
}

function TopProgressBarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const activeRequests = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startProgress = () => {
    setVisible(true);
    setProgress((prev) => (prev === 0 ? 25 : prev));

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setProgress((old) => {
        if (old < 60) return old + Math.random() * 15;
        if (old < 85) return old + Math.random() * 6;
        if (old < 95) return old + 0.5;
        return old;
      });
    }, 120);
  };

  const finishProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);

    setTimeout(() => {
      setVisible(false);
      setTimeout(() => setProgress(0), 200);
    }, 250);
  };

  // 1. Trigger on route / pathname changes
  useEffect(() => {
    startProgress();
    const t = setTimeout(() => {
      finishProgress();
    }, 200);
    return () => clearTimeout(t);
  }, [pathname, searchParams]);

  // 2. Intercept custom loading events & client-side fetch calls
  useEffect(() => {
    const handleStart = () => {
      activeRequests.current++;
      startProgress();
    };

    const handleStop = () => {
      activeRequests.current = Math.max(0, activeRequests.current - 1);
      if (activeRequests.current === 0) {
        finishProgress();
      }
    };

    window.addEventListener('app:loading:start', handleStart);
    window.addEventListener('app:loading:stop', handleStop);

    // Auto-intercept global window.fetch on the client
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      handleStart();
      try {
        const response = await originalFetch(...args);
        return response;
      } finally {
        handleStop();
      }
    };

    return () => {
      window.removeEventListener('app:loading:start', handleStart);
      window.removeEventListener('app:loading:stop', handleStop);
      window.fetch = originalFetch;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[999999] pointer-events-none transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="h-[3px] bg-gradient-to-r from-champagne-300 via-purple-500 to-pink-500 shadow-[0_0_12px_rgba(234,179,8,0.7)] transition-all duration-200 ease-out relative"
        style={{ width: `${progress}%` }}
      >
        {/* Leading edge glow effect */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-16 h-4 bg-champagne-300/80 rounded-full blur-sm" />
      </div>
    </div>
  );
}

export function TopProgressBar() {
  return (
    <React.Suspense fallback={null}>
      <TopProgressBarContent />
    </React.Suspense>
  );
}
