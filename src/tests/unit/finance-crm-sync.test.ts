/**
 * Unit Test Suite: Feature 39 - CRM Visit to Revenue Auto-Sync
 * Validates idempotent reconciliation of completed visits into revenue transactions,
 * field mapping, GST calculations, and mockCrmStore single-source-of-truth compatibility.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  syncVisitsFromCrm,
  getTransactions,
  resetFinanceStore,
  createTransaction,
} from '@/lib/finance/store';
import { mockCrmStore } from '@/lib/crm/mock-customers';
import { logVisit } from '@/lib/crm/customers';

describe('CRM Visit to Revenue Auto-Sync (Feature 39)', () => {
  beforeEach(() => {
    resetFinanceStore();
  });

  it('idempotently reconciles CRM visits without creating duplicates on repeated calls', async () => {
    // Initial sync
    const firstSync = await syncVisitsFromCrm();
    expect(firstSync.totalVisits).toBeGreaterThan(0);
    // Synced count should be >= 0 depending on whether initial seed visits already have transactions
    const initialSynced = firstSync.syncedCount;

    // Second sync immediately after
    const secondSync = await syncVisitsFromCrm();
    expect(secondSync.syncedCount).toBe(0);
    expect(secondSync.skippedCount).toBe(secondSync.totalVisits);

    // Verify in transactions list
    const { total } = await getTransactions({ limit: 1000 });
    const thirdSync = await syncVisitsFromCrm();
    expect(thirdSync.syncedCount).toBe(0);

    const { total: totalAfter } = await getTransactions({ limit: 1000 });
    expect(totalAfter).toBe(total);
  });

  it('correctly maps CRM visit fields into revenue transaction attributes', async () => {
    // Add a new mock visit
    const newVisitId = 'vis-unit-test-001';
    mockCrmStore.visits.push({
      id: newVisitId,
      customer_id: '80000000-0000-0000-0000-000000000001',
      staff_id: '60000000-0000-0000-0000-000000000001',
      service_id: null,
      visit_date: '2026-11-12T14:00:00Z',
      services_rendered: [{ name: 'Full Set Gel Art', price_aud: 110.0, price_cents: 11000 }],
      price_charged_aud: 100.0,
      tip_aud: 10.0,
      total_paid_aud: 110.0,
      total_amount_cents: 11000,
      payment_method: 'eftpos',
      notes: 'Custom cherry nail art design',
      rating: 5,
      photo_urls: [],
      created_at: '2026-11-12T15:00:00Z',
      updated_at: '2026-11-12T15:00:00Z',
    });

    const syncResult = await syncVisitsFromCrm();
    expect(syncResult.syncedCount).toBeGreaterThanOrEqual(1);

    const { transactions } = await getTransactions({ limit: 1000 });
    const matchedTx = transactions.find((t) => t.reference_id === newVisitId);

    expect(matchedTx).toBeDefined();
    expect(matchedTx?.type).toBe('revenue');
    expect(matchedTx?.category_name).toBe('Salon Services');
    expect(matchedTx?.amount_cents).toBe(11000);
    expect(matchedTx?.amount_aud).toBe(110.0);
    // 11000 / 11 = 1000 cents ($10.00 GST)
    expect(matchedTx?.gst_cents).toBe(1000);
    expect(matchedTx?.gst_amount_aud).toBe(10.0);
    expect(matchedTx?.net_cents).toBe(10000);
    expect(matchedTx?.payment_method).toBe('eftpos');
    expect(matchedTx?.customer_id).toBe('80000000-0000-0000-0000-000000000001');
    expect(matchedTx?.staff_id).toBe('60000000-0000-0000-0000-000000000001');
    expect(matchedTx?.transaction_date).toBe('2026-11-12');
  });

  it('maintains single-source-of-truth parity with mockCrmStore.transactions', async () => {
    // When logVisit is called from CRM module, it automatically reconciles a transaction
    const visitRes = await logVisit({
      customer_id: '80000000-0000-0000-0000-000000000002',
      staff_id: '60000000-0000-0000-0000-000000000002',
      visit_date: '2026-11-14T10:00:00Z',
      price_charged_aud: 80.0,
      tip_aud: 5.0,
      total_amount_aud: 85.0,
      total_amount_cents: 8500,
      payment_method: 'card',
      services_rendered: [{ name: 'Acrylic Infill', price_aud: 80.0 }],
      notes: 'Infill with nude acrylic',
    });

    expect(visitRes.success).toBe(true);
    expect(visitRes.transaction_id).toBeDefined();

    // Verify in mockCrmStore.transactions (for backward compatibility with crm.test.ts)
    const crmTx = mockCrmStore.transactions.find((t) => t.id === visitRes.transaction_id);
    expect(crmTx).toBeDefined();
    expect(crmTx?.type).toBe('revenue');
    expect(crmTx?.amount_cents).toBe(8500);

    // Verify in getTransactions
    const { transactions } = await getTransactions({ limit: 1000 });
    const financeTx = transactions.find((t) => t.id === visitRes.transaction_id);
    expect(financeTx).toBeDefined();
    expect(financeTx?.amount_cents).toBe(8500);
    expect(financeTx?.reference_id).toBe(visitRes.visit_id);

    // Now if syncVisitsFromCrm runs, it should recognize this visit as already reconciled
    const syncRes = await syncVisitsFromCrm();
    const duplicate = syncRes.transactions.find((t) => t.reference_id === visitRes.visit_id);
    expect(duplicate).toBeUndefined();
  });

  it('skips visits with zero or negative total amount', async () => {
    const zeroVisitId = 'vis-zero-amount';
    mockCrmStore.visits.push({
      id: zeroVisitId,
      customer_id: '80000000-0000-0000-0000-000000000001',
      staff_id: null,
      service_id: null,
      visit_date: '2026-11-15T10:00:00Z',
      services_rendered: [],
      price_charged_aud: 0,
      tip_aud: 0,
      total_paid_aud: 0,
      total_amount_cents: 0,
      payment_method: 'cash',
      notes: 'Free consultation visit',
      rating: null,
      photo_urls: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const syncRes = await syncVisitsFromCrm();
    const syncedZero = syncRes.transactions.find((t) => t.reference_id === zeroVisitId);
    expect(syncedZero).toBeUndefined();
  });
});
