import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as postLogin } from '@/app/api/auth/login/route';
import { POST as postChangePassword } from '@/app/api/auth/change-password/route';
import { canAccessFinance, canMutateCMS, canElevateRole } from '@/lib/auth/roles';

function extractCookieHeader(res: Response): string {
  const anyRes = res as any;
  if (typeof anyRes.cookies?.getAll === 'function') {
    return anyRes.cookies
      .getAll()
      .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
      .join('; ');
  }
  const setCookies: string[] =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : [res.headers.get('set-cookie') || ''];
  return setCookies
    .filter(Boolean)
    .map((c) => c.split(';')[0])
    .join('; ');
}

describe('Auth Upgrade: SuperAdmin Account & Self-Service Password Update', () => {
  beforeEach(() => {
    (globalThis as any).__mockAuthPasswordOverrides = {};
  });

  it('authenticates superadmin with YenThang@2026 via username and grants full super_admin privileges', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'superadmin',
        password: 'YenThang@2026',
      }),
    });

    const res = await postLogin(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.role).toBe('super_admin');
    expect(data.user.username).toBe('superadmin');
    expect(data.user.id).toBe('stf-superadmin');

    expect(canAccessFinance(data.user.role)).toBe(true);
    expect(canMutateCMS(data.user.role)).toBe(true);
    expect(canElevateRole(data.user.role, 'super_admin')).toBe(true);
  });

  it('accepts case-insensitive and whitespace-padded superadmin identifier', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '  SUPERADMIN  ',
        password: 'YenThang@2026',
      }),
    });

    const res = await postLogin(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.role).toBe('super_admin');
  });

  it('rejects incorrect password for superadmin with HTTP 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'superadmin',
        password: 'WrongPassword123!',
      }),
    });

    const res = await postLogin(req);
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated password update requests with HTTP 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: 'YenThang@2026',
        newPassword: 'NewSecurePassword@2026',
        confirmPassword: 'NewSecurePassword@2026',
      }),
    });

    const res = await postChangePassword(req);
    expect(res.status).toBe(401);
  });

  it('validates current password, minimum length, confirmation match, and password change difference', async () => {
    const loginRes = await postLogin(
      new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'superadmin', password: 'YenThang@2026' }),
      })
    );
    const cookie = extractCookieHeader(loginRes);

    // 1. Short new password (< 8 chars) -> 400
    const shortRes = await postChangePassword(
      new NextRequest('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({
          currentPassword: 'YenThang@2026',
          newPassword: '123',
          confirmPassword: '123',
        }),
      })
    );
    expect(shortRes.status).toBe(400);

    // 2. Mismatched confirm password -> 400
    const mismatchRes = await postChangePassword(
      new NextRequest('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({
          currentPassword: 'YenThang@2026',
          newPassword: 'NewPassword@2026',
          confirmPassword: 'DifferentPassword@2026',
        }),
      })
    );
    expect(mismatchRes.status).toBe(400);

    // 3. Same password as current -> 400
    const sameRes = await postChangePassword(
      new NextRequest('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({
          currentPassword: 'YenThang@2026',
          newPassword: 'YenThang@2026',
          confirmPassword: 'YenThang@2026',
        }),
      })
    );
    expect(sameRes.status).toBe(400);

    // 4. Wrong current password -> 401
    const wrongCurRes = await postChangePassword(
      new NextRequest('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({
          currentPassword: 'WrongCurrentPassword!',
          newPassword: 'BrandNewPassword@2026',
          confirmPassword: 'BrandNewPassword@2026',
        }),
      })
    );
    expect(wrongCurRes.status).toBe(401);
  });

  it('updates logged-in superadmin password, invalidates old password, and accepts new password', async () => {
    const loginRes = await postLogin(
      new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'superadmin', password: 'YenThang@2026' }),
      })
    );
    const cookie = extractCookieHeader(loginRes);

    // Update password
    const changeRes = await postChangePassword(
      new NextRequest('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({
          currentPassword: 'YenThang@2026',
          newPassword: 'SuperAdminNew#2026',
          confirmPassword: 'SuperAdminNew#2026',
        }),
      })
    );
    expect(changeRes.status).toBe(200);
    const changeJson = await changeRes.json();
    expect(changeJson.success).toBe(true);

    // Old password MUST now be rejected
    const oldLoginRes = await postLogin(
      new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'superadmin', password: 'YenThang@2026' }),
      })
    );
    expect(oldLoginRes.status).toBe(401);

    // New password MUST succeed
    const newLoginRes = await postLogin(
      new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'superadmin', password: 'SuperAdminNew#2026' }),
      })
    );
    expect(newLoginRes.status).toBe(200);
  });

  it('prevents IDOR: logged-in staff can only change their own password even if targeting superadmin in body', async () => {
    const staffLoginRes = await postLogin(
      new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'technician@glamournails.com.au',
          password: 'SalonTech2026!',
        }),
      })
    );
    const staffCookie = extractCookieHeader(staffLoginRes);

    const changeRes = await postChangePassword(
      new NextRequest('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: staffCookie },
        body: JSON.stringify({
          userId: 'stf-superadmin',
          email: 'superadmin',
          currentPassword: 'SalonTech2026!',
          newPassword: 'StaffOwnNewPass!2026',
          confirmPassword: 'StaffOwnNewPass!2026',
        }),
      })
    );
    expect(changeRes.status).toBe(200);

    // Superadmin's original password MUST still work untouched
    const superLoginRes = await postLogin(
      new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'superadmin', password: 'YenThang@2026' }),
      })
    );
    expect(superLoginRes.status).toBe(200);

    // Staff's new password MUST work
    const staffNewLoginRes = await postLogin(
      new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'technician@glamournails.com.au',
          password: 'StaffOwnNewPass!2026',
        }),
      })
    );
    expect(staffNewLoginRes.status).toBe(200);
  });
});
