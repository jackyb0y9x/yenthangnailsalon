/**
/**
 * Milestone 4 Adversarial Challenger 2 Verification Suite
 * Focus Areas:
 * 1. Operational RBAC boundaries and privilege escalation prevention
 * 2. Consultation Inquiry status transition workflows & 1-click conversion idempotency
 * 3. Staff Productivity calculation robustness (zero-state, multi-visit, deactivation retention)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { mockCrmStore, MockCustomer, MockConsultation } from '@/lib/crm/mock-customers';
import {
  getInquiries,
  getInquiryById,
  updateInquiryStatus,
  createCustomer,
  getCustomerById,
  logVisit,
} from '@/lib/crm/customers';
import {
  mockStaffStore,
  calculateStaffProductivity,
  getStaffList,
  getStaffById,
  createStaffMember,
  updateStaffRole,
  updateStaffStatus,
  INITIAL_STAFF_MEMBERS,
} from '@/lib/staff/staff-data';
import {
  canElevateRole,
  canAccessRoute,
  canAccessFinance,
  canMutateCMS,
  isValidRole,
  normalizeRole,
  USER_ROLES,
} from '@/lib/auth/roles';

// API Route Handlers under test
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
import { GET as getCustomersRoute } from '@/app/api/admin/customers/route';

/**
 * Creates a NextRequest with explicit simulated session cookies
 */
function createTestRequest(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  options?: {
    role?: 'super_admin' | 'manager' | 'staff' | string;
    authenticated?: boolean;
    cookieOverride?: string;
  }
) {
  const headers: Record<string, string> = {};

  if (options?.cookieOverride !== undefined) {
    headers['Cookie'] = options.cookieOverride;
  } else if (options?.authenticated === false) {
    headers['Cookie'] = 'sb-authenticated=false';
  } else if (options?.role) {
    headers['Cookie'] = `sb-authenticated=true; sb-role=${options.role}; sb-email=${options.role}@glamournails.com.au`;
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

describe('Challenger 2 Empirical Stress Test: Milestone 4 RBAC, Inquiries & Productivity', () => {
  beforeEach(() => {
    mockCrmStore.reset();
    mockStaffStore.reset();
  });

  // ==========================================================================
  // Area 1: Operational RBAC boundaries and privilege escalation prevention
  // ==========================================================================
  describe('Area 1: Operational RBAC Boundaries & Privilege Escalation Prevention', () => {
    const unauthenticatedOptions: Array<{ label: string; opts: any }> = [
      { label: 'missing Cookie header completely', opts: {} },
      { label: 'explicit sb-authenticated=false', opts: { authenticated: false } },
      { label: 'invalid/forged token cookie', opts: { cookieOverride: 'sb-access-token=bad.token.signature' } },
      { label: 'empty cookie header', opts: { cookieOverride: '' } },
    ];

    it('1.1.1: unauthenticated requests to GET /api/admin/staff return HTTP 401', async () => {
      for (const { label, opts } of unauthenticatedOptions) {
        const req = createTestRequest('http://localhost:3000/api/admin/staff', 'GET', undefined, opts);
        const res = await getStaffRoute(req);
        expect(res.status, `Failed on ${label}`).toBe(401);
        const data = await res.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('Unauthorized');
      }
    });

    it('1.1.2: unauthenticated requests to POST /api/admin/staff return HTTP 401', async () => {
      for (const { label, opts } of unauthenticatedOptions) {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/staff',
          'POST',
          { full_name: 'Intruder Staff', phone: '0412 111 222' },
          opts
        );
        const res = await postStaffRoute(req);
        expect(res.status, `Failed on ${label}`).toBe(401);
        const data = await res.json();
        expect(data.success).toBe(false);
      }
    });

    it('1.1.3: unauthenticated requests to GET /api/admin/staff/[id] return HTTP 401', async () => {
      for (const { label, opts } of unauthenticatedOptions) {
        const req = createTestRequest('http://localhost:3000/api/admin/staff/stf-001', 'GET', undefined, opts);
        const res = await getStaffByIdRoute(req, { params: Promise.resolve({ id: 'stf-001' }) });
        expect(res.status, `Failed on ${label}`).toBe(401);
        const data = await res.json();
        expect(data.success).toBe(false);
      }
    });

    it('1.1.4: unauthenticated requests to PUT /api/admin/staff/[id] return HTTP 401', async () => {
      for (const { label, opts } of unauthenticatedOptions) {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/staff/stf-001',
          'PUT',
          { full_name: 'Modified Name' },
          opts
        );
        const res = await putStaffRoute(req, { params: Promise.resolve({ id: 'stf-001' }) });
        expect(res.status, `Failed on ${label}`).toBe(401);
        const data = await res.json();
        expect(data.success).toBe(false);
      }
    });

    it('1.1.5: unauthenticated requests to PUT /api/admin/staff/[id]/role return HTTP 401', async () => {
      for (const { label, opts } of unauthenticatedOptions) {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/staff/stf-003/role',
          'PUT',
          { role: 'super_admin' },
          opts
        );
        const res = await putStaffRoleRoute(req, { params: Promise.resolve({ id: 'stf-003' }) });
        expect(res.status, `Failed on ${label}`).toBe(401);
        const data = await res.json();
        expect(data.success).toBe(false);
      }
    });

    it('1.1.6: unauthenticated requests to PUT /api/admin/staff/[id]/status return HTTP 401', async () => {
      for (const { label, opts } of unauthenticatedOptions) {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/staff/stf-003/status',
          'PUT',
          { is_active: false },
          opts
        );
        const res = await putStaffStatusRoute(req, { params: Promise.resolve({ id: 'stf-003' }) });
        expect(res.status, `Failed on ${label}`).toBe(401);
        const data = await res.json();
        expect(data.success).toBe(false);
      }
    });

    it('1.1.7: unauthenticated requests to PUT /api/admin/staff/[id]/specializations return HTTP 401', async () => {
      for (const { label, opts } of unauthenticatedOptions) {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/staff/stf-003/specializations',
          'PUT',
          { specializations: ['SNS Dip'] },
          opts
        );
        const res = await putStaffSpecializationsRoute(req, { params: Promise.resolve({ id: 'stf-003' }) });
        expect(res.status, `Failed on ${label}`).toBe(401);
        const data = await res.json();
        expect(data.success).toBe(false);
      }
    });

    it('1.1.8: unauthenticated requests to GET /api/admin/staff/[id]/productivity return HTTP 401', async () => {
      for (const { label, opts } of unauthenticatedOptions) {
        const req = createTestRequest(
          'http://localhost:3000/api/admin/staff/stf-003/productivity',
          'GET',
          undefined,
          opts
        );
        const res = await getStaffProductivityRoute(req, { params: Promise.resolve({ id: 'stf-003' }) });
        expect(res.status, `Failed on ${label}`).toBe(401);
        const data = await res.json();
        expect(data.success).toBe(false);
      }
    });

    it('1.2.1: staff role users attempting to create staff return HTTP 403 Forbidden', async () => {
      const req = createTestRequest(
        'http://localhost:3000/api/admin/staff',
        'POST',
        { full_name: 'Rogue Employee', phone: '0412 999 888', role: 'staff' },
        { role: 'staff' }
      );
      const res = await postStaffRoute(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Forbidden');
      expect(data.error).toContain('Staff role not permitted');

      // Verify no staff was created
      expect(mockStaffStore.staff.some((s) => s.phone === '0412 999 888')).toBe(false);
    });

    it('1.2.2: staff role users attempting to update roles return HTTP 403 Forbidden', async () => {
      const targetStaff = mockStaffStore.staff[2]; // Chloe (staff)
      const rolesToAttempt = ['staff', 'manager', 'super_admin'];

      for (const attemptedRole of rolesToAttempt) {
        const req = createTestRequest(
          `http://localhost:3000/api/admin/staff/${targetStaff.id}/role`,
          'PUT',
          { role: attemptedRole },
          { role: 'staff' }
        );
        const res = await putStaffRoleRoute(req, { params: Promise.resolve({ id: targetStaff.id }) });
        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('Forbidden');
      }

      // Domain RBAC functions must also enforce zero staff privilege
      expect(canElevateRole('staff', 'staff')).toBe(false);
      expect(canElevateRole('staff', 'manager')).toBe(false);
      expect(canElevateRole('staff', 'super_admin')).toBe(false);
      expect(canAccessRoute('staff', `/api/admin/staff/${targetStaff.id}/role`)).toBe(false);
    });

    it('1.2.3: staff role users attempting to elevate roles via general update PUT /api/admin/staff/[id] must return HTTP 403 Forbidden', async () => {
      const targetStaff = mockStaffStore.staff[2]; // Chloe (staff)
      const req = createTestRequest(
        `http://localhost:3000/api/admin/staff/${targetStaff.id}`,
        'PUT',
        { role: 'super_admin' },
        { role: 'staff' }
      );
      const res = await putStaffRoute(req, { params: Promise.resolve({ id: targetStaff.id }) });
      // Invariant: staff must NOT be permitted to elevate roles via PUT /api/admin/staff/[id]
      expect(res.status, 'CRITICAL VULNERABILITY: PUT /api/admin/staff/[id] permits unauthorized role elevation by staff!').toBe(403);
      expect(targetStaff.role).toBe('staff');
    });

    it('1.3.1: manager role users CANNOT elevate themselves or other users to super_admin (HTTP 403 Forbidden)', async () => {
      const managerStaff = mockStaffStore.staff.find((s) => s.role === 'manager');
      const technicianStaff = mockStaffStore.staff.find((s) => s.role === 'staff');
      expect(managerStaff).toBeDefined();
      expect(technicianStaff).toBeDefined();

      // Manager attempting to elevate another user to super_admin
      const reqElevateOther = createTestRequest(
        `http://localhost:3000/api/admin/staff/${technicianStaff!.id}/role`,
        'PUT',
        { role: 'super_admin' },
        { role: 'manager' }
      );
      const resElevateOther = await putStaffRoleRoute(reqElevateOther, {
        params: Promise.resolve({ id: technicianStaff!.id }),
      });
      expect(resElevateOther.status).toBe(403);
      const dataOther = await resElevateOther.json();
      expect(dataOther.success).toBe(false);
      expect(dataOther.error).toContain('Forbidden');
      expect(technicianStaff!.role).toBe('staff'); // Unchanged

      // Manager attempting self-elevation to super_admin
      const reqElevateSelf = createTestRequest(
        `http://localhost:3000/api/admin/staff/${managerStaff!.id}/role`,
        'PUT',
        { role: 'super_admin' },
        { role: 'manager' }
      );
      const resElevateSelf = await putStaffRoleRoute(reqElevateSelf, {
        params: Promise.resolve({ id: managerStaff!.id }),
      });
      expect(resElevateSelf.status).toBe(403);
      const dataSelf = await resElevateSelf.json();
      expect(dataSelf.success).toBe(false);
      expect(dataSelf.error).toContain('Forbidden');
      expect(managerStaff!.role).toBe('manager'); // Unchanged

      // Strict domain check: canElevateRole('manager', 'super_admin') must be false
      expect(canElevateRole('manager', 'super_admin')).toBe(false);
    });

    it('1.3.2: ONLY super_admin can grant super_admin role', async () => {
      const technicianStaff = mockStaffStore.staff.find((s) => s.role === 'staff');
      expect(technicianStaff).toBeDefined();

      // Super admin elevates technician to super_admin
      const reqSuperAdmin = createTestRequest(
        `http://localhost:3000/api/admin/staff/${technicianStaff!.id}/role`,
        'PUT',
        { role: 'super_admin' },
        { role: 'super_admin' }
      );
      const resSuperAdmin = await putStaffRoleRoute(reqSuperAdmin, {
        params: Promise.resolve({ id: technicianStaff!.id }),
      });
      expect(resSuperAdmin.status).toBe(200);
      const data = await resSuperAdmin.json();
      expect(data.success).toBe(true);
      expect(data.staff.role).toBe('super_admin');
      expect(technicianStaff!.role).toBe('super_admin');

      // Domain check
      expect(canElevateRole('super_admin', 'super_admin')).toBe(true);
      expect(canElevateRole('super_admin', 'manager')).toBe(true);
      expect(canElevateRole('super_admin', 'staff')).toBe(true);
    });

    it('1.4.1: invalid or spoofed role strings are rejected with HTTP 400 Bad Request', async () => {
      const targetStaff = mockStaffStore.staff[2];
      const spoofedRoles = [
        'root',
        'admin',
        'owner',
        'hacker',
        'administrator',
        'sudo',
        'SYSTEM',
        'superadmin',
        'guest',
        'developer',
        'null',
        '',
        '   ',
      ];

      for (const badRole of spoofedRoles) {
        // Validation helpers check
        expect(isValidRole(badRole), `isValidRole should be false for '${badRole}'`).toBe(false);
        expect(normalizeRole(badRole), `normalizeRole should be undefined for '${badRole}'`).toBeUndefined();
        expect(canElevateRole('super_admin', badRole), `canElevateRole should be false for '${badRole}'`).toBe(false);

        // API Endpoint test
        const req = createTestRequest(
          `http://localhost:3000/api/admin/staff/${targetStaff.id}/role`,
          'PUT',
          { role: badRole },
          { role: 'super_admin' }
        );
        const res = await putStaffRoleRoute(req, { params: Promise.resolve({ id: targetStaff.id }) });
        expect(res.status, `Expected 400 for bad role '${badRole}'`).toBe(400);
        const data = await res.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('Invalid or missing role parameter');
      }

      // Invariant: Target staff role must remain uncorrupted
      expect(targetStaff.role).toBe('staff');
    });

    it('1.4.2: malformed JSON payloads to role endpoint return HTTP 400 Bad Request', async () => {
      const targetStaff = mockStaffStore.staff[2];
      const req = new NextRequest(`http://localhost:3000/api/admin/staff/${targetStaff.id}/role`, {
        method: 'PUT',
        headers: {
          Cookie: 'sb-authenticated=true; sb-role=super_admin; sb-email=admin@glamournails.com.au',
          'Content-Type': 'application/json',
        },
        body: 'NOT_A_VALID_JSON{role: "super_admin"',
      });
      const res = await putStaffRoleRoute(req, { params: Promise.resolve({ id: targetStaff.id }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
    });
  });

  // ==========================================================================
  // Area 2: Consultation Inquiry status transition workflows
  // ==========================================================================
  describe('Area 2: Consultation Inquiry Status Transition Workflows & Conversions', () => {
    it('2.1.1: supports full lifecycle status transition: new -> contacted -> booked -> completed -> cancelled', async () => {
      const inqId = 'inq-lifecycle-test';
      mockCrmStore.consultations.push({
        id: inqId,
        customer_id: null,
        customer_name: 'Sophie Martin',
        phone: '0433 111 222',
        email: 'sophie.martin@test.com',
        preferred_language: 'en',
        preferred_date: '2026-11-28',
        preferred_time: '14:00',
        service_requested_id: null,
        services_requested: ['Russian Manicure', 'Gel Polish'],
        notes: 'Requested bridal consultation',
        status: 'new',
        source: 'web_form',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const transitionSteps: Array<'contacted' | 'booked' | 'completed' | 'cancelled'> = [
        'contacted',
        'booked',
        'completed',
        'cancelled',
      ];

      for (const nextStatus of transitionSteps) {
        const req = createTestRequest(
          `http://localhost:3000/api/admin/inquiries/${inqId}/status`,
          'PUT',
          { status: nextStatus, notes: `Transitioned to ${nextStatus}` },
          { role: 'manager' }
        );
        const res = await putInquiryStatusRoute(req, { params: Promise.resolve({ id: inqId }) });
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.inquiry.status).toBe(nextStatus);
        expect(data.inquiry.notes).toBe(`Transitioned to ${nextStatus}`);

        // Verify persistence in mock store
        const inqInStore = mockCrmStore.consultations.find((c) => c.id === inqId);
        expect(inqInStore?.status).toBe(nextStatus);
      }
    });

    it('2.2.1: 1-click customer profile creation creates customer record with name, phone, email, notes, and links converted_customer_id', async () => {
      const inqId = 'inq-1click-convert';
      const initialCustomerCount = mockCrmStore.customers.length;

      mockCrmStore.consultations.push({
        id: inqId,
        customer_id: null,
        customer_name: 'Linh Hoàng Vũ',
        phone: '0477 888 999',
        email: 'linh.vu@glamournails.example',
        preferred_language: 'vi',
        preferred_date: '2026-11-29',
        preferred_time: '11:00',
        service_requested_id: null,
        services_requested: ['Acrylic Extensions', '3D Nail Art'],
        notes: 'Client notes: Sensitive cuticles and allergic to latex gloves',
        status: 'new',
        source: 'web_form',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Execute 1-click conversion via PUT /api/admin/inquiries/[id]/status
      const req = createTestRequest(
        `http://localhost:3000/api/admin/inquiries/${inqId}/status`,
        'PUT',
        { status: 'contacted', convert_to_customer: true },
        { role: 'manager' }
      );
      const res = await putInquiryStatusRoute(req, { params: Promise.resolve({ id: inqId }) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.inquiry.converted_customer_id).toBeDefined();

      const newCustomerId = data.inquiry.converted_customer_id;
      expect(typeof newCustomerId).toBe('string');
      expect(mockCrmStore.customers.length).toBe(initialCustomerCount + 1);

      // Verify the customer record in store
      const customer = mockCrmStore.customers.find((c) => c.id === newCustomerId);
      expect(customer).toBeDefined();
      expect(customer!.full_name).toBe('Linh Hoàng Vũ');
      expect(customer!.name).toBe('Linh Hoàng Vũ');
      expect(customer!.phone).toBe('0477 888 999');
      expect(customer!.email).toBe('linh.vu@glamournails.example');
      expect(customer!.preferred_language).toBe('vi');
      expect(customer!.notes).toContain('Sensitive cuticles and allergic to latex gloves');
      expect(customer!.allergies).toContain('allergic to latex gloves');
      expect(customer!.is_active).toBe(true);

      // Verify GET /api/admin/inquiries/[id] returns the converted_customer_id
      const reqGet = createTestRequest(
        `http://localhost:3000/api/admin/inquiries/${inqId}`,
        'GET',
        undefined,
        { role: 'staff' }
      );
      const resGet = await getInquiryByIdRoute(reqGet, { params: Promise.resolve({ id: inqId }) });
      expect(resGet.status).toBe(200);
      const dataGet = await resGet.json();
      expect(dataGet.inquiry.converted_customer_id).toBe(newCustomerId);
    });

    it('2.2.2: status transition to booked automatically triggers 1-click customer profile creation', async () => {
      const inqId = 'inq-auto-booked-convert';
      const initialCustomerCount = mockCrmStore.customers.length;

      mockCrmStore.consultations.push({
        id: inqId,
        customer_id: null,
        customer_name: 'Jessica Taylor',
        phone: '0466 555 444',
        email: 'jess.taylor@australianails.test',
        preferred_language: 'en',
        preferred_date: '2026-11-30',
        preferred_time: '16:00',
        service_requested_id: null,
        services_requested: ['SNS Dipping Powder'],
        notes: 'First time visitor booked for formal event',
        status: 'contacted',
        source: 'web_form',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Transition to 'booked' without explicitly sending convert_to_customer
      const req = createTestRequest(
        `http://localhost:3000/api/admin/inquiries/${inqId}/status`,
        'PUT',
        { status: 'booked' },
        { role: 'manager' }
      );
      const res = await putInquiryStatusRoute(req, { params: Promise.resolve({ id: inqId }) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.inquiry.status).toBe('booked');
      expect(data.inquiry.converted_customer_id).toBeDefined();

      const createdCustomer = mockCrmStore.customers.find((c) => c.id === data.inquiry.converted_customer_id);
      expect(createdCustomer).toBeDefined();
      expect(createdCustomer!.full_name).toBe('Jessica Taylor');
      expect(createdCustomer!.phone).toBe('0466 555 444');
      expect(mockCrmStore.customers.length).toBe(initialCustomerCount + 1);
    });

    it('2.3.1: duplicate conversions on already converted inquiries do NOT create duplicate customers', async () => {
      const inqId = 'inq-idempotency-test';
      mockCrmStore.consultations.push({
        id: inqId,
        customer_id: null,
        customer_name: 'Oliver Queen',
        phone: '0455 123 789',
        email: 'oliver@queen.com.au',
        preferred_language: 'en',
        preferred_date: '2026-12-01',
        preferred_time: '10:00',
        service_requested_id: null,
        services_requested: ['Express Manicure'],
        notes: 'Routine manicure',
        status: 'new',
        source: 'web_form',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // First conversion
      const req1 = createTestRequest(
        `http://localhost:3000/api/admin/inquiries/${inqId}/status`,
        'PUT',
        { status: 'booked', convert_to_customer: true },
        { role: 'manager' }
      );
      const res1 = await putInquiryStatusRoute(req1, { params: Promise.resolve({ id: inqId }) });
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      const firstCustomerId = data1.inquiry.converted_customer_id;
      expect(firstCustomerId).toBeDefined();

      const customerCountAfterFirst = mockCrmStore.customers.length;

      // Second conversion (duplicate call)
      const req2 = createTestRequest(
        `http://localhost:3000/api/admin/inquiries/${inqId}/status`,
        'PUT',
        { status: 'booked', convert_to_customer: true },
        { role: 'manager' }
      );
      const res2 = await putInquiryStatusRoute(req2, { params: Promise.resolve({ id: inqId }) });
      expect(res2.status).toBe(200);
      const data2 = await res2.json();

      // Third conversion with PUT /api/admin/inquiries/[id]
      const req3 = createTestRequest(
        `http://localhost:3000/api/admin/inquiries/${inqId}`,
        'PUT',
        { status: 'completed', convert_to_customer: true },
        { role: 'manager' }
      );
      const res3 = await putInquiryRoute(req3, { params: Promise.resolve({ id: inqId }) });
      expect(res3.status).toBe(200);
      const data3 = await res3.json();

      // INVARIANTS:
      // 1. Converted customer ID must remain identical
      expect(data2.inquiry.converted_customer_id).toBe(firstCustomerId);
      expect(data3.inquiry.converted_customer_id).toBe(firstCustomerId);

      // 2. Customer count must NOT increase across duplicate conversions
      expect(mockCrmStore.customers.length).toBe(customerCountAfterFirst);

      // 3. Only ONE customer with phone '0455 123 789' should exist
      const matchingCustomers = mockCrmStore.customers.filter((c) => c.phone === '0455 123 789');
      expect(matchingCustomers.length).toBe(1);
    });

    it('2.3.2: multiple distinct inquiries with matching phone numbers link to the same customer profile', async () => {
      const sharedPhone = '0499 123 456';
      const initialCount = mockCrmStore.customers.length;

      const inqA = 'inq-multi-phone-A';
      const inqB = 'inq-multi-phone-B';

      mockCrmStore.consultations.push(
        {
          id: inqA,
          customer_id: null,
          customer_name: 'Emily Watson',
          phone: sharedPhone,
          email: 'emily.w@example.com',
          preferred_language: 'en',
          preferred_date: '2026-12-05',
          preferred_time: '13:00',
          service_requested_id: null,
          services_requested: ['Nail Art'],
          notes: 'Inquiry 1',
          status: 'new',
          source: 'web_form',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: inqB,
          customer_id: null,
          customer_name: 'Emily Watson',
          phone: sharedPhone,
          email: 'emily.w@example.com',
          preferred_language: 'en',
          preferred_date: '2026-12-12',
          preferred_time: '15:00',
          service_requested_id: null,
          services_requested: ['Spa Pedicure'],
          notes: 'Inquiry 2',
          status: 'new',
          source: 'web_form',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      );

      // Convert inquiry A
      const reqA = createTestRequest(
        `http://localhost:3000/api/admin/inquiries/${inqA}/status`,
        'PUT',
        { status: 'booked', convert_to_customer: true },
        { role: 'manager' }
      );
      const resA = await putInquiryStatusRoute(reqA, { params: Promise.resolve({ id: inqA }) });
      const dataA = await resA.json();
      expect(resA.status).toBe(200);

      // Convert inquiry B
      const reqB = createTestRequest(
        `http://localhost:3000/api/admin/inquiries/${inqB}/status`,
        'PUT',
        { status: 'booked', convert_to_customer: true },
        { role: 'manager' }
      );
      const resB = await putInquiryStatusRoute(reqB, { params: Promise.resolve({ id: inqB }) });
      const dataB = await resB.json();
      expect(resB.status).toBe(200);

      // Both inquiries must link to the EXACT same customer profile
      expect(dataA.inquiry.converted_customer_id).toBe(dataB.inquiry.converted_customer_id);

      // Customer count only increased by 1
      expect(mockCrmStore.customers.length).toBe(initialCount + 1);
    });

    it('2.3.3: returns HTTP 404 when attempting to update status of non-existent inquiry', async () => {
      const req = createTestRequest(
        'http://localhost:3000/api/admin/inquiries/inq-does-not-exist/status',
        'PUT',
        { status: 'contacted' },
        { role: 'manager' }
      );
      const res = await putInquiryStatusRoute(req, { params: Promise.resolve({ id: 'inq-does-not-exist' }) });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });
  });

  // ==========================================================================
  // Area 3: Staff Productivity calculation robustness
  // ==========================================================================
  describe('Area 3: Staff Productivity Calculation Robustness', () => {
    it('3.1.1: staff with 0 visits returns 0 completed visits, 0 revenue, 0 average ticket without dividing by zero (non-NaN, non-Infinity)', async () => {
      // Create a brand new staff member who has zero visits
      const newStaff = await createStaffMember({
        full_name: 'Zero Visit Intern',
        phone: '0411 999 000',
        role: 'staff',
        employment_type: 'Casual',
        specializations: ['Russian Manicure'],
      });

      // 1. Pure service calculation check
      const metrics = await calculateStaffProductivity(newStaff.id);
      expect(metrics.staff_id).toBe(newStaff.id);
      expect(metrics.completed_visits).toBe(0);
      expect(metrics.total_revenue_cents).toBe(0);
      expect(metrics.total_revenue_aud).toBe(0);
      expect(metrics.average_ticket_aud).toBe(0);

      // Invariant: Non-NaN and Finite
      expect(Number.isNaN(metrics.average_ticket_aud)).toBe(false);
      expect(Number.isFinite(metrics.average_ticket_aud)).toBe(true);
      expect(Object.is(metrics.average_ticket_aud, 0)).toBe(true);

      // 2. HTTP Endpoint test GET /api/admin/staff/[id]/productivity
      const req = createTestRequest(
        `http://localhost:3000/api/admin/staff/${newStaff.id}/productivity`,
        'GET',
        undefined,
        { role: 'manager' }
      );
      const res = await getStaffProductivityRoute(req, { params: Promise.resolve({ id: newStaff.id }) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.staff_id).toBe(newStaff.id);
      expect(data.completed_visits).toBe(0);
      expect(data.total_revenue_cents).toBe(0);
      expect(data.total_revenue_aud).toBe(0);
      expect(data.average_ticket_aud).toBe(0);
      expect(Number.isNaN(data.average_ticket_aud)).toBe(false);
    });

    it('3.2.1: accurately calculates productivity with multiple service visits and varied prices with mathematical precision', async () => {
      const staffId = 'stf-004'; // Kevin Pham
      // Clean any existing visits for this staffId
      mockCrmStore.visits = mockCrmStore.visits.filter((v) => v.staff_id !== staffId);

      const visitsToSeed = [
        { cents: 3500, aud: 35.0, name: 'Express Manicure' },
        { cents: 8550, aud: 85.5, name: 'SNS Dipping + French Tip' },
        { cents: 12000, aud: 120.0, name: 'Acrylic Full Set + Ombre' },
        { cents: 25075, aud: 250.75, name: 'Deluxe Bridal Spa Set' },
        { cents: 4825, aud: 48.25, name: 'Gel Removal + Treatment' },
      ];

      let expectedTotalCents = 0;
      visitsToSeed.forEach((v, index) => {
        expectedTotalCents += v.cents;
        mockCrmStore.visits.push({
          id: `vis-kevin-${index}`,
          customer_id: 'cust-1',
          staff_id: staffId,
          service_id: null,
          visit_date: '2026-11-16T10:00:00Z',
          services_rendered: [{ name: v.name, price_cents: v.cents }],
          price_charged_aud: v.aud,
          tip_aud: 0,
          total_paid_aud: v.aud,
          total_amount_cents: v.cents,
          payment_method: 'EFTPOS',
          notes: '',
          rating: 5,
          photo_urls: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });

      const expectedCount = visitsToSeed.length; // 5
      expect(expectedTotalCents).toBe(53950);
      const expectedTotalAud = 539.5; // 53950 / 100
      const expectedAvgTicketAud = 539.5 / 5; // 107.90

      // Query productivity via service
      const serviceMetrics = await calculateStaffProductivity(staffId);
      expect(serviceMetrics.completed_visits).toBe(expectedCount);
      expect(serviceMetrics.total_revenue_cents).toBe(expectedTotalCents);
      expect(serviceMetrics.total_revenue_aud).toBe(expectedTotalAud);
      expect(serviceMetrics.average_ticket_aud).toBe(expectedAvgTicketAud);

      // Query productivity via API endpoint
      const req = createTestRequest(
        `http://localhost:3000/api/admin/staff/${staffId}/productivity`,
        'GET',
        undefined,
        { role: 'super_admin' }
      );
      const res = await getStaffProductivityRoute(req, { params: Promise.resolve({ id: staffId }) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.completed_visits).toBe(expectedCount);
      expect(data.total_revenue_cents).toBe(expectedTotalCents);
      expect(data.total_revenue_aud).toBe(expectedTotalAud);
      expect(data.average_ticket_aud).toBe(expectedAvgTicketAud);
    });

    it('3.3.1: deactivating a staff member (is_active: false) retains their completed visits and historical revenue contribution', async () => {
      const staffMember = mockStaffStore.staff[2]; // Chloe Nguyen (stf-003)
      const staffId = staffMember.id;

      // Seed 2 completed visits
      mockCrmStore.visits.push(
        {
          id: 'vis-chloe-1',
          customer_id: 'cust-1',
          staff_id: staffId,
          service_id: null,
          visit_date: '2026-11-15T09:00:00Z',
          services_rendered: [{ name: 'Acrylic Full Set', price_cents: 9500 }],
          price_charged_aud: 95.0,
          tip_aud: 10.0,
          total_paid_aud: 105.0,
          total_amount_cents: 10500,
          payment_method: 'Credit Card',
          notes: '',
          rating: 5,
          photo_urls: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'vis-chloe-2',
          customer_id: 'cust-2',
          staff_id: staffId,
          service_id: null,
          visit_date: '2026-11-15T14:00:00Z',
          services_rendered: [{ name: 'SNS Dipping', price_cents: 7500 }],
          price_charged_aud: 75.0,
          tip_aud: 0,
          total_paid_aud: 75.0,
          total_amount_cents: 7500,
          payment_method: 'EFTPOS',
          notes: '',
          rating: 5,
          photo_urls: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      );

      // Verify initial metrics
      const preMetrics = await calculateStaffProductivity(staffId);
      expect(preMetrics.completed_visits).toBe(2);
      expect(preMetrics.total_revenue_cents).toBe(18000);
      expect(preMetrics.total_revenue_aud).toBe(180.0);
      expect(preMetrics.average_ticket_aud).toBe(90.0);

      // Deactivate staff member via PUT /api/admin/staff/[id]/status
      const reqStatus = createTestRequest(
        `http://localhost:3000/api/admin/staff/${staffId}/status`,
        'PUT',
        { is_active: false },
        { role: 'super_admin' }
      );
      const resStatus = await putStaffStatusRoute(reqStatus, { params: Promise.resolve({ id: staffId }) });
      expect(resStatus.status).toBe(200);

      const statusData = await resStatus.json();
      expect(statusData.staff.is_active).toBe(false);
      expect(staffMember.is_active).toBe(false);

      // Invariant 1: Staff member is excluded from active-only query
      const reqActiveStaff = createTestRequest(
        'http://localhost:3000/api/admin/staff?active=true',
        'GET',
        undefined,
        { role: 'manager' }
      );
      const resActiveStaff = await getStaffRoute(reqActiveStaff);
      const activeData = await resActiveStaff.json();
      expect(activeData.staff.some((s: any) => s.id === staffId)).toBe(false);

      // Invariant 2: Staff member is retained in full directory query
      const reqAllStaff = createTestRequest(
        'http://localhost:3000/api/admin/staff',
        'GET',
        undefined,
        { role: 'manager' }
      );
      const resAllStaff = await getStaffRoute(reqAllStaff);
      const allData = await resAllStaff.json();
      const foundStaff = allData.staff.find((s: any) => s.id === staffId);
      expect(foundStaff).toBeDefined();
      expect(foundStaff.is_active).toBe(false);

      // Invariant 3: Historical productivity calculation strictly retains all completed visits and revenue
      const postMetrics = await calculateStaffProductivity(staffId);
      expect(postMetrics.completed_visits).toBe(2);
      expect(postMetrics.total_revenue_cents).toBe(18000);
      expect(postMetrics.total_revenue_aud).toBe(180.0);
      expect(postMetrics.average_ticket_aud).toBe(90.0);

      // Invariant 4: Productivity endpoint for deactivated staff continues returning HTTP 200 with identical metrics
      const reqProd = createTestRequest(
        `http://localhost:3000/api/admin/staff/${staffId}/productivity`,
        'GET',
        undefined,
        { role: 'manager' }
      );
      const resProd = await getStaffProductivityRoute(reqProd, { params: Promise.resolve({ id: staffId }) });
      expect(resProd.status).toBe(200);
      const prodData = await resProd.json();
      expect(prodData.success).toBe(true);
      expect(prodData.staff_id).toBe(staffId);
      expect(prodData.completed_visits).toBe(2);
      expect(prodData.total_revenue_cents).toBe(18000);
      expect(prodData.total_revenue_aud).toBe(180.0);
      expect(prodData.average_ticket_aud).toBe(90.0);
    });

    it('3.3.2: productivity endpoint returns HTTP 404 for non-existent staff ID', async () => {
      const req = createTestRequest(
        'http://localhost:3000/api/admin/staff/stf-ghost-unknown/productivity',
        'GET',
        undefined,
        { role: 'manager' }
      );
      const res = await getStaffProductivityRoute(req, { params: Promise.resolve({ id: 'stf-ghost-unknown' }) });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Staff member not found');
    });
  });
});
