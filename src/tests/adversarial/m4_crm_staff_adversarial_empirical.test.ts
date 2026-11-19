import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  removeVietnameseDiacritics,
  normalizeVietnamese,
  normalizePhoneForSearch,
  matchesPhoneSearch,
  matchesCustomerSearch,
  sanitizeXss,
  formatCustomerRecord,
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  updateCustomerPreferences,
  softDeleteCustomer,
  logVisit,
  getInquiries,
  getInquiryById,
  updateInquiryStatus,
} from '@/lib/crm/customers';
import { mockCrmStore } from '@/lib/crm/mock-customers';

// Route handlers
import { GET as getCustomersRoute, POST as postCustomerRoute } from '@/app/api/admin/customers/route';
import {
  GET as getCustomerByIdRoute,
  PUT as putCustomerRoute,
  DELETE as deleteCustomerRoute,
} from '@/app/api/admin/customers/[id]/route';
import { PUT as putCustomerPreferencesRoute } from '@/app/api/admin/customers/[id]/preferences/route';
import { GET as getInquiriesRoute } from '@/app/api/admin/inquiries/route';
import { GET as getInquiryByIdRoute, PUT as putInquiryRoute } from '@/app/api/admin/inquiries/[id]/route';
import { PUT as putInquiryStatusRoute } from '@/app/api/admin/inquiries/[id]/status/route';
import { GET as getVisitsRoute, POST as postVisitRoute } from '@/app/api/admin/visits/route';

function createAdminRequest(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  role: 'super_admin' | 'manager' | 'staff' = 'manager'
) {
  const headers: Record<string, string> = {
    Cookie: `sb-authenticated=true; sb-role=${role}; sb-email=${role}@glamournails.com.au`,
  };
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Empirical Adversarial Stress Suite: Milestone 4 (CRM & Staff)', () => {
  beforeEach(() => {
    mockCrmStore.reset();
  });

  // =========================================================================
  // Test Suite 1: Vietnamese Accent-Insensitive Matching
  // =========================================================================
  describe('1. Vietnamese Accent-Insensitive Matching & Orthographic Stress', () => {
    it('1.1: matches decomposed Unicode NFD diacritics against precomposed NFC strings', () => {
      const nfcName = 'Nguyễn Thị Thuỳ Dung';
      const nfdName = nfcName.normalize('NFD');

      expect(nfcName).not.toBe(nfdName); // NFD representation has distinct codepoints
      expect(removeVietnameseDiacritics(nfcName)).toBe('Nguyen Thi Thuy Dung');
      expect(removeVietnameseDiacritics(nfdName)).toBe('Nguyen Thi Thuy Dung');
      expect(normalizeVietnamese(nfcName)).toBe(normalizeVietnamese(nfdName));
    });

    it('1.2: handles old orthography vs new orthography tone placement (Hoà vs Hòa, Thùy vs Thuỳ)', () => {
      // New orthography: tone on second vowel in diphthong ('Hoà', 'Thuỳ')
      // Old orthography: tone on first vowel in diphthong ('Hòa', 'Thùy')
      const hoaNew = 'Hoà';
      const hoaOld = 'Hòa';
      expect(hoaNew).not.toBe(hoaOld);
      expect(normalizeVietnamese(hoaNew)).toBe('hoa');
      expect(normalizeVietnamese(hoaOld)).toBe('hoa');
      expect(normalizeVietnamese(hoaNew)).toBe(normalizeVietnamese(hoaOld));

      const thuyNew = 'Thuỳ';
      const thuyOld = 'Thùy';
      expect(thuyNew).not.toBe(thuyOld);
      expect(normalizeVietnamese(thuyNew)).toBe('thuy');
      expect(normalizeVietnamese(thuyOld)).toBe('thuy');
      expect(normalizeVietnamese(thuyNew)).toBe(normalizeVietnamese(thuyOld));

      const customer = {
        name: 'Phan Thị Thuỳ Hoà',
        phone: '0412 111 222',
      };
      // Query with old orthography
      expect(matchesCustomerSearch(customer, 'Hòa')).toBe(true);
      expect(matchesCustomerSearch(customer, 'Thùy')).toBe(true);
      // Query with new orthography
      expect(matchesCustomerSearch(customer, 'Hoà')).toBe(true);
      expect(matchesCustomerSearch(customer, 'Thuỳ')).toBe(true);
      // Query with unaccented ASCII
      expect(matchesCustomerSearch(customer, 'Hoa')).toBe(true);
      expect(matchesCustomerSearch(customer, 'Thuy')).toBe(true);
    });

    it('1.3: converts crossbarred Vietnamese letters đ/Đ to d/D under NFC and NFD', () => {
      const testCases = [
        { name: 'Đoan Trang', expected: 'doan trang' },
        { name: 'Đình Bảng', expected: 'dinh bang' },
        { name: 'Đồng Nai', expected: 'dong nai' },
        { name: 'Đặng Đức', expected: 'dang duc' },
        { name: 'Huỳnh Điền', expected: 'huynh dien' },
      ];

      for (const tc of testCases) {
        // NFC
        expect(normalizeVietnamese(tc.name)).toBe(tc.expected);
        // NFD
        expect(normalizeVietnamese(tc.name.normalize('NFD'))).toBe(tc.expected);

        const customer = { name: tc.name, phone: '0412 999 888' };
        // Unaccented query
        const unaccented = tc.expected.split(' ')[0];
        expect(matchesCustomerSearch(customer, unaccented)).toBe(true);
      }
    });

    it('1.4: multi-word token search matches irrespective of word order or case', () => {
      const customer = {
        name: 'Nguyễn Thị Khánh Vân',
        phone: '0412 345 678',
      };

      // Exact order ASCII
      expect(matchesCustomerSearch(customer, 'Nguyen Thi Khanh Van')).toBe(true);
      // Reversed tokens
      expect(matchesCustomerSearch(customer, 'Van Nguyen')).toBe(true);
      // Middle tokens
      expect(matchesCustomerSearch(customer, 'Khanh Thi')).toBe(true);
      // Mixed accents and unaccented
      expect(matchesCustomerSearch(customer, 'Khánh Nguyen')).toBe(true);
      // Partial tokens
      expect(matchesCustomerSearch(customer, 'Kha Van')).toBe(true);
      // Non-matching token fails
      expect(matchesCustomerSearch(customer, 'Van Lan')).toBe(false);
    });

    it('1.5: [BUG PROBE] client-side UI search in page.tsx fails out-of-order multi-word tokens', () => {
      // In src/app/admin/customers/page.tsx line 362:
      // const normName = removeVietnameseDiacritics(rawName).toLowerCase();
      // const normQ = removeVietnameseDiacritics(q).toLowerCase();
      // const matchesName = normName.includes(normQ);
      //
      // Because page.tsx uses normName.includes(normQ) rather than token splitting:
      const rawName = 'Nguyễn Thị Khánh Vân';
      const normName = removeVietnameseDiacritics(rawName).toLowerCase(); // 'nguyen thi khanh van'
      const query = 'Van Nguyen';
      const normQ = removeVietnameseDiacritics(query).toLowerCase(); // 'van nguyen'

      const uiMatches = normName.includes(normQ);
      // This is an empirical bug in the frontend client-side filter
      expect(uiMatches).toBe(false); // Demonstrates the frontend UI bug!
    });
  });

  // =========================================================================
  // Test Suite 2: Australian Customer Phone Search Boundaries
  // =========================================================================
  describe('2. Australian Customer Phone Search Boundaries', () => {
    const targetPhone = '0412 345 678';

    it('2.1: matches standard domestic formats', () => {
      const formats = [
        '0412 345 678',
        '0412-345-678',
        '0412345678',
        '(0412) 345 678',
        '0412.345.678',
        ' 0412 345 678 ',
      ];

      for (const fmt of formats) {
        expect(matchesPhoneSearch(targetPhone, fmt), `Failed for format: ${fmt}`).toBe(true);
      }
    });

    it('2.2: matches full international prefix formats (+614XXXXXXXX)', () => {
      const internationalFormats = [
        '+61412345678',
        '61412345678',
        '+61 412 345 678',
        '+61-412-345-678',
        '+61 (412) 345 678',
      ];

      for (const fmt of internationalFormats) {
        expect(matchesPhoneSearch(targetPhone, fmt), `Failed for format: ${fmt}`).toBe(true);
      }
    });

    it('2.3: matches partial substring digit queries (middle, suffix)', () => {
      const partials = [
        '345678',
        '345 678',
        '345-678',
        '123456',
        '5678',
        '345',
      ];

      for (const part of partials) {
        expect(matchesPhoneSearch(targetPhone, part), `Failed for partial: ${part}`).toBe(true);
      }
    });

    it('2.4: matches domestic prefix query (0412)', () => {
      expect(matchesPhoneSearch(targetPhone, '0412')).toBe(true);
    });

    it('2.5: partial international prefix search matches in matchesPhoneSearch', () => {
      const partialInternationalQuery = '+61 412';
      const result = matchesPhoneSearch(targetPhone, partialInternationalQuery);
      expect(result).toBe(true);
    });

    it('2.6: [BUG PROBE] client-side UI phone search in page.tsx fails full international format', () => {
      // In src/app/admin/customers/page.tsx line 359-363:
      // const normPhone = c.phone.replace(/\D/g, ''); // '0412345678'
      // const qDigits = q.replace(/\D/g, ''); // '61412345678'
      // const matchesPhone = qDigits.length >= 3 && normPhone.includes(qDigits);
      // '0412345678'.includes('61412345678') is FALSE!
      const customerPhone = '0412 345 678';
      const normPhone = customerPhone.replace(/\D/g, '');
      const query = '+61 412 345 678';
      const qDigits = query.replace(/\D/g, '');

      const uiMatches = qDigits.length >= 3 && normPhone.includes(qDigits);
      expect(uiMatches).toBe(false); // Empirical proof of the UI bug in page.tsx!
    });

    it('2.7: rejects queries under 3 digits to avoid false-positive spam', () => {
      expect(matchesPhoneSearch(targetPhone, '04')).toBe(false);
      expect(matchesPhoneSearch(targetPhone, '0')).toBe(false);
      expect(matchesPhoneSearch(targetPhone, '')).toBe(false);
      expect(matchesPhoneSearch(targetPhone, '  ')).toBe(false);
    });
  });

  // =========================================================================
  // Test Suite 3: Stored XSS Defense & Sanitization Boundaries
  // =========================================================================
  describe('3. Stored XSS Defense & Sanitization Boundaries', () => {
    const xssPayloads = [
      { name: 'Classic script tag', payload: "<script>alert('xss')</script>" },
      { name: 'Script tag with src', payload: '<script src="https://evil.com/xss.js"></script>' },
      { name: 'Img onerror vector', payload: '<img src=x onerror=alert(1)>' },
      { name: 'Svg onload vector', payload: '<svg onload=alert(document.domain)>' },
      { name: 'Iframe javascript URI', payload: '<iframe src="javascript:alert(1)"></iframe>' },
      { name: 'Body onload', payload: '<body onload="alert(1)">' },
      { name: 'Anchor javascript URI', payload: '<a href="javascript:alert(1)">Click me</a>' },
    ];

    it('3.1: sanitizeXss sanitizes <script> tags to HTML entities', () => {
      const scriptPayload = "<script>alert('xss')</script>";
      const sanitized = sanitizeXss(scriptPayload);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });

    it('3.2: sanitizeXss sanitizes non-script XSS vectors (<img onerror>, <svg onload>)', () => {
      const imgPayload = '<img src=x onerror=alert(1)>';
      const sanitizedImg = sanitizeXss(imgPayload);
      expect(sanitizedImg).not.toContain('<img');
      expect(sanitizedImg).toContain('&lt;img');

      const svgPayload = '<svg onload=alert(document.domain)>';
      const sanitizedSvg = sanitizeXss(svgPayload);
      expect(sanitizedSvg).not.toContain('<svg');
      expect(sanitizedSvg).toContain('&lt;svg');
    });

    it('3.3: createCustomer sanitizes customer notes and allergy entries on save', async () => {
      const customer = await createCustomer({
        full_name: 'XSS Victim Customer',
        phone: '0412 555 777',
        notes: "<script>alert('notes-xss')</script>",
        allergies: "<img src=x onerror=alert('allergy-xss')>",
      });

      // Probe customer in mock store:
      const stored = mockCrmStore.customers.find((c) => c.id === customer.id);
      expect(stored).toBeDefined();

      expect(stored?.notes).not.toContain('<script>');
      expect(stored?.notes).toContain('&lt;script&gt;');
      expect(stored?.general_notes).not.toContain('<script>');
      expect(stored?.general_notes).toContain('&lt;script&gt;');
      expect(stored?.allergies).not.toContain('<img');
      expect(stored?.allergies).toContain('&lt;img');
      expect(stored?.allergies_sensitivities).not.toContain('<img');
      expect(stored?.allergies_sensitivities).toContain('&lt;img');
    });

    it('3.4: updateCustomerPreferences sanitizes notes and allergies', async () => {
      const cust = mockCrmStore.customers[0];
      const res = await updateCustomerPreferences(cust.id, {
        allergies: '<svg onload=alert(1)>',
        notes: "<script>alert('pwned')</script>",
      });

      expect(res?.allergies).not.toContain('<svg');
      expect(res?.allergies).toContain('&lt;svg');
      expect(res?.notes).not.toContain('<script>');
      expect(res?.notes).toContain('&lt;script&gt;');
    });

    it('3.5: getInquiries sanitizes all HTML and script vectors in notes', async () => {
      mockCrmStore.consultations.push({
        id: 'inq-xss-test-img',
        customer_id: null,
        customer_name: 'Attacker Inquiry',
        phone: '0412 888 999',
        email: 'attacker@evil.com',
        preferred_language: 'en',
        preferred_date: '2026-11-20',
        preferred_time: '10:00',
        service_requested_id: null,
        services_requested: [],
        notes: "Sensitive cuticles <script>alert(1)</script> and <img src=x onerror=alert('xss')>",
        status: 'new',
        source: 'web_form',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const inquiries = await getInquiries();
      const inq = inquiries.find((i) => i.id === 'inq-xss-test-img');
      expect(inq).toBeDefined();

      // <script> was entity encoded
      expect(inq?.notes).not.toContain('<script>');
      expect(inq?.notes).toContain('&lt;script&gt;');

      // <img onerror> is also sanitized
      expect(inq?.notes).not.toContain('<img');
      expect(inq?.notes).toContain('&lt;img');
    });
  });

  // =========================================================================
  // Test Suite 4: Soft-Deletion Invariants & Data Retention
  // =========================================================================
  describe('4. Soft-Deletion Invariants & Data Retention', () => {
    it('4.1: soft-deleting a customer sets is_active: false and excludes from default getCustomers', async () => {
      const targetCustomer = mockCrmStore.customers[0];
      const targetId = targetCustomer.id;

      // 1. Soft-delete
      const success = await softDeleteCustomer(targetId);
      expect(success).toBe(true);

      // Verify is_active is false
      expect(targetCustomer.is_active).toBe(false);

      // 2. Default getCustomers (without includeInactive)
      const { customers } = await getCustomers({ includeInactive: false });
      const found = customers.find((c) => c.id === targetId);
      expect(found).toBeUndefined();
    });

    it('4.2: soft-deleted customer is returned when includeInactive: true is specified', async () => {
      const targetCustomer = mockCrmStore.customers[0];
      const targetId = targetCustomer.id;

      await softDeleteCustomer(targetId);

      const { customers } = await getCustomers({ includeInactive: true });
      const found = customers.find((c) => c.id === targetId);
      expect(found).toBeDefined();
      expect(found?.is_active).toBe(false);
    });

    it('4.3: customer profile and visit history can still be retrieved directly by ID', async () => {
      const targetCustomer = mockCrmStore.customers[0];
      const targetId = targetCustomer.id;

      // Log a visit first
      const visitRes = await logVisit({
        customer_id: targetId,
        total_amount_cents: 9500,
        payment_method: 'card',
        notes: 'Pre-delete visit',
      });
      const visitId = visitRes.visit_id;

      // Soft delete
      await softDeleteCustomer(targetId);

      // Direct lookup by ID
      const retrieved = await getCustomerById(targetId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(targetId);
      expect(retrieved?.is_active).toBe(false);
      expect(retrieved?.visits).toBeDefined();
      expect(retrieved?.visits.some((v) => v.id === visitId)).toBe(true);
    });

    it('4.4: financial ledger transactions and customer totals are strictly retained upon soft delete', async () => {
      const targetCustomer = mockCrmStore.customers[0];
      const targetId = targetCustomer.id;

      const visitRes = await logVisit({
        customer_id: targetId,
        total_amount_cents: 15000, // $150.00 AUD
        payment_method: 'EFTPOS',
      });
      const txId = visitRes.transaction_id;

      const spendBefore = targetCustomer.total_spend_cents;
      const visitsBefore = targetCustomer.total_visits_count;

      // Soft delete
      await softDeleteCustomer(targetId);

      // Invariant checks:
      // 1. Transaction exists in finance ledger
      const tx = mockCrmStore.transactions.find((t) => t.id === txId);
      expect(tx).toBeDefined();
      expect(tx?.customer_id).toBe(targetId);
      expect(tx?.amount_cents).toBe(15000);

      // 2. Customer profile totals are untouched
      expect(targetCustomer.total_spend_cents).toBe(spendBefore);
      expect(targetCustomer.total_visits_count).toBe(visitsBefore);
    });

    it('4.5: REST API DELETE /api/admin/customers/[id] soft-deletes with HTTP 200 and preserves data', async () => {
      const cust = mockCrmStore.customers[1];
      const custId = cust.id;

      const req = createAdminRequest(
        `http://localhost:3000/api/admin/customers/${custId}`,
        'DELETE'
      );
      const res = await deleteCustomerRoute(req, { params: Promise.resolve({ id: custId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      // Verify excluded from GET /api/admin/customers
      const getReq = createAdminRequest('http://localhost:3000/api/admin/customers');
      const getRes = await getCustomersRoute(getReq);
      const getData = await getRes.json();
      expect(getData.customers.some((c: any) => c.id === custId)).toBe(false);

      // Verify included when include_inactive=true
      const getInactiveReq = createAdminRequest(
        'http://localhost:3000/api/admin/customers?include_inactive=true'
      );
      const getInactiveRes = await getCustomersRoute(getInactiveReq);
      const getInactiveData = await getInactiveRes.json();
      const found = getInactiveData.customers.find((c: any) => c.id === custId);
      expect(found).toBeDefined();
      expect(found.is_active).toBe(false);
    });
  });
});
