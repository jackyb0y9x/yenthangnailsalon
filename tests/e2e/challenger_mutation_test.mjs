/**
 * Challenger Mutation Testing Suite
 * Empirically tests test harness failure catching, timeout handling, and exit code propagation
 */

import { harness, describe, test } from './infra/harness.ts';
import { expect, expectHtml, expectResponse } from './infra/assertions.ts';
import { OpaqueTestClient, stopEmbeddedServer } from './infra/client.ts';
import * as child_process from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

console.log('================================================================================');
console.log('⚔️  RUNNING CHALLENGER MUTATION RESILIENCE TEST');
console.log('================================================================================');

async function runCommand(cmd) {
  return new Promise((resolve) => {
    child_process.exec(cmd, (err, stdout, stderr) => {
      resolve({
        code: err ? (err.code !== undefined ? err.code : 1) : 0,
        stdout: stdout || '',
        stderr: stderr || '',
      });
    });
  });
}

async function runMutationSuites() {
  let mutationsTested = 0;
  let mutationsCaught = 0;

  // --------------------------------------------------------------------------
  // Mutation Test 1: Verify runner exits with code 1 when a test assertion fails
  // --------------------------------------------------------------------------
  console.log('\n[Mutation 1] Testing exit code on intentional assertion failure...');
  mutationsTested++;

  const failingScriptPath = path.resolve('tests/e2e/_failing_test_mutation.mjs');
  const failingScriptContent = `
import { harness, describe, test } from './infra/harness.ts';
import { expect } from './infra/assertions.ts';
import { stopEmbeddedServer } from './infra/client.ts';

describe('Mutated Failing Suite', () => {
  test('Deliberately Failing Test', () => {
    expect(1 + 1).toBe(42);
  });
});

async function main() {
  try {
    const results = await harness.run();
    await stopEmbeddedServer();
    process.exit(results.success ? 0 : 1);
  } catch (e) {
    process.exit(1);
  }
}
main();
`;

  fs.writeFileSync(failingScriptPath, failingScriptContent, 'utf-8');
  try {
    const res = await runCommand(`node "${failingScriptPath}"`);
    console.log(`  Process exited with code: ${res.code}`);
    if (res.code === 1 && res.stdout.includes('FAILED (Exit Code: 1)') && res.stdout.includes('Deliberately Failing Test')) {
      console.log('  ✔ Mutation 1 Caught: Harness caught assertion mismatch and exited with code 1');
      mutationsCaught++;
    } else {
      console.error('  ✖ Mutation 1 Failed to report non-zero exit code or failed status!');
      console.error(res.stdout);
    }
  } finally {
    if (fs.existsSync(failingScriptPath)) fs.unlinkSync(failingScriptPath);
  }

  // --------------------------------------------------------------------------
  // Mutation Test 2: Verify runner catches async timeout
  // --------------------------------------------------------------------------
  console.log('\n[Mutation 2] Testing runner timeout handling...');
  mutationsTested++;

  const timeoutScriptPath = path.resolve('tests/e2e/_timeout_test_mutation.mjs');
  const timeoutScriptContent = `
import { harness, describe, test } from './infra/harness.ts';
import { stopEmbeddedServer } from './infra/client.ts';

describe('Timeout Suite', () => {
  test('Test that never resolves', async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, 50); // 50ms timeout
});

async function main() {
  try {
    const results = await harness.run();
    await stopEmbeddedServer();
    process.exit(results.success ? 0 : 1);
  } catch (e) {
    process.exit(1);
  }
}
main();
`;

  fs.writeFileSync(timeoutScriptPath, timeoutScriptContent, 'utf-8');
  try {
    const res = await runCommand(`node "${timeoutScriptPath}"`);
    console.log(`  Process exited with code: ${res.code}`);
    if (res.code === 1 && res.stdout.includes('timed out after 50ms')) {
      console.log('  ✔ Mutation 2 Caught: Harness caught timeout and marked test failed with code 1');
      mutationsCaught++;
    } else {
      console.error('  ✖ Mutation 2 Failed to catch timeout!');
      console.error(res.stdout);
    }
  } finally {
    if (fs.existsSync(timeoutScriptPath)) fs.unlinkSync(timeoutScriptPath);
  }

  // --------------------------------------------------------------------------
  // Mutation Test 3: Verify runner catches unhandled async exception
  // --------------------------------------------------------------------------
  console.log('\n[Mutation 3] Testing unhandled async exception handling...');
  mutationsTested++;

  const asyncErrorScriptPath = path.resolve('tests/e2e/_async_error_mutation.mjs');
  const asyncErrorScriptContent = `
import { harness, describe, test } from './infra/harness.ts';
import { stopEmbeddedServer } from './infra/client.ts';

describe('Async Error Suite', () => {
  test('Test throwing async exception', async () => {
    await Promise.resolve();
    throw new Error('Database connection reset during query');
  });
});

async function main() {
  try {
    const results = await harness.run();
    await stopEmbeddedServer();
    process.exit(results.success ? 0 : 1);
  } catch (e) {
    process.exit(1);
  }
}
main();
`;

  fs.writeFileSync(asyncErrorScriptPath, asyncErrorScriptContent, 'utf-8');
  try {
    const res = await runCommand(`node "${asyncErrorScriptPath}"`);
    console.log(`  Process exited with code: ${res.code}`);
    if (res.code === 1 && res.stdout.includes('Database connection reset during query')) {
      console.log('  ✔ Mutation 3 Caught: Harness caught async exception and reported failure with code 1');
      mutationsCaught++;
    } else {
      console.error('  ✖ Mutation 3 Failed to catch async exception!');
      console.error(res.stdout);
    }
  } finally {
    if (fs.existsSync(asyncErrorScriptPath)) fs.unlinkSync(asyncErrorScriptPath);
  }

  // --------------------------------------------------------------------------
  // Mutation Test 4: Verify Negative Security Tests Catch False Positives
  // --------------------------------------------------------------------------
  console.log('\n[Mutation 4] Testing security negative assertion sensitivity...');
  mutationsTested++;

  const client = new OpaqueTestClient();
  // Anonymous user should NOT be able to view financial summary
  const anonRes = await client.get('/api/admin/finance/summary');
  const caught401 = anonRes.status === 401;

  // Staff user should NOT be able to delete transactions
  await client.loginAs('staff');
  const staffRes = await client.delete('/api/admin/finance/transactions/tx-001');
  const caught403 = staffRes.status === 403;

  // Negative currency should NOT be accepted
  await client.loginAs('manager');
  const negRes = await client.post('/api/admin/finance/transactions', {
    type: 'revenue',
    category: 'Services',
    amount_cents: -100,
    description: 'Negative test',
  });
  const caughtNegativeRejection = negRes.status === 400;

  // Invalid AU phone should NOT be accepted in inquiry
  const invalidPhoneRes = await client.post('/api/consultation', {
    customer_name: 'Bob',
    phone: '0512 345 678', // Invalid prefix
  });
  const caughtInvalidPhone = invalidPhoneRes.status === 400;

  await stopEmbeddedServer();

  if (caught401 && caught403 && caughtNegativeRejection && caughtInvalidPhone) {
    console.log('  ✔ Mutation 4 Caught: Negative security and boundary gates strictly enforced (401, 403, 400)');
    mutationsCaught++;
  } else {
    console.error(`  ✖ Mutation 4 Failed: 401=${caught401}, 403=${caught403}, neg=${caughtNegativeRejection}, phone=${caughtInvalidPhone}`);
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log(`🛡️  MUTATION RESILIENCE RESULTS: ${mutationsCaught}/${mutationsTested} MUTATIONS CAUGHT`);
  console.log('================================================================================\n');

  if (mutationsCaught !== mutationsTested) {
    process.exit(1);
  }
}

runMutationSuites();
