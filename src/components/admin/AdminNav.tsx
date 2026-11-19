'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  FileEdit,
  Users,
  UserCheck,
  DollarSign,
  LogOut,
  Lock,
  Sparkles,
  Megaphone,
  Scissors,
  Image as ImageIcon,
  Clock,
  MapPin,
  Bell,
  BookOpen,
  KeyRound,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { canAccessFinance } from '@/lib/auth/roles';
import { useAdminLanguage } from '@/lib/i18n/AdminLanguageContext';
import { ChangePasswordModal } from '@/components/admin/ChangePasswordModal';

interface AdminNavProps {
  role?: string;
  userEmail?: string;
}

export function AdminNav({ role = 'manager', userEmail = '' }: AdminNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, locale } = useAdminLanguage();
  const hasFinanceAccess = canAccessFinance(role);

  const currentTab = searchParams.get('tab') || 'hero';
  const isCmsPath = pathname === '/admin/cms' || pathname.startsWith('/admin/cms/');
  const [cmsExpanded, setCmsExpanded] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const cmsSubItems = [
    {
      id: 'hero',
      label: locale === 'vi' ? 'Banner Trang Chủ' : 'Hero Banner',
      icon: Sparkles,
    },
    {
      id: 'announcement',
      label: locale === 'vi' ? 'Thanh Thông Báo' : 'Announcement Bar',
      icon: Megaphone,
    },
    {
      id: 'services',
      label: locale === 'vi' ? 'Danh Mục Dịch Vụ' : 'Service Catalog',
      icon: Scissors,
    },
    {
      id: 'gallery',
      label: locale === 'vi' ? 'Bộ Sưu Tập Mẫu Móng' : 'Lookbook Gallery',
      icon: ImageIcon,
    },
    {
      id: 'about-story',
      label: locale === 'vi' ? 'Câu Chuyện (/about)' : 'About Story (/about)',
      icon: BookOpen,
    },
    {
      id: 'hours',
      label: locale === 'vi' ? 'Giờ Mở Cửa & Nghỉ Lễ' : 'Hours & Holidays',
      icon: Clock,
    },
    {
      id: 'business',
      label: locale === 'vi' ? 'Thông Tin Tiệm, MXH & Bản Đồ' : 'Salon Info, Social & Maps',
      icon: MapPin,
    },
    {
      id: 'notifications',
      label: locale === 'vi' ? 'Thông Báo Telegram & Instagram' : 'Telegram & Instagram Alerts',
      icon: Bell,
    },
  ];

  const navItems = [
    {
      href: '/admin/dashboard',
      label: t.nav.overview,
      icon: LayoutDashboard,
      disabled: false,
    },
    {
      href: '/admin/cms',
      label: t.nav.cms,
      icon: FileEdit,
      disabled: false,
      isCms: true,
    },
    {
      href: '/admin/customers',
      label: t.nav.customers,
      icon: Users,
      disabled: false,
    },
    {
      href: '/admin/staff',
      label: t.nav.staff,
      icon: UserCheck,
      disabled: false,
    },
    {
      href: '/admin/finance',
      label: t.nav.finance,
      icon: DollarSign,
      disabled: !hasFinanceAccess,
      badge: !hasFinanceAccess ? t.nav.lockedBadge : undefined,
    },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <aside className="w-full md:w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-champagne-400 text-slate-900 font-bold flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-slate-900" />
          </div>
          <div>
            <h2 className="font-serif font-bold text-base text-white tracking-tight leading-tight">
              Glamour Nails
            </h2>
            <p className="text-[11px] text-champagne-300 font-mono tracking-wider uppercase">
              Admin Portal
            </p>
          </div>
        </div>

        {/* User Card */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div className="truncate mr-2">
            <p className="text-slate-300 font-medium truncate">{userEmail || 'Admin User'}</p>
            <p className="text-[10px] text-slate-400 capitalize">{role.replace('_', ' ')}</p>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
              role === 'super_admin'
                ? 'bg-purple-900/60 text-purple-200 border border-purple-700'
                : role === 'manager'
                ? 'bg-amber-900/60 text-amber-200 border border-amber-700'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            {role}
          </span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 cursor-not-allowed bg-slate-900/50"
                title={t.nav.staffLockedNotice}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-slate-600" />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                  <Lock className="w-3 h-3" />
                  <span>{item.badge}</span>
                </div>
              </div>
            );
          }

          if (item.isCms) {
            return (
              <div key={item.href} className="space-y-1">
                <div
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isCmsPath
                      ? 'bg-slate-800/90 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Link
                    href={`/admin/cms?tab=${currentTab}`}
                    className="flex items-center gap-3 flex-1"
                  >
                    <Icon
                      className={`w-4 h-4 ${isCmsPath ? 'text-champagne-300' : 'text-slate-400'}`}
                    />
                    <span>{item.label}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setCmsExpanded(!cmsExpanded);
                    }}
                    className="p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-white transition-colors"
                    aria-label="Toggle CMS Submenu"
                  >
                    {cmsExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-champagne-300" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </div>

                {/* Vertical Submenu under Quản trị CMS */}
                {cmsExpanded && (
                  <div className="ml-4 pl-3 border-l-2 border-slate-800 space-y-0.5 py-1">
                    {cmsSubItems.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive = isCmsPath && currentTab === sub.id;
                      return (
                        <Link
                          key={sub.id}
                          href={`/admin/cms?tab=${sub.id}`}
                          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                            isSubActive
                              ? 'bg-champagne-400/20 text-champagne-300 font-semibold shadow-sm border border-champagne-500/30'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                          }`}
                        >
                          <SubIcon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isSubActive ? 'text-champagne-300' : 'text-slate-500'
                            }`}
                          />
                          <span className="truncate">{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-salon-700 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${isActive ? 'text-champagne-300' : 'text-slate-400'}`}
                />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Account Actions: Change Password & Sign Out */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <button
          type="button"
          onClick={() => setIsPasswordModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-champagne-300 hover:bg-slate-800 hover:text-champagne-200 transition-colors border border-slate-700/80"
        >
          <KeyRound className="w-4 h-4" />
          <span>{locale === 'vi' ? 'Đổi Mật Khẩu' : 'Change Password'}</span>
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors border border-red-900/30"
        >
          <LogOut className="w-4 h-4" />
          <span>{t.nav.signOut}</span>
        </button>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        userEmail={userEmail}
        role={role}
      />
    </aside>
  );
}
