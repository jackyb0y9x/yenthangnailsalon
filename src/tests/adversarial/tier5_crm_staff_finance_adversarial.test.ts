import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// CRM imports
import {
  formatCustomerRecord,
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  updateCustomerPreferences,
  softDeleteCustomer,
  getInquiries,
  getInquiryById,
  updateInquiryStatus,
  logVisit,
  getVisits,
} from '@/lib/crm/customers';
import {
  mockCrmStore,
  MockCustomer,
  MockConsultation,
  MockVisit,
} from '@/lib/crm/mock-customers';

// Staff imports
import {
  mockStaffStore,
  getStaffList,
  getStaffById,
  createStaffMember,
  updateStaffMember,
  updateStaffRole,
  updateStaffSpecializations,
  updateStaffStatus,
  calculateStaffProductivity,
} from '@/lib/staff/staff-data';

// Auth & RBAC imports
import {
  canElevateRole,
  canAccessFinance,
  canMutateCMS,
  canAccessRoute,
  isValidRole,
  normalizeRole,
  USER_ROLES,
} from '@/lib/auth/roles';

// Finance & Tax imports
import {
  calculateGST,
  formatAUD,
  parseAUD,
  dollarsToCents,
  centsToDollars,
} from '@/lib/utils/currency';
import {
  getAustralianFinancialYear,
  getBASQuarter,
  getBASQuartersForFinancialYear,
  getBASDateRange,
  formatDateAEST,
  SYDNEY_TIMEZONE,
} from '@/lib/utils/date';
import {
  calculateFinancialSummary,
  aggregateByCategory,
  filterTransactionsByDateRange,
  TransactionRecord,
} from '@/lib/finance/calculations';
import {
  mockFinanceStore,
  resetFinanceStore,
  getCategories,
  getTransactions,
  createTransaction,
  deleteTransaction,
  syncVisitsFromCrm,
  getFinancialSummaryData,
} from '@/lib/finance/store';

// Vietnamese & Sanitization utils
import {
  removeVietnameseDiacritics,
  normalizeVietnamese,
  normalizePhoneForSearch,
  matchesPhoneSearch,
  matchesCustomerSearch,
  sanitizeXss,
} from '@/lib/utils/vietnamese';
import { isValidAustralianMobile, formatAustralianMobile } from '@/lib/utils/validation';

// Route Handlers for White-Box Security & Validation Testing
import { GET as getCustomersRoute, POST as postCustomerRoute } from '@/app/api/admin/customers/route';
import {
  GET as getCustomerByIdRoute,
  PUT as putCustomerRoute,
  DELETE as deleteCustomerRoute,
} from '@/app/api/admin/customers/[id]/route';
import { PUT as putCustomerPreferencesRoute } from '@/app/api/admin/customers/[id]/preferences/route';
import { GET as getStaffRoute, POST as postStaffRoute } from '@/app/api/admin/staff/route';
import { GET as getStaffByIdRoute, PUT as putStaffRoute } from '@/app/api/admin/staff/[id]/route';
import { PUT as putStaffRoleRoute } from '@/app/api/admin/staff/[id]/role/route';
import { PUT as putStaffStatusRoute } from '@/app/api/admin/staff/[id]/status/route';
import { PUT as putStaffSpecializationsRoute } from '@/app/api/admin/staff/[id]/specializations/route';
import { GET as getStaffProductivityRoute } from '@/app/api/admin/staff/[id]/productivity/route';
import { GET as getInquiriesRoute } from '@/app/api/admin/inquiries/route';
import { GET as getInquiryByIdRoute, PUT as putInquiryRoute } from '@/app/api/admin/inquiries/[id]/route';
import { PUT as putInquiryStatusRoute } from '@/app/api/admin/inquiries/[id]/status/route';
import { GET as getVisitsRoute, POST as postVisitRoute } from '@/app/api/admin/visits/route';
import { GET as getFinanceCategoriesRoute } from '@/app/api/admin/finance/categories/route';
import { GET as getFinanceSummaryRoute } from '@/app/api/admin/finance/summary/route';
import {
  GET as getFinanceTransactionsRoute,
  POST as postFinanceTransactionRoute,
  DELETE as deleteFinanceTransactionRoute,
} from '@/app/api/admin/finance/transactions/route';
import { POST as postSyncVisitsRoute } from '@/app/api/admin/finance/sync-visits/route';

/**
 * Helper to create synthetic NextRequest instances with configurable auth cookies
 */
function createTestRequest(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  authOption?: { role?: string; authenticated?: boolean }
) {
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (authOption?.authenticated === false) {
    headers['Cookie'] = 'sb-authenticated=false';
  } else if (authOption?.role) {
    headers['Cookie'] = `sb-authenticated=true; sb-role=${authOption.role}; sb-email=${authOption.role}@glamournails.com.au`;
  }

  return new NextRequest(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('Tier 5 Adversarial Coverage Hardening: CRM, Staff RBAC & Finance Ledger', () => {
  beforeEach(() => {
    mockCrmStore.reset();
    mockStaffStore.reset();
    resetFinanceStore();
  });

  // =========================================================================
  // DOMAIN 1: CRM & Inquiries Adversarial Testing
  // =========================================================================
  describe('Domain 1: CRM & Inquiries Adversarial Testing', () => {
    describe('1.1 Accent-Insensitive Vietnamese Search & Unicode Normalization', () => {
      it('matches customers across NFC and NFD Unicode representations', () => {
        // Compose "Nguyễn Thị Lan Anh" in NFC (precomposed) vs NFD (decomposed)
        const nfcName = 'Nguyễn Thị Lan Anh';
        const nfdName = nfcName.normalize('NFD');
        expect(nfcName).not.toBe(nfdName); // Ensure they have different byte structures

        const customer = {
          name: nfcName,
          full_name: nfcName,
          phone: '0423 456 789',
          email: 'lananh@example.com',
        };

        // Query in decomposed NFD form
        expect(matchesCustomerSearch(customer, nfdName)).toBe(true);
        // Query in precomposed NFC form
        expect(matchesCustomerSearch(customer, nfcName)).toBe(true);
        // Query in ASCII unaccented form
        expect(matchesCustomerSearch(customer, 'Nguyen Thi Lan Anh')).toBe(true);
      });

      it('correctly handles Vietnamese national consonants đ and Đ', () => {
        const customer = {
          name: 'Đặng Thị Đoan Trang',
          full_name: 'Đặng Thị Đoan Trang',
          phone: '0421 111 222',
          email: 'doantrang@example.com',
        };

        expect(matchesCustomerSearch(customer, 'Dang')).toBe(true);
        expect(matchesCustomerSearch(customer, 'dang')).toBe(true);
        expect(matchesCustomerSearch(customer, 'doan trang')).toBe(true);
        expect(matchesCustomerSearch(customer, 'ĐOAN TRANG')).toBe(true);
        expect(matchesCustomerSearch(customer, 'Trang Dang')).toBe(true); // Token order invariance
      });

      it('handles token order permutations and extraneous whitespace', () => {
        const customer = {
          name: 'Nguyễn Thị Mai Lan',
          full_name: 'Nguyễn Thị Mai Lan',
          phone: '0412 345 678',
        };

        expect(matchesCustomerSearch(customer, '  Mai   Lan  ')).toBe(true);
        expect(matchesCustomerSearch(customer, 'Lan Mai')).toBe(true);
        expect(matchesCustomerSearch(customer, 'Mai Nguyễn')).toBe(true);
        expect(matchesCustomerSearch(customer, 'Thi Lan')).toBe(true);
        expect(matchesCustomerSearch(customer, 'Mai Lan Nonexistent')).toBe(false);
      });

      it('enforces phone search minimum threshold of 3 digits', () => {
        expect(matchesPhoneSearch('0412 345 678', '04')).toBe(false); // < 3 digits
        expect(matchesPhoneSearch('0412 345 678', '041')).toBe(true); // >= 3 digits
        expect(matchesPhoneSearch('0412 345 678', '+61 412')).toBe(true); // AU format
        expect(matchesPhoneSearch('0412 345 678', '345')).toBe(true);
        expect(matchesPhoneSearch('0412 345 678', '999')).toBe(false);
      });

      it('matches phone numbers across international (+61) and domestic (04) variants', () => {
        const customer = {
          name: 'Emily Watson',
          phone: '0412 345 678',
        };

        expect(matchesCustomerSearch(customer, '+61412345678')).toBe(true);
        expect(matchesCustomerSearch(customer, '+61 412 345 678')).toBe(true);
        expect(matchesCustomerSearch(customer, '0412345678')).toBe(true);
        expect(matchesCustomerSearch(customer, '0412 345 678')).toBe(true);
      });
    });

    describe('1.2 Consultation Triage, Auto-Conversion & Duplicate Prevention', () => {
      it('creates new customer record when consultation status transitions to booked', async () => {
        // Create fresh inquiry
        const uniquePhone = '0499 888 777';
        const inq = mockCrmStore.consultations[0];
        inq.phone = uniquePhone;
        inq.customer_name = 'Jessica Miller';
        inq.notes = 'Client mentions severe acrylic sensitivity and allergy to primer';
        inq.status = 'new';
        inq.converted_customer_id = undefined;

        const updated = await updateInquiryStatus(inq.id, {
          status: 'booked',
          convert_to_customer: true,
        });

        expect(updated).not.toBeNull();
        expect(updated?.status).toBe('booked');
        expect(updated?.converted_customer_id).toBeDefined();

        // Customer must now exist in store with allergy notes extracted
        const createdCust = mockCrmStore.customers.find((c) => c.id === updated?.converted_customer_id);
        expect(createdCust).toBeDefined();
        expect(createdCust?.full_name).toBe('Jessica Miller');
        expect(createdCust?.phone).toBe(formatAustralianMobile(uniquePhone));
        expect(createdCust?.allergies_sensitivities).toContain('allergy');
      });

      it('prevents duplicate customer creation when booking an inquiry for existing customer phone', async () => {
        const existingCust = mockCrmStore.customers[0]; // Emily Watson with phone 0412 345 678
        const initialCustomerCount = mockCrmStore.customers.length;

        // Inquiry with matching phone in different formatting (+61 412 345 678)
        const inq = mockCrmStore.consultations[1];
        inq.phone = '+61 412 345 678';
        inq.customer_name = 'Emily Watson Duplicate';
        inq.converted_customer_id = undefined;

        const updated = await updateInquiryStatus(inq.id, {
          status: 'booked',
          convert_to_customer: true,
        });

        expect(updated?.converted_customer_id).toBe(existingCust.id);
        expect(mockCrmStore.customers.length).toBe(initialCustomerCount); // No duplicate added
      });

      it('defaults allergy field to None when inquiry notes do not indicate allergies', async () => {
        const uniquePhone = '0488 123 456';
        const inq = mockCrmStore.consultations[0];
        inq.id = 'inq-test-clean';
        inq.phone = uniquePhone;
        inq.customer_name = 'Claire O-Connor';
        inq.notes = 'Regular French manicure request for wedding';
        inq.converted_customer_id = undefined;

        const updated = await updateInquiryStatus(inq.id, {
          status: 'booked',
        });

        const createdCust = mockCrmStore.customers.find((c) => c.id === updated?.converted_customer_id);
        expect(createdCust).toBeDefined();
        expect(createdCust?.allergies_sensitivities).toBe('None');
      });

      it('sanitizes malicious script and URI vectors in customer notes and allergies (Stored XSS)', async () => {
        const xssPayload = '<script>alert("pwned")</script><img src=x onerror=steal()>javascript:alert(1)';
        const cust = await createCustomer({
          full_name: 'XSS Tester',
          phone: '0411 999 000',
          allergies: xssPayload,
          notes: xssPayload,
        });

        expect(cust.allergies).not.toContain('<script>');
        expect(cust.allergies).toContain('&lt;script&gt;');
        expect(cust.allergies).toContain('blocked-javascript:');
        expect(cust.allergies).not.toContain('blocked-blocked-javascript:');
        expect(sanitizeXss(cust.allergies)).toBe(cust.allergies);
        expect(cust.notes).toContain('&lt;img src=x onerror=steal()&gt;');
      });
    });

    describe('1.3 Soft Deletion and Active Invariance', () => {
      it('soft-deletes customer and respects includeInactive filtering', async () => {
        const cust = mockCrmStore.customers[0];
        const custId = cust.id;

        // Perform soft delete
        const deleteSuccess = await softDeleteCustomer(custId);
        expect(deleteSuccess).toBe(true);

        // Active only query
        const activeCustomers = await getCustomers({ includeInactive: false });
        expect(activeCustomers.customers.some((c) => c.id === custId)).toBe(false);

        // Include inactive query
        const allCustomers = await getCustomers({ includeInactive: true });
        const found = allCustomers.customers.find((c) => c.id === custId);
        expect(found).toBeDefined();
        expect(found?.is_active).toBe(false);

        // Direct fetch by ID still resolves soft-deleted customer for historical records
        const directCust = await getCustomerById(custId);
        expect(directCust).not.toBeNull();
        expect(directCust?.is_active).toBe(false);
      });
    });

    describe('1.4 Customer API Route RBAC and Input Validation', () => {
      it('rejects unauthenticated requests to /api/admin/customers with HTTP 401', async () => {
        const req = createTestRequest('http://localhost:3000/api/admin/customers', 'GET', undefined, {
          authenticated: false,
        });
        const res = await getCustomersRoute(req);
        expect(res.status).toBe(401);
      });

      it('rejects invalid or non-Australian phone formats with HTTP 400', async () => {
        const invalidPhones = ['+1 212 555 1234', '04123', '03 9876 5432', 'phone-number', '0412 345 67X'];

        for (const phone of invalidPhones) {
          const req = createTestRequest(
            'http://localhost:3000/api/admin/customers',
            'POST',
            { full_name: 'Test Customer', phone },
            { role: 'manager' }
          );
          const res = await postCustomerRoute(req);
          expect(res.status).toBe(400);
          const data = await res.json();
          expect(data.success).toBe(false);
        }
      });

      it('rejects missing or short customer names with HTTP 400', async () => {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/customers',
          'POST',
          { full_name: ' ', phone: '0412 345 678' },
          { role: 'manager' }
        );
        const res = await postCustomerRoute(req);
        expect(res.status).toBe(400);
      });
    });

    describe('1.5 Pagination Boundaries, Negative Indexes & Filter Edge Cases', () => {
      it('demonstrates clamped negative page parameter behavior (adversarial hardening: Math.max(1, page))', async () => {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/customers?page=-5&limit=10',
          'GET',
          undefined,
          { role: 'manager' }
        );
        const res = await getCustomersRoute(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        // Hardened: CRM clamps page with Math.max(1, page)
        expect(data.pagination.page).toBe(1);
      });

      it('returns empty array when requested page is out of bounds', async () => {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/customers?page=999&limit=10',
          'GET',
          undefined,
          { role: 'manager' }
        );
        const res = await getCustomersRoute(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.customers).toEqual([]);
        expect(data.pagination.total).toBeGreaterThan(0);
      });

      it('filters customers accurately by nail shape preference', async () => {
        const res = await getCustomers({ shape: 'Coffin' });
        expect(res.customers.length).toBeGreaterThan(0);
        for (const c of res.customers) {
          expect(c.nail_shape_preference).toBe('Coffin');
        }
      });

      it('filters customers by allergy presence (hasAllergy=true vs false)', async () => {
        const withAllergy = await getCustomers({ hasAllergy: true });
        for (const c of withAllergy.customers) {
          expect(c.allergies).toBeTruthy();
          expect(c.allergies?.toLowerCase()).not.toBe('none');
        }

        const withoutAllergy = await getCustomers({ hasAllergy: false });
        for (const c of withoutAllergy.customers) {
          const isNoneOrNull = !c.allergies || c.allergies.toLowerCase() === 'none' || c.allergies.trim() === '';
          expect(isNoneOrNull).toBe(true);
        }
      });
    });

    describe('1.6 Customer Preferences Mutation & Stored XSS Neutralization', () => {
      it('sanitizes XSS payloads submitted to customer preferences PUT route', async () => {
        const custId = mockCrmStore.customers[0].id;
        const maliciousPayload = {
          nail_shape: 'Almond',
          nail_length: 'Medium',
          allergies: '<script>document.cookie</script>',
          notes: '<img src=x onerror=maliciousCall()>Normal notes',
        };

        const req = createTestRequest(
          `http://localhost:3000/api/admin/customers/${custId}/preferences`,
          'PUT',
          maliciousPayload,
          { role: 'manager' }
        );
        const res = await putCustomerPreferencesRoute(req, { params: Promise.resolve({ id: custId }) });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.customer.allergies).not.toContain('<script>');
        expect(data.customer.allergies).toContain('&lt;script&gt;');
        expect(data.customer.notes).not.toContain('<img src=x');
      });

      it('returns HTTP 404 when updating preferences for non-existent customer', async () => {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/customers/cust-nonexistent/preferences',
          'PUT',
          { nail_shape: 'Square' },
          { role: 'manager' }
        );
        const res = await putCustomerPreferencesRoute(req, {
          params: Promise.resolve({ id: 'cust-nonexistent' }),
        });
        expect(res.status).toBe(404);
      });
    });

    describe('1.7 Visit Logging API & Customer Totals Synchronization', () => {
      it('rejects visit logging without customer_id with HTTP 400', async () => {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/visits',
          'POST',
          { total_amount_cents: 8000 },
          { role: 'manager' }
        );
        const res = await postVisitRoute(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('customer_id');
      });

      it('increments customer visit count and spend cents accurately upon visit logging', async () => {
        const cust = mockCrmStore.customers[0];
        const initialVisits = cust.total_visits_count || cust.total_visits || 0;
        const initialSpend = cust.total_spend_cents || 0;

        const req = createTestRequest(
          'http://localhost:3000/api/admin/visits',
          'POST',
          {
            customer_id: cust.id,
            staff_id: 'stf-001',
            total_amount_cents: 9500,
            payment_method: 'Card',
            notes: 'SNS Dip Set',
          },
          { role: 'manager' }
        );
        const res = await postVisitRoute(req);
        expect(res.status).toBe(201);

        const updatedCust = await getCustomerById(cust.id);
        expect(updatedCust?.total_visits_count).toBe(initialVisits + 1);
        expect(updatedCust?.total_spend_cents).toBe(initialSpend + 9500);
      });
    });

    describe('1.8 Consultation Inquiry State Lifecycle Transitions', () => {
      it('allows complete transition sequence: new -> contacted -> booked -> completed', async () => {
        const inq = mockCrmStore.consultations[0];
        const states: Array<'contacted' | 'booked' | 'completed'> = ['contacted', 'booked', 'completed'];

        for (const st of states) {
          const req = createTestRequest(
            `http://localhost:3000/api/admin/inquiries/${inq.id}/status`,
            'PUT',
            { status: st },
            { role: 'manager' }
          );
          const res = await putInquiryStatusRoute(req, { params: Promise.resolve({ id: inq.id }) });
          expect(res.status).toBe(200);
          const data = await res.json();
          expect(data.inquiry.status).toBe(st);
        }
      });

      it('returns HTTP 404 when updating non-existent inquiry status', async () => {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/inquiries/inq-missing-999/status',
          'PUT',
          { status: 'contacted' },
          { role: 'manager' }
        );
        const res = await putInquiryStatusRoute(req, {
          params: Promise.resolve({ id: 'inq-missing-999' }),
        });
        expect(res.status).toBe(404);
      });
    });
  });

  // =========================================================================
  // DOMAIN 2: Staff Management & Role-Based Access Control (RBAC)
  // =========================================================================
  describe('Domain 2: Staff Management & Role-Based Access Control (RBAC)', () => {
    describe('2.1 Role Evaluation & Privilege Escalation Invariants', () => {
      it('strictly validates recognized user roles', () => {
        expect(isValidRole('super_admin')).toBe(true);
        expect(isValidRole('manager')).toBe(true);
        expect(isValidRole('staff')).toBe(true);
        expect(isValidRole('SUPER_ADMIN')).toBe(true); // Case-insensitive
        expect(isValidRole(' manager ')).toBe(true);

        expect(isValidRole('admin')).toBe(false);
        expect(isValidRole('owner')).toBe(false);
        expect(isValidRole('root')).toBe(false);
        expect(isValidRole('')).toBe(false);
        expect(isValidRole(null)).toBe(false);
        expect(isValidRole(undefined)).toBe(false);
      });

      it('super_admin can assign all operational and administrative roles', () => {
        expect(canElevateRole('super_admin', 'super_admin')).toBe(true);
        expect(canElevateRole('super_admin', 'manager')).toBe(true);
        expect(canElevateRole('super_admin', 'staff')).toBe(true);
      });

      it('manager CANNOT elevate self or anyone to super_admin (T2-BVA-33 Invariant)', () => {
        expect(canElevateRole('manager', 'super_admin')).toBe(false);
        expect(canElevateRole('manager', 'manager')).toBe(true);
        expect(canElevateRole('manager', 'staff')).toBe(true);
      });

      it('staff has zero role elevation or assignment privilege', () => {
        expect(canElevateRole('staff', 'super_admin')).toBe(false);
        expect(canElevateRole('staff', 'manager')).toBe(false);
        expect(canElevateRole('staff', 'staff')).toBe(false);
      });

      it('invalid or unauthenticated actors cannot elevate roles', () => {
        expect(canElevateRole(undefined, 'staff')).toBe(false);
        expect(canElevateRole(null, 'staff')).toBe(false);
        expect(canElevateRole('intruder', 'staff')).toBe(false);
        expect(canElevateRole('manager', 'invalid_role')).toBe(false);
      });
    });

    describe('2.2 Staff API Route Security Enforcement', () => {
      it('blocks unauthenticated requests to staff routes with HTTP 401', async () => {
        const req = createTestRequest('http://localhost:3000/api/admin/staff', 'GET', undefined, {
          authenticated: false,
        });
        const res = await getStaffRoute(req);
        expect(res.status).toBe(401);
      });

      it('forbids staff role from creating new staff members with HTTP 403', async () => {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/staff',
          'POST',
          { full_name: 'New Junior Tech', phone: '0411 222 333', role: 'staff' },
          { role: 'staff' }
        );
        const res = await postStaffRoute(req);
        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error).toContain('Forbidden');
      });

      it('allows manager and super_admin to create staff members with HTTP 201', async () => {
        const reqManager = createTestRequest(
          'http://localhost:3000/api/admin/staff',
          'POST',
          { full_name: 'Tech By Manager', phone: '0411 222 444', role: 'staff' },
          { role: 'manager' }
        );
        const resManager = await postStaffRoute(reqManager);
        expect(resManager.status).toBe(201);

        const reqSuper = createTestRequest(
          'http://localhost:3000/api/admin/staff',
          'POST',
          { full_name: 'Tech By Super', phone: '0411 222 555', role: 'staff' },
          { role: 'super_admin' }
        );
        const resSuper = await postStaffRoute(reqSuper);
        expect(resSuper.status).toBe(201);
      });

      it('forbids manager from elevating target staff to super_admin (HTTP 403)', async () => {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/staff/stf-003/role',
          'PUT',
          { role: 'super_admin' },
          { role: 'manager' }
        );
        const res = await putStaffRoleRoute(req, { params: Promise.resolve({ id: 'stf-003' }) });
        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error).toContain('Forbidden');
      });

      it('allows super_admin to elevate target staff to super_admin (HTTP 200)', async () => {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/staff/stf-003/role',
          'PUT',
          { role: 'super_admin' },
          { role: 'super_admin' }
        );
        const res = await putStaffRoleRoute(req, { params: Promise.resolve({ id: 'stf-003' }) });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.staff.role).toBe('super_admin');
      });

      it('rejects invalid role parameters with HTTP 400', async () => {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/staff/stf-003/role',
          'PUT',
          { role: 'supreme_commander' },
          { role: 'super_admin' }
        );
        const res = await putStaffRoleRoute(req, { params: Promise.resolve({ id: 'stf-003' }) });
        expect(res.status).toBe(400);
      });

      it('forbids staff role from modifying staff status or specializations (HTTP 403)', async () => {
        const reqStatus = createTestRequest(
          'http://localhost:3000/api/admin/staff/stf-003/status',
          'PUT',
          { is_active: false },
          { role: 'staff' }
        );
        const resStatus = await putStaffStatusRoute(reqStatus, { params: Promise.resolve({ id: 'stf-003' }) });
        expect(resStatus.status).toBe(403);

        const reqSpecs = createTestRequest(
          'http://localhost:3000/api/admin/staff/stf-003/specializations',
          'PUT',
          { specializations: ['Russian Manicure'] },
          { role: 'staff' }
        );
        const resSpecs = await putStaffSpecializationsRoute(reqSpecs, { params: Promise.resolve({ id: 'stf-003' }) });
        expect(resSpecs.status).toBe(403);
      });
    });

    describe('2.3 Staff Productivity Metrics Robustness', () => {
      it('calculates productivity with 0 visits without division-by-zero or NaN', async () => {
        const metrics = await calculateStaffProductivity('stf-nonexistent-999');
        expect(metrics.completed_visits).toBe(0);
        expect(metrics.total_revenue_cents).toBe(0);
        expect(metrics.total_revenue_aud).toBe(0);
        expect(metrics.average_ticket_aud).toBe(0);
        expect(isNaN(metrics.average_ticket_aud)).toBe(false);
      });

      it('correctly aggregates multiple visits and calculates exact average ticket', async () => {
        const staffId = 'stf-001';
        mockCrmStore.visits = [
          {
            id: 'v1',
            customer_id: 'c1',
            staff_id: staffId,
            service_id: null,
            visit_date: '2026-11-01',
            services_rendered: [],
            price_charged_aud: 80.0,
            tip_aud: 10.0,
            total_paid_aud: 90.0,
            total_amount_cents: 9000,
            payment_method: 'card',
            notes: null,
            rating: 5,
            photo_urls: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'v2',
            customer_id: 'c2',
            staff_id: staffId,
            service_id: null,
            visit_date: '2026-11-02',
            services_rendered: [],
            price_charged_aud: 60.0,
            tip_aud: 0,
            total_paid_aud: 60.0,
            total_amount_cents: 6000,
            payment_method: 'cash',
            notes: null,
            rating: 5,
            photo_urls: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];

        const metrics = await calculateStaffProductivity(staffId);
        expect(metrics.completed_visits).toBe(2);
        expect(metrics.total_revenue_cents).toBe(15000);
        expect(metrics.total_revenue_aud).toBe(150.0);
        expect(metrics.average_ticket_aud).toBe(75.0);
      });
    });

    describe('2.4 Staff Search across Diacritics, Specializations & Inactive Filter', () => {
      it('searches staff by specialization keywords (e.g. Russian Manicure, SNS Dip)', async () => {
        const russianTechs = await getStaffList({ search: 'Russian Manicure' });
        expect(russianTechs.length).toBeGreaterThan(0);
        for (const t of russianTechs) {
          expect(t.specializations).toContain('Russian Manicure');
        }
      });

      it('searches staff with Vietnamese diacritic insensitivity', async () => {
        const results = await getStaffList({ search: 'nguyen' });
        expect(results.length).toBeGreaterThan(0);
        for (const s of results) {
          expect(s.full_name.toLowerCase()).toContain('nguyen');
        }
      });

      it('filters inactive staff when activeOnly is true', async () => {
        const staff = mockStaffStore.staff[0];
        await updateStaffStatus(staff.id, false);

        const activeStaff = await getStaffList({ activeOnly: true });
        expect(activeStaff.some((s) => s.id === staff.id)).toBe(false);

        const allStaff = await getStaffList({ activeOnly: false });
        expect(allStaff.some((s) => s.id === staff.id)).toBe(true);
      });
    });

    describe('2.5 Staff API Route Error Paths and 404 Boundaries', () => {
      it('returns HTTP 404 when querying non-existent staff by ID', async () => {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/staff/stf-ghost-999',
          'GET',
          undefined,
          { role: 'manager' }
        );
        const res = await getStaffByIdRoute(req, { params: Promise.resolve({ id: 'stf-ghost-999' }) });
        expect(res.status).toBe(404);
      });

      it('returns HTTP 404 when querying productivity for non-existent staff', async () => {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/staff/stf-ghost-999/productivity',
          'GET',
          undefined,
          { role: 'manager' }
        );
        const res = await getStaffProductivityRoute(req, { params: Promise.resolve({ id: 'stf-ghost-999' }) });
        expect(res.status).toBe(404);
      });

      it('returns HTTP 400 when updating status with non-boolean payload', async () => {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/staff/stf-001/status',
          'PUT',
          { is_active: 'not-a-boolean' },
          { role: 'manager' }
        );
        const res = await putStaffStatusRoute(req, { params: Promise.resolve({ id: 'stf-001' }) });
        expect(res.status).toBe(400);
      });
    });
  });

  // =========================================================================
  // DOMAIN 3: Financial Tracking & Australian Tax Compliance
  // =========================================================================
  describe('Domain 3: Financial Tracking & Australian Tax Compliance', () => {
    describe('3.1 ATO 1/11th GST Invariant & Round-Trip Stress', () => {
      it('strictly satisfies netCents + gstCents === grossCents invariant across critical edge amounts', () => {
        const edgeAmounts = [
          0,
          1,      // 1 cent
          2,
          5,
          10,     // 10 cents
          11,     // Exactly 11 cents (net=10, gst=1)
          12,
          99,
          100,    // $1.00
          550,    // $5.50
          1100,   // $11.00 (net=1000, gst=100)
          6500,   // $65.00
          9500,   // $95.00
          99999,  // $999.99
          1000000,// $10,000.00
        ];

        for (const gross of edgeAmounts) {
          const breakdown = calculateGST(gross);
          expect(breakdown.grossCents).toBe(gross);
          expect(breakdown.netCents + breakdown.gstCents).toBe(gross);
        }
      });

      it('handles negative refund amounts preserving signs and balancing invariants', () => {
        const negativeAmounts = [-11, -100, -1100, -6500, -9500];

        for (const gross of negativeAmounts) {
          const breakdown = calculateGST(gross);
          expect(breakdown.grossCents).toBe(gross);
          expect(breakdown.netCents).toBeLessThanOrEqual(0);
          expect(breakdown.gstCents).toBeLessThanOrEqual(0);
          expect(breakdown.netCents + breakdown.gstCents).toBe(gross);
        }
      });

      it('verifies round-trip integrity: parseAUD(formatAUD(cents)) === cents', () => {
        const sampleCents = [0, 50, 100, 1250, 6500, 9500, 15000, 320000];
        for (const c of sampleCents) {
          const formatted = formatAUD(c);
          const parsed = parseAUD(formatted);
          expect(parsed).toBe(c);
        }
      });
    });

    describe('3.2 Financial Summary Calculations & Edge Cases', () => {
      it('calculates summary for empty transactions without NaN or division by zero', () => {
        const summary = calculateFinancialSummary([]);
        expect(summary.totalRevenueCents).toBe(0);
        expect(summary.totalExpenseCents).toBe(0);
        expect(summary.netProfitCents).toBe(0);
        expect(summary.profitMarginPercent).toBe(0);
        expect(summary.gstCollectedCents).toBe(0);
        expect(summary.gstPaidCents).toBe(0);
        expect(summary.netGstPayableCents).toBe(0);
      });

      it('calculates 100% margin when revenue > 0 and expenses === 0', () => {
        const transactions: TransactionRecord[] = [
          {
            id: 't1',
            transactionDate: '2026-11-01',
            type: 'revenue',
            categoryId: 'cat-1',
            amountCents: 10000,
            paymentMethod: 'card',
            description: 'Pure revenue',
          },
        ];

        const summary = calculateFinancialSummary(transactions);
        expect(summary.totalRevenueCents).toBe(10000);
        expect(summary.totalExpenseCents).toBe(0);
        expect(summary.netProfitCents).toBe(10000);
        expect(summary.profitMarginPercent).toBe(100.0);
      });

      it('calculates 0% margin when revenue === 0 and expenses > 0', () => {
        const transactions: TransactionRecord[] = [
          {
            id: 't1',
            transactionDate: '2026-11-01',
            type: 'expense',
            categoryId: 'cat-2',
            amountCents: 50000,
            paymentMethod: 'bank_transfer',
            description: 'Premises Rent',
          },
        ];

        const summary = calculateFinancialSummary(transactions);
        expect(summary.totalRevenueCents).toBe(0);
        expect(summary.totalExpenseCents).toBe(50000);
        expect(summary.netProfitCents).toBe(-50000);
        expect(summary.profitMarginPercent).toBe(0);
      });

      it('groups categories and ensures percentage shares calculate cleanly', () => {
        const transactions: TransactionRecord[] = [
          {
            id: 't1',
            transactionDate: '2026-11-01',
            type: 'revenue',
            categoryId: 'c1',
            categoryName: 'Services',
            amountCents: 6000,
            paymentMethod: 'card',
            description: 'Set 1',
          },
          {
            id: 't2',
            transactionDate: '2026-11-02',
            type: 'revenue',
            categoryId: 'c2',
            categoryName: 'Retail',
            amountCents: 4000,
            paymentMethod: 'cash',
            description: 'Oil',
          },
        ];

        const breakdown = aggregateByCategory(transactions, 'revenue');
        expect(breakdown.length).toBe(2);
        expect(breakdown[0].categoryName).toBe('Services');
        expect(breakdown[0].percentageOfTotal).toBe(60.0);
        expect(breakdown[1].categoryName).toBe('Retail');
        expect(breakdown[1].percentageOfTotal).toBe(40.0);
      });
    });

    describe('3.3 Australian Financial Year & BAS Calendar Boundaries', () => {
      it('correctly maps dates across the 30 June / 1 July Financial Year rollover', () => {
        // 2026-06-30 is FY2025-26
        const fyOld = getAustralianFinancialYear('2026-06-30');
        expect(fyOld.startYear).toBe(2025);
        expect(fyOld.endYear).toBe(2026);
        expect(fyOld.label).toBe('FY2025-26');
        expect(fyOld.startDate).toBe('2025-07-01');
        expect(fyOld.endDate).toBe('2026-06-30');

        // 2026-07-01 is FY2026-27
        const fyNew = getAustralianFinancialYear('2026-07-01');
        expect(fyNew.startYear).toBe(2026);
        expect(fyNew.endYear).toBe(2027);
        expect(fyNew.label).toBe('FY2026-27');
        expect(fyNew.startDate).toBe('2026-07-01');
        expect(fyNew.endDate).toBe('2027-06-30');
      });

      it('accurately resolves leap year February 29 dates in Australian FY and BAS Q3', () => {
        // 2028 is a leap year (2028-02-29)
        const leapDate = '2028-02-29';
        const fyLeap = getAustralianFinancialYear(leapDate);
        expect(fyLeap.label).toBe('FY2027-28');

        const basQ3 = getBASQuarter(leapDate);
        expect(basQ3.quarter).toBe('Q3');
        expect(basQ3.startDate).toBe('2028-01-01');
        expect(basQ3.endDate).toBe('2028-03-31');

        // Verify quarters for FY2027-28
        const quarters = getBASQuartersForFinancialYear(2027);
        expect(quarters[2].quarter).toBe('Q3');
        expect(quarters[2].startDate).toBe('2028-01-01');
        expect(quarters[2].endDate).toBe('2028-03-31');
      });

      it('returns correct closed ranges for all 4 BAS quarters under getBASDateRange', () => {
        const q1 = getBASDateRange(2026, 'Q1');
        expect(q1.startDate).toBe('2026-07-01');
        expect(q1.endDate).toBe('2026-09-30');

        const q2 = getBASDateRange(2026, 'Q2');
        expect(q2.startDate).toBe('2026-10-01');
        expect(q2.endDate).toBe('2026-12-31');

        const q3 = getBASDateRange(2026, 'Q3');
        expect(q3.startDate).toBe('2027-01-01');
        expect(q3.endDate).toBe('2027-03-31');

        const q4 = getBASDateRange(2026, 'Q4');
        expect(q4.startDate).toBe('2027-04-01');
        expect(q4.endDate).toBe('2027-06-30');

        const all = getBASDateRange(2026, 'ALL');
        expect(all.startDate).toBe('2026-07-01');
        expect(all.endDate).toBe('2027-06-30');
      });

      it('throws descriptive error on invalid quarter input to getBASDateRange', () => {
        expect(() => getBASDateRange(2026, 'Q5' as any)).toThrowError(/Invalid quarter/);
      });
    });

    describe('3.4 CRM Visit to Revenue Auto-Sync Concurrency & Race Conditions', () => {
      it('executes concurrent syncVisitsFromCrm calls coalescing into a singleflight execution', async () => {
        // Setup 20 new un-reconciled visits in mockCrmStore.visits
        mockCrmStore.visits = [];
        mockFinanceStore.transactions = [];
        mockCrmStore.transactions = [];

        for (let i = 1; i <= 20; i++) {
          mockCrmStore.visits.push({
            id: `visit-concurrent-${i}`,
            customer_id: `cust-${i}`,
            staff_id: 'stf-001',
            service_id: null,
            visit_date: '2026-11-05',
            services_rendered: [],
            price_charged_aud: 75.0,
            tip_aud: 5.0,
            total_paid_aud: 80.0,
            total_amount_cents: 8000,
            payment_method: 'card',
            notes: `Concurrent test visit ${i}`,
            rating: 5,
            photo_urls: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }

        // Fire 10 simultaneous sync invocations
        const results = await Promise.all([
          syncVisitsFromCrm(),
          syncVisitsFromCrm(),
          syncVisitsFromCrm(),
          syncVisitsFromCrm(),
          syncVisitsFromCrm(),
          syncVisitsFromCrm(),
          syncVisitsFromCrm(),
          syncVisitsFromCrm(),
          syncVisitsFromCrm(),
          syncVisitsFromCrm(),
        ]);

        // Verify total transactions in store equals exactly 20 (zero duplicates)
        const refIds = mockFinanceStore.transactions
          .map((t) => t.reference_id)
          .filter(Boolean);
        const uniqueRefIds = new Set(refIds);

        expect(uniqueRefIds.size).toBe(20);
        expect(mockFinanceStore.transactions.length).toBe(20);

        // A subsequent sync must skip all 20 visits
        const subsequent = await syncVisitsFromCrm();
        expect(subsequent.syncedCount).toBe(0);
        expect(subsequent.skippedCount).toBe(20);
      });

      it('skips zero-amount or negative visits without creating fraudulent financial records', async () => {
        mockCrmStore.visits = [
          {
            id: 'visit-zero-cents',
            customer_id: 'cust-1',
            staff_id: 'stf-001',
            service_id: null,
            visit_date: '2026-11-05',
            services_rendered: [],
            price_charged_aud: 0,
            tip_aud: 0,
            total_paid_aud: 0,
            total_amount_cents: 0,
            payment_method: 'cash',
            notes: 'Free courtesy touch-up',
            rating: 5,
            photo_urls: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];

        mockFinanceStore.transactions = [];
        mockCrmStore.transactions = [];

        const result = await syncVisitsFromCrm();
        expect(result.syncedCount).toBe(0);
        expect(result.skippedCount).toBe(1);
        expect(mockFinanceStore.transactions.length).toBe(0);
      });

      it('prevents duplication when a visit was already reconciled via logVisit()', async () => {
        // When a visit is logged directly via logVisit, it already creates a finance transaction
        const logResult = await logVisit({
          customer_id: '80000000-0000-0000-0000-000000000001',
          staff_id: 'stf-001',
          total_amount_cents: 8500,
          payment_method: 'EFTPOS',
          notes: 'SNS Full Set with French Tips',
        });

        expect(logResult.success).toBe(true);
        const visitId = logResult.visit_id;

        // Verify that syncVisitsFromCrm detects this visit as already reconciled
        const syncResult = await syncVisitsFromCrm();
        expect(syncResult.skippedCount).toBeGreaterThanOrEqual(1);

        // Verify no duplicate transactions exist for this visitId
        const matchingTxs = mockFinanceStore.transactions.filter(
          (t) => t.reference_id === visitId
        );
        expect(matchingTxs.length).toBe(1);
      });
    });

    describe('3.5 Finance Route RBAC Enforcement & Privilege Boundaries', () => {
      it('blocks unauthenticated access to /api/admin/finance/* with HTTP 401', async () => {
        const routes = [
          { fn: getFinanceCategoriesRoute, url: 'http://localhost:3000/api/admin/finance/categories' },
          { fn: getFinanceSummaryRoute, url: 'http://localhost:3000/api/admin/finance/summary' },
          { fn: getFinanceTransactionsRoute, url: 'http://localhost:3000/api/admin/finance/transactions' },
          { fn: postSyncVisitsRoute, url: 'http://localhost:3000/api/admin/finance/sync-visits' },
        ];

        for (const r of routes) {
          const req = createTestRequest(r.url, 'GET', undefined, { authenticated: false });
          const res = await r.fn(req);
          expect(res.status).toBe(401);
        }
      });

      it('forbids staff role from viewing or mutating financial records (HTTP 403 Forbidden)', async () => {
        const routes = [
          { fn: getFinanceCategoriesRoute, url: 'http://localhost:3000/api/admin/finance/categories' },
          { fn: getFinanceSummaryRoute, url: 'http://localhost:3000/api/admin/finance/summary' },
          { fn: getFinanceTransactionsRoute, url: 'http://localhost:3000/api/admin/finance/transactions' },
          { fn: postSyncVisitsRoute, url: 'http://localhost:3000/api/admin/finance/sync-visits' },
        ];

        for (const r of routes) {
          const req = createTestRequest(r.url, 'GET', undefined, { role: 'staff' });
          const res = await r.fn(req);
          expect(res.status).toBe(403);
          const data = await res.json();
          expect(data.error).toContain('Forbidden');
        }
      });

      it('allows manager and super_admin full access to financial endpoints (HTTP 200/201)', async () => {
        // Manager accessing summary
        const reqSummary = createTestRequest(
          'http://localhost:3000/api/admin/finance/summary?period=current_fy',
          'GET',
          undefined,
          { role: 'manager' }
        );
        const resSummary = await getFinanceSummaryRoute(reqSummary);
        expect(resSummary.status).toBe(200);
        const summaryData = await resSummary.json();
        expect(summaryData.success).toBe(true);

        // Super Admin creating transaction
        const reqCreateTx = createTestRequest(
          'http://localhost:3000/api/admin/finance/transactions',
          'POST',
          {
            type: 'revenue',
            categoryId: 'b0000000-0000-0000-0000-000000000001',
            amountCents: 12000,
            paymentMethod: 'card',
            description: 'Direct POS sale by super_admin',
          },
          { role: 'super_admin' }
        );
        const resCreateTx = await postFinanceTransactionRoute(reqCreateTx);
        expect(resCreateTx.status).toBe(201);
        const txData = await resCreateTx.json();
        expect(txData.success).toBe(true);
        expect(txData.transaction.amount_cents).toBe(12000);
      });
    });

    describe('3.6 Transaction Deletion & Idempotency', () => {
      it('rejects deletion when transaction id is missing with HTTP 400', async () => {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/finance/transactions',
          'DELETE',
          undefined,
          { role: 'manager' }
        );
        const res = await deleteFinanceTransactionRoute(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('Transaction ID required');
      });

      it('returns HTTP 404 when deleting non-existent transaction', async () => {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/finance/transactions?id=tx-ghost-999',
          'DELETE',
          undefined,
          { role: 'manager' }
        );
        const res = await deleteFinanceTransactionRoute(req);
        expect(res.status).toBe(404);
      });

      it('forbids staff from deleting transactions (HTTP 403 Forbidden)', async () => {
        const tx = mockFinanceStore.transactions[0];
        const req = createTestRequest(
          `http://localhost:3000/api/admin/finance/transactions?id=${tx.id}`,
          'DELETE',
          undefined,
          { role: 'staff' }
        );
        const res = await deleteFinanceTransactionRoute(req);
        expect(res.status).toBe(403);
      });

      it('allows manager to delete transaction purging from both finance and crm store', async () => {
        const tx = mockFinanceStore.transactions[0];
        const txId = tx.id;

        const req = createTestRequest(
          `http://localhost:3000/api/admin/finance/transactions?id=${txId}`,
          'DELETE',
          undefined,
          { role: 'manager' }
        );
        const res = await deleteFinanceTransactionRoute(req);
        expect(res.status).toBe(200);

        // Verify transaction is purged from store
        expect(mockFinanceStore.transactions.some((t) => t.id === txId)).toBe(false);
        expect(mockCrmStore.transactions.some((t) => t.id === txId)).toBe(false);
      });
    });

    describe('3.7 Transaction Creation Validation & Schema Guard', () => {
      it('rejects missing or invalid transaction payload with HTTP 400', async () => {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/finance/transactions',
          'POST',
          {
            type: 'invalid_type',
            amountCents: -500, // Negative not permitted via direct schema
          },
          { role: 'manager' }
        );
        const res = await postFinanceTransactionRoute(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.success).toBe(false);
      });

      it('supports snake_case and camelCase property mapping in transaction payload', async () => {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/finance/transactions',
          'POST',
          {
            type: 'expense',
            category_id: 'b0000000-0000-0000-0000-000000000006',
            amount_cents: 3500,
            payment_method: 'card',
            description: 'Nail files restock',
            is_tax_deductible: true,
          },
          { role: 'manager' }
        );
        const res = await postFinanceTransactionRoute(req);
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.transaction.amount_cents).toBe(3500);
        expect(data.transaction.is_tax_deductible).toBe(true);
      });
    });

    describe('3.8 Multi-Year Australian Tax Calendar (2020-2030) Continuity', () => {
      it('guarantees seamless Australian Financial Year and 4 BAS quarters across 10 years without gaps', () => {
        for (let year = 2020; year <= 2030; year++) {
          const quarters = getBASQuartersForFinancialYear(year);
          expect(quarters.length).toBe(4);

          // Q1: 1 July to 30 Sep
          expect(quarters[0].startDate).toBe(`${year}-07-01`);
          expect(quarters[0].endDate).toBe(`${year}-09-30`);

          // Q2: 1 Oct to 31 Dec
          expect(quarters[1].startDate).toBe(`${year}-10-01`);
          expect(quarters[1].endDate).toBe(`${year}-12-31`);

          // Q3: 1 Jan to 31 Mar (following calendar year)
          expect(quarters[2].startDate).toBe(`${year + 1}-01-01`);
          expect(quarters[2].endDate).toBe(`${year + 1}-03-31`);

          // Q4: 1 Apr to 30 Jun (following calendar year)
          expect(quarters[3].startDate).toBe(`${year + 1}-04-01`);
          expect(quarters[3].endDate).toBe(`${year + 1}-06-30`);

          // Check full year range
          const fullYear = getBASDateRange(year, 'ALL');
          expect(fullYear.startDate).toBe(`${year}-07-01`);
          expect(fullYear.endDate).toBe(`${year + 1}-06-30`);
        }
      });
    });

    describe('3.9 High Concurrency Transaction Creation Stress Harness', () => {
      it('safely handles 25 rapid concurrent transaction creations without store corruption', async () => {
        const createPromises = [];
        for (let i = 1; i <= 25; i++) {
          const req = createTestRequest(
            'http://localhost:3000/api/admin/finance/transactions',
            'POST',
            {
              type: 'revenue',
              categoryId: 'b0000000-0000-0000-0000-000000000001',
              amountCents: 1000 * i,
              paymentMethod: 'card',
              description: `Concurrent POS transaction ${i}`,
            },
            { role: 'manager' }
          );
          createPromises.push(postFinanceTransactionRoute(req));
        }

        const responses = await Promise.all(createPromises);
        for (const res of responses) {
          expect(res.status).toBe(201);
        }

        // Verify summary calculation over all transactions
        const summaryData = await getFinancialSummaryData();
        expect(summaryData.summary.transactionCount).toBeGreaterThanOrEqual(25);
        expect(summaryData.summary.totalRevenueCents).toBeGreaterThan(0);
        expect(isNaN(summaryData.summary.profitMarginPercent)).toBe(false);
      });
    });
  });
});
