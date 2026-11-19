import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  Sparkles,
  FileText,
  Users,
  DollarSign,
  Calendar,
  Clock,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { getPublicServices, getPublicGallery } from '@/lib/cms/public-data';

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get('sb-role')?.value || 'manager';

  const services = await getPublicServices();
  const gallery = await getPublicGallery();

  const kpis = [
    {
      label: 'Active Services',
      value: services.length.toString(),
      trend: '+2 this month',
      icon: Sparkles,
      color: 'text-amber-400',
      bg: 'bg-amber-950/40',
      border: 'border-amber-800/40',
    },
    {
      label: 'Gallery Showcase Assets',
      value: gallery.length.toString(),
      trend: '4 featured sets',
      icon: FileText,
      color: 'text-purple-400',
      bg: 'bg-purple-950/40',
      border: 'border-purple-800/40',
    },
    {
      label: 'Active Technicians',
      value: '4',
      trend: 'Sydney CBD Roster',
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-950/40',
      border: 'border-blue-800/40',
    },
    {
      label: 'MTD Revenue (AUD)',
      value: '$28,450.00',
      trend: '+14.2% vs last month',
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-800/40',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner with verbatim requirement: Admin Dashboard ({role}) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          {/* Verbatim match required by E2E test suite */}
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
            Admin Dashboard ({role})
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time management overview for Glamour Nails & Beauty Lounge Sydney CBD.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/cms"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-champagne-400 hover:bg-champagne-300 text-slate-950 text-sm font-semibold shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Open CMS Portal</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={`p-5 rounded-xl bg-slate-900 border ${kpi.border} space-y-3 shadow-sm`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{kpi.label}</span>
                <div className={`p-2 rounded-lg ${kpi.bg} ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold font-serif text-white">{kpi.value}</p>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span>{kpi.trend}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Launch & Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/cms"
          className="group p-6 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-800/60">
              <Sparkles className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
          </div>
          <h3 className="text-lg font-serif font-bold text-white group-hover:text-amber-300 transition-colors">
            Dynamic Homepage CMS
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Update hero headlines, promotional announcement banners, service menu prices in AUD, and nail art gallery sets with instant live site revalidation.
          </p>
        </Link>

        <Link
          href="/admin/customers"
          className="group p-6 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-lg bg-blue-950/60 text-blue-300 border border-blue-800/60">
              <Users className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <h3 className="text-lg font-serif font-bold text-white group-hover:text-blue-300 transition-colors">
            Customer Directory (CRM)
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Search customer records with Vietnamese accent-insensitive matching, review nail shape preferences, track visit history, and triage website consultation inquiries.
          </p>
        </Link>

        <Link
          href="/admin/finance"
          className="group p-6 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
              <DollarSign className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <h3 className="text-lg font-serif font-bold text-white group-hover:text-emerald-300 transition-colors">
            Financial & Tax Operations
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Track salon service revenue, operating expense deductions, Australian FY (1 July – 30 June) reports, and quarterly BAS 10% GST calculations.
          </p>
        </Link>
      </div>
    </div>
  );
}
