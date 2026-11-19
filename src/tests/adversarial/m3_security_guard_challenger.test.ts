import { describe, it, expect } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { middleware, getSessionFromRequest } from '@/middleware';
import { POST as postLogin } from '@/app/api/auth/login/route';
import { POST as postLogout } from '@/app/api/auth/logout/route';
import { GET as getHero, POST as postHero } from '@/app/api/admin/cms/hero/route';
import { GET as getAnnouncement, POST as postAnnouncement } from '@/app/api/admin/cms/announcement/route';
import { GET as getHours, POST as postHours } from '@/app/api/admin/cms/hours/route';
import { GET as getBusinessInfo, POST as postBusinessInfo } from '@/app/api/admin/cms/business-info/route';
import { GET as getServices, POST as postService } from '@/app/api/admin/services/route';
import { PUT as putService, DELETE as deleteService } from '@/app/api/admin/services/[id]/route';
import { GET as getGallery, POST as postGallery } from '@/app/api/admin/gallery/route';
import { PUT as putGallery, DELETE as deleteGallery } from '@/app/api/admin/gallery/[id]/route';
import { POST as postUpload } from '@/app/api/admin/upload/route';
import { PUT as putStaffRole } from '@/app/api/admin/staff/[id]/role/route';
import { canElevateRole, canMutateCMS, canAccessFinance, canAccessRoute } from '@/lib/auth/roles';

describe('Adversarial Security & Guard Challenger Suite (Milestone 3)', () => {
  // ==========================================================================
  // 1. Synchronous Middleware Invariant Verification
  // ==========================================================================
  describe('1. Middleware Synchronous Invariant', () => {
    it('returns a direct NextResponse synchronously (not a Promise or thenable)', () => {
      const req = new NextRequest('http://localhost:3000/admin/dashboard');
      const res = middleware(req);

      expect(res).toBeDefined();
      expect(res instanceof NextResponse).toBe(true);
      expect((res as any).then).toBeUndefined();
      expect(res.status).toBe(307);
    });

    it('returns synchronous response across various admin and public route patterns', () => {
      const testPaths = [
        'http://localhost:3000/admin',
        'http://localhost:3000/admin/',
        'http://localhost:3000/admin/login',
        'http://localhost:3000/admin/finance',
        'http://localhost:3000/api/admin/services',
        'http://localhost:3000/api/admin/finance',
        'http://localhost:3000/',
        'http://localhost:3000/en/services',
        'http://localhost:3000/vi/gallery',
      ];

      for (const path of testPaths) {
        const req = new NextRequest(path);
        const res = middleware(req);
        expect(res).toBeDefined();
        expect((res as any).then).toBeUndefined();
      }
    });
  });

  // ==========================================================================
  // 2. Cookie Forgery, Tampering & Session Boundary Attacks
  // ==========================================================================
  describe('2. Cookie Forgery & Tampering Resilience', () => {
    it('redirects forged cookie sb-authenticated=false; sb-role=super_admin to /admin/login with HTTP 307', () => {
      const req = new NextRequest('http://localhost:3000/admin/dashboard', {
        headers: { Cookie: 'sb-authenticated=false; sb-role=super_admin' },
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/admin/login');
    });

    it('redirects forged cookie sb-authenticated=false on /admin/cms, /admin/customers, /admin/staff, /admin/finance', () => {
      const paths = ['/admin/cms', '/admin/customers', '/admin/staff', '/admin/finance'];
      for (const p of paths) {
        const req = new NextRequest(`http://localhost:3000${p}`, {
          headers: { Cookie: 'sb-authenticated=false; sb-role=super_admin; sb-email=admin@glamournails.com.au' },
        });
        const res = middleware(req);
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe('http://localhost:3000/admin/login');
      }
    });

    it('treats invalid sb-authenticated values (e.g. "0", "no", "null", "undefined", "1") as unauthenticated', () => {
      const invalidValues = ['0', 'no', 'null', 'undefined', '1', 'TRUE', 'True', 'admin'];
      for (const val of invalidValues) {
        const req = new NextRequest('http://localhost:3000/admin/dashboard', {
          headers: { Cookie: `sb-authenticated=${val}; sb-role=super_admin` },
        });
        const res = middleware(req);
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe('http://localhost:3000/admin/login');
      }
    });

    it('handles malformed JWT token in sb-auth-token gracefully and redirects to /admin/login', () => {
      const malformedJwts = [
        'invalid.jwt.token',
        'not-a-jwt',
        'eyJhbGciOiJIUzI1NiJ9.INVALID_PAYLOAD.signature',
        'eyJhbGciOiJIUzI1NiJ9..signature',
      ];
      for (const jwt of malformedJwts) {
        const req = new NextRequest('http://localhost:3000/admin/dashboard', {
          headers: { Cookie: `sb-access-token=${jwt}` },
        });
        const res = middleware(req);
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe('http://localhost:3000/admin/login');
      }
    });

    it('rejects expired Supabase JWT token and redirects to /admin/login', () => {
      const expiredPayload = Buffer.from(
        JSON.stringify({
          sub: 'usr-expired',
          email: 'admin@glamournails.com.au',
          exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
          app_metadata: { role: 'super_admin' },
        })
      ).toString('base64');
      const expiredJwt = `header.${expiredPayload}.signature`;

      const req = new NextRequest('http://localhost:3000/admin/dashboard', {
        headers: { Cookie: `sb-project-auth-token=${expiredJwt}` },
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/admin/login');
    });

    it('accepts valid unexpired Supabase JWT token and extracts role', () => {
      const validPayload = Buffer.from(
        JSON.stringify({
          sub: 'usr-valid',
          email: 'admin@glamournails.com.au',
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour in future
          user_metadata: { role: 'super_admin' },
        })
      ).toString('base64');
      const validJwt = `header.${validPayload}.signature`;

      const req = new NextRequest('http://localhost:3000/admin/dashboard', {
        headers: { Cookie: `sb-project-auth-token=${validJwt}` },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
    });
  });

  // ==========================================================================
  // 3. Unauthenticated Route Access Protection
  // ==========================================================================
  describe('3. Unauthenticated Access Protection on All Admin Routes', () => {
    const protectedPaths = [
      '/admin',
      '/admin/',
      '/admin/dashboard',
      '/admin/cms',
      '/admin/customers',
      '/admin/staff',
      '/admin/finance',
      '/admin/cms/hero',
      '/admin/finance/reports',
      '/admin/settings',
    ];

    for (const path of protectedPaths) {
      it(`redirects unauthenticated access to ${path} to /admin/login (HTTP 307)`, () => {
        const req = new NextRequest(`http://localhost:3000${path}`);
        const res = middleware(req);
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe('http://localhost:3000/admin/login');
      });
    }
  });

  // ==========================================================================
  // 4. Infinite Loop Prevention & Authenticated Redirection on /admin/login
  // ==========================================================================
  describe('4. /admin/login Infinite Loop Prevention & Redirection', () => {
    it('unauthenticated access to /admin/login returns HTTP 200 (never redirects)', () => {
      const req = new NextRequest('http://localhost:3000/admin/login');
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('authenticated user (super_admin) accessing /admin/login redirects to /admin/dashboard (HTTP 307)', () => {
      const req = new NextRequest('http://localhost:3000/admin/login', {
        headers: { Cookie: 'sb-authenticated=true; sb-role=super_admin' },
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/admin/dashboard');
    });

    it('authenticated user (manager) accessing /admin/login redirects to /admin/dashboard (HTTP 307)', () => {
      const req = new NextRequest('http://localhost:3000/admin/login', {
        headers: { Cookie: 'sb-authenticated=true; sb-role=manager' },
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/admin/dashboard');
    });

    it('authenticated user (staff) accessing /admin/login redirects to /admin/dashboard (HTTP 307)', () => {
      const req = new NextRequest('http://localhost:3000/admin/login', {
        headers: { Cookie: 'sb-authenticated=true; sb-role=staff' },
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/admin/dashboard');
    });
  });

  // ==========================================================================
  // 5. Staff Role Boundary on Finance (/admin/finance)
  // ==========================================================================
  describe('5. Staff Role Barrier on Financial Module (/admin/finance)', () => {
    it('returns exact HTTP 403 Forbidden with exact body and HTML Content-Type for staff role', async () => {
      const req = new NextRequest('http://localhost:3000/admin/finance', {
        headers: { Cookie: 'sb-authenticated=true; sb-role=staff' },
      });
      const res = middleware(req);

      expect(res.status).toBe(403);
      expect(res.headers.get('content-type')).toContain('text/html');
      const bodyText = await res.text();
      expect(bodyText).toBe('<h1>403 Forbidden - Staff role not authorized to view financial records</h1>');
    });

    it('blocks sub-paths of /admin/finance for staff role with HTTP 403', async () => {
      const subpaths = [
        '/admin/finance/',
        '/admin/finance/reports',
        '/admin/finance/tax-summary',
        '/admin/finance/transactions',
      ];

      for (const sp of subpaths) {
        const req = new NextRequest(`http://localhost:3000${sp}`, {
          headers: { Cookie: 'sb-authenticated=true; sb-role=staff' },
        });
        const res = middleware(req);
        expect(res.status).toBe(403);
        const bodyText = await res.text();
        expect(bodyText).toBe('<h1>403 Forbidden - Staff role not authorized to view financial records</h1>');
      }
    });

    it('allows manager role to access /admin/finance (HTTP 200)', () => {
      const req = new NextRequest('http://localhost:3000/admin/finance', {
        headers: { Cookie: 'sb-authenticated=true; sb-role=manager' },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
    });

    it('allows super_admin role to access /admin/finance (HTTP 200)', () => {
      const req = new NextRequest('http://localhost:3000/admin/finance', {
        headers: { Cookie: 'sb-authenticated=true; sb-role=super_admin' },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
    });
  });

  // ==========================================================================
  // 6. Direct API Protection (/api/admin/*)
  // ==========================================================================
  describe('6. Direct Admin API Protection (/api/admin/*)', () => {
    const adminApiPaths = [
      '/api/admin/services',
      '/api/admin/gallery',
      '/api/admin/cms/hero',
      '/api/admin/cms/announcement',
      '/api/admin/cms/hours',
      '/api/admin/cms/business-info',
      '/api/admin/upload',
      '/api/admin/finance',
      '/api/admin/customers',
    ];

    for (const path of adminApiPaths) {
      it(`blocks unauthenticated request to ${path} with HTTP 401 Unauthorized`, async () => {
        const req = new NextRequest(`http://localhost:3000${path}`);
        const res = middleware(req);
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toContain('Unauthorized');
      });

      it(`blocks forged cookie sb-authenticated=false to ${path} with HTTP 401 Unauthorized`, async () => {
        const req = new NextRequest(`http://localhost:3000${path}`, {
          headers: { Cookie: 'sb-authenticated=false; sb-role=super_admin' },
        });
        const res = middleware(req);
        expect(res.status).toBe(401);
      });
    }

    it('blocks staff role from accessing /api/admin/finance with HTTP 403 Forbidden at middleware level', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/finance', {
        headers: { Cookie: 'sb-authenticated=true; sb-role=staff' },
      });
      const res = middleware(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Staff role not authorized');
    });
  });

  // ==========================================================================
  // 7. Staff Mutation Blocking on All CMS, Services & Gallery Endpoints
  // ==========================================================================
  describe('7. Staff Mutation Blocking (HTTP 403 Forbidden)', () => {
    const staffCookie = { Cookie: 'sb-authenticated=true; sb-role=staff' };

    it('denies staff POST /api/admin/cms/hero with HTTP 403', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/cms/hero', {
        method: 'POST',
        headers: { ...staffCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline_en: 'Staff Attempt' }),
      });
      const res = await postHero(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Forbidden');
    });

    it('denies staff POST /api/admin/cms/announcement with HTTP 403', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/cms/announcement', {
        method: 'POST',
        headers: { ...staffCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_en: 'Staff Announcement' }),
      });
      const res = await postAnnouncement(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Forbidden');
    });

    it('denies staff POST /api/admin/cms/hours with HTTP 403', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/cms/hours', {
        method: 'POST',
        headers: { ...staffCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ holiday_notice_active: true }),
      });
      const res = await postHours(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Forbidden');
    });

    it('denies staff POST /api/admin/cms/business-info with HTTP 403', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/cms/business-info', {
        method: 'POST',
        headers: { ...staffCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ salon_name: 'Staff Renaming' }),
      });
      const res = await postBusinessInfo(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Forbidden');
    });

    it('denies staff POST /api/admin/services with HTTP 403', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/services', {
        method: 'POST',
        headers: { ...staffCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_en: 'Staff Service', price_cents: 2500 }),
      });
      const res = await postService(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Forbidden');
    });

    it('denies staff PUT /api/admin/services/[id] with HTTP 403', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/services/srv-001', {
        method: 'PUT',
        headers: { ...staffCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_cents: 9999 }),
      });
      const res = await putService(req, { params: Promise.resolve({ id: 'srv-001' }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Forbidden');
    });

    it('denies staff DELETE /api/admin/services/[id] with HTTP 403', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/services/srv-001', {
        method: 'DELETE',
        headers: staffCookie,
      });
      const res = await deleteService(req, { params: Promise.resolve({ id: 'srv-001' }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Forbidden');
    });

    it('denies staff POST /api/admin/gallery with HTTP 403', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/gallery', {
        method: 'POST',
        headers: { ...staffCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title_en: 'Staff Pic', image_url: 'https://images.unsplash.com/test.jpg' }),
      });
      const res = await postGallery(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Forbidden');
    });

    it('denies staff PUT /api/admin/gallery/[id] with HTTP 403', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/gallery/gal-001', {
        method: 'PUT',
        headers: { ...staffCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: true }),
      });
      const res = await putGallery(req, { params: Promise.resolve({ id: 'gal-001' }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Forbidden');
    });

    it('denies staff DELETE /api/admin/gallery/[id] with HTTP 403', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/gallery/gal-001', {
        method: 'DELETE',
        headers: staffCookie,
      });
      const res = await deleteGallery(req, { params: Promise.resolve({ id: 'gal-001' }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Forbidden');
    });

    it('allows manager and super_admin to perform mutations on CMS', async () => {
      const managerReq = new NextRequest('http://localhost:3000/api/admin/cms/hero', {
        method: 'POST',
        headers: {
          Cookie: 'sb-authenticated=true; sb-role=manager',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ headline_en: 'Manager Updated Hero' }),
      });
      const managerRes = await postHero(managerReq);
      expect(managerRes.status).toBe(200);

      const superReq = new NextRequest('http://localhost:3000/api/admin/cms/hero', {
        method: 'POST',
        headers: {
          Cookie: 'sb-authenticated=true; sb-role=super_admin',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ headline_en: 'Super Admin Hero' }),
      });
      const superRes = await postHero(superReq);
      expect(superRes.status).toBe(200);
    });

    it('denies staff role attempting to update staff role via PUT /api/admin/staff/[id]/role (HTTP 403)', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/staff/stf-003/role', {
        method: 'PUT',
        headers: {
          Cookie: 'sb-authenticated=true; sb-role=staff; sb-email=technician@glamournails.com.au',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'manager' }),
      });
      const res = await putStaffRole(req, { params: Promise.resolve({ id: 'stf-003' }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Only super_admin');
    });

    it('denies manager role attempting to elevate staff to super_admin via PUT /api/admin/staff/[id]/role (HTTP 403)', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/staff/stf-003/role', {
        method: 'PUT',
        headers: {
          Cookie: 'sb-authenticated=true; sb-role=manager; sb-email=manager@glamournails.com.au',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'super_admin' }),
      });
      const res = await putStaffRole(req, { params: Promise.resolve({ id: 'stf-003' }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Only super_admin');
    });

    it('allows super_admin role to update staff role via PUT /api/admin/staff/[id]/role (HTTP 200)', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/staff/stf-003/role', {
        method: 'PUT',
        headers: {
          Cookie: 'sb-authenticated=true; sb-role=super_admin; sb-email=admin@glamournails.com.au',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'manager' }),
      });
      const res = await putStaffRole(req, { params: Promise.resolve({ id: 'stf-003' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.staff.role).toBe('manager');
    });
  });

  // ==========================================================================
  // 8. Login Endpoint Adversarial Testing (/api/auth/login)
  // ==========================================================================
  describe('8. Login Endpoint Adversarial & Fuzzing Tests (/api/auth/login)', () => {
    it('rejects unknown users with HTTP 401 and generic error', async () => {
      const unknownEmails = [
        'attacker@evil.com',
        'nonexistent@glamournails.com.au',
        'admin@otherdomain.com',
        'root@localhost',
      ];

      for (const email of unknownEmails) {
        const req = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'AnyPassword123!' }),
        });
        const res = await postLogin(req);
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.error).toContain('Invalid login credentials');
      }
    });

    it('rejects arbitrary unauthorized passwords with HTTP 401 across all staff accounts', async () => {
      const unauthorizedPasswords = [
        '12345',
        'hacked',
        'random-str-99',
        'password',
        'admin123',
        'wrongpassword',
        'invalid',
        'Password123',
        'admin',
        'completely-wrong-attacker-password-12345!',
        'SalonAdmin2025!',
        'SecurePassword2025!',
      ];

      const validEmails = [
        'admin@glamournails.com.au',
        'manager@glamournails.com.au',
        'technician@glamournails.com.au',
        'kevin.senior@glamournails.com.au',
      ];

      for (const email of validEmails) {
        for (const password of unauthorizedPasswords) {
          const req = new NextRequest('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const res = await postLogin(req);
          expect(res.status).toBe(401);
          const json = await res.json();
          expect(json.success).toBe(false);
          expect(json.error).toBe('Invalid login credentials.');
          // Ensure zero session cookies are set on failure
          expect(res.cookies.get('sb-authenticated')).toBeUndefined();
        }
      }
    });

    it('authenticates valid users with authentic passwords and sets correct role cookies', async () => {
      const testCases = [
        { email: 'admin@glamournails.com.au', password: 'SalonAdmin2026!', expectedRole: 'super_admin', expectedId: 'stf-001' },
        { email: 'admin@glamournails.com.au', password: 'SecurePassword2026!', expectedRole: 'super_admin', expectedId: 'stf-001' },
        { email: 'manager@glamournails.com.au', password: 'SalonManager2026!', expectedRole: 'manager', expectedId: 'stf-002' },
        { email: 'manager@glamournails.com.au', password: 'SecurePassword2026!', expectedRole: 'manager', expectedId: 'stf-002' },
        { email: 'technician@glamournails.com.au', password: 'SalonTech2026!', expectedRole: 'staff', expectedId: 'stf-003' },
        { email: 'technician@glamournails.com.au', password: 'SecurePassword2026!', expectedRole: 'staff', expectedId: 'stf-003' },
        { email: 'kevin.senior@glamournails.com.au', password: 'SalonSenior2026!', expectedRole: 'staff', expectedId: 'stf-004' },
        { email: 'kevin.senior@glamournails.com.au', password: 'SecurePassword2026!', expectedRole: 'staff', expectedId: 'stf-004' },
      ];

      for (const tc of testCases) {
        const req = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: tc.email, password: tc.password }),
        });
        const res = await postLogin(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.user.email).toBe(tc.email);
        expect(json.user.role).toBe(tc.expectedRole);

        const authCookie = res.cookies.get('sb-authenticated');
        const roleCookie = res.cookies.get('sb-role');
        const emailCookie = res.cookies.get('sb-email');
        const idCookie = res.cookies.get('sb-id');

        expect(authCookie?.value).toBe('true');
        expect(roleCookie?.value).toBe(tc.expectedRole);
        expect(emailCookie?.value).toBe(tc.email);
        expect(idCookie?.value).toBe(tc.expectedId);
      }
    });

    it('rejects malformed payloads with HTTP 400 Bad Request', async () => {
      const malformedBodies = [
        'not a json string',
        '{ invalid json',
        '',
        '{"email": }',
      ];

      for (const body of malformedBodies) {
        const req = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
        const res = await postLogin(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.error).toContain('Malformed JSON');
      }
    });

    it('rejects missing or empty fields with HTTP 400 Bad Request', async () => {
      const invalidPayloads = [
        {},
        { email: '' },
        { email: '   ' },
        { password: 'Password123!' },
        { email: 'admin@glamournails.com.au' },
        { email: 'admin@glamournails.com.au', password: '' },
        { email: 'admin@glamournails.com.au', password: '   ' },
        { email: null, password: 'Password123!' },
        { email: 12345, password: 'Password123!' },
      ];

      for (const payload of invalidPayloads) {
        const req = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const res = await postLogin(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.success).toBe(false);
      }
    });

    it('sanitizes email with mixed case and leading/trailing whitespace', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: '  \t  Manager@GlamourNails.COM.au \n ',
          password: 'SalonManager2026!',
        }),
      });
      const res = await postLogin(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.user.email).toBe('manager@glamournails.com.au');
      expect(json.user.role).toBe('manager');
    });

    it('sets secure HttpOnly session cookies with 24 hour maxAge', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@glamournails.com.au',
          password: 'SalonAdmin2026!',
        }),
      });
      const res = await postLogin(req);
      expect(res.status).toBe(200);

      const authCookie = res.cookies.get('sb-authenticated');
      const roleCookie = res.cookies.get('sb-role');
      const emailCookie = res.cookies.get('sb-email');
      const idCookie = res.cookies.get('sb-id');

      expect(authCookie?.value).toBe('true');
      expect(roleCookie?.value).toBe('super_admin');
      expect(emailCookie?.value).toBe('admin@glamournails.com.au');
      expect(idCookie?.value).toBe('stf-001');
    });
  });

  // ==========================================================================
  // 9. Logout Security & Cookie Clearance (/api/auth/logout)
  // ==========================================================================
  describe('9. Logout Security & Cookie Invalidation (/api/auth/logout)', () => {
    it('clears all session cookies with expired epoch and maxAge=0', async () => {
      const res = await postLogout();
      expect(res.status).toBe(200);

      const clearedAuth = res.cookies.get('sb-authenticated');
      const clearedRole = res.cookies.get('sb-role');
      const clearedEmail = res.cookies.get('sb-email');
      const clearedId = res.cookies.get('sb-id');

      expect(clearedAuth?.value).toBe('');
      expect(clearedRole?.value).toBe('');
      expect(clearedEmail?.value).toBe('');
      expect(clearedId?.value).toBe('');
    });
  });

  // ==========================================================================
  // 10. Direct Upload Security Validation (/api/admin/upload)
  // ==========================================================================
  describe('10. Admin Upload Security Constraints (/api/admin/upload)', () => {
    it('rejects unauthenticated file upload with HTTP 401', async () => {
      const formData = new FormData();
      formData.append('file', new File(['dummy'], 'sample.jpg', { type: 'image/jpeg' }));
      formData.append('bucket', 'salon_cms');

      const req = new NextRequest('http://localhost:3000/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const res = await postUpload(req);
      expect(res.status).toBe(401);
    });

    it('rejects unauthorized storage bucket names with HTTP 400', async () => {
      const formData = new FormData();
      formData.append('file', new File(['dummy'], 'sample.jpg', { type: 'image/jpeg' }));
      formData.append('bucket', 'private_customer_data');

      const req = new NextRequest('http://localhost:3000/api/admin/upload', {
        method: 'POST',
        headers: { Cookie: 'sb-authenticated=true; sb-role=manager' },
        body: formData,
      });
      const res = await postUpload(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Invalid storage bucket');
    });

    it('rejects non-image MIME types (e.g. text/html, application/x-php) with HTTP 400', async () => {
      const invalidTypes = [
        { type: 'text/html', name: 'evil.html' },
        { type: 'application/javascript', name: 'payload.js' },
        { type: 'application/x-sh', name: 'hack.sh' },
        { type: 'application/pdf', name: 'doc.pdf' },
      ];

      for (const item of invalidTypes) {
        const formData = new FormData();
        formData.append('file', new File(['alert(1)'], item.name, { type: item.type }));
        formData.append('bucket', 'salon_cms');

        const req = new NextRequest('http://localhost:3000/api/admin/upload', {
          method: 'POST',
          headers: { Cookie: 'sb-authenticated=true; sb-role=manager' },
          body: formData,
        });
        const res = await postUpload(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain('Invalid file type');
      }
    });

    it('rejects oversized files exceeding 5MB for salon_cms bucket with HTTP 400', async () => {
      const oversizedBuffer = new Uint8Array(6 * 1024 * 1024); // 6MB
      const file = new File([oversizedBuffer], 'giant.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'salon_cms');

      const req = new NextRequest('http://localhost:3000/api/admin/upload', {
        method: 'POST',
        headers: { Cookie: 'sb-authenticated=true; sb-role=manager' },
        body: formData,
      });
      const res = await postUpload(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('exceeds maximum allowed limit');
    });
  });

  // ==========================================================================
  // 11. Role-Based Access Control (RBAC) Invariant Stress Tests
  // ==========================================================================
  describe('11. Role-Based Access Control (RBAC) Invariant Rules', () => {
    it('enforces that manager can never elevate anyone to super_admin', () => {
      expect(canElevateRole('manager', 'super_admin')).toBe(false);
      expect(canElevateRole('manager', 'manager')).toBe(true);
      expect(canElevateRole('manager', 'staff')).toBe(true);
    });

    it('enforces that staff can never elevate or assign any role', () => {
      expect(canElevateRole('staff', 'super_admin')).toBe(false);
      expect(canElevateRole('staff', 'manager')).toBe(false);
      expect(canElevateRole('staff', 'staff')).toBe(false);
    });

    it('enforces that super_admin can assign any role', () => {
      expect(canElevateRole('super_admin', 'super_admin')).toBe(true);
      expect(canElevateRole('super_admin', 'manager')).toBe(true);
      expect(canElevateRole('super_admin', 'staff')).toBe(true);
    });

    it('enforces that invalid or missing roles return false for role elevation', () => {
      expect(canElevateRole(null, 'manager')).toBe(false);
      expect(canElevateRole(undefined, 'manager')).toBe(false);
      expect(canElevateRole('unknown', 'manager')).toBe(false);
      expect(canElevateRole('manager', 'invalid_role')).toBe(false);
    });

    it('enforces CMS mutation boundaries strictly: staff=false, manager=true, super_admin=true', () => {
      expect(canMutateCMS('staff')).toBe(false);
      expect(canMutateCMS('manager')).toBe(true);
      expect(canMutateCMS('super_admin')).toBe(true);
      expect(canMutateCMS('unknown')).toBe(false);
      expect(canMutateCMS(null)).toBe(false);
    });

    it('enforces Finance access boundaries strictly: staff=false, manager=true, super_admin=true', () => {
      expect(canAccessFinance('staff')).toBe(false);
      expect(canAccessFinance('manager')).toBe(true);
      expect(canAccessFinance('super_admin')).toBe(true);
      expect(canAccessFinance('unknown')).toBe(false);
      expect(canAccessFinance(null)).toBe(false);
    });

    it('enforces centralized route guarding rules via canAccessRoute', () => {
      expect(canAccessRoute('staff', '/admin/finance')).toBe(false);
      expect(canAccessRoute('manager', '/admin/finance')).toBe(true);
      expect(canAccessRoute('super_admin', '/admin/finance')).toBe(true);

      expect(canAccessRoute('staff', '/api/admin/finance')).toBe(false);
      expect(canAccessRoute('manager', '/api/admin/finance')).toBe(true);

      expect(canAccessRoute('staff', '/api/admin/staff/stf-001/role')).toBe(false);
      expect(canAccessRoute('manager', '/api/admin/staff/stf-001/role')).toBe(false);
      expect(canAccessRoute('super_admin', '/api/admin/staff/stf-001/role')).toBe(true);

      expect(canAccessRoute('staff', '/api/admin/cms/hero')).toBe(false);
      expect(canAccessRoute('manager', '/api/admin/cms/hero')).toBe(true);

      expect(canAccessRoute(null, '/admin/dashboard')).toBe(false);
      expect(canAccessRoute(null, '/admin/login')).toBe(true);
      expect(canAccessRoute(null, '/en/services')).toBe(true);
    });
  });
});
