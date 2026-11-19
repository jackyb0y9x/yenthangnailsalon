import { describe, it, expect } from 'vitest';
import {
  calculateFinancialSummary,
  aggregateByCategory,
  filterTransactionsByDateRange,
  type TransactionRecord,
} from '@/lib/finance/calculations';

describe('Financial Calculation Engine', () => {
  const sampleTransactions: TransactionRecord[] = [
    {
      id: 'tx-1',
      transactionDate: '2026-08-10',
      type: 'revenue',
      categoryId: 'cat-services',
      categoryName: 'Salon Services',
      amountCents: 10000, // $100.00
      paymentMethod: 'card',
      description: 'Acrylic Set + Gel Polish',
    },
    {
      id: 'tx-2',
      transactionDate: '2026-08-11',
      type: 'revenue',
      categoryId: 'cat-services',
      categoryName: 'Salon Services',
      amountCents: 5000, // $50.00
      paymentMethod: 'cash',
      description: 'Express Manicure',
    },
    {
      id: 'tx-3',
      transactionDate: '2026-08-12',
      type: 'revenue',
      categoryId: 'cat-retail',
      categoryName: 'Retail Products',
      amountCents: 7500, // $75.00
      paymentMethod: 'card',
      description: 'Cuticle Oil + Hand Cream',
    },
    {
      id: 'tx-4',
      transactionDate: '2026-08-15',
      type: 'expense',
      categoryId: 'cat-supplies',
      categoryName: 'Salon Supplies',
      amountCents: 4000, // $40.00
      paymentMethod: 'bank_transfer',
      description: 'Nail files and acetone',
    },
    {
      id: 'tx-5',
      transactionDate: '2026-08-16',
      type: 'expense',
      categoryId: 'cat-rent',
      categoryName: 'Rent & Utilities',
      amountCents: 6000, // $60.00
      paymentMethod: 'bank_transfer',
      description: 'Electricity bill',
    },
  ];

  it('aggregates total revenue and expenses accurately in integer cents', () => {
    const summary = calculateFinancialSummary(sampleTransactions);

    // Revenue: 10000 + 5000 + 7500 = 22500 cents ($225.00)
    expect(summary.totalRevenueCents).toBe(22500);

    // Expense: 4000 + 6000 = 10000 cents ($100.00)
    expect(summary.totalExpenseCents).toBe(10000);

    // Net Profit: 22500 - 10000 = 12500 cents ($125.00)
    expect(summary.netProfitCents).toBe(12500);

    // Profit Margin: (12500 / 22500) * 100 = 55.56%
    expect(summary.profitMarginPercent).toBe(55.56);
  });

  it('computes 1/11th Australian GST collected, paid, and net payable', () => {
    const summary = calculateFinancialSummary(sampleTransactions);

    // GST on tx-1 ($100) = round(10000 / 11) = 909
    // GST on tx-2 ($50) = round(5000 / 11) = 455
    // GST on tx-3 ($75) = round(7500 / 11) = 682
    // Sum collected = 909 + 455 + 682 = 2046 cents ($20.46)
    expect(summary.gstCollectedCents).toBe(2046);

    // GST on tx-4 ($40) = round(4000 / 11) = 364
    // GST on tx-5 ($60) = round(6000 / 11) = 545
    // Sum paid = 364 + 545 = 909 cents ($9.09)
    expect(summary.gstPaidCents).toBe(909);

    // Net GST Payable: 2046 - 909 = 1137 cents ($11.37)
    expect(summary.netGstPayableCents).toBe(1137);
  });

  it('breaks down revenue and expenses by category', () => {
    const summary = calculateFinancialSummary(sampleTransactions);

    expect(summary.revenueByCategory['Salon Services']).toBe(15000);
    expect(summary.revenueByCategory['Retail Products']).toBe(7500);
    expect(summary.expenseByCategory['Salon Supplies']).toBe(4000);
    expect(summary.expenseByCategory['Rent & Utilities']).toBe(6000);
  });

  it('breaks down revenue by payment method', () => {
    const summary = calculateFinancialSummary(sampleTransactions);

    expect(summary.revenueByPaymentMethod['card']).toBe(17500); // 10000 + 7500
    expect(summary.revenueByPaymentMethod['cash']).toBe(5000);
  });

  it('handles empty transaction set gracefully without errors', () => {
    const summary = calculateFinancialSummary([]);

    expect(summary.totalRevenueCents).toBe(0);
    expect(summary.totalExpenseCents).toBe(0);
    expect(summary.netProfitCents).toBe(0);
    expect(summary.profitMarginPercent).toBe(0);
    expect(summary.gstCollectedCents).toBe(0);
    expect(summary.gstPaidCents).toBe(0);
    expect(summary.netGstPayableCents).toBe(0);
    expect(summary.transactionCount).toBe(0);
  });

  it('handles zero revenue with expenses (loss scenario) without NaN', () => {
    const expensesOnly: TransactionRecord[] = [
      {
        id: 'tx-loss',
        transactionDate: '2026-08-20',
        type: 'expense',
        categoryId: 'cat-rent',
        categoryName: 'Rent',
        amountCents: 50000,
        paymentMethod: 'bank_transfer',
        description: 'Monthly Rent',
      },
    ];

    const summary = calculateFinancialSummary(expensesOnly);
    expect(summary.totalRevenueCents).toBe(0);
    expect(summary.totalExpenseCents).toBe(50000);
    expect(summary.netProfitCents).toBe(-50000);
    expect(summary.profitMarginPercent).toBe(0); // guarded against NaN / -Infinity
  });

  it('aggregates and ranks categories with percentage of total', () => {
    const categories = aggregateByCategory(sampleTransactions, 'revenue');

    expect(categories).toHaveLength(2);
    expect(categories[0].categoryName).toBe('Salon Services');
    expect(categories[0].totalCents).toBe(15000);
    expect(categories[0].percentageOfTotal).toBe(66.67);

    expect(categories[1].categoryName).toBe('Retail Products');
    expect(categories[1].totalCents).toBe(7500);
    expect(categories[1].percentageOfTotal).toBe(33.33);
  });

  it('filters transactions accurately by closed date range', () => {
    const filtered = filterTransactionsByDateRange(sampleTransactions, '2026-08-11', '2026-08-15');
    expect(filtered).toHaveLength(3); // tx-2 (11th), tx-3 (12th), tx-4 (15th)
    expect(filtered.map((t) => t.id)).toEqual(['tx-2', 'tx-3', 'tx-4']);
  });
});
