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
  softDeleteCustomer,
  logVisit,
} from '@/lib/crm/customers';
import { mockCrmStore } from '@/lib/crm/mock-customers';

import { GET as getCustomersRoute, POST as postCustomerRoute } from '@/app/api/admin/customers/route';
import {
  GET as getCustomerByIdRoute,
  PUT as putCustomerRoute,
  DELETE as deleteCustomerRoute,
} from '@/app/api/admin/customers/[id]/route';
import { PUT as putCustomerPreferencesRoute } from '@/app/api/admin/customers/[id]/preferences/route';
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

describe('Challenger 1 Adversarial Suite: CRM Module Robustness & Boundary Verification', () => {
  beforeEach(() => {
    mockCrmStore.reset();
  });

  // =========================================================================
  // 1. Vietnamese Diacritic-Insensitive Matching Across Extreme Strings
  // =========================================================================
  describe('1. Vietnamese Diacritic-Insensitive Matching Across Extreme Strings', () => {
    it('exhaustively normalizes all 12 Vietnamese vowels across all 5 tone marks (lowercase)', () => {
      // 12 base vowels: a, ă, â, e, ê, i, o, ô, ơ, u, ư, y
      // 5 tone marks: huyền ( ` ), sắc ( ´ ), hỏi ( ̉ ), ngã ( ~ ), nặng ( . )
      const vowelTestMatrix: Record<string, string[]> = {
        a: ['à', 'á', 'ả', 'ã', 'ạ', 'ằ', 'ắ', 'ẳ', 'ẵ', 'ặ', 'ầ', 'ấ', 'ẩ', 'ẫ', 'ậ'],
        e: ['è', 'é', 'ẻ', 'ẽ', 'ẹ', 'ề', 'ế', 'ể', 'ễ', 'ệ'],
        i: ['ì', 'í', 'ỉ', 'ĩ', 'ị'],
        o: ['ò', 'ó', 'ỏ', 'õ', 'ọ', 'ồ', 'ố', 'ổ', 'ỗ', 'ộ', 'ờ', 'ớ', 'ở', 'ỡ', 'ợ'],
        u: ['ù', 'ú', 'ủ', 'ũ', 'ụ', 'ừ', 'ứ', 'ử', 'ữ', 'ự'],
        y: ['ỳ', 'ý', 'ỷ', 'ỹ', 'ỵ'],
      };

      for (const [expectedBase, accentedVowels] of Object.entries(vowelTestMatrix)) {
        for (const vowel of accentedVowels) {
          const stripped = removeVietnameseDiacritics(vowel);
          expect(
            stripped,
            `Expected vowel '${vowel}' to normalize to '${expectedBase}', got '${stripped}'`
          ).toBe(expectedBase);
        }
      }
    });

    it('exhaustively normalizes all uppercase Vietnamese accented vowels', () => {
      const uppercaseMatrix: Record<string, string[]> = {
        A: ['À', 'Á', 'Ả', 'Ã', 'Ạ', 'Ằ', 'Ắ', 'Ẳ', 'Ẵ', 'Ặ', 'Ầ', 'Ấ', 'Ẩ', 'Ẫ', 'Ậ'],
        E: ['È', 'É', 'Ẻ', 'Ẽ', 'Ẹ', 'Ề', 'Ế', 'Ể', 'Ễ', 'Ệ'],
        I: ['Ì', 'Í', 'Ỉ', 'Ĩ', 'Ị'],
        O: ['Ò', 'Ó', 'Ỏ', 'Õ', 'Ọ', 'Ồ', 'Ố', 'Ổ', 'Ỗ', 'Ộ', 'Ờ', 'Ớ', 'Ở', 'Ỡ', 'Ợ'],
        U: ['Ù', 'Ú', 'Ủ', 'Ũ', 'Ụ', 'Ừ', 'Ứ', 'Ử', 'Ữ', 'Ự'],
        Y: ['Ỳ', 'Ý', 'Ỷ', 'Ỹ', 'Ỵ'],
      };

      for (const [expectedBase, accentedVowels] of Object.entries(uppercaseMatrix)) {
        for (const vowel of accentedVowels) {
          const stripped = removeVietnameseDiacritics(vowel);
          expect(
            stripped,
            `Expected uppercase vowel '${vowel}' to normalize to '${expectedBase}', got '${stripped}'`
          ).toBe(expectedBase);
        }
      }
    });

    it('correctly maps non-decomposable đ and Đ to d and D', () => {
      expect(removeVietnameseDiacritics('đ')).toBe('d');
      expect(removeVietnameseDiacritics('Đ')).toBe('D');
      expect(removeVietnameseDiacritics('đường')).toBe('duong');
      expect(removeVietnameseDiacritics('ĐÀ NẴNG')).toBe('DA NANG');
      expect(normalizeVietnamese('ĐẶNG ĐỨC')).toBe('dang duc');
    });

    it('handles decomposed Unicode (NFD) and precomposed Unicode (NFC) identically', () => {
      const nfcString = 'Nguyễn Thị Đoan Trang';
      const nfdString = nfcString.normalize('NFD');

      expect(removeVietnameseDiacritics(nfcString)).toBe('Nguyen Thi Doan Trang');
      expect(removeVietnameseDiacritics(nfdString)).toBe('Nguyen Thi Doan Trang');
      expect(normalizeVietnamese(nfcString)).toBe(normalizeVietnamese(nfdString));
    });

    it('matches authentic Vietnamese customer names regardless of diacritics, case, or word order', () => {
      const customer = {
        name: 'Nguyễn Hoàng Hải Đăng',
        phone: '0412 345 678',
        email: 'haidang.nguyen@example.com',
      };

      // Exact diacritic match
      expect(matchesCustomerSearch(customer, 'Nguyễn Hoàng Hải Đăng')).toBe(true);

      // ASCII lowercased
      expect(matchesCustomerSearch(customer, 'nguyen hoang hai dang')).toBe(true);

      // ASCII uppercased
      expect(matchesCustomerSearch(customer, 'HAI DANG')).toBe(true);

      // Partial words out of order
      expect(matchesCustomerSearch(customer, 'Dang Nguyen')).toBe(true);
      expect(matchesCustomerSearch(customer, 'hai nguyen')).toBe(true);

      // Mixed diacritics in query
      expect(matchesCustomerSearch(customer, 'Hải Dang')).toBe(true);
      expect(matchesCustomerSearch(customer, 'Đăng')).toBe(true);
      expect(matchesCustomerSearch(customer, 'Dang')).toBe(true);

      // Non-matching query
      expect(matchesCustomerSearch(customer, 'Bùi Tiến')).toBe(false);
    });

    it('matches Vietnamese names containing punctuation and symbols gracefully', () => {
      const customer = {
        name: 'Lê Đức (Ken) - Phúc',
        phone: '0422 999 888',
      };

      expect(matchesCustomerSearch(customer, 'Le Duc')).toBe(true);
      expect(matchesCustomerSearch(customer, 'Ken')).toBe(true);
      expect(matchesCustomerSearch(customer, 'Phuc')).toBe(true);
      expect(matchesCustomerSearch(customer, 'Lê Đức Phúc')).toBe(true);
    });
  });

  // =========================================================================
  // 2. Australian Phone Normalization Under Varied Formatting
  // =========================================================================
  describe('2. Australian Phone Normalization Under Varied Formatting', () => {
    it('normalizes varied Australian phone formats to standard 10-digit search string (04XX XXX XXX)', () => {
      const validVariations = [
        '+61 412 345 678',
        '0412345678',
        '0412-345-678',
        '(04) 1234 5678',
        '+61412345678',
        '61412345678',
        '+61 4 1234 5678',
        '+61.412.345.678',
        '(0412) 345 678',
        '0412.345.678',
      ];

      for (const phone of validVariations) {
        const normalized = normalizePhoneForSearch(phone);
        expect(
          normalized,
          `Failed normalizing phone format: '${phone}' -> got '${normalized}'`
        ).toBe('0412345678');
      }
    });

    it('matches partial digit queries against formatted phone targets', () => {
      const targetPhone = '0412 345 678';

      // 6-digit partials
      expect(matchesPhoneSearch(targetPhone, '345 678')).toBe(true);
      expect(matchesPhoneSearch(targetPhone, '345678')).toBe(true);
      expect(matchesPhoneSearch(targetPhone, '345-678')).toBe(true);

      // Prefix partials
      expect(matchesPhoneSearch(targetPhone, '0412')).toBe(true);
      expect(matchesPhoneSearch(targetPhone, '+61 412')).toBe(true);
      expect(matchesPhoneSearch(targetPhone, '+61412')).toBe(true);

      // Non-digits stripping
      expect(matchesPhoneSearch(targetPhone, '(0412)')).toBe(true);
    });

    it('rejects short phone queries (< 3 digits) to avoid false-positive broad matching', () => {
      const targetPhone = '0412 345 678';
      expect(matchesPhoneSearch(targetPhone, '04')).toBe(false);
      expect(matchesPhoneSearch(targetPhone, '0')).toBe(false);
      expect(matchesPhoneSearch(targetPhone, '')).toBe(false);
    });

    it('does not match non-matching phone queries', () => {
      const targetPhone = '0412 345 678';
      expect(matchesPhoneSearch(targetPhone, '0499 888 777')).toBe(false);
      expect(matchesPhoneSearch(targetPhone, '999999')).toBe(false);
    });
  });

  // =========================================================================
  // 3. Customer Profile CRUD with Boundary Values & Validation
  // =========================================================================
  describe('3. Customer Profile CRUD with Boundary Values & Validation', () => {
    it('POST /api/admin/customers rejects single-character and empty names with HTTP 400', async () => {
      const boundaryNames = ['', ' ', '   ', 'A', 'X', ' 1 '];

      for (const name of boundaryNames) {
        const req = createAdminRequest('http://localhost:3000/api/admin/customers', 'POST', {
          full_name: name,
          phone: '0412 345 678',
        });
        const res = await postCustomerRoute(req);
        expect(res.status, `Expected 400 for boundary name '${name}'`).toBe(400);
        const data = await res.json();
        expect(data.success).toBe(false);
      }
    });

    it('POST /api/admin/customers accepts valid 2-character names with HTTP 201', async () => {
      const validNames = ['Bo', 'An', 'Vy', 'Li', 'Vũ'];

      for (const name of validNames) {
        const req = createAdminRequest('http://localhost:3000/api/admin/customers', 'POST', {
          full_name: name,
          phone: '0422 111 333',
        });
        const res = await postCustomerRoute(req);
        expect(res.status, `Expected 201 for valid name '${name}'`).toBe(201);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.customer.full_name).toBe(name);
      }
    });

    it('POST /api/admin/customers rejects invalid Australian phone numbers with HTTP 400', async () => {
      const invalidPhones = [
        '02 9876 5432', // Sydney landline
        '03 9876 5432', // Melbourne landline
        '0512 345 678', // Invalid mobile prefix (starts with 05)
        '0412 345 67',  // 9 digits (too short)
        '0412 345 6789',// 11 digits (too long)
        '+1 555 123 4567', // US phone number
        '+84 912 345 678', // Vietnam phone number
        'not-a-phone',
      ];

      for (const phone of invalidPhones) {
        const req = createAdminRequest('http://localhost:3000/api/admin/customers', 'POST', {
          full_name: 'Boundary Test',
          phone,
        });
        const res = await postCustomerRoute(req);
        expect(res.status, `Expected 400 for invalid phone '${phone}'`).toBe(400);
        const data = await res.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('phone');
      }
    });

    it('PUT /api/admin/customers/[id] rejects invalid phone updates with HTTP 400', async () => {
      const cust = mockCrmStore.customers[0];
      const req = createAdminRequest(
        `http://localhost:3000/api/admin/customers/${cust.id}`,
        'PUT',
        { phone: '02 9999 8888' } // Landline
      );
      const res = await putCustomerRoute(req, { params: Promise.resolve({ id: cust.id }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it('PUT /api/admin/customers/[id] returns HTTP 404 for nonexistent customer ID', async () => {
      const req = createAdminRequest(
        'http://localhost:3000/api/admin/customers/nonexistent-id-999',
        'PUT',
        { full_name: 'Ghost' }
      );
      const res = await putCustomerRoute(req, {
        params: Promise.resolve({ id: 'nonexistent-id-999' }),
      });
      expect(res.status).toBe(404);
    });

    it('handles allergy notes with extreme special characters, emojis, and quotes safely', async () => {
      const specialAllergy = `Severe Acetone allergy ⚠️! Prefers organic cuticles 💅. "Quotes" & 'Apostrophes' <script>alert(1)</script>`;
      const cust = mockCrmStore.customers[0];

      const req = createAdminRequest(
        `http://localhost:3000/api/admin/customers/${cust.id}/preferences`,
        'PUT',
        {
          nail_shape: 'Stiletto',
          allergies: specialAllergy,
          notes: 'No mechanical drill; only gentle hand-filing.',
        }
      );
      const res = await putCustomerPreferencesRoute(req, {
        params: Promise.resolve({ id: cust.id }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.customer.allergies).toContain('⚠️');
      expect(data.customer.allergies).toContain('💅');
      expect(data.customer.allergies).toContain('"Quotes"');
    });
  });

  // =========================================================================
  // 4. Service Visit History Logging & Financial Invariants Under Extreme Amounts
  // =========================================================================
  describe('4. Service Visit History Logging & Financial Invariants Under Extreme Amounts', () => {
    it('POST /api/admin/visits rejects missing customer_id with HTTP 400', async () => {
      const req = createAdminRequest('http://localhost:3000/api/admin/visits', 'POST', {
        total_amount_cents: 8000,
      });
      const res = await postVisitRoute(req);
      expect(res.status).toBe(400);
    });

    it('logs minimum currency visit ($0.01 AUD / 1 cent) maintaining exact integer cents', async () => {
      const cust = mockCrmStore.customers[0];
      const initialSpend = cust.total_spend_cents || 0;
      const initialVisits = cust.total_visits_count || 0;

      const req = createAdminRequest('http://localhost:3000/api/admin/visits', 'POST', {
        customer_id: cust.id,
        total_amount_cents: 1, // 1 cent
        payment_method: 'card',
      });
      const res = await postVisitRoute(req);
      expect(res.status).toBe(201);
      const data = await res.json();

      expect(data.visit.total_amount_cents).toBe(1);
      expect(data.visit.total_paid_aud).toBe(0.01);
      expect(data.transaction.amount_cents).toBe(1);

      // Verify customer total incremented exactly
      expect(cust.total_spend_cents).toBe(initialSpend + 1);
      expect(cust.total_visits_count).toBe(initialVisits + 1);
    });

    it('logs extreme high-value visit ($999,999.00 AUD) without numeric overflow', async () => {
      const cust = mockCrmStore.customers[0];
      const initialSpend = cust.total_spend_cents || 0;

      const req = createAdminRequest('http://localhost:3000/api/admin/visits', 'POST', {
        customer_id: cust.id,
        total_amount_cents: 99999900, // $999,999.00 AUD
        payment_method: 'card',
      });
      const res = await postVisitRoute(req);
      expect(res.status).toBe(201);
      const data = await res.json();

      expect(data.visit.total_amount_cents).toBe(99999900);
      expect(data.visit.total_paid_aud).toBe(999999);
      expect(cust.total_spend_cents).toBe(initialSpend + 99999900);
    });

    it('correctly calculates total amount from services rendered and tips', async () => {
      const cust = mockCrmStore.customers[0];
      const services = [
        { name: 'Full Set Acrylic Extensions', price_cents: 8500 },
        { name: 'Gel Art 3D Flowers', price_cents: 3500 },
      ];

      const req = createAdminRequest('http://localhost:3000/api/admin/visits', 'POST', {
        customer_id: cust.id,
        services_rendered: services,
        price_charged_aud: 120.0,
        tip_aud: 15.0,
        total_amount_aud: 135.0,
        payment_method: 'EFTPOS',
      });
      const res = await postVisitRoute(req);
      expect(res.status).toBe(201);
      const data = await res.json();

      expect(data.visit.total_paid_aud).toBe(135.0);
      expect(data.visit.total_amount_cents).toBe(13500);
      expect(data.visit.tip_aud).toBe(15.0);
      expect(data.transaction.amount_cents).toBe(13500);
    });
  });

  // =========================================================================
  // 5. Soft-Delete Behavior, Listing Isolation & Data Retention Invariants
  // =========================================================================
  describe('5. Soft-Delete Behavior, Listing Isolation & Data Retention Invariants', () => {
    it('omits soft-deleted customer from default GET /api/admin/customers', async () => {
      const cust = mockCrmStore.customers[0];
      const custId = cust.id;

      // Soft-delete the customer
      const delReq = createAdminRequest(
        `http://localhost:3000/api/admin/customers/${custId}`,
        'DELETE'
      );
      const delRes = await deleteCustomerRoute(delReq, { params: Promise.resolve({ id: custId }) });
      expect(delRes.status).toBe(200);

      // Default listing should NOT include the deleted customer
      const listReq = createAdminRequest('http://localhost:3000/api/admin/customers');
      const listRes = await getCustomersRoute(listReq);
      expect(listRes.status).toBe(200);
      const listData = await listRes.json();

      const foundInDefault = listData.customers.find((c: any) => c.id === custId);
      expect(foundInDefault).toBeUndefined();
    });

    it('includes soft-deleted customer when include_inactive=true or includeInactive=true is passed', async () => {
      const cust = mockCrmStore.customers[0];
      const custId = cust.id;

      // Soft delete
      await softDeleteCustomer(custId);

      // Query with include_inactive=true
      const req1 = createAdminRequest(
        'http://localhost:3000/api/admin/customers?include_inactive=true'
      );
      const res1 = await getCustomersRoute(req1);
      const data1 = await res1.json();
      const found1 = data1.customers.find((c: any) => c.id === custId);
      expect(found1).toBeDefined();
      expect(found1.is_active).toBe(false);

      // Query with camelCase includeInactive=true
      const req2 = createAdminRequest(
        'http://localhost:3000/api/admin/customers?includeInactive=true'
      );
      const res2 = await getCustomersRoute(req2);
      const data2 = await res2.json();
      const found2 = data2.customers.find((c: any) => c.id === custId);
      expect(found2).toBeDefined();
      expect(found2.is_active).toBe(false);
    });

    it('preserves visit history and revenue transactions when a customer is soft-deleted', async () => {
      const cust = mockCrmStore.customers[0];
      const custId = cust.id;

      // Log a visit first
      const visitRes = await logVisit({
        customer_id: custId,
        total_amount_cents: 8000,
        payment_method: 'card',
      });
      const visitId = visitRes.visit_id;
      const txId = visitRes.transaction_id;

      // Now soft-delete customer
      await softDeleteCustomer(custId);

      // Retrieve customer profile directly by ID
      const directReq = createAdminRequest(`http://localhost:3000/api/admin/customers/${custId}`);
      const directRes = await getCustomerByIdRoute(directReq, {
        params: Promise.resolve({ id: custId }),
      });
      expect(directRes.status).toBe(200);
      const directData = await directRes.json();

      expect(directData.customer.is_active).toBe(false);
      // Visits array must still contain the visit
      const foundVisit = directData.customer.visits.find((v: any) => v.id === visitId);
      expect(foundVisit).toBeDefined();

      // Finance transaction must still exist in mock store
      const foundTx = mockCrmStore.transactions.find((t) => t.id === txId);
      expect(foundTx).toBeDefined();
      expect(foundTx?.customer_id).toBe(custId);
      expect(foundTx?.amount_cents).toBe(8000);
    });

    it('allows restoring a soft-deleted customer back to active status', async () => {
      const cust = mockCrmStore.customers[0];
      const custId = cust.id;

      // Soft delete
      await softDeleteCustomer(custId);

      // Restore via PUT
      const restoreReq = createAdminRequest(
        `http://localhost:3000/api/admin/customers/${custId}`,
        'PUT',
        { is_active: true }
      );
      const restoreRes = await putCustomerRoute(restoreReq, {
        params: Promise.resolve({ id: custId }),
      });
      expect(restoreRes.status).toBe(200);
      const restoreData = await restoreRes.json();
      expect(restoreData.customer.is_active).toBe(true);

      // Verify customer appears in default list again
      const listReq = createAdminRequest('http://localhost:3000/api/admin/customers');
      const listRes = await getCustomersRoute(listReq);
      const listData = await listRes.json();
      const found = listData.customers.find((c: any) => c.id === custId);
      expect(found).toBeDefined();
      expect(found.is_active).toBe(true);
    });
  });
});
