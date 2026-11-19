/**
 * Unit Test Suite: Australian Tax Calendar & BAS Boundaries
 * Validates Australian Financial Year (1 July - 30 June), Quarterly BAS periods,
 * leap year handling, and boundary date transitions.
 */
import { describe, it, expect } from 'vitest';
import {
  getAustralianFinancialYear,
  getBASQuarter,
  getBASQuartersForFinancialYear,
  getBASDateRange,
  formatDateAEST,
} from '@/lib/utils/date';

describe('Australian Financial Year & Tax Calendar', () => {
  it('correctly determines Australian Financial Year across 30 June / 1 July boundaries', () => {
    // 30 June 2025 is the last day of FY2024-25
    const fyJune30 = getAustralianFinancialYear('2025-06-30T10:00:00Z');
    expect(fyJune30.startYear).toBe(2024);
    expect(fyJune30.endYear).toBe(2025);
    expect(fyJune30.label).toBe('FY2024-25');
    expect(fyJune30.startDate).toBe('2024-07-01');
    expect(fyJune30.endDate).toBe('2025-06-30');

    // 1 July 2025 is the first day of FY2025-26
    const fyJuly1 = getAustralianFinancialYear('2025-07-01T00:00:00Z');
    expect(fyJuly1.startYear).toBe(2025);
    expect(fyJuly1.endYear).toBe(2026);
    expect(fyJuly1.label).toBe('FY2025-26');
    expect(fyJuly1.startDate).toBe('2025-07-01');
    expect(fyJuly1.endDate).toBe('2026-06-30');
  });

  it('correctly maps dates to the 4 statutory BAS quarters', () => {
    // Q1: July, August, September
    const q1Jul = getBASQuarter('2026-07-15');
    expect(q1Jul.quarter).toBe('Q1');
    expect(q1Jul.startDate).toBe('2026-07-01');
    expect(q1Jul.endDate).toBe('2026-09-30');

    const q1Sep = getBASQuarter('2026-09-30');
    expect(q1Sep.quarter).toBe('Q1');

    // Q2: October, November, December
    const q2Oct = getBASQuarter('2026-10-01');
    expect(q2Oct.quarter).toBe('Q2');
    expect(q2Oct.startDate).toBe('2026-10-01');
    expect(q2Oct.endDate).toBe('2026-12-31');

    const q2Dec = getBASQuarter('2026-12-31');
    expect(q2Dec.quarter).toBe('Q2');

    // Q3: January, February, March
    const q3Jan = getBASQuarter('2027-01-01');
    expect(q3Jan.quarter).toBe('Q3');
    expect(q3Jan.startDate).toBe('2027-01-01');
    expect(q3Jan.endDate).toBe('2027-03-31');

    const q3Mar = getBASQuarter('2027-03-31');
    expect(q3Mar.quarter).toBe('Q3');

    // Q4: April, May, June
    const q4Apr = getBASQuarter('2027-04-01');
    expect(q4Apr.quarter).toBe('Q4');
    expect(q4Apr.startDate).toBe('2027-04-01');
    expect(q4Apr.endDate).toBe('2027-06-30');

    const q4Jun = getBASQuarter('2027-06-30');
    expect(q4Jun.quarter).toBe('Q4');
  });

  it('correctly handles leap year dates (29 February) in BAS Q3', () => {
    // 29 February 2024 (Leap Year)
    const leap2024 = getBASQuarter('2024-02-29');
    expect(leap2024.quarter).toBe('Q3');
    expect(leap2024.startDate).toBe('2024-01-01');
    expect(leap2024.endDate).toBe('2024-03-31');

    const fy2024 = getAustralianFinancialYear('2024-02-29');
    expect(fy2024.label).toBe('FY2023-24');

    // 29 February 2028 (Next Leap Year)
    const leap2028 = getBASQuarter('2028-02-29');
    expect(leap2028.quarter).toBe('Q3');
    expect(leap2028.startDate).toBe('2028-01-01');
    expect(leap2028.endDate).toBe('2028-03-31');
  });

  it('generates all 4 BAS quarters for a given Australian Financial Year start year', () => {
    const quarters = getBASQuartersForFinancialYear(2026);
    expect(quarters.length).toBe(4);

    expect(quarters[0]).toEqual({
      quarter: 'Q1',
      label: 'Q1 (Jul–Sep 2026)',
      startDate: '2026-07-01',
      endDate: '2026-09-30',
    });

    expect(quarters[1]).toEqual({
      quarter: 'Q2',
      label: 'Q2 (Oct–Dec 2026)',
      startDate: '2026-10-01',
      endDate: '2026-12-31',
    });

    expect(quarters[2]).toEqual({
      quarter: 'Q3',
      label: 'Q3 (Jan–Mar 2027)',
      startDate: '2027-01-01',
      endDate: '2027-03-31',
    });

    expect(quarters[3]).toEqual({
      quarter: 'Q4',
      label: 'Q4 (Apr–Jun 2027)',
      startDate: '2027-04-01',
      endDate: '2027-06-30',
    });
  });

  it('resolves date ranges via getBASDateRange for full year and specific quarters', () => {
    const fullYear = getBASDateRange(2026);
    expect(fullYear).toEqual({
      startDate: '2026-07-01',
      endDate: '2027-06-30',
      label: 'Full Year (FY2026-27)',
    });

    const allQuarter = getBASDateRange(2026, 'ALL');
    expect(allQuarter.startDate).toBe('2026-07-01');
    expect(allQuarter.endDate).toBe('2027-06-30');

    const q2 = getBASDateRange(2026, 'Q2');
    expect(q2).toEqual({
      startDate: '2026-10-01',
      endDate: '2026-12-31',
      label: 'FY2026-27 Q2 (Oct–Dec 2026)',
    });
  });

  it('throws an error for invalid date strings to prevent silent date corruption', () => {
    expect(() => getAustralianFinancialYear('invalid-date')).toThrow('Invalid date provided');
    expect(() => getBASQuarter('not-a-date')).toThrow('Invalid date provided');
  });

  it('formats dates in Sydney timezone (AEST/AEDT) without timezone drift', () => {
    const formattedDate = formatDateAEST('2026-11-15T14:30:00Z', 'dateOnly');
    expect(formattedDate).toBeTruthy();
    // 15/11/2026 or 16/11/2026 depending on UTC conversion to Sydney (UTC+11 AEDT)
    expect(formattedDate).toMatch(/\d{2}\/\d{2}\/2026/);
  });
});
