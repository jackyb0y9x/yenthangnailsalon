/**
 * Financial Calculation Engine for Australian Nail Salon.
 * Pure functional calculations with integer cents precision.
 */
import { calculateGST } from '@/lib/utils/currency';

export type FinancePaymentMethod = 'cash' | 'card' | 'eftpos' | 'bank_transfer' | 'gift_card' | 'other';

export interface TransactionRecord {
  id: string;
  transactionDate: string; // ISO 8601 or YYYY-MM-DD
  type: 'revenue' | 'expense' | 'income';
  categoryId: string;
  categoryName?: string;
  amountCents: number; // Integer cents >= 0
  gstCents?: number;   // Optional override, default 1/11th inclusive
  paymentMethod: FinancePaymentMethod | string;
  description: string;
  referenceId?: string;
  staffId?: string;
  customerId?: string;
  vendorName?: string;
  isTaxDeductible?: boolean;
  notes?: string;
}

export interface FinancialSummary {
  totalRevenueCents: number;
  totalExpenseCents: number;
  netProfitCents: number;
  profitMarginPercent: number; // e.g. 42.50
  gstCollectedCents: number;   // 1/11th of revenue
  gstPaidCents: number;        // 1/11th of expenses
  netGstPayableCents: number;  // gstCollected - gstPaid (ATO BAS Box 1A - 1B)
  transactionCount: number;
  revenueByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;
  revenueByPaymentMethod: Record<string, number>;
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  totalCents: number;
  transactionCount: number;
  percentageOfTotal: number;
}

/**
 * Calculates complete financial metrics with exact integer cents precision.
 */
export function calculateFinancialSummary(transactions: TransactionRecord[]): FinancialSummary {
  let totalRevenueCents = 0;
  let totalExpenseCents = 0;
  let gstCollectedCents = 0;
  let gstPaidCents = 0;

  const revenueByCategory: Record<string, number> = {};
  const expenseByCategory: Record<string, number> = {};
  const revenueByPaymentMethod: Record<string, number> = {};

  for (const t of transactions) {
    const amount = Math.abs(Math.round(t.amountCents));
    const gst = t.gstCents !== undefined
      ? Math.abs(Math.round(t.gstCents))
      : calculateGST(amount).gstCents;

    const categoryKey = t.categoryName || t.categoryId;

    const isRevenue = t.type === 'revenue' || t.type === 'income';

    if (isRevenue) {
      totalRevenueCents += amount;
      gstCollectedCents += gst;
      revenueByCategory[categoryKey] = (revenueByCategory[categoryKey] || 0) + amount;
      const method = t.paymentMethod || 'other';
      revenueByPaymentMethod[method] = (revenueByPaymentMethod[method] || 0) + amount;
    } else if (t.type === 'expense') {
      totalExpenseCents += amount;
      gstPaidCents += gst;
      expenseByCategory[categoryKey] = (expenseByCategory[categoryKey] || 0) + amount;
    }
  }

  const netProfitCents = totalRevenueCents - totalExpenseCents;
  const netGstPayableCents = gstCollectedCents - gstPaidCents;

  const profitMarginPercent = totalRevenueCents > 0
    ? Number(((netProfitCents / totalRevenueCents) * 100).toFixed(2))
    : 0;

  return {
    totalRevenueCents,
    totalExpenseCents,
    netProfitCents,
    profitMarginPercent,
    gstCollectedCents,
    gstPaidCents,
    netGstPayableCents,
    transactionCount: transactions.length,
    revenueByCategory,
    expenseByCategory,
    revenueByPaymentMethod,
  };
}

/**
 * Groups and sorts transactions by category with percentages.
 */
export function aggregateByCategory(
  transactions: TransactionRecord[],
  type: 'revenue' | 'expense' | 'income'
): CategorySummary[] {
  const isTargetRevenue = type === 'revenue' || type === 'income';
  const filtered = transactions.filter((t) =>
    isTargetRevenue ? (t.type === 'revenue' || t.type === 'income') : t.type === 'expense'
  );
  const totalTypeCents = filtered.reduce((acc, t) => acc + Math.round(t.amountCents), 0);

  const map = new Map<string, { categoryId: string; categoryName: string; totalCents: number; count: number }>();

  for (const t of filtered) {
    const key = t.categoryId;
    const name = t.categoryName || t.categoryId;
    const existing = map.get(key) || { categoryId: key, categoryName: name, totalCents: 0, count: 0 };
    existing.totalCents += Math.round(t.amountCents);
    existing.count += 1;
    map.set(key, existing);
  }

  return Array.from(map.values())
    .map((item) => ({
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      totalCents: item.totalCents,
      transactionCount: item.count,
      percentageOfTotal: totalTypeCents > 0 ? Number(((item.totalCents / totalTypeCents) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

/**
 * Filters transactions within a closed date range [startDate, endDate].
 */
export function filterTransactionsByDateRange(
  transactions: TransactionRecord[],
  startDate: string,
  endDate: string
): TransactionRecord[] {
  return transactions.filter((t) => {
    const dateStr = t.transactionDate.slice(0, 10);
    return dateStr >= startDate && dateStr <= endDate;
  });
}
