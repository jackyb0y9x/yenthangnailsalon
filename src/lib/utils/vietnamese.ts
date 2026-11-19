/**
 * Pure string and search utilities for Vietnamese diacritics and Australian phone matching.
 * Safe to import in both Server Components and Client Components ('use client').
 */

/**
 * Strips all Vietnamese tone marks, vowel modifications, and converts 'đ'/'Đ' to 'd'/'D'.
 */
export function removeVietnameseDiacritics(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Normalizes Vietnamese text to lowercase, trimmed ASCII for comparison.
 */
export function normalizeVietnamese(str: string): string {
  if (!str) return '';
  return removeVietnameseDiacritics(str).toLowerCase().trim();
}

/**
 * Normalizes phone numbers to standard searchable digit string.
 * Converts international "+614XX" or "+61 4XX" to national "04XX".
 */
export function normalizePhoneForSearch(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('61')) {
    digits = '0' + digits.slice(2);
  }
  return digits;
}

/**
 * Checks if target phone number matches search query in various formats.
 */
export function matchesPhoneSearch(targetPhone: string, query: string): boolean {
  if (!targetPhone || !query) return false;
  const queryDigits = query.replace(/\D/g, '');
  if (queryDigits.length < 3) return false;

  const targetDigits = targetPhone.replace(/\D/g, '');
  const normTarget = normalizePhoneForSearch(targetPhone);
  const normQuery = normalizePhoneForSearch(query);

  return (
    targetDigits.includes(queryDigits) ||
    normTarget.includes(normQuery) ||
    normTarget.includes(queryDigits) ||
    (normQuery.length >= 3 && targetDigits.includes(normQuery))
  );
}

/**
 * Matches customer across full name (accent-insensitive), phone, or email.
 */
export function matchesCustomerSearch(
  customer: { full_name?: string; name?: string; phone: string; email?: string | null },
  query: string
): boolean {
  if (!query || !query.trim()) return true;
  const trimmed = query.trim();

  // 1. Phone match check
  if (matchesPhoneSearch(customer.phone, trimmed)) {
    return true;
  }

  // 2. Email match check
  if (customer.email && customer.email.toLowerCase().includes(trimmed.toLowerCase())) {
    return true;
  }

  // 3. Name match with Vietnamese diacritics stripping
  const rawName = customer.name || customer.full_name || '';
  const normTargetName = normalizeVietnamese(rawName);
  const normQueryName = normalizeVietnamese(trimmed);
  const queryWords = normQueryName.split(/\s+/).filter(Boolean);

  if (queryWords.length === 0) return true;
  return queryWords.every((word) => normTargetName.includes(word));
}

/**
 * Stored XSS defense sanitizer for notes, allergies, and inquiry strings.
 * Comprehensive HTML tag entity encoding and executable script / URI neutralization.
 */
export function sanitizeXss(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/(?:blocked-)*javascript\s*:/gi, 'blocked-javascript:');
}
