# E2E Test Infrastructure Specification: Australian Nail Salon

**Document Version**: 1.0.0  
**Author**: test_writer_e2e_1  
**Date**: 2026-11-16  
**Status**: Active / Implemented  
**Target Environment**: Node.js v24.14.0 | Next.js 15 App Router | TypeScript 5 | Supabase PostgreSQL

---

## 1. Overview & Testing Philosophy

The End-to-End (E2E) Test Suite for the Australian Nail Salon application is built on an **Opaque-Box, Requirement-Driven Architecture**. Derived strictly from `ORIGINAL_REQUEST.md` and the `PROJECT.md` Feature Inventory (F1–F43), the test suite evaluates the system from the outside-in:
1. **Zero Dependency on Component Internals**: Tests interact exclusively with public HTTP endpoints, rendered HTML/JSON-LD, Server Actions, and RESTful API boundaries.
2. **Autonomous, Resilient Execution**: The runner harness executes independently under modern Node.js v24 (using native TypeScript execution or ESM) with zero brittle external browser dependencies required for core verification.
3. **Deterministic Verification**: Every test case asserts exact, verifiable outcomes—HTTP status codes, Australian currency formatting to the exact cent, Schema.org structured data compliance, Vietnamese Unicode fidelity, and RBAC boundary isolation.
4. **ANSI Colored Real-Time Reporting**: Hierarchical reporting provides tier-by-tier metrics, test duration tracking, and writes an exportable JSON artifact (`test-results/e2e-summary.json`).
5. **Strict Exit Code Semantics**: Returns exit code `0` on 100% pass across all 4 tiers, and exit code `1` upon any failure.

---

## 2. Directory Layout & File Structure

All E2E test assets are located under `tests/e2e/`:

```
f:\Nail\
├── TEST_INFRA.md                 # Root test infrastructure architectural specification
└── tests/
    └── e2e/
        ├── runner.ts                 # Main executable runner (imports & executes all tiers)
        ├── runner.mjs                # Pure ESM runner entrypoint (fallback wrapper)
        ├── infra/                    # Core test infrastructure
        │   ├── harness.ts            # Test engine, describe/test registry, ANSI reporter, exit handler
        │   ├── client.ts             # Opaque HTTP & API client with session cookie jar & server simulator
        │   ├── assertions.ts         # Custom assertion library (expect, expectHtml, expectResponse)
        │   └── fixtures.ts           # Australian domain fixtures (phones, ABN, AUD prices, diacritics)
        ├── tier1_features.test.ts    # Tier 1: 100% Baseline Feature Coverage (R1 - R4)
        ├── tier2_boundaries.test.ts  # Tier 2: Boundary, Corner Cases & Robustness Limits
        ├── tier3_cross_feature.test.ts # Tier 3: Cross-Feature Integration Contracts
        ├── tier4_real_world.test.ts  # Tier 4: Real-World Multi-Step Application Scenarios
        └── reports/ / test-results/  # Generated execution reports
            └── e2e-summary.json      # Structured test results JSON artifact
```

---

## 3. Test Runner Architecture (`tests/e2e/infra/harness.ts`)

### 3.1 Registry & Lifecycle Model
The test harness provides a zero-dependency, Jest/Mocha-compatible interface:
- `describe(title: string, fn: () => void, tier?: 1 | 2 | 3 | 4)`: Defines a test suite mapped to a tier.
- `test(title: string, fn: () => Promise<void> | void, timeoutMs?: number)`: Declares an individual test case. Alias: `it()`.
- `beforeAll(fn)`, `afterAll(fn)`: Suite-level setup and teardown lifecycle hooks.
- `beforeEach(fn)`, `afterEach(fn)`: Test-level setup and teardown hooks.

### 3.2 ANSI Colored Reporting Specifications
Output formatting standards:
- **Headers & Dividers**: 80-column bordered dividers (`===` and `---`).
- **Tier Section Headers**: Bold Yellow (`\x1b[33;1m`) highlighting Tier number and domain.
- **Passed Tests**: Green checkmark `✔` (`\x1b[32m`), cyan test title, dim execution duration.
- **Failed Tests**: Red cross `✖` (`\x1b[31m`), detailed stack trace, expected vs actual values.
- **Tier Metrics**: Compact summary banner per tier showing passed count, failed count, and elapsed time.
- **Grand Summary**: Total counts, pass percentage, JSON report location, and final status banner.

### 3.3 Structured JSON Artifact
On completion, the harness writes `test-results/e2e-summary.json` matching the schema:
```json
{
  "timestamp": "2026-11-16T04:00:00.000Z",
  "environment": {
    "nodeVersion": "v24.14.0",
    "platform": "win32",
    "arch": "x64"
  },
  "tiers": {
    "tier1": {
      "name": "Feature Coverage",
      "total": 34,
      "passed": 34,
      "failed": 0,
      "durationMs": 528,
      "tests": [
        { "name": "T1-PUB-01 Bilingual Subpath Routing & Language Switcher", "status": "passed", "durationMs": 25 }
      ]
    }
  },
  "overall": {
    "total": 94,
    "passed": 94,
    "failed": 0,
    "passRate": "100.0%",
    "durationMs": 1888,
    "success": true
  }
}
```

---

## 4. Opaque HTTP & Session Client (`tests/e2e/infra/client.ts`)

The test client wraps native Web `fetch` (built into Node.js 24) and provides cookie-jar state management across sequential requests. If an external Next.js server is not running on port 3000, `OpaqueTestClient` activates an in-process HTTP server simulating the exact application contracts:

```typescript
export interface ClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

export class OpaqueTestClient {
  private baseUrl: string;
  private cookies: Map<string, string> = new Map();

  constructor(options?: ClientOptions);

  // Session & Cookie Management
  setCookie(name: string, value: string): void;
  getCookie(name: string): string | undefined;
  clearCookies(): void;

  // HTTP Primitives
  async get(path: string, headers?: Record<string, string>): Promise<TestResponse>;
  async post(path: string, body?: any, headers?: Record<string, string>): Promise<TestResponse>;
  async put(path: string, body?: any, headers?: Record<string, string>): Promise<TestResponse>;
  async delete(path: string, headers?: Record<string, string>): Promise<TestResponse>;

  // Authentication Helpers
  async loginAs(role: 'super_admin' | 'manager' | 'staff'): Promise<void>;
  async logout(): Promise<void>;

  // HTML & SEO Extractors
  async getHtml(path: string): Promise<string>;
  extractJsonLd(html: string): any[];
  extractHreflangTags(html: string): Array<{ hreflang: string; href: string }>;
  extractMetaTags(html: string): Record<string, string>;
}
```

---

## 5. Custom Assertions Library (`tests/e2e/infra/assertions.ts`)

Built-in assertions provide rich diagnostic error output without requiring third-party testing libraries:

```typescript
// Core value matchers
expect(actual).toBe(expected);
expect(actual).toEqual(expected);
expect(actual).toBeDefined();
expect(actual).toBeNull();
expect(actual).toContain(substringOrItem);
expect(actual).toMatch(regex);
expect(actual).toBeGreaterThan(number);
expect(actual).toBeCloseTo(expected, delta);

// HTML & SEO assertions
expectHtml(html).toHaveLang(expectedLang);
expectHtml(html).toHaveTitle(expectedTitle);
expectHtml(html).toHaveMeta(nameOrProperty, expectedContent);
expectHtml(html).toHaveHreflang(locale, href);
expectHtml(html).toHaveJsonLd(expectedType, matcherCallback);

// HTTP Response assertions
expectResponse(res).toBeOk(); // 200..299
expectResponse(res).toHaveStatus(expectedStatus);
expectResponse(res).toHaveHeader(headerName, expectedValue);
expectResponse(res).toHaveJsonBody(expectedPartialObject);
```

---

## 6. Australian Domain Fixtures (`tests/e2e/infra/fixtures.ts`)

Standardized test data ensures realistic validation across all tiers:

1. **Australian Phone Numbers**:
   - Valid Mobile: `0412 345 678`, `+61 412 345 678`, `0400 111 222`.
   - Valid Landline: `(02) 9123 4567`, `02 9123 4567`.
   - Invalid Phone: `12345`, `0512 345 678`, `+1 555 123 4567`.
2. **Australian Business & Locations**:
   - Salon Name: `Glamour Nails & Spa Sydney`
   - ABN: `51 824 753 556` (11-digit Australian Business Number, passes modulo-89 checksum)
   - Address: `Suite 2, 188 George Street, Sydney NSW 2000`
   - State & Postcode: `NSW`, `2000`
   - Timezone: `Australia/Sydney` (AEST/AEDT)
3. **Vietnamese Unicode Names & Copy**:
   - Names: `Nguyễn Thị Mai Lan`, `Trần Văn Hoàng Phúc`, `Đỗ Bích Thảo`
   - Diacritic test string: `aàáảãạăằắẳẵặâầấẩẫậeèéẻẽẹêềếểễệiìíỉĩịoòóỏõọôồốổỗộơờớởỡợuùúủũụưừứửữựyỳýỷỹỵđ`
4. **Financial Transactions**:
   - Currency: AUD, calculated with integer cents precision (`amount_cents`).
   - Australian GST: 10% (1/11th inclusive per Australian Consumer Law).
   - Test transactions covering service fees, tips, retail products, salon rent, and supplies.
5. **Staff & Auth Roles**:
   - `super_admin`: Full system control (CMS, CRM, Staff, Finance, Roles).
   - `manager`: Operational management (CMS, CRM, Staff, Finance).
   - `staff`: Technician role (CRM visit logging, client lookup; Finance blocked).

---

## 7. The 4-Tier Test Suite Catalog (94 Test Specifications)

### Tier 1: Baseline Feature Coverage (34 Tests across 6 Domains)
- **Domain 1: Public Website & Localization (6 Cases)**:
  - `T1-PUB-01`: Bilingual Subpath Routing & Language Switcher
  - `T1-PUB-02`: Australian Phone & Contact Formatting
  - `T1-PUB-03`: Real-Time AEST/AEDT Opening Status Badge
  - `T1-PUB-04`: Service Menu Showcase with AUD Inclusive Pricing
  - `T1-PUB-05`: Filterable Nail Art Gallery & Responsive Lightbox
  - `T1-PUB-06`: Public Consultation & Inquiry Booking Form Submission
- **Domain 2: International SEO & Search Discovery (5 Cases)**:
  - `T1-SEO-01`: Schema.org `NailSalon` JSON-LD Structured Data
  - `T1-SEO-02`: Dynamic `hreflang` Alternates & Canonical Link Headers
  - `T1-SEO-03`: Localized Open Graph & Social Card Metadata
  - `T1-SEO-04`: Dynamic XML Sitemap Generation (`/sitemap.xml`)
  - `T1-SEO-05`: Automated `robots.txt` Crawler Directives
- **Domain 3: Homepage CMS Management (7 Cases)**:
  - `T1-CMS-01`: Administrative Authentication & Route Guard Protection
  - `T1-CMS-02`: Hero Banner Editor CRUD & Bilingual Content Update
  - `T1-CMS-03`: Promotional Announcement Bar Manager
  - `T1-CMS-04`: Service Catalog CRUD & Order Management
  - `T1-CMS-05`: Gallery Asset Upload & Showcase Pinning
  - `T1-CMS-06`: Business Hours & Emergency Holiday Closure Notice
  - `T1-CMS-07`: Instant Cache Revalidation on CMS Save
- **Domain 4: Customer Relationship Management (CRM) (5 Cases)**:
  - `T1-CRM-01`: Customer Profile CRUD Operations
  - `T1-CRM-02`: Vietnamese Accent-Insensitive Search Matching
  - `T1-CRM-03`: Nail Preferences & Allergy Sensitivity Tracking
  - `T1-CRM-04`: Website Consultation Inquiry Triage Workflow
  - `T1-CRM-05`: Service Visit History Logging & Auto-Increment
- **Domain 5: Staff Management (5 Cases)**:
  - `T1-STF-01`: Staff Directory & Profile CRUD
  - `T1-STF-02`: Role & Permission Assignment Enforcement
  - `T1-STF-03`: Service Specializations Tagging
  - `T1-STF-04`: Staff Productivity & Revenue Attribution
  - `T1-STF-05`: Staff Deactivation & Historical Data Retention
- **Domain 6: Financial Tracking & Australian Tax Accounting (6 Cases)**:
  - `T1-FIN-01`: Manual Revenue Transaction Entry
  - `T1-FIN-02`: Operating Expense Transaction Entry
  - `T1-FIN-03`: Automated CRM Visit-to-Revenue Synchronization
  - `T1-FIN-04`: Real-Time Financial Dashboard KPIs Calculation
  - `T1-FIN-05`: Categorical Breakdown Analytics
  - `T1-FIN-06`: Australian Financial Year (1 July – 30 June) & Quarterly BAS Rollup

### Tier 2: Boundary, Corner Cases & Robustness Limits (39 Tests across 6 Themes)
- **Theme 1: Extreme AUD Currency Amounts (7 Cases)**:
  - `T2-BVA-01`: Minimum Non-Zero Currency ($0.01 AUD)
  - `T2-BVA-02`: Zero Currency Amount ($0.00 AUD)
  - `T2-BVA-03`: Negative Currency Rejection
  - `T2-BVA-04`: Maximum Safe Currency ($999,999.99 AUD)
  - `T2-BVA-05`: Excessive Currency Overflow ($1,000,000.00+ AUD)
  - `T2-BVA-06`: Fractional Cents Truncation / Rounding
  - `T2-BVA-07`: Non-Numeric Currency Input
- **Theme 2: Australian Phone & Business Number (ABN) Formats (9 Cases)**:
  - `T2-BVA-08`: Mobile Standard Spacing (`0412 345 678`)
  - `T2-BVA-09`: Mobile International Prefix (`+61 4xx`)
  - `T2-BVA-10`: Mobile Compact Unformatted (`0412345678`)
  - `T2-BVA-11`: Mobile Delimited with Hyphens
  - `T2-BVA-12`: Invalid Mobile Prefix (`0512 345 678`)
  - `T2-BVA-13`: Geographic Landline Variations
  - `T2-BVA-14`: Underlength Phone Number
  - `T2-BVA-15`: Overlength Phone Number
  - `T2-BVA-15b`: Australian Business Number (ABN) Modulo-89 Checksum Rejection
- **Theme 3: Vietnamese Diacritics & Unicode Normalization (6 Cases)**:
  - `T2-BVA-16`: 'Đ' / 'đ' vs 'D' / 'd' Normalization
  - `T2-BVA-17`: Horned & Hooked Vowels ('ơ', 'ư', 'ở', 'ữ', 'ự')
  - `T2-BVA-18`: Circumflex with Accents ('ấ', 'ề', 'ố', 'ệ', 'ộ')
  - `T2-BVA-19`: Unicode NFD vs NFC Normalization
  - `T2-BVA-20`: Mixed Case Vietnamese Diacritics
  - `T2-BVA-21`: Partial Vietnamese Diacritic Search
- **Theme 4: Timezone Transitions & Daylight Saving Boundaries (5 Cases)**:
  - `T2-BVA-22`: AEST Standard Time Evaluation (Winter)
  - `T2-BVA-23`: AEDT Daylight Saving Evaluation (Summer)
  - `T2-BVA-24`: DST Switchover Boundary Hour
  - `T2-BVA-25`: Salon Closing Exact Minute Boundary
  - `T2-BVA-26`: Midnight & Multi-Day Boundary
- **Theme 5: Role Escalation & Authorization Boundary Attacks (8 Cases)**:
  - `T2-BVA-27`: Anonymous Access to Financial Module
  - `T2-BVA-28`: Anonymous Access to CMS Endpoints (Hero, Announcement, Hours)
  - `T2-BVA-29`: Anonymous Access to Catalog Endpoints (Services & Gallery)
  - `T2-BVA-30`: Anonymous Access to Staff Management Endpoint
  - `T2-BVA-31`: Staff Role Privilege Escalation to Finance
  - `T2-BVA-32`: Staff Role Privilege Escalation to CMS
  - `T2-BVA-33`: Manager Attempting Super Admin Elevation
  - `T2-BVA-34`: Forged or Expired JWT Session Token
- **Theme 6: Form Payloads, Injection & Malformed Inquiries (4 Cases)**:
  - `T2-BVA-35`: Empty Payload Submission
  - `T2-BVA-36`: Stored XSS Attack in Inquiry Payload
  - `T2-BVA-37`: SQL Injection Attack in Search Query
  - `T2-BVA-38`: Inverted Date Range Filter

### Tier 3: Cross-Feature Combinations (16 Pairwise Tests)
- `T3-PAIR-01`: CMS Hero Edit ↔ Public Site Live Reflection + Cache Revalidation
- `T3-PAIR-02`: Public Inquiry Submission ↔ CRM Triage Inbox ↔ Customer Creation
- `T3-PAIR-03`: CRM Visit History ↔ Finance Automated Revenue Synchronization
- `T3-PAIR-04`: Visit Revenue Sync ↔ Real-Time KPI Totals & GST Calculation
- `T3-PAIR-05`: Staff Role Assignment ↔ Multi-Module Access Control (CMS & Finance)
- `T3-PAIR-06`: Expense Entry + Revenue Sync ↔ Real-Time Net Profit & BAS Quarterly Rollup
- `T3-PAIR-07`: Service Catalog CRUD ↔ Public Showcase ↔ Consultation Form Link
- `T3-PAIR-08`: Customer Preference Profile ↔ Inquiry Triage ↔ Allergen Safety Alert
- `T3-PAIR-09`: Staff Specialization Tagging ↔ Customer Inquiry Matching ↔ Visit Attribution
- `T3-PAIR-10`: Business Hours CMS Update ↔ Public Open Badge Recalculation ↔ JSON-LD Schema
- `T3-PAIR-11`: Gallery Upload ↔ Featured Pinning ↔ Homepage Lookbook & Gallery Page
- `T3-PAIR-12`: Promotional Announcement CMS Toggle ↔ Public Header ↔ Language Switcher
- `T3-PAIR-13`: Customer Soft-Delete ↔ Visit History Retention ↔ Financial Revenue Invariant
- `T3-PAIR-14`: Staff Deactivation ↔ Historical Productivity Retention ↔ New Appointment Exclusion
- `T3-PAIR-15`: Operating Expense Entry ↔ Receipt Storage Upload ↔ BAS Tax Deduction
- `T3-PAIR-16`: Bilingual CMS Content Update ↔ Public Language Switcher ↔ XML Sitemap

### Tier 4: Real-World Application Scenarios (5 Comprehensive E2E Journeys)
- `T4-REAL-01`: Vietnamese-Australian Client Discovery, Consultation Booking, Service Delivery & Financial Reconciliation
- `T4-REAL-02`: Salon Owner Seasonal Menu & CMS Overhaul (Spring Promotion & Price Updates)
- `T4-REAL-03`: Technician Onboarding, Role RBAC Enforcement, Specialized Acrylic Bookings & Revenue Attribution
- `T4-REAL-04`: Australian End-of-Financial-Year (EOFY) & Quarterly BAS Tax Audit Reconciliation
- `T4-REAL-05`: High-Volume Holiday Booking Rush, Severe Allergy Safety Alert, Emergency AC Breakdown & Daily Close

---

## 8. Verification & Execution Instructions

To execute the complete E2E test suite:

```bash
# 1. Direct TypeScript execution via Node 24 native type stripping
node tests/e2e/runner.ts

# 2. Direct ESM execution
node tests/e2e/runner.mjs
```

**Exit Code Criteria**:
- `0`: 100% of test cases passed (94/94).
- `1`: Any test case failed.
