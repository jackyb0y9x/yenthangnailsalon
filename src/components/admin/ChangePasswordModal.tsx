'use client';

import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  X,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAdminLanguage } from '@/lib/i18n/AdminLanguageContext';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  role?: string;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  userEmail = '',
  role = '',
}: ChangePasswordModalProps) {
  const { locale } = useAdminLanguage();
  const isVi = locale === 'vi';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleClose = () => {
    resetForm();
    setError(null);
    setSuccess(null);
    onClose();
  };

  if (!isOpen) return null;

  const isLengthOk = newPassword.length >= 8;
  const isMatchOk = Boolean(newPassword) && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword.trim()) {
      setError(isVi ? 'Vui lòng nhập mật khẩu hiện tại.' : 'Please enter your current password.');
      return;
    }

    if (newPassword.length < 8) {
      setError(
        isVi
          ? 'Mật khẩu mới phải có ít nhất 8 ký tự.'
          : 'New password must be at least 8 characters long.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        isVi
          ? 'Mật khẩu xác nhận không khớp với mật khẩu mới.'
          : 'Confirm password does not match new password.'
      );
      return;
    }

    if (newPassword === currentPassword) {
      setError(
        isVi
          ? 'Mật khẩu mới phải khác mật khẩu hiện tại.'
          : 'New password must be different from current password.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(
          data.error ||
            (isVi
              ? 'Cập nhật mật khẩu thất bại. Vui lòng thử lại.'
              : 'Failed to update password. Please try again.')
        );
        return;
      }

      resetForm();
      setSuccess(
        isVi
          ? 'Đã cập nhật mật khẩu thành công! Mật khẩu mới sẽ có hiệu lực ngay từ lần đăng nhập tiếp theo.'
          : 'Password updated successfully! Your new password is active immediately.'
      );
    } catch {
      setError(
        isVi
          ? 'Lỗi kết nối máy chủ. Vui lòng thử lại.'
          : 'Network error. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
    >
      <div className="fixed inset-0" onClick={handleClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-champagne-400/15 border border-champagne-400/30 text-champagne-300 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="change-password-title"
                className="text-sm font-serif font-bold text-white"
              >
                {isVi ? 'Cập Nhật Mật Khẩu Tài Khoản' : 'Update Account Password'}
              </h3>
              {userEmail && (
                <p className="text-[11px] text-slate-400 font-mono">
                  {userEmail}
                  {role ? ` • ${role}` : ''}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label={isVi ? 'Đóng hộp thoại' : 'Close dialog'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-950/70 border border-red-800 p-3 text-xs text-red-200 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-lg bg-emerald-950/70 border border-emerald-800 p-3 text-xs text-emerald-200 flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Current Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="cp-current"
              className="block text-xs font-medium text-slate-300"
            >
              {isVi ? 'Mật khẩu hiện tại' : 'Current Password'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="cp-current"
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:border-champagne-400 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                aria-label="Toggle current password visibility"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="cp-new"
              className="block text-xs font-medium text-slate-300"
            >
              {isVi ? 'Mật khẩu mới' : 'New Password'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="cp-new"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder={isVi ? 'Tối thiểu 8 ký tự...' : 'Minimum 8 characters...'}
                className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:border-champagne-400 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                aria-label="Toggle new password visibility"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="cp-confirm"
              className="block text-xs font-medium text-slate-300"
            >
              {isVi ? 'Nhập lại mật khẩu mới' : 'Confirm New Password'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="cp-confirm"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder={isVi ? 'Nhập lại mật khẩu mới...' : 'Re-enter new password...'}
                className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:border-champagne-400 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                aria-label="Toggle confirm password visibility"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password Requirements Indicators */}
          <div className="rounded-lg bg-slate-950/80 border border-slate-800/80 p-3 space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <ShieldCheck
                className={`w-3.5 h-3.5 ${
                  isLengthOk ? 'text-emerald-400' : 'text-slate-600'
                }`}
              />
              <span className={isLengthOk ? 'text-emerald-300' : 'text-slate-400'}>
                {isVi ? 'Độ dài từ 8 ký tự trở lên' : 'At least 8 characters long'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck
                className={`w-3.5 h-3.5 ${
                  isMatchOk ? 'text-emerald-400' : 'text-slate-600'
                }`}
              />
              <span className={isMatchOk ? 'text-emerald-300' : 'text-slate-400'}>
                {isVi ? 'Mật khẩu xác nhận trùng khớp' : 'Confirmation matches new password'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              {isVi ? 'Đóng' : 'Close'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-champagne-400 hover:bg-champagne-300 text-slate-950 text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>
                {loading
                  ? isVi
                    ? 'Đang lưu...'
                    : 'Updating...'
                  : isVi
                  ? 'Lưu Mật Khẩu Mới'
                  : 'Update Password'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
