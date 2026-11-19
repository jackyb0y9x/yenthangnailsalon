'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to authenticate. Please check your credentials.');
        setLoading(false);
        return;
      }

      router.push('/admin/dashboard');
      router.refresh();
    } catch {
      setError('An unexpected network error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleQuickFill = (roleEmail: string, rolePassword?: string) => {
    setEmail(roleEmail);
    if (rolePassword) {
      setPassword(rolePassword);
    } else if (roleEmail.includes('manager')) {
      setPassword('SalonManager2026!');
    } else if (roleEmail.includes('technician')) {
      setPassword('SalonTech2026!');
    } else {
      setPassword('SalonAdmin2026!');
    }
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md space-y-8 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-champagne-400 text-slate-950 font-bold shadow-lg shadow-champagne-400/20">
            <Sparkles className="w-6 h-6 text-slate-950" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-tight">
            Glamour Nails Admin Portal
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Secure Staff & Operations Management • Sydney CBD
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-lg bg-red-950/60 border border-red-800/80 p-3.5 text-xs text-red-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Staff Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@glamournails.com.au"
                required
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-champagne-400 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-champagne-400 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-champagne-400 hover:bg-champagne-300 text-slate-950 font-semibold text-sm shadow-md transition-all disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Fill Credentials for Testing / Verification */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2">
          <p className="text-[11px] text-slate-500 text-center uppercase tracking-wider font-mono">
            Demo Roster Quick Sign-In
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin@glamournails.com.au', 'SalonAdmin2026!')}
              className="px-2 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 text-center truncate"
            >
              Super Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('manager@glamournails.com.au', 'SalonManager2026!')}
              className="px-2 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-center truncate"
            >
              Manager
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('technician@glamournails.com.au', 'SalonTech2026!')}
              className="px-2 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-center truncate"
            >
              Technician
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
