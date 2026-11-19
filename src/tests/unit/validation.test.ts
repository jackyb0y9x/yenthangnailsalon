import { describe, it, expect } from 'vitest';
import {
  isValidAustralianMobile,
  formatAustralianMobile,
  toE164Mobile,
  isValidABN,
  formatABN,
  isValidAustralianPostcode,
  getStateFromPostcode,
  customerSchema,
} from '@/lib/utils/validation';

describe('Australian Business Validation', () => {
  describe('Australian Mobile Numbers', () => {
    it('accepts valid national mobile formats', () => {
      expect(isValidAustralianMobile('0412345678')).toBe(true);
      expect(isValidAustralianMobile('0412 345 678')).toBe(true);
      expect(isValidAustralianMobile('0412-345-678')).toBe(true);
      expect(isValidAustralianMobile('(0412) 345 678')).toBe(true);
    });

    it('accepts valid international mobile formats', () => {
      expect(isValidAustralianMobile('+61412345678')).toBe(true);
      expect(isValidAustralianMobile('+61 412 345 678')).toBe(true);
      expect(isValidAustralianMobile('61412345678')).toBe(true);
    });

    it('rejects Australian landline numbers', () => {
      expect(isValidAustralianMobile('02 9123 4567')).toBe(false); // NSW
      expect(isValidAustralianMobile('03 9123 4567')).toBe(false); // VIC
      expect(isValidAustralianMobile('07 3123 4567')).toBe(false); // QLD
      expect(isValidAustralianMobile('08 8123 4567')).toBe(false); // SA/WA
    });

    it('rejects invalid lengths and foreign country codes', () => {
      expect(isValidAustralianMobile('0412 345 67')).toBe(false); // 9 digits
      expect(isValidAustralianMobile('0412 345 6789')).toBe(false); // 11 digits
      expect(isValidAustralianMobile('+84 90 123 4567')).toBe(false); // Vietnam
      expect(isValidAustralianMobile('+1 555 123 4567')).toBe(false); // US
      expect(isValidAustralianMobile('abc0412345678')).toBe(false);
    });

    it('formats mobile to standard national presentation', () => {
      expect(formatAustralianMobile('0412345678')).toBe('0412 345 678');
      expect(formatAustralianMobile('+61412345678')).toBe('0412 345 678');
    });

    it('converts mobile to international E.164', () => {
      expect(toE164Mobile('0412 345 678')).toBe('+61412345678');
      expect(toE164Mobile('+61412345678')).toBe('+61412345678');
    });
  });

  describe('ABN Modulo-89 Checksum Verification', () => {
    it('verifies real valid Australian ABNs', () => {
      expect(isValidABN('51 824 753 556')).toBe(true); // ATO
      expect(isValidABN('48 123 123 124')).toBe(true); // Commonwealth Bank
      expect(isValidABN('33 051 775 556')).toBe(true); // Telstra
      expect(isValidABN('49 004 028 077')).toBe(true); // BHP
    });

    it('rejects mutated or corrupt ABNs', () => {
      expect(isValidABN('51 824 753 557')).toBe(false); // Last digit changed
      expect(isValidABN('51 824 753 565')).toBe(false); // Digits transposed
      expect(isValidABN('00 000 000 000')).toBe(false); // All zeros
      expect(isValidABN('51 824 753 55')).toBe(false);  // 10 digits
      expect(isValidABN('51 824 753 5560')).toBe(false);// 12 digits
      expect(isValidABN('letters only')).toBe(false);
    });

    it('formats ABN into standard XX XXX XXX XXX presentation', () => {
      expect(formatABN('51824753556')).toBe('51 824 753 556');
    });
  });

  describe('Australian Postcodes & State Resolution', () => {
    it('validates 4-digit postcodes in 0200-9999 range', () => {
      expect(isValidAustralianPostcode('2000')).toBe(true); // Sydney
      expect(isValidAustralianPostcode('0200')).toBe(true); // ANU ACT
      expect(isValidAustralianPostcode('3000')).toBe(true); // Melbourne
      expect(isValidAustralianPostcode('0800')).toBe(true); // Darwin
      expect(isValidAustralianPostcode('0100')).toBe(false); // Out of range
      expect(isValidAustralianPostcode('123')).toBe(false);  // Too short
      expect(isValidAustralianPostcode('10000')).toBe(false);// Too long
    });

    it('resolves correct Australian state from postcode', () => {
      expect(getStateFromPostcode('2000')).toBe('NSW');
      expect(getStateFromPostcode('0200')).toBe('ACT');
      expect(getStateFromPostcode('3000')).toBe('VIC');
      expect(getStateFromPostcode('4000')).toBe('QLD');
      expect(getStateFromPostcode('5000')).toBe('SA');
      expect(getStateFromPostcode('6000')).toBe('WA');
      expect(getStateFromPostcode('7000')).toBe('TAS');
      expect(getStateFromPostcode('0800')).toBe('NT');
    });
  });

  describe('Customer Zod Schema', () => {
    it('validates correct customer payload', () => {
      const valid = {
        fullName: 'Sarah Jenkins',
        phone: '0412 345 678',
        email: 'sarah@example.com.au',
        preferredLanguage: 'en',
      };
      const result = customerSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phone).toBe('0412345678');
      }
    });

    it('fails on invalid phone', () => {
      const invalid = {
        fullName: 'Sarah Jenkins',
        phone: '02 9123 4567', // landline
      };
      const result = customerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
