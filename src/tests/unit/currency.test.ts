import { describe, it, expect } from 'vitest';
import {
  formatAUD,
  calculateGST,
  dollarsToCents,
  centsToDollars,
  parseAUD,
} from '@/lib/utils/currency';

describe('Australian Currency Utilities', () => {
  describe('formatAUD', () => {
    it('formats standard integer cents as AUD currency', () => {
      expect(formatAUD(5500)).toBe('$55.00');
      expect(formatAUD(12050)).toBe('$120.50');
      expect(formatAUD(99)).toBe('$0.99');
    });

    it('formats zero correctly', () => {
      expect(formatAUD(0)).toBe('$0.00');
    });

    it('formats negative cents correctly', () => {
      expect(formatAUD(-5500)).toBe('-$55.00');
      expect(formatAUD(-99)).toBe('-$0.99');
    });

    it('formats large values with comma thousand separators', () => {
      expect(formatAUD(12500000)).toBe('$125,000.00');
    });

    it('supports trimZeroCents option', () => {
      expect(formatAUD(5500, { trimZeroCents: true })).toBe('$55');
      expect(formatAUD(5550, { trimZeroCents: true })).toBe('$55.50');
    });

    it('handles NaN gracefully', () => {
      expect(formatAUD(NaN)).toBe('$0.00');
    });
  });

  describe('calculateGST (ATO 10% Tax-Inclusive 1/11th Rule)', () => {
    it('calculates exact 10% GST on round dollar amounts', () => {
      // $55.00 gross -> $50.00 net + $5.00 GST
      const result = calculateGST(5500);
      expect(result.netCents).toBe(5000);
      expect(result.gstCents).toBe(500);
      expect(result.grossCents).toBe(5500);
      expect(result.netCents + result.gstCents).toBe(result.grossCents);
    });

    it('calculates correct rounding on odd-cent values', () => {
      // $10.00 gross -> net = round(1000 * 10 / 11) = 909 cents ($9.09), gst = 91 cents ($0.91)
      const result = calculateGST(1000);
      expect(result.netCents).toBe(909);
      expect(result.gstCents).toBe(91);
      expect(result.grossCents).toBe(1000);
      expect(result.netCents + result.gstCents).toBe(result.grossCents);
    });

    it('handles $1.00 correctly', () => {
      // 100 cents -> net = round(1000 / 11) = 91 cents, gst = 9 cents
      const result = calculateGST(100);
      expect(result.netCents).toBe(91);
      expect(result.gstCents).toBe(9);
      expect(result.grossCents).toBe(100);
    });

    it('handles single cent and zero correctly', () => {
      expect(calculateGST(0)).toEqual({ netCents: 0, gstCents: 0, grossCents: 0 });
      const oneCent = calculateGST(1);
      expect(oneCent.netCents).toBe(1);
      expect(oneCent.gstCents).toBe(0);
      expect(oneCent.netCents + oneCent.gstCents).toBe(1);
    });

    it('preserves invariant netCents + gstCents === grossCents across 1,000 consecutive integers', () => {
      for (let gross = 1; gross <= 1000; gross++) {
        const { netCents, gstCents, grossCents } = calculateGST(gross);
        expect(netCents + gstCents).toBe(grossCents);
      }
    });

    it('handles negative gross amounts (refunds)', () => {
      const refund = calculateGST(-5500);
      expect(refund.netCents).toBe(-5000);
      expect(refund.gstCents).toBe(-500);
      expect(refund.grossCents).toBe(-5500);
      expect(refund.netCents + refund.gstCents).toBe(-5500);
    });
  });

  describe('dollarsToCents & centsToDollars', () => {
    it('converts dollars to cents avoiding floating point inaccuracies', () => {
      expect(dollarsToCents(55.5)).toBe(5550);
      expect(dollarsToCents(19.99)).toBe(1999);
      // Floating point check: 0.1 + 0.2
      expect(dollarsToCents(0.1 + 0.2)).toBe(30);
    });

    it('converts cents to dollars accurately', () => {
      expect(centsToDollars(5550)).toBe(55.5);
      expect(centsToDollars(1999)).toBe(19.99);
      expect(centsToDollars(0)).toBe(0);
    });
  });

  describe('parseAUD', () => {
    it('parses formatted strings to integer cents', () => {
      expect(parseAUD('$55.00')).toBe(5500);
      expect(parseAUD('55.5')).toBe(5550);
      expect(parseAUD(' $1,250.75 ')).toBe(125075);
      expect(parseAUD('-$20.00')).toBe(-2000);
      expect(parseAUD('')).toBe(0);
      expect(parseAUD('invalid')).toBe(0);
    });
  });
});
