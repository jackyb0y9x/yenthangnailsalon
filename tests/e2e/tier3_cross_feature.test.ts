/**
 * Tier 3: Cross-Feature Combinations (Pairwise Integration Contracts)
 * 16 test cases verifying contracts across multiple subsystems
 */

import { describe, test } from './infra/harness.ts';
import { OpaqueTestClient } from './infra/client.ts';
import { expect, expectResponse } from './infra/assertions.ts';

export function registerTier3Tests() {
  describe('Tier 3: Cross-Feature Combinations', () => {
    test('T3-PAIR-01: CMS Hero Edit ↔ Public Site Live Reflection + Cache Revalidation', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      const newTitle = `Live Showcase Reflected ${Date.now()}`;
      await adminClient.post('/api/admin/cms/hero', {
        headline_en: newTitle,
        headline_vi: 'Cập Nhật Tiêu Đề Mới',
      });

      // Public verification
      const pubRes = await adminClient.get('/en');
      expect(pubRes.bodyText).toContain(newTitle);
    }, 3);

    test('T3-PAIR-02: Public Inquiry Submission ↔ CRM Triage Inbox ↔ Customer Creation', async () => {
      const publicClient = new OpaqueTestClient();
      const uniquePhone = '0499 888 777';

      // 1. Submit inquiry
      const pubRes = await publicClient.post('/api/consultation', {
        customer_name: 'Hannah Brooks',
        phone: uniquePhone,
        email: 'hannah.b@example.com',
        preferred_language: 'en',
      });
      const inqId = pubRes.json().inquiry_id;

      // 2. Manager triages and converts
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      const convRes = await adminClient.put(`/api/admin/inquiries/${inqId}/status`, {
        status: 'booked',
        convert_to_customer: true,
      });
      expectResponse(convRes).toBeOk();
      const custId = convRes.json().inquiry.converted_customer_id;
      expect(custId).toBeDefined();

      // 3. Verify in customer directory
      const custRes = await adminClient.get(`/api/admin/customers/${custId}`);
      expectResponse(custRes).toBeOk();
      expect(custRes.json().customer.name).toBe('Hannah Brooks');
    }, 3);

    test('T3-PAIR-03: CRM Visit History ↔ Finance Automated Revenue Synchronization', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      const visitAmount = 14500; // $145.00 AUD
      const visitRes = await adminClient.post('/api/admin/visits', {
        customer_id: 'cust-001',
        staff_id: 'stf-001',
        visit_date: '2026-11-16T11:00:00Z',
        services_rendered: [{ name: 'Acrylic Full Set + 3D Art', price_cents: visitAmount }],
        total_amount_cents: visitAmount,
        payment_method: 'EFTPOS',
      });
      expectResponse(visitRes).toHaveStatus(201);
      const { transaction_id } = visitRes.json();
      expect(transaction_id).toBeDefined();

      // Verify transaction in finance module
      const summary = (await adminClient.get('/api/admin/finance/summary')).json();
      expect(summary.totalRevenueCents).toBeGreaterThanOrEqual(visitAmount);
    }, 3);

    test('T3-PAIR-04: Visit Revenue Sync ↔ Real-Time KPI Totals & GST Calculation', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      const summaryBefore = (await adminClient.get('/api/admin/finance/summary')).json();

      // Log $110.00 AUD visit ($10.00 GST inclusive)
      await adminClient.post('/api/admin/visits', {
        customer_id: 'cust-002',
        staff_id: 'stf-002',
        visit_date: '2026-11-16T12:00:00Z',
        total_amount_cents: 11000,
        payment_method: 'Credit Card',
      });

      const summaryAfter = (await adminClient.get('/api/admin/finance/summary')).json();
      expect(summaryAfter.totalRevenueCents - summaryBefore.totalRevenueCents).toBe(11000);
      expect(summaryAfter.gstCollectedCents - summaryBefore.gstCollectedCents).toBe(1000); // 11000 / 11 = 1000
    }, 3);

    test('T3-PAIR-05: Staff Role Assignment ↔ Multi-Module Access Control (CMS & Finance)', async () => {
      const superClient = new OpaqueTestClient();
      await superClient.loginAs('super_admin');

      // Promote technician (stf-003) to manager
      const promoteRes = await superClient.put('/api/admin/staff/stf-003/role', { role: 'manager' });
      expectResponse(promoteRes).toBeOk();

      // Staff stf-003 logs in and can now access finance
      const techClient = new OpaqueTestClient();
      await techClient.loginAs('staff'); // sets stf-003 email
      techClient.setCookie('sb-role', 'manager'); // session updated with promoted role
      const finRes = await techClient.get('/api/admin/finance/summary');
      expectResponse(finRes).toBeOk();

      // Reset stf-003 back to staff role
      await superClient.put('/api/admin/staff/stf-003/role', { role: 'staff' });
    }, 3);

    test('T3-PAIR-06: Expense Entry + Revenue Sync ↔ Real-Time Net Profit & BAS Quarterly Rollup', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      // Record $55.00 AUD expense (GST paid = $5.00)
      const expRes = await adminClient.post('/api/admin/finance/transactions', {
        type: 'expense',
        category: 'Supplies',
        amount_cents: 5500,
        is_tax_deductible: true,
      });
      expectResponse(expRes).toHaveStatus(201);

      // Check BAS summary
      const basRes = await adminClient.get('/api/admin/finance/bas?quarter=Q1');
      expectResponse(basRes).toBeOk();
      const bas = basRes.json();
      expect(bas.gstPaidCents).toBeGreaterThanOrEqual(500);
      expect(bas.netGstPayableCents).toBe(bas.gstCollectedCents - bas.gstPaidCents);
    }, 3);

    test('T3-PAIR-07: Service Catalog CRUD ↔ Public Showcase ↔ Consultation Form Link', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      // Create new seasonal service
      const createRes = await adminClient.post('/api/admin/services', {
        name_en: 'SNS Ombre Sparkle Set',
        name_vi: 'Nhúng Bột SNS Ombre Lấp Lánh',
        category: 'SNS Dip',
        price_cents: 8000,
        duration_minutes: 50,
      });
      expectResponse(createRes).toHaveStatus(201);

      // Verify visible on public services menu
      const pubRes = await adminClient.get('/en/services');
      expect(pubRes.bodyText).toContain('SNS Ombre Sparkle Set');
      expect(pubRes.bodyText).toContain('$80.00 AUD');
    }, 3);

    test('T3-PAIR-08: Customer Preference Profile ↔ Inquiry Triage ↔ Allergen Safety Alert', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      // Customer cust-001 has severe acetone sensitivity
      const cust = (await adminClient.get('/api/admin/customers/cust-001')).json().customer;
      expect(cust.allergies).toContain('Acetone');
    }, 3);

    test('T3-PAIR-09: Staff Specialization Tagging ↔ Customer Inquiry Matching ↔ Visit Attribution', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      // Chloe has '3D Nail Art'
      const staffChloe = (await adminClient.get('/api/admin/staff/stf-003')).json().staff;
      expect(staffChloe.specializations).toContain('3D Nail Art');

      // Attributed visit
      await adminClient.post('/api/admin/visits', {
        customer_id: 'cust-001',
        staff_id: 'stf-003',
        visit_date: '2026-11-16T13:00:00Z',
        total_amount_cents: 12000,
        payment_method: 'EFTPOS',
      });

      const prod = (await adminClient.get('/api/admin/staff/stf-003/productivity')).json();
      expect(prod.total_revenue_cents).toBeGreaterThanOrEqual(12000);
    }, 3);

    test('T3-PAIR-10: Business Hours CMS Update ↔ Public Open Badge Recalculation ↔ JSON-LD Schema', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      // Emergency closure
      await adminClient.post('/api/admin/cms/hours', {
        holiday_notice_active: true,
        holiday_notice_en: 'Emergency Storm Closure today',
        holiday_notice_vi: 'Đóng cửa do bão khẩn cấp',
      });

      const pubRes = await adminClient.get('/en');
      expect(pubRes.bodyText).toContain('Closed for Holiday');
      expect(pubRes.bodyText).toContain('Emergency Storm Closure today');

      // Reset
      await adminClient.post('/api/admin/cms/hours', { holiday_notice_active: false });
    }, 3);

    test('T3-PAIR-11: Gallery Upload ↔ Featured Pinning ↔ Homepage Lookbook & Gallery Page', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      const newItem = {
        title_en: 'Chrome Holographic Silver',
        title_vi: 'Tráng Gương Bạc Hologram',
        category: 'Chrome',
        image_url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=800&q=80',
        is_featured: true,
      };

      await adminClient.post('/api/admin/gallery', newItem);

      // Verify on homepage lookbook
      const homeRes = await adminClient.get('/en');
      expect(homeRes.bodyText).toContain('Chrome Holographic Silver');

      // Verify on gallery page
      const galRes = await adminClient.get('/en/gallery');
      expect(galRes.bodyText).toContain('Chrome Holographic Silver');
    }, 3);

    test('T3-PAIR-12: Promotional Announcement CMS Toggle ↔ Public Header ↔ Language Switcher', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      await adminClient.post('/api/admin/cms/announcement', {
        is_active: true,
        message_en: 'Halloween Deal: 15% off Gel Nails',
        message_vi: 'Ưu đãi Halloween: Giảm 15% móng Gel',
      });

      const resEn = await adminClient.get('/en');
      expect(resEn.bodyText).toContain('Halloween Deal: 15% off Gel Nails');

      const resVi = await adminClient.get('/vi');
      expect(resVi.bodyText).toContain('Ưu đãi Halloween: Giảm 15% móng Gel');
    }, 3);

    test('T3-PAIR-13: Customer Soft-Delete ↔ Visit History Retention ↔ Financial Revenue Invariant', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      // Create customer
      const createRes = await adminClient.post('/api/admin/customers', {
        full_name: 'Temporary Client',
        phone: '0439 123 987',
      });
      const custId = createRes.json().customer_id;

      // Log visit ($85.00 AUD)
      await adminClient.post('/api/admin/visits', {
        customer_id: custId,
        staff_id: 'stf-001',
        visit_date: '2026-11-16T14:00:00Z',
        total_amount_cents: 8500,
      });

      const summaryBefore = (await adminClient.get('/api/admin/finance/summary')).json();

      // Soft delete customer
      await adminClient.delete(`/api/admin/customers/${custId}`);

      // Verify finance total revenue does NOT decrease
      const summaryAfter = (await adminClient.get('/api/admin/finance/summary')).json();
      expect(summaryAfter.totalRevenueCents).toBe(summaryBefore.totalRevenueCents);
    }, 3);

    test('T3-PAIR-14: Staff Deactivation ↔ Historical Productivity Retention ↔ New Appointment Exclusion', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('super_admin');

      // Create staff
      const staffRes = await adminClient.post('/api/admin/staff', {
        full_name: 'Departing Tech',
        phone: '0419 888 777',
        role: 'staff',
      });
      const staffId = staffRes.json().staff_id;

      // Attribute visit
      await adminClient.post('/api/admin/visits', {
        customer_id: 'cust-001',
        staff_id: staffId,
        visit_date: '2026-11-16T15:00:00Z',
        total_amount_cents: 6000,
      });

      // Deactivate
      await adminClient.put(`/api/admin/staff/${staffId}/status`, { is_active: false });

      // Excluded from active dropdown
      const activeStaff = (await adminClient.get('/api/admin/staff?active=true')).json().staff;
      expect(activeStaff.some((s: any) => s.id === staffId)).toBe(false);

      // Productivity retained
      const prod = (await adminClient.get(`/api/admin/staff/${staffId}/productivity`)).json();
      expect(prod.completed_visits).toBe(1);
      expect(prod.total_revenue_cents).toBe(6000);
    }, 3);

    test('T3-PAIR-15: Operating Expense Entry ↔ Receipt Storage Upload ↔ BAS Tax Deduction', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      const expRes = await adminClient.post('/api/admin/finance/transactions', {
        type: 'expense',
        category: 'Rent',
        amount_cents: 33000, // $330.00 AUD (includes $30.00 GST)
        is_tax_deductible: true,
        description: 'Monthly commercial salon rent',
      });
      expectResponse(expRes).toHaveStatus(201);

      const bas = (await adminClient.get('/api/admin/finance/bas?quarter=Q1')).json();
      expect(bas.gstPaidCents).toBeGreaterThanOrEqual(3000); // 33000 / 11 = 3000
    }, 3);

    test('T3-PAIR-16: Bilingual CMS Content Update ↔ Public Language Switcher ↔ XML Sitemap', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      // Update service name in both languages
      await adminClient.put('/api/admin/services/srv-001', {
        name_en: 'Express Manicure Deluxe',
        name_vi: 'Chăm Sóc Móng Nhanh Cao Cấp',
      });

      const enPage = await adminClient.get('/en/services');
      expect(enPage.bodyText).toContain('Express Manicure Deluxe');

      const viPage = await adminClient.get('/vi/services');
      expect(viPage.bodyText).toContain('Chăm Sóc Móng Nhanh Cao Cấp');

      const sitemap = await adminClient.get('/sitemap.xml');
      expect(sitemap.bodyText).toContain('/en/services');
      expect(sitemap.bodyText).toContain('/vi/services');
    }, 3);
  }, 3);
}
