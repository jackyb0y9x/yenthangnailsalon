/**
 * Australian Currency & 10% GST Utilities.
 * Strictly calculates with integer cents to eliminate floating-point representation errors.
 */

export interface GSTBreakdown {
  netCents: number;   // Amount excluding GST
  gstCents: number;   // 10% GST component
  grossCents: number; // Tax-inclusive total (netCents + gstCents === grossCents)
}

/**
 * Formats integer cents into an Australian Dollar display string.
 * Examples:
 *   formatAUD(5500) => "$55.00"
 *   formatAUD(0) => "$0.00"
 *   formatAUD(-2550) => "-$25.50"
 *   formatAUD(5500, { trimZeroCents: true }) => "$55"
 */
export function formatAUD(
  cents: number,
  options?: { showCurrencyCode?: boolean; trimZeroCents?: boolean }
): string {
  if (isNaN(cents)) return '$0.00';

  const dollars = cents / 100;
  const isNegative = dollars < 0;
  const absDollars = Math.abs(dollars);

  let formatted = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absDollars);

  // Normalize "$XX.XX" format
  if (options?.trimZeroCents && cents % 100 === 0) {
    formatted = formatted.replace(/\.00$/, '');
  }

  const sign = isNegative ? '-' : '';
  const prefix = options?.showCurrencyCode ? 'AU ' : '';

  return `${sign}${prefix}${formatted}`;
}

/**
 * Calculates Australian 10% GST included in an AUD gross amount (1/11th inclusive rule).
 * Under ATO GSTR 2002/2:
 *   Net = round(Gross * 10 / 11)
 *   GST = Gross - Net
 * Invariant: netCents + gstCents === grossCents ALWAYS.
 *
 * @param grossCents Total price including GST in integer cents
 */
export function calculateGST(grossCents: number): GSTBreakdown {
  if (grossCents === 0 || isNaN(grossCents)) {
    return { netCents: 0, gstCents: 0, grossCents: 0 };
  }

  const isNegative = grossCents < 0;
  const absGross = Math.abs(grossCents);

  // ATO 10% inclusive calculation: Net is 10/11th of gross
  const net = Math.round((absGross * 10) / 11);
  const gst = absGross - net;

  return {
    netCents: isNegative ? -net : net,
    gstCents: isNegative ? -gst : gst,
    grossCents,
  };
}

/**
 * Converts decimal dollars to integer cents safely with rounding.
 * Example: dollarsToCents(55.5) => 5550
 */
export function dollarsToCents(dollars: number): number {
  if (isNaN(dollars)) return 0;
  return Math.round(dollars * 100);
}

/**
 * Converts integer cents to decimal dollars.
 * Example: centsToDollars(5550) => 55.5
 */
export function centsToDollars(cents: number): number {
  if (isNaN(cents)) return 0;
  return cents / 100;
}

/**
 * Parses user input currency string into integer cents.
 * Handles inputs like "$55.00", "55.5", " 1,250.00 ", "-$20".
 */
export function parseAUD(input: string): number {
  if (!input || typeof input !== 'string') return 0;
  const sanitized = input.replace(/[^\d.-]/g, '');
  const parsedFloat = parseFloat(sanitized);
  if (isNaN(parsedFloat)) return 0;
  return Math.round(parsedFloat * 100);
}
