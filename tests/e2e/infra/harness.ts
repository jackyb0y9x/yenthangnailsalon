/**
 * Zero-dependency, lightweight, ANSI-colored E2E Test Harness
 * Designed for Node.js v24 native execution
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export type TestFn = () => Promise<void> | void;
export type HookFn = () => Promise<void> | void;

export interface TestCase {
  name: string;
  fn: TestFn;
  timeoutMs: number;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  durationMs: number;
  error?: Error;
}

export interface TestSuite {
  name: string;
  tier: 1 | 2 | 3 | 4;
  tests: TestCase[];
  beforeAllHooks: HookFn[];
  afterAllHooks: HookFn[];
  beforeEachHooks: HookFn[];
  afterEachHooks: HookFn[];
}

export interface RunResults {
  total: number;
  passed: number;
  failed: number;
  success: boolean;
  durationMs: number;
}

class TestHarness {
  private suites: TestSuite[] = [];
  private currentSuite: TestSuite | null = null;

  describe(name: string, fn: () => void, tier: 1 | 2 | 3 | 4 = 1) {
    const parentSuite = this.currentSuite;
    const suite: TestSuite = {
      name: parentSuite ? `${parentSuite.name} > ${name}` : name,
      tier: parentSuite ? parentSuite.tier : tier,
      tests: [],
      beforeAllHooks: [],
      afterAllHooks: [],
      beforeEachHooks: [],
      afterEachHooks: [],
    };
    this.suites.push(suite);
    this.currentSuite = suite;
    try {
      fn();
    } finally {
      this.currentSuite = parentSuite;
    }
  }

  test(name: string, fn: TestFn, timeoutMs: number = 10000) {
    if (!this.currentSuite) {
      throw new Error(`test("${name}") must be called inside a describe() block`);
    }
    const actualTimeout = timeoutMs <= 10 ? 10000 : timeoutMs;
    this.currentSuite.tests.push({
      name,
      fn,
      timeoutMs: actualTimeout,
      status: 'pending',
      durationMs: 0,
    });
  }

  beforeAll(fn: HookFn) {
    if (!this.currentSuite) throw new Error('beforeAll() must be called inside describe()');
    this.currentSuite.beforeAllHooks.push(fn);
  }

  afterAll(fn: HookFn) {
    if (!this.currentSuite) throw new Error('afterAll() must be called inside describe()');
    this.currentSuite.afterAllHooks.push(fn);
  }

  beforeEach(fn: HookFn) {
    if (!this.currentSuite) throw new Error('beforeEach() must be called inside describe()');
    this.currentSuite.beforeEachHooks.push(fn);
  }

  afterEach(fn: HookFn) {
    if (!this.currentSuite) throw new Error('afterEach() must be called inside describe()');
    this.currentSuite.afterEachHooks.push(fn);
  }

  async run(): Promise<RunResults> {
    const startTime = Date.now();
    console.log('\x1b[1m\x1b[36m%s\x1b[0m', '================================================================================');
    console.log('\x1b[1m\x1b[36m%s\x1b[0m', '🚀 RUNNING E2E TEST SUITE — AUSTRALIAN NAIL SALON (4-TIER ARCHITECTURE)');
    console.log('\x1b[1m\x1b[36m%s\x1b[0m', '================================================================================');
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`⚙️  Runtime: Node.js ${process.version} | Platform: ${process.platform} (${process.arch})\n`);

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    const tierMetrics: Record<
      number,
      {
        name: string;
        total: number;
        passed: number;
        failed: number;
        durationMs: number;
        tests: Array<{ name: string; status: string; durationMs: number; error?: string }>;
      }
    > = {
      1: { name: 'Tier 1: Feature Coverage', total: 0, passed: 0, failed: 0, durationMs: 0, tests: [] },
      2: { name: 'Tier 2: Boundary & Corner Cases', total: 0, passed: 0, failed: 0, durationMs: 0, tests: [] },
      3: { name: 'Tier 3: Cross-Feature Combinations', total: 0, passed: 0, failed: 0, durationMs: 0, tests: [] },
      4: { name: 'Tier 4: Real-World Scenarios', total: 0, passed: 0, failed: 0, durationMs: 0, tests: [] },
    };

    for (let tier = 1; tier <= 4; tier++) {
      const tierSuites = this.suites.filter((s) => s.tier === tier);
      if (tierSuites.length === 0) continue;

      const tierStart = Date.now();
      const tierTitle =
        tier === 1
          ? 'TIER 1: Feature Coverage (R1 - R4 Baseline)'
          : tier === 2
          ? 'TIER 2: Boundary & Corner Cases (BVA, Stress & Negative Testing)'
          : tier === 3
          ? 'TIER 3: Cross-Feature Combinations & Integration Contracts'
          : 'TIER 4: Real-World Multi-Step Application Scenarios';

      console.log(`\x1b[1m\x1b[33m▶ ${tierTitle}\x1b[0m`);

      for (const suite of tierSuites) {
        console.log(`  \x1b[1m\x1b[37m${suite.name}\x1b[0m`);

        // Execute beforeAll hooks
        for (const hook of suite.beforeAllHooks) {
          try {
            await hook();
          } catch (hookErr: any) {
            console.log(`    \x1b[31m✖ beforeAll hook failed: ${hookErr.message}\x1b[0m`);
          }
        }

        for (const testCase of suite.tests) {
          totalTests++;
          tierMetrics[tier].total++;

          // Execute beforeEach hooks
          for (const hook of suite.beforeEachHooks) {
            try {
              await hook();
            } catch (hookErr: any) {
              console.log(`    \x1b[31m✖ beforeEach hook failed: ${hookErr.message}\x1b[0m`);
            }
          }

          const tStart = Date.now();
          try {
            // Run test with timeout
            await Promise.race([
              testCase.fn(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Test timed out after ${testCase.timeoutMs}ms`)), testCase.timeoutMs)
              ),
            ]);
            testCase.durationMs = Date.now() - tStart;
            testCase.status = 'passed';
            passedTests++;
            tierMetrics[tier].passed++;
            tierMetrics[tier].tests.push({
              name: testCase.name,
              status: 'passed',
              durationMs: testCase.durationMs,
            });
            console.log(`    \x1b[32m✔\x1b[0m ${testCase.name} \x1b[90m(${testCase.durationMs}ms)\x1b[0m`);
          } catch (err: any) {
            testCase.durationMs = Date.now() - tStart;
            testCase.status = 'failed';
            testCase.error = err;
            failedTests++;
            tierMetrics[tier].failed++;
            tierMetrics[tier].tests.push({
              name: testCase.name,
              status: 'failed',
              durationMs: testCase.durationMs,
              error: err.message,
            });
            console.log(`    \x1b[31m✖\x1b[0m ${testCase.name} \x1b[90m(${testCase.durationMs}ms)\x1b[0m`);
            console.log(`      \x1b[31mError: ${err.message}\x1b[0m`);
            if (err.stack) {
              const cleanStack = err.stack.split('\n').slice(1, 4).join('\n');
              console.log(`      \x1b[90m${cleanStack}\x1b[0m`);
            }
          }

          // Execute afterEach hooks
          for (const hook of suite.afterEachHooks) {
            try {
              await hook();
            } catch (hookErr: any) {
              console.log(`    \x1b[31m✖ afterEach hook failed: ${hookErr.message}\x1b[0m`);
            }
          }
        }

        // Execute afterAll hooks
        for (const hook of suite.afterAllHooks) {
          try {
            await hook();
          } catch (hookErr: any) {
            console.log(`    \x1b[31m✖ afterAll hook failed: ${hookErr.message}\x1b[0m`);
          }
        }
      }

      tierMetrics[tier].durationMs = Date.now() - tierStart;
      const tm = tierMetrics[tier];
      console.log(
        `  \x1b[90m[Tier ${tier} Summary: ${tm.passed}/${tm.total} Passed | ${tm.failed} Failed | ${tm.durationMs}ms]\x1b[0m\n`
      );
    }

    const totalDuration = Date.now() - startTime;
    const isSuccess = failedTests === 0;

    console.log('\x1b[1m\x1b[36m%s\x1b[0m', '================================================================================');
    console.log('\x1b[1m\x1b[36m%s\x1b[0m', '📊 E2E TEST EXECUTION SUMMARY');
    console.log('\x1b[1m\x1b[36m%s\x1b[0m', '================================================================================');
    console.log(`Total Tiers:     4`);
    console.log(`Total Tests:     ${totalTests}`);
    console.log(`Passed:          \x1b[32m${passedTests}\x1b[0m (${((passedTests / (totalTests || 1)) * 100).toFixed(1)}%)`);
    console.log(`Failed:          ${failedTests > 0 ? `\x1b[31m${failedTests}\x1b[0m` : '0'}`);
    console.log(`Duration:        ${(totalDuration / 1000).toFixed(3)}s`);
    console.log(
      `Status:          ${
        isSuccess
          ? '\x1b[1m\x1b[32mPASSED (Exit Code: 0)\x1b[0m'
          : '\x1b[1m\x1b[31mFAILED (Exit Code: 1)\x1b[0m'
      }`
    );
    console.log('\x1b[1m\x1b[36m%s\x1b[0m', '================================================================================\n');

    // Generate JSON summary
    const summaryData = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      tiers: {
        tier1: tierMetrics[1],
        tier2: tierMetrics[2],
        tier3: tierMetrics[3],
        tier4: tierMetrics[4],
      },
      overall: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        passRate: `${((passedTests / (totalTests || 1)) * 100).toFixed(1)}%`,
        durationMs: totalDuration,
        success: isSuccess,
      },
    };

    try {
      const outputDir = path.resolve(process.cwd(), 'test-results');
      fs.mkdirSync(outputDir, { recursive: true });
      const outputPath = path.join(outputDir, 'e2e-summary.json');
      fs.writeFileSync(outputPath, JSON.stringify(summaryData, null, 2), 'utf-8');
      console.log(`\x1b[32m✔\x1b[0m Test summary written to: ${outputPath}\n`);
    } catch (e: any) {
      console.error(`Failed to write test summary JSON: ${e.message}`);
    }

    return {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      success: isSuccess,
      durationMs: totalDuration,
    };
  }
}

export const harness = new TestHarness();
export const describe = harness.describe.bind(harness);
export const test = harness.test.bind(harness);
export const it = test;
export const beforeAll = harness.beforeAll.bind(harness);
export const afterAll = harness.afterAll.bind(harness);
export const beforeEach = harness.beforeEach.bind(harness);
export const afterEach = harness.afterEach.bind(harness);
