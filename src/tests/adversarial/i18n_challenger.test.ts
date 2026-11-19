import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { deepMergeWithFallback, getDictionary } from '@/lib/i18n/dictionaries';
import { getLocalizedPath } from '@/components/shared/LanguageSwitcher';
import { isValidLocale, LOCALES, DEFAULT_LOCALE, LOCALE_CONFIGS, type Locale } from '@/lib/i18n/config';
import { middleware } from '@/middleware';
import enMessages from '@/messages/en.json';
import viMessages from '@/messages/vi.json';

// Utility helper to extract all recursive dot-notation paths
function extractAllKeyPaths(obj: Record<string, any>, prefix = ''): string[] {
  let paths: string[] = [];
  for (const key of Object.keys(obj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      paths = paths.concat(extractAllKeyPaths(value, currentPath));
    } else {
      paths.push(currentPath);
    }
  }
  return paths;
}

function getValueByPath(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

describe('Adversarial Challenger Suite: i18n & Dictionary Resilience', () => {

  // =========================================================================
  // 1. Stress-testing `deepMergeWithFallback`
  // =========================================================================
  describe('deepMergeWithFallback Stress & Security Tests', () => {
    it('survives deeply nested objects (30 levels) without call stack overflow', () => {
      let deepFallback: any = { leaf: 'fallback-leaf' };
      let deepTarget: any = {};

      for (let i = 0; i < 30; i++) {
        deepFallback = { [`level_${i}`]: deepFallback };
        if (i < 15) {
          // target only has first 15 levels
          deepTarget = { [`level_${i}`]: deepTarget };
        }
      }

      const merged = deepMergeWithFallback(deepTarget, deepFallback);
      expect(merged).toBeDefined();

      // Verify that level 29 exists and reaches the fallback leaf
      let current = merged;
      for (let i = 29; i >= 0; i--) {
        expect(current).toHaveProperty(`level_${i}`);
        current = current[`level_${i}`];
      }
      expect(current.leaf).toBe('fallback-leaf');
    });

    it('falls back correctly on null, undefined, empty string, but preserves false and 0', () => {
      const fallback = {
        title: 'Original Title',
        count: 10,
        isActive: true,
        description: 'Original Description',
        price: 50,
      };

      const target = {
        title: '', // empty string should fall back
        count: 0, // 0 is valid numeric value!
        isActive: false, // false is valid boolean value!
        description: null as any, // null should fall back
        price: undefined as any, // undefined should fall back
      };

      const merged = deepMergeWithFallback(target, fallback);

      expect(merged.title).toBe('Original Title');
      expect(merged.count).toBe(0);
      expect(merged.isActive).toBe(false);
      expect(merged.description).toBe('Original Description');
      expect(merged.price).toBe(50);
    });

    it('handles target being completely null, undefined, or empty object gracefully', () => {
      const fallback = { a: 1, b: { c: 'hello' } };

      expect(deepMergeWithFallback(null, fallback)).toEqual(fallback);
      expect(deepMergeWithFallback(undefined, fallback)).toEqual(fallback);
      expect(deepMergeWithFallback({}, fallback)).toEqual(fallback);
    });

    it('resists prototype pollution attacks (__proto__, constructor, prototype)', () => {
      const maliciousPayload = JSON.parse(
        '{"__proto__": {"polluted": true}, "constructor": {"prototype": {"admin": true}}}'
      );

      const fallback = {
        common: { brand: 'Safe Brand' },
      };

      const merged = deepMergeWithFallback(maliciousPayload, fallback);

      expect((({} as any).polluted)).toBeUndefined();
      expect((({} as any).admin)).toBeUndefined();
      expect(Object.prototype.hasOwnProperty('polluted')).toBe(false);
      expect(Object.prototype.hasOwnProperty('admin')).toBe(false);
      expect(merged.common.brand).toBe('Safe Brand');
    });

    it('handles arrays cleanly without corrupting array structure', () => {
      const fallback = {
        tags: ['manicure', 'pedicure'],
        nested: { items: [1, 2, 3] },
      };

      const target = {
        tags: ['sns', 'acrylic'],
        nested: { items: [] }, // empty array in target
      };

      const merged = deepMergeWithFallback(target, fallback);

      expect(Array.isArray(merged.tags)).toBe(true);
      expect(merged.tags).toEqual(['sns', 'acrylic']);
      expect(Array.isArray(merged.nested.items)).toBe(true);
      expect(merged.nested.items).toEqual([]);
    });

    it('handles mismatched types (target primitive vs fallback object and vice versa)', () => {
      const fallback = {
        section: { title: 'Section Title', body: 'Section Body' },
        simpleText: 'Simple Fallback',
      };

      // Case 1: Target provides string where object was expected
      const target1 = {
        section: 'invalid string instead of object' as any,
        simpleText: 'Overridden Simple',
      };
      const merged1 = deepMergeWithFallback(target1, fallback);
      expect(merged1.simpleText).toBe('Overridden Simple');
      expect(merged1.section).toBe('invalid string instead of object');

      // Case 2: Target provides object where string was expected
      const target2 = {
        section: { title: 'Valid Title', body: 'Valid Body' },
        simpleText: { unexpected: 'object' } as any,
      };
      const merged2 = deepMergeWithFallback(target2, fallback);
      expect(merged2.section.title).toBe('Valid Title');
      expect((merged2.simpleText as any).unexpected).toBe('object');
    });
  });

  // =========================================================================
  // 2. Dictionary Symmetry & Key Parity Stress Tests
  // =========================================================================
  describe('Dictionary Symmetry & Parity Invariants', () => {
    const enKeys = extractAllKeyPaths(enMessages).sort();
    const viKeys = extractAllKeyPaths(viMessages).sort();

    it('has 100% exact key symmetry between en.json and vi.json (zero missing or extra keys)', () => {
      const missingInVi = enKeys.filter((k) => !viKeys.includes(k));
      const extraInVi = viKeys.filter((k) => !enKeys.includes(k));

      expect(missingInVi, `Missing in vi.json: ${missingInVi.join(', ')}`).toEqual([]);
      expect(extraInVi, `Extra in vi.json: ${extraInVi.join(', ')}`).toEqual([]);
      expect(enKeys.length).toBe(viKeys.length);
      expect(enKeys.length).toBeGreaterThanOrEqual(70);
    });

    it('guarantees zero empty strings or whitespace-only values in both catalogs', () => {
      for (const key of enKeys) {
        const enVal = getValueByPath(enMessages, key);
        expect(typeof enVal, `en.${key} is not string`).toBe('string');
        expect(enVal.trim().length, `en.${key} is empty or whitespace`).toBeGreaterThan(0);

        const viVal = getValueByPath(viMessages, key);
        expect(typeof viVal, `vi.${key} is not string`).toBe('string');
        expect(viVal.trim().length, `vi.${key} is empty or whitespace`).toBeGreaterThan(0);
      }
    });

    it('ensures verbatim compliance for critical regulatory, tax, and health strings', () => {
      // 1. Australian Business Number (ABN)
      const expectedAbn = 'ABN: 51 824 753 556';
      expect(enMessages.common.abn).toBe(expectedAbn);
      expect(viMessages.common.abn).toBe(expectedAbn);
      expect(enMessages.footer.abnText).toBe(expectedAbn);
      expect(viMessages.footer.abnText).toBe(expectedAbn);

      // 2. GST Invariant
      const expectedGst = 'All prices are inclusive of Australian GST (10%)';
      expect(enMessages.common.gstNotice).toBe(expectedGst);
      expect(viMessages.common.gstNotice).toBe(expectedGst);
      expect(enMessages.services.gstNotice).toBe(expectedGst);
      expect(viMessages.services.gstNotice).toBe(expectedGst);

      // 3. Hospital-Grade Autoclave Invariant
      const expectedHygiene = 'Medical-grade autoclave sterilization and disposable files.';
      expect(enMessages.about.hygieneText).toBe(expectedHygiene);
      expect(viMessages.about.hygieneText).toBe(expectedHygiene);

      // 4. Australian Contact Phones
      expect(enMessages.common.phone).toBe('+61 2 9123 4567');
      expect(viMessages.common.phone).toBe('+61 2 9123 4567');
      expect(enMessages.common.mobile).toBe('0412 345 678');
      expect(viMessages.common.mobile).toBe('0412 345 678');
    });

    it('loads dictionaries asynchronously with fallback for unknown or invalid locales', async () => {
      const en = await getDictionary('en');
      const vi = await getDictionary('vi');
      const fallbackFr = await getDictionary('fr'); // unconfigured locale
      const fallbackNull = await getDictionary(null as any);
      const fallbackEmpty = await getDictionary('');

      expect(en.common.brandName).toBe('Glamour Nails & Spa Sydney');
      expect(vi.common.brandName).toBe('Glamour Nails & Spa Sydney');
      expect(fallbackFr.common.brandName).toBe(en.common.brandName);
      expect(fallbackNull.common.brandName).toBe(en.common.brandName);
      expect(fallbackEmpty.common.brandName).toBe(en.common.brandName);
    });
  });

  // =========================================================================
  // 3. Stress-testing `getLocalizedPath`
  // =========================================================================
  describe('getLocalizedPath Routing & URL Mutation Stress Tests', () => {
    it('handles root, empty, and multi-slash paths', () => {
      expect(getLocalizedPath('', 'vi')).toBe('/vi');
      expect(getLocalizedPath('/', 'vi')).toBe('/vi');
      expect(getLocalizedPath('//', 'vi')).toBe('/vi');
      expect(getLocalizedPath('///', 'vi')).toBe('/vi');
      expect(getLocalizedPath('////', 'en')).toBe('/en');
    });

    it('correctly swaps locales for standard routes', () => {
      expect(getLocalizedPath('/en', 'vi')).toBe('/vi');
      expect(getLocalizedPath('/vi', 'en')).toBe('/en');
      expect(getLocalizedPath('/en/services', 'vi')).toBe('/vi/services');
      expect(getLocalizedPath('/vi/services', 'en')).toBe('/en/services');
      expect(getLocalizedPath('/en/gallery', 'vi')).toBe('/vi/gallery');
      expect(getLocalizedPath('/vi/about', 'en')).toBe('/en/about');
      expect(getLocalizedPath('/en/contact', 'vi')).toBe('/vi/contact');
    });

    it('prepends locale if path does not start with a recognized locale', () => {
      expect(getLocalizedPath('/services', 'en')).toBe('/en/services');
      expect(getLocalizedPath('/services', 'vi')).toBe('/vi/services');
      expect(getLocalizedPath('/about', 'vi')).toBe('/vi/about');
      expect(getLocalizedPath('/admin/dashboard', 'en')).toBe('/en/admin/dashboard');
      expect(getLocalizedPath('/api/consultation', 'vi')).toBe('/vi/api/consultation');
    });

    it('handles trailing slashes and normalizes them cleanly', () => {
      expect(getLocalizedPath('/en/services/', 'vi')).toBe('/vi/services');
      expect(getLocalizedPath('/vi/gallery/', 'en')).toBe('/en/gallery');
      expect(getLocalizedPath('/services/', 'vi')).toBe('/vi/services');
      expect(getLocalizedPath('/en/', 'vi')).toBe('/vi');
    });

    it('preserves query parameters across transitions', () => {
      // Standard query parameter
      expect(getLocalizedPath('/en/gallery', 'vi', 'category=SNS+Dipping')).toBe(
        '/vi/gallery?category=SNS+Dipping'
      );

      // Multiple query parameters
      expect(
        getLocalizedPath('/en/services', 'vi', 'category=Pedicure&sort=price&page=2')
      ).toBe('/vi/services?category=Pedicure&sort=price&page=2');

      // Empty query string should not produce dangling '?'
      expect(getLocalizedPath('/en/services', 'vi', '')).toBe('/vi/services');
      expect(getLocalizedPath('/en/services', 'vi', undefined)).toBe('/vi/services');
    });

    it('handles complex query strings with URL encoding and special characters', () => {
      const complexQuery = 'search=Nail%20Art%26Spa&filter=%2B61412345678&tags=gel,sns';
      expect(getLocalizedPath('/en/gallery', 'vi', complexQuery)).toBe(
        `/vi/gallery?${complexQuery}`
      );
    });

    it('handles edge case when path contains nested locale or duplicate segments', () => {
      // If someone accesses /en/vi/services
      expect(getLocalizedPath('/en/vi/services', 'en')).toBe('/en/vi/services');
      expect(getLocalizedPath('/en/vi/services', 'vi')).toBe('/vi/vi/services');
      expect(getLocalizedPath('/en/en', 'vi')).toBe('/vi/en');
    });

    it('handles relative segments without throwing runtime errors', () => {
      expect(getLocalizedPath('/en/../admin', 'vi')).toBe('/vi/../admin');
      expect(getLocalizedPath('/en/./services', 'vi')).toBe('/vi/./services');
    });
  });

  // =========================================================================
  // 4. Edge Middleware Locale Resolution Adversarial Tests
  // =========================================================================
  describe('Middleware Locale Detection & Redirection Attacks', () => {
    it('redirects root / to /en when no cookies or headers are present', () => {
      const req = new NextRequest('http://localhost:3000/');
      const res = middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/en/');
      expect(res.cookies.get('NEXT_LOCALE')?.value).toBe('en');
    });

    it('detects Vietnamese from Accept-Language header when no cookie exists', () => {
      const req = new NextRequest('http://localhost:3000/', {
        headers: {
          'accept-language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });
      const res = middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/vi/');
      expect(res.cookies.get('NEXT_LOCALE')?.value).toBe('vi');
    });

    it('prefers NEXT_LOCALE cookie over Accept-Language header', () => {
      const req = new NextRequest('http://localhost:3000/services', {
        headers: {
          'accept-language': 'en-AU,en;q=0.9',
          cookie: 'NEXT_LOCALE=vi',
        },
      });
      const res = middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/vi/services');
      expect(res.cookies.get('NEXT_LOCALE')?.value).toBe('vi');
    });

    it('sanitizes and ignores invalid or malicious NEXT_LOCALE cookie values', () => {
      const req = new NextRequest('http://localhost:3000/', {
        headers: {
          cookie: 'NEXT_LOCALE=../../admin',
        },
      });
      const res = middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/en/');
      expect(res.cookies.get('NEXT_LOCALE')?.value).toBe('en');
    });

    it('preserves query parameters during middleware redirection', () => {
      const req = new NextRequest('http://localhost:3000/gallery?category=SNS%20Dipping&sort=asc');
      const res = middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe(
        'http://localhost:3000/en/gallery?category=SNS%20Dipping&sort=asc'
      );
    });

    it('allows valid localized paths to proceed and synchronizes cookie', () => {
      const req = new NextRequest('http://localhost:3000/vi/services', {
        headers: {
          cookie: 'NEXT_LOCALE=en',
        },
      });
      const res = middleware(req);

      // Should not redirect (status 200 / next)
      expect(res.status).toBe(200);
      expect(res.cookies.get('NEXT_LOCALE')?.value).toBe('vi');
    });
  });

  // =========================================================================
  // 5. SEO & Locale Config Consistency
  // =========================================================================
  describe('SEO & Locale Config Consistency', () => {
    it('verifies exact Australian locale mappings and hreflang standards', () => {
      expect(DEFAULT_LOCALE).toBe('en');
      expect(LOCALES).toEqual(['en', 'vi']);
      expect(LOCALE_CONFIGS.en.hreflang).toBe('en-AU');
      expect(LOCALE_CONFIGS.en.ogLocale).toBe('en_AU');
      expect(LOCALE_CONFIGS.vi.hreflang).toBe('vi-AU');
      expect(LOCALE_CONFIGS.vi.ogLocale).toBe('vi_VN');
    });

    it('validates locale types with strict type guard isValidLocale', () => {
      expect(isValidLocale('en')).toBe(true);
      expect(isValidLocale('vi')).toBe(true);
      expect(isValidLocale('EN')).toBe(false); // Case sensitive
      expect(isValidLocale('VI')).toBe(false);
      expect(isValidLocale('en-AU')).toBe(false);
      expect(isValidLocale('vi-VN')).toBe(false);
      expect(isValidLocale('fr')).toBe(false);
      expect(isValidLocale('')).toBe(false);
      expect(isValidLocale(null)).toBe(false);
      expect(isValidLocale(undefined)).toBe(false);
      expect(isValidLocale({})).toBe(false);
      expect(isValidLocale([])).toBe(false);
    });
  });
});
