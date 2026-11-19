import { describe, it, expect } from 'vitest';
import { getPublicGallery, FALLBACK_GALLERY } from '@/lib/cms/public-data';

describe('Unit: Nail Art Gallery Category Filtering & Data Resilience', () => {
  it('returns all gallery items when category is undefined or "All"', async () => {
    const all = await getPublicGallery();
    const allExplicit = await getPublicGallery('All');

    expect(all.length).toBeGreaterThanOrEqual(15);
    expect(allExplicit.length).toBe(all.length);

    all.forEach((item) => {
      expect(item.id).toBeDefined();
      expect(item.title_en).toBeTruthy();
      expect(item.category).toBeTruthy();
      expect(typeof item.category).toBe('string');
      expect(item.image_url).toMatch(/^https?:\/\//);
      expect(Array.isArray(item.tags)).toBe(true);
    });
  });

  it('correctly filters category "Ombre" with >= 3 items and valid fields', async () => {
    const items = await getPublicGallery('Ombre');
    expect(items.length).toBeGreaterThanOrEqual(3);
    items.forEach((item) => {
      const match =
        item.category.toLowerCase().includes('ombre') ||
        item.tags.some((t) => t.toLowerCase().includes('ombre'));
      expect(match).toBe(true);
    });
  });

  it('correctly filters category "3D Art" with >= 3 items and valid fields', async () => {
    const items = await getPublicGallery('3D Art');
    expect(items.length).toBeGreaterThanOrEqual(3);
    items.forEach((item) => {
      const match =
        item.category.toLowerCase().includes('3d') ||
        item.tags.some((t) => t.toLowerCase().includes('3d'));
      expect(match).toBe(true);
    });
  });

  it('correctly filters category "Chrome" with >= 3 items and valid fields', async () => {
    const items = await getPublicGallery('Chrome');
    expect(items.length).toBeGreaterThanOrEqual(3);
    items.forEach((item) => {
      const match =
        item.category.toLowerCase().includes('chrome') ||
        item.tags.some((t) => t.toLowerCase().includes('chrome'));
      expect(match).toBe(true);
    });
  });

  it('correctly filters category "SNS Dipping" with >= 3 items and valid fields', async () => {
    const items = await getPublicGallery('SNS Dipping');
    expect(items.length).toBeGreaterThanOrEqual(3);
    items.forEach((item) => {
      const match =
        item.category.toLowerCase().includes('sns') ||
        item.tags.some((t) => t.toLowerCase().includes('sns'));
      expect(match).toBe(true);
    });
  });

  it('correctly filters category "Gel Art" with >= 3 items and valid fields', async () => {
    const items = await getPublicGallery('Gel Art');
    expect(items.length).toBeGreaterThanOrEqual(3);
    items.forEach((item) => {
      const match =
        item.category.toLowerCase().includes('gel') ||
        item.tags.some((t) => t.toLowerCase().includes('gel'));
      expect(match).toBe(true);
    });
  });

  it('handles case-insensitive query parameters gracefully', async () => {
    const lowercaseOmbre = await getPublicGallery('ombre');
    const uppercaseOmbre = await getPublicGallery('OMBRE');
    expect(lowercaseOmbre.length).toBe(uppercaseOmbre.length);
    expect(lowercaseOmbre.length).toBeGreaterThanOrEqual(3);

    const lowercaseSns = await getPublicGallery('sns dipping');
    expect(lowercaseSns.length).toBeGreaterThanOrEqual(3);
  });

  it('verifies FALLBACK_GALLERY provides comprehensive coverage across all 5 user categories', () => {
    const targetCategories = ['Ombre', '3D Art', 'Chrome', 'SNS Dipping', 'Gel Art'];

    targetCategories.forEach((cat) => {
      const matching = FALLBACK_GALLERY.filter(
        (item) =>
          item.category.toLowerCase() === cat.toLowerCase() ||
          item.tags.some((t) => t.toLowerCase() === cat.toLowerCase())
      );
      expect(matching.length).toBeGreaterThanOrEqual(3);
    });
  });
});
