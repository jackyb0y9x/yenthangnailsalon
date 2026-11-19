/**
 * Tier 4: Real-World Application Scenarios (End-to-End Operational Journeys)
 * 5 comprehensive multi-step user workflows simulating actual salon operations
 */

import { describe, test } from './infra/harness.ts';
import { OpaqueTestClient } from './infra/client.ts';
import { expect, expectResponse } from './infra/assertions.ts';
import { FIXTURES, calculateGst } from './infra/fixtures.ts';

export function registerTier4Tests() {
  describe('Tier 4: Real-World Application Scenarios', () => {
    test('T4-REAL-01: Vietnamese-Australian Client Discovery, Consultation Booking, Service Delivery & Financial Reconciliation', async () => {
      const publicClient = new OpaqueTestClient();
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      // Step 1: International search & discovery - Client visits /vi
      const resVi = await publicClient.get('/vi');
      expectResponse(resVi).toBeOk();
      expect(resVi.bodyText).toContain('Tiệm Móng Đẳng Cấp');
      expect(resVi.bodyText).toContain('Đang Mở Cửa');

      // Step 2: Consultation submission
      const inquiryPayload = {
        customer_name: 'Linh Tran',
        phone: '0422 345 678',
        email: 'linh.tran@example.com.au',
        preferred_language: 'vi',
        preferred_date: '2026-11-28',
        preferred_time: '14:00',
        services_requested: ['SNS Dipping Full Set', 'Ombre Art'],
        notes: 'Da nhạy cảm, vui lòng dùng sản phẩm nhẹ dịu',
      };
      const submitRes = await publicClient.post('/api/consultation', inquiryPayload);
      expectResponse(submitRes).toHaveStatus(201);
      const { inquiry_id } = submitRes.json();
      expect(inquiry_id).toBeDefined();

      // Step 3: Receptionist triage & conversion to customer profile
      const triageRes = await adminClient.put(`/api/admin/inquiries/${inquiry_id}/status`, {
        status: 'booked',
        convert_to_customer: true,
      });
      expectResponse(triageRes).toBeOk();
      const custId = triageRes.json().inquiry.converted_customer_id;
      expect(custId).toBeDefined();

      // Set nail preferences
      await adminClient.put(`/api/admin/customers/${custId}/preferences`, {
        nail_shape: 'Almond',
        preferred_products: ['SNS Dipping'],
        allergies: 'Sensitive cuticle beds',
      });

      // Step 4: Service delivery & visit logging ($85.00 AUD via EFTPOS)
      const visitRes = await adminClient.post('/api/admin/visits', {
        customer_id: custId,
        staff_id: 'stf-003',
        visit_date: '2026-11-28T14:00:00Z',
        services_rendered: [{ name: 'SNS Ombre Full Set', price_cents: 8500 }],
        total_amount_cents: 8500,
        payment_method: 'EFTPOS',
      });
      expectResponse(visitRes).toHaveStatus(201);

      // Step 5: Automated financial synchronization & customer ledger audit
      const custAudit = (await adminClient.get(`/api/admin/customers/${custId}`)).json().customer;
      expect(custAudit.total_visits_count).toBe(1);
      expect(custAudit.total_spend_cents).toBe(8500);

      const finSummary = (await adminClient.get('/api/admin/finance/summary')).json();
      expect(finSummary.totalRevenueCents).toBeGreaterThanOrEqual(8500);
      expect(finSummary.gstCollectedCents).toBe(Math.round(finSummary.totalRevenueCents / 11));
    }, 4);

    test('T4-REAL-02: Salon Owner Seasonal Menu & CMS Overhaul (Spring Promotion & Price Updates)', async () => {
      const ownerClient = new OpaqueTestClient();
      await ownerClient.loginAs('super_admin');

      // 1. Hero banner overhaul
      const springHeadlineEn = 'Welcome Spring with Radiant Nails';
      const springHeadlineVi = 'Chào Xuân Cùng Bộ Móng Rạng Rỡ';
      await ownerClient.post('/api/admin/cms/hero', {
        headline_en: springHeadlineEn,
        headline_vi: springHeadlineVi,
        subheadline_en: 'Exclusive spring palette & organic SNS dipping collections',
        subheadline_vi: 'Bảng màu xuân độc quyền và bộ sưu tập nhúng bột SNS organic',
        cta_text_en: 'Book Spring Special',
        cta_text_vi: 'Đặt Lịch Ngay',
      });

      // 2. Promotional top bar
      await ownerClient.post('/api/admin/cms/announcement', {
        is_active: true,
        message_en: 'Spring Special: 10% off all SNS Dipping Sets this October!',
        message_vi: 'Ưu đãi mùa xuân: Giảm 10% cho móng nhúng SNS tháng 10!',
      });

      // 3. Service catalog update & new seasonal service
      const createServiceRes = await ownerClient.post('/api/admin/services', {
        name_en: 'Spring Floral Nail Art',
        name_vi: 'Vẽ Móng Hoa Mùa Xuân',
        category: 'Gel Art',
        price_cents: 4500,
        duration_minutes: 45,
      });
      expectResponse(createServiceRes).toHaveStatus(201);

      // 4. Live public verification (Incognito unauthenticated visitor)
      const publicClient = new OpaqueTestClient();

      const resEn = await publicClient.get('/en');
      expect(resEn.bodyText).toContain(springHeadlineEn);
      expect(resEn.bodyText).toContain('Spring Special: 10% off all SNS');

      const resVi = await publicClient.get('/vi');
      expect(resVi.bodyText).toContain(springHeadlineVi);
      expect(resVi.bodyText).toContain('Ưu đãi mùa xuân: Giảm 10% cho móng nhúng SNS');

      const servicesEn = await publicClient.get('/en/services');
      expect(servicesEn.bodyText).toContain('Spring Floral Nail Art');
      expect(servicesEn.bodyText).toContain('$45.00 AUD');
    }, 4);

    test('T4-REAL-03: Technician Onboarding, Role RBAC Enforcement, Specialized Acrylic Bookings & Revenue Attribution', async () => {
      const managerClient = new OpaqueTestClient();
      await managerClient.loginAs('manager');

      // 1. Onboard new technician Kevin
      const createTechRes = await managerClient.post('/api/admin/staff', {
        full_name: 'Kevin Pham Senior',
        phone: '0422 999 888',
        email: 'kevin.senior@glamournails.com.au',
        role: 'staff',
        employment_type: 'Full-time',
        specializations: ['Acrylic Extensions', '3D Nail Art', 'E-File'],
      });
      expectResponse(createTechRes).toHaveStatus(201);
      const kevinId = createTechRes.json().staff_id;

      // 2. Role security check - Kevin logs in
      const kevinClient = new OpaqueTestClient();
      const loginRes = await kevinClient.post('/api/auth/login', {
        email: 'kevin.senior@glamournails.com.au',
        password: 'SecurePassword2026!',
      });
      expectResponse(loginRes).toBeOk();

      // Kevin can view customers
      const custRes = await kevinClient.get('/api/admin/customers');
      expectResponse(custRes).toBeOk();

      // Kevin is forbidden from finance
      const finDenyRes = await kevinClient.get('/api/admin/finance/summary');
      expect(finDenyRes.status).toBe(403);

      // 3. Booking delivery: Client requests sculpted acrylic set ($140.00 AUD) + $20.00 cash tip
      await managerClient.post('/api/admin/visits', {
        customer_id: 'cust-001',
        staff_id: kevinId,
        visit_date: '2026-11-20T11:00:00Z',
        services_rendered: [
          { name: 'Full Sculpted Acrylic Set', price_cents: 14000 },
          { name: 'Cash Tip', price_cents: 2000 },
        ],
        total_amount_cents: 16000,
        payment_method: 'Credit Card',
      });

      // 4. Productivity reporting check
      const prodRes = await managerClient.get(`/api/admin/staff/${kevinId}/productivity`);
      expectResponse(prodRes).toBeOk();
      const prod = prodRes.json();
      expect(prod.completed_visits).toBe(1);
      expect(prod.total_revenue_cents).toBe(16000);
      expect(prod.total_revenue_aud).toBe(160.0);
    }, 4);

    test('T4-REAL-04: Australian End-of-Financial-Year (EOFY) & Quarterly BAS Tax Audit Reconciliation', async () => {
      const cpaClient = new OpaqueTestClient();
      await cpaClient.loginAs('super_admin');

      // Record year-end operational expenses
      const expenses = [
        { category: 'Rent', amount_cents: 1800000, is_tax_deductible: true, description: 'Commercial Rent FY26' },
        { category: 'Supplies', amount_cents: 750000, is_tax_deductible: true, description: 'SNS Powders wholesale' },
        { category: 'Utilities', amount_cents: 320000, is_tax_deductible: true, description: 'Electricity & Water' },
        { category: 'Wages', amount_cents: 2000000, is_tax_deductible: false, description: 'Staff Payroll (No GST)' },
      ];

      for (const exp of expenses) {
        await cpaClient.post('/api/admin/finance/transactions', {
          type: 'expense',
          ...exp,
        });
      }

      // Financial KPI Summary
      const summary = (await cpaClient.get('/api/admin/finance/summary')).json();
      expect(summary.totalRevenueCents).toBeGreaterThan(0);
      expect(summary.totalExpenseCents).toBeGreaterThan(0);
      expect(summary.netProfitCents).toBe(summary.totalRevenueCents - summary.totalExpenseCents);
      expect(summary.profitMarginPercent).toBeDefined();

      // Quarterly BAS Rollup
      const bas = (await cpaClient.get('/api/admin/finance/bas?quarter=Q4&fy=2025-2026')).json();
      expect(bas.quarter).toBe('Q4');
      expect(bas.gstCollectedCents).toBe(Math.round(bas.qRevCents / 11));
      expect(bas.gstPaidCents).toBe(Math.round(bas.qExpDeductibleCents / 11));
      expect(bas.netGstPayableCents).toBe(bas.gstCollectedCents - bas.gstPaidCents);
    }, 4);

    test('T4-REAL-05: High-Volume Holiday Booking Rush, Severe Allergy Safety Alert, Emergency AC Breakdown & Daily Close', async () => {
      // 1. High-volume concurrency burst: 25 clients submit booking requests concurrently
      const concurrentSubmissions = Array.from({ length: 25 }, (_, i) => {
        const client = new OpaqueTestClient();
        return client.post('/api/consultation', {
          customer_name: `Rush Client #${i + 1}`,
          phone: `0412 888 ${String(100 + i).slice(-3)}`,
          email: `client${i}@holidayrush.com.au`,
          preferred_language: i % 2 === 0 ? 'vi' : 'en',
          preferred_date: '2026-12-24',
        });
      });

      const responses = await Promise.all(concurrentSubmissions);
      for (const res of responses) {
        expectResponse(res).toHaveStatus(201);
        expect(res.json().inquiry_id).toBeDefined();
      }

      // 2. Severe allergy safety alert submission
      const emilyClient = new OpaqueTestClient();
      const emilyRes = await emilyClient.post('/api/consultation', {
        customer_name: 'Emily Clarke',
        phone: '0415 678 901',
        preferred_language: 'en',
        preferred_date: '2026-12-24',
        notes: 'Medical Alert: Severe Latex Allergy and UV Lamp Sensitivity',
      });
      expectResponse(emilyRes).toHaveStatus(201);

      // Receptionist converts Emily and confirms allergy note
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');
      const convRes = await adminClient.put(`/api/admin/inquiries/${emilyRes.json().inquiry_id}/status`, {
        status: 'booked',
        convert_to_customer: true,
      });
      const emilyCustId = convRes.json().inquiry.converted_customer_id;
      const emilyCust = (await adminClient.get(`/api/admin/customers/${emilyCustId}`)).json().customer;
      expect(emilyCust.allergies).toContain('Latex Allergy');

      // 3. Emergency AC Breakdown & Schedule Closure Notice in CMS
      await adminClient.post('/api/admin/cms/hours', {
        holiday_notice_active: true,
        holiday_notice_en: 'Emergency Closure: Salon closed from 2:30 PM due to AC breakdown',
        holiday_notice_vi: 'Đóng Cửa Khẩn Cấp: Tiệm đóng cửa từ 14:30 do sự cố máy lạnh',
      });

      // Public verification
      const pubRes = await adminClient.get('/en');
      expect(pubRes.bodyText).toContain('Emergency Closure: Salon closed from 2:30 PM');
      expect(pubRes.bodyText).toContain('Closed for Holiday');

      // 4. Emergency AC Repair Expense Entry
      const repairRes = await adminClient.post('/api/admin/finance/transactions', {
        type: 'expense',
        category: 'Maintenance & Repairs',
        amount_cents: 88000, // $880.00 AUD (including $80.00 GST)
        description: 'Emergency commercial AC repair',
        is_tax_deductible: true,
      });
      expectResponse(repairRes).toHaveStatus(201);

      // 5. Daily Close Reconciliation
      const dailySummary = (await adminClient.get('/api/admin/finance/summary')).json();
      expect(dailySummary.totalExpenseCents).toBeGreaterThanOrEqual(88000);
      expect(dailySummary.netGstPayableCents).toBeDefined();

      // Reset emergency notice
      await adminClient.post('/api/admin/cms/hours', { holiday_notice_active: false });
    });
  }, 4);
}
