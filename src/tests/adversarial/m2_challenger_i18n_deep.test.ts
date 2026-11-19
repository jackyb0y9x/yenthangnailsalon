import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { LOCALES, DEFAULT_LOCALE, LOCALE_CONFIGS, isValidLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary, deepMergeWithFallback } from '@/lib/i18n/dictionaries';
import { getLocalizedPath } from '@/components/shared/LanguageSwitcher';
import { generateLocalBusinessSchema, sanitizeJsonLd } from '@/lib/seo/schema';
import enMessages from '@/messages/en.json';
import viMessages from '@/messages/vi.json';
import { FALLBACK_BUSINESS_INFO, FALLBACK_SERVICES, FALLBACK_GALLERY, FALLBACK_STAFF, FALLBACK_ANNOUNCEMENT } from '@/lib/cms/public-data';

// Helper to recursively collect all string values from an object
function collectAllStrings(obj: Record<string, any>, prefix = ''): Array<{ path: string; value: string }> {
  let results: Array<{ path: string; value: string }> = [];
  for (const [key, val] of Object.entries(obj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'string') {
      results.push({ path: currentPath, value: val });
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      results = results.concat(collectAllStrings(val, currentPath));
    }
  }
  return results;
}

describe('Challenger 1 Adversarial Suite: i18n Routing, Fallbacks, Headers & Vietnamese Diacritics', () => {

  // =========================================================================
  // 1. Adversarial Testing of i18n Routing & Unsupported Locales
  // =========================================================================
  describe('Adversarial i18n Routing & Unsupported Locales', () => {
    it('redirects unsupported locale root paths (/fr, /ja, /xyz) to default /en/<path>', () => {
      const unsupportedPaths = ['/fr', '/ja', '/xyz', '/de', '/es', '/zh'];

      for (const unsupp of unsupportedPaths) {
        const req = new NextRequest(`http://localhost:3000${unsupp}`);
        const res = middleware(req);

        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe(`http://localhost:3000/en${unsupp}`);
        expect(res.cookies.get('NEXT_LOCALE')?.value).toBe('en');
      }
    });

    it('redirects nested unsupported locale subpaths (/fr/services, /ja/gallery) to /en/<unsupported>/<subpath>', () => {
      const req = new NextRequest('http://localhost:3000/fr/services');
      const res = middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/en/fr/services');
    });

    it('redirects unsupported regional locale codes (/en-AU, /vi-VN, /en-US) to /en/<path>', () => {
      const regionalLocales = ['/en-AU', '/vi-VN', '/en-US', '/vi-AU'];

      for (const reg of regionalLocales) {
        const req = new NextRequest(`http://localhost:3000${reg}`);
        const res = middleware(req);

        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe(`http://localhost:3000/en${reg}`);
      }
    });

    it('redirects uppercase locale codes (/EN, /VI) to default /en/<path> (strict case enforcement)', () => {
      const reqEn = new NextRequest('http://localhost:3000/EN');
      const resEn = middleware(reqEn);
      expect(resEn.status).toBe(307);
      expect(resEn.headers.get('location')).toBe('http://localhost:3000/en/EN');

      const reqVi = new NextRequest('http://localhost:3000/VI');
      const resVi = middleware(reqVi);
      expect(resVi.status).toBe(307);
      expect(resVi.headers.get('location')).toBe('http://localhost:3000/en/VI');
    });

    it('redirects unsupported locale to cookie-preferred locale (/fr with NEXT_LOCALE=vi -> /vi/fr)', () => {
      const req = new NextRequest('http://localhost:3000/fr', {
        headers: { cookie: 'NEXT_LOCALE=vi' },
      });
      const res = middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/vi/fr');
      expect(res.cookies.get('NEXT_LOCALE')?.value).toBe('vi');
    });

    it('allows valid supported root locales (/en, /vi) to pass through with 200 OK', () => {
      const reqEn = new NextRequest('http://localhost:3000/en');
      const resEn = middleware(reqEn);
      expect(resEn.status).toBe(200);

      const reqVi = new NextRequest('http://localhost:3000/vi');
      const resVi = middleware(reqVi);
      expect(resVi.status).toBe(200);
    });

    it('allows valid supported subpaths (/en/services, /vi/contact) to pass through with 200 OK', () => {
      const reqEn = new NextRequest('http://localhost:3000/en/services');
      const resEn = middleware(reqEn);
      expect(resEn.status).toBe(200);

      const reqVi = new NextRequest('http://localhost:3000/vi/contact');
      const resVi = middleware(reqVi);
      expect(resVi.status).toBe(200);
    });

    it('allows valid localized paths with trailing slashes (/en/, /vi/) to pass through with 200 OK', () => {
      const reqEn = new NextRequest('http://localhost:3000/en/');
      const resEn = middleware(reqEn);
      expect(resEn.status).toBe(200);

      const reqVi = new NextRequest('http://localhost:3000/vi/');
      const resVi = middleware(reqVi);
      expect(resVi.status).toBe(200);
    });

    it('preserves complex query parameters and hash encodings across unsupported locale redirects', () => {
      const req = new NextRequest(
        'http://localhost:3000/fr/gallery?category=SNS%20Dipping&sort=price_desc&ref=adwords'
      );
      const res = middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe(
        'http://localhost:3000/en/fr/gallery?category=SNS%20Dipping&sort=price_desc&ref=adwords'
      );
    });

    it('synchronizes NEXT_LOCALE cookie when visiting a localized path different from cookie', () => {
      const req = new NextRequest('http://localhost:3000/vi/services', {
        headers: { cookie: 'NEXT_LOCALE=en' },
      });
      const res = middleware(req);

      expect(res.status).toBe(200);
      expect(res.cookies.get('NEXT_LOCALE')?.value).toBe('vi');
    });

    it('does not re-set cookie when cookie already matches pathname locale', () => {
      const req = new NextRequest('http://localhost:3000/en/services', {
        headers: { cookie: 'NEXT_LOCALE=en' },
      });
      const res = middleware(req);

      expect(res.status).toBe(200);
      // Cookie is not re-set if already matching
      expect(res.cookies.get('NEXT_LOCALE')).toBeUndefined();
    });
  });

  // =========================================================================
  // 2. Cookie and Accept-Language Header Detection Matrix & Edge Cases
  // =========================================================================
  describe('Cookie and Accept-Language Header Detection in Middleware', () => {
    it('prioritizes valid NEXT_LOCALE cookie over opposing Accept-Language header (vi cookie vs en header)', () => {
      const req = new NextRequest('http://localhost:3000/', {
        headers: {
          cookie: 'NEXT_LOCALE=vi',
          'accept-language': 'en-AU,en-US;q=0.9,en;q=0.8',
        },
      });
      const res = middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/vi/');
      expect(res.cookies.get('NEXT_LOCALE')?.value).toBe('vi');
    });

    it('prioritizes valid NEXT_LOCALE cookie over opposing Accept-Language header (en cookie vs vi header)', () => {
      const req = new NextRequest('http://localhost:3000/', {
        headers: {
          cookie: 'NEXT_LOCALE=en',
          'accept-language': 'vi-VN,vi;q=0.9,en;q=0.5',
        },
      });
      const res = middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/en/');
      expect(res.cookies.get('NEXT_LOCALE')?.value).toBe('en');
    });

    it('sanitizes and ignores invalid or malicious NEXT_LOCALE cookie values', () => {
      const maliciousCookies = [
        'NEXT_LOCALE=fr',
        'NEXT_LOCALE=xyz',
        'NEXT_LOCALE=../../admin',
        'NEXT_LOCALE=<script>alert(1)</script>',
        'NEXT_LOCALE=VI',
        'NEXT_LOCALE=EN',
        'NEXT_LOCALE=en-AU',
        'NEXT_LOCALE=vi-VN',
        'NEXT_LOCALE=',
        'NEXT_LOCALE=null',
        'NEXT_LOCALE=undefined',
      ];

      for (const cookie of maliciousCookies) {
        const req = new NextRequest('http://localhost:3000/', {
          headers: {
            cookie,
            'accept-language': 'vi-VN,vi;q=0.9',
          },
        });
        const res = middleware(req);

        // Invalid cookie must be discarded; falls back to Accept-Language -> 'vi'
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe('http://localhost:3000/vi/');
        expect(res.cookies.get('NEXT_LOCALE')?.value).toBe('vi');
      }
    });

    it('correctly weighs q-factors in Accept-Language (vi quality > en quality)', () => {
      const req = new NextRequest('http://localhost:3000/', {
        headers: {
          'accept-language': 'en-AU;q=0.6,vi-VN;q=0.9,en;q=0.5',
        },
      });
      const res = middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/vi/');
    });

    it('correctly weighs q-factors in Accept-Language (en quality > vi quality)', () => {
      const req = new NextRequest('http://localhost:3000/', {
        headers: {
          'accept-language': 'vi-VN;q=0.4,en-AU;q=0.95',
        },
      });
      const res = middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/en/');
    });

    it('falls back to default English when Accept-Language has only unsupported languages', () => {
      const req = new NextRequest('http://localhost:3000/', {
        headers: {
          'accept-language': 'fr-FR,fr;q=0.9,de-DE;q=0.8,ja-JP;q=0.7',
        },
      });
      const res = middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/en/');
    });

    it('handles empty or malformed Accept-Language headers gracefully without crashing', () => {
      const malformedHeaders = [
        '',
        '   ',
        ';;;,,,',
        'q=0.9,invalid-syntax',
        '*',
        '*;q=0.5',
        'invalid;quality=abc',
        'vi;q=NaN,en;q=1',
      ];

      for (const header of malformedHeaders) {
        const req = new NextRequest('http://localhost:3000/', {
          headers: header ? { 'accept-language': header } : {},
        });
        const res = middleware(req);

        expect(res.status).toBe(307);
        // Should not crash, should return a valid redirect
        expect(res.headers.get('location')).toMatch(/^http:\/\/localhost:3000\/(en|vi)\//);
      }
    });

    it('handles massive Accept-Language header (1,000 language tags) without ReDoS or crash', () => {
      const tags = Array.from({ length: 1000 }, (_, i) => `lang-${i};q=0.${(i % 9) + 1}`).join(',');
      const fullHeader = `fr-FR;q=0.9,${tags},vi;q=0.99`;

      const req = new NextRequest('http://localhost:3000/', {
        headers: { 'accept-language': fullHeader },
      });
      const start = Date.now();
      const res = middleware(req);
      const elapsed = Date.now() - start;

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/vi/');
      expect(elapsed).toBeLessThan(100); // Must resolve rapidly (< 100ms)
    });

    // =======================================================================
    // EMPIRICAL CHALLENGE FINDING 1: Whitespace in Accept-Language (RFC 9110 OWS)
    // RFC 9110 Section 12.4.2 allows optional whitespace: `weight = OWS ";" OWS "q=" qvalue`
    // When a client sends `; q=` with a space, `part.split(';q=')` does not match `;q=`,
    // keeping the `"; q=0.9"` in the language tag.
    // =======================================================================
    it('empirically records behavior on RFC 9110 optional whitespace in Accept-Language (; q=)', () => {
      // Header where primary tag is standalone with whitespace-separated quality
      const reqWithSpace = new NextRequest('http://localhost:3000/', {
        headers: { 'accept-language': 'vi; q=0.9, en; q=0.8' },
      });
      const resWithSpace = middleware(reqWithSpace);

      // Document empirical finding: Because `split(';q=')` expects no space after ';',
      // `vi; q=0.9` fails exact match `=== 'vi'`, falling back to DEFAULT_LOCALE ('en').
      expect(resWithSpace.status).toBe(307);
      expect(resWithSpace.headers.get('location')).toBe('http://localhost:3000/en/');
    });

    // =======================================================================
    // EMPIRICAL CHALLENGE FINDING 2: Zero Quality (q=0) RFC Semantics
    // In RFC 9110, `q=0` means "not acceptable".
    // Middleware checks `entry.lang === 'vi'` without checking `entry.quality > 0`.
    // =======================================================================
    it('empirically records behavior when Accept-Language explicitly specifies q=0 (not acceptable)', () => {
      const reqZero = new NextRequest('http://localhost:3000/', {
        headers: { 'accept-language': 'vi;q=0' },
      });
      const resZero = middleware(reqZero);

      // Document empirical finding: `middleware.ts` returns 'vi' even though quality is 0
      expect(resZero.status).toBe(307);
      expect(resZero.headers.get('location')).toBe('http://localhost:3000/vi/');
    });
  });

  // =========================================================================
  // 3. Vietnamese Unicode Diacritic Handling & Text Rendering
  // =========================================================================
  describe('Vietnamese Unicode Diacritic Integrity & Text Rendering', () => {
    it('verifies 100% of strings in vi.json use standard Unicode Composed form (NFC)', () => {
      const allViStrings = collectAllStrings(viMessages);
      expect(allViStrings.length).toBeGreaterThanOrEqual(100);

      const nfcViolations: Array<{ path: string; value: string }> = [];
      for (const item of allViStrings) {
        if (item.value !== item.value.normalize('NFC')) {
          nfcViolations.push(item);
        }
      }

      expect(nfcViolations, `NFC violations found in vi.json: ${JSON.stringify(nfcViolations)}`).toEqual([]);
    });

    it('verifies zero Unicode replacement characters (\uFFFD) or corrupt byte sequences in vi.json', () => {
      const allViStrings = collectAllStrings(viMessages);

      for (const item of allViStrings) {
        expect(
          item.value.includes('\uFFFD'),
          `Replacement character found at ${item.path}: "${item.value}"`
        ).toBe(false);
      }
    });

    it('verifies all 5 Vietnamese tone marks and modified vowels are present and valid across vi.json', () => {
      const allViText = collectAllStrings(viMessages).map((i) => i.value).join(' ');

      // Acute (sắc)
      expect(/[áắấéếíóốớúứý]/i.test(allViText)).toBe(true);
      // Grave (huyền)
      expect(/[àằầèềìòồờùừỳ]/i.test(allViText)).toBe(true);
      // Hook above (hỏi)
      expect(/[ảẳẩẻểỉỏổởủửỷ]/i.test(allViText)).toBe(true);
      // Tilde (ngã)
      expect(/[ãẵẫẽễĩõỗỡũữỹ]/i.test(allViText)).toBe(true);
      // Dot below (nặng)
      expect(/[ạặậẹệịọộợụựỵ]/i.test(allViText)).toBe(true);

      // Modified vowels (ă, â, đ, ê, ô, ơ, ư)
      expect(/[ă]/i.test(allViText)).toBe(true);
      expect(/[â]/i.test(allViText)).toBe(true);
      expect(/[đ]/i.test(allViText)).toBe(true);
      expect(/[ê]/i.test(allViText)).toBe(true);
      expect(/[ô]/i.test(allViText)).toBe(true);
      expect(/[ơ]/i.test(allViText)).toBe(true);
      expect(/[ư]/i.test(allViText)).toBe(true);
    });

    it('verifies 100% of Vietnamese fields in CMS fixtures use Unicode NFC and contain no corruption', () => {
      const cmsItemsToCheck: string[] = [
        ...FALLBACK_SERVICES.map((s) => s.name_vi),
        ...FALLBACK_SERVICES.map((s) => s.description_vi),
        ...FALLBACK_GALLERY.map((g) => g.title_vi),
        ...FALLBACK_STAFF.map((st) => st.role_title_vi),
        ...FALLBACK_STAFF.map((st) => st.bio_vi),
        FALLBACK_ANNOUNCEMENT.message_vi,
      ];

      expect(cmsItemsToCheck.length).toBeGreaterThanOrEqual(25);

      for (const str of cmsItemsToCheck) {
        expect(str, 'CMS Vietnamese string is undefined or empty').toBeTruthy();
        expect(str === str.normalize('NFC'), `CMS string not NFC: "${str}"`).toBe(true);
        expect(str.includes('\uFFFD'), `CMS string has replacement char: "${str}"`).toBe(false);
      }
    });

    it('preserves Vietnamese Unicode diacritics during Schema.org sanitizeJsonLd serialization', () => {
      const customVietnameseInfo = {
        salonName: 'Tiệm Móng Glamour Nails & Spa Sydney (Chăm Sóc Cao Cấp)',
        streetAddress: 'Số 2, 188 Đường George, Sydney NSW 2000',
      };

      const schemaObj = generateLocalBusinessSchema(customVietnameseInfo);
      const jsonLdString = sanitizeJsonLd(schemaObj);

      // Must be valid JSON
      const parsed = JSON.parse(jsonLdString);
      expect(parsed.name).toBe('Tiệm Móng Glamour Nails & Spa Sydney (Chăm Sóc Cao Cấp)');
      expect(parsed.address.streetAddress).toBe('Số 2, 188 Đường George, Sydney NSW 2000');

      // Check that diacritics were not mangled or lost
      expect(jsonLdString).toContain('Tiệm Móng');
      expect(jsonLdString).toContain('Chăm Sóc Cao Cấp');
      expect(jsonLdString).toContain('Đường George');
    });

    it('preserves Vietnamese diacritics in URI query strings during localized path switching', () => {
      // Test URL encoding and decoding with Vietnamese diacritics
      const viCategory = 'Móng Úp & Vẽ Nghệ Thuật';
      const encodedQuery = `category=${encodeURIComponent(viCategory)}`;

      const switchedPath = getLocalizedPath('/en/gallery', 'vi', encodedQuery);
      expect(switchedPath).toBe(`/vi/gallery?category=${encodeURIComponent(viCategory)}`);

      // Verify round-trip decoding matches verbatim
      const url = new URL(`http://localhost:3000${switchedPath}`);
      expect(url.searchParams.get('category')).toBe(viCategory);
    });
  });

  // =========================================================================
  // 4. Dictionary Fallback & Key Parity Stress Tests
  // =========================================================================
  describe('Dictionary Fallback & Key Parity Stress Tests', () => {
    it('returns exact English fallback when getDictionary is called with unsupported locale', async () => {
      const enDict = await getDictionary('en');
      const frDict = await getDictionary('fr');
      const jaDict = await getDictionary('ja');
      const invalidDict = await getDictionary('xyz-invalid');

      expect(frDict).toEqual(enDict);
      expect(jaDict).toEqual(enDict);
      expect(invalidDict).toEqual(enDict);
    });

    it('falls back to English for missing or empty keys in partially translated dictionaries', () => {
      const fallback = {
        nav: {
          home: 'Home',
          services: 'Services',
          contact: 'Contact',
        },
        footer: {
          copyright: 'All rights reserved.',
          abn: 'ABN: 51 824 753 556',
        },
      };

      const partialVi = {
        nav: {
          home: 'Trang Chủ',
          services: '', // empty string -> MUST fall back to 'Services'
          // contact missing entirely -> MUST fall back to 'Contact'
        },
        footer: {
          copyright: 'Bảo lưu mọi quyền.',
          // abn missing -> MUST fall back
        },
      };

      const merged = deepMergeWithFallback(partialVi as any, fallback);

      expect(merged.nav.home).toBe('Trang Chủ');
      expect(merged.nav.services).toBe('Services'); // fell back
      expect(merged.nav.contact).toBe('Contact'); // fell back
      expect(merged.footer.copyright).toBe('Bảo lưu mọi quyền.');
      expect(merged.footer.abn).toBe('ABN: 51 824 753 556'); // fell back
    });

    it('does not overwrite falsy valid values (boolean false, number 0) with fallback', () => {
      const fallback = {
        config: {
          enabled: true,
          retryCount: 3,
          label: 'Default',
        },
      };

      const target = {
        config: {
          enabled: false, // Valid boolean false!
          retryCount: 0, // Valid number 0!
          label: '', // Empty string -> should fall back
        },
      };

      const merged = deepMergeWithFallback(target as any, fallback);

      expect(merged.config.enabled).toBe(false);
      expect(merged.config.retryCount).toBe(0);
      expect(merged.config.label).toBe('Default');
    });

    it('validates strict key schema parity between en.json and vi.json (100% symmetric)', () => {
      const enKeys = collectAllStrings(enMessages).map((i) => i.path).sort();
      const viKeys = collectAllStrings(viMessages).map((i) => i.path).sort();

      const missingInVi = enKeys.filter((k) => !viKeys.includes(k));
      const extraInVi = viKeys.filter((k) => !enKeys.includes(k));

      expect(missingInVi).toEqual([]);
      expect(extraInVi).toEqual([]);
      expect(enKeys.length).toBe(viKeys.length);
    });
  });
});
