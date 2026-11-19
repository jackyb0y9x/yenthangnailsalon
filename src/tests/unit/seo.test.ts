import { describe, it, expect } from 'vitest';
import { generateLocalBusinessSchema, sanitizeJsonLd, DEFAULT_SALON_INFO } from '@/lib/seo/schema';
import { generateLocalizedMetadata } from '@/lib/seo/metadata';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { isValidABN } from '@/lib/utils/validation';

describe('SEO, Schema.org & Discovery Architecture', () => {
  describe('Schema.org LocalBusiness JSON-LD', () => {
    it('should generate valid Schema.org NailSalon structured data with Australian business invariants', () => {
      const schema = generateLocalBusinessSchema();

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('NailSalon');
      expect(schema.currenciesAccepted).toBe('AUD');
      expect(schema.priceRange).toBe('$$');
      expect(schema.taxID).toBe('51 824 753 556');
      expect(isValidABN(schema.taxID)).toBe(true);

      expect(schema.identifier).toEqual({
        '@type': 'PropertyValue',
        name: 'ABN',
        value: '51 824 753 556',
      });

      expect(schema.address).toEqual({
        '@type': 'PostalAddress',
        streetAddress: 'Suite 2, 188 George Street',
        addressLocality: 'Sydney',
        addressRegion: 'NSW',
        postalCode: '2000',
        addressCountry: 'AU',
      });

      expect(schema.geo).toEqual({
        '@type': 'GeoCoordinates',
        latitude: -33.8688,
        longitude: 151.2093,
      });

      expect(Array.isArray(schema.openingHoursSpecification)).toBe(true);
      expect(schema.openingHoursSpecification.length).toBeGreaterThan(0);
      expect(schema.openingHoursSpecification[0]).toHaveProperty('dayOfWeek');
      expect(schema.openingHoursSpecification[0]).toHaveProperty('opens');
      expect(schema.openingHoursSpecification[0]).toHaveProperty('closes');
    });

    it('should sanitize JSON-LD string to prevent script tag injection attacks', () => {
      const maliciousData = {
        name: '</script><script>alert("xss")</script>',
      };

      const sanitized = sanitizeJsonLd(maliciousData);
      expect(sanitized).not.toContain('</script>');
      expect(sanitized).toContain('\\u003c/script>');
    });
  });

  describe('Localized Metadata Generation', () => {
    it('should produce canonical and hreflang alternate links for English and Vietnamese', () => {
      const metaEn = generateLocalizedMetadata({
        locale: 'en',
        pathname: '/services',
        title: 'Our Services | Glamour Nails Sydney',
        description: 'Explore our luxury nail treatments in Sydney.',
      });

      expect(metaEn.alternates?.canonical).toBe('https://glamournails.com.au/en/services');
      const langs = metaEn.alternates?.languages as Record<string, string>;
      expect(langs['en-AU']).toBe('https://glamournails.com.au/en/services');
      expect(langs['vi-VN']).toBe('https://glamournails.com.au/vi/services');
      expect(langs['vi-AU']).toBe('https://glamournails.com.au/vi/services');
      expect(langs['x-default']).toBe('https://glamournails.com.au/en/services');

      expect(metaEn.openGraph?.locale).toBe('en_AU');
      expect(metaEn.openGraph?.siteName).toBe('Glamour Nails & Spa Sydney');
    });

    it('should configure correct Open Graph locale and alternateLocale for Vietnamese', () => {
      const metaVi = generateLocalizedMetadata({
        locale: 'vi',
        pathname: '',
        title: 'Trang Chủ | Glamour Nails Sydney',
        description: 'Chăm sóc móng cao cấp tại Sydney.',
      });

      expect(metaVi.openGraph?.locale).toBe('vi_VN');
      expect(metaVi.openGraph?.alternateLocale).toEqual(['en_AU']);
      expect(metaVi.alternates?.canonical).toBe('https://glamournails.com.au/vi');
    });
  });

  describe('Dynamic XML Sitemap', () => {
    it('should generate 10 localized URLs (5 core routes across 2 locales)', () => {
      const entries = sitemap();
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

      for (const entry of entries) {
        expect(entry.alternates?.languages).toBeDefined();
        const altLangs = entry.alternates?.languages as Record<string, string>;
        expect(altLangs['en-AU']).toBeDefined();
        expect(altLangs['vi-VN']).toBeDefined();
        expect(altLangs['x-default']).toBeDefined();
      }
    });
  });

  describe('Robots.txt Directives', () => {
    it('should disallow administrative and API endpoints while allowing public routes', () => {
      const config = robots();
      expect(config.sitemap).toBe('https://glamournails.com.au/sitemap.xml');

      const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
      expect(rules.allow).toBe('/');

      const disallowList = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow];
      expect(disallowList).toContain('/admin');
      expect(disallowList).toContain('/api/admin');
    });
  });
});
