import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  execSupabaseUpdate,
  execSupabaseInsert,
  hasSupabaseAdminCredentials,
} from '@/lib/supabase/admin';
import { GET, POST } from '@/app/api/admin/cms/business-info/route';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

function makeAuthRequest(url: string, options?: RequestInit): NextRequest {
  const headers = new Headers(options?.headers);
  headers.set('cookie', 'sb-authenticated=true; sb-role=super_admin; sb-email=superadmin@glamournails.com.au');
  return new NextRequest(url, { ...options, headers });
}

describe('Unified Business Info & Local/Vercel Supabase Sync', () => {
  it('execSupabaseUpdate reports affected=0 when RLS blocks update and returns empty array', async () => {
    const fakeSupabase = {
      from: () => ({
        update: () => ({
          eq: () => ({
            select: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    };

    const res = await execSupabaseUpdate(
      fakeSupabase,
      'nail_business_info',
      { salon_name: 'Test Salon' },
      'id',
      '10000000-0000-0000-0000-000000000001'
    );

    expect(res.error).toBeNull();
    expect(res.affected).toBe(0);
    expect(res.rows).toEqual([]);
  });

  it('execSupabaseInsert captures PostgREST RLS error cleanly', async () => {
    const fakeSupabase = {
      from: () => ({
        insert: () => ({
          select: async () => ({
            data: null,
            error: { code: '42501', message: 'new row violates row-level security policy' },
          }),
        }),
      }),
    };

    const res = await execSupabaseInsert(fakeSupabase, 'nail_business_info', {
      salon_name: 'Test Salon',
    });

    expect(res.error?.code).toBe('42501');
    expect(res.affected).toBe(0);
  });

  it('hasSupabaseAdminCredentials checks both URL and service/secret key', () => {
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const prevService = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const prevSecret = process.env.SUPABASE_SECRET_KEY;

    try {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.SUPABASE_SECRET_KEY;
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
      expect(hasSupabaseAdminCredentials()).toBe(false);

      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
      expect(hasSupabaseAdminCredentials()).toBe(true);

      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
      expect(hasSupabaseAdminCredentials()).toBe(true);
    } finally {
      if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
      if (prevService === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      else process.env.SUPABASE_SERVICE_ROLE_KEY = prevService;
      if (prevSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
      else process.env.SUPABASE_SECRET_KEY = prevSecret;
    }
  });

  it('POST and GET /api/admin/cms/business-info persist and return unified business + branding fields with syncStatus', async () => {
    const brandingFile = path.join(process.cwd(), '.data', 'branding.json');
    const prevBranding = fs.existsSync(brandingFile) ? fs.readFileSync(brandingFile, 'utf-8') : null;

    try {
      const payload = {
        salon_name: 'Yen Thang Luxury Nails Sydney',
        website_title: 'Yen Thang Luxury Nails Sydney',
        website_title_vi: 'Yến Thắng Nails & Spa Sydney',
        website_tagline: 'Sydney CBD • Bespoke Lounge',
        website_tagline_vi: 'Sydney CBD • Tiệm Nail Cao Cấp',
        logo_url: 'https://example.com/logo.webp',
        facebook_url: 'https://facebook.com/yenthangnails',
        instagram_url: 'https://instagram.com/yenthangnails',
        abn: '51 824 753 556',
        phone: '+61 2 9876 5432',
        mobile: '0412 888 999',
        email: 'contact@yenthangnails.com.au',
        address_street: 'Suite 8, 250 George Street',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
        country: 'Australia',
        google_maps_url: 'https://maps.google.com/?q=250+George+Street+Sydney+NSW+2000',
        google_maps_embed_url: 'https://maps.google.com/maps?q=250%20George%20Street&output=embed',
      };

      const postReq = makeAuthRequest('http://localhost:3000/api/admin/cms/business-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const postRes = await POST(postReq);
      expect(postRes.status).toBe(200);
      const postJson = await postRes.json();
      expect(postJson.success).toBe(true);

      const getReq = makeAuthRequest('http://localhost:3000/api/admin/cms/business-info', {
        method: 'GET',
      });
      const getRes = await GET(getReq);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();

      expect(getJson.success).toBe(true);
      expect(getJson.syncStatus).toBeDefined();
      expect(typeof getJson.syncStatus.hasAdminKey).toBe('boolean');
      expect(getJson.businessInfo.website_title_vi).toBe('Yến Thắng Nails & Spa Sydney');
      expect(getJson.businessInfo.facebook_url).toBe('https://facebook.com/yenthangnails');
      expect(getJson.businessInfo.instagram_url).toBe('https://instagram.com/yenthangnails');
      expect(getJson.businessInfo.salon_name).toBe('Yen Thang Luxury Nails Sydney');
      expect(getJson.businessInfo.phone).toBe('+61 2 9876 5432');
    } finally {
      if (prevBranding !== null) {
        fs.writeFileSync(brandingFile, prevBranding, 'utf-8');
      } else if (fs.existsSync(brandingFile)) {
        fs.unlinkSync(brandingFile);
      }
    }
  });

  it('all public localized pages export dynamic = force-dynamic to prevent stale Vercel SSG cache', () => {
    const publicFiles = [
      'src/app/[locale]/layout.tsx',
      'src/app/[locale]/page.tsx',
      'src/app/[locale]/about/page.tsx',
      'src/app/[locale]/services/page.tsx',
      'src/app/[locale]/gallery/page.tsx',
      'src/app/[locale]/contact/page.tsx',
    ];

    for (const relPath of publicFiles) {
      const content = fs.readFileSync(path.join(process.cwd(), relPath), 'utf-8');
      expect(content, `${relPath} must export dynamic = 'force-dynamic'`).toMatch(
        /export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/
      );
    }
  });
});
