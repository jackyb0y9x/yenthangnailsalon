'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Building,
  CreditCard,
  Percent,
  X,
  Trash2,
  FileText,
  Tag,
  ShieldCheck,
} from 'lucide-react';
import { formatAUD } from '@/lib/utils/currency';
import {
  getAustralianFinancialYear,
  getBASQuartersForFinancialYear,
  getBASDateRange,
  formatDateAEST,
} from '@/lib/utils/date';

interface CategoryItem {
  id: string;
  name: string;
  type: 'income' | 'expense';
  is_tax_deductible: boolean;
  display_order: number;
}

interface TransactionItem {
  id: string;
  transaction_date: string;
  type: 'income' | 'expense' | 'revenue';
  category_id: string;
  category_name?: string;
  amount_aud: number;
  amount_cents: number;
  gst_amount_aud: number;
  gst_cents: number;
  net_cents: number;
  payment_method: string;
  description: string;
  reference_id?: string | null;
  customer_id?: string | null;
  staff_id?: string | null;
  vendor_name?: string | null;
  is_tax_deductible?: boolean;
  notes?: string | null;
  created_at: string;
}

interface FinancialSummaryState {
  totalRevenueCents: number;
  totalExpenseCents: number;
  netProfitCents: number;
  profitMarginPercent: number;
  gstCollectedCents: number;
  gstPaidCents: number;
  netGstPayableCents: number;
  transactionCount: number;
  revenueByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;
  revenueByPaymentMethod: Record<string, number>;
}

interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  totalCents: number;
  transactionCount: number;
  percentageOfTotal: number;
}

export default function FinanceDashboardPage() {
  // Financial Year and BAS Quarter selection state
  const currentFY = useMemo(() => getAustralianFinancialYear(new Date()), []);
  const [selectedFYYear, setSelectedFYYear] = useState<number>(currentFY.startYear);
  const [selectedQuarter, setSelectedQuarter] = useState<'ALL' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isCustomDate, setIsCustomDate] = useState<boolean>(false);

  // Data state
  const [summary, setSummary] = useState<FinancialSummaryState | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<{
    revenue: CategoryBreakdownItem[];
    expenses: CategoryBreakdownItem[];
  }>({ revenue: [], expenses: [] });
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string }>>([]);
  const [customerList, setCustomerList] = useState<Array<{ id: string; name: string }>>([]);

  // Filter & Search state for transaction ledger
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'revenue' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [taxDeductibleOnly, setTaxDeductibleOnly] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState<boolean>(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);

  // Revenue Form State
  const [revenueDate, setRevenueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [revenueCategory, setRevenueCategory] = useState<string>('b0000000-0000-0000-0000-000000000001');
  const [revenueAmount, setRevenueAmount] = useState<string>('');
  const [revenuePaymentMethod, setRevenuePaymentMethod] = useState<string>('eftpos');
  const [revenueCustomer, setRevenueCustomer] = useState<string>('');
  const [revenueStaff, setRevenueStaff] = useState<string>('');
  const [revenueDescription, setRevenueDescription] = useState<string>('');
  const [revenueNotes, setRevenueNotes] = useState<string>('');

  // Expense Form State
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [expenseCategory, setExpenseCategory] = useState<string>('b0000000-0000-0000-0000-000000000006');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseVendor, setExpenseVendor] = useState<string>('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<string>('bank_transfer');
  const [expenseTaxDeductible, setExpenseTaxDeductible] = useState<boolean>(true);
  const [expenseDescription, setExpenseDescription] = useState<string>('');
  const [expenseNotes, setExpenseNotes] = useState<string>('');

  // Computed Date Range for current filters
  const activeDateRange = useMemo(() => {
    if (isCustomDate && customStartDate && customEndDate) {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
        label: `Custom: ${customStartDate} to ${customEndDate}`,
      };
    }
    return getBASDateRange(selectedFYYear, selectedQuarter);
  }, [isCustomDate, customStartDate, customEndDate, selectedFYYear, selectedQuarter]);

  // Load Categories & Metadata
  useEffect(() => {
    async function loadMetadata() {
      try {
        const catRes = await fetch('/api/admin/finance/categories');
        const catData = await catRes.json();
        if (catData.success && catData.categories) {
          setCategories(catData.categories);
        }

        const staffRes = await fetch('/api/admin/staff');
        const staffData = await staffRes.json();
        if (staffData.success && staffData.staff) {
          setStaffList(staffData.staff.map((s: any) => ({ id: s.id, name: s.full_name || s.name })));
        }

        const custRes = await fetch('/api/admin/customers?limit=100');
        const custData = await custRes.json();
        if (custData.success && custData.customers) {
          setCustomerList(custData.customers.map((c: any) => ({ id: c.id, name: c.full_name || c.name })));
        }
      } catch (err) {
        console.error('Failed to load initial metadata', err);
      }
    }
    loadMetadata();
  }, []);

  // Fetch Summary & Transactions whenever date range or filters change
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const summaryUrl = new URL('/api/admin/finance/summary', window.location.origin);
      summaryUrl.searchParams.set('startDate', activeDateRange.startDate);
      summaryUrl.searchParams.set('endDate', activeDateRange.endDate);

      const sumRes = await fetch(summaryUrl.toString());
      const sumData = await sumRes.json();
      if (sumData.success) {
        setSummary(sumData.summary);
        setCategoryBreakdown(sumData.categoryBreakdown || { revenue: [], expenses: [] });
      }

      const txUrl = new URL('/api/admin/finance/transactions', window.location.origin);
      txUrl.searchParams.set('startDate', activeDateRange.startDate);
      txUrl.searchParams.set('endDate', activeDateRange.endDate);
      if (typeFilter !== 'all') txUrl.searchParams.set('type', typeFilter);
      if (categoryFilter !== 'all') txUrl.searchParams.set('categoryId', categoryFilter);
      if (paymentFilter !== 'all') txUrl.searchParams.set('paymentMethod', paymentFilter);
      if (taxDeductibleOnly) txUrl.searchParams.set('isTaxDeductible', 'true');
      if (searchQuery.trim()) txUrl.searchParams.set('search', searchQuery.trim());
      txUrl.searchParams.set('page', currentPage.toString());
      txUrl.searchParams.set('limit', '50');

      const txRes = await fetch(txUrl.toString());
      const txData = await txRes.json();
      if (txData.success) {
        setTransactions(txData.transactions || []);
        setTotalPages(txData.pagination?.totalPages || 1);
        setTotalTransactions(txData.pagination?.total || 0);
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to load financial records' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [
    activeDateRange,
    typeFilter,
    categoryFilter,
    paymentFilter,
    taxDeductibleOnly,
    searchQuery,
    currentPage,
  ]);

  // Toast Auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // CRM Sync Handler
  const handleSyncFromCrm = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/finance/sync-visits', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setToast({
          type: 'success',
          message: data.message || `Reconciled ${data.syncedCount} new visit(s).`,
        });
        await fetchData();
      } else {
        setToast({ type: 'error', message: data.error || 'CRM reconciliation failed.' });
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Network error syncing from CRM.' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Submit Revenue
  const handleCreateRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(revenueAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setToast({ type: 'error', message: 'Please enter a valid positive revenue amount.' });
      return;
    }

    try {
      const catObj = categories.find((c) => c.id === revenueCategory);
      const res = await fetch('/api/admin/finance/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'income',
          categoryId: revenueCategory,
          categoryName: catObj?.name,
          amountAud: amountVal,
          paymentMethod: revenuePaymentMethod,
          transactionDate: revenueDate,
          description: revenueDescription || `${catObj?.name || 'Revenue'} Transaction`,
          customerId: revenueCustomer || undefined,
          staffId: revenueStaff || undefined,
          notes: revenueNotes || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', message: 'Revenue entry recorded successfully.' });
        setIsRevenueModalOpen(false);
        setRevenueAmount('');
        setRevenueDescription('');
        setRevenueNotes('');
        await fetchData();
      } else {
        setToast({ type: 'error', message: data.error || 'Failed to record revenue.' });
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Error saving revenue.' });
    }
  };

  // Submit Expense
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(expenseAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setToast({ type: 'error', message: 'Please enter a valid positive expense amount.' });
      return;
    }

    try {
      const catObj = categories.find((c) => c.id === expenseCategory);
      const res = await fetch('/api/admin/finance/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'expense',
          categoryId: expenseCategory,
          categoryName: catObj?.name,
          amountAud: amountVal,
          paymentMethod: expensePaymentMethod,
          transactionDate: expenseDate,
          description: expenseDescription || `${catObj?.name || 'Expense'} Payment`,
          vendorName: expenseVendor || undefined,
          isTaxDeductible: expenseTaxDeductible,
          notes: expenseNotes || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', message: 'Operating expense recorded successfully.' });
        setIsExpenseModalOpen(false);
        setExpenseAmount('');
        setExpenseVendor('');
        setExpenseDescription('');
        setExpenseNotes('');
        await fetchData();
      } else {
        setToast({ type: 'error', message: data.error || 'Failed to record expense.' });
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Error saving expense.' });
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this financial record?')) return;
    try {
      const res = await fetch(`/api/admin/finance/transactions?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', message: 'Transaction deleted.' });
        await fetchData();
      } else {
        setToast({ type: 'error', message: data.error || 'Failed to delete transaction.' });
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Error deleting transaction.' });
    }
  };

  // Live GST calculation helper for modals (1/11th statutory rate)
  const calculateLiveGST = (valStr: string) => {
    const num = parseFloat(valStr);
    if (isNaN(num) || num <= 0) return '$0.00';
    const cents = Math.round(num * 100);
    const gstCents = Math.round(cents / 11);
    return formatAUD(gstCents);
  };

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories]
  );
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header & Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Financial Tracking & Australian Tax Accounting
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ATO BAS Compliant (10% GST)
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Australian Financial Year (1 July – 30 June) & Quarterly BAS Tracking • Sydney CBD Lounge
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSyncFromCrm}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync from CRM'}</span>
          </button>

          <button
            onClick={() => setIsRevenueModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm shadow-emerald-900/40"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Revenue</span>
          </button>

          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-rose-700 hover:bg-rose-600 text-white transition shadow-sm shadow-rose-950/40"
          >
            <MinusCircle className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* 2. Feedback Notification Banner */}
      {toast && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/70 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white transition p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Tax Period & BAS Date Range Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-salon-400" />
              Tax Period:
            </span>

            {/* Australian Financial Year Selector */}
            <select
              value={selectedFYYear}
              onChange={(e) => {
                setSelectedFYYear(parseInt(e.target.value, 10));
                setIsCustomDate(false);
              }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 font-semibold focus:outline-none focus:border-salon-500"
            >
              <option value={2026}>FY 2026–27 (Current)</option>
              <option value={2025}>FY 2025–26</option>
              <option value={2024}>FY 2024–25</option>
              <option value={2023}>FY 2023–24</option>
            </select>

            {/* BAS Quarters Tabs */}
            <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => {
                  setSelectedQuarter('ALL');
                  setIsCustomDate(false);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  !isCustomDate && selectedQuarter === 'ALL'
                    ? 'bg-salon-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All FY
              </button>
              {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => {
                const labels: Record<string, string> = {
                  Q1: 'Q1 (Jul–Sep)',
                  Q2: 'Q2 (Oct–Dec)',
                  Q3: 'Q3 (Jan–Mar)',
                  Q4: 'Q4 (Apr–Jun)',
                };
                return (
                  <button
                    key={q}
                    onClick={() => {
                      setSelectedQuarter(q);
                      setIsCustomDate(false);
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                      !isCustomDate && selectedQuarter === q
                        ? 'bg-salon-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {labels[q]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date Range Picker */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Custom Range:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => {
                setCustomStartDate(e.target.value);
                if (e.target.value && customEndDate) setIsCustomDate(true);
              }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-salon-500"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => {
                setCustomEndDate(e.target.value);
                if (customStartDate && e.target.value) setIsCustomDate(true);
              }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-salon-500"
            />
            {isCustomDate && (
              <button
                onClick={() => {
                  setIsCustomDate(false);
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="text-xs text-slate-400 hover:text-rose-400 transition ml-1"
                title="Reset custom date"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Badge Bar */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Active Period:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-salon-300 font-medium border border-slate-700">
              {activeDateRange.label} ({activeDateRange.startDate} to {activeDateRange.endDate})
            </span>
          </div>
          <div>
            Showing <span className="font-semibold text-white">{totalTransactions}</span> transactions
          </div>
        </div>
      </div>

      {/* 4. Real-time KPI Metric Cards (7 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Gross Revenue (AUD)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-white tracking-tight">
            {summary ? formatAUD(summary.totalRevenueCents) : '$0.00'}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-emerald-400 font-medium">Tax-inclusive</span>
            <span>• Services & Retail</span>
          </div>
        </div>

        {/* Card 2: Operating Expenses */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Operating Expenses
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-white tracking-tight">
            {summary ? formatAUD(summary.totalExpenseCents) : '$0.00'}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-rose-400 font-medium">Outgoings</span>
            <span>• Rent, Wages, Supplies</span>
          </div>
        </div>

        {/* Card 3: Net Profit */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Net Profit
            </span>
            <div
              className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                (summary?.netProfitCents ?? 0) >= 0
                  ? 'bg-emerald-950/80 border-emerald-800 text-emerald-400'
                  : 'bg-rose-950/80 border-rose-800 text-rose-400'
              }`}
            >
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`mt-3 text-2xl font-bold tracking-tight ${
              (summary?.netProfitCents ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {summary ? formatAUD(summary.netProfitCents) : '$0.00'}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <span>Revenue minus Expenses</span>
          </div>
        </div>

        {/* Card 4: Operating Profit Margin */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Profit Margin
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-800 text-purple-400 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-white tracking-tight">
            {summary ? `${summary.profitMarginPercent.toFixed(2)}%` : '0.00%'}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <span>Operating Net Margin</span>
          </div>
        </div>
      </div>

      {/* ATO BAS Tax Box Summary Cards (3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* BAS Box 1A: GST Collected */}
        <div className="bg-slate-900/90 border border-emerald-900/40 rounded-2xl p-5 shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 w-16 h-16 bg-emerald-500/5 rounded-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-[11px] font-bold text-emerald-400">
                BAS Box 1A
              </span>
              <span className="text-xs font-semibold text-slate-300">GST Collected</span>
            </div>
            <span className="text-xs text-slate-500">1/11th inclusive</span>
          </div>
          <div className="mt-3 text-xl font-bold text-emerald-300 tracking-tight">
            {summary ? formatAUD(summary.gstCollectedCents) : '$0.00'}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Total statutory GST liability accrued on taxable revenue
          </p>
        </div>

        {/* BAS Box 1B: GST Paid */}
        <div className="bg-slate-900/90 border border-rose-900/40 rounded-2xl p-5 shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 w-16 h-16 bg-rose-500/5 rounded-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-[11px] font-bold text-rose-400">
                BAS Box 1B
              </span>
              <span className="text-xs font-semibold text-slate-300">GST Paid (Credits)</span>
            </div>
            <span className="text-xs text-slate-500">1/11th inclusive</span>
          </div>
          <div className="mt-3 text-xl font-bold text-rose-300 tracking-tight">
            {summary ? formatAUD(summary.gstPaidCents) : '$0.00'}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Input tax credits claimed on creditable business acquisitions
          </p>
        </div>

        {/* Net GST Payable / Refundable */}
        <div className="bg-slate-900/90 border border-slate-700/60 rounded-2xl p-5 shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-300">
                ATO Net GST
              </span>
              <span className="text-xs font-semibold text-slate-300">Net ATO Settlement</span>
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                (summary?.netGstPayableCents ?? 0) >= 0
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}
            >
              {(summary?.netGstPayableCents ?? 0) >= 0 ? 'Payable' : 'Refundable'}
            </span>
          </div>
          <div
            className={`mt-3 text-xl font-bold tracking-tight ${
              (summary?.netGstPayableCents ?? 0) >= 0 ? 'text-amber-300' : 'text-emerald-300'
            }`}
          >
            {summary
              ? formatAUD(Math.abs(summary.netGstPayableCents))
              : '$0.00'}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Box 1A minus Box 1B ({ (summary?.netGstPayableCents ?? 0) >= 0 ? 'Remit to ATO' : 'ATO Refund due' })
          </p>
        </div>
      </div>

      {/* 5. Categorical Breakdown Analytics (Side-by-Side Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Categorical Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white">Revenue by Category</h2>
            </div>
            <span className="text-xs text-slate-400">
              Total: {summary ? formatAUD(summary.totalRevenueCents) : '$0.00'}
            </span>
          </div>

          <div className="space-y-3.5">
            {categoryBreakdown.revenue.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No revenue recorded in this period.</p>
            ) : (
              categoryBreakdown.revenue.map((cat) => (
                <div key={cat.categoryId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-200 font-medium">{cat.categoryName}</span>
                    <span className="text-slate-300 font-semibold">
                      {formatAUD(cat.totalCents)}{' '}
                      <span className="text-slate-500 font-normal">({cat.percentageOfTotal.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, cat.percentageOfTotal))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Payment Method Breakdown Summary */}
          {summary && Object.keys(summary.revenueByPaymentMethod).length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
                Payment Method Share
              </span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.revenueByPaymentMethod).map(([method, cents]) => (
                  <span
                    key={method}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs bg-slate-950 text-slate-300 border border-slate-800"
                  >
                    <CreditCard className="w-3 h-3 text-slate-400" />
                    <span className="capitalize font-medium">{method}:</span>
                    <span className="text-emerald-400 font-bold">{formatAUD(cents)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Operating Expenses Categorical Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-950 border border-rose-800 text-rose-400 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white">Operating Expenses by Category</h2>
            </div>
            <span className="text-xs text-slate-400">
              Total: {summary ? formatAUD(summary.totalExpenseCents) : '$0.00'}
            </span>
          </div>

          <div className="space-y-3.5">
            {categoryBreakdown.expenses.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No operating expenses in this period.</p>
            ) : (
              categoryBreakdown.expenses.map((cat) => (
                <div key={cat.categoryId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-200 font-medium">{cat.categoryName}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-900/60">
                        Tax-Ded
                      </span>
                    </div>
                    <span className="text-slate-300 font-semibold">
                      {formatAUD(cat.totalCents)}{' '}
                      <span className="text-slate-500 font-normal">({cat.percentageOfTotal.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-rose-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, cat.percentageOfTotal))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 6. Transaction Ledger Toolbar & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search description, reference, vendor, client..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-salon-500 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-salon-500"
            >
              <option value="all">All Types</option>
              <option value="revenue">Revenues (+)</option>
              <option value="expense">Expenses (-)</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-salon-500 max-w-[180px] truncate"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Payment Method Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-salon-500"
            >
              <option value="all">All Methods</option>
              <option value="eftpos">EFTPOS</option>
              <option value="card">Credit Card</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="gift_card">Gift Card</option>
            </select>

            {/* Tax Deductible Toggle */}
            <button
              onClick={() => {
                setTaxDeductibleOnly(!taxDeductibleOnly);
                setCurrentPage(1);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                taxDeductibleOnly
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              Tax-Deductible Only
            </button>
          </div>
        </div>

        {/* 7. Transaction Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type & Category</th>
                <th className="py-3 px-4">Description / Reference</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 text-right">GST (1/11th)</th>
                <th className="py-3 px-4 text-right">Gross Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-salon-400 mb-2" />
                    Loading financial transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No transactions match current filters.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isRev = tx.type === 'revenue' || tx.type === 'income';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-xs text-slate-300">
                        {tx.transaction_date}
                      </td>

                      {/* Type & Category */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              isRev
                                ? 'bg-emerald-950/90 text-emerald-400 border-emerald-800'
                                : 'bg-rose-950/90 text-rose-400 border-rose-800'
                            }`}
                          >
                            {isRev ? 'Revenue' : 'Expense'}
                          </span>
                          <span className="text-xs text-slate-300 font-medium">
                            {tx.category_name || 'Uncategorized'}
                          </span>
                        </div>
                      </td>

                      {/* Description & Reference */}
                      <td className="py-3 px-4">
                        <div className="text-xs text-slate-200 font-medium max-w-sm">
                          {tx.description}
                        </div>
                        {tx.vendor_name && (
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-500" />
                            <span>Vendor: {tx.vendor_name}</span>
                          </div>
                        )}
                        {tx.reference_id && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Ref: {tx.reference_id}
                          </div>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] uppercase font-semibold bg-slate-950 text-slate-300 border border-slate-800">
                          {tx.payment_method}
                        </span>
                      </td>

                      {/* GST */}
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-400">
                        {formatAUD(tx.gst_cents)}
                      </td>

                      {/* Gross Amount */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm">
                        <span className={isRev ? 'text-emerald-400' : 'text-rose-400'}>
                          {isRev ? '+' : '-'}
                          {formatAUD(tx.amount_cents)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Delete Transaction"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 text-xs text-slate-400">
            <div>
              Page <span className="text-white font-semibold">{currentPage}</span> of{' '}
              <span className="text-white font-semibold">{totalPages}</span>
            </div>
            <div className="flex gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 8. MODAL A: Record Revenue Transaction */}
      {/* ==================================================================== */}
      {isRevenueModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Record Revenue</h3>
                  <p className="text-xs text-slate-400">Services, Retail Products, Gift Cards & Tips</p>
                </div>
              </div>
              <button
                onClick={() => setIsRevenueModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRevenue} className="space-y-4 text-xs">
              {/* Date */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Transaction Date</label>
                <input
                  type="date"
                  required
                  value={revenueDate}
                  onChange={(e) => setRevenueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-salon-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Revenue Category</label>
                <select
                  value={revenueCategory}
                  onChange={(e) => setRevenueCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-salon-500"
                >
                  {incomeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount ($ AUD) */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Gross Amount (AUD) — Tax Inclusive
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="85.00"
                    value={revenueAmount}
                    onChange={(e) => setRevenueAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-slate-100 text-sm font-semibold focus:outline-none focus:border-salon-500"
                  />
                </div>
                <div className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Includes GST of {calculateLiveGST(revenueAmount)} (1/11th statutory rate)</span>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['eftpos', 'card', 'cash', 'bank_transfer', 'gift_card'] as const).map((method) => (
                    <button
                      type="button"
                      key={method}
                      onClick={() => setRevenuePaymentMethod(method)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold capitalize border transition ${
                        revenuePaymentMethod === method
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {method.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Staff / Technician */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Technician</label>
                  <select
                    value={revenueStaff}
                    onChange={(e) => setRevenueStaff(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-salon-500"
                  >
                    <option value="">Salon Direct / Shared</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Customer */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Client</label>
                  <select
                    value={revenueCustomer}
                    onChange={(e) => setRevenueCustomer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-salon-500"
                  >
                    <option value="">Walk-in Client</option>
                    {customerList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. SNS Dipping Powder + French Tip"
                  value={revenueDescription}
                  onChange={(e) => setRevenueDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-salon-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRevenueModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/50 transition"
                >
                  Save Revenue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 9. MODAL B: Record Operating Expense Transaction */}
      {/* ==================================================================== */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-950 border border-rose-800 text-rose-400 flex items-center justify-center">
                  <MinusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Record Operating Expense</h3>
                  <p className="text-xs text-slate-400">Rent, Consumables, Utilities, Wages, Marketing & Fees</p>
                </div>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
              {/* Date */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Expense Date</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-salon-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Expense Category</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-salon-500"
                >
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount ($ AUD) */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Gross Amount (AUD) — Outgoing Payment
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="250.00"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-slate-100 text-sm font-semibold focus:outline-none focus:border-salon-500"
                  />
                </div>
                <div className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>GST Credit (Box 1B) claimable: {calculateLiveGST(expenseAmount)}</span>
                </div>
              </div>

              {/* Vendor Name */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Vendor / Supplier Name</label>
                <input
                  type="text"
                  placeholder="e.g. OPI Nails Australia, EnergyAustralia, Tyro"
                  value={expenseVendor}
                  onChange={(e) => setExpenseVendor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-salon-500"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Payment Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['bank_transfer', 'eftpos', 'card', 'cash'] as const).map((method) => (
                    <button
                      type="button"
                      key={method}
                      onClick={() => setExpensePaymentMethod(method)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold capitalize border transition ${
                        expensePaymentMethod === method
                          ? 'bg-rose-950 text-rose-300 border-rose-800 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {method.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tax-Deductible Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="taxDeductibleCheck"
                  checked={expenseTaxDeductible}
                  onChange={(e) => setExpenseTaxDeductible(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-salon-600 focus:ring-salon-500 focus:ring-offset-slate-900"
                />
                <label htmlFor="taxDeductibleCheck" className="text-slate-300 font-medium cursor-pointer">
                  ATO Tax-Deductible Operating Expense (Australian Tax Concession)
                </label>
              </div>

              {/* Description / Invoice Number */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Description / Invoice Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Invoice #INV-9823 for 12x Acrylic Powder restock"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-salon-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-rose-700 hover:bg-rose-600 text-white shadow-md shadow-rose-950/50 transition"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
