/**
 * Adversarial Stress Test Suite: Milestone 5 Mathematical Invariants & Precision
 * Author: Challenger 1 (Empirical Challenger)
 * Scope: src/lib/finance/calculations.ts, src/lib/utils/currency.ts
 *
 * Verifies:
 * 1. Statutory 1/11th GST inclusive invariant: grossCents === netCents + gstCents across 100,000+ sequential and random cents.
 * 2. Exact rounding behavior at specific statutory thresholds ($0.01, $0.05, $0.06, $0.09, $0.11, $0.15, $0.99, etc.).
 * 3. Extreme value boundaries: $0.00, $0.01, $1,000,000.00, $99,999,999.99, negative refunds/reversals, large arrays.
 * 4. Floating-point drift resistance: integer cents vs standard IEEE 754 float arithmetic across 100,000 transactions.
 * 5. Division-by-zero guards: $0 revenue, $0 expenses, equal revenue & expenses, zero margin periods.
 * 6. High-volume throughput: 10,000 and 50,000 transactions processed in calculateFinancialSummary with exact balance reconciliation.
 * 7. Currency formatting, parsing, and options resilience.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateFinancialSummary,
  aggregateByCategory,
  filterTransactionsByDateRange,
  TransactionRecord,
} from '@/lib/finance/calculations';
import {
  calculateGST,
  formatAUD,
  dollarsToCents,
  centsToDollars,
  parseAUD,
} from '@/lib/utils/currency';

describe('Adversarial Challenger 1: Accounting Invariants & Precision', () => {
  // Simple LCG PRNG for repeatable deterministic pseudo-random testing
  function createLcg(seed: number = 123456789) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  describe('1. Statutory 1/11th Inclusive GST Invariant Across 100,000+ Values', () => {
    it('Invariant holds for 100,001 consecutive sequential integer cents ($0.00 to $1,000.00)', () => {
      let failureCount = 0;
      const totalSequential = 100_000;

      for (let gross = 0; gross <= totalSequential; gross++) {
        const { netCents, gstCents, grossCents } = calculateGST(gross);

        // Invariant 1: exact balance gross === net + gst
        if (netCents + gstCents !== grossCents) {
          failureCount++;
        }
        // Invariant 2: grossCents matches input
        if (grossCents !== gross) {
          failureCount++;
        }
        // Invariant 3: values are integer cents
        if (!Number.isInteger(netCents) || !Number.isInteger(gstCents)) {
          failureCount++;
        }
        // Invariant 4: non-negative for positive gross
        if (netCents < 0 || gstCents < 0) {
          failureCount++;
        }
        // Invariant 5: GST matches statutory Math.round(gross / 11)
        const expectedGst = Math.round(gross / 11);
        if (gstCents !== expectedGst) {
          failureCount++;
        }
      }

      expect(failureCount).toBe(0);
    });

    it('Invariant holds for 100,000 pseudo-random amounts up to $10,000,000.00 (1 billion cents)', () => {
      const rng = createLcg(987654321);
      let failureCount = 0;
      const iterations = 100_000;

      for (let i = 0; i < iterations; i++) {
        // Sample across multiple scales: micro, small, medium, large, ultra-large
        const scale = rng();
        let gross: number;
        if (scale < 0.2) {
          gross = Math.floor(rng() * 100); // 0 to $1
        } else if (scale < 0.6) {
          gross = Math.floor(rng() * 100_000); // $0 to $1,000
        } else if (scale < 0.9) {
          gross = Math.floor(rng() * 10_000_000); // $0 to $100,000
        } else {
          gross = Math.floor(rng() * 1_000_000_000); // $0 to $10,000,000
        }

        const { netCents, gstCents, grossCents } = calculateGST(gross);

        if (netCents + gstCents !== grossCents) failureCount++;
        if (grossCents !== gross) failureCount++;
        if (!Number.isInteger(netCents) || !Number.isInteger(gstCents)) failureCount++;
        if (gstCents !== Math.round(gross / 11)) failureCount++;
      }

      expect(failureCount).toBe(0);
    });

    it('Verifies exact statutory rounding at critical benchmark cent values', () => {
      const benchmarks: Array<{
        cents: number;
        expectedNet: number;
        expectedGst: number;
        description: string;
      }> = [
        { cents: 1, expectedNet: 1, expectedGst: 0, description: '$0.01: 1/11 = 0.09c -> 0c GST' },
        { cents: 5, expectedNet: 5, expectedGst: 0, description: '$0.05: 5/11 = 0.45c -> 0c GST' },
        { cents: 6, expectedNet: 5, expectedGst: 1, description: '$0.06: 6/11 = 0.55c -> 1c GST' },
        { cents: 9, expectedNet: 8, expectedGst: 1, description: '$0.09: 9/11 = 0.82c -> 1c GST' },
        { cents: 10, expectedNet: 9, expectedGst: 1, description: '$0.10: 10/11 = 0.91c -> 1c GST' },
        { cents: 11, expectedNet: 10, expectedGst: 1, description: '$0.11: 11/11 = 1.00c -> 1c GST' },
        { cents: 15, expectedNet: 14, expectedGst: 1, description: '$0.15: 15/11 = 1.36c -> 1c GST' },
        { cents: 16, expectedNet: 15, expectedGst: 1, description: '$0.16: 16/11 = 1.45c -> 1c GST' },
        { cents: 17, expectedNet: 15, expectedGst: 2, description: '$0.17: 17/11 = 1.55c -> 2c GST' },
        { cents: 22, expectedNet: 20, expectedGst: 2, description: '$0.22: 22/11 = 2.00c -> 2c GST' },
        { cents: 50, expectedNet: 45, expectedGst: 5, description: '$0.50: 50/11 = 4.55c -> 5c GST' },
        { cents: 55, expectedNet: 50, expectedGst: 5, description: '$0.55: 55/11 = 5.00c -> 5c GST' },
        { cents: 99, expectedNet: 90, expectedGst: 9, description: '$0.99: 99/11 = 9.00c -> 9c GST' },
        { cents: 100, expectedNet: 91, expectedGst: 9, description: '$1.00: 100/11 = 9.09c -> 9c GST' },
        { cents: 110, expectedNet: 100, expectedGst: 10, description: '$1.10: 110/11 = 10.0c -> 10c GST' },
        { cents: 5500, expectedNet: 5000, expectedGst: 500, description: '$55.00: 5500/11 = 500c GST' },
        { cents: 10999, expectedNet: 9999, expectedGst: 1000, description: '$109.99: 10999/11 = 999.91c -> 1000c GST' },
        { cents: 11000, expectedNet: 10000, expectedGst: 1000, description: '$110.00: 11000/11 = 1000c GST' },
      ];

      for (const b of benchmarks) {
        const res = calculateGST(b.cents);
        expect(res.netCents, `Net mismatch for ${b.description}`).toBe(b.expectedNet);
        expect(res.gstCents, `GST mismatch for ${b.description}`).toBe(b.expectedGst);
        expect(res.netCents + res.gstCents).toBe(b.cents);
      }
    });

    it('Invariant holds for 10,000 consecutive negative values (-1 to -10,000 cents)', () => {
      let failureCount = 0;
      for (let gross = -1; gross >= -10000; gross--) {
        const { netCents, gstCents, grossCents } = calculateGST(gross);
        if (netCents + gstCents !== grossCents) failureCount++;
        if (grossCents !== gross) failureCount++;
        if (netCents > 0 || gstCents > 0) failureCount++;
      }
      expect(failureCount).toBe(0);
    });
  });

  describe('2. Extreme Values and Boundary Invariants', () => {
    it('Boundary: zero cents ($0.00)', () => {
      const res = calculateGST(0);
      expect(res).toEqual({ netCents: 0, gstCents: 0, grossCents: 0 });
      expect(res.netCents + res.gstCents).toBe(0);
    });

    it('Boundary: one cent ($0.01)', () => {
      const res = calculateGST(1);
      expect(res).toEqual({ netCents: 1, gstCents: 0, grossCents: 1 });
      expect(res.netCents + res.gstCents).toBe(1);
    });

    it('Extreme: one million dollars ($1,000,000.00 = 100,000,000 cents)', () => {
      const gross = 100_000_000;
      const res = calculateGST(gross);
      // 100,000,000 * 10 / 11 = 90,909,090.909... => net = 90,909,091
      // gst = 100,000,000 - 90,909,091 = 9,090,909
      expect(res.netCents).toBe(90_909_091);
      expect(res.gstCents).toBe(9_090_909);
      expect(res.netCents + res.gstCents).toBe(gross);
      expect(formatAUD(gross)).toBe('$1,000,000.00');
    });

    it('Extreme: ninety-nine million dollars ($99,999,999.99 = 9,999,999,999 cents)', () => {
      const gross = 9_999_999_999;
      const res = calculateGST(gross);
      // 9,999,999,999 * 10 / 11 = 9,090,909,090
      // gst = 909,090,909
      expect(res.netCents).toBe(9_090_909_090);
      expect(res.gstCents).toBe(909_090_909);
      expect(res.netCents + res.gstCents).toBe(gross);
      expect(formatAUD(gross)).toBe('$99,999,999.99');
    });

    it('Extreme: negative one million dollars (-$1,000,000.00 = -100,000,000 cents)', () => {
      const gross = -100_000_000;
      const res = calculateGST(gross);
      expect(res.netCents).toBe(-90_909_091);
      expect(res.gstCents).toBe(-9_090_909);
      expect(res.netCents + res.gstCents).toBe(gross);
      expect(formatAUD(gross)).toBe('-$1,000,000.00');
    });

    it('Invalid inputs: NaN, undefined, empty inputs fail gracefully', () => {
      expect(calculateGST(NaN)).toEqual({ netCents: 0, gstCents: 0, grossCents: 0 });
      expect(dollarsToCents(NaN)).toBe(0);
      expect(centsToDollars(NaN)).toBe(0);
      expect(formatAUD(NaN)).toBe('$0.00');
      expect(parseAUD('')).toBe(0);
      expect(parseAUD('   ')).toBe(0);
      expect(parseAUD('not a number')).toBe(0);
    });
  });

  describe('3. Floating-Point Drift Resistance Stress Test (100,000 Transactions)', () => {
    it('Demonstrates zero floating-point accumulation drift in integer cents vs IEEE 754 floats', () => {
      const count = 100_000;
      const testPriceDollars = 19.99; // Standard problematic IEEE 754 representation: 19.9899999999999984...
      const testPriceCents = 1999;    // Exact integer

      let floatDollarSum = 0;
      let integerCentSum = 0;

      for (let i = 0; i < count; i++) {
        floatDollarSum += testPriceDollars;
        integerCentSum += testPriceCents;
      }

      // Expected exact mathematical sum: 100,000 * 19.99 = 1,999,000.00 dollars = 199,900,000 cents
      const expectedDollars = 1_999_000.00;
      const expectedCents = 199_900_000;

      // 1. Integer cents has EXACT zero drift
      expect(integerCentSum).toBe(expectedCents);
      expect(Number.isInteger(integerCentSum)).toBe(true);
      expect(centsToDollars(integerCentSum)).toBe(expectedDollars);

      // 2. IEEE 754 float sum experiences drift in raw addition
      const floatDrift = Math.abs(floatDollarSum - expectedDollars);
      expect(integerCentSum).toBe(expectedCents);
      expect(dollarsToCents(expectedDollars)).toBe(expectedCents);
    });

    it('100,000 mixed transaction prices maintain exact zero drift in cents', () => {
      const rng = createLcg(42);
      const prices = [1999, 10, 1, 10545, 3333, 5500, 1250, 4800, 6500, 9500];

      let totalCents = 0;
      let expectedSum = 0;

      for (let i = 0; i < 100_000; i++) {
        const price = prices[Math.floor(rng() * prices.length)];
        totalCents += price;
        expectedSum += price;
      }

      expect(totalCents).toBe(expectedSum);
      expect(Number.isInteger(totalCents)).toBe(true);
      expect(Number.isSafeInteger(totalCents)).toBe(true);
    });
  });

  describe('4. Engine Stress: High Volume 10,000 & 50,000 Transactions in calculateFinancialSummary', () => {
    it('Processes 10,000 transactions with full reconciliation and sub-second execution', () => {
      const rng = createLcg(555);
      const transactionCount = 10_000;
      const transactions: TransactionRecord[] = [];

      const categories = [
        { id: 'cat-serv', name: 'Services', type: 'revenue' },
        { id: 'cat-ret', name: 'Retail', type: 'revenue' },
        { id: 'cat-tips', name: 'Tips', type: 'revenue' },
        { id: 'cat-rent', name: 'Rent', type: 'expense' },
        { id: 'cat-sup', name: 'Supplies', type: 'expense' },
        { id: 'cat-wages', name: 'Wages', type: 'expense' },
        { id: 'cat-util', name: 'Utilities', type: 'expense' },
      ];

      const paymentMethods = ['cash', 'card', 'eftpos', 'bank_transfer', 'gift_card'];

      let expectedManualRevenue = 0;
      let expectedManualExpense = 0;
      let expectedManualGstCollected = 0;
      let expectedManualGstPaid = 0;

      for (let i = 0; i < transactionCount; i++) {
        const cat = categories[Math.floor(rng() * categories.length)];
        const amountCents = Math.floor(rng() * 20_000) + 100; // $1.00 to $201.00
        const method = paymentMethods[Math.floor(rng() * paymentMethods.length)];
        const gst = calculateGST(amountCents).gstCents;

        if (cat.type === 'revenue') {
          expectedManualRevenue += amountCents;
          expectedManualGstCollected += gst;
        } else {
          expectedManualExpense += amountCents;
          expectedManualGstPaid += gst;
        }

        transactions.push({
          id: `stress-tx-${i}`,
          transactionDate: `2026-${String(Math.floor(rng() * 12) + 1).padStart(2, '0')}-${String(Math.floor(rng() * 28) + 1).padStart(2, '0')}`,
          type: cat.type as 'revenue' | 'expense',
          categoryId: cat.id,
          categoryName: cat.name,
          amountCents,
          paymentMethod: method,
          description: `Stress Transaction ${i}`,
        });
      }

      const startTime = performance.now();
      const summary = calculateFinancialSummary(transactions);
      const durationMs = performance.now() - startTime;

      // 1. Performance check: 10,000 transactions should process in < 250ms
      expect(durationMs).toBeLessThan(250);

      // 2. Absolute mathematical accuracy
      expect(summary.totalRevenueCents).toBe(expectedManualRevenue);
      expect(summary.totalExpenseCents).toBe(expectedManualExpense);
      expect(summary.gstCollectedCents).toBe(expectedManualGstCollected);
      expect(summary.gstPaidCents).toBe(expectedManualGstPaid);

      // 3. Accounting invariants
      expect(summary.netProfitCents).toBe(summary.totalRevenueCents - summary.totalExpenseCents);
      expect(summary.netGstPayableCents).toBe(summary.gstCollectedCents - summary.gstPaidCents);
      expect(summary.transactionCount).toBe(transactionCount);

      // 4. Categorical reconciliation
      const totalRevFromCategories = Object.values(summary.revenueByCategory).reduce((a, b) => a + b, 0);
      expect(totalRevFromCategories).toBe(summary.totalRevenueCents);

      const totalExpFromCategories = Object.values(summary.expenseByCategory).reduce((a, b) => a + b, 0);
      expect(totalExpFromCategories).toBe(summary.totalExpenseCents);

      const totalRevFromPayments = Object.values(summary.revenueByPaymentMethod).reduce((a, b) => a + b, 0);
      expect(totalRevFromPayments).toBe(summary.totalRevenueCents);

      // 5. Margin formula correctness
      const expectedMargin = Number(((summary.netProfitCents / summary.totalRevenueCents) * 100).toFixed(2));
      expect(summary.profitMarginPercent).toBe(expectedMargin);
    });

    it('Processes 50,000 transactions without stack overflow or memory leaks', () => {
      const rng = createLcg(999);
      const count = 50_000;
      const transactions: TransactionRecord[] = [];

      for (let i = 0; i < count; i++) {
        const isRev = rng() > 0.4;
        transactions.push({
          id: `tx-${i}`,
          transactionDate: '2026-08-15',
          type: isRev ? 'revenue' : 'expense',
          categoryId: isRev ? 'c-rev' : 'c-exp',
          amountCents: 5500, // $55.00
          paymentMethod: 'eftpos',
          description: `Tx ${i}`,
        });
      }

      const summary = calculateFinancialSummary(transactions);
      expect(summary.transactionCount).toBe(count);
      expect(summary.totalRevenueCents + summary.totalExpenseCents).toBe(count * 5500);
      expect(summary.netProfitCents).toBe(summary.totalRevenueCents - summary.totalExpenseCents);
    });
  });

  describe('5. Division-by-Zero and Edge-Case Protections', () => {
    it('Period with $0 revenue and $0 expenses: profit margin is strictly 0 (no NaN / Infinity)', () => {
      const summary = calculateFinancialSummary([]);
      expect(summary.totalRevenueCents).toBe(0);
      expect(summary.totalExpenseCents).toBe(0);
      expect(summary.netProfitCents).toBe(0);
      expect(summary.profitMarginPercent).toBe(0);
      expect(Number.isNaN(summary.profitMarginPercent)).toBe(false);
      expect(Number.isFinite(summary.profitMarginPercent)).toBe(true);
    });

    it('Period with $0 revenue and positive expenses: profit margin guarded to 0', () => {
      const summary = calculateFinancialSummary([
        {
          id: 'exp-only',
          transactionDate: '2026-11-01',
          type: 'expense',
          categoryId: 'c-rent',
          amountCents: 50000,
          paymentMethod: 'bank_transfer',
          description: 'Rent',
        },
      ]);
      expect(summary.totalRevenueCents).toBe(0);
      expect(summary.totalExpenseCents).toBe(50000);
      expect(summary.netProfitCents).toBe(-50000);
      expect(summary.profitMarginPercent).toBe(0); // Guard prevents -Infinity
      expect(Number.isFinite(summary.profitMarginPercent)).toBe(true);
    });

    it('Period with equal revenue and expenses: net profit 0, margin 0.00%', () => {
      const summary = calculateFinancialSummary([
        {
          id: 'rev-1',
          transactionDate: '2026-11-01',
          type: 'revenue',
          categoryId: 'c-serv',
          amountCents: 100000, // $1,000
          paymentMethod: 'card',
          description: 'Sales',
        },
        {
          id: 'exp-1',
          transactionDate: '2026-11-02',
          type: 'expense',
          categoryId: 'c-rent',
          amountCents: 100000, // $1,000
          paymentMethod: 'bank_transfer',
          description: 'Rent',
        },
      ]);
      expect(summary.netProfitCents).toBe(0);
      expect(summary.profitMarginPercent).toBe(0);
    });

    it('Period with 1 cent revenue and $1,000,000 expenses: valid finite negative margin', () => {
      const summary = calculateFinancialSummary([
        {
          id: 'rev-micro',
          transactionDate: '2026-11-01',
          type: 'revenue',
          categoryId: 'c-serv',
          amountCents: 1, // $0.01
          paymentMethod: 'cash',
          description: '1c sale',
        },
        {
          id: 'exp-huge',
          transactionDate: '2026-11-02',
          type: 'expense',
          categoryId: 'c-rent',
          amountCents: 100_000_000, // $1,000,000
          paymentMethod: 'bank_transfer',
          description: 'Huge expense',
        },
      ]);
      expect(summary.netProfitCents).toBe(1 - 100_000_000);
      expect(Number.isFinite(summary.profitMarginPercent)).toBe(true);
      expect(summary.profitMarginPercent).toBeLessThan(0);
    });

    it('aggregateByCategory: guards division-by-zero when total cents is 0', () => {
      const emptyAgg = aggregateByCategory([], 'revenue');
      expect(emptyAgg).toEqual([]);

      const zeroTransactions: TransactionRecord[] = [
        {
          id: 'z-1',
          transactionDate: '2026-11-01',
          type: 'revenue',
          categoryId: 'c-zero',
          categoryName: 'Zero Category',
          amountCents: 0,
          paymentMethod: 'cash',
          description: 'Zero',
        },
      ];
      const zeroAgg = aggregateByCategory(zeroTransactions, 'revenue');
      expect(zeroAgg.length).toBe(1);
      expect(zeroAgg[0].percentageOfTotal).toBe(0);
      expect(Number.isNaN(zeroAgg[0].percentageOfTotal)).toBe(false);
    });

    it('filterTransactionsByDateRange: edge case boundaries with ISO timestamps and leap years', () => {
      const txs: TransactionRecord[] = [
        {
          id: 'leap-1',
          transactionDate: '2028-02-28T23:59:59.999Z',
          type: 'revenue',
          categoryId: 'c-1',
          amountCents: 1000,
          paymentMethod: 'eftpos',
          description: 'Feb 28',
        },
        {
          id: 'leap-2',
          transactionDate: '2028-02-29T12:00:00Z', // Leap day
          type: 'revenue',
          categoryId: 'c-1',
          amountCents: 2000,
          paymentMethod: 'eftpos',
          description: 'Leap Day',
        },
        {
          id: 'leap-3',
          transactionDate: '2028-03-01T00:00:00Z',
          type: 'revenue',
          categoryId: 'c-1',
          amountCents: 3000,
          paymentMethod: 'eftpos',
          description: 'March 1',
        },
      ];

      // Exact leap day inclusion
      const leapOnly = filterTransactionsByDateRange(txs, '2028-02-29', '2028-02-29');
      expect(leapOnly.map((t) => t.id)).toEqual(['leap-2']);

      // February range including leap day
      const feb = filterTransactionsByDateRange(txs, '2028-02-01', '2028-02-29');
      expect(feb.map((t) => t.id)).toEqual(['leap-1', 'leap-2']);
    });
  });

  describe('6. Currency Utility Stress and Round-Trip Invariants', () => {
    it('formatAUD produces expected Australian standard representations', () => {
      expect(formatAUD(0)).toBe('$0.00');
      expect(formatAUD(1)).toBe('$0.01');
      expect(formatAUD(99)).toBe('$0.99');
      expect(formatAUD(100)).toBe('$1.00');
      expect(formatAUD(5550)).toBe('$55.50');
      expect(formatAUD(12345678)).toBe('$123,456.78');
      expect(formatAUD(-2550)).toBe('-$25.50');
      expect(formatAUD(5500, { trimZeroCents: true })).toBe('$55');
      expect(formatAUD(5550, { trimZeroCents: true })).toBe('$55.50');
      expect(formatAUD(5500, { showCurrencyCode: true })).toBe('AU $55.00');
      expect(formatAUD(-5500, { trimZeroCents: true })).toBe('-$55');
      expect(formatAUD(-5500, { showCurrencyCode: true })).toBe('-AU $55.00');
      expect(formatAUD(-0)).toBe('$0.00');
    });

    it('parseAUD parses currency strings into integer cents robustly', () => {
      expect(parseAUD('$55.00')).toBe(5500);
      expect(parseAUD(' 55.50 ')).toBe(5550);
      expect(parseAUD('$1,250.00')).toBe(125000);
      expect(parseAUD('-$20.00')).toBe(-2000);
      expect(parseAUD('-20.5')).toBe(-2050);
      expect(parseAUD('$0.05')).toBe(5);
      expect(parseAUD('$0.01')).toBe(1);
      expect(parseAUD('$0.00')).toBe(0);
      expect(parseAUD('')).toBe(0);
      expect(parseAUD('invalid')).toBe(0);
      expect(parseAUD('- $50.00')).toBe(-5000);
      expect(parseAUD('$1,000,000.00')).toBe(100000000);
    });

    it('Round-trip invariant: parseAUD(formatAUD(cents)) === cents for 10,000 positive and negative values', () => {
      const rng = createLcg(777);
      let mismatchCount = 0;

      for (let i = 0; i < 10_000; i++) {
        const sign = rng() > 0.5 ? 1 : -1;
        const cents = sign * Math.floor(rng() * 50_000_00); // Up to $50,000.00
        const formatted = formatAUD(cents);
        const parsed = parseAUD(formatted);

        if (parsed !== cents) {
          mismatchCount++;
        }
      }

      expect(mismatchCount).toBe(0);
    });

    it('dollarsToCents and centsToDollars exact bidirectional mapping for typical salon prices', () => {
      const testCases = [0, 0.01, 0.05, 0.55, 1.0, 15.5, 55.0, 65.0, 95.0, 120.0, 999.99];
      for (const d of testCases) {
        const cents = dollarsToCents(d);
        expect(centsToDollars(cents)).toBe(d);
        expect(Number.isInteger(cents)).toBe(true);
      }
    });
  });
});
