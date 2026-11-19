import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  saveStoredBranding,
  getStoredBranding,
  DEFAULT_BRANDING,
  isSafeSocialUrl,
  normalizeSocialUrl,
} from '@/lib/cms/branding-storage';
import { getPublicBusinessInfo } from '@/lib/cms/public-data';
import { generateLocalBusinessSchema } from '@/lib/seo/schema';
import { GET, POST } from '@/app/api/admin/cms/business-info/route';

describe('Branding, Title & Logo Storage', () => {
  beforeEach(() => {
    (globalThis as any).__mockBrandingConfig = null;
  });

  it('provides sensible default branding values', () => {
    expect(DEFAULT_BRANDING.website_title).toContain('Glamour Nails');
    expect(DEFAULT_BRANDING.website_tagline).toContain('Sydney CBD');
  });

  it('persists customized website title and logo URL', () => {
    const updated = saveStoredBranding({
      website_title: 'Diamond Nails Sydney Lounge',
      website_title_vi: 'Diamond Nails Sydney • Tiệm Móng Kim Cương',
      website_tagline: 'Luxury Artistry & Spa',
      website_tagline_vi: 'Nghệ Thuật Làm Móng Đẳng Cấp',
      logo_url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=300',
    });

    expect(updated.website_title).toBe('Diamond Nails Sydney Lounge');
    expect(updated.logo_url).toContain('https://images.unsplash.com');

    const retrieved = getStoredBranding();
    expect(retrieved?.website_title).toBe('Diamond Nails Sydney Lounge');
    expect(retrieved?.website_title_vi).toBe('Diamond Nails Sydney • Tiệm Móng Kim Cương');
    expect(retrieved?.logo_url).toBe('https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=300');
  });

  it('reflects updated branding in getPublicBusinessInfo()', async () => {
    saveStoredBranding({
      website_title: 'Custom Brand Title Sydney',
      logo_url: 'https://example.com/custom-logo.png',
    });

    const info = await getPublicBusinessInfo();
    expect(info.websiteTitle).toBe('Custom Brand Title Sydney');
    expect(info.logoUrl).toBe('https://example.com/custom-logo.png');
  });

  it('allows resetting custom logo to empty string for default icon fallback', () => {
    saveStoredBranding({
      logo_url: '',
    });
    const retrieved = getStoredBranding();
    expect(retrieved?.logo_url).toBe('');
  });

  it('normalizes and validates Facebook & Instagram social profile URLs', () => {
    expect(normalizeSocialUrl('facebook.com/my.salon')).toBe('https://facebook.com/my.salon');
    expect(normalizeSocialUrl('https://instagram.com/my.salon')).toBe('https://instagram.com/my.salon');
    expect(isSafeSocialUrl('')).toBe(true);
    expect(isSafeSocialUrl('facebook.com/glamournails')).toBe(true);
    expect(isSafeSocialUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeSocialUrl('data:text/html,xss')).toBe(false);
  });

  it('persists Facebook & Instagram URLs via business-info API and reflects them in public data & SEO JSON-LD', async () => {
    const postReq = new NextRequest('http://localhost:3000/api/admin/cms/business-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: 'sb-authenticated=true; sb-role=super_admin; sb-email=admin@glamournails.com.au; sb-id=stf-001',
      },
      body: JSON.stringify({
        facebook_url: 'facebook.com/owner.personal.profile',
        instagram_url: 'https://instagram.com/owner.nail.studio',
      }),
    });

    const postRes = await POST(postReq);
    expect(postRes.status).toBe(200);
    const postJson = await postRes.json();
    expect(postJson.businessInfo.facebook_url).toBe('https://facebook.com/owner.personal.profile');
    expect(postJson.businessInfo.instagram_url).toBe('https://instagram.com/owner.nail.studio');

    const getReq = new NextRequest('http://localhost:3000/api/admin/cms/business-info', {
      method: 'GET',
      headers: {
        cookie: 'sb-authenticated=true; sb-role=super_admin; sb-email=admin@glamournails.com.au; sb-id=stf-001',
      },
    });
    const getRes = await GET(getReq);
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.businessInfo.facebook_url).toBe('https://facebook.com/owner.personal.profile');
    expect(getJson.businessInfo.instagram_url).toBe('https://instagram.com/owner.nail.studio');

    const publicInfo = await getPublicBusinessInfo();
    expect(publicInfo.facebookUrl).toBe('https://facebook.com/owner.personal.profile');
    expect(publicInfo.instagramUrl).toBe('https://instagram.com/owner.nail.studio');

    const schema = generateLocalBusinessSchema({
      ...publicInfo,
      socialLinks: {
        ...publicInfo.socialLinks,
        telegramBotToken: 'secret-token-should-not-leak',
        website_title: 'Not a URL',
      },
    });
    expect(schema.sameAs).toContain('https://facebook.com/owner.personal.profile');
    expect(schema.sameAs).toContain('https://instagram.com/owner.nail.studio');
    expect(schema.sameAs).not.toContain('secret-token-should-not-leak');
    expect(schema.sameAs).not.toContain('Not a URL');
  });

  it('rejects unsafe Facebook/Instagram URLs with HTTP 400', async () => {
    const badReq = new NextRequest('http://localhost:3000/api/admin/cms/business-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: 'sb-authenticated=true; sb-role=super_admin; sb-email=admin@glamournails.com.au; sb-id=stf-001',
      },
      body: JSON.stringify({
        facebook_url: 'javascript:alert(1)',
      }),
    });

    const badRes = await POST(badReq);
    expect(badRes.status).toBe(400);
  });
});
