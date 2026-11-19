import fs from 'fs';
import pathLib from 'path';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { sanitizeStorageFileName } from './storage-constants';
import { isServerlessRuntime, getTmpUploadsDir } from '@/lib/utils/storage-path';

export * from './storage-constants';

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SECRET_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

function createServerStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseJsClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mapSupabaseBucketName(bucket: string): string {
  if (bucket === 'staff' || bucket === 'salon_staff') {
    return 'staff_avatars';
  }
  return bucket;
}

function resolveImageMimeType(file: any, filePath: string): string {
  const rawType = typeof file?.type === 'string' ? file.type.toLowerCase().trim() : '';
  if (rawType === 'image/jpeg' || rawType === 'image/png' || rawType === 'image/webp') {
    return rawType;
  }
  const ext = pathLib.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

async function tryUploadToSupabaseStorage(
  bucket: string,
  filePath: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  if (!isSupabaseConfigured() || process.env.NODE_ENV === 'test' || process.env.VITEST) {
    return null;
  }

  try {
    const supabase = createServerStorageClient();
    const targetBucket = mapSupabaseBucketName(bucket);
    let { error } = await supabase.storage.from(targetBucket).upload(filePath, buffer, {
      contentType,
      upsert: true,
    });

    if (
      error &&
      (error.message?.includes('Bucket not found') ||
        String((error as any).statusCode) === '404')
    ) {
      // Attempt automatic public bucket creation when service role permissions exist
      await supabase.storage
        .createBucket(targetBucket, { public: true })
        .catch(() => {});

      const retry = await supabase.storage.from(targetBucket).upload(filePath, buffer, {
        contentType,
        upsert: true,
      });
      error = retry.error;
    }

    if (!error) {
      const { data } = supabase.storage.from(targetBucket).getPublicUrl(filePath);
      if (data?.publicUrl) {
        return data.publicUrl;
      }
    }
  } catch (err: any) {
    console.warn(`[Supabase Storage upload fallback]: ${err?.message || err}`);
  }

  return null;
}

async function tryUploadToVercelBlob(
  bucket: string,
  filePath: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token || process.env.NODE_ENV === 'test' || process.env.VITEST) {
    return null;
  }

  try {
    const res = await fetch(
      `https://blob.vercel-storage.com/${encodeURIComponent(bucket)}/${encodeURIComponent(filePath)}`,
      {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${token}`,
          'x-api-version': '7',
          'x-content-type': contentType,
          'x-add-random-suffix': '0',
        },
        body: new Uint8Array(buffer),
      }
    );

    if (res.ok) {
      const json = await res.json();
      if (typeof json?.url === 'string' && json.url.startsWith('http')) {
        return json.url;
      }
    }
  } catch (err: any) {
    console.warn(`[Vercel Blob upload fallback]: ${err?.message || err}`);
  }

  return null;
}

export async function uploadCmsAsset(
  file: File | Blob | Buffer,
  bucket: string = 'salon_cms',
  fileName?: string
): Promise<{
  success: boolean;
  url: string;
  path: string;
  duration_ms: number;
  storage?: 'local' | 'supabase' | 'vercel_blob' | 'inline_data_url';
}> {
  const startTime = performance.now();
  const sanitizedPath =
    fileName || sanitizeStorageFileName((file as any)?.name || 'upload.webp');
  const contentType = resolveImageMimeType(file, sanitizedPath);

  // Extract buffer from File, Blob, or Buffer
  let buffer: Buffer;
  if (Buffer.isBuffer(file)) {
    buffer = file;
  } else if (typeof (file as any).arrayBuffer === 'function') {
    buffer = Buffer.from(await (file as any).arrayBuffer());
  } else {
    buffer = Buffer.from(file as any);
  }

  const serverless = isServerlessRuntime();

  // PATH A: Local / Self-hosted writable filesystem (ultra-fast ~1ms SSD write)
  if (!serverless) {
    try {
      const localDir = pathLib.join(process.cwd(), 'public', 'uploads', bucket);
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      const localFilePath = pathLib.join(localDir, sanitizedPath);
      await fs.promises.writeFile(localFilePath, buffer);
      const localUrl = `/uploads/${bucket}/${sanitizedPath}`;

      // Non-blocking best-effort cloud sync
      if (isSupabaseConfigured() && process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
        void tryUploadToSupabaseStorage(bucket, sanitizedPath, buffer, contentType);
      }

      const durationMs = parseFloat((performance.now() - startTime).toFixed(2));
      return {
        success: true,
        url: localUrl,
        path: sanitizedPath,
        duration_ms: durationMs,
        storage: 'local',
      };
    } catch (fsErr: any) {
      // Read-only filesystem detected unexpectedly — smoothly fall through to Serverless Cloud/Inline tiers
      console.warn(`[Local upload dir not writable, switching to serverless mode]: ${fsErr?.message}`);
    }
  }

  // PATH B: Vercel / Serverless / Read-Only Filesystem
  // 1. Try Vercel Blob if BLOB_READ_WRITE_TOKEN is configured
  const blobUrl = await tryUploadToVercelBlob(bucket, sanitizedPath, buffer, contentType);
  if (blobUrl) {
    return {
      success: true,
      url: blobUrl,
      path: sanitizedPath,
      duration_ms: parseFloat((performance.now() - startTime).toFixed(2)),
      storage: 'vercel_blob',
    };
  }

  // 2. Try Supabase Storage CDN (permanent HTTPS public URL)
  const supabasePublicUrl = await tryUploadToSupabaseStorage(
    bucket,
    sanitizedPath,
    buffer,
    contentType
  );
  if (supabasePublicUrl) {
    return {
      success: true,
      url: supabasePublicUrl,
      path: sanitizedPath,
      duration_ms: parseFloat((performance.now() - startTime).toFixed(2)),
      storage: 'supabase',
    };
  }

  // 3. Zero-config serverless fallback: mirror to /tmp (best-effort) + return self-contained Data URI
  //    so images NEVER 404 across separate Vercel Lambda containers and NEVER fail with ENOENT/EROFS.
  try {
    const tmpBucketDir = pathLib.join(getTmpUploadsDir(), bucket);
    if (!fs.existsSync(tmpBucketDir)) {
      fs.mkdirSync(tmpBucketDir, { recursive: true });
    }
    await fs.promises.writeFile(pathLib.join(tmpBucketDir, sanitizedPath), buffer);
  } catch {
    // Even if /tmp write fails, Data URI still succeeds cleanly
  }

  const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;

  return {
    success: true,
    url: dataUrl,
    path: sanitizedPath,
    duration_ms: parseFloat((performance.now() - startTime).toFixed(2)),
    storage: 'inline_data_url',
  };
}
