import { describe, it, expect } from 'vitest';
import enMessages from '@/messages/en.json';
import viMessages from '@/messages/vi.json';
import { getDictionary } from '@/lib/i18n/dictionaries';

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

describe('Bilingual Dictionary Parity & Quality Standards', () => {
  const enKeys = extractAllKeyPaths(enMessages).sort();
  const viKeys = extractAllKeyPaths(viMessages).sort();

  it('should have 100% key parity between English and Vietnamese catalogs', () => {
    const missingInVi = enKeys.filter((k) => !viKeys.includes(k));
    const extraInVi = viKeys.filter((k) => !enKeys.includes(k));

    expect(missingInVi).toEqual([]);
    expect(extraInVi).toEqual([]);
    expect(viKeys.length).toBe(enKeys.length);
  });

  it('should not have any empty string translations in either catalog', () => {
    for (const keyPath of enKeys) {
      const enVal = getValueByPath(enMessages, keyPath);
      expect(typeof enVal).toBe('string');
      expect(enVal.trim().length, `Empty English value at ${keyPath}`).toBeGreaterThan(0);

      const viVal = getValueByPath(viMessages, keyPath);
      expect(typeof viVal).toBe('string');
      expect(viVal.trim().length, `Empty Vietnamese value at ${keyPath}`).toBeGreaterThan(0);
    }
  });

  it('should contain all 10+ required domain namespaces', () => {
    const expectedDomains = [
      'common',
      'nav',
      'hero',
      'services',
      'gallery',
      'about',
      'contact',
      'hours',
      'consultation',
      'announcement',
      'footer',
      'meta',
    ];

    for (const domain of expectedDomains) {
      expect(enMessages).toHaveProperty(domain);
      expect(viMessages).toHaveProperty(domain);
    }
  });

  it('should verify critical verbatim regulatory and compliance strings in both dictionaries', () => {
    // ABN invariant
    expect(enMessages.common.abn).toBe('ABN: 51 824 753 556');
    expect(viMessages.common.abn).toBe('ABN: 51 824 753 556');
    expect(enMessages.footer.abnText).toBe('ABN: 51 824 753 556');
    expect(viMessages.footer.abnText).toBe('ABN: 51 824 753 556');

    // Phone invariants
    expect(enMessages.common.phone).toBe('+61 2 9123 4567');
    expect(viMessages.common.phone).toBe('+61 2 9123 4567');
    expect(enMessages.common.mobile).toBe('0412 345 678');
    expect(viMessages.common.mobile).toBe('0412 345 678');

    // GST Notice invariant
    expect(enMessages.services.gstNotice).toBe('All prices are inclusive of Australian GST (10%)');
    expect(viMessages.services.gstNotice).toBe('All prices are inclusive of Australian GST (10%)');

    // Hospital-Grade Hygiene verbatim string
    expect(enMessages.about.hygieneText).toBe(
      'Medical-grade autoclave sterilization and disposable files.'
    );
    expect(viMessages.about.hygieneText).toBe(
      'Medical-grade autoclave sterilization and disposable files.'
    );
  });

  it('should resolve full dictionaries via getDictionary helper', async () => {
    const enDict = await getDictionary('en');
    const viDict = await getDictionary('vi');

    expect(enDict.hero.headline).toBe('Luxury Australian Nail Care');
    expect(viDict.hero.headline).toBe('Chăm Sóc Móng Cao Cấp Tại Sydney');
  });
});
