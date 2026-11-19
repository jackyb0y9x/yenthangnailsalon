import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  getAustralianFinancialYear,
  getBASQuarter,
  getBASQuartersForFinancialYear,
  getBASDateRange,
  formatDateAEST,
  SYDNEY_TIMEZONE,
} from '@/lib/utils/date';
import {
  filterTransactionsByDateRange,
  calculateFinancialSummary,
  aggregateByCategory,
  TransactionRecord,
} from '@/lib/finance/calculations';
import {
  syncVisitsFromCrm,
  resetFinanceStore,
  mockFinanceStore,
  getTransactions,
  getFinancialSummaryData,
  createTransaction,
} from '@/lib/finance/store';
import { mockCrmStore, MockVisit } from '@/lib/crm/mock-customers';
import { POST as syncVisitsRoute } from '@/app/api/admin/finance/sync-visits/route';

function createAdminRequest(url: string, method: string = 'POST') {
  return new NextRequest(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'sb-authenticated=true; sb-role=manager; sb-email=manager@glamournails.com.au',
    },
  });
}

describe('Milestone 5 Adversarial Challenger 2: Date Boundaries, Timezones & CRM Sync Idempotency', () => {
  beforeEach(() => {
    resetFinanceStore();
    mockCrmStore.reset();
  });

  // =========================================================================
  // Section 1: Australian Financial Year (1 July - 30 June) Boundary Transitions
  // =========================================================================
  describe('1. Australian Financial Year (1 July - 30 June) Boundary Transitions (2024-2028)', () => {
    const testYears = [2024, 2025, 2026, 2027, 2028];

    testYears.forEach((year) => {
      const prevYearShort = (year - 1).toString();
      const currYearShort = year.toString().slice(-2);
      const nextYearShort = (year + 1).toString().slice(-2);
      const expectedOldFYLabel = `FY${year - 1}-${currYearShort}`;
      const expectedNewFYLabel = `FY${year}-${nextYearShort}`;

      it(`transitions precisely at June 30 23:59:59 vs July 1 00:00:00 for year ${year}`, () => {
        // June 30 23:59:59 Sydney time (AEST UTC+10)
        const june30AEST = `${year}-06-30T23:59:59+10:00`;
        const oldFY = getAustralianFinancialYear(june30AEST);
        expect(oldFY.startYear).toBe(year - 1);
        expect(oldFY.endYear).toBe(year);
        expect(oldFY.label).toBe(expectedOldFYLabel);
        expect(oldFY.startDate).toBe(`${year - 1}-07-01`);
        expect(oldFY.endDate).toBe(`${year}-06-30`);

        // July 1 00:00:00 Sydney time (AEST UTC+10)
        const july1AEST = `${year}-07-01T00:00:00+10:00`;
        const newFY = getAustralianFinancialYear(july1AEST);
        expect(newFY.startYear).toBe(year);
        expect(newFY.endYear).toBe(year + 1);
        expect(newFY.label).toBe(expectedNewFYLabel);
        expect(newFY.startDate).toBe(`${year}-07-01`);
        expect(newFY.endDate).toBe(`${year + 1}-06-30`);
      });

      it(`handles millisecond precision boundary for year ${year}`, () => {
        // June 30 23:59:59.999+10:00
        const june30Ms = `${year}-06-30T23:59:59.999+10:00`;
        const oldFY = getAustralianFinancialYear(june30Ms);
        expect(oldFY.label).toBe(expectedOldFYLabel);

        // July 1 00:00:00.000+10:00
        const july1Ms = `${year}-07-01T00:00:00.000+10:00`;
        const newFY = getAustralianFinancialYear(july1Ms);
        expect(newFY.label).toBe(expectedNewFYLabel);
      });

      it(`handles plain date string format (YYYY-MM-DD) for year ${year}`, () => {
        const june30 = `${year}-06-30`;
        const july1 = `${year}-07-01`;

        const oldFY = getAustralianFinancialYear(june30);
        expect(oldFY.label).toBe(expectedOldFYLabel);

        const newFY = getAustralianFinancialYear(july1);
        expect(newFY.label).toBe(expectedNewFYLabel);
      });
    });

    it('rejects invalid or corrupted date values with explicit error', () => {
      expect(() => getAustralianFinancialYear('invalid-date')).toThrow(/Invalid date/);
      expect(() => getAustralianFinancialYear('2026-13-45')).toThrow(/Invalid date/);
      expect(() => getAustralianFinancialYear('')).toThrow(/Invalid date/);
      expect(() => getAustralianFinancialYear(new Date('invalid'))).toThrow(/Invalid date/);
    });
  });

  // =========================================================================
  // Section 2: Sydney Timezone (AEST / AEDT) Offsets & UTC Midnight Alignment
  // =========================================================================
  describe('2. Sydney Timezone (AEST/AEDT) Offsets & UTC Midnight Alignment', () => {
    it('verifies that UTC midnight does not cause off-by-one day assignment in winter (AEST UTC+10)', () => {
      // UTC midnight on July 1 is 10:00 AM on July 1 in Sydney
      const utcMidnightJuly1 = '2026-07-01T00:00:00.000Z';
      const formatted = formatDateAEST(utcMidnightJuly1, 'dateOnly');
      expect(formatted).toBe('01/07/2026');

      const fy = getAustralianFinancialYear(utcMidnightJuly1);
      expect(fy.label).toBe('FY2026-27');
      expect(fy.startYear).toBe(2026);

      // UTC midnight on June 30 is 10:00 AM on June 30 in Sydney
      const utcMidnightJune30 = '2026-06-30T00:00:00.000Z';
      const formattedJune = formatDateAEST(utcMidnightJune30, 'dateOnly');
      expect(formattedJune).toBe('30/06/2026');

      const fyJune = getAustralianFinancialYear(utcMidnightJune30);
      expect(fyJune.label).toBe('FY2025-26');
      expect(fyJune.startYear).toBe(2025);
    });

    it('verifies that UTC instant corresponding to Sydney midnight transitions FY correctly', () => {
      // Sydney midnight 2026-07-01 00:00:00+10:00 is 2026-06-30 14:00:00 UTC
      // Notice: In UTC this is still June 30, but in Sydney it is July 1st!
      const sydneyMidnightInUTC = '2026-06-30T14:00:00.000Z';
      const fyNew = getAustralianFinancialYear(sydneyMidnightInUTC);
      expect(fyNew.label).toBe('FY2026-27');
      expect(fyNew.startYear).toBe(2026);

      // One second before Sydney midnight: 2026-06-30 13:59:59 UTC (Sydney 23:59:59 June 30)
      const oneSecBeforeSydneyMidnightInUTC = '2026-06-30T13:59:59.000Z';
      const fyOld = getAustralianFinancialYear(oneSecBeforeSydneyMidnightInUTC);
      expect(fyOld.label).toBe('FY2025-26');
      expect(fyOld.startYear).toBe(2025);
    });

    it('verifies daylight saving time (AEDT UTC+11) boundary alignment in summer', () => {
      // Sydney is AEDT (UTC+11) on December 31 / January 1
      // Sydney midnight 2027-01-01 00:00:00+11:00 is 2026-12-31 13:00:00 UTC
      const sydneyNewYearInUTC = '2026-12-31T13:00:00.000Z';
      expect(formatDateAEST(sydneyNewYearInUTC, 'dateOnly')).toBe('01/01/2027');

      const q3 = getBASQuarter(sydneyNewYearInUTC);
      expect(q3.quarter).toBe('Q3');
      expect(q3.startDate).toBe('2027-01-01');

      // 1 second prior: 2026-12-31 12:59:59 UTC (Sydney 23:59:59 Dec 31)
      const sydneyDec31EndInUTC = '2026-12-31T12:59:59.000Z';
      expect(formatDateAEST(sydneyDec31EndInUTC, 'dateOnly')).toBe('31/12/2026');

      const q2 = getBASQuarter(sydneyDec31EndInUTC);
      expect(q2.quarter).toBe('Q2');
      expect(q2.endDate).toBe('2026-12-31');
    });
  });

  // =========================================================================
  // Section 3: BAS Quarter Boundaries & Leap Year Stress Testing
  // =========================================================================
  describe('3. BAS Quarter Boundaries & Leap Year Transitions', () => {
    describe('3.1 All 4 BAS Quarter Transitions', () => {
      it('tests Q1 / Q2 boundary (Sep 30 vs Oct 1)', () => {
        const sep30 = getBASQuarter('2026-09-30T23:59:59+10:00');
        expect(sep30.quarter).toBe('Q1');
        expect(sep30.startDate).toBe('2026-07-01');
        expect(sep30.endDate).toBe('2026-09-30');

        const oct1 = getBASQuarter('2026-10-01T00:00:00+10:00');
        expect(oct1.quarter).toBe('Q2');
        expect(oct1.startDate).toBe('2026-10-01');
        expect(oct1.endDate).toBe('2026-12-31');
      });

      it('tests Q2 / Q3 boundary (Dec 31 vs Jan 1)', () => {
        const dec31 = getBASQuarter('2026-12-31T23:59:59+11:00');
        expect(dec31.quarter).toBe('Q2');
        expect(dec31.startDate).toBe('2026-10-01');
        expect(dec31.endDate).toBe('2026-12-31');

        const jan1 = getBASQuarter('2027-01-01T00:00:00+11:00');
        expect(jan1.quarter).toBe('Q3');
        expect(jan1.startDate).toBe('2027-01-01');
        expect(jan1.endDate).toBe('2027-03-31');
      });

      it('tests Q3 / Q4 boundary (Mar 31 vs Apr 1)', () => {
        const mar31 = getBASQuarter('2027-03-31T23:59:59+11:00');
        expect(mar31.quarter).toBe('Q3');
        expect(mar31.startDate).toBe('2027-01-01');
        expect(mar31.endDate).toBe('2027-03-31');

        const apr1 = getBASQuarter('2027-04-01T00:00:00+11:00');
        expect(apr1.quarter).toBe('Q4');
        expect(apr1.startDate).toBe('2027-04-01');
        expect(apr1.endDate).toBe('2027-06-30');
      });

      it('tests Q4 / Q1 boundary (Jun 30 vs Jul 1)', () => {
        const jun30 = getBASQuarter('2027-06-30T23:59:59+10:00');
        expect(jun30.quarter).toBe('Q4');
        expect(jun30.startDate).toBe('2027-04-01');
        expect(jun30.endDate).toBe('2027-06-30');

        const jul1 = getBASQuarter('2027-07-01T00:00:00+10:00');
        expect(jul1.quarter).toBe('Q1');
        expect(jul1.startDate).toBe('2027-07-01');
        expect(jul1.endDate).toBe('2027-09-30');
      });
    });

    describe('3.2 Leap Year Handling (2024, 2028, 2032)', () => {
      const leapYears = [2024, 2028, 2032];

      leapYears.forEach((year) => {
        it(`accurately handles Feb 28, Feb 29, and Mar 1 in leap year ${year}`, () => {
          // Feb 28
          const feb28 = getBASQuarter(`${year}-02-28`);
          expect(feb28.quarter).toBe('Q3');
          expect(feb28.startDate).toBe(`${year}-01-01`);
          expect(feb28.endDate).toBe(`${year}-03-31`);

          // Feb 29 (Leap Day)
          const feb29 = getBASQuarter(`${year}-02-29`);
          expect(feb29.quarter).toBe('Q3');
          expect(feb29.startDate).toBe(`${year}-01-01`);
          expect(feb29.endDate).toBe(`${year}-03-31`);

          // Mar 1
          const mar1 = getBASQuarter(`${year}-03-01`);
          expect(mar1.quarter).toBe('Q3');
          expect(mar1.startDate).toBe(`${year}-01-01`);
          expect(mar1.endDate).toBe(`${year}-03-31`);

          // Verify FY mapping for Feb 29
          const fyFeb29 = getAustralianFinancialYear(`${year}-02-29`);
          expect(fyFeb29.startYear).toBe(year - 1);
          expect(fyFeb29.endYear).toBe(year);
          expect(fyFeb29.label).toBe(`FY${year - 1}-${year.toString().slice(-2)}`);
        });
      });

      it('filters transactions accurately across Feb 29 leap day boundary', () => {
        const records: TransactionRecord[] = [
          {
            id: 'tx-feb28',
            transactionDate: '2024-02-28',
            type: 'revenue',
            categoryId: 'c1',
            amountCents: 11000,
            gstCents: 1000,
            paymentMethod: 'eftpos',
            description: 'Feb 28 Service',
          },
          {
            id: 'tx-feb29',
            transactionDate: '2024-02-29',
            type: 'revenue',
            categoryId: 'c1',
            amountCents: 22000,
            gstCents: 2000,
            paymentMethod: 'eftpos',
            description: 'Leap Day Service',
          },
          {
            id: 'tx-mar01',
            transactionDate: '2024-03-01',
            type: 'revenue',
            categoryId: 'c1',
            amountCents: 33000,
            gstCents: 3000,
            paymentMethod: 'eftpos',
            description: 'Mar 1 Service',
          },
        ];

        // Q3 range: 2024-01-01 to 2024-03-31
        const q3Range = getBASDateRange(2023, 'Q3');
        const filteredQ3 = filterTransactionsByDateRange(records, q3Range.startDate, q3Range.endDate);
        expect(filteredQ3.length).toBe(3);

        // Strict range matching only leap day
        const leapDayOnly = filterTransactionsByDateRange(records, '2024-02-29', '2024-02-29');
        expect(leapDayOnly.length).toBe(1);
        expect(leapDayOnly[0].id).toBe('tx-feb29');
      });
    });

    describe('3.3 BAS Date Range Helper & Schedule Generation', () => {
      it('returns all 4 valid quarters for FY2026-27 with continuous coverage', () => {
        const quarters = getBASQuartersForFinancialYear(2026);
        expect(quarters.length).toBe(4);
        expect(quarters[0].startDate).toBe('2026-07-01');
        expect(quarters[0].endDate).toBe('2026-09-30');
        expect(quarters[1].startDate).toBe('2026-10-01');
        expect(quarters[1].endDate).toBe('2026-12-31');
        expect(quarters[2].startDate).toBe('2027-01-01');
        expect(quarters[2].endDate).toBe('2027-03-31');
        expect(quarters[3].startDate).toBe('2027-04-01');
        expect(quarters[3].endDate).toBe('2027-06-30');
      });

      it('getBASDateRange returns full year on ALL', () => {
        const fullYear = getBASDateRange(2026, 'ALL');
        expect(fullYear.startDate).toBe('2026-07-01');
        expect(fullYear.endDate).toBe('2027-06-30');
        expect(fullYear.label).toContain('Full Year (FY2026-27)');
      });

      it('throws when an invalid quarter identifier is provided', () => {
        expect(() => getBASDateRange(2026, 'Q5' as any)).toThrow(/Invalid quarter/);
      });
    });
  });

  // =========================================================================
  // Section 4: CRM Visit Auto-Sync Idempotency (Sequential 10 Runs)
  // =========================================================================
  describe('4. CRM Visit Auto-Sync Idempotency (Sequential 10 Runs)', () => {
    function generateMockVisits(count: number): MockVisit[] {
      const visits: MockVisit[] = [];
      for (let i = 1; i <= count; i++) {
        const padded = i.toString().padStart(4, '0');
        visits.push({
          id: `vst-adversarial-${padded}`,
          customer_id: `cust-${padded}`,
          staff_id: `stf-001`,
          service_id: `srv-001`,
          visit_date: `2026-08-${(10 + (i % 15)).toString().padStart(2, '0')}`,
          services_rendered: [{ name: 'Full Acrylic Set', price_aud: 88, price_cents: 8800 }],
          price_charged_aud: 88,
          tip_aud: 10,
          total_paid_aud: 98,
          total_amount_cents: 9800,
          payment_method: i % 2 === 0 ? 'card' : 'cash',
          notes: `Adversarial test visit #${i}`,
          rating: 5,
          photo_urls: [],
          created_at: '2026-08-15T02:00:00Z',
          updated_at: '2026-08-15T02:00:00Z',
        });
      }
      return visits;
    }

    it('creates exactly 50 transactions on Run 1 and exactly 0 duplicates across Runs 2-10', async () => {
      // 1. Populate mock CRM store with 50 visits
      const testVisits = generateMockVisits(50);
      mockCrmStore.visits = [...testVisits];

      // Measure starting transaction count
      const initialTxCount = mockFinanceStore.transactions.length;

      // Run 1: First sync execution
      const run1 = await syncVisitsFromCrm();
      expect(run1.syncedCount).toBe(50);
      expect(run1.transactions.length).toBe(50);
      expect(mockFinanceStore.transactions.length).toBe(initialTxCount + 50);

      // Verify all 50 reference_ids exist in finance transactions
      const createdRefIds = new Set(
        mockFinanceStore.transactions.map((t) => t.reference_id).filter(Boolean)
      );
      for (const visit of testVisits) {
        expect(createdRefIds.has(visit.id)).toBe(true);
      }

      // Runs 2 to 10: Repeated consecutive sync executions
      for (let runIndex = 2; runIndex <= 10; runIndex++) {
        const runN = await syncVisitsFromCrm();
        expect(runN.syncedCount).toBe(0);
        expect(runN.skippedCount).toBe(50);
        expect(runN.transactions.length).toBe(0);

        // Invariant: Total transaction count MUST NOT increase
        expect(mockFinanceStore.transactions.length).toBe(initialTxCount + 50);
      }

      // Check for zero duplicate reference_ids among newly synced transactions
      const syncedTransactions = mockFinanceStore.transactions.filter((t) =>
        t.reference_id?.startsWith('vst-adversarial-')
      );
      expect(syncedTransactions.length).toBe(50);

      const uniqueRefIds = new Set(syncedTransactions.map((t) => t.reference_id));
      expect(uniqueRefIds.size).toBe(50);
    });

    it('preserves ATO 1/11th GST accuracy for all 50 reconciled visits', async () => {
      const testVisits = generateMockVisits(50);
      mockCrmStore.visits = [...testVisits];

      await syncVisitsFromCrm();

      const syncedTransactions = mockFinanceStore.transactions.filter((t) =>
        t.reference_id?.startsWith('vst-adversarial-')
      );

      for (const tx of syncedTransactions) {
        // $98.00 gross = 9800 cents
        expect(tx.amount_cents).toBe(9800);
        expect(tx.amount_aud).toBe(98);
        // 9800 / 11 = 890.909... -> 891 cents GST
        expect(tx.gst_cents).toBe(891);
        expect(tx.net_cents).toBe(9800 - 891); // 8909 cents net
        // ATO balancing invariant
        expect(tx.net_cents + tx.gst_cents).toBe(tx.amount_cents);
        expect(tx.type).toBe('revenue');
        expect(tx.category_name).toBe('Salon Services');
      }
    });
  });

  // =========================================================================
  // Section 5: Concurrency & Race Condition Stress Testing
  // =========================================================================
  describe('5. Concurrency & Race Condition Stress Testing on syncVisitsFromCrm', () => {
    function generateMockVisits(count: number, prefix: string): MockVisit[] {
      const visits: MockVisit[] = [];
      for (let i = 1; i <= count; i++) {
        const padded = i.toString().padStart(4, '0');
        visits.push({
          id: `vst-${prefix}-${padded}`,
          customer_id: `cust-${padded}`,
          staff_id: `stf-001`,
          service_id: `srv-001`,
          visit_date: `2026-08-15`,
          services_rendered: [{ name: 'Nail Art', price_aud: 55, price_cents: 5500 }],
          price_charged_aud: 55,
          tip_aud: 0,
          total_paid_aud: 55,
          total_amount_cents: 5500,
          payment_method: 'card',
          notes: `Concurrent visit #${i}`,
          rating: 5,
          photo_urls: [],
          created_at: '2026-08-15T02:00:00Z',
          updated_at: '2026-08-15T02:00:00Z',
        });
      }
      return visits;
    }

    it('stress tests rapid double-sync (2 concurrent calls on 50 visits)', async () => {
      const visits = generateMockVisits(50, 'double-click');
      mockCrmStore.visits = [...visits];

      // Simulate admin double-clicking "Sync from CRM" or 2 concurrent requests
      const [res1, res2] = await Promise.all([
        syncVisitsFromCrm(),
        syncVisitsFromCrm(),
      ]);

      const doubleClickTransactions = mockFinanceStore.transactions.filter((t) =>
        t.reference_id?.startsWith('vst-double-click-')
      );

      const uniqueRefIds = new Set(doubleClickTransactions.map((t) => t.reference_id));

      console.log(`[DOUBLE-CLICK EMPIRICAL TEST RESULT]:
        - Res 1 synced: ${res1.syncedCount}, skipped: ${res1.skippedCount}
        - Res 2 synced: ${res2.syncedCount}, skipped: ${res2.skippedCount}
        - Total synced across both: ${res1.syncedCount + res2.syncedCount}
        - Total transactions in store: ${doubleClickTransactions.length}
        - Unique reference_ids: ${uniqueRefIds.size}
        - Duplicate count: ${doubleClickTransactions.length - uniqueRefIds.size}
      `);

      // Invariant: Exactly 50 transactions created, 0 duplicates
      expect(uniqueRefIds.size).toBe(50);
      expect(doubleClickTransactions.length).toBe(50);
    });

    it('stress tests high concurrency sync execution (Promise.all 5 simultaneous syncs)', async () => {
      const visits = generateMockVisits(20, 'concurrent');
      mockCrmStore.visits = [...visits];

      // Execute 5 concurrent syncVisitsFromCrm calls simultaneously
      const results = await Promise.all([
        syncVisitsFromCrm(),
        syncVisitsFromCrm(),
        syncVisitsFromCrm(),
        syncVisitsFromCrm(),
        syncVisitsFromCrm(),
      ]);

      const totalSyncedAcrossCalls = results.reduce((sum, r) => sum + r.syncedCount, 0);

      const concurrentTransactions = mockFinanceStore.transactions.filter((t) =>
        t.reference_id?.startsWith('vst-concurrent-')
      );

      const uniqueRefIds = new Set(concurrentTransactions.map((t) => t.reference_id));

      console.log(`[HIGH-CONCURRENCY EMPIRICAL TEST RESULT]:
        - Number of concurrent callers: 5
        - Number of visits to sync: 20
        - Sum of syncedCount across all 5 calls: ${totalSyncedAcrossCalls}
        - Total concurrent transactions in store: ${concurrentTransactions.length}
        - Number of unique reference_ids in store: ${uniqueRefIds.size}
        - Duplicate count in store: ${concurrentTransactions.length - uniqueRefIds.size}
      `);

      // Invariant: Unique visits must equal 20
      expect(uniqueRefIds.size).toBe(20);
      expect(concurrentTransactions.length).toBe(20);
    });

    it('stress tests concurrent HTTP POST /api/admin/finance/sync-visits route calls', async () => {
      const visits = generateMockVisits(30, 'api-concurrent');
      mockCrmStore.visits = [...visits];

      // Simulate 2 concurrent HTTP requests hitting the sync route simultaneously
      const req1 = createAdminRequest('http://localhost:3000/api/admin/finance/sync-visits');
      const req2 = createAdminRequest('http://localhost:3000/api/admin/finance/sync-visits');

      const [res1, res2] = await Promise.all([
        syncVisitsRoute(req1),
        syncVisitsRoute(req2),
      ]);

      const data1 = await res1.json();
      const data2 = await res2.json();

      const apiTransactions = mockFinanceStore.transactions.filter((t) =>
        t.reference_id?.startsWith('vst-api-concurrent-')
      );

      const uniqueRefIds = new Set(apiTransactions.map((t) => t.reference_id));

      console.log(`[API ROUTE CONCURRENCY TEST RESULT]:
        - Route 1: status=${res1.status}, synced=${data1.syncedCount}, skipped=${data1.skippedCount}
        - Route 2: status=${res2.status}, synced=${data2.syncedCount}, skipped=${data2.skippedCount}
        - Total apiTransactions in store: ${apiTransactions.length}
        - Unique reference_ids: ${uniqueRefIds.size}
        - Duplicates in store: ${apiTransactions.length - uniqueRefIds.size}
      `);

      // Invariant: Exactly 30 unique visits, exactly 30 transactions in store
      expect(uniqueRefIds.size).toBe(30);
      expect(apiTransactions.length).toBe(30);
    });
  });
});
