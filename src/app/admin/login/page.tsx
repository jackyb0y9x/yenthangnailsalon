'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { useAdminLanguage } from '@/lib/i18n/AdminLanguageContext';

export default function AdminLoginPage() {
  const router = useRouter();
  const { locale } = useAdminLanguage();
  const isVi = locale === 'vi';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        body: JSON.stringify({
          username: username.trim(),
          email: username.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(
          isVi
            ? 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.'
            : data.error || 'Failed to authenticate. Please check your credentials.'
        );
        setLoading(false);
        return;
      }

      router.push('/admin/dashboard');
      router.refresh();
    } catch {
      setError(
        isVi
          ? 'Đã xảy ra lỗi kết nối mạng. Vui lòng thử lại.'
          : 'An unexpected network error occurred. Please try again.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md space-y-7 bg-slate-900 border border-slate-800 rounded-2xl p-7 sm:p-8 shadow-2xl">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-champagne-400 text-slate-950 font-bold shadow-lg shadow-champagne-400/20">
            <Sparkles className="w-6 h-6 text-slate-950" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-tight">
            {isVi ? 'Đăng Nhập Quản Trị' : 'Admin Portal Sign In'}
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            {isVi
              ? 'Hệ thống quản trị nội bộ & vận hành Salon'
              : 'Secure Staff & Operations Management'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-950/60 border border-red-800/80 p-3.5 text-xs text-red-200 flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {/* Clean Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="admin-username"
              className="block text-xs font-medium text-slate-300"
            >
              {isVi ? 'Tài khoản hoặc Email' : 'Username or Email'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                id="admin-username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isVi ? 'Nhập tài khoản đăng nhập...' : 'Enter username or email...'}
                required
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-champagne-400 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="admin-password"
              className="block text-xs font-medium text-slate-300"
            >
              {isVi ? 'Mật khẩu' : 'Password'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="admin-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-champagne-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword
                    ? isVi
                      ? 'Ẩn mật khẩu'
                      : 'Hide password'
                    : isVi
                    ? 'Hiện mật khẩu'
                    : 'Show password'
                }
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-champagne-400 hover:bg-champagne-300 text-slate-950 font-semibold text-sm shadow-md transition-all disabled:opacity-50"
          >
            <span>
              {loading
                ? isVi
                  ? 'Đang xác thực...'
                  : 'Authenticating...'
                : isVi
                ? 'Đăng Nhập Hệ Thống'
                : 'Sign In to Portal'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Subtle Security Footer */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80" />
          <span>
            {isVi
              ? 'Kết nối bảo mật • Chỉ dành cho quản trị viên được cấp quyền'
              : 'Protected Access • Authorized Personnel Only'}
          </span>
        </div>
      </div>
    </div>
  );
}
