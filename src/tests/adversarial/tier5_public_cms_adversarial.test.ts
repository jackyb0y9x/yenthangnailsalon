/**
 * Tier 5 Adversarial Coverage Hardening Test Suite
 * Focus Domains:
 * 1. Public Website & Bilingual i18n
 * 2. International SEO & Structured Data
 * 3. Dynamic CMS & Storage
 *
 * Authored by: Empirical Challenger 1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Domain 1: i18n & Bilingual Imports
import {
  LOCALES,
  DEFAULT_LOCALE,
  LOCALE_CONFIGS,
  isValidLocale,
  type Locale,
} from '@/lib/i18n/config';
import { deepMergeWithFallback, getDictionary } from '@/lib/i18n/dictionaries';
import { getLocalizedPath } from '@/components/shared/LanguageSwitcher';
import enMessages from '@/messages/en.json';
import viMessages from '@/messages/vi.json';

// Domain 2: SEO & Structured Data Imports
import {
  generateLocalBusinessSchema,
  sanitizeJsonLd,
  DEFAULT_SALON_INFO,
} from '@/lib/seo/schema';
import { generateLocalizedMetadata } from '@/lib/seo/metadata';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';

// Domain 3: CMS & Storage Imports
import { GET as getRevalidate, POST as postRevalidate } from '@/app/api/revalidate/route';
import { triggerCmsRevalidation } from '@/lib/cms/revalidate';
import { GET as getHero, POST as postHero } from '@/app/api/admin/cms/hero/route';
import { GET as getAnnouncement, POST as postAnnouncement } from '@/app/api/admin/cms/announcement/route';
import { GET as getBusinessInfo, POST as postBusinessInfo } from '@/app/api/admin/cms/business-info/route';
import { GET as getHours, POST as postHours } from '@/app/api/admin/cms/hours/route';
import { GET as getServices, POST as postService } from '@/app/api/admin/services/route';
import { PUT as putService, DELETE as deleteService } from '@/app/api/admin/services/[id]/route';
import { GET as getGallery, POST as postGallery } from '@/app/api/admin/gallery/route';
import { PUT as putGallery, DELETE as deleteGallery } from '@/app/api/admin/gallery/[id]/route';
import { POST as postUpload } from '@/app/api/admin/upload/route';
import {
  validateImageFile,
  sanitizeStorageFileName,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_GALLERY_SIZE_BYTES,
} from '@/lib/supabase/storage';
import {
  getPublicServices,
  getPublicGallery,
  getPublicHeroSection,
  getPublicBusinessInfo,
  getPublicAnnouncements,
  getOpeningStatus,
  FALLBACK_SERVICES,
  FALLBACK_GALLERY,
} from '@/lib/cms/public-data';
import { isValidABN } from '@/lib/utils/validation';

// Mock next/cache so that revalidatePath and revalidateTag don't throw Next.js store invariants in tests
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Helper to construct authenticated or unauthenticated NextRequest objects
function createAdminRequest(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  role: 'super_admin' | 'manager' | 'staff' = 'manager',
  authenticated: boolean = true
): NextRequest {
  const headers: Record<string, string> = {};
  if (authenticated) {
    headers['Cookie'] = `sb-authenticated=true; sb-role=${role}; sb-email=${role}@glamournails.com.au`;
  }
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  return new NextRequest(url, {
    method,
    headers,
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  });
}

describe('Tier 5 Adversarial Coverage Hardening Suite: Public Showcase, SEO & Dynamic CMS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // DOMAIN 1: Public Website & Bilingual i18n
  // =========================================================================
  describe('Domain 1: Public Website & Bilingual i18n Resilience', () => {

    describe('1.1: Vietnamese Unicode Normalization, Diacritics & Case-Folding', () => {
      it('correctly compares Vietnamese strings across NFC and NFD representations', () => {
        // Vietnamese sentence with tone marks and modified vowels in composed (NFC)
        const composedSentence = 'Chăm sóc móng tay nghệ thuật đắp bột và nhúng SNS cao cấp tại Sydney';
        // Same sentence converted to decomposed (NFD)
        const decomposedSentence = composedSentence.normalize('NFD');

        // Verify that raw JavaScript string equality fails across NFC and NFD
        expect(composedSentence === decomposedSentence).toBe(false);

        // Verify that normalizing to NFC brings them into exact equality
        expect(composedSentence.normalize('NFC') === decomposedSentence.normalize('NFC')).toBe(true);

        // Verify character length difference between NFC and NFD due to combining diacritics
        expect(decomposedSentence.length).toBeGreaterThan(composedSentence.length);
      });

      it('verifies Vietnamese Đ and đ case-folding and character preservation', () => {
        const uppercaseD = 'ĐẶT LỊCH HẸN VÀ TƯ VẤN LÀM MÓNG';
        const lowercaseD = 'đặt lịch hẹn và tư vấn làm móng';

        expect(uppercaseD.toLowerCase()).toBe(lowercaseD);
        expect(lowercaseD.toUpperCase()).toBe(uppercaseD);

        // Code points verification
        expect(uppercaseD.charCodeAt(0)).toBe(0x0110); // Đ
        expect(lowercaseD.charCodeAt(0)).toBe(0x0111); // đ
      });

      it('confirms all 5 Vietnamese tone marks across all modified vowels in dictionary', () => {
        const allViText = JSON.stringify(viMessages);

        // Acute (sắc), Grave (huyền), Hook above (hỏi), Tilde (ngã), Dot below (nặng)
        expect(/[áắấéếíóốớúứý]/i.test(allViText)).toBe(true);
        expect(/[àằầèềìòồờùừỳ]/i.test(allViText)).toBe(true);
        expect(/[ảẳẩẻểỉỏổởủửỷ]/i.test(allViText)).toBe(true);
        expect(/[ãẵẫẽễĩõỗỡũữỹ]/i.test(allViText)).toBe(true);
        expect(/[ạặậẹệịọộợụựỵ]/i.test(allViText)).toBe(true);

        // Modified vowels (ă, â, đ, ê, ô, ơ, ư)
        const modifiedVowels = ['ă', 'â', 'đ', 'ê', 'ô', 'ơ', 'ư'];
        for (const char of modifiedVowels) {
          expect(allViText.toLowerCase().includes(char)).toBe(true);
        }
      });
    });

    describe('1.2: Dictionary Fallback Engine (deepMergeWithFallback) Adversarial Edge Cases', () => {
      it('preserves valid falsy values (false, 0) and does not replace them with fallback', () => {
        const fallback = {
          enabled: true,
          count: 10,
          label: 'Default Label',
          ratio: 1.5,
        };

        const target = {
          enabled: false, // Must stay false
          count: 0,       // Must stay 0
          label: '',      // Empty string must fall back to 'Default Label'
          ratio: null as any, // Null must fall back to 1.5
        };

        const merged = deepMergeWithFallback(target, fallback);

        expect(merged.enabled).toBe(false);
        expect(merged.count).toBe(0);
        expect(merged.label).toBe('Default Label');
        expect(merged.ratio).toBe(1.5);
      });

      it('resists prototype pollution keys (__proto__, constructor, prototype) safely', () => {
        const malicious = JSON.parse(
          '{"__proto__": {"polluted": true}, "constructor": {"prototype": {"admin": true}}}'
        );
        const fallback = { safeKey: 'safeValue' };

        const merged = deepMergeWithFallback(malicious, fallback);

        expect((({} as any).polluted)).toBeUndefined();
        expect((({} as any).admin)).toBeUndefined();
        expect(merged.safeKey).toBe('safeValue');
      });

      it('survives deeply nested dictionaries (40 levels) without stack overflow', () => {
        let nestedFallback: any = { leaf: 'leaf_value' };
        let nestedTarget: any = {};

        for (let i = 0; i < 40; i++) {
          nestedFallback = { [`nest_${i}`]: nestedFallback };
          if (i < 20) {
            nestedTarget = { [`nest_${i}`]: nestedTarget };
          }
        }

        const merged = deepMergeWithFallback(nestedTarget, nestedFallback);
        expect(merged).toBeDefined();

        let curr = merged;
        for (let i = 39; i >= 0; i--) {
          expect(curr).toHaveProperty(`nest_${i}`);
          curr = curr[`nest_${i}`];
        }
        expect(curr.leaf).toBe('leaf_value');
      });

      it('handles null, undefined, empty object targets cleanly', () => {
        const fallback = { a: 'hello', b: { c: 'world' } };

        expect(deepMergeWithFallback(null, fallback)).toEqual(fallback);
        expect(deepMergeWithFallback(undefined, fallback)).toEqual(fallback);
        expect(deepMergeWithFallback({}, fallback)).toEqual(fallback);
      });

      it('asynchronously returns complete English dictionary when getDictionary is queried with unknown locale', async () => {
        const en = await getDictionary('en');
        const unsupp1 = await getDictionary('fr');
        const unsupp2 = await getDictionary('es');
        const unsupp3 = await getDictionary('zh-CN');
        const invalid = await getDictionary('../../admin');

        expect(unsupp1.common.brandName).toBe(en.common.brandName);
        expect(unsupp2.common.brandName).toBe(en.common.brandName);
        expect(unsupp3.common.brandName).toBe(en.common.brandName);
        expect(invalid.common.brandName).toBe(en.common.brandName);
      });
    });

    describe('1.3: Subpath Routing & Language Switcher (getLocalizedPath)', () => {
      it('correctly maps root, home, and subpaths between locales', () => {
        expect(getLocalizedPath('/', 'en')).toBe('/en');
        expect(getLocalizedPath('/', 'vi')).toBe('/vi');
        expect(getLocalizedPath('/en', 'vi')).toBe('/vi');
        expect(getLocalizedPath('/vi', 'en')).toBe('/en');
        expect(getLocalizedPath('/en/services', 'vi')).toBe('/vi/services');
        expect(getLocalizedPath('/vi/gallery', 'en')).toBe('/en/gallery');
        expect(getLocalizedPath('/en/about', 'vi')).toBe('/vi/about');
        expect(getLocalizedPath('/vi/contact', 'en')).toBe('/en/contact');
      });

      it('preserves query parameters during language switching', () => {
        const query = 'category=SNS%20Dipping&sort=price_asc';
        expect(getLocalizedPath('/en/gallery', 'vi', query)).toBe(`/vi/gallery?${query}`);
        expect(getLocalizedPath('/vi/services', 'en', 'page=2')).toBe('/en/services?page=2');
      });

      it('sanitizes multi-slash paths and trailing slashes cleanly', () => {
        expect(getLocalizedPath('//services//', 'vi')).toBe('/vi/services');
        expect(getLocalizedPath('///about///', 'en')).toBe('/en/about');
        expect(getLocalizedPath('/en//contact//', 'vi')).toBe('/vi/contact');
      });

      it('prepends locale if path does not start with an existing supported locale', () => {
        expect(getLocalizedPath('/services', 'en')).toBe('/en/services');
        expect(getLocalizedPath('/gallery', 'vi')).toBe('/vi/gallery');
      });
    });

    describe('1.4: Vietnamese Bilingual Fallback Contract Audit', () => {
      it('verifies that fallback hero, services, and announcements provide non-empty values for both en and vi', () => {
        for (const service of FALLBACK_SERVICES) {
          expect(service.name_en.trim().length).toBeGreaterThan(0);
          expect(service.name_vi.trim().length).toBeGreaterThan(0);
          expect(service.description_en.trim().length).toBeGreaterThan(0);
          expect(service.description_vi.trim().length).toBeGreaterThan(0);
        }

        for (const galleryItem of FALLBACK_GALLERY) {
          expect(galleryItem.title_en.trim().length).toBeGreaterThan(0);
          expect(galleryItem.title_vi.trim().length).toBeGreaterThan(0);
        }
      });

      it('records empirical behavior when service name_vi or description_vi is empty string', () => {
        // Test helper simulating the fallback expression (service.name_vi || service.name_en)
        const mockServiceEmptyVi = {
          name_en: 'Signature Manicure',
          name_vi: '',
          description_en: 'Luxury nail care',
          description_vi: '',
        };

        const resolvedNameViWithFallback = mockServiceEmptyVi.name_vi || mockServiceEmptyVi.name_en;
        const resolvedDescViWithFallback = mockServiceEmptyVi.description_vi || mockServiceEmptyVi.description_en;

        expect(resolvedNameViWithFallback).toBe('Signature Manicure');
        expect(resolvedDescViWithFallback).toBe('Luxury nail care');
      });
    });
  });

  // =========================================================================
  // DOMAIN 2: International SEO & Structured Data
  // =========================================================================
  describe('Domain 2: International SEO & Structured Data Conformance', () => {

    describe('2.1: Schema.org LocalBusiness / NailSalon JSON-LD Generator', () => {
      it('generates valid Schema.org NailSalon JSON-LD structured data with all statutory Australian fields', () => {
        const schema = generateLocalBusinessSchema();

        expect(schema['@context']).toBe('https://schema.org');
        expect(schema['@type']).toBe('NailSalon');
        expect(schema['@id']).toBe('https://glamournails.com.au/#salon');
        expect(schema.name).toBe('Glamour Nails & Spa Sydney');
        expect(schema.currenciesAccepted).toBe('AUD');
        expect(schema.priceRange).toBe('$$');
        expect(schema.taxID).toBe('51 824 753 556');
        expect(schema.identifier.name).toBe('ABN');
        expect(schema.identifier.value).toBe('51 824 753 556');

        // Address conformance
        expect(schema.address.addressCountry).toBe('AU');
        expect(schema.address.addressRegion).toBe('NSW');
        expect(schema.address.addressLocality).toBe('Sydney');
        expect(schema.address.postalCode).toBe('2000');

        // Geo coordinates
        expect(schema.geo.latitude).toBe(-33.8688);
        expect(schema.geo.longitude).toBe(151.2093);

        // Opening hours specifications
        expect(Array.isArray(schema.openingHoursSpecification)).toBe(true);
        expect(schema.openingHoursSpecification.length).toBe(7); // Mon-Sun
        const mondaySpec = schema.openingHoursSpecification.find((s) => s.dayOfWeek === 'Monday');
        expect(mondaySpec).toBeDefined();
        expect(mondaySpec?.opens).toBe('09:00');
        expect(mondaySpec?.closes).toBe('18:00');
      });

      it('survives null, undefined, or empty opening hours and social links in customInfo without throwing', () => {
        const customInfo = {
          salonName: 'Custom Sydney Salon',
          openingHours: {},
          socialLinks: {},
        };

        const schema = generateLocalBusinessSchema(customInfo);
        expect(schema.name).toBe('Custom Sydney Salon');
        expect(schema.openingHoursSpecification).toEqual([]);
        expect(schema.sameAs).toEqual([]);
      });

      it('safely handles closed days in openingHours without including them in specs', () => {
        const customHours = {
          monday: { open: '09:00', close: '17:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true },
        };

        const schema = generateLocalBusinessSchema({ openingHours: customHours });
        expect(schema.openingHoursSpecification.length).toBe(1);
        expect(schema.openingHoursSpecification[0].dayOfWeek).toBe('Monday');
      });
    });

    describe('2.2: JSON-LD XSS Injection & Sanitization (sanitizeJsonLd)', () => {
      it('sanitizes script tag closing sequences (</script>) to prevent HTML breakout', () => {
        const maliciousObj = {
          name: '</script><script>alert("XSS")</script>',
          description: '<script src="https://attacker.site/steal.js"></script>',
        };

        const sanitized = sanitizeJsonLd(maliciousObj);

        // Must not contain unescaped '<'
        expect(sanitized.includes('</script>')).toBe(false);
        expect(sanitized.includes('<script>')).toBe(false);
        expect(sanitized.includes('\\u003c/script>')).toBe(true);
        expect(sanitized.includes('\\u003cscript>')).toBe(true);

        // Must still be valid JSON when parsed
        const reparsed = JSON.parse(sanitized);
        expect(reparsed.name).toBe('</script><script>alert("XSS")</script>');
      });

      it('sanitizes HTML tags with onload/onerror event handlers', () => {
        const injection = {
          bio: '<img src=x onerror=alert(1)>',
          svg: '<svg onload=alert(document.cookie)>',
        };

        const sanitized = sanitizeJsonLd(injection);
        expect(sanitized.includes('<img')).toBe(false);
        expect(sanitized.includes('<svg')).toBe(false);
        expect(sanitized.includes('\\u003cimg')).toBe(true);
        expect(sanitized.includes('\\u003csvg')).toBe(true);
      });

      it('preserves Vietnamese diacritics during JSON serialization and sanitization', () => {
        const viData = {
          name: 'Tiệm Làm Móng Cao Cấp Sydney - Chăm Sóc Y Khoa',
          address: 'Số 2, 188 Đường George, Sydney NSW 2000',
        };

        const sanitized = sanitizeJsonLd(viData);
        expect(sanitized).toContain('Tiệm Làm Móng Cao Cấp Sydney');
        expect(sanitized).toContain('Đường George');
      });
    });

    describe('2.3: Dynamic Metadata (generateLocalizedMetadata)', () => {
      it('generates complete localized metadata for English locale', () => {
        const meta = generateLocalizedMetadata({
          locale: 'en',
          pathname: '/services',
          title: 'Service Menu | Glamour Nails',
          description: 'Our luxury nail care menu',
        });

        expect(meta.title).toBe('Service Menu | Glamour Nails');
        expect(meta.description).toBe('Our luxury nail care menu');
        expect(meta.alternates?.canonical).toBe('https://glamournails.com.au/en/services');
        expect((meta.alternates?.languages as any)['en-AU']).toBe('https://glamournails.com.au/en/services');
        expect((meta.alternates?.languages as any)['vi-AU']).toBe('https://glamournails.com.au/vi/services');
        expect((meta.alternates?.languages as any)['x-default']).toBe('https://glamournails.com.au/en/services');

        expect(meta.openGraph?.locale).toBe('en_AU');
        expect(meta.openGraph?.alternateLocale).toEqual(['vi_VN']);
        expect(meta.openGraph?.siteName).toBe('Glamour Nails & Spa Sydney');
      });

      it('generates complete localized metadata for Vietnamese locale', () => {
        const meta = generateLocalizedMetadata({
          locale: 'vi',
          pathname: '/gallery',
          title: 'Bộ Sưu Tập | Glamour Nails',
          description: 'Mẫu móng đẹp tại Sydney',
        });

        expect(meta.alternates?.canonical).toBe('https://glamournails.com.au/vi/gallery');
        expect(meta.openGraph?.locale).toBe('vi_VN');
        expect(meta.openGraph?.alternateLocale).toEqual(['en_AU']);
      });

      it('respects noIndex flag for private or temporary pages', () => {
        const indexedMeta = generateLocalizedMetadata({
          locale: 'en',
          title: 'Public Page',
          description: 'Indexed page',
          noIndex: false,
        });
        expect((indexedMeta.robots as any)?.index).toBe(true);
        expect((indexedMeta.robots as any)?.follow).toBe(true);

        const noIndexMeta = generateLocalizedMetadata({
          locale: 'en',
          title: 'Private Page',
          description: 'Unindexed page',
          noIndex: true,
        });
        expect(noIndexMeta.robots).toEqual({ index: false, follow: false });
      });

      it('includes statutory Australian geo-targeting metadata', () => {
        const meta = generateLocalizedMetadata({
          locale: 'en',
          title: 'Contact',
          description: 'Contact us',
        });

        expect(meta.other?.['geo.region']).toBe('AU-NSW');
        expect(meta.other?.['geo.placename']).toBe('Sydney');
        expect(meta.other?.['geo.position']).toBe('-33.8688;151.2093');
        expect(meta.other?.['ICBM']).toBe('-33.8688, 151.2093');
      });
    });

    describe('2.4: Sitemap & Robots Conformance', () => {
      it('generates dynamic sitemap with exactly 10 URL entries across 5 public routes and 2 locales', () => {
        const entries = sitemap();

        // 5 routes ('', '/services', '/gallery', '/contact', '/about') * 2 locales ('en', 'vi') = 10
        expect(entries.length).toBe(10);

        const urls = entries.map((e) => e.url);
        expect(urls).toContain('https://glamournails.com.au/en');
        expect(urls).toContain('https://glamournails.com.au/vi');
        expect(urls).toContain('https://glamournails.com.au/en/services');
        expect(urls).toContain('https://glamournails.com.au/vi/services');
        expect(urls).toContain('https://glamournails.com.au/en/gallery');
        expect(urls).toContain('https://glamournails.com.au/vi/gallery');
        expect(urls).toContain('https://glamournails.com.au/en/contact');
        expect(urls).toContain('https://glamournails.com.au/vi/contact');
        expect(urls).toContain('https://glamournails.com.au/en/about');
        expect(urls).toContain('https://glamournails.com.au/vi/about');

        // Every entry must have all 6 hreflang language alternates
        for (const entry of entries) {
          const langs = entry.alternates?.languages as any;
          expect(langs['en']).toBeDefined();
          expect(langs['en-AU']).toBeDefined();
          expect(langs['vi']).toBeDefined();
          expect(langs['vi-VN']).toBeDefined();
          expect(langs['vi-AU']).toBeDefined();
          expect(langs['x-default']).toBeDefined();
        }
      });

      it('generates robots.txt disallowing admin portals while permitting public site indexing', () => {
        const config = robots();

        expect(config.host).toBe('https://glamournails.com.au');
        expect(config.sitemap).toBe('https://glamournails.com.au/sitemap.xml');

        const rule = config.rules as any;
        const mainRule = Array.isArray(rule) ? rule[0] : rule;

        expect(mainRule.userAgent).toBe('*');
        expect(mainRule.allow).toBe('/');
        expect(mainRule.disallow).toEqual(['/admin', '/api/admin', '/admin/', '/api/']);
      });
    });
  });

  // =========================================================================
  // DOMAIN 3: Dynamic CMS & Storage
  // =========================================================================
  describe('Domain 3: Dynamic CMS & Media Storage Security & Boundary Hardening', () => {

    describe('3.1: Cache Revalidation Endpoint (/api/revalidate & triggerCmsRevalidation)', () => {
      it('rejects revalidation requests with missing secret token (HTTP 401)', async () => {
        const req = new NextRequest('http://localhost:3000/api/revalidate', {
          method: 'POST',
          body: JSON.stringify({ path: '/en/services' }),
        });
        const res = await postRevalidate(req);
        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toMatch(/secret/i);
      });

      it('rejects revalidation requests with invalid secret token (HTTP 401)', async () => {
        const req = new NextRequest('http://localhost:3000/api/revalidate', {
          method: 'POST',
          body: JSON.stringify({ secret: 'wrong-token', path: '/en/services' }),
        });
        const res = await postRevalidate(req);
        expect(res.status).toBe(401);
      });

      it('rejects revalidation when both path and tag parameters are missing (HTTP 400)', async () => {
        const req = new NextRequest('http://localhost:3000/api/revalidate', {
          method: 'POST',
          body: JSON.stringify({ secret: 'glamour-revalidate-secret-2026' }),
        });
        const res = await postRevalidate(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/path or tag/i);
      });

      it('accepts valid revalidation via POST JSON body with path parameter (HTTP 200)', async () => {
        const req = new NextRequest('http://localhost:3000/api/revalidate', {
          method: 'POST',
          body: JSON.stringify({
            secret: 'glamour-revalidate-secret-2026',
            path: '/[locale]/services',
            type: 'page',
          }),
        });
        const res = await postRevalidate(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.revalidated).toBe(true);
        expect(data.path).toBe('/[locale]/services');
      });

      it('accepts valid revalidation via GET query parameters with secret and tag (HTTP 200)', async () => {
        const req = new NextRequest(
          'http://localhost:3000/api/revalidate?secret=glamour-revalidate-secret-2026&tag=services'
        );
        const res = await getRevalidate(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.tag).toBe('services');
      });

      it('accepts valid revalidation via x-revalidate-secret HTTP header (HTTP 200)', async () => {
        const req = new NextRequest('http://localhost:3000/api/revalidate?path=/[locale]/gallery', {
          headers: { 'x-revalidate-secret': 'glamour-revalidate-secret-2026' },
        });
        const res = await getRevalidate(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
      });

      it('executes triggerCmsRevalidation helper and returns success', async () => {
        const res = await triggerCmsRevalidation({ path: '/[locale]/services', tag: 'services' });
        expect(res.success).toBe(true);
      });
    });

    describe('3.2: Admin CMS Hero Banner Manager (/api/admin/cms/hero)', () => {
      it('rejects unauthenticated requests to hero endpoint (HTTP 401)', async () => {
        const req = createAdminRequest('http://localhost:3000/api/admin/cms/hero', 'GET', undefined, 'manager', false);
        const res = await getHero(req);
        expect(res.status).toBe(401);
      });

      it('blocks staff role from mutating hero section (HTTP 403 Forbidden)', async () => {
        const req = createAdminRequest('http://localhost:3000/api/admin/cms/hero', 'POST', {
          headline_en: 'Staff Attempt',
        }, 'staff', true);
        const res = await postHero(req);
        expect(res.status).toBe(403);
      });

      it('allows manager and super_admin to update hero banner with aliases (headline vs title)', async () => {
        const req = createAdminRequest('http://localhost:3000/api/admin/cms/hero', 'POST', {
          headline_en: 'Sydney Master Nail Lounge',
          headline_vi: 'Không Gian Móng Nghệ Thuật Sydney',
          subheadline_en: 'Bespoke manicure and Russian e-file cuticle precision.',
          subheadline_vi: 'Chăm sóc móng chuẩn y khoa và làm sạch da khô châu Âu.',
          cta_text_en: 'Book Now',
          cta_text_vi: 'Đặt Lịch Ngay',
          cta_link: '/contact',
        }, 'manager', true);

        const res = await postHero(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.hero.headline_en).toBe('Sydney Master Nail Lounge');
        expect(data.hero.headline_vi).toBe('Không Gian Móng Nghệ Thuật Sydney');
      });
    });

    describe('3.3: Admin Promotional Announcement Bar (/api/admin/cms/announcement)', () => {
      it('rejects unauthenticated access to announcements (HTTP 401)', async () => {
        const req = createAdminRequest('http://localhost:3000/api/admin/cms/announcement', 'GET', undefined, 'manager', false);
        const res = await getAnnouncement(req);
        expect(res.status).toBe(401);
      });

      it('blocks staff role from updating announcement banner (HTTP 403)', async () => {
        const req = createAdminRequest('http://localhost:3000/api/admin/cms/announcement', 'POST', {
          is_active: false,
        }, 'staff', true);
        const res = await postAnnouncement(req);
        expect(res.status).toBe(403);
      });

      it('allows toggling promotional announcement banner on and off by manager', async () => {
        // 1. Toggle OFF
        const reqOff = createAdminRequest('http://localhost:3000/api/admin/cms/announcement', 'POST', {
          is_active: false,
          message_en: 'Maintenance Tonight',
          message_vi: 'Bảo trì tối nay',
        }, 'manager', true);

        const resOff = await postAnnouncement(reqOff);
        expect(resOff.status).toBe(200);
        const dataOff = await resOff.json();
        expect(dataOff.success).toBe(true);
        expect(dataOff.announcement.is_active).toBe(false);

        // 2. Toggle back ON
        const reqOn = createAdminRequest('http://localhost:3000/api/admin/cms/announcement', 'POST', {
          is_active: true,
          badge_text: 'SPRING SALE',
          message_en: 'Spring Promotion: 15% off SNS Sets!',
          message_vi: 'Ưu đãi mùa xuân: Giảm 15% móng nhúng SNS!',
        }, 'manager', true);

        const resOn = await postAnnouncement(reqOn);
        expect(resOn.status).toBe(200);
        const dataOn = await resOn.json();
        expect(dataOn.announcement.is_active).toBe(true);
        expect(dataOn.announcement.badge_text).toBe('SPRING SALE');
      });
    });

    describe('3.4: Admin Business Info & Emergency Holiday Notice (/api/admin/cms/business-info & /hours)', () => {
      it('rejects business info updates with invalid Australian Business Number (ABN Modulo-89) with HTTP 400', async () => {
        const req = createAdminRequest('http://localhost:3000/api/admin/cms/business-info', 'POST', {
          salon_name: 'Glamour Nails Sydney',
          abn: '12 345 678 901', // Fails Modulo-89 checksum
        }, 'manager', true);

        const res = await postBusinessInfo(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/Invalid Australian Business Number/i);
      });

      it('accepts business info updates with valid ABN and phone details (HTTP 200)', async () => {
        const req = createAdminRequest('http://localhost:3000/api/admin/cms/business-info', 'POST', {
          salon_name: 'Glamour Nails Sydney CBD',
          abn: '51 824 753 556', // Valid ATO Modulo-89 checksum
          phone: '+61 2 9123 4567',
          mobile: '0412 345 678',
          email: 'hello@glamournails.com.au',
          address_street: 'Suite 2, 188 George Street',
          suburb: 'Sydney',
          state: 'NSW',
          postcode: '2000',
          country: 'AU',
        }, 'super_admin', true);

        const res = await postBusinessInfo(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.businessInfo.abn).toBe('51 824 753 556');
      });

      it('updates holiday closure notice and reflects in public opening status badge', async () => {
        // Set emergency holiday closure notice
        const req = createAdminRequest('http://localhost:3000/api/admin/cms/hours', 'POST', {
          holiday_notice_active: true,
          holiday_notice_en: 'Closed for Australia Day Long Weekend',
          holiday_notice_vi: 'Đóng cửa nghỉ lễ Quốc Khánh Úc',
        }, 'manager', true);

        const res = await postHours(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.hours.holiday_notice_active).toBe(true);
        expect(data.hours.holiday_notice_en).toBe('Closed for Australia Day Long Weekend');

        // Verify public opening status calculation
        const statusHoliday = getOpeningStatus(true);
        expect(statusHoliday.isOpen).toBe(false);
        expect(statusHoliday.isHoliday).toBe(true);
        expect(statusHoliday.badgeTextEn).toBe('Closed for Holiday');
        expect(statusHoliday.badgeTextVi).toBe('Nghỉ Lễ Đóng Cửa');

        const statusNormal = getOpeningStatus(false);
        expect(statusNormal.isOpen).toBe(true);
        expect(statusNormal.isHoliday).toBe(false);
      });
    });

    describe('3.5: Admin Services & Gallery CRUD Boundary Stress', () => {
      it('rejects service creation with negative price (HTTP 400)', async () => {
        const req = createAdminRequest('http://localhost:3000/api/admin/services', 'POST', {
          name_en: 'Negative Service',
          price_aud: -20,
        }, 'manager', true);
        const res = await postService(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/non-negative/i);
      });

      it('rejects service creation with excessive price overflow (> $999,999.99) with HTTP 400', async () => {
        const req = createAdminRequest('http://localhost:3000/api/admin/services', 'POST', {
          name_en: 'Million Dollar Service',
          price_aud: 1000000,
        }, 'manager', true);
        const res = await postService(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/maximum/i);
      });

      it('rejects service creation with zero or negative duration minutes (HTTP 400)', async () => {
        const req = createAdminRequest('http://localhost:3000/api/admin/services', 'POST', {
          name_en: 'Zero Duration Service',
          price_aud: 50,
          duration_minutes: 0,
        }, 'manager', true);
        const res = await postService(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/duration/i);
      });

      it('rejects service creation with whitespace-only English name (HTTP 400)', async () => {
        const req = createAdminRequest('http://localhost:3000/api/admin/services', 'POST', {
          name_en: '   ',
          price_aud: 50,
        }, 'manager', true);
        const res = await postService(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/name.*required/i);
      });

      it('accepts complimentary service with zero AUD price ($0.00 AUD) (HTTP 201)', async () => {
        const req = createAdminRequest('http://localhost:3000/api/admin/services', 'POST', {
          name_en: 'Complimentary Polish Removal',
          name_vi: 'Tẩy Sơn Miễn Phí',
          price_aud: 0,
          duration_minutes: 15,
          category: 'Manicure',
        }, 'manager', true);
        const res = await postService(req);
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.service.price_aud).toBe(0);
        expect(data.service.price_cents).toBe(0);
      });

      it('rejects gallery item creation with missing or empty image URL (HTTP 400)', async () => {
        const req = createAdminRequest('http://localhost:3000/api/admin/gallery', 'POST', {
          title_en: 'Test Image',
          image_url: '   ',
        }, 'manager', true);
        const res = await postGallery(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/image URL is required/i);
      });

      it('creates and deletes gallery item cleanly with tags array (HTTP 201 and 200)', async () => {
        const postReq = createAdminRequest('http://localhost:3000/api/admin/gallery', 'POST', {
          title_en: 'Chrome Hologram Nails',
          title_vi: 'Móng Tráng Gương Hologram',
          category: 'Chrome',
          image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80',
          tags: ['Chrome', 'Holo', 'Stiletto'],
          is_featured: true,
        }, 'manager', true);

        const postRes = await postGallery(postReq);
        expect(postRes.status).toBe(201);
        const item = (await postRes.json()).item;
        expect(item.id).toBeDefined();
        expect(item.tags).toEqual(['Chrome', 'Holo', 'Stiletto']);

        // Delete the created item
        const delReq = createAdminRequest(
          `http://localhost:3000/api/admin/gallery/${item.id}`,
          'DELETE',
          undefined,
          'manager',
          true
        );
        const delRes = await deleteGallery(delReq, { params: Promise.resolve({ id: item.id }) });
        expect(delRes.status).toBe(200);
      });
    });

    describe('3.6: Media Storage Validation & Path Traversal Sanitization', () => {
      it('enforces allowed MIME types: only JPEG, PNG, WebP are accepted', () => {
        expect(ALLOWED_MIME_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp']);

        // Valid formats
        expect(validateImageFile({ type: 'image/jpeg', size: 1024 })).toBe(true);
        expect(validateImageFile({ type: 'image/png', size: 1024 })).toBe(true);
        expect(validateImageFile({ type: 'image/webp', size: 1024 })).toBe(true);

        // Invalid formats must throw
        const rejectedTypes = [
          'image/gif',
          'image/svg+xml',
          'application/pdf',
          'text/html',
          'application/x-executable',
          'image/tiff',
          'video/mp4',
        ];

        for (const type of rejectedTypes) {
          expect(() => validateImageFile({ type, size: 1024 })).toThrow(/Invalid file type/);
        }
      });

      it('enforces file size limits: 5MB for salon_cms/services, 8MB for gallery', () => {
        expect(MAX_FILE_SIZE_BYTES).toBe(5 * 1024 * 1024);
        expect(MAX_GALLERY_SIZE_BYTES).toBe(8 * 1024 * 1024);

        // Within limits
        expect(validateImageFile({ type: 'image/jpeg', size: MAX_FILE_SIZE_BYTES }, 'salon_cms')).toBe(true);
        expect(validateImageFile({ type: 'image/jpeg', size: MAX_GALLERY_SIZE_BYTES }, 'gallery')).toBe(true);

        // Exceeding limits by 1 byte must throw
        expect(() =>
          validateImageFile({ type: 'image/jpeg', size: MAX_FILE_SIZE_BYTES + 1 }, 'salon_cms')
        ).toThrow(/exceeds maximum allowed limit/);

        expect(() =>
          validateImageFile({ type: 'image/jpeg', size: MAX_GALLERY_SIZE_BYTES + 1 }, 'gallery')
        ).toThrow(/exceeds maximum allowed limit/);
      });

      it('sanitizes storage file names to prevent path traversal and script execution', () => {
        const attackFileNames = [
          '../../etc/passwd.png',
          '..\\..\\windows\\system32\\cmd.exe.webp',
          '../../../uploads/shell.php.jpg',
          '<script>alert(1)</script>.png',
          'image with spaces and symbols!@#$%^&*().jpg',
          'no_extension',
          '.hiddenfile.webp',
        ];

        for (const filename of attackFileNames) {
          const sanitized = sanitizeStorageFileName(filename);

          // Must not contain directory traversal slashes or backslashes
          expect(sanitized.includes('/')).toBe(false);
          expect(sanitized.includes('\\')).toBe(false);
          expect(sanitized.includes('..')).toBe(false);

          // Must match timestamp-random.ext pattern
          expect(sanitized).toMatch(/^\d+-[a-z0-9]+\.(jpg|jpeg|png|webp)$/);
        }
      });

      it('rejects upload requests targeted at unauthorized storage buckets (HTTP 400)', async () => {
        const formData = new FormData();
        const fakeFile = new File(['fake content'], 'test.png', { type: 'image/png' });
        formData.append('file', fakeFile);
        formData.append('bucket', 'finance_receipts'); // Disallowed private bucket

        const req = createAdminRequest('http://localhost:3000/api/admin/upload', 'POST', formData, 'manager', true);
        const res = await postUpload(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/Invalid storage bucket/i);
      });
    });
  });
});
