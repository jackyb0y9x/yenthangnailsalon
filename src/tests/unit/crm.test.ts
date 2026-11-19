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
} from '@/lib/crm/customers';
import { mockCrmStore } from '@/lib/crm/mock-customers';

import { GET as getCustomers, POST as postCustomer } from '@/app/api/admin/customers/route';
import {
  GET as getCustomerById,
  PUT as putCustomer,
  DELETE as deleteCustomer,
} from '@/app/api/admin/customers/[id]/route';
import { PUT as putCustomerPreferences } from '@/app/api/admin/customers/[id]/preferences/route';
import { GET as getInquiries } from '@/app/api/admin/inquiries/route';
import { GET as getInquiryById, PUT as putInquiry } from '@/app/api/admin/inquiries/[id]/route';
import { PUT as putInquiryStatus } from '@/app/api/admin/inquiries/[id]/status/route';
import { GET as getVisits, POST as postVisit } from '@/app/api/admin/visits/route';

function createAdminRequest(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
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

describe('Unit Test Suite: Customer Relationship Management (CRM) - Milestone 4', () => {
  beforeEach(() => {
    mockCrmStore.reset();
  });

  describe('1. Vietnamese Diacritics Normalization & Accent-Insensitive Matching', () => {
    it('removes combining marks and preserves basic letters', () => {
      expect(removeVietnameseDiacritics('Nguyễn Thị Lan Anh')).toBe('Nguyen Thi Lan Anh');
      expect(removeVietnameseDiacritics('Trần Hương Giang')).toBe('Tran Huong Giang');
    });

    it('correctly transforms Đ and đ to D and d', () => {
      expect(removeVietnameseDiacritics('Đặng Thị Đoan Trang')).toBe('Dang Thi Doan Trang');
      expect(removeVietnameseDiacritics('Lê Đức Phúc')).toBe('Le Duc Phuc');
    });

    it('normalizes horned and hooked vowels', () => {
      expect(normalizeVietnamese('Dương Như Quỳnh')).toBe('duong nhu quynh');
      expect(normalizeVietnamese('Vũ Đình Đạt')).toBe('vu dinh dat');
    });

    it('matches ASCII search query against diacritic-rich names', () => {
      const client = { full_name: 'Nguyễn Thị Mai Lan', phone: '0412 345 678' };
      expect(matchesCustomerSearch(client, 'Nguyen')).toBe(true);
      expect(matchesCustomerSearch(client, 'nguyen')).toBe(true);
      expect(matchesCustomerSearch(client, 'mai lan')).toBe(true);
      expect(matchesCustomerSearch(client, 'LAN')).toBe(true);
      expect(matchesCustomerSearch(client, 'Watson')).toBe(false);
    });

    it('matches Đ/đ with plain D/d queries', () => {
      const client = { full_name: 'Đặng Thị Đoan Trang', phone: '0421 111 222' };
      expect(matchesCustomerSearch(client, 'Doan')).toBe(true);
      expect(matchesCustomerSearch(client, 'Dang')).toBe(true);
      expect(matchesCustomerSearch(client, 'trang')).toBe(true);
    });
  });

  describe('2. Australian Phone Normalization & Format-Agnostic Search', () => {
    it('normalizes international mobile numbers (+614) to national digits (04)', () => {
      expect(normalizePhoneForSearch('+61 412 345 678')).toBe('0412345678');
      expect(normalizePhoneForSearch('+61412345678')).toBe('0412345678');
    });

    it('normalizes formatted Australian mobile numbers with spaces or dashes', () => {
      expect(normalizePhoneForSearch('0412 345 678')).toBe('0412345678');
      expect(normalizePhoneForSearch('0412-345-678')).toBe('0412345678');
      expect(normalizePhoneForSearch('(04) 1234 5678')).toBe('0412345678');
    });

    it('matches various partial and formatted queries against mobile numbers', () => {
      const phone = '0412 345 678';
      expect(matchesPhoneSearch(phone, '0412')).toBe(true);
      expect(matchesPhoneSearch(phone, '345678')).toBe(true);
      expect(matchesPhoneSearch(phone, '345 678')).toBe(true);
      expect(matchesPhoneSearch(phone, '+61412345678')).toBe(true);
      expect(matchesPhoneSearch(phone, '0499')).toBe(false);
    });
  });

  describe('3. Dual Property Aliases & Record Formatting', () => {
    it('provides dual property aliases for schema and test assertions', () => {
      const formatted = formatCustomerRecord({
        id: 'cust-123',
        full_name: 'Sophie Clark',
        phone: '0412 345 678',
        nail_shape_preference: 'Almond',
        nail_length_preference: 'Long',
        preferred_services: ['SNS Dipping Powder'],
        allergies_sensitivities: 'Acetone allergy',
        total_visits: 5,
        total_spent_aud: 375.0,
      });

      // Name duality
      expect(formatted.name).toBe('Sophie Clark');
      expect(formatted.full_name).toBe('Sophie Clark');

      // Nail shape duality
      expect(formatted.nail_shape).toBe('Almond');
      expect(formatted.nail_shape_preference).toBe('Almond');

      // Nail length duality
      expect(formatted.nail_length).toBe('Long');
      expect(formatted.nail_length_preference).toBe('Long');

      // Services / Products duality
      expect(formatted.preferred_services).toContain('SNS Dipping Powder');
      expect(formatted.preferred_products).toContain('SNS Dipping Powder');

      // Allergies duality
      expect(formatted.allergies).toBe('Acetone allergy');
      expect(formatted.allergies_sensitivities).toBe('Acetone allergy');

      // Visits & Spend duality
      expect(formatted.total_visits).toBe(5);
      expect(formatted.total_visits_count).toBe(5);
      expect(formatted.total_spent_aud).toBe(375.0);
      expect(formatted.total_spend_cents).toBe(37500);
      expect(formatted.is_active).toBe(true);
    });
  });

  describe('4. Customer Profile CRUD & Route Handlers', () => {
    it('GET /api/admin/customers rejects unauthenticated requests with 401', async () => {
      const req = createAdminRequest('http://localhost:3000/api/admin/customers');
      const res = await getCustomers(req);
      expect(res.status).toBe(401);
    });

    it('GET /api/admin/customers lists active customers for authenticated staff/manager', async () => {
      const req = createAdminRequest(
        'http://localhost:3000/api/admin/customers',
        'GET',
        undefined,
        'manager'
      );
      const res = await getCustomers(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.customers)).toBe(true);
      expect(data.customers.length).toBeGreaterThan(0);
    });

    it('POST /api/admin/customers rejects missing name or invalid phone with 400', async () => {
      const req1 = createAdminRequest(
        'http://localhost:3000/api/admin/customers',
        'POST',
        { phone: '0412 345 678' },
        'manager'
      );
      const res1 = await postCustomer(req1);
      expect(res1.status).toBe(400);

      const req2 = createAdminRequest(
        'http://localhost:3000/api/admin/customers',
        'POST',
        { full_name: 'John Doe', phone: '0512 345 678' }, // Invalid AU mobile prefix
        'manager'
      );
      const res2 = await postCustomer(req2);
      expect(res2.status).toBe(400);
    });

    it('POST /api/admin/customers creates a new customer profile with 201', async () => {
      const payload = {
        full_name: 'Jessica Nguyen',
        phone: '0433 111 222',
        email: 'jessica.n@example.com.au',
        preferred_language: 'vi',
        nail_shape: 'Coffin',
        nail_length: 'Long',
        preferred_products: ['Acrylic & Extensions'],
        allergies: 'None',
      };
      const req = createAdminRequest(
        'http://localhost:3000/api/admin/customers',
        'POST',
        payload,
        'manager'
      );
      const res = await postCustomer(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.customer_id).toBeDefined();
      expect(data.customer.name).toBe('Jessica Nguyen');
      expect(data.customer.total_visits_count).toBe(0);
      expect(data.customer.total_spend_cents).toBe(0);
    });

    it('GET /api/admin/customers/[id] returns details, visits, and consultations', async () => {
      const cust = mockCrmStore.customers[0];
      const req = createAdminRequest(
        `http://localhost:3000/api/admin/customers/${cust.id}`,
        'GET',
        undefined,
        'manager'
      );
      const res = await getCustomerById(req, { params: Promise.resolve({ id: cust.id }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.customer.full_name).toBe(cust.full_name);
      expect(Array.isArray(data.customer.visits)).toBe(true);
    });

    it('PUT /api/admin/customers/[id] updates client contact details', async () => {
      const cust = mockCrmStore.customers[0];
      const req = createAdminRequest(
        `http://localhost:3000/api/admin/customers/${cust.id}`,
        'PUT',
        { email: 'updated.emily@example.com' },
        'manager'
      );
      const res = await putCustomer(req, { params: Promise.resolve({ id: cust.id }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.customer.email).toBe('updated.emily@example.com');
    });

    it('DELETE /api/admin/customers/[id] performs soft-deletion (is_active = false)', async () => {
      const cust = mockCrmStore.customers[0];
      const req = createAdminRequest(
        `http://localhost:3000/api/admin/customers/${cust.id}`,
        'DELETE',
        undefined,
        'manager'
      );
      const res = await deleteCustomer(req, { params: Promise.resolve({ id: cust.id }) });
      expect(res.status).toBe(200);
      expect(cust.is_active).toBe(false);

      // Verify excluded from default list
      const listReq = createAdminRequest(
        'http://localhost:3000/api/admin/customers',
        'GET',
        undefined,
        'manager'
      );
      const listRes = await getCustomers(listReq);
      const listData = await listRes.json();
      expect(listData.customers.some((c: any) => c.id === cust.id)).toBe(false);
    });
  });

  describe('5. Nail Preferences & Allergy Sensitivity Tracking', () => {
    it('PUT /api/admin/customers/[id]/preferences updates shape, length, and allergen alert', async () => {
      const cust = mockCrmStore.customers[0];
      const prefPayload = {
        nail_shape: 'Coffin',
        nail_length: 'Long',
        preferred_products: ['Acrylic', 'Gel Art'],
        allergies: 'Severe Acetone sensitivity, Latex allergy',
        notes: 'Gentle cuticle care only, no electric drill',
      };

      const req = createAdminRequest(
        `http://localhost:3000/api/admin/customers/${cust.id}/preferences`,
        'PUT',
        prefPayload,
        'manager'
      );
      const res = await putCustomerPreferences(req, { params: Promise.resolve({ id: cust.id }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.customer.nail_shape).toBe('Coffin');
      expect(data.customer.nail_length).toBe('Long');
      expect(data.customer.allergies).toContain('Acetone');
      expect(data.customer.preferred_products).toContain('Gel Art');
    });
  });

  describe('6. Consultation Inquiry Triage & Stored XSS Defense', () => {
    it('sanitizes <script> tags in inquiry notes preventing stored XSS', () => {
      const malicious = 'Looking for bridal sets <script>alert("xss")</script> on Saturday';
      const clean = sanitizeXss(malicious);
      expect(clean).not.toContain('<script>');
      expect(clean).toContain('&lt;script&gt;');
    });

    it('GET /api/admin/inquiries returns sanitized inquiry list', async () => {
      mockCrmStore.consultations.push({
        id: 'inq-xss',
        customer_id: null,
        customer_name: 'Attacker',
        phone: '0412 000 000',
        email: null,
        preferred_language: 'en',
        preferred_date: null,
        preferred_time: null,
        service_requested_id: null,
        services_requested: [],
        notes: 'Inquiry with <script>eval(evil)</script>',
        status: 'new',
        source: 'web_form',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const req = createAdminRequest(
        'http://localhost:3000/api/admin/inquiries',
        'GET',
        undefined,
        'manager'
      );
      const res = await getInquiries(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      const inq = data.inquiries.find((i: any) => i.id === 'inq-xss');
      expect(inq.notes).not.toContain('<script>');
      expect(inq.notes).toContain('&lt;script&gt;');
    });

    it('PUT /api/admin/inquiries/[id]/status supports 1-click customer profile conversion', async () => {
      const newInq = {
        id: 'inq-book-test',
        customer_id: null,
        customer_name: 'Emily Davis',
        phone: '0434 555 666',
        email: 'emily.d@example.com',
        preferred_language: 'en' as const,
        preferred_date: '2026-11-28',
        preferred_time: '14:00',
        service_requested_id: null,
        services_requested: ['SNS Dipping Powder'],
        notes: 'Mild latex allergy',
        status: 'new' as const,
        source: 'web_form' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockCrmStore.consultations.push(newInq);

      const req = createAdminRequest(
        `http://localhost:3000/api/admin/inquiries/${newInq.id}/status`,
        'PUT',
        { status: 'booked', convert_to_customer: true },
        'manager'
      );
      const res = await putInquiryStatus(req, { params: Promise.resolve({ id: newInq.id }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.inquiry.status).toBe('booked');
      expect(data.inquiry.converted_customer_id).toBeDefined();

      // Verify created customer has extracted allergy note
      const created = mockCrmStore.customers.find((c) => c.id === data.inquiry.converted_customer_id);
      expect(created).toBeDefined();
      expect(created?.phone).toBe('0434 555 666');
      expect(created?.allergies).toContain('latex allergy');
    });
  });

  describe('7. Service Visit Logging & Financial Auto-Reconciliation', () => {
    it('POST /api/admin/visits increments customer totals and auto-reconciles revenue', async () => {
      const cust = mockCrmStore.customers[0];
      const initialVisits = cust.total_visits_count ?? cust.total_visits;
      const initialSpendCents = cust.total_spend_cents ?? Math.round(cust.total_spent_aud * 100);

      const visitPayload = {
        customer_id: cust.id,
        staff_id: 'stf-003',
        visit_date: '2026-11-16T14:30:00Z',
        services_rendered: [{ name: 'SNS Dipping', price_cents: 7500 }],
        total_amount_cents: 7500,
        payment_method: 'EFTPOS',
      };

      const req = createAdminRequest(
        'http://localhost:3000/api/admin/visits',
        'POST',
        visitPayload,
        'manager'
      );
      const res = await postVisit(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.visit_id).toBeDefined();
      expect(data.transaction_id).toBeDefined();

      // Check customer aggregates auto-incremented
      expect(cust.total_visits_count).toBe(initialVisits + 1);
      expect(cust.total_spend_cents).toBe(initialSpendCents + 7500);

      // Check finance auto-reconciliation
      const tx = mockCrmStore.transactions.find((t) => t.id === data.transaction_id);
      expect(tx).toBeDefined();
      expect(tx?.type).toBe('revenue');
      expect(tx?.amount_cents).toBe(7500);
      expect(tx?.customer_id).toBe(cust.id);
      expect(tx?.staff_id).toBe('stf-003');
    });
  });
});
