import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { mockStaffStore, calculateStaffProductivity } from '@/lib/staff/staff-data';
import { mockCrmStore } from '@/lib/crm/mock-customers';

import { GET as getStaff, POST as postStaff } from '@/app/api/admin/staff/route';
import { GET as getStaffById, PUT as putStaff } from '@/app/api/admin/staff/[id]/route';
import { PUT as putStaffRole } from '@/app/api/admin/staff/[id]/role/route';
import { PUT as putStaffSpecializations } from '@/app/api/admin/staff/[id]/specializations/route';
import { PUT as putStaffStatus } from '@/app/api/admin/staff/[id]/status/route';
import { GET as getStaffProductivity } from '@/app/api/admin/staff/[id]/productivity/route';

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

describe('Unit Test Suite: Staff Management & Productivity (Milestone 4)', () => {
  beforeEach(() => {
    mockStaffStore.reset();
    mockCrmStore.reset();
  });

  describe('1. Staff Directory & Queries', () => {
    it('GET /api/admin/staff rejects unauthenticated requests with 401', async () => {
      const req = createAdminRequest('http://localhost:3000/api/admin/staff');
      const res = await getStaff(req);
      expect(res.status).toBe(401);
    });

    it('GET /api/admin/staff returns full staff directory', async () => {
      const req = createAdminRequest(
        'http://localhost:3000/api/admin/staff',
        'GET',
        undefined,
        'manager'
      );
      const res = await getStaff(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.staff)).toBe(true);
      expect(data.staff.length).toBeGreaterThanOrEqual(3);
    });

    it('GET /api/admin/staff?active=true filters active staff only', async () => {
      // Deactivate one staff member
      mockStaffStore.staff[0].is_active = false;

      const req = createAdminRequest(
        'http://localhost:3000/api/admin/staff?active=true',
        'GET',
        undefined,
        'manager'
      );
      const res = await getStaff(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.staff.every((s: any) => s.is_active === true)).toBe(true);
      expect(data.staff.some((s: any) => s.id === mockStaffStore.staff[0].id)).toBe(false);
    });
  });

  describe('2. Staff Profile Creation & RBAC Guards', () => {
    it('POST /api/admin/staff rejects staff role with 403 Forbidden', async () => {
      const req = createAdminRequest(
        'http://localhost:3000/api/admin/staff',
        'POST',
        { full_name: 'Unauthorized Tech', phone: '0422 999 888' },
        'staff'
      );
      const res = await postStaff(req);
      expect(res.status).toBe(403);
    });

    it('POST /api/admin/staff rejects missing name with 400', async () => {
      const req = createAdminRequest(
        'http://localhost:3000/api/admin/staff',
        'POST',
        { phone: '0422 999 888' },
        'manager'
      );
      const res = await postStaff(req);
      expect(res.status).toBe(400);
    });

    it('POST /api/admin/staff allows super_admin and manager to create staff profiles', async () => {
      const newStaff = {
        full_name: 'Kevin Pham',
        phone: '0422 123 456',
        email: 'kevin.p@glamournails.com.au',
        role: 'staff',
        employment_type: 'Full-time',
        specializations: ['Acrylic Extensions', '3D Nail Art'],
      };

      const req = createAdminRequest(
        'http://localhost:3000/api/admin/staff',
        'POST',
        newStaff,
        'super_admin'
      );
      const res = await postStaff(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.staff_id).toBeDefined();
      expect(data.staff.name).toBe('Kevin Pham');
      expect(data.staff.role).toBe('staff');
      expect(data.staff.is_active).toBe(true);
    });
  });

  describe('3. Role Elevation Restrictions & Invariant Checks', () => {
    it('PUT /api/admin/staff/[id]/role allows super_admin to assign manager or staff', async () => {
      const target = mockStaffStore.staff[2]; // Chloe (staff)
      const req = createAdminRequest(
        `http://localhost:3000/api/admin/staff/${target.id}/role`,
        'PUT',
        { role: 'manager' },
        'super_admin'
      );
      const res = await putStaffRole(req, { params: Promise.resolve({ id: target.id }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.staff.role).toBe('manager');
    });

    it('PUT /api/admin/staff/[id]/role rejects manager attempting to elevate to super_admin with 403', async () => {
      const target = mockStaffStore.staff[2];
      const req = createAdminRequest(
        `http://localhost:3000/api/admin/staff/${target.id}/role`,
        'PUT',
        { role: 'super_admin' },
        'manager'
      );
      const res = await putStaffRole(req, { params: Promise.resolve({ id: target.id }) });
      expect(res.status).toBe(403);
    });

    it('PUT /api/admin/staff/[id]/role rejects staff attempting any role modification with 403', async () => {
      const target = mockStaffStore.staff[2];
      const req = createAdminRequest(
        `http://localhost:3000/api/admin/staff/${target.id}/role`,
        'PUT',
        { role: 'staff' },
        'staff'
      );
      const res = await putStaffRole(req, { params: Promise.resolve({ id: target.id }) });
      expect(res.status).toBe(403);
    });

    it('PUT /api/admin/staff/[id]/role rejects invalid role names with 400', async () => {
      const target = mockStaffStore.staff[2];
      const req = createAdminRequest(
        `http://localhost:3000/api/admin/staff/${target.id}/role`,
        'PUT',
        { role: 'supreme_leader' },
        'super_admin'
      );
      const res = await putStaffRole(req, { params: Promise.resolve({ id: target.id }) });
      expect(res.status).toBe(400);
    });
  });

  describe('4. Specializations Tagging', () => {
    it('PUT /api/admin/staff/[id]/specializations updates skill tags', async () => {
      const target = mockStaffStore.staff[1];
      const newSpecs = ['Acrylic Extensions', 'Russian Manicure', '3D Nail Art', 'E-File'];

      const req = createAdminRequest(
        `http://localhost:3000/api/admin/staff/${target.id}/specializations`,
        'PUT',
        { specializations: newSpecs },
        'manager'
      );
      const res = await putStaffSpecializations(req, { params: Promise.resolve({ id: target.id }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.staff.specializations).toEqual(newSpecs);
    });
  });

  describe('5. Active Status Toggle & Productivity Tracking', () => {
    it('calculates productivity metrics attributed to staff member', async () => {
      const techId = 'stf-003';
      // Seed two visits attributed to techId
      mockCrmStore.visits.push({
        id: 'vis-test-1',
        customer_id: 'cust-1',
        staff_id: techId,
        service_id: null,
        visit_date: '2026-11-16T10:00:00Z',
        services_rendered: [{ name: 'Acrylic Full Set', price_cents: 9500 }],
        price_charged_aud: 95.0,
        tip_aud: 10.0,
        total_paid_aud: 105.0,
        total_amount_cents: 10500,
        payment_method: 'card',
        notes: '',
        rating: 5,
        photo_urls: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      mockCrmStore.visits.push({
        id: 'vis-test-2',
        customer_id: 'cust-2',
        staff_id: techId,
        service_id: null,
        visit_date: '2026-11-16T14:00:00Z',
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
      });

      const metrics = await calculateStaffProductivity(techId);
      expect(metrics.completed_visits).toBe(2);
      expect(metrics.total_revenue_cents).toBe(18000);
      expect(metrics.total_revenue_aud).toBe(180.0);
      expect(metrics.average_ticket_aud).toBe(90.0);

      // Verify endpoint
      const req = createAdminRequest(
        `http://localhost:3000/api/admin/staff/${techId}/productivity`,
        'GET',
        undefined,
        'manager'
      );
      const res = await getStaffProductivity(req, { params: Promise.resolve({ id: techId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.completed_visits).toBe(2);
      expect(data.total_revenue_aud).toBe(180.0);
    });

    it('preserves historical productivity even when staff member is deactivated', async () => {
      const tech = mockStaffStore.staff[2]; // stf-003

      // Deactivate staff
      const reqStatus = createAdminRequest(
        `http://localhost:3000/api/admin/staff/${tech.id}/status`,
        'PUT',
        { is_active: false },
        'super_admin'
      );
      const resStatus = await putStaffStatus(reqStatus, { params: Promise.resolve({ id: tech.id }) });
      expect(resStatus.status).toBe(200);
      expect(tech.is_active).toBe(false);

      // Verify productivity query still succeeds
      const reqProd = createAdminRequest(
        `http://localhost:3000/api/admin/staff/${tech.id}/productivity`,
        'GET',
        undefined,
        'manager'
      );
      const resProd = await getStaffProductivity(reqProd, { params: Promise.resolve({ id: tech.id }) });
      expect(resProd.status).toBe(200);
      const data = await resProd.json();
      expect(data.staff_id).toBe(tech.id);
      expect(data.completed_visits).toBeDefined();
    });
  });
});
