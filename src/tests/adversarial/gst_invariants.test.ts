import { describe, it, expect } from 'vitest';
import { calculateGST, formatAUD, dollarsToCents, centsToDollars, parseAUD } from '@/lib/utils/currency';

describe('Adversarial Mathematical Invariants: calculateGST', () => {
  it('Invariant Check: netCents + gstCents === grossCents for 10,000 consecutive positive integer values', () => {
    for (let gross = 0; gross <= 10000; gross++) {
      const { netCents, gstCents, grossCents } = calculateGST(gross);
      expect(netCents + gstCents).toBe(grossCents);
      expect(grossCents).toBe(gross);
      expect(Number.isInteger(netCents)).toBe(true);
      expect(Number.isInteger(gstCents)).toBe(true);
      expect(gstCents).toBeGreaterThanOrEqual(0);
      expect(netCents).toBeGreaterThanOrEqual(0);
    }
  });

  it('Invariant Check: netCents + gstCents === grossCents for 10,000 consecutive odd cent values', () => {
    for (let i = 0; i < 10000; i++) {
      const gross = 2 * i + 1; // 1, 3, 5, ..., 19999
      const { netCents, gstCents, grossCents } = calculateGST(gross);
      expect(netCents + gstCents).toBe(grossCents);
      expect(grossCents).toBe(gross);
    }
  });

  it('Boundary Check: zero (0 cents and -0)', () => {
    const zeroResult = calculateGST(0);
    expect(zeroResult.netCents).toBe(0);
    expect(zeroResult.gstCents).toBe(0);
    expect(zeroResult.grossCents).toBe(0);
    expect(zeroResult.netCents + zeroResult.gstCents).toBe(0);

    const negZeroResult = calculateGST(-0);
    expect(negZeroResult.netCents).toBe(0);
    expect(negZeroResult.gstCents).toBe(0);
    expect(negZeroResult.grossCents).toBe(0);
  });

  it('Invariant Check: Negative cent values (refunds, expense deductions)', () => {
    const negativeCases = [-1, -3, -11, -55, -100, -110, -550, -999, -10000, -1000000];
    for (const gross of negativeCases) {
      const { netCents, gstCents, grossCents } = calculateGST(gross);
      expect(netCents + gstCents).toBe(grossCents);
      expect(grossCents).toBe(gross);
      expect(gstCents).toBeLessThanOrEqual(0);
      expect(netCents).toBeLessThanOrEqual(0);
    }

    for (let gross = -1; gross >= -10000; gross--) {
      const { netCents, gstCents, grossCents } = calculateGST(gross);
      expect(netCents + gstCents).toBe(grossCents);
      expect(grossCents).toBe(gross);
    }
  });

  it('Invariant Check: Large integer amounts ($1,000,000 to $1,000,000,000+)', () => {
    const largeCases = [
      100_000_00,       // $100,000.00
      1_000_000_00,     // $1,000,000.00 (100 million cents)
      10_000_000_00,    // $10,000,000.00 (1 billion cents)
      100_000_000_00,   // $100,000,000.00 (10 billion cents)
      1_000_000_000_00, // $1,000,000,000.00
      Number.MAX_SAFE_INTEGER, // 9,007,199,254,740,991
    ];

    for (const gross of largeCases) {
      const { netCents, gstCents, grossCents } = calculateGST(gross);
      expect(netCents + gstCents).toBe(grossCents);
      expect(grossCents).toBe(gross);
      expect(Number.isInteger(netCents)).toBe(true);
      expect(Number.isInteger(gstCents)).toBe(true);
    }
  });

  it('ATO Reference Benchmark Checks (GSTR 2002/2 exact calculations)', () => {
    // $11.00 gross => Net $10.00, GST $1.00
    expect(calculateGST(1100)).toEqual({ netCents: 1000, gstCents: 100, grossCents: 1100 });
    // $22.00 gross => Net $20.00, GST $2.00
    expect(calculateGST(2200)).toEqual({ netCents: 2000, gstCents: 200, grossCents: 2200 });
    // $55.00 gross => Net $50.00, GST $5.00
    expect(calculateGST(5500)).toEqual({ netCents: 5000, gstCents: 500, grossCents: 5500 });
    // $1.00 gross (100 cents) => 100 * 10 / 11 = 90.909 => Net 91 cents, GST 9 cents
    expect(calculateGST(100)).toEqual({ netCents: 91, gstCents: 9, grossCents: 100 });
    // $0.55 gross (55 cents) => 55 * 10 / 11 = 50 => Net 50 cents, GST 5 cents
    expect(calculateGST(55)).toEqual({ netCents: 50, gstCents: 5, grossCents: 55 });
    // $0.05 gross (5 cents) => 5 * 10 / 11 = 4.545 => Net 5 cents, GST 0 cents
    expect(calculateGST(5)).toEqual({ netCents: 5, gstCents: 0, grossCents: 5 });
  });

  it('Edge Cases: NaN, non-integer cents, floating-point grossCents', () => {
    // NaN input
    expect(calculateGST(NaN)).toEqual({ netCents: 0, gstCents: 0, grossCents: 0 });

    // Floating-point cents input (adversarial input: someone passed dollars instead of cents, e.g. 55.5)
    // Note: calculateGST should handle non-integer gracefully or maintain invariant
    const floatResult = calculateGST(55.5);
    expect(floatResult.netCents + floatResult.gstCents).toBeCloseTo(floatResult.grossCents, 5);
  });
});
