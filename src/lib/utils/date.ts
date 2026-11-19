/**
 * Australian Date & Timezone Utilities (Australia/Sydney).
 * Handles AEST (UTC+10) / AEDT (UTC+11), Australian Financial Year, and BAS Quarters.
 */

export const SYDNEY_TIMEZONE = 'Australia/Sydney';

/**
 * Formats a Date or ISO string in Sydney timezone.
 */
export function formatDateAEST(
  date: Date | string,
  style: 'short' | 'long' | 'dateOnly' | 'timeOnly' = 'short'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: {
      timeZone: SYDNEY_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    },
    long: {
      timeZone: SYDNEY_TIMEZONE,
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    },
    dateOnly: {
      timeZone: SYDNEY_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
    timeOnly: {
      timeZone: SYDNEY_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    },
  };

  return new Intl.DateTimeFormat('en-AU', optionsMap[style]).format(d);
}

/**
 * Returns the Australian Financial Year (1 July – 30 June) for a given date.
 * Example:
 *   getAustralianFinancialYear('2026-08-15') => { startYear: 2026, endYear: 2027, label: "FY2026-27" }
 *   getAustralianFinancialYear('2026-03-10') => { startYear: 2025, endYear: 2026, label: "FY2025-26" }
 */
export function getAustralianFinancialYear(date: Date | string): {
  startYear: number;
  endYear: number;
  label: string;
  startDate: string;
  endDate: string;
} {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date provided: ${date}`);
  }

  // Get month in Sydney timezone (1-12)
  const monthFormatter = new Intl.DateTimeFormat('en-AU', { timeZone: SYDNEY_TIMEZONE, month: 'numeric' });
  const yearFormatter = new Intl.DateTimeFormat('en-AU', { timeZone: SYDNEY_TIMEZONE, year: 'numeric' });

  const month = parseInt(monthFormatter.format(d), 10);
  const calendarYear = parseInt(yearFormatter.format(d), 10);

  const startYear = month >= 7 ? calendarYear : calendarYear - 1;
  const endYear = startYear + 1;
  const shortEnd = endYear.toString().slice(-2);

  return {
    startYear,
    endYear,
    label: `FY${startYear}-${shortEnd}`,
    startDate: `${startYear}-07-01`,
    endDate: `${endYear}-06-30`,
  };
}

export interface BASQuarterInfo {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  label: string;
  startDate: string;
  endDate: string;
}

/**
 * Returns all 4 Business Activity Statement (BAS) quarters for a given Australian Financial Year.
 * E.g. fyStartYear = 2026 (FY2026-27):
 * - Q1: 2026-07-01 to 2026-09-30
 * - Q2: 2026-10-01 to 2026-12-31
 * - Q3: 2027-01-01 to 2027-03-31
 * - Q4: 2027-04-01 to 2027-06-30
 */
export function getBASQuartersForFinancialYear(fyStartYear: number): BASQuarterInfo[] {
  const endYear = fyStartYear + 1;
  return [
    { quarter: 'Q1', label: `Q1 (Jul–Sep ${fyStartYear})`, startDate: `${fyStartYear}-07-01`, endDate: `${fyStartYear}-09-30` },
    { quarter: 'Q2', label: `Q2 (Oct–Dec ${fyStartYear})`, startDate: `${fyStartYear}-10-01`, endDate: `${fyStartYear}-12-31` },
    { quarter: 'Q3', label: `Q3 (Jan–Mar ${endYear})`, startDate: `${endYear}-01-01`, endDate: `${endYear}-03-31` },
    { quarter: 'Q4', label: `Q4 (Apr–Jun ${endYear})`, startDate: `${endYear}-04-01`, endDate: `${endYear}-06-30` },
  ];
}

/**
 * Resolves the date range and descriptive label for an Australian Financial Year or specific BAS quarter.
 */
export function getBASDateRange(
  fyStartYear: number,
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'ALL'
): { startDate: string; endDate: string; label: string } {
  const endYear = fyStartYear + 1;
  const shortEnd = endYear.toString().slice(-2);
  const fyLabel = `FY${fyStartYear}-${shortEnd}`;

  if (!quarter || quarter === 'ALL') {
    return {
      startDate: `${fyStartYear}-07-01`,
      endDate: `${endYear}-06-30`,
      label: `Full Year (${fyLabel})`,
    };
  }

  const quarters = getBASQuartersForFinancialYear(fyStartYear);
  const qInfo = quarters.find((q) => q.quarter === quarter);
  if (!qInfo) {
    throw new Error(`Invalid quarter: ${quarter}`);
  }

  return {
    startDate: qInfo.startDate,
    endDate: qInfo.endDate,
    label: `${fyLabel} ${qInfo.label}`,
  };
}

/**
 * Returns the Business Activity Statement (BAS) quarter for a given date.
 * BAS Quarters (Australian Tax Calendar):
 * Q1: 1 July – 30 September
 * Q2: 1 October – 31 December
 * Q3: 1 January – 31 March
 * Q4: 1 April – 30 June
 */
export function getBASQuarter(date: Date | string): {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  label: string;
  startDate: string;
  endDate: string;
} {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date provided: ${date}`);
  }
  const monthFormatter = new Intl.DateTimeFormat('en-AU', { timeZone: SYDNEY_TIMEZONE, month: 'numeric' });
  const yearFormatter = new Intl.DateTimeFormat('en-AU', { timeZone: SYDNEY_TIMEZONE, year: 'numeric' });

  const month = parseInt(monthFormatter.format(d), 10);
  const year = parseInt(yearFormatter.format(d), 10);

  if (month >= 7 && month <= 9) {
    return { quarter: 'Q1', label: `Q1 (Jul-Sep ${year})`, startDate: `${year}-07-01`, endDate: `${year}-09-30` };
  } else if (month >= 10 && month <= 12) {
    return { quarter: 'Q2', label: `Q2 (Oct-Dec ${year})`, startDate: `${year}-10-01`, endDate: `${year}-12-31` };
  } else if (month >= 1 && month <= 3) {
    return { quarter: 'Q3', label: `Q3 (Jan-Mar ${year})`, startDate: `${year}-01-01`, endDate: `${year}-03-31` };
  } else {
    return { quarter: 'Q4', label: `Q4 (Apr-Jun ${year})`, startDate: `${year}-04-01`, endDate: `${year}-06-30` };
  }
}
