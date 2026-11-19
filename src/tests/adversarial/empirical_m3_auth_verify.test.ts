import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as postLogin } from '@/app/api/auth/login/route';
import { middleware } from '@/middleware';
import { POST as postHero } from '@/app/api/admin/cms/hero/route';
import { POST as postAnnouncement } from '@/app/api/admin/cms/announcement/route';
import { POST as postHours } from '@/app/api/admin/cms/hours/route';
import { POST as postBusinessInfo } from '@/app/api/admin/cms/business-info/route';
import { POST as postService } from '@/app/api/admin/services/route';
import { PUT as putService, DELETE as deleteService } from '@/app/api/admin/services/[id]/route';
import { POST as postGallery } from '@/app/api/admin/gallery/route';
import { PUT as putGallery, DELETE as deleteGallery } from '@/app/api/admin/gallery/[id]/route';
import { PUT as putStaffRole } from '@/app/api/admin/staff/[id]/role/route';
import { canElevateRole, canMutateCMS, canAccessFinance, canAccessRoute } from '@/lib/auth/roles';

describe('Empirical Challenger Verification: Auth, Route Guards & RBAC', () => {
  describe('1. Arbitrary Password Bypass Defense on POST /api/auth/login', () => {
    const arbitraryUnauthorizedPasswords = [
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
      ' ',
    ];

    it.each(arbitraryUnauthorizedPasswords)(
      'rejects unauthorized password "%s" for admin@glamournails.com.au with HTTP 401',
      async (password) => {
        const req = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@glamournails.com.au', password }),
        });
        const res = await postLogin(req);
        expect(res.status).toBe(password.trim() === '' ? 400 : 401);
        const json = await res.json();
        expect(json.success).toBe(false);
        if (password.trim() === '') {
          expect(json.error).toBe('Password is required.');
        } else {
          expect(json.error).toBe('Invalid login credentials.');
        }
        // Assert no authentication cookie is granted
        expect(res.cookies.get('sb-authenticated')).toBeUndefined();
      }
    );

    it('rejects empty string password with HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@glamournails.com.au', password: '' }),
      });
      const res = await postLogin(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Password is required.');
    });

    it('rejects unknown email with HTTP 401', async () => {
      const unknownEmails = [
        'attacker@evil.com',
        'unknown@glamournails.com.au',
        'fakeadmin@glamournails.com.au',
        'root@localhost',
      ];
      for (const email of unknownEmails) {
        const req = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'AnyPassword2026!' }),
        });
        const res = await postLogin(req);
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.error).toBe('Invalid login credentials.');
        expect(res.cookies.get('sb-authenticated')).toBeUndefined();
      }
    });

    it('accepts authentic passwords and sets correct role cookies', async () => {
      const authenticCredentials = [
        { email: 'admin@glamournails.com.au', password: 'SalonAdmin2026!', expectedRole: 'super_admin', expectedId: 'stf-001' },
        { email: 'admin@glamournails.com.au', password: 'SecurePassword2026!', expectedRole: 'super_admin', expectedId: 'stf-001' },
        { email: 'manager@glamournails.com.au', password: 'SalonManager2026!', expectedRole: 'manager', expectedId: 'stf-002' },
        { email: 'manager@glamournails.com.au', password: 'SecurePassword2026!', expectedRole: 'manager', expectedId: 'stf-002' },
        { email: 'technician@glamournails.com.au', password: 'SalonTech2026!', expectedRole: 'staff', expectedId: 'stf-003' },
        { email: 'technician@glamournails.com.au', password: 'SecurePassword2026!', expectedRole: 'staff', expectedId: 'stf-003' },
        { email: 'kevin.senior@glamournails.com.au', password: 'SalonSenior2026!', expectedRole: 'staff', expectedId: 'stf-004' },
        { email: 'kevin.senior@glamournails.com.au', password: 'SecurePassword2026!', expectedRole: 'staff', expectedId: 'stf-004' },
      ];

      for (const cred of authenticCredentials) {
        const req = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cred.email, password: cred.password }),
        });
        const res = await postLogin(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.user.email).toBe(cred.email);
        expect(json.user.role).toBe(cred.expectedRole);

        expect(res.cookies.get('sb-authenticated')?.value).toBe('true');
        expect(res.cookies.get('sb-role')?.value).toBe(cred.expectedRole);
        expect(res.cookies.get('sb-email')?.value).toBe(cred.email);
        expect(res.cookies.get('sb-id')?.value).toBe(cred.expectedId);
      }
    });
  });

  describe('2. Route Guarding & Privilege Boundary Enforcement', () => {
    it('redirects forged cookie sb-authenticated=false to /admin/login (HTTP 307)', () => {
      const protectedPaths = [
        '/admin',
        '/admin/dashboard',
        '/admin/cms',
        '/admin/finance',
        '/admin/customers',
        '/admin/staff',
      ];

      for (const path of protectedPaths) {
        const req = new NextRequest(`http://localhost:3000${path}`, {
          headers: { Cookie: 'sb-authenticated=false; sb-role=super_admin' },
        });
        const res = middleware(req);
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe('http://localhost:3000/admin/login');
      }
    });

    it('returns HTTP 403 Forbidden when staff role accesses /admin/finance', async () => {
      const financePaths = [
        '/admin/finance',
        '/admin/finance/',
        '/admin/finance/reports',
        '/admin/finance/tax-summary',
      ];

      for (const path of financePaths) {
        const req = new NextRequest(`http://localhost:3000${path}`, {
          headers: { Cookie: 'sb-authenticated=true; sb-role=staff' },
        });
        const res = middleware(req);
        expect(res.status).toBe(403);
        const text = await res.text();
        expect(text).toBe('<h1>403 Forbidden - Staff role not authorized to view financial records</h1>');
        expect(res.headers.get('content-type')).toContain('text/html');
      }
    });

    it('returns HTTP 403 Forbidden when staff role accesses /api/admin/finance', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/finance', {
        headers: { Cookie: 'sb-authenticated=true; sb-role=staff' },
      });
      const res = middleware(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Staff role not authorized to view financial records');
    });

    it('returns HTTP 403 Forbidden when staff role attempts to mutate CMS endpoints', async () => {
      const staffHeaders = {
        Cookie: 'sb-authenticated=true; sb-role=staff',
        'Content-Type': 'application/json',
      };

      // Hero mutation
      const heroReq = new NextRequest('http://localhost:3000/api/admin/cms/hero', {
        method: 'POST',
        headers: staffHeaders,
        body: JSON.stringify({ headline_en: 'Staff Attempt' }),
      });
      const heroRes = await postHero(heroReq);
      expect(heroRes.status).toBe(403);
      expect((await heroRes.json()).error).toBe('Forbidden');

      // Announcement mutation
      const annReq = new NextRequest('http://localhost:3000/api/admin/cms/announcement', {
        method: 'POST',
        headers: staffHeaders,
        body: JSON.stringify({ message_en: 'Staff Announcement' }),
      });
      const annRes = await postAnnouncement(annReq);
      expect(annRes.status).toBe(403);
      expect((await annRes.json()).error).toBe('Forbidden');

      // Hours mutation
      const hoursReq = new NextRequest('http://localhost:3000/api/admin/cms/hours', {
        method: 'POST',
        headers: staffHeaders,
        body: JSON.stringify({ holiday_notice_active: true }),
      });
      const hoursRes = await postHours(hoursReq);
      expect(hoursRes.status).toBe(403);
      expect((await hoursRes.json()).error).toBe('Forbidden');

      // Business Info mutation
      const infoReq = new NextRequest('http://localhost:3000/api/admin/cms/business-info', {
        method: 'POST',
        headers: staffHeaders,
        body: JSON.stringify({ salon_name: 'Staff Renaming' }),
      });
      const infoRes = await postBusinessInfo(infoReq);
      expect(infoRes.status).toBe(403);
      expect((await infoRes.json()).error).toBe('Forbidden');

      // Service creation
      const srvReq = new NextRequest('http://localhost:3000/api/admin/services', {
        method: 'POST',
        headers: staffHeaders,
        body: JSON.stringify({ name_en: 'Staff Service', price_cents: 2500 }),
      });
      const srvRes = await postService(srvReq);
      expect(srvRes.status).toBe(403);
      expect((await srvRes.json()).error).toBe('Forbidden');

      // Service update
      const srvPutReq = new NextRequest('http://localhost:3000/api/admin/services/srv-001', {
        method: 'PUT',
        headers: staffHeaders,
        body: JSON.stringify({ price_cents: 9999 }),
      });
      const srvPutRes = await putService(srvPutReq, { params: Promise.resolve({ id: 'srv-001' }) });
      expect(srvPutRes.status).toBe(403);
      expect((await srvPutRes.json()).error).toBe('Forbidden');

      // Service delete
      const srvDelReq = new NextRequest('http://localhost:3000/api/admin/services/srv-001', {
        method: 'DELETE',
        headers: staffHeaders,
      });
      const srvDelRes = await deleteService(srvDelReq, { params: Promise.resolve({ id: 'srv-001' }) });
      expect(srvDelRes.status).toBe(403);
      expect((await srvDelRes.json()).error).toBe('Forbidden');

      // Gallery creation
      const galReq = new NextRequest('http://localhost:3000/api/admin/gallery', {
        method: 'POST',
        headers: staffHeaders,
        body: JSON.stringify({ title_en: 'Staff Image', image_url: 'https://example.com/test.jpg' }),
      });
      const galRes = await postGallery(galReq);
      expect(galRes.status).toBe(403);
      expect((await galRes.json()).error).toBe('Forbidden');

      // Gallery update
      const galPutReq = new NextRequest('http://localhost:3000/api/admin/gallery/gal-001', {
        method: 'PUT',
        headers: staffHeaders,
        body: JSON.stringify({ is_featured: true }),
      });
      const galPutRes = await putGallery(galPutReq, { params: Promise.resolve({ id: 'gal-001' }) });
      expect(galPutRes.status).toBe(403);
      expect((await galPutRes.json()).error).toBe('Forbidden');

      // Gallery delete
      const galDelReq = new NextRequest('http://localhost:3000/api/admin/gallery/gal-001', {
        method: 'DELETE',
        headers: staffHeaders,
      });
      const galDelRes = await deleteGallery(galDelReq, { params: Promise.resolve({ id: 'gal-001' }) });
      expect(galDelRes.status).toBe(403);
      expect((await galDelRes.json()).error).toBe('Forbidden');
    });

    it('returns HTTP 403 Forbidden when staff or manager attempts unauthorized staff role modification', async () => {
      // Staff attempting modification
      const staffReq = new NextRequest('http://localhost:3000/api/admin/staff/stf-003/role', {
        method: 'PUT',
        headers: {
          Cookie: 'sb-authenticated=true; sb-role=staff; sb-email=technician@glamournails.com.au',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'manager' }),
      });
      const staffRes = await putStaffRole(staffReq, { params: Promise.resolve({ id: 'stf-003' }) });
      expect(staffRes.status).toBe(403);
      const staffJson = await staffRes.json();
      expect(staffJson.success).toBe(false);
      expect(staffJson.error).toContain('Only super_admin');

      // Manager attempting elevation to super_admin
      const mgrReq = new NextRequest('http://localhost:3000/api/admin/staff/stf-003/role', {
        method: 'PUT',
        headers: {
          Cookie: 'sb-authenticated=true; sb-role=manager; sb-email=manager@glamournails.com.au',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'super_admin' }),
      });
      const mgrRes = await putStaffRole(mgrReq, { params: Promise.resolve({ id: 'stf-003' }) });
      expect(mgrRes.status).toBe(403);
      const mgrJson = await mgrRes.json();
      expect(mgrJson.success).toBe(false);
      expect(mgrJson.error).toContain('Only super_admin');
    });
  });

  describe('3. RBAC Domain Logic Invariant Checks', () => {
    it('verifies canElevateRole logic directly', () => {
      expect(canElevateRole('super_admin', 'super_admin')).toBe(true);
      expect(canElevateRole('super_admin', 'manager')).toBe(true);
      expect(canElevateRole('super_admin', 'staff')).toBe(true);

      expect(canElevateRole('manager', 'super_admin')).toBe(false);
      expect(canElevateRole('manager', 'manager')).toBe(true);
      expect(canElevateRole('manager', 'staff')).toBe(true);

      expect(canElevateRole('staff', 'super_admin')).toBe(false);
      expect(canElevateRole('staff', 'manager')).toBe(false);
      expect(canElevateRole('staff', 'staff')).toBe(false);
    });

    it('verifies canMutateCMS and canAccessFinance logic directly', () => {
      expect(canMutateCMS('super_admin')).toBe(true);
      expect(canMutateCMS('manager')).toBe(true);
      expect(canMutateCMS('staff')).toBe(false);

      expect(canAccessFinance('super_admin')).toBe(true);
      expect(canAccessFinance('manager')).toBe(true);
      expect(canAccessFinance('staff')).toBe(false);
    });

    it('verifies canAccessRoute boundaries directly', () => {
      expect(canAccessRoute('staff', '/admin/finance')).toBe(false);
      expect(canAccessRoute('manager', '/admin/finance')).toBe(true);
      expect(canAccessRoute('super_admin', '/admin/finance')).toBe(true);

      expect(canAccessRoute('staff', '/api/admin/cms/hero')).toBe(false);
      expect(canAccessRoute('manager', '/api/admin/cms/hero')).toBe(true);
      expect(canAccessRoute('super_admin', '/api/admin/cms/hero')).toBe(true);
    });
  });
});
