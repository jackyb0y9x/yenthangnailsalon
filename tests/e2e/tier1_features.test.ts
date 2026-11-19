/**
 * Tier 1: Feature Coverage (R1 - R4 Baseline)
 * 34 comprehensive test cases across 6 functional domains
 */

import { describe, test, beforeAll, afterAll } from './infra/harness.ts';
import { OpaqueTestClient } from './infra/client.ts';
import { expect, expectHtml, expectResponse } from './infra/assertions.ts';
import { FIXTURES, validateAbn } from './infra/fixtures.ts';

export function registerTier1Tests() {
  const client = new OpaqueTestClient();

  // ============================================================================
  // Domain 1: Public Website & Localization (6 Cases)
  // ============================================================================
  describe('Domain 1: Public Website & Localization', () => {
    test('T1-PUB-01: Bilingual Subpath Routing & Language Switcher', async () => {
      // 1. Fetch English homepage
      const resEn = await client.get('/en');
      expectResponse(resEn).toBeOk();
      expectHtml(resEn.bodyText).toHaveLang('en');
      expectHtml(resEn.bodyText).toHaveTitle('Glamour Nails & Spa Sydney');

      // 2. Fetch Vietnamese homepage
      const resVi = await client.get('/vi');
      expectResponse(resVi).toBeOk();
      expectHtml(resVi.bodyText).toHaveLang('vi');
      expectHtml(resVi.bodyText).toHaveTitle('Tiệm Móng Đẳng Cấp');

      // 3. Test root path redirects according to cookie or defaults
      client.setCookie('NEXT_LOCALE', 'vi');
      const resRoot = await client.get('/');
      expect(resRoot.status).toBe(307);
      expect(resRoot.headers.get('Location')).toBe('/vi');
      client.clearCookies();
    }, 1);

    test('T1-PUB-02: Australian Phone & Contact Formatting', async () => {
      const res = await client.get('/en/contact');
      expectResponse(res).toBeOk();

      // Check footer contact details
      expect(res.bodyText).toContain('tel:+61291234567');
      expect(res.bodyText).toContain(FIXTURES.salon.phone);
      expect(res.bodyText).toContain(FIXTURES.salon.address);

      // Verify ABN presence and validity
      expect(res.bodyText).toContain(`ABN: ${FIXTURES.salon.abn}`);
      expect(validateAbn(FIXTURES.salon.abn)).toBe(true);
    }, 1);

    test('T1-PUB-03: Real-Time AEST/AEDT Opening Status Badge', async () => {
      const res = await client.get('/en');
      expectResponse(res).toBeOk();
      // Badge should display open or holiday notice
      expect(res.bodyText).toContain('status-badge');
      expect(res.bodyText).toContain('Open Now — Closes at 8:00 PM');
    }, 1);

    test('T1-PUB-04: Service Menu Showcase with AUD Inclusive Pricing', async () => {
      const res = await client.get('/en/services');
      expectResponse(res).toBeOk();

      // Check category and pricing display
      expect(res.bodyText).toContain('Express Manicure');
      expect(res.bodyText).toContain('$35.00 AUD');
      expect(res.bodyText).toContain('$95.00 AUD');
      expect(res.bodyText).toContain('All prices are inclusive of Australian GST (10%)');
    }, 1);

    test('T1-PUB-05: Filterable Nail Art Gallery & Responsive Lightbox', async () => {
      // 1. Fetch full gallery
      const res = await client.get('/en/gallery');
      expectResponse(res).toBeOk();
      expect(res.bodyText).toContain('gallery-item');
      expect(res.bodyText).toContain('lightbox-modal');
      expect(res.bodyText).toContain('Rose Gold French Ombre');

      // 2. Filter by category
      const resFilter = await client.get('/en/gallery?category=Ombre');
      expectResponse(resFilter).toBeOk();
      expect(resFilter.bodyText).toContain('Rose Gold French Ombre');
    }, 1);

    test('T1-PUB-06: Public Consultation & Inquiry Booking Form Submission', async () => {
      const payload = {
        customer_name: 'Sarah Jenkins',
        phone: '0412 345 678',
        email: 'sarah.j@example.com.au',
        preferred_language: 'en',
        preferred_date: '2026-11-25',
        preferred_time: '14:00',
        services_requested: ['Full Set Acrylic', 'Nail Art'],
        notes: 'Interested in almond shape with French ombre',
      };

      const res = await client.post('/api/consultation', payload);
      expectResponse(res).toHaveStatus(201);
      const json = res.json();
      expect(json.success).toBe(true);
      expect(json.inquiry_id).toBeDefined();
      expect(json.status).toBe('new');
    }, 1);
  }, 1);

  // ============================================================================
  // Domain 2: International SEO & Search Discovery (5 Cases)
  // ============================================================================
  describe('Domain 2: International SEO & Search Discovery', () => {
    test('T1-SEO-01: Schema.org NailSalon JSON-LD Structured Data', async () => {
      const res = await client.get('/en');
      expectResponse(res).toBeOk();

      expectHtml(res.bodyText).toHaveJsonLd('NailSalon', (data) => {
        expect(data['@context']).toBe('https://schema.org');
        expect(data.currenciesAccepted).toBe('AUD');
        expect(data.priceRange).toBe('$$');
        expect(data.address.addressCountry).toBe('AU');
        expect(data.address.postalCode).toBe('2000');
        expect(Array.isArray(data.openingHoursSpecification)).toBe(true);
        return true;
      });
    }, 1);

    test('T1-SEO-02: Dynamic hreflang Alternates & Canonical Link Headers', async () => {
      const res = await client.get('/en/services');
      expectResponse(res).toBeOk();

      expectHtml(res.bodyText).toHaveHreflang('en-AU', '/en/services');
      expectHtml(res.bodyText).toHaveHreflang('vi-VN', '/vi/services');
      expectHtml(res.bodyText).toHaveHreflang('vi-AU', '/vi/services');
      expectHtml(res.bodyText).toHaveHreflang('x-default', '/en/services');
      expect(res.bodyText).toContain('rel="canonical" href="https://glamournails.com.au/en/services"');
    }, 1);

    test('T1-SEO-03: Localized Open Graph & Social Card Metadata', async () => {
      const resEn = await client.get('/en');
      expectHtml(resEn.bodyText).toHaveMeta('og:locale', 'en_AU');
      expectHtml(resEn.bodyText).toHaveMeta('og:site_name', FIXTURES.salon.name);

      const resVi = await client.get('/vi');
      expectHtml(resVi.bodyText).toHaveMeta('og:locale', 'vi_VN');
      expectHtml(resVi.bodyText).toHaveMeta('og:title', 'Glamour Nails Sydney | Tiệm Nail Sang Trọng');
    }, 1);

    test('T1-SEO-04: Dynamic XML Sitemap Generation', async () => {
      const res = await client.get('/sitemap.xml');
      expectResponse(res).toBeOk();
      expect(res.headers.get('content-type') || '').toContain('xml');
      expect(res.bodyText).toContain('<urlset');
      expect(res.bodyText).toContain('https://glamournails.com.au/en');
      expect(res.bodyText).toContain('https://glamournails.com.au/vi');
      expect(res.bodyText).toContain('https://glamournails.com.au/en/services');
      expect(res.bodyText).toContain('hreflang="en-AU"');
      expect(res.bodyText).toContain('hreflang="vi-VN"');
    }, 1);

    test('T1-SEO-05: Automated robots.txt Crawler Directives', async () => {
      const res = await client.get('/robots.txt');
      expectResponse(res).toBeOk();
      expect(res.bodyText).toContain('User-agent: *');
      expect(res.bodyText).toContain('Allow: /');
      expect(res.bodyText).toContain('Disallow: /admin');
      expect(res.bodyText).toContain('Disallow: /api/admin');
      expect(res.bodyText).toContain('Sitemap: https://glamournails.com.au/sitemap.xml');
    }, 1);
  }, 1);

  // ============================================================================
  // Domain 3: Homepage CMS (7 Cases)
  // ============================================================================
  describe('Domain 3: Homepage CMS Management', () => {
    test('T1-CMS-01: Administrative Authentication & Route Guard Protection', async () => {
      // 1. Unauthenticated request to /admin should redirect to /admin/login
      const clientUnauth = new OpaqueTestClient();
      const resRedirect = await clientUnauth.get('/admin/dashboard');
      expect(resRedirect.status).toBe(307);
      expect(resRedirect.headers.get('Location')).toBe('/admin/login');

      // 2. Login as manager
      await clientUnauth.loginAs('manager');
      const resAuth = await clientUnauth.get('/admin/dashboard');
      expectResponse(resAuth).toBeOk();
      expect(resAuth.bodyText).toContain('Admin Dashboard (manager)');
    }, 1);

    test('T1-CMS-02: Hero Banner Editor CRUD & Bilingual Content Update', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('super_admin');

      const updatedHero = {
        headline_en: 'Spring Beauty at Glamour Nails',
        headline_vi: 'Vẻ Đẹp Mùa Xuân Tại Glamour Nails',
        subheadline_en: 'Refined manicure and spa treatments in Sydney CBD.',
        subheadline_vi: 'Dịch vụ làm móng và chăm sóc spa tinh tế tại trung tâm Sydney.',
        cta_text_en: 'Book Your Spring Set',
        cta_text_vi: 'Đặt Lịch Mùa Xuân',
        cta_link: '/contact',
      };

      const res = await adminClient.post('/api/admin/cms/hero', updatedHero);
      expectResponse(res).toBeOk();
      expect(res.json().success).toBe(true);

      // Verify update in public homepage
      const resPublic = await adminClient.get('/en');
      expect(resPublic.bodyText).toContain('Spring Beauty at Glamour Nails');
      expect(resPublic.bodyText).toContain('Book Your Spring Set');
    }, 1);

    test('T1-CMS-03: Promotional Announcement Bar Manager', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      const promoPayload = {
        is_active: true,
        message_en: 'Flash Deal: 20% off Spa Pedicure this Thursday!',
        message_vi: 'Ưu đãi chớp nhoáng: Giảm 20% Spa Chân thứ Năm này!',
        badge_text: 'LIMITED',
      };

      const res = await adminClient.post('/api/admin/cms/announcement', promoPayload);
      expectResponse(res).toBeOk();

      // Check on public EN and VI
      const resEn = await adminClient.get('/en');
      expect(resEn.bodyText).toContain('Flash Deal: 20% off Spa Pedicure this Thursday!');

      const resVi = await adminClient.get('/vi');
      expect(resVi.bodyText).toContain('Ưu đãi chớp nhoáng: Giảm 20% Spa Chân thứ Năm này!');
    }, 1);

    test('T1-CMS-04: Service Catalog CRUD & Order Management', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      // Create new service
      const newService = {
        name_en: 'Russian E-File Pedicure',
        name_vi: 'Chăm Sóc Móng Chân Kỹ Thuật E-File',
        category: 'Pedicure',
        price_cents: 8500,
        duration_minutes: 55,
      };

      const createRes = await adminClient.post('/api/admin/services', newService);
      expectResponse(createRes).toHaveStatus(201);
      const serviceId = createRes.json().service_id;
      expect(serviceId).toBeDefined();

      // Update service price
      const updateRes = await adminClient.put(`/api/admin/services/${serviceId}`, {
        price_cents: 9000,
      });
      expectResponse(updateRes).toBeOk();
      expect(updateRes.json().service.price_cents).toBe(9000);

      // Soft delete service
      const delRes = await adminClient.delete(`/api/admin/services/${serviceId}`);
      expectResponse(delRes).toBeOk();
    }, 1);

    test('T1-CMS-05: Gallery Asset Upload & Showcase Pinning', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      const item = {
        title_en: 'Pastel Lavender French Gel',
        title_vi: 'Móng Gel Kiểu Pháp Tím Pastel',
        category: 'Gel Art',
        image_url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=800&q=80',
        is_featured: true,
      };

      const res = await adminClient.post('/api/admin/gallery', item);
      expectResponse(res).toHaveStatus(201);
      expect(res.json().item_id).toBeDefined();

      // Verify on homepage
      const resEn = await adminClient.get('/en');
      expect(resEn.bodyText).toContain('Pastel Lavender French Gel');
    }, 1);

    test('T1-CMS-06: Business Hours & Emergency Holiday Closure Notice', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      const holiday = {
        holiday_notice_active: true,
        holiday_notice_en: 'Closed for Australia Day Long Weekend: Jan 26 - Jan 27',
        holiday_notice_vi: 'Nghỉ Lễ Quốc Khánh Úc: 26/01 - 27/01',
      };

      const res = await adminClient.post('/api/admin/cms/hours', holiday);
      expectResponse(res).toBeOk();

      // Verify badge on public homepage switches to closed
      const resEn = await adminClient.get('/en');
      expect(resEn.bodyText).toContain('Closed for Holiday');
      expect(resEn.bodyText).toContain('Closed for Australia Day Long Weekend');

      // Reset holiday notice
      await adminClient.post('/api/admin/cms/hours', { holiday_notice_active: false });
    }, 1);

    test('T1-CMS-07: Instant Cache Revalidation on CMS Save', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('super_admin');

      const timestampTitle = `Headline Instant Revalidation ${Date.now()}`;
      await adminClient.post('/api/admin/cms/hero', { headline_en: timestampTitle });

      // Immediate subsequent get should reflect the new headline without delay
      const res = await adminClient.get('/en');
      expect(res.bodyText).toContain(timestampTitle);
    }, 1);
  }, 1);

  // ============================================================================
  // Domain 4: CRM (Customer Relationship Management) (5 Cases)
  // ============================================================================
  describe('Domain 4: Customer Relationship Management (CRM)', () => {
    let testCustomerId: string;

    test('T1-CRM-01: Customer Profile CRUD Operations', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      // Create
      const newCust = {
        full_name: 'Jessica Nguyen',
        phone: '0433 111 222',
        email: 'jessica.n@example.com.au',
        preferred_language: 'vi',
      };
      const createRes = await adminClient.post('/api/admin/customers', newCust);
      expectResponse(createRes).toHaveStatus(201);
      testCustomerId = createRes.json().customer_id;
      expect(testCustomerId).toBeDefined();

      // Retrieve
      const getRes = await adminClient.get(`/api/admin/customers/${testCustomerId}`);
      expectResponse(getRes).toBeOk();
      expect(getRes.json().customer.name).toBe('Jessica Nguyen');

      // Update
      const putRes = await adminClient.put(`/api/admin/customers/${testCustomerId}`, {
        email: 'jessica.updated@example.com.au',
      });
      expectResponse(putRes).toBeOk();
      expect(putRes.json().customer.email).toBe('jessica.updated@example.com.au');
    }, 1);

    test('T1-CRM-02: Vietnamese Accent-Insensitive Search Matching', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      // Query ASCII "Nguyen" matches "Nguyễn Thị Mai Lan"
      const res1 = await adminClient.get('/api/admin/customers?search=Nguyen');
      expectResponse(res1).toBeOk();
      const list1 = res1.json().customers;
      expect(list1.some((c: any) => c.name.includes('Nguyễn'))).toBe(true);

      // Query ASCII "Doan" matches "Đặng Thị Đoan Trang"
      const res2 = await adminClient.get('/api/admin/customers?search=Doan');
      expectResponse(res2).toBeOk();
      const list2 = res2.json().customers;
      expect(list2.some((c: any) => c.name.includes('Đoan'))).toBe(true);

      // Query phone number partial
      const res3 = await adminClient.get('/api/admin/customers?search=345678');
      expectResponse(res3).toBeOk();
      expect(res3.json().customers.length).toBeGreaterThan(0);
    }, 1);

    test('T1-CRM-03: Nail Preferences & Allergy Sensitivity Tracking', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      const prefPayload = {
        nail_shape: 'Coffin',
        preferred_products: ['Acrylic', 'Gel Art'],
        allergies: 'Severe Acetone sensitivity, Latex allergy',
        notes: 'Gentle cuticle care only, no electric drill',
      };

      const res = await adminClient.put(`/api/admin/customers/${testCustomerId}/preferences`, prefPayload);
      expectResponse(res).toBeOk();
      const cust = res.json().customer;
      expect(cust.nail_shape).toBe('Coffin');
      expect(cust.allergies).toContain('Acetone');
    }, 1);

    test('T1-CRM-04: Website Consultation Inquiry Triage Workflow', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      // 1. Submit public consultation inquiry
      const pubRes = await adminClient.post('/api/consultation', {
        customer_name: 'Emily Davis',
        phone: '0434 555 666',
        preferred_language: 'en',
        preferred_date: '2026-11-28',
      });
      const inquiryId = pubRes.json().inquiry_id;

      // 2. Fetch triage list
      const listRes = await adminClient.get('/api/admin/inquiries');
      expectResponse(listRes).toBeOk();
      expect(listRes.json().inquiries.some((i: any) => i.id === inquiryId)).toBe(true);

      // 3. Transition to contacted
      const contactRes = await adminClient.put(`/api/admin/inquiries/${inquiryId}/status`, { status: 'contacted' });
      expectResponse(contactRes).toBeOk();
      expect(contactRes.json().inquiry.status).toBe('contacted');

      // 4. Convert to customer booking
      const bookRes = await adminClient.put(`/api/admin/inquiries/${inquiryId}/status`, {
        status: 'booked',
        convert_to_customer: true,
      });
      expectResponse(bookRes).toBeOk();
      expect(bookRes.json().inquiry.status).toBe('booked');
      expect(bookRes.json().inquiry.converted_customer_id).toBeDefined();
    }, 1);

    test('T1-CRM-05: Service Visit History Logging & Auto-Increment', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      // Customer before visit
      const custBefore = (await adminClient.get(`/api/admin/customers/${testCustomerId}`)).json().customer;
      const initialVisits = custBefore.total_visits_count;
      const initialSpend = custBefore.total_spend_cents;

      // Log visit
      const visitPayload = {
        customer_id: testCustomerId,
        staff_id: 'stf-003',
        visit_date: '2026-11-16T14:30:00Z',
        services_rendered: [{ name: 'SNS Dipping', price_cents: 7500 }],
        total_amount_cents: 7500,
        payment_method: 'EFTPOS',
      };

      const res = await adminClient.post('/api/admin/visits', visitPayload);
      expectResponse(res).toHaveStatus(201);

      // Customer after visit
      const custAfter = (await adminClient.get(`/api/admin/customers/${testCustomerId}`)).json().customer;
      expect(custAfter.total_visits_count).toBe(initialVisits + 1);
      expect(custAfter.total_spend_cents).toBe(initialSpend + 7500);
    }, 1);
  }, 1);

  // ============================================================================
  // Domain 5: Staff Management (5 Cases)
  // ============================================================================
  describe('Domain 5: Staff Management', () => {
    let testStaffId: string;

    test('T1-STF-01: Staff Directory & Profile CRUD', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('super_admin');

      const newStaff = {
        full_name: 'Kevin Pham',
        phone: '0422 123 456',
        email: 'kevin.p@glamournails.com.au',
        role: 'staff',
        employment_type: 'Full-time',
        specializations: ['Acrylic Extensions', '3D Nail Art'],
      };

      const res = await adminClient.post('/api/admin/staff', newStaff);
      expectResponse(res).toHaveStatus(201);
      testStaffId = res.json().staff_id;
      expect(testStaffId).toBeDefined();

      const dirRes = await adminClient.get('/api/admin/staff');
      expect(dirRes.json().staff.some((s: any) => s.id === testStaffId)).toBe(true);
    }, 1);

    test('T1-STF-02: Role & Permission Assignment Enforcement', async () => {
      // 1. Staff role attempting finance should get 403
      const staffClient = new OpaqueTestClient();
      await staffClient.loginAs('staff');

      const resFinance = await staffClient.get('/api/admin/finance/summary');
      expect(resFinance.status).toBe(403);

      // 2. Manager role can access finance
      const managerClient = new OpaqueTestClient();
      await managerClient.loginAs('manager');
      const resManager = await managerClient.get('/api/admin/finance/summary');
      expectResponse(resManager).toBeOk();
    }, 1);

    test('T1-STF-03: Service Specializations Tagging', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('super_admin');

      const newSpecs = ['Acrylic Extensions', 'Russian Manicure', '3D Nail Art', 'E-File'];
      const res = await adminClient.put(`/api/admin/staff/${testStaffId}/specializations`, {
        specializations: newSpecs,
      });
      expectResponse(res).toBeOk();
      expect(res.json().staff.specializations).toEqual(newSpecs);
    }, 1);

    test('T1-STF-04: Staff Productivity & Revenue Attribution', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      // Log a visit with Kevin (testStaffId)
      await adminClient.post('/api/admin/visits', {
        customer_id: 'cust-001',
        staff_id: testStaffId,
        visit_date: '2026-11-16T15:00:00Z',
        services_rendered: [{ name: 'Acrylic Full Set', price_cents: 9500 }],
        total_amount_cents: 9500,
        payment_method: 'Credit Card',
      });

      // Query productivity
      const prodRes = await adminClient.get(`/api/admin/staff/${testStaffId}/productivity`);
      expectResponse(prodRes).toBeOk();
      const data = prodRes.json();
      expect(data.completed_visits).toBeGreaterThanOrEqual(1);
      expect(data.total_revenue_cents).toBeGreaterThanOrEqual(9500);
      expect(data.total_revenue_aud).toBeGreaterThanOrEqual(95.0);
    }, 1);

    test('T1-STF-05: Staff Deactivation & Historical Data Retention', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('super_admin');

      // Deactivate staff member
      const deactRes = await adminClient.put(`/api/admin/staff/${testStaffId}/status`, { is_active: false });
      expectResponse(deactRes).toBeOk();

      // Verify excluded from active staff list
      const activeList = (await adminClient.get('/api/admin/staff?active=true')).json().staff;
      expect(activeList.some((s: any) => s.id === testStaffId)).toBe(false);

      // Verify productivity history is still preserved
      const prodRes = await adminClient.get(`/api/admin/staff/${testStaffId}/productivity`);
      expectResponse(prodRes).toBeOk();
      expect(prodRes.json().completed_visits).toBeGreaterThanOrEqual(1);
    }, 1);
  }, 1);

  // ============================================================================
  // Domain 6: Financial Tracking & Australian Tax Accounting (6 Cases)
  // ============================================================================
  describe('Domain 6: Financial Tracking & Australian Tax', () => {
    test('T1-FIN-01: Manual Revenue Transaction Entry', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      const txPayload = {
        type: 'revenue',
        category: 'Product Sales',
        amount_cents: 4500,
        payment_method: 'EFTPOS',
        description: 'Cuticle Oil & Hand Cream retail sale',
        date: '2026-11-16',
      };

      const res = await adminClient.post('/api/admin/finance/transactions', txPayload);
      expectResponse(res).toHaveStatus(201);
      const json = res.json();
      expect(json.transaction.amount_cents).toBe(4500);
      expect(json.transaction.type).toBe('revenue');
    }, 1);

    test('T1-FIN-02: Operating Expense Transaction Entry', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      const expPayload = {
        type: 'expense',
        category: 'Supplies',
        amount_cents: 13200,
        payment_method: 'Credit Card',
        description: 'SNS dipping powder bulk order',
        is_tax_deductible: true,
        date: '2026-11-16',
      };

      const res = await adminClient.post('/api/admin/finance/transactions', expPayload);
      expectResponse(res).toHaveStatus(201);
      const json = res.json();
      expect(json.transaction.type).toBe('expense');
      expect(json.transaction.is_tax_deductible).toBe(true);
    }, 1);

    test('T1-FIN-03: Automated CRM Visit-to-Revenue Synchronization', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      // Logging visit automatically creates revenue transaction
      const visitRes = await adminClient.post('/api/admin/visits', {
        customer_id: 'cust-002',
        staff_id: 'stf-002',
        visit_date: '2026-11-16T16:00:00Z',
        services_rendered: [{ name: 'Luxury Spa Pedicure', price_cents: 6500 }],
        total_amount_cents: 6500,
        payment_method: 'Cash',
      });
      expectResponse(visitRes).toHaveStatus(201);
      const { transaction_id } = visitRes.json();
      expect(transaction_id).toBeDefined();

      // Check summary
      const summary = (await adminClient.get('/api/admin/finance/summary')).json();
      expect(summary.totalRevenueCents).toBeGreaterThanOrEqual(6500);
    }, 1);

    test('T1-FIN-04: Real-Time Financial Dashboard KPIs Calculation', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      const res = await adminClient.get('/api/admin/finance/summary');
      expectResponse(res).toBeOk();
      const kpis = res.json();

      expect(typeof kpis.totalRevenueCents).toBe('number');
      expect(typeof kpis.totalExpenseCents).toBe('number');
      expect(kpis.netProfitCents).toBe(kpis.totalRevenueCents - kpis.totalExpenseCents);
      expect(kpis.netProfitAud).toBe(kpis.netProfitCents / 100);
      expect(typeof kpis.profitMarginPercent).toBe('number');
    }, 1);

    test('T1-FIN-05: Categorical Breakdown Analytics', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      const res = await adminClient.get('/api/admin/finance/breakdown');
      expectResponse(res).toBeOk();
      const data = res.json();
      expect(data.revenueByCategory).toBeDefined();
      expect(data.expenseByCategory).toBeDefined();
      expect(typeof data.revenueByCategory['Services']).toBe('number');
    }, 1);

    test('T1-FIN-06: Australian Financial Year (1 July – 30 June) & Quarterly BAS Rollup', async () => {
      const adminClient = new OpaqueTestClient();
      await adminClient.loginAs('manager');

      const res = await adminClient.get('/api/admin/finance/bas?quarter=Q1&fy=2025-2026');
      expectResponse(res).toBeOk();
      const bas = res.json();

      expect(bas.quarter).toBe('Q1');
      expect(bas.fy).toBe('2025-2026');
      expect(typeof bas.gstCollectedCents).toBe('number');
      expect(typeof bas.gstPaidCents).toBe('number');
      expect(bas.netGstPayableCents).toBe(bas.gstCollectedCents - bas.gstPaidCents);
      expect(bas.netGstPayableAud).toBe(bas.netGstPayableCents / 100);
    }, 1);
  }, 1);
}
