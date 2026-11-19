/**
 * Unit Test Suite: Financial Calculations Pure Engine
 * Validates integer cents arithmetic, ATO 1/11th GST compliance, profit margins,
 * category & payment method breakdowns, and edge case resilience.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateFinancialSummary,
  aggregateByCategory,
  filterTransactionsByDateRange,
  TransactionRecord,
} from '@/lib/finance/calculations';
import { calculateGST } from '@/lib/utils/currency';

describe('Financial Calculations Engine', () => {
  it('correctly aggregates revenue, expenses, and net profit with exact integer cents', () => {
    const transactions: TransactionRecord[] = [
      {
        id: 'tx-1',
        transactionDate: '2026-11-01',
        type: 'revenue',
        categoryId: 'cat-services',
        categoryName: 'Salon Services',
        amountCents: 10000, // $100.00
        paymentMethod: 'eftpos',
        description: 'SNS Set',
      },
      {
        id: 'tx-2',
        transactionDate: '2026-11-02',
        type: 'revenue',
        categoryId: 'cat-retail',
        categoryName: 'Retail Product Sales',
        amountCents: 5000, // $50.00
        paymentMethod: 'card',
        description: 'Cuticle Oil',
      },
      {
        id: 'tx-3',
        transactionDate: '2026-11-03',
        type: 'expense',
        categoryId: 'cat-supplies',
        categoryName: 'Salon Supplies & Inventory',
        amountCents: 6000, // $60.00
        paymentMethod: 'bank_transfer',
        description: 'Powder Restock',
      },
    ];

    const summary = calculateFinancialSummary(transactions);

    expect(summary.totalRevenueCents).toBe(15000); // $150.00
    expect(summary.totalExpenseCents).toBe(6000);  // $60.00
    expect(summary.netProfitCents).toBe(9000);     // $90.00
    expect(summary.transactionCount).toBe(3);
    // Profit margin = (9000 / 15000) * 100 = 60.00%
    expect(summary.profitMarginPercent).toBe(60.0);
  });

  it('calculates ATO 1/11th statutory GST for Box 1A, Box 1B, and Net GST Payable', () => {
    const transactions: TransactionRecord[] = [
      {
        id: 'rev-1',
        transactionDate: '2026-11-01',
        type: 'revenue',
        categoryId: 'cat-services',
        amountCents: 6500, // $65.00 -> GST = Math.round(6500/11) = 591 cents ($5.91)
        paymentMethod: 'eftpos',
        description: 'Full Set',
      },
      {
        id: 'rev-2',
        transactionDate: '2026-11-02',
        type: 'revenue',
        categoryId: 'cat-services',
        amountCents: 9500, // $95.00 -> GST = Math.round(9500/11) = 864 cents ($8.64)
        paymentMethod: 'card',
        description: 'Acrylic',
      },
      {
        id: 'exp-1',
        transactionDate: '2026-11-03',
        type: 'expense',
        categoryId: 'cat-supplies',
        amountCents: 48000, // $480.00 -> GST = Math.round(48000/11) = 4364 cents ($43.64)
        paymentMethod: 'bank_transfer',
        description: 'Wholesale Restock',
      },
    ];

    const summary = calculateFinancialSummary(transactions);

    expect(summary.gstCollectedCents).toBe(591 + 864); // 1455 cents
    expect(summary.gstPaidCents).toBe(4364);           // 4364 cents
    // Net GST = 1455 - 4364 = -2909 cents (ATO Refundable)
    expect(summary.netGstPayableCents).toBe(-2909);
  });

  it('preserves ATO balancing invariant: gross = net + gst for all calculations', () => {
    const sampleAmounts = [1, 10, 55, 99, 100, 110, 250, 48000, 320000];
    for (const cents of sampleAmounts) {
      const gst = calculateGST(cents);
      expect(gst.netCents + gst.gstCents).toBe(cents);
      expect(gst.grossCents).toBe(cents);
    }
  });

  it('handles negative profit margins and zero-revenue periods without division by zero', () => {
    // Zero revenue scenario
    const noRevenueSummary = calculateFinancialSummary([
      {
        id: 'exp-only',
        transactionDate: '2026-11-01',
        type: 'expense',
        categoryId: 'cat-rent',
        amountCents: 320000,
        paymentMethod: 'bank_transfer',
        description: 'Rent',
      },
    ]);
    expect(noRevenueSummary.totalRevenueCents).toBe(0);
    expect(noRevenueSummary.totalExpenseCents).toBe(320000);
    expect(noRevenueSummary.netProfitCents).toBe(-320000);
    expect(noRevenueSummary.profitMarginPercent).toBe(0); // Guarded against NaN

    // Net loss scenario (Revenue > 0, but Expenses > Revenue)
    const lossSummary = calculateFinancialSummary([
      {
        id: 'rev-small',
        transactionDate: '2026-11-01',
        type: 'revenue',
        categoryId: 'cat-services',
        amountCents: 10000, // $100
        paymentMethod: 'cash',
        description: 'Manicure',
      },
      {
        id: 'exp-large',
        transactionDate: '2026-11-02',
        type: 'expense',
        categoryId: 'cat-rent',
        amountCents: 30000, // $300
        paymentMethod: 'bank_transfer',
        description: 'Rent',
      },
    ]);
    expect(lossSummary.totalRevenueCents).toBe(10000);
    expect(lossSummary.totalExpenseCents).toBe(30000);
    expect(lossSummary.netProfitCents).toBe(-20000);
    // Profit margin = (-20000 / 10000) * 100 = -200%
    expect(lossSummary.profitMarginPercent).toBe(-200.0);
  });

  it('normalizes type: treats "income" and "revenue" as equivalent synonyms', () => {
    const transactions: TransactionRecord[] = [
      {
        id: 'tx-rev',
        transactionDate: '2026-11-01',
        type: 'revenue',
        categoryId: 'cat-1',
        amountCents: 5000,
        paymentMethod: 'card',
        description: 'Rev',
      },
      {
        id: 'tx-inc',
        transactionDate: '2026-11-02',
        type: 'income',
        categoryId: 'cat-1',
        amountCents: 7000,
        paymentMethod: 'eftpos',
        description: 'Inc',
      },
    ];

    const summary = calculateFinancialSummary(transactions);
    expect(summary.totalRevenueCents).toBe(12000);
  });

  it('supports explicit gstCents override for GST-free supplies or inputs', () => {
    const transactions: TransactionRecord[] = [
      {
        id: 'wages-1',
        transactionDate: '2026-11-01',
        type: 'expense',
        categoryId: 'cat-wages',
        amountCents: 650000, // $6,500.00
        gstCents: 0,        // Wages are GST-free (no GST credit)
        paymentMethod: 'bank_transfer',
        description: 'Staff Wages Payroll',
      },
    ];

    const summary = calculateFinancialSummary(transactions);
    expect(summary.totalExpenseCents).toBe(650000);
    expect(summary.gstPaidCents).toBe(0);
  });

  it('aggregates transactions by category and sorts descending by total cents', () => {
    const transactions: TransactionRecord[] = [
      {
        id: 't-1',
        transactionDate: '2026-11-01',
        type: 'revenue',
        categoryId: 'cat-services',
        categoryName: 'Salon Services',
        amountCents: 20000, // $200
        paymentMethod: 'eftpos',
        description: 'Services',
      },
      {
        id: 't-2',
        transactionDate: '2026-11-02',
        type: 'revenue',
        categoryId: 'cat-retail',
        categoryName: 'Retail Product Sales',
        amountCents: 5000, // $50
        paymentMethod: 'card',
        description: 'Retail',
      },
      {
        id: 't-3',
        transactionDate: '2026-11-03',
        type: 'revenue',
        categoryId: 'cat-services',
        categoryName: 'Salon Services',
        amountCents: 15000, // $150
        paymentMethod: 'cash',
        description: 'Services',
      },
    ];

    const aggregated = aggregateByCategory(transactions, 'revenue');

    expect(aggregated.length).toBe(2);
    expect(aggregated[0].categoryName).toBe('Salon Services');
    expect(aggregated[0].totalCents).toBe(35000);
    expect(aggregated[0].transactionCount).toBe(2);
    // 35000 / 40000 = 87.5%
    expect(aggregated[0].percentageOfTotal).toBe(87.5);

    expect(aggregated[1].categoryName).toBe('Retail Product Sales');
    expect(aggregated[1].totalCents).toBe(5000);
    expect(aggregated[1].percentageOfTotal).toBe(12.5);
  });

  it('aggregates payment method distribution accurately including EFTPOS and Gift Card', () => {
    const transactions: TransactionRecord[] = [
      {
        id: 'p-1',
        transactionDate: '2026-11-01',
        type: 'revenue',
        categoryId: 'cat-1',
        amountCents: 10000,
        paymentMethod: 'eftpos',
        description: 'EFTPOS sale',
      },
      {
        id: 'p-2',
        transactionDate: '2026-11-02',
        type: 'revenue',
        categoryId: 'cat-1',
        amountCents: 5000,
        paymentMethod: 'gift_card',
        description: 'Gift Card redemption',
      },
      {
        id: 'p-3',
        transactionDate: '2026-11-03',
        type: 'revenue',
        categoryId: 'cat-1',
        amountCents: 2000,
        paymentMethod: 'cash',
        description: 'Cash payment',
      },
    ];

    const summary = calculateFinancialSummary(transactions);

    expect(summary.revenueByPaymentMethod['eftpos']).toBe(10000);
    expect(summary.revenueByPaymentMethod['gift_card']).toBe(5000);
    expect(summary.revenueByPaymentMethod['cash']).toBe(2000);
  });

  it('gracefully handles empty transaction lists without throwing', () => {
    const summary = calculateFinancialSummary([]);

    expect(summary.totalRevenueCents).toBe(0);
    expect(summary.totalExpenseCents).toBe(0);
    expect(summary.netProfitCents).toBe(0);
    expect(summary.profitMarginPercent).toBe(0);
    expect(summary.gstCollectedCents).toBe(0);
    expect(summary.gstPaidCents).toBe(0);
    expect(summary.netGstPayableCents).toBe(0);
    expect(summary.transactionCount).toBe(0);

    const categories = aggregateByCategory([], 'revenue');
    expect(categories).toEqual([]);

    const filtered = filterTransactionsByDateRange([], '2026-07-01', '2026-09-30');
    expect(filtered).toEqual([]);
  });

  it('filters transactions strictly within closed date range [startDate, endDate]', () => {
    const transactions: TransactionRecord[] = [
      {
        id: 'd-1',
        transactionDate: '2026-06-30T23:59:59Z',
        type: 'revenue',
        categoryId: 'c-1',
        amountCents: 1000,
        paymentMethod: 'card',
        description: 'June 30',
      },
      {
        id: 'd-2',
        transactionDate: '2026-07-01',
        type: 'revenue',
        categoryId: 'c-1',
        amountCents: 2000,
        paymentMethod: 'card',
        description: 'July 1 (Q1 start)',
      },
      {
        id: 'd-3',
        transactionDate: '2026-09-30',
        type: 'revenue',
        categoryId: 'c-1',
        amountCents: 3000,
        paymentMethod: 'card',
        description: 'September 30 (Q1 end)',
      },
      {
        id: 'd-4',
        transactionDate: '2026-10-01',
        type: 'revenue',
        categoryId: 'c-1',
        amountCents: 4000,
        paymentMethod: 'card',
        description: 'October 1 (Q2 start)',
      },
    ];

    const q1Transactions = filterTransactionsByDateRange(transactions, '2026-07-01', '2026-09-30');
    expect(q1Transactions.map((t) => t.id)).toEqual(['d-2', 'd-3']);
  });
});
