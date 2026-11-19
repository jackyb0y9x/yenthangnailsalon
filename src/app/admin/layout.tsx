import React from 'react';
import { cookies } from 'next/headers';
import { AdminNav } from '@/components/admin/AdminNav';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminLanguageProvider } from '@/lib/i18n/AdminLanguageContext';

export const metadata = {
  title: 'Admin Portal | Glamour Nails Sydney',
  description: 'Internal Management and CMS Administration Portal',
  robots: 'noindex, nofollow',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sbAuth = cookieStore.get('sb-authenticated')?.value;
  const role = cookieStore.get('sb-role')?.value || 'staff';
  const email = cookieStore.get('sb-email')?.value || '';

  const hasToken = cookieStore
    .getAll()
    .some((c) => (c.name.startsWith('sb-') && c.name.endsWith('-auth-token')) || c.name === 'sb-access-token');

  const isAuthenticated = sbAuth === 'true' || (sbAuth !== 'false' && hasToken);

  // If not authenticated, render bare children (allows /admin/login to render cleanly)
  if (!isAuthenticated) {
    return (
      <AdminLanguageProvider>
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center">
          {children}
        </div>
      </AdminLanguageProvider>
    );
  }

  // Authenticated admin shell with bilingual support
  return (
    <AdminLanguageProvider>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
        <React.Suspense fallback={<aside className="w-full md:w-64 bg-slate-900 min-h-screen shrink-0" />}>
          <AdminNav role={role} userEmail={email} />
        </React.Suspense>
        <main className="flex-1 bg-slate-950 min-h-screen overflow-y-auto">
          <AdminHeader />
          <div className="p-6 md:p-8 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </AdminLanguageProvider>
  );
}
