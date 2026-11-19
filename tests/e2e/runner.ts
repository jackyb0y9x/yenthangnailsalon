/**
 * Australian Nail Salon E2E Test Suite Runner
 * 4-Tier Opaque-Box Automated Architecture
 */

import { harness } from './infra/harness.ts';
import { stopEmbeddedServer } from './infra/client.ts';
import { registerTier1Tests } from './tier1_features.test.ts';
import { registerTier2Tests } from './tier2_boundaries.test.ts';
import { registerTier3Tests } from './tier3_cross_feature.test.ts';
import { registerTier4Tests } from './tier4_real_world.test.ts';

async function main() {
  try {
    // Register all 4 tiers
    registerTier1Tests();
    registerTier2Tests();
    registerTier3Tests();
    registerTier4Tests();

    // Execute test harness
    const results = await harness.run();

    // Clean up embedded server if running
    await stopEmbeddedServer();

    // Return exit code
    process.exit(results.success ? 0 : 1);
  } catch (err: any) {
    console.error(`\x1b[31mFatal error during test runner execution:\x1b[0m`, err);
    await stopEmbeddedServer();
    process.exit(1);
  }
}

main();
