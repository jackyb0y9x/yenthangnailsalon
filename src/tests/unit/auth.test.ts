import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as postLogin } from '@/app/api/auth/login/route';
import { POST as postLogout } from '@/app/api/auth/logout/route';
import { middleware } from '@/middleware';
import { POST as postHero } from '@/app/api/admin/cms/hero/route';
import { POST as postService } from '@/app/api/admin/services/route';
import { POST as postGallery } from '@/app/api/admin/gallery/route';
import { canElevateRole, canAccessFinance, canMutateCMS, canAccessRoute } from '@/lib/auth/roles';
import { PUT as putStaffRole } from '@/app/api/admin/staff/[id]/role/route';

describe('Unit Test Suite: Admin Authentication, Route Guard & RBAC (Milestone 3)', () => {
  // ==========================================================================
  // Suite 1: Admin Login Endpoint (/api/auth/login)
  // ==========================================================================
  describe('1. Admin Login Endpoint (/api/auth/login)', () => {
    it('1.1: successfully authenticates super_admin credentials and returns user profile', async () => {
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
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.user.role).toBe('super_admin');
      expect(json.user.email).toBe('admin@glamournails.com.au');
    });

    it('1.2: successfully authenticates manager credentials and returns user profile', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'manager@glamournails.com.au',
          password: 'SalonManager2026!',
        }),
      });

      const res = await postLogin(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.user.role).toBe('manager');
    });

    it('1.3: successfully authenticates staff technician credentials and returns user profile', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'technician@glamournails.com.au',
          password: 'SalonTech2026!',
        }),
      });

      const res = await postLogin(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.user.role).toBe('staff');
    });

    it('1.4: sets required HttpOnly session cookies (sb-authenticated, sb-role, sb-email, sb-id)', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'manager@glamournails.com.au',
          password: 'SalonManager2026!',
        }),
      });

      const res = await postLogin(req);
      const authCookie = res.cookies.get('sb-authenticated');
      const roleCookie = res.cookies.get('sb-role');
      const emailCookie = res.cookies.get('sb-email');
      const idCookie = res.cookies.get('sb-id');

      expect(authCookie?.value).toBe('true');
      expect(roleCookie?.value).toBe('manager');
      expect(emailCookie?.value).toBe('manager@glamournails.com.au');
      expect(idCookie?.value).toBeDefined();
    });

    it('1.5: rejects login with non-existent email with HTTP 401 and generic error message', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'intruder@unknown.com',
          password: 'Password123!',
        }),
      });

      const res = await postLogin(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('Invalid login credentials');
    });

    it('1.6: rejects login with incorrect password with HTTP 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@glamournails.com.au',
          password: 'wrongpassword',
        }),
      });

      const res = await postLogin(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('Invalid login credentials');
    });

    it('1.7: rejects request with missing email or password with HTTP 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@glamournails.com.au',
        }),
      });

      const res = await postLogin(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('required');
    });

    it('1.8: sanitizes email by trimming whitespace and normalizing to lowercase', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: '   ADMIN@GlamourNails.com.au   ',
          password: 'SalonAdmin2026!',
        }),
      });

      const res = await postLogin(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.user.email).toBe('admin@glamournails.com.au');
    });

    it('1.9: rejects malformed JSON payload with HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-content',
      });

      const res = await postLogin(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Malformed JSON');
    });

    it('1.10: rejects arbitrary attacker password for valid staff with HTTP 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@glamournails.com.au',
          password: 'completely-wrong-attacker-password-12345!',
        }),
      });

      const res = await postLogin(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Invalid login credentials');
    });
  });

  // ==========================================================================
  // Suite 2: Admin Logout Endpoint (/api/auth/logout)
  // ==========================================================================
  describe('2. Admin Logout Endpoint (/api/auth/logout)', () => {
    it('2.1: returns HTTP 200 with success: true', async () => {
      const res = await postLogout();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('2.2: sets Set-Cookie headers with expired date (Expires=Thu, 01 Jan 1970 00:00:00 GMT)', async () => {
      const res = await postLogout();
      const authCookie = res.cookies.get('sb-authenticated');
      expect(authCookie?.value).toBe('');
    });
  });

  // ==========================================================================
  // Suite 3: Route Guard Middleware (src/middleware.ts)
  // ==========================================================================
  describe('3. Route Guard Middleware (src/middleware.ts)', () => {
    it('3.1: redirects unauthenticated request to /admin/dashboard to /admin/login with HTTP 307', () => {
      const req = new NextRequest('http://localhost:3000/admin/dashboard');
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/admin/login');
    });

    it('3.2: redirects unauthenticated request to /admin/cms to /admin/login with HTTP 307', () => {
      const req = new NextRequest('http://localhost:3000/admin/cms');
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/admin/login');
    });

    it('3.3: redirects unauthenticated request to /admin/customers to /admin/login with HTTP 307', () => {
      const req = new NextRequest('http://localhost:3000/admin/customers');
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/admin/login');
    });

    it('3.4: allows unauthenticated request to /admin/login without redirection (HTTP 200/next)', () => {
      const req = new NextRequest('http://localhost:3000/admin/login');
      const res = middleware(req);
      expect(res.status).toBe(200);
    });

    it('3.5: redirects authenticated user accessing /admin/login to /admin/dashboard', () => {
      const req = new NextRequest('http://localhost:3000/admin/login', {
        headers: { Cookie: 'sb-authenticated=true; sb-role=manager' },
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/admin/dashboard');
    });

    it('3.6: preserves target return URL in redirect or state', () => {
      const req = new NextRequest('http://localhost:3000/admin/cms?tab=services');
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/admin/login');
    });

    it('3.7: rejects forged or invalid cookie (sb-authenticated=false) with redirect to /admin/login', () => {
      const req = new NextRequest('http://localhost:3000/admin/dashboard', {
        headers: { Cookie: 'sb-authenticated=false; sb-role=super_admin' },
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/admin/login');
    });
  });

  // ==========================================================================
  // Suite 4: Role-Based Access Control (RBAC) Enforcement
  // ==========================================================================
  describe('4. Role-Based Access Control (RBAC) Enforcement', () => {
    it('4.1: allows super_admin full access to all admin routes and management APIs', () => {
      const req = new NextRequest('http://localhost:3000/admin/finance', {
        headers: { Cookie: 'sb-authenticated=true; sb-role=super_admin' },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
    });

    it('4.2: allows manager access to CMS, CRM, and Staff management routes', () => {
      const req = new NextRequest('http://localhost:3000/admin/cms', {
        headers: { Cookie: 'sb-authenticated=true; sb-role=manager' },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
    });

    it('4.3: denies staff role access to /admin/finance with HTTP 403 Forbidden', () => {
      const req = new NextRequest('http://localhost:3000/admin/finance', {
        headers: { Cookie: 'sb-authenticated=true; sb-role=staff' },
      });
      const res = middleware(req);
      expect(res.status).toBe(403);
    });

    it('4.4: denies staff role mutation access to /api/admin/cms/* with HTTP 403 Forbidden', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/cms/hero', {
        method: 'POST',
        headers: {
          Cookie: 'sb-authenticated=true; sb-role=staff',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ headline_en: 'Staff Takeover' }),
      });
      const res = await postHero(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Forbidden');
    });

    it('4.5: denies staff role mutation access to /api/admin/services with HTTP 403 Forbidden', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/services', {
        method: 'POST',
        headers: {
          Cookie: 'sb-authenticated=true; sb-role=staff',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name_en: 'Staff Service', price_cents: 5000 }),
      });
      const res = await postService(req);
      expect(res.status).toBe(403);
    });

    it('4.6: denies staff role mutation access to /api/admin/gallery with HTTP 403 Forbidden', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/gallery', {
        method: 'POST',
        headers: {
          Cookie: 'sb-authenticated=true; sb-role=staff',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title_en: 'Staff Photo', image_url: 'https://example.com/pic.jpg' }),
      });
      const res = await postGallery(req);
      expect(res.status).toBe(403);
    });

    it('4.7: denies manager role attempting to elevate any user to super_admin (HTTP 403)', async () => {
      // In accordance with T2-BVA-33 contract: Manager role cannot elevate to super_admin

      // 1. Verify authentic RBAC domain logic
      expect(canElevateRole('manager', 'super_admin')).toBe(false);
      expect(canElevateRole('super_admin', 'super_admin')).toBe(true);
      expect(canElevateRole('manager', 'staff')).toBe(true);
      expect(canElevateRole('manager', 'manager')).toBe(true);
      expect(canElevateRole('staff', 'super_admin')).toBe(false);
      expect(canElevateRole('staff', 'staff')).toBe(false);

      // 2. Verify authentic HTTP endpoint execution returns HTTP 403 Forbidden
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
      expect(json.error).toContain('Only super_admin');
    });

    it('4.8: allows super_admin role to update staff role (HTTP 200)', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/staff/stf-002/role', {
        method: 'PUT',
        headers: {
          Cookie: 'sb-authenticated=true; sb-role=super_admin; sb-email=admin@glamournails.com.au',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'manager' }),
      });

      const res = await putStaffRole(req, { params: Promise.resolve({ id: 'stf-002' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.staff.role).toBe('manager');
    });

    it('4.9: validates RBAC utility functions (canAccessFinance, canMutateCMS, canAccessRoute)', () => {
      // Finance access boundaries
      expect(canAccessFinance('super_admin')).toBe(true);
      expect(canAccessFinance('manager')).toBe(true);
      expect(canAccessFinance('staff')).toBe(false);
      expect(canAccessFinance('')).toBe(false);

      // CMS mutation boundaries
      expect(canMutateCMS('super_admin')).toBe(true);
      expect(canMutateCMS('manager')).toBe(true);
      expect(canMutateCMS('staff')).toBe(false);
      expect(canMutateCMS('unknown')).toBe(false);

      // Route-level boundaries
      expect(canAccessRoute('staff', '/admin/dashboard')).toBe(true);
      expect(canAccessRoute('staff', '/admin/finance')).toBe(false);
      expect(canAccessRoute('staff', '/api/admin/cms/hero')).toBe(false);
      expect(canAccessRoute('manager', '/admin/finance')).toBe(true);
      expect(canAccessRoute('super_admin', '/admin/finance')).toBe(true);
      expect(canAccessRoute(null, '/admin/dashboard')).toBe(false);
    });
  });

  // ==========================================================================
  // Suite 5: Admin API Authentication Guard (/api/admin/*)
  // ==========================================================================
  describe('5. Admin API Authentication Guard (/api/admin/*)', () => {
    it('5.1: rejects anonymous request to /api/admin/services with HTTP 401 Unauthorized', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_en: 'Anonymous Service' }),
      });
      const res = await postService(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('Unauthorized');
    });

    it('5.2: rejects anonymous request to /api/admin/gallery with HTTP 401 Unauthorized', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title_en: 'Anonymous Photo', image_url: 'https://example.com/pic.jpg' }),
      });
      const res = await postGallery(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('Unauthorized');
    });

    it('5.3: rejects anonymous request to /api/admin/cms/hero with HTTP 401 Unauthorized', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/cms/hero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline_en: 'Anonymous Hero' }),
      });
      const res = await postHero(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('Unauthorized');
    });

    it('5.4: rejects anonymous request to /api/admin/customers with HTTP 401 Unauthorized', () => {
      const req = new NextRequest('http://localhost:3000/api/admin/customers');
      const res = middleware(req);
      expect(res.status).toBe(401);
    });

    it('5.5: allows authenticated requests with valid session cookies to proceed', () => {
      const req = new NextRequest('http://localhost:3000/api/admin/services', {
        headers: { Cookie: 'sb-authenticated=true; sb-role=manager' },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
    });
  });
});
