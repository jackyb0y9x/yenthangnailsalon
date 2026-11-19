/**
 * Australian Business Validation Utilities & Zod Schemas.
 * Features:
 * - Australian mobile number validation & normalization (+614 / 04)
 * - Official ATO ABN 11-digit Modulo-89 checksum verification
 * - Australian 4-digit postcode validation (0200-9999) & State mapping
 * - Domain entity Zod validation schemas
 */
import { z } from 'zod';

// ==========================================
// 1. Australian Mobile Phone Validation
// ==========================================

const AU_MOBILE_REGEX = /^(\+?61|0)4\d{8}$/;

/**
 * Sanitizes phone string by stripping whitespace, hyphens, parentheses.
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, '');
}

/**
 * Verifies if a string is a valid Australian mobile phone.
 */
export function isValidAustralianMobile(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = sanitizePhone(phone);
  return AU_MOBILE_REGEX.test(cleaned);
}

/**
 * Normalizes an Australian mobile phone to standard national format: 04XX XXX XXX.
 */
export function formatAustralianMobile(phone: string): string {
  const cleaned = sanitizePhone(phone);
  if (!isValidAustralianMobile(phone)) return phone;

  // Convert +614XXXXXXXX to 04XXXXXXXX
  let national = cleaned;
  if (national.startsWith('+61')) {
    national = '0' + national.slice(3);
  } else if (national.startsWith('61')) {
    national = '0' + national.slice(2);
  }

  // Format as 04XX XXX XXX
  return `${national.slice(0, 4)} ${national.slice(4, 7)} ${national.slice(7, 10)}`;
}

/**
 * Normalizes an Australian mobile phone to international E.164 format: +614XXXXXXXX.
 */
export function toE164Mobile(phone: string): string {
  const cleaned = sanitizePhone(phone);
  if (!isValidAustralianMobile(phone)) return phone;
  if (cleaned.startsWith('+61')) return cleaned;
  if (cleaned.startsWith('61')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+61${cleaned.slice(1)}`;
  return `+61${cleaned}`;
}

export const australianPhoneSchema = z
  .string({ required_error: 'Phone number is required.' })
  .transform(sanitizePhone)
  .refine(isValidAustralianMobile, {
    message: 'Invalid Australian mobile number. Must start with 04 or +614 followed by 8 digits.',
  });

export const australianMobileSchema = australianPhoneSchema;

// ==========================================
// 2. Australian Business Number (ABN) Modulo-89
// ==========================================

const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19] as const;

/**
 * Verifies an Australian Business Number (ABN) using the official ATO Modulo-89 algorithm.
 *
 * Algorithm:
 * 1. Must be 11 numeric digits.
 * 2. Subtract 1 from the first digit.
 * 3. Multiply each digit by its weighting factor [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19].
 * 4. Sum the products.
 * 5. Divide the sum by 89: if remainder === 0, ABN is valid.
 */
export function isValidABN(abn: string): boolean {
  if (!abn || typeof abn !== 'string') return false;

  const cleaned = abn.replace(/\s+/g, '');
  if (!/^\d{11}$/.test(cleaned)) return false;

  const digits = cleaned.split('').map(Number);

  // Subtract 1 from the first digit
  digits[0] = digits[0] - 1;

  // Calculate weighted sum
  const sum = digits.reduce((acc, digit, idx) => acc + digit * ABN_WEIGHTS[idx], 0);

  // Modulo-89 check
  return sum % 89 === 0;
}

/**
 * Formats an 11-digit ABN into standard Australian format: XX XXX XXX XXX.
 */
export function formatABN(abn: string): string {
  const cleaned = abn.replace(/\s+/g, '');
  if (cleaned.length !== 11) return abn;
  return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 11)}`;
}

export const abnSchema = z
  .string({ required_error: 'ABN is required.' })
  .transform((val) => val.replace(/\s+/g, ''))
  .refine(isValidABN, {
    message: 'Invalid Australian Business Number (ABN). Must be 11 digits with valid ATO checksum.',
  })
  .transform(formatABN);

// ==========================================
// 3. Australian Postcode & State Resolution
// ==========================================

export type AustralianState = 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT';

/**
 * Validates 4-digit Australian postcode within range 0200-9999.
 */
export function isValidAustralianPostcode(postcode: string): boolean {
  if (!postcode || typeof postcode !== 'string') return false;
  const cleaned = postcode.trim();
  if (!/^\d{4}$/.test(cleaned)) return false;
  const num = parseInt(cleaned, 10);
  return num >= 200 && num <= 9999;
}

/**
 * Resolves Australian State/Territory from 4-digit postcode.
 */
export function getStateFromPostcode(postcode: string): AustralianState | null {
  if (!isValidAustralianPostcode(postcode)) return null;
  const num = parseInt(postcode.trim(), 10);

  // ACT: 0200-0299, 2600-2618, 2900-2920
  if ((num >= 200 && num <= 299) || (num >= 2600 && num <= 2618) || (num >= 2900 && num <= 2920)) {
    return 'ACT';
  }
  // NSW: 1000-1999, 2000-2599, 2619-2899, 2921-2999
  if ((num >= 1000 && num <= 2599) || (num >= 2619 && num <= 2899) || (num >= 2921 && num <= 2999)) {
    return 'NSW';
  }
  // VIC: 3000-3999, 8000-8999
  if ((num >= 3000 && num <= 3999) || (num >= 8000 && num <= 8999)) {
    return 'VIC';
  }
  // QLD: 4000-4999, 9000-9999
  if ((num >= 4000 && num <= 4999) || (num >= 9000 && num <= 9999)) {
    return 'QLD';
  }
  // SA: 5000-5799, 5800-5999
  if (num >= 5000 && num <= 5999) {
    return 'SA';
  }
  // WA: 6000-6797, 6800-6999
  if (num >= 6000 && num <= 6999) {
    return 'WA';
  }
  // TAS: 7000-7799, 7800-7999
  if (num >= 7000 && num <= 7999) {
    return 'TAS';
  }
  // NT: 0800-0899, 0900-0999
  if (num >= 800 && num <= 999) {
    return 'NT';
  }

  return null;
}

export const australianPostcodeSchema = z
  .string({ required_error: 'Postcode is required.' })
  .transform((val) => val.trim())
  .refine(isValidAustralianPostcode, {
    message: 'Invalid Australian postcode. Must be 4 digits between 0200 and 9999.',
  });

// ==========================================
// 4. Domain Entities Zod Schemas
// ==========================================

export const customerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters.'),
  phone: australianPhoneSchema,
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  notes: z.string().max(1000).optional(),
  allergyAlerts: z.array(z.string()).default([]),
  preferredLanguage: z.enum(['en', 'vi']).default('en'),
});

export const consultationSchema = z.object({
  customerName: z.string().min(2, 'Name must be at least 2 characters.'),
  phone: australianPhoneSchema,
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  preferredTime: z.enum(['morning', 'afternoon', 'evening']).optional(),
  serviceRequestedIds: z.array(z.string().uuid()).optional(),
  notes: z.string().max(1000).optional(),
  preferredLanguage: z.enum(['en', 'vi']).default('en'),
});

export const transactionSchema = z.object({
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format.'),
  type: z.enum(['revenue', 'expense', 'income']),
  categoryId: z.string().min(1, 'Category ID is required.'),
  amountCents: z.number().int().positive('Amount must be positive in cents.').optional(),
  amountAud: z.number().positive('Amount must be positive.').optional(),
  gstCents: z.number().int().nonnegative().optional(),
  paymentMethod: z.enum(['cash', 'card', 'eftpos', 'bank_transfer', 'gift_card', 'other']).default('eftpos'),
  description: z.string().min(3, 'Description must be at least 3 characters.'),
  referenceId: z.string().optional(),
  customerId: z.string().optional(),
  staffId: z.string().optional(),
  vendorName: z.string().optional(),
  isTaxDeductible: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
}).refine((data) => data.amountCents !== undefined || data.amountAud !== undefined, {
  message: 'Either amountCents or amountAud must be provided.',
  path: ['amountCents'],
});
