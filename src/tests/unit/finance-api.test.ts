/**
 * Unit Test Suite: Finance API Routes & RBAC Security Boundaries
 * Validates endpoints:
 * - GET /api/admin/finance/summary
 * - GET /api/admin/finance/transactions
 * - POST /api/admin/finance/transactions
 * - DELETE /api/admin/finance/transactions
 * - POST /api/admin/finance/sync-visits
 * - GET /api/admin/finance/categories
 *
 * Verifies RBAC: Unauthenticated -> 401, Staff -> 403 Forbidden, Manager/Super Admin -> 200/201.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { resetFinanceStore } from '@/lib/finance/store';
import { GET as getSummary } from '@/app/api/admin/finance/summary/route';
import {
  GET as getTransactions,
  POST as postTransaction,
  DELETE as deleteTransaction,
} from '@/app/api/admin/finance/transactions/route';
import { POST as postSyncVisits } from '@/app/api/admin/finance/sync-visits/route';
import { GET as getCategories } from '@/app/api/admin/finance/categories/route';

function createFinanceRequest(
  url: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: any,
  role?: 'super_admin' | 'manager' | 'staff'
) {
  const headers: Record<string, string> = {};
  if (role) {
    headers['Cookie'] = `sb-authenticated=true; sb-role=${role}; sb-email=${role}@glamournails.com.au`;
  }
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Finance API Routes & Security RBAC Boundaries', () => {
  beforeEach(() => {
    resetFinanceStore();
  });

  describe('1. RBAC Authentication & Authorization Guards', () => {
    it('returns 401 Unauthorized when unauthenticated across all finance routes', async () => {
      const summaryReq = createFinanceRequest('http://localhost:3000/api/admin/finance/summary');
      const summaryRes = await getSummary(summaryReq);
      expect(summaryRes.status).toBe(401);

      const txReq = createFinanceRequest('http://localhost:3000/api/admin/finance/transactions');
      const txRes = await getTransactions(txReq);
      expect(txRes.status).toBe(401);

      const postReq = createFinanceRequest('http://localhost:3000/api/admin/finance/transactions', 'POST', {
        type: 'income',
      });
      const postRes = await postTransaction(postReq);
      expect(postRes.status).toBe(401);

      const syncReq = createFinanceRequest('http://localhost:3000/api/admin/finance/sync-visits', 'POST');
      const syncRes = await postSyncVisits(syncReq);
      expect(syncRes.status).toBe(401);

      const catReq = createFinanceRequest('http://localhost:3000/api/admin/finance/categories');
      const catRes = await getCategories(catReq);
      expect(catRes.status).toBe(401);
    });

    it('returns 403 Forbidden when authenticated as staff role across all finance routes', async () => {
      const summaryReq = createFinanceRequest(
        'http://localhost:3000/api/admin/finance/summary',
        'GET',
        undefined,
        'staff'
      );
      const summaryRes = await getSummary(summaryReq);
      expect(summaryRes.status).toBe(403);
      const summaryBody = await summaryRes.json();
      expect(summaryBody.error).toMatch(/Forbidden/i);

      const txReq = createFinanceRequest(
        'http://localhost:3000/api/admin/finance/transactions',
        'GET',
        undefined,
        'staff'
      );
      const txRes = await getTransactions(txReq);
      expect(txRes.status).toBe(403);

      const postReq = createFinanceRequest(
        'http://localhost:3000/api/admin/finance/transactions',
        'POST',
        { type: 'income' },
        'staff'
      );
      const postRes = await postTransaction(postReq);
      expect(postRes.status).toBe(403);

      const syncReq = createFinanceRequest(
        'http://localhost:3000/api/admin/finance/sync-visits',
        'POST',
        undefined,
        'staff'
      );
      const syncRes = await postSyncVisits(syncReq);
      expect(syncRes.status).toBe(403);

      const catReq = createFinanceRequest(
        'http://localhost:3000/api/admin/finance/categories',
        'GET',
        undefined,
        'staff'
      );
      const catRes = await getCategories(catReq);
      expect(catRes.status).toBe(403);
    });

    it('grants full access (200/201) to manager and super_admin roles', async () => {
      const managerReq = createFinanceRequest(
        'http://localhost:3000/api/admin/finance/summary',
        'GET',
        undefined,
        'manager'
      );
      const managerRes = await getSummary(managerReq);
      expect(managerRes.status).toBe(200);

      const superReq = createFinanceRequest(
        'http://localhost:3000/api/admin/finance/summary',
        'GET',
        undefined,
        'super_admin'
      );
      const superRes = await getSummary(superReq);
      expect(superRes.status).toBe(200);
    });
  });

  describe('2. GET /api/admin/finance/summary', () => {
    it('returns calculated summary and categorical breakdown', async () => {
      const req = createFinanceRequest(
        'http://localhost:3000/api/admin/finance/summary',
        'GET',
        undefined,
        'manager'
      );
      const res = await getSummary(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(data.summary).toBeDefined();
      expect(data.summary.totalRevenueCents).toBeGreaterThan(0);
      expect(data.summary.totalExpenseCents).toBeGreaterThan(0);
      expect(data.summary.gstCollectedCents).toBeGreaterThan(0);
      expect(data.summary.gstPaidCents).toBeGreaterThan(0);
      expect(data.categoryBreakdown).toBeDefined();
      expect(Array.isArray(data.categoryBreakdown.revenue)).toBe(true);
      expect(Array.isArray(data.categoryBreakdown.expenses)).toBe(true);
    });

    it('filters summary by quarterly BAS parameter (period=q2)', async () => {
      const req = createFinanceRequest(
        'http://localhost:3000/api/admin/finance/summary?period=q2&fy=2026',
        'GET',
        undefined,
        'manager'
      );
      const res = await getSummary(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.period.startDate).toBe('2026-10-01');
      expect(data.period.endDate).toBe('2026-12-31');
    });
  });

  describe('3. GET & POST /api/admin/finance/transactions', () => {
    it('GET returns paginated transactions with filter options', async () => {
      const req = createFinanceRequest(
        'http://localhost:3000/api/admin/finance/transactions?type=revenue',
        'GET',
        undefined,
        'manager'
      );
      const res = await getTransactions(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(Array.isArray(data.transactions)).toBe(true);
      expect(data.pagination).toBeDefined();
      // All returned items must be revenue/income
      for (const tx of data.transactions) {
        expect(['revenue', 'income']).toContain(tx.type);
      }
    });

    it('POST rejects invalid transaction payloads with HTTP 400', async () => {
      // Missing amount
      const reqNoAmount = createFinanceRequest(
        'http://localhost:3000/api/admin/finance/transactions',
        'POST',
        {
          type: 'income',
          categoryId: 'b0000000-0000-0000-0000-000000000001',
          description: 'Valid description',
        },
        'manager'
      );
      const res1 = await postTransaction(reqNoAmount);
      expect(res1.status).toBe(400);

      // Invalid date format
      const reqBadDate = createFinanceRequest(
        'http://localhost:3000/api/admin/finance/transactions',
        'POST',
        {
          type: 'income',
          categoryId: 'b0000000-0000-0000-0000-000000000001',
          amountAud: 50.0,
          transactionDate: 'not-a-date',
          description: 'Valid description',
        },
        'manager'
      );
      const res2 = await postTransaction(reqBadDate);
      expect(res2.status).toBe(400);
    });

    it('POST successfully records revenue with 1/11th GST calculation', async () => {
      const payload = {
        type: 'income',
        categoryId: 'b0000000-0000-0000-0000-000000000001',
        amountAud: 99.0, // $99.00 -> 9900 cents -> 900 cents GST
        paymentMethod: 'eftpos',
        transactionDate: '2026-11-15',
        description: 'SNS Nails Full Set with Chrome',
        notes: 'Walk-in client',
      };

      const req = createFinanceRequest(
        'http://localhost:3000/api/admin/finance/transactions',
        'POST',
        payload,
        'manager'
      );
      const res = await postTransaction(req);
      expect(res.status).toBe(201);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(data.transaction_id).toBeDefined();
      expect(data.transaction.amount_cents).toBe(9900);
      expect(data.transaction.gst_cents).toBe(900);
      expect(data.transaction.net_cents).toBe(9000);
      expect(data.transaction.payment_method).toBe('eftpos');
    });

    it('POST successfully records operating expense with tax-deductible flag', async () => {
      const payload = {
        type: 'expense',
        categoryId: 'b0000000-0000-0000-0000-000000000006',
        amountAud: 220.0, // $220.00 -> 22000 cents -> 2000 cents GST
        paymentMethod: 'bank_transfer',
        transactionDate: '2026-11-14',
        description: 'Purchase of 10x UV Top Coats',
        vendorName: 'OPI Nails Australia',
        isTaxDeductible: true,
      };

      const req = createFinanceRequest(
        'http://localhost:3000/api/admin/finance/transactions',
        'POST',
        payload,
        'manager'
      );
      const res = await postTransaction(req);
      expect(res.status).toBe(201);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(data.transaction.amount_cents).toBe(22000);
      expect(data.transaction.is_tax_deductible).toBe(true);
      expect(data.transaction.vendor_name).toBe('OPI Nails Australia');
    });

    it('DELETE removes transaction by ID', async () => {
      // First create one
      const createReq = createFinanceRequest(
        'http://localhost:3000/api/admin/finance/transactions',
        'POST',
        {
          type: 'income',
          categoryId: 'b0000000-0000-0000-0000-000000000001',
          amountAud: 50.0,
          description: 'To be deleted',
          paymentMethod: 'cash',
        },
        'manager'
      );
      const createRes = await postTransaction(createReq);
      const { transaction_id } = await createRes.json();

      // Delete it
      const delReq = createFinanceRequest(
        `http://localhost:3000/api/admin/finance/transactions?id=${transaction_id}`,
        'DELETE',
        undefined,
        'manager'
      );
      const delRes = await deleteTransaction(delReq);
      expect(delRes.status).toBe(200);
      const delData = await delRes.json();
      expect(delData.success).toBe(true);
    });
  });

  describe('4. POST /api/admin/finance/sync-visits', () => {
    it('executes visit reconciliation and reports synced count', async () => {
      const req = createFinanceRequest(
        'http://localhost:3000/api/admin/finance/sync-visits',
        'POST',
        undefined,
        'manager'
      );
      const res = await postSyncVisits(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(typeof data.syncedCount).toBe('number');
      expect(typeof data.skippedCount).toBe('number');
      expect(typeof data.totalVisits).toBe('number');
    });
  });

  describe('5. GET /api/admin/finance/categories', () => {
    it('returns categories sorted by display_order', async () => {
      const req = createFinanceRequest(
        'http://localhost:3000/api/admin/finance/categories',
        'GET',
        undefined,
        'manager'
      );
      const res = await getCategories(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(Array.isArray(data.categories)).toBe(true);
      expect(data.categories.length).toBeGreaterThanOrEqual(10);

      // Verify display_order
      for (let i = 1; i < data.categories.length; i++) {
        expect(data.categories[i].display_order).toBeGreaterThanOrEqual(
          data.categories[i - 1].display_order
        );
      }
    });

    it('filters categories by type (type=income)', async () => {
      const req = createFinanceRequest(
        'http://localhost:3000/api/admin/finance/categories?type=income',
        'GET',
        undefined,
        'manager'
      );
      const res = await getCategories(req);
      const data = await res.json();

      expect(data.success).toBe(true);
      for (const cat of data.categories) {
        expect(cat.type).toBe('income');
      }
    });
  });
});
