import { describe, it, expect } from 'vitest';
import { isValidLocale, LOCALES, DEFAULT_LOCALE, LOCALE_CONFIGS } from '@/lib/i18n/config';
import { deepMergeWithFallback, getDictionary } from '@/lib/i18n/dictionaries';
import { getLocalizedPath } from '@/components/shared/LanguageSwitcher';

describe('i18n Configuration & Helpers', () => {
  it('should validate supported locales correctly', () => {
    expect(isValidLocale('en')).toBe(true);
    expect(isValidLocale('vi')).toBe(true);
    expect(isValidLocale('fr')).toBe(false);
    expect(isValidLocale('es')).toBe(false);
    expect(isValidLocale('')).toBe(false);
    expect(isValidLocale(null)).toBe(false);
    expect(isValidLocale(undefined)).toBe(false);
    expect(isValidLocale(123)).toBe(false);
  });

  it('should have proper Australian locale configs', () => {
    expect(DEFAULT_LOCALE).toBe('en');
    expect(LOCALES).toEqual(['en', 'vi']);
    expect(LOCALE_CONFIGS.en.hreflang).toBe('en-AU');
    expect(LOCALE_CONFIGS.en.ogLocale).toBe('en_AU');
    expect(LOCALE_CONFIGS.vi.hreflang).toBe('vi-AU');
    expect(LOCALE_CONFIGS.vi.ogLocale).toBe('vi_VN');
  });

  it('should deep merge dictionaries with fallback for missing or empty keys', () => {
    const fallback = {
      common: {
        brand: 'Glamour Nails',
        tagline: 'Luxury Care',
        contact: {
          phone: '+61 2 9123 4567',
          email: 'hello@glamournails.com.au',
        },
      },
      cta: 'Book Now',
    };

    const target = {
      common: {
        brand: 'Glamour Nails VN',
        tagline: '', // empty string should fall back
        contact: {
          phone: '+61 412 345 678', // non-empty preserved
          // email missing -> should fall back
        },
      },
      // cta missing -> should fall back
    };

    const merged = deepMergeWithFallback(target as any, fallback);

    expect(merged.common.brand).toBe('Glamour Nails VN');
    expect(merged.common.tagline).toBe('Luxury Care'); // fell back
    expect(merged.common.contact.phone).toBe('+61 412 345 678');
    expect(merged.common.contact.email).toBe('hello@glamournails.com.au'); // fell back
    expect(merged.cta).toBe('Book Now'); // fell back
  });

  it('should preserve query parameters when switching localized paths', () => {
    expect(getLocalizedPath('/en/services', 'vi')).toBe('/vi/services');
    expect(getLocalizedPath('/vi/services', 'en')).toBe('/en/services');
    expect(getLocalizedPath('/en/gallery', 'vi', 'category=Ombre')).toBe('/vi/gallery?category=Ombre');
    expect(getLocalizedPath('/vi/gallery', 'en', 'category=3D+Art&page=2')).toBe('/en/gallery?category=3D+Art&page=2');
    expect(getLocalizedPath('/en', 'vi')).toBe('/vi');
    expect(getLocalizedPath('/', 'vi')).toBe('/vi');
  });

  it('should load dictionary and fallback gracefully for unknown locales', async () => {
    const dictEn = await getDictionary('en');
    expect(dictEn.common.brandName).toBeDefined();
    expect(dictEn.services.gstNotice).toContain('Australian GST');

    const dictVi = await getDictionary('vi');
    expect(dictVi.common.brandName).toBeDefined();
    expect(dictVi.services.gstNotice).toBeDefined();

    // Unknown locale falls back to English
    const dictUnknown = await getDictionary('de');
    expect(dictUnknown.common.brandName).toBe(dictEn.common.brandName);
  });
});
