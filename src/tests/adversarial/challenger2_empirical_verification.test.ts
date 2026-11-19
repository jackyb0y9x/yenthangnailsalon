import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  mockStaffStore,
  getStaffList,
  getStaffById,
  INITIAL_STAFF_MEMBERS,
} from '@/lib/staff/staff-data';
import { removeVietnameseDiacritics, normalizeVietnamese } from '@/lib/utils/vietnamese';

// Route handlers under test
import { PUT as putStaffRoute } from '@/app/api/admin/staff/[id]/route';
import { PUT as putStaffStatusRoute } from '@/app/api/admin/staff/[id]/status/route';
import { PUT as putStaffSpecializationsRoute } from '@/app/api/admin/staff/[id]/specializations/route';

function createRequest(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: any,
  role?: 'super_admin' | 'manager' | 'staff' | string,
  isAuthenticated = true
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (isAuthenticated && role) {
    headers['Cookie'] = `sb-authenticated=true; sb-role=${role}; sb-email=${role}@glamournails.com.au`;
  } else if (!isAuthenticated) {
    headers['Cookie'] = 'sb-authenticated=false';
  }

  return new NextRequest(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('Challenger 2 Empirical Verification: RBAC, Privilege Escalation & Vietnamese Diacritics', () => {
  beforeEach(() => {
    mockStaffStore.reset();
  });

  // =========================================================================
  // Requirement 2: Stress test privilege escalation vectors on PUT /api/admin/staff/[id]
  // =========================================================================
  describe('Requirement 2: Privilege Escalation Vectors on PUT /api/admin/staff/[id]', () => {
    it('strictly rejects staff role users attempting any update via PUT /api/admin/staff/[id] with HTTP 403 Forbidden', async () => {
      const targetStaff = mockStaffStore.staff[2]; // Chloe Nguyen (stf-003, staff)
      const escalationPayloads = [
        { role: 'super_admin' },
        { role: 'manager' },
        { role: 'staff' },
        { full_name: 'Hacked Chloe', role: 'super_admin' },
        { full_name: 'Attempted Name Change Only' },
        { phone: '0499 999 999' },
      ];

      for (const payload of escalationPayloads) {
        const req = createRequest(
          `http://localhost:3000/api/admin/staff/${targetStaff.id}`,
          'PUT',
          payload,
          'staff'
        );
        const res = await putStaffRoute(req, { params: Promise.resolve({ id: targetStaff.id }) });
        expect(res.status, `Staff update with payload ${JSON.stringify(payload)} should return 403`).toBe(403);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.error).toContain('Forbidden');
      }

      // Confirm in-memory target staff record remains unchanged
      const current = await getStaffById(targetStaff.id);
      expect(current?.role).toBe('staff');
      expect(current?.full_name).toBe('Chloe Nguyen');
    });

    it('strictly rejects manager role users attempting to elevate roles to super_admin via PUT /api/admin/staff/[id] with HTTP 403 Forbidden', async () => {
      const targetStaff = mockStaffStore.staff[2]; // Chloe (staff)
      const req = createRequest(
        `http://localhost:3000/api/admin/staff/${targetStaff.id}`,
        'PUT',
        { role: 'super_admin', full_name: 'Chloe Super Admin' },
        'manager'
      );
      const res = await putStaffRoute(req, { params: Promise.resolve({ id: targetStaff.id }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Forbidden');

      // Target staff role must remain 'staff'
      const current = await getStaffById(targetStaff.id);
      expect(current?.role).toBe('staff');
    });

    it('rejects invalid or spoofed roles with HTTP 400 Bad Request when sent by authorized users', async () => {
      const targetStaff = mockStaffStore.staff[2];
      const req = createRequest(
        `http://localhost:3000/api/admin/staff/${targetStaff.id}`,
        'PUT',
        { role: 'god_mode_admin' },
        'super_admin'
      );
      const res = await putStaffRoute(req, { params: Promise.resolve({ id: targetStaff.id }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Invalid role');
    });

    it('permits super_admin to update staff details and roles successfully with HTTP 200', async () => {
      const targetStaff = mockStaffStore.staff[2]; // Chloe (staff)
      const req = createRequest(
        `http://localhost:3000/api/admin/staff/${targetStaff.id}`,
        'PUT',
        { role: 'manager', name: 'Chloe Promoted', full_name: 'Chloe Promoted' },
        'super_admin'
      );
      const res = await putStaffRoute(req, { params: Promise.resolve({ id: targetStaff.id }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.staff.role).toBe('manager');
      expect(json.staff.full_name).toBe('Chloe Promoted');
    });

    it('demonstrates bug: updating full_name without name fails to update staff name because formatStaff prioritizes stale s.name', async () => {
      const targetStaff = mockStaffStore.staff[3]; // Kevin Pham
      const req = createRequest(
        `http://localhost:3000/api/admin/staff/${targetStaff.id}`,
        'PUT',
        { full_name: 'Kevin Updated Name' },
        'super_admin'
      );
      const res = await putStaffRoute(req, { params: Promise.resolve({ id: targetStaff.id }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      // Notice: json.staff.full_name remains 'Kevin Pham' because formatStaff overwrites full_name with stale s.name
      expect(json.staff.full_name).toBe('Kevin Pham');
    });
  });

  // =========================================================================
  // Requirement 3: Stress test role authorization on /api/admin/staff/[id]/status
  // and /api/admin/staff/[id]/specializations
  // =========================================================================
  describe('Requirement 3: Role Authorization on Status and Specializations Endpoints', () => {
    it('strictly rejects staff role users on PUT /api/admin/staff/[id]/status with HTTP 403 Forbidden', async () => {
      const targetStaff = mockStaffStore.staff[0]; // Michelle (super_admin)
      const req = createRequest(
        `http://localhost:3000/api/admin/staff/${targetStaff.id}/status`,
        'PUT',
        { is_active: false },
        'staff'
      );
      const res = await putStaffStatusRoute(req, { params: Promise.resolve({ id: targetStaff.id }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Forbidden');

      // Staff status must remain active
      const current = await getStaffById(targetStaff.id);
      expect(current?.is_active).toBe(true);
    });

    it('rejects unauthenticated requests on PUT /api/admin/staff/[id]/status with HTTP 401', async () => {
      const targetStaff = mockStaffStore.staff[0];
      const req = createRequest(
        `http://localhost:3000/api/admin/staff/${targetStaff.id}/status`,
        'PUT',
        { is_active: false },
        undefined,
        false
      );
      const res = await putStaffStatusRoute(req, { params: Promise.resolve({ id: targetStaff.id }) });
      expect(res.status).toBe(401);
    });

    it('permits manager and super_admin on PUT /api/admin/staff/[id]/status with valid boolean payload', async () => {
      const targetStaff = mockStaffStore.staff[3]; // Kevin Pham (stf-004)
      const req = createRequest(
        `http://localhost:3000/api/admin/staff/${targetStaff.id}/status`,
        'PUT',
        { is_active: false },
        'manager'
      );
      const res = await putStaffStatusRoute(req, { params: Promise.resolve({ id: targetStaff.id }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.staff.is_active).toBe(false);

      // Re-activate with super_admin
      const reqAdmin = createRequest(
        `http://localhost:3000/api/admin/staff/${targetStaff.id}/status`,
        'PUT',
        { is_active: true },
        'super_admin'
      );
      const resAdmin = await putStaffStatusRoute(reqAdmin, { params: Promise.resolve({ id: targetStaff.id }) });
      expect(resAdmin.status).toBe(200);
      expect((await resAdmin.json()).staff.is_active).toBe(true);
    });

    it('rejects non-boolean is_active payloads with HTTP 400 Bad Request', async () => {
      const targetStaff = mockStaffStore.staff[3];
      const req = createRequest(
        `http://localhost:3000/api/admin/staff/${targetStaff.id}/status`,
        'PUT',
        { is_active: 'false' },
        'manager'
      );
      const res = await putStaffStatusRoute(req, { params: Promise.resolve({ id: targetStaff.id }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('is_active must be a boolean');
    });

    it('strictly rejects staff role users on PUT /api/admin/staff/[id]/specializations with HTTP 403 Forbidden', async () => {
      const targetStaff = mockStaffStore.staff[2]; // Chloe (staff)
      const req = createRequest(
        `http://localhost:3000/api/admin/staff/${targetStaff.id}/specializations`,
        'PUT',
        { specializations: ['SNS Dip', 'Russian Manicure'] },
        'staff'
      );
      const res = await putStaffSpecializationsRoute(req, { params: Promise.resolve({ id: targetStaff.id }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Forbidden');
    });

    it('rejects unauthenticated requests on PUT /api/admin/staff/[id]/specializations with HTTP 401', async () => {
      const targetStaff = mockStaffStore.staff[2];
      const req = createRequest(
        `http://localhost:3000/api/admin/staff/${targetStaff.id}/specializations`,
        'PUT',
        { specializations: ['SNS Dip'] },
        undefined,
        false
      );
      const res = await putStaffSpecializationsRoute(req, { params: Promise.resolve({ id: targetStaff.id }) });
      expect(res.status).toBe(401);
    });

    it('permits manager and super_admin on PUT /api/admin/staff/[id]/specializations', async () => {
      const targetStaff = mockStaffStore.staff[2];
      const newSpecs = ['Russian Manicure', '3D Nail Art', 'Ombre'];
      const req = createRequest(
        `http://localhost:3000/api/admin/staff/${targetStaff.id}/specializations`,
        'PUT',
        { specializations: newSpecs },
        'manager'
      );
      const res = await putStaffSpecializationsRoute(req, { params: Promise.resolve({ id: targetStaff.id }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.staff.specializations).toEqual(newSpecs);
    });

    it('rejects non-array specializations payloads with HTTP 400 Bad Request', async () => {
      const targetStaff = mockStaffStore.staff[2];
      const req = createRequest(
        `http://localhost:3000/api/admin/staff/${targetStaff.id}/specializations`,
        'PUT',
        { specializations: 'SNS Dip' },
        'manager'
      );
      const res = await putStaffSpecializationsRoute(req, { params: Promise.resolve({ id: targetStaff.id }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('specializations must be an array');
    });
  });

  // =========================================================================
  // Requirement 4: Verify staff directory search with Vietnamese diacritics
  // =========================================================================
  describe('Requirement 4: Staff Directory Search with Vietnamese Diacritics', () => {
    it('correctly strips Vietnamese diacritics and converts đ/Đ to d/D via removeVietnameseDiacritics', () => {
      expect(removeVietnameseDiacritics('Nguyễn Thị Mai')).toBe('Nguyen Thi Mai');
      expect(removeVietnameseDiacritics('Đặng Văn Lâm')).toBe('Dang Van Lam');
      expect(removeVietnameseDiacritics('đỗ mỹ linh')).toBe('do my linh');
      expect(removeVietnameseDiacritics('Phạm Quỳnh Anh')).toBe('Pham Quynh Anh');
      expect(removeVietnameseDiacritics('Vũ Thu Phương')).toBe('Vu Thu Phuong');
      expect(removeVietnameseDiacritics('Lê Hoàng')).toBe('Le Hoang');
    });

    it('matches staff members when searching with Vietnamese diacritics', async () => {
      // "Nguyễn" search must match Michelle Nguyen (stf-001) and Chloe Nguyen (stf-003)
      const resNguyen = await getStaffList({ search: 'Nguyễn' });
      expect(resNguyen.length).toBe(2);
      expect(resNguyen.some((s) => s.id === 'stf-001')).toBe(true);
      expect(resNguyen.some((s) => s.id === 'stf-003')).toBe(true);

      // "nguyen" unaccented search must also match the same two staff members
      const resNguyenAscii = await getStaffList({ search: 'nguyen' });
      expect(resNguyenAscii.length).toBe(2);

      // "Phạm" accented search must match Kevin Pham (stf-004)
      const resPham = await getStaffList({ search: 'Phạm' });
      expect(resPham.length).toBe(1);
      expect(resPham[0].id === 'stf-004').toBe(true);

      // "pham" unaccented search
      const resPhamAscii = await getStaffList({ search: 'pham' });
      expect(resPhamAscii.length).toBe(1);
      expect(resPhamAscii[0].id === 'stf-004').toBe(true);
    });

    it('matches staff members with multi-word out-of-order queries and diacritics', async () => {
      // Out of order: "Nguyen Chloe" vs "Chloe Nguyen"
      const resOutOrder1 = await getStaffList({ search: 'Nguyen Chloe' });
      expect(resOutOrder1.length).toBe(1);
      expect(resOutOrder1[0].id).toBe('stf-003');

      // Out of order with Vietnamese diacritics: "Nguyễn Chloe"
      const resOutOrder2 = await getStaffList({ search: 'Nguyễn Chloe' });
      expect(resOutOrder2.length).toBe(1);
      expect(resOutOrder2[0].id).toBe('stf-003');

      // Out of order with diacritics on both tokens: "Phạm Kevin"
      const resOutOrder3 = await getStaffList({ search: 'Phạm Kevin' });
      expect(resOutOrder3.length).toBe(1);
      expect(resOutOrder3[0].id).toBe('stf-004');
    });

    it('matches staff members via phone search with Australian national and international prefixes', async () => {
      // Chloe Nguyen: phone "0413 000 333"
      const resNational = await getStaffList({ search: '0413' });
      expect(resNational.some((s) => s.id === 'stf-003')).toBe(true);

      const resInternational = await getStaffList({ search: '+61 413' });
      expect(resInternational.some((s) => s.id === 'stf-003')).toBe(true);

      const resInternationalCompact = await getStaffList({ search: '+61413' });
      expect(resInternationalCompact.some((s) => s.id === 'stf-003')).toBe(true);
    });
  });
});
