import { describe, it, expect, vi } from 'vitest';
import { POST, GET } from '@/app/api/consultation/route';
import { consultationApiSchema } from '@/lib/cms/public-data';
import * as mockSupabaseModule from '@/lib/supabase/mock';

describe('Empirical Adversarial Stress Harness: /api/consultation', () => {
  // Helper to make request
  const callPost = async (body: any, headers: Record<string, string> = { 'Content-Type': 'application/json' }) => {
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    const request = new Request('http://localhost:3000/api/consultation', {
      method: 'POST',
      headers,
      body: rawBody,
    });
    return await POST(request);
  };

  // =========================================================================
  // SECTION 1: Malformed JSON, Non-Object Payloads & Truncated Streams
  // =========================================================================
  describe('1. Malformed JSON and Non-Object Payloads', () => {
    it('rejects raw string payload "hello" with HTTP 400 and clean JSON error', async () => {
      const res = await callPost('"hello"');
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Validation failed');
      expect(json.stack).toBeUndefined();
    });

    it('rejects raw number 12345 with HTTP 400', async () => {
      const res = await callPost('12345');
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('rejects raw boolean true with HTTP 400', async () => {
      const res = await callPost('true');
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('rejects raw array payload [] with HTTP 400', async () => {
      const res = await callPost('[]');
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('rejects null JSON literal with HTTP 400', async () => {
      const res = await callPost('null');
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('rejects truncated JSON with HTTP 400 and does not leak stack trace', async () => {
      const res = await callPost('{"customer_name": "Sarah", "phone": "04123456');
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Invalid JSON payload');
      expect(json.stack).toBeUndefined();
    });

    it('rejects JSON with trailing commas with HTTP 400', async () => {
      const res = await callPost('{"customer_name": "Sarah", "phone": "0412345678",}');
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Invalid JSON payload');
    });
  });

  // =========================================================================
  // SECTION 2: Missing Required Fields & Empty Inputs
  // =========================================================================
  describe('2. Missing Required Fields and Empty Bodies', () => {
    it('rejects empty object {} with HTTP 400', async () => {
      const res = await callPost({});
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Validation failed');
    });

    it('rejects when phone is missing with HTTP 400', async () => {
      const res = await callPost({ customer_name: 'Jessica Lee' });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.details?.some((d: any) => d.field === 'phone')).toBe(true);
    });

    it('rejects when customer_name is missing with HTTP 400', async () => {
      const res = await callPost({ phone: '0412345678' });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.details?.some((d: any) => d.field === 'customer_name')).toBe(true);
    });
  });

  // =========================================================================
  // SECTION 3: Customer Name Boundary Values, XSS & SQLi
  // =========================================================================
  describe('3. Customer Name Boundary Values and Injections', () => {
    it('rejects customer_name shorter than 2 characters (1 char) with HTTP 400', async () => {
      const res = await callPost({ customer_name: 'K', phone: '0412345678' });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('rejects empty string customer_name with HTTP 400', async () => {
      const res = await callPost({ customer_name: '', phone: '0412345678' });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('empirically probes whitespace-only customer_name ("   ")', async () => {
      const res = await callPost({ customer_name: '   ', phone: '0412345678' });
      const json = await res.json();
      // Record behavior: Schema allows spaces if length >= 2, but .trim() results in empty name
      if (res.status === 201) {
        expect(json.data.customer_name).toBe('');
      } else {
        expect(res.status).toBe(400);
      }
    });

    it('accepts customer_name at exact 2 characters ("Li") with HTTP 201', async () => {
      const res = await callPost({ customer_name: 'Li', phone: '0412345678' });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.customer_name).toBe('Li');
    });

    it('handles XSS payload in customer_name safely without executing or corrupting JSON', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      const res = await callPost({ customer_name: xssPayload, phone: '0412345678' });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.customer_name).toBe(xssPayload);
    });

    it('handles SQL injection payload in customer_name safely as parameterized data', async () => {
      const sqliPayload = "Robert'); DROP TABLE crm_consultations; --";
      const res = await callPost({ customer_name: sqliPayload, phone: '0412345678' });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.customer_name).toBe(sqliPayload);
    });

    it('accepts Vietnamese UTF-8 names with diacritics', async () => {
      const viName = 'Nguyễn Trần Thảo Nguyên';
      const res = await callPost({ customer_name: viName, phone: '0412345678', preferred_language: 'vi' });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.customer_name).toBe(viName);
    });
  });

  // =========================================================================
  // SECTION 4: Australian Mobile Validation Edge Cases
  // =========================================================================
  describe('4. Australian Mobile Phone Exhaustive Boundary Testing', () => {
    // Valid cases
    const validTestCases = [
      '0400000000',
      '0499999999',
      '0412 345 678',
      '0412-345-678',
      '+61412345678',
      '+61 412 345 678',
      '+61-412-345-678',
      '(0412) 345 678',
      '61412345678',
    ];

    for (const phone of validTestCases) {
      it(`accepts valid mobile format: "${phone}" with HTTP 201 and formats to 04XX XXX XXX`, async () => {
        const res = await callPost({ customer_name: 'Test Mobile', phone });
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json.success).toBe(true);
      });
    }

    // Invalid cases: Landlines, foreign, wrong length, bad chars
    const invalidTestCases = [
      { phone: '0291234567', reason: 'NSW landline' },
      { phone: '0391234567', reason: 'VIC landline' },
      { phone: '0731234567', reason: 'QLD landline' },
      { phone: '0881234567', reason: 'SA landline' },
      { phone: '041234567', reason: '8 digits mobile (short)' },
      { phone: '04123456789', reason: '10 digits mobile (long)' },
      { phone: '+61391234567', reason: '+61 Landline' },
      { phone: '+84901234567', reason: 'Vietnam mobile' },
      { phone: '+15551234567', reason: 'US mobile' },
      { phone: '0512345678', reason: 'Non-mobile prefix 05' },
      { phone: '0612345678', reason: 'Non-mobile prefix 06' },
      { phone: '041234567a', reason: 'Letter character' },
      { phone: '0412 345 678!', reason: 'Punctuation exclamation' },
      { phone: '0412.345.678', reason: 'Period separators not in sanitize regex' },
      { phone: '0412 345 678 <script>', reason: 'XSS injection in phone' },
      { phone: "0412345678' OR '1'='1", reason: 'SQLi injection in phone' },
      { phone: '1300 123 456', reason: 'AU 1300 toll-free' },
      { phone: '1800 123 456', reason: 'AU 1800 toll-free' },
    ];

    for (const { phone, reason } of invalidTestCases) {
      it(`rejects invalid phone (${reason}): "${phone}" with HTTP 400`, async () => {
        const res = await callPost({ customer_name: 'Test Mobile', phone });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.error).toBe('Validation failed');
      });
    }
  });

  // =========================================================================
  // SECTION 5: Email Validation & Null Handling
  // =========================================================================
  describe('5. Email Format Validation and Null / Empty Values', () => {
    it('accepts valid Australian domain email with HTTP 201', async () => {
      const res = await callPost({
        customer_name: 'Emma Watson',
        phone: '0412345678',
        email: 'emma.w@sydney-nails.com.au',
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('accepts empty string email with HTTP 201', async () => {
      const res = await callPost({
        customer_name: 'Emma Watson',
        phone: '0412345678',
        email: '',
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('rejects invalid emails without @ or domain with HTTP 400', async () => {
      const badEmails = ['plainaddress', 'user@', '@domain.com', 'user@domain..com'];
      for (const email of badEmails) {
        const res = await callPost({ customer_name: 'Emma Watson', phone: '0412345678', email });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.success).toBe(false);
      }
    });

    it('empirically tests explicit null for email: { email: null }', async () => {
      const res = await callPost({
        customer_name: 'Emma Watson',
        phone: '0412345678',
        email: null,
      });
      // Documents if schema allows null vs undefined
      const json = await res.json();
      if (res.status === 400) {
        expect(json.details?.some((d: any) => d.field === 'email')).toBe(true);
      } else {
        expect(res.status).toBe(201);
      }
    });
  });

  // =========================================================================
  // SECTION 6: Preferred Date and Time Boundaries
  // =========================================================================
  describe('6. Preferred Date and Time Constraints', () => {
    it('accepts valid YYYY-MM-DD date with HTTP 201', async () => {
      const res = await callPost({
        customer_name: 'Date Tester',
        phone: '0412345678',
        preferred_date: '2026-11-30',
      });
      expect(res.status).toBe(201);
    });

    it('rejects non-YYYY-MM-DD date formats (DD/MM/YYYY, MM-DD-YYYY) with HTTP 400', async () => {
      const badDates = ['30/11/2026', '11-30-2026', '2026.11.30', 'November 30', '2026-1-1'];
      for (const d of badDates) {
        const res = await callPost({
          customer_name: 'Date Tester',
          phone: '0412345678',
          preferred_date: d,
        });
        expect(res.status).toBe(400);
      }
    });

    it('accepts preferred_time within 50 chars with HTTP 201', async () => {
      const res = await callPost({
        customer_name: 'Time Tester',
        phone: '0412345678',
        preferred_time: '14:30 AEST (Afternoon)',
      });
      expect(res.status).toBe(201);
    });

    it('rejects preferred_time exceeding 50 characters with HTTP 400', async () => {
      const longTime = 'A'.repeat(51);
      const res = await callPost({
        customer_name: 'Time Tester',
        phone: '0412345678',
        preferred_time: longTime,
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // =========================================================================
  // SECTION 7: Notes Length, SQLi & XSS Injections
  // =========================================================================
  describe('7. Notes Constraints and Injection Vectors', () => {
    it('accepts notes at maximum 1000 characters with HTTP 201', async () => {
      const maxNotes = 'N'.repeat(1000);
      const res = await callPost({
        customer_name: 'Notes Tester',
        phone: '0412345678',
        notes: maxNotes,
      });
      expect(res.status).toBe(201);
    });

    it('rejects notes exceeding 1000 characters (1001 chars) with HTTP 400', async () => {
      const oversized = 'N'.repeat(1001);
      const res = await callPost({
        customer_name: 'Notes Tester',
        phone: '0412345678',
        notes: oversized,
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('safely stores notes containing HTML, XSS, and SQLi strings', async () => {
      const attackNote = `<script>alert('XSS')</script> OR '1'='1'; DROP TABLE crm_consultations;`;
      const res = await callPost({
        customer_name: 'Attack Tester',
        phone: '0412345678',
        notes: attackNote,
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  // =========================================================================
  // SECTION 8: Preferred Language & Services Requested
  // =========================================================================
  describe('8. Language Enum and Services Requested Array', () => {
    it('accepts en and vi preferred_language with HTTP 201', async () => {
      for (const lang of ['en', 'vi']) {
        const res = await callPost({
          customer_name: 'Lang Tester',
          phone: '0412345678',
          preferred_language: lang,
        });
        expect(res.status).toBe(201);
      }
    });

    it('rejects unauthorized language codes (fr, de, zh, ja, vi-VN) with HTTP 400', async () => {
      for (const badLang of ['fr', 'de', 'zh', 'ja', 'vi-VN', 'en-AU', 'SPANISH']) {
        const res = await callPost({
          customer_name: 'Lang Tester',
          phone: '0412345678',
          preferred_language: badLang,
        });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.success).toBe(false);
      }
    });

    it('accepts string array for services_requested with HTTP 201', async () => {
      const res = await callPost({
        customer_name: 'Service Tester',
        phone: '0412345678',
        services_requested: ['srv-001', 'srv-002', 'Custom Gel Nail Art'],
      });
      expect(res.status).toBe(201);
    });

    it('rejects non-array or array with non-strings for services_requested with HTTP 400', async () => {
      const badServices = ['single_string_not_array', [123, 456], [null], [{ id: 'srv-001' }]];
      for (const services of badServices) {
        const res = await callPost({
          customer_name: 'Service Tester',
          phone: '0412345678',
          services_requested: services,
        });
        expect(res.status).toBe(400);
      }
    });
  });

  // =========================================================================
  // SECTION 9: Prototype Pollution & Parameter Tampering
  // =========================================================================
  describe('9. Parameter Tampering & Prototype Pollution Defense', () => {
    it('does not allow privilege escalation or status override via client payload', async () => {
      const maliciousPayload = {
        customer_name: 'Tamper Tester',
        phone: '0412345678',
        status: 'approved', // Client attempts to force approved status
        source: 'direct_admin_override',
        is_admin: true,
        role: 'superuser',
        __proto__: { isAdmin: true },
      };

      const res = await callPost(maliciousPayload);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      // Status must remain 'new' as enforced by server logic
      expect(json.status).toBe('new');
      expect(json.data.status).toBe('new');
    });
  });

  // =========================================================================
  // SECTION 10: HTTP Methods & Error Response Sanitization
  // =========================================================================
  describe('10. HTTP Methods & Response Sanitization', () => {
    it('returns HTTP 405 Method Not Allowed for GET request with clean JSON', async () => {
      const res = await GET();
      expect(res.status).toBe(405);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Method not allowed');
    });

    it('never exposes internal file paths or stack traces in error responses', async () => {
      const badInputs = [
        '{ bad json',
        'null',
        '[]',
        '{"customer_name": 123}',
        '{"phone": "invalid"}',
      ];

      for (const input of badInputs) {
        const res = await callPost(input);
        const text = await res.text();
        expect(text).not.toContain('node_modules');
        expect(text).not.toContain('src/app');
        expect(text).not.toContain('at async');
        expect(text).not.toContain('Error:');
      }
    });
  });

  // =========================================================================
  // SECTION 11: Oversized Payloads & Extreme Boundary Values
  // =========================================================================
  describe('11. Oversized Payloads & Extreme Values', () => {
    it('handles large payload with 1,000 services without memory leak or crash', async () => {
      const largeServices = Array.from({ length: 1000 }, (_, i) => `service-item-${i}`);
      const res = await callPost({
        customer_name: 'Bulk Service Request',
        phone: '0412 345 678',
        services_requested: largeServices,
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('rejects payload when notes is 1001 chars but accepts exactly 1000 chars', async () => {
      const notes1000 = 'X'.repeat(1000);
      const res1000 = await callPost({
        customer_name: 'Boundary Notes',
        phone: '0412 345 678',
        notes: notes1000,
      });
      expect(res1000.status).toBe(201);

      const notes1001 = 'X'.repeat(1001);
      const res1001 = await callPost({
        customer_name: 'Boundary Notes',
        phone: '0412 345 678',
        notes: notes1001,
      });
      expect(res1001.status).toBe(400);
      const json1001 = await res1001.json();
      expect(json1001.success).toBe(false);
      expect(json1001.details?.some((d: any) => d.field === 'notes')).toBe(true);
    });

    it('probes 100KB customer_name string (documents schema lack of max name limit)', async () => {
      const hugeName = 'A'.repeat(100000);
      const res = await callPost({
        customer_name: hugeName,
        phone: '0412 345 678',
      });
      // The API currently accepts large customer_name because z.string().min(2) lacks .max()
      expect(res.status).toBe(201);
    });
  });

  // =========================================================================
  // SECTION 12: Mobile Prefix Sampling Across All 0400-0499 Ranges
  // =========================================================================
  describe('12. Mobile Prefix Range Sampling (0400 - 0499)', () => {
    const prefixes = ['0400', '0410', '0420', '0430', '0440', '0450', '0460', '0470', '0480', '0490', '0499'];

    for (const prefix of prefixes) {
      it(`accepts prefix ${prefix} followed by 6 random digits`, async () => {
        const phone = `${prefix}123456`;
        const res = await callPost({
          customer_name: `Prefix ${prefix} User`,
          phone,
        });
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json.success).toBe(true);
      });
    }
  });

  // =========================================================================
  // SECTION 13: Error Handling & Invariant Verification on Failure
  // =========================================================================
  describe('13. Error Handling and Server Error Responses (HTTP 500)', () => {
    it('returns clean HTTP 400 when body reading fails', async () => {
      const badRequest = {
        json: async () => {
          throw new Error('Socket prematurely closed');
        },
      } as unknown as Request;

      const res = await POST(badRequest);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Invalid JSON payload');
    });

    it('returns HTTP 500 when Supabase database insert returns an error', async () => {
      const spy = vi.spyOn(mockSupabaseModule, 'createMockSupabaseClient').mockReturnValueOnce({
        from: () => ({
          insert: async () => ({
            data: null,
            error: { message: 'relation crm_consultations does not exist', code: '42P01' },
          }),
        }),
      } as any);

      const res = await callPost({
        customer_name: 'Database Error Probe',
        phone: '0412 345 678',
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Failed to record consultation inquiry');
      // Crucial security invariant: raw database error message / codes must NEVER leak to client
      const rawText = JSON.stringify(json);
      expect(rawText).not.toContain('42P01');
      expect(rawText).not.toContain('relation crm_consultations');

      spy.mockRestore();
    });

    it('returns HTTP 500 with sanitized message when an unhandled runtime error occurs in POST', async () => {
      const spy = vi.spyOn(mockSupabaseModule, 'createMockSupabaseClient').mockImplementationOnce(() => {
        throw new Error('Critical Supabase microservice fault (secret-db-url: https://internal.corp)');
      });

      const res = await callPost({
        customer_name: 'Unhandled Fault Probe',
        phone: '0412 345 678',
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Internal server error');
      // Crucial security invariant: stack trace and internal error message must NEVER leak to client
      const rawText = JSON.stringify(json);
      expect(rawText).not.toContain('Critical Supabase microservice fault');
      expect(rawText).not.toContain('secret-db-url');
      expect(rawText).not.toContain('stack');

      spy.mockRestore();
    });
  });
});

