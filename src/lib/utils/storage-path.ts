import os from 'os';
import path from 'path';

/**
 * Detects whether the app is executing on a read-only serverless runtime
 * (such as Vercel Functions or AWS Lambda where /var/task is read-only).
 */
export function isServerlessRuntime(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.VERCEL_ENV ||
      process.env.AWS_LAMBDA_FUNCTION_NAME
  );
}

/**
 * Returns a writable directory for JSON persistence.
 * - Local / VPS / Docker: `<project>/.data`
 * - Vercel / AWS Lambda: `<os.tmpdir()>/nail-salon-data` (writable /tmp)
 */
export function getWritableDataDir(): string {
  if (isServerlessRuntime()) {
    return path.join(os.tmpdir(), 'nail-salon-data');
  }
  return path.join(process.cwd(), '.data');
}

/**
 * Returns a writable fallback directory for temporary uploaded assets on serverless runtimes.
 */
export function getTmpUploadsDir(): string {
  return path.join(os.tmpdir(), 'nail-salon-uploads');
}
