import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import {
  canElevateRole,
  canAccessFinance,
  canMutateCMS,
  canAccessRoute,
  isValidRole,
  normalizeRole,
  USER_ROLES,
  type UserRole,
} from '@/lib/auth/roles';
import { PUT as putStaffRole } from '@/app/api/admin/staff/[id]/role/route';

describe('Adversarial RBAC Domain & Role Elevation Challenger Suite', () => {
  // ==========================================================================
  // Section 1: Invariant Verification in src/lib/auth/roles.ts
  // ==========================================================================
  describe('1. RBAC Domain Engine Function Invariants (src/lib/auth/roles.ts)', () => {
    it('invariant 1.1: canElevateRole("manager", "super_admin") MUST be false', () => {
      expect(canElevateRole('manager', 'super_admin')).toBe(false);
    });

    it('invariant 1.2: canElevateRole("super_admin", "super_admin") MUST be true', () => {
      expect(canElevateRole('super_admin', 'super_admin')).toBe(true);
    });

    it('invariant 1.3: canElevateRole("manager", "staff") MUST be true', () => {
      expect(canElevateRole('manager', 'staff')).toBe(true);
    });

    it('invariant 1.4: canElevateRole("staff", "super_admin") MUST be false', () => {
      expect(canElevateRole('staff', 'super_admin')).toBe(false);
    });

    it('invariant 1.5: canAccessFinance("staff") MUST be false', () => {
      expect(canAccessFinance('staff')).toBe(false);
    });

    it('invariant 1.6: canMutateCMS("staff") MUST be false', () => {
      expect(canMutateCMS('staff')).toBe(false);
    });

    it('invariant 1.7: validates full privilege matrix for canElevateRole across all defined roles', () => {
      // Super admin can assign any valid role
      expect(canElevateRole('super_admin', 'super_admin')).toBe(true);
      expect(canElevateRole('super_admin', 'manager')).toBe(true);
      expect(canElevateRole('super_admin', 'staff')).toBe(true);

      // Manager can assign manager or staff, but never super_admin
      expect(canElevateRole('manager', 'super_admin')).toBe(false);
      expect(canElevateRole('manager', 'manager')).toBe(true);
      expect(canElevateRole('manager', 'staff')).toBe(true);

      // Staff has zero delegation or elevation privilege
      expect(canElevateRole('staff', 'super_admin')).toBe(false);
      expect(canElevateRole('staff', 'manager')).toBe(false);
      expect(canElevateRole('staff', 'staff')).toBe(false);
    });

    it('invariant 1.8: rejects invalid, unknown, empty, or malicious roles in canElevateRole', () => {
      const hostileInputs = ['hacker', 'admin', 'root', 'GUEST', '', '   ', 'null', 'undefined'];

      for (const actor of hostileInputs) {
        for (const target of USER_ROLES) {
          expect(canElevateRole(actor, target)).toBe(false);
        }
      }

      for (const target of hostileInputs) {
        expect(canElevateRole('super_admin', target)).toBe(false);
        expect(canElevateRole('manager', target)).toBe(false);
        expect(canElevateRole('staff', target)).toBe(false);
      }

      // Null and undefined
      expect(canElevateRole(null, 'staff')).toBe(false);
      expect(canElevateRole('manager', null)).toBe(false);
      expect(canElevateRole(undefined, undefined)).toBe(false);
    });

    it('invariant 1.9: verifies case-insensitivity and whitespace normalization in canElevateRole', () => {
      expect(canElevateRole('  MANAGER  ', '  SUPER_ADMIN  ')).toBe(false);
      expect(canElevateRole('  MANAGER  ', '  STAFF  ')).toBe(true);
      expect(canElevateRole('  SUPER_ADMIN  ', '  SUPER_ADMIN  ')).toBe(true);
      expect(canElevateRole('  STAFF  ', '  STAFF  ')).toBe(false);
    });

    it('invariant 1.10: verifies isValidRole accurately discriminates valid and invalid roles', () => {
      expect(isValidRole('super_admin')).toBe(true);
      expect(isValidRole('manager')).toBe(true);
      expect(isValidRole('staff')).toBe(true);
      expect(isValidRole('SUPER_ADMIN')).toBe(true);
      expect(isValidRole('  manager  ')).toBe(true);

      expect(isValidRole('hacker')).toBe(false);
      expect(isValidRole('')).toBe(false);
      expect(isValidRole('   ')).toBe(false);
      expect(isValidRole(null)).toBe(false);
      expect(isValidRole(undefined)).toBe(false);
      expect(isValidRole(12345)).toBe(false);
      expect(isValidRole({})).toBe(false);
      expect(isValidRole(['super_admin'])).toBe(false);
    });

    it('invariant 1.11: verifies normalizeRole standardizes input and rejects non-roles', () => {
      expect(normalizeRole('super_admin')).toBe('super_admin');
      expect(normalizeRole('  SUPER_ADMIN  ')).toBe('super_admin');
      expect(normalizeRole('Manager')).toBe('manager');
      expect(normalizeRole('  staff  ')).toBe('staff');

      expect(normalizeRole('attacker')).toBeUndefined();
      expect(normalizeRole('')).toBeUndefined();
      expect(normalizeRole(null)).toBeUndefined();
      expect(normalizeRole(undefined)).toBeUndefined();
      expect(normalizeRole(123)).toBeUndefined();
    });

    it('invariant 1.12: verifies canMutateCMS and canAccessFinance privilege boundaries', () => {
      // Super admin & Manager have access
      expect(canMutateCMS('super_admin')).toBe(true);
      expect(canMutateCMS('manager')).toBe(true);
      expect(canAccessFinance('super_admin')).toBe(true);
      expect(canAccessFinance('manager')).toBe(true);

      // Staff is denied
      expect(canMutateCMS('staff')).toBe(false);
      expect(canAccessFinance('staff')).toBe(false);

      // Malicious or unrecognized roles are denied
      expect(canMutateCMS('attacker')).toBe(false);
      expect(canMutateCMS(null)).toBe(false);
      expect(canAccessFinance('attacker')).toBe(false);
      expect(canAccessFinance(undefined)).toBe(false);
    });

    it('invariant 1.13: verifies canAccessRoute route boundaries', () => {
      // Staff access
      expect(canAccessRoute('staff', '/admin/dashboard')).toBe(true);
      expect(canAccessRoute('staff', '/admin/customers')).toBe(true);
      expect(canAccessRoute('staff', '/admin/finance')).toBe(false);
      expect(canAccessRoute('staff', '/api/admin/finance')).toBe(false);
      expect(canAccessRoute('staff', '/api/admin/staff/stf-001/role')).toBe(false);
      expect(canAccessRoute('staff', '/api/admin/cms/hero')).toBe(false);

      // Manager access
      expect(canAccessRoute('manager', '/admin/finance')).toBe(true);
      expect(canAccessRoute('manager', '/api/admin/cms/hero')).toBe(true);
      // Staff role modification route requires super_admin
      expect(canAccessRoute('manager', '/api/admin/staff/stf-001/role')).toBe(false);

      // Super admin access
      expect(canAccessRoute('super_admin', '/admin/finance')).toBe(true);
      expect(canAccessRoute('super_admin', '/api/admin/staff/stf-001/role')).toBe(true);

      // Unauthenticated access
      expect(canAccessRoute(null, '/admin/dashboard')).toBe(false);
      expect(canAccessRoute(null, '/admin/login')).toBe(true);
      expect(canAccessRoute(null, '/en/services')).toBe(true);
    });
  });

  // ==========================================================================
  // Section 2: Empirical Testing of PUT /api/admin/staff/[id]/role
  // ==========================================================================
  describe('2. Endpoint Elevation Attacks: PUT /api/admin/staff/[id]/role', () => {
    it('2.1: anonymous user attempting to set any role MUST return HTTP 401 Unauthorized', async () => {
      // 1. Missing session cookie completely
      const reqAnon1 = new NextRequest('http://localhost:3000/api/admin/staff/stf-002/role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'super_admin' }),
      });
      const resAnon1 = await putStaffRole(reqAnon1, { params: Promise.resolve({ id: 'stf-002' }) });
      expect(resAnon1.status).toBe(401);
      const json1 = await resAnon1.json();
      expect(json1.success).toBe(false);
      expect(json1.error).toContain('Unauthorized');

      // 2. Tampered cookie sb-authenticated=false
      const reqAnon2 = new NextRequest('http://localhost:3000/api/admin/staff/stf-002/role', {
        method: 'PUT',
        headers: {
          Cookie: 'sb-authenticated=false; sb-role=super_admin',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'manager' }),
      });
      const resAnon2 = await putStaffRole(reqAnon2, { params: Promise.resolve({ id: 'stf-002' }) });
      expect(resAnon2.status).toBe(401);
      const json2 = await resAnon2.json();
      expect(json2.success).toBe(false);
      expect(json2.error).toContain('Unauthorized');
    });

    it('2.2: staff role attempting to set ANY role MUST return HTTP 403 Forbidden', async () => {
      const rolesToTest: UserRole[] = ['super_admin', 'manager', 'staff'];

      for (const targetRole of rolesToTest) {
        const req = new NextRequest('http://localhost:3000/api/admin/staff/stf-002/role', {
          method: 'PUT',
          headers: {
            Cookie: 'sb-authenticated=true; sb-role=staff; sb-email=staff@glamournails.com.au',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role: targetRole }),
        });

        const res = await putStaffRole(req, { params: Promise.resolve({ id: 'stf-002' }) });
        expect(res.status).toBe(403);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.error).toBe('Forbidden: Only super_admin can modify staff roles or elevate to super_admin');
      }
    });

    it('2.3: manager role attempting to set role: "super_admin" MUST return HTTP 403 Forbidden', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/staff/stf-002/role', {
        method: 'PUT',
        headers: {
          Cookie: 'sb-authenticated=true; sb-role=manager; sb-email=manager@glamournails.com.au',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'super_admin' }),
      });

      const res = await putStaffRole(req, { params: Promise.resolve({ id: 'stf-002' }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Forbidden: Only super_admin can modify staff roles or elevate to super_admin');
    });

    it('2.4: manager role attempting to set uppercase "SUPER_ADMIN" or padded " super_admin " MUST return HTTP 403 Forbidden', async () => {
      const variations = ['SUPER_ADMIN', ' super_admin ', 'Super_Admin'];

      for (const roleVar of variations) {
        const req = new NextRequest('http://localhost:3000/api/admin/staff/stf-002/role', {
          method: 'PUT',
          headers: {
            Cookie: 'sb-authenticated=true; sb-role=manager; sb-email=manager@glamournails.com.au',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role: roleVar }),
        });

        const res = await putStaffRole(req, { params: Promise.resolve({ id: 'stf-002' }) });
        expect(res.status).toBe(403);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.error).toBe('Forbidden: Only super_admin can modify staff roles or elevate to super_admin');
      }
    });

    it('2.5: super admin role setting any valid role MUST return HTTP 200 OK', async () => {
      const targetRoles: UserRole[] = ['super_admin', 'manager', 'staff'];

      for (const role of targetRoles) {
        const req = new NextRequest('http://localhost:3000/api/admin/staff/stf-002/role', {
          method: 'PUT',
          headers: {
            Cookie: 'sb-authenticated=true; sb-role=super_admin; sb-email=admin@glamournails.com.au',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role }),
        });

        const res = await putStaffRole(req, { params: Promise.resolve({ id: 'stf-002' }) });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.staff).toBeDefined();
        expect(json.staff.id).toBe('stf-002');
        expect(json.staff.role).toBe(role);
        expect(json.staff.updated_at).toBeDefined();
      }
    });

    it('2.6: invalid role string MUST return HTTP 400 Bad Request with "Invalid or missing role parameter"', async () => {
      const invalidRoles = ['hacker', '', '   ', 'admin', 'root', 'ceo', 'null', 'owner'];

      for (const invRole of invalidRoles) {
        const req = new NextRequest('http://localhost:3000/api/admin/staff/stf-002/role', {
          method: 'PUT',
          headers: {
            Cookie: 'sb-authenticated=true; sb-role=super_admin; sb-email=admin@glamournails.com.au',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role: invRole }),
        });

        const res = await putStaffRole(req, { params: Promise.resolve({ id: 'stf-002' }) });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.error).toBe('Invalid or missing role parameter');
      }
    });

    it('2.7: missing or non-string role types in payload MUST return HTTP 400 Bad Request', async () => {
      const badBodies = [
        {},
        { role: null },
        { role: undefined },
        { role: 12345 },
        { role: true },
        { role: ['super_admin'] },
        { other_field: 'value' },
      ];

      for (const body of badBodies) {
        const req = new NextRequest('http://localhost:3000/api/admin/staff/stf-002/role', {
          method: 'PUT',
          headers: {
            Cookie: 'sb-authenticated=true; sb-role=super_admin; sb-email=admin@glamournails.com.au',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        const res = await putStaffRole(req, { params: Promise.resolve({ id: 'stf-002' }) });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.error).toBe('Invalid or missing role parameter');
      }
    });

    it('2.8: malformed JSON payload MUST return HTTP 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/staff/stf-002/role', {
        method: 'PUT',
        headers: {
          Cookie: 'sb-authenticated=true; sb-role=super_admin; sb-email=admin@glamournails.com.au',
          'Content-Type': 'application/json',
        },
        body: '{ malformed json: not valid',
      });

      const res = await putStaffRole(req, { params: Promise.resolve({ id: 'stf-002' }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Malformed JSON payload');
    });

    it('2.9: untrusted or hostile staff ID in URL parameter is safely handled', async () => {
      const testIds = [
        'stf-999',
        '00000000-0000-0000-0000-000000000000',
        'stf-with-special-chars-@!#$',
        '../../backdoor',
      ];

      for (const id of testIds) {
        const req = new NextRequest(`http://localhost:3000/api/admin/staff/${encodeURIComponent(id)}/role`, {
          method: 'PUT',
          headers: {
            Cookie: 'sb-authenticated=true; sb-role=super_admin; sb-email=admin@glamournails.com.au',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role: 'staff' }),
        });

        const res = await putStaffRole(req, { params: Promise.resolve({ id }) });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.staff.id).toBe(id);
      }
    });
  });
});
