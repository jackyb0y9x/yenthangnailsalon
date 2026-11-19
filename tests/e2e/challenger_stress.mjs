/**
 * Challenger Stress & Adversarial Verification Harness
 * Tests ATO Tax Math, Vietnamese Unicode handling, and Harness Resilience
 */

import { calculateGst, formatAud, validateAbn, validateAuPhone, normalizeVietnamese } from './infra/fixtures.ts';
import { expect, expectHtml, expectResponse } from './infra/assertions.ts';
import { harness, describe, test } from './infra/harness.ts';

console.log('================================================================================');
console.log('🧪 RUNNING CHALLENGER EMPIRICAL VERIFICATION HARNESS');
console.log('================================================================================');

let passedAssertions = 0;
let totalAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (!condition) {
    throw new Error(`CHALLENGE ASSERTION FAILED: ${message}`);
  }
  passedAssertions++;
}

// ============================================================================
// 1. Australian Tax Math & ATO Benchmarks Verification
// ============================================================================
console.log('\n[1/4] Stress-testing Australian Tax Math (ATO 1/11th Rule & Integer Cents)...');

// Benchmark 1: Exact integer cents addition & invariant gross = gst + net
let invariantFailures = 0;
for (let cents = 0; cents <= 100000; cents++) {
  const { grossCents, gstCents, netCents } = calculateGst(cents);
  if (grossCents !== cents || gstCents + netCents !== grossCents) {
    invariantFailures++;
  }
}
assert(invariantFailures === 0, `Invariant gross = gst + net failed for ${invariantFailures} price points`);
console.log('  ✔ Tested 100,001 price points ($0.00 to $1,000.00): 0 invariant failures');

// Benchmark 2: ATO standard benchmark prices
const atoBenchmarks = [
  { grossCents: 1100, expectedGst: 100, expectedNet: 1000, desc: '$11.00 item' },
  { grossCents: 2200, expectedGst: 200, expectedNet: 2000, desc: '$22.00 item' },
  { grossCents: 3500, expectedGst: 318, expectedNet: 3182, desc: '$35.00 Express Manicure (3500/11 = 318.18 -> 318)' },
  { grossCents: 4500, expectedGst: 409, expectedNet: 4091, desc: '$45.00 3D Art (4500/11 = 409.09 -> 409)' },
  { grossCents: 5500, expectedGst: 500, expectedNet: 5000, desc: '$55.00 Supplies wholesale' },
  { grossCents: 6500, expectedGst: 591, expectedNet: 5909, desc: '$65.00 Spa Pedicure (6500/11 = 590.91 -> 591)' },
  { grossCents: 7500, expectedGst: 682, expectedNet: 6818, desc: '$75.00 SNS Dipping (7500/11 = 681.82 -> 682)' },
  { grossCents: 8500, expectedGst: 773, expectedNet: 7727, desc: '$85.00 Russian Manicure (8500/11 = 772.73 -> 773)' },
  { grossCents: 9500, expectedGst: 864, expectedNet: 8636, desc: '$95.00 Acrylic Full Set (9500/11 = 863.64 -> 864)' },
  { grossCents: 100, expectedGst: 9, expectedNet: 91, desc: '$1.00 (100/11 = 9.09 -> 9)' },
  { grossCents: 50, expectedGst: 5, expectedNet: 45, desc: '$0.50 (50/11 = 4.55 -> 5)' },
  { grossCents: 11, expectedGst: 1, expectedNet: 10, desc: '$0.11 (11/11 = 1.00 -> 1)' },
  { grossCents: 6, expectedGst: 1, expectedNet: 5, desc: '$0.06 (6/11 = 0.545 -> 1)' },
  { grossCents: 5, expectedGst: 0, expectedNet: 5, desc: '$0.05 (5/11 = 0.455 -> 0)' },
  { grossCents: 1, expectedGst: 0, expectedNet: 1, desc: '$0.01 (1/11 = 0.091 -> 0)' },
  { grossCents: 0, expectedGst: 0, expectedNet: 0, desc: '$0.00' },
  { grossCents: 99999999, expectedGst: 9090909, expectedNet: 90909090, desc: '$999,999.99 max safe' },
];

for (const b of atoBenchmarks) {
  const result = calculateGst(b.grossCents);
  assert(result.grossCents === b.grossCents, `${b.desc}: gross mismatch`);
  assert(result.gstCents === b.expectedGst, `${b.desc}: expected GST ${b.expectedGst}, got ${result.gstCents}`);
  assert(result.netCents === b.expectedNet, `${b.desc}: expected Net ${b.expectedNet}, got ${result.netCents}`);
  assert(result.gstCents + result.netCents === b.grossCents, `${b.desc}: sum mismatch`);
}
console.log(`  ✔ Tested ${atoBenchmarks.length} ATO reference test cases: All passed exact integer cent rounding`);

// Benchmark 3: AUD Formatting check
assert(formatAud(0) === '$0.00 AUD', 'formatAud(0)');
assert(formatAud(1) === '$0.01 AUD', 'formatAud(1)');
assert(formatAud(99) === '$0.99 AUD', 'formatAud(99)');
assert(formatAud(100) === '$1.00 AUD', 'formatAud(100)');
assert(formatAud(3500) === '$35.00 AUD', 'formatAud(3500)');
assert(formatAud(99999999) === '$999999.99 AUD', 'formatAud(max)');
console.log('  ✔ Tested AUD formatting output');

// Benchmark 4: ABN Modulo-89 validation check
assert(validateAbn('51 824 753 556') === true, 'ABN with spaces');
assert(validateAbn('51824753556') === true, 'ABN without spaces');
assert(validateAbn('51-824-753-556') === true, 'ABN with dashes');
assert(validateAbn('51 824 753 557') === false, 'Invalid ABN checksum');
assert(validateAbn('12 345 678 901') === false, 'Arbitrary invalid ABN');
assert(validateAbn('12345') === false, 'Short ABN');
console.log('  ✔ Tested ABN modulo-89 checksum verification');

// ============================================================================
// 2. Vietnamese Unicode Handling & Accent-Insensitive Matching
// ============================================================================
console.log('\n[2/4] Stress-testing Vietnamese Unicode Handling & Normalization...');

// All Vietnamese vowel variations with all 5 tones and diacritics
const vietnameseTestStrings = [
  // A variants
  { input: 'a à á ả ã ạ', expected: 'a a a a a a' },
  { input: 'ă ằ ắ ẳ ẵ ặ', expected: 'a a a a a a' },
  { input: 'â ầ ấ ẩ ẫ ậ', expected: 'a a a a a a' },
  // E variants
  { input: 'e è é ẻ ẽ ẹ', expected: 'e e e e e e' },
  { input: 'ê ề ế ể ễ ệ', expected: 'e e e e e e' },
  // I variants
  { input: 'i ì í ỉ ĩ ị', expected: 'i i i i i i' },
  // O variants
  { input: 'o ò ó ỏ õ ọ', expected: 'o o o o o o' },
  { input: 'ô ồ số ổ ỗ ộ', expected: 'o o so o o o' },
  { input: 'ơ ờ ớ ở ỡ ợ', expected: 'o o o o o o' },
  // U variants
  { input: 'u ù ú ủ ũ ụ', expected: 'u u u u u u' },
  { input: 'ư ừ ứ ử ữ ự', expected: 'u u u u u u' },
  // Y variants
  { input: 'y ỳ ý ỷ ỹ ỵ', expected: 'y y y y y y' },
  // D stroke
  { input: 'đ Đ', expected: 'd d' },
  // Complex full names
  { input: 'Nguyễn Thị Mai Lan', expected: 'nguyen thi mai lan' },
  { input: 'Đặng Thị Đoan Trang', expected: 'dang thi doan trang' },
  { input: 'Dương Như Quỳnh', expected: 'duong nhu quynh' },
  { input: 'Trần Văn Hoàng Phúc', expected: 'tran van hoang phuc' },
  { input: 'Vũ Đình Đạt', expected: 'vu dinh dat' },
];

for (const vt of vietnameseTestStrings) {
  const norm = normalizeVietnamese(vt.input);
  assert(norm === vt.expected, `Expected normalizeVietnamese("${vt.input}") to be "${vt.expected}", got "${norm}"`);
}
console.log(`  ✔ Tested ${vietnameseTestStrings.length} Vietnamese diacritic groups: All normalize to unaccented form`);

// Test Unicode NFC vs NFD equivalence across all strings
for (const vt of vietnameseTestStrings) {
  const nfc = vt.input.normalize('NFC');
  const nfd = vt.input.normalize('NFD');
  const normNfc = normalizeVietnamese(nfc);
  const normNfd = normalizeVietnamese(nfd);
  assert(normNfc === normNfd, `NFC/NFD mismatch for "${vt.input}": "${normNfc}" vs "${normNfd}"`);
}
console.log('  ✔ Tested NFC vs NFD equivalence: 100% identical search tokens');

// Test Accent-Insensitive Search Substring Matching
const searchCorpus = [
  'Nguyễn Thị Mai Lan',
  'Đặng Thị Đoan Trang',
  'Dương Như Quỳnh',
  'Nguyễn Quốc Cường',
  'Trần Mai Phương',
  'Vũ Đình Đạt',
];

function searchInCorpus(query) {
  const normQuery = normalizeVietnamese(query);
  return searchCorpus.filter((item) => normalizeVietnamese(item).includes(normQuery));
}

// Queries
assert(searchInCorpus('nguyen').length === 2, 'Query "nguyen" should match 2 Nguyễns');
assert(searchInCorpus('NGUYEN').length === 2, 'Query "NGUYEN" should match 2 Nguyễns');
assert(searchInCorpus('Nguyễn').length === 2, 'Query "Nguyễn" should match 2 Nguyễns');
assert(searchInCorpus('dang').length === 1, 'Query "dang" should match Đặng');
assert(searchInCorpus('ĐẶNG').length === 1, 'Query "ĐẶNG" should match Đặng');
assert(searchInCorpus('doan').length === 1, 'Query "doan" should match Đoan');
assert(searchInCorpus('quynh').length === 1, 'Query "quynh" should match Quỳnh');
assert(searchInCorpus('dat').length === 1, 'Query "dat" should match Đạt');
assert(searchInCorpus('dinh').length === 1, 'Query "dinh" should match Đình');
assert(searchInCorpus('nonexistent').length === 0, 'Query "nonexistent" should return 0');
console.log('  ✔ Accent-insensitive search matching verified across all Vietnamese test cases');

// ============================================================================
// 3. Australian Phone Validation ACMA Compliance
// ============================================================================
console.log('\n[3/4] Stress-testing Australian Phone ACMA Validation...');

const validPhones = [
  '0412 345 678',
  '0412345678',
  '+61 412 345 678',
  '+61412345678',
  '0412-345-678',
  '0412.345.678',
  '(02) 9123 4567',
  '02 9123 4567',
  '0291234567',
  '+61 2 9123 4567',
  '+61291234567',
  '(03) 9123 4567', // VIC
  '(07) 3123 4567', // QLD
  '(08) 8123 4567', // SA/WA
];

for (const p of validPhones) {
  assert(validateAuPhone(p) === true, `Valid phone rejected: ${p}`);
}
console.log(`  ✔ Tested ${validPhones.length} valid AU mobile & landline phone formats: All accepted`);

const invalidPhones = [
  '0512 345 678', // Invalid prefix 05
  '0112 345 678', // Invalid prefix 01
  '0412 345 67',  // 9 digits (too short)
  '0412 345 6789',// 11 digits (too long)
  '+1 555 123 4567', // US number
  '+44 20 7946 0958', // UK number
  'abcdefg',
  '',
  null,
  undefined,
];

for (const p of invalidPhones) {
  assert(validateAuPhone(p) === false, `Invalid phone accepted: ${p}`);
}
console.log(`  ✔ Tested ${invalidPhones.length} invalid phone formats: All rejected`);

// ============================================================================
// 4. Test Harness Assertion Integrity & Failure Reporting
// ============================================================================
console.log('\n[4/4] Testing Harness Assertion Matchers...');

// Expect matchers
expect(10).toBe(10);
expect('hello').toContain('ell');
expect([1, 2, 3]).toContain(2);
expect({ a: 1, b: 2 }).toEqual({ a: 1, b: 2 });
expect(10).toBeGreaterThan(5);
expect(10).toBeGreaterThanOrEqual(10);
expect(5).toBeLessThan(10);
expect(5).toBeLessThanOrEqual(5);
expect(3.14159).toBeCloseTo(3.14, 0.01);
expect(() => { throw new Error('bang'); }).toThrow('bang');
expect('test').not.toBe('other');
expect([1, 2]).not.toContain(3);
console.log('  ✔ Standard assertion matchers verified');

// Failure verification
let failureCaught = false;
try {
  expect(10).toBe(20);
} catch (e) {
  failureCaught = true;
  assert(e.message.includes('Assertion failed'), 'Failure message contains "Assertion failed"');
}
assert(failureCaught === true, 'expect(10).toBe(20) must throw an error');
console.log('  ✔ Intentionally failing assertion correctly threw descriptive error');

console.log('\n================================================================================');
console.log(`🎉 ALL ${passedAssertions}/${totalAssertions} CHALLENGER VERIFICATION ASSERTIONS PASSED!`);
console.log('================================================================================\n');
