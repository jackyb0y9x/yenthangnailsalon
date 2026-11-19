import { describe, it, expect, afterEach } from 'vitest';
import os from 'os';
import path from 'path';
import { NextRequest } from 'next/server';
import { POST as postUpload } from '@/app/api/admin/upload/route';
import { uploadCmsAsset } from '@/lib/supabase/storage';
import {
  isServerlessRuntime,
  getWritableDataDir,
} from '@/lib/utils/storage-path';
import { isSafeStoryImageUrl } from '@/lib/cms/about-story-storage';

describe('Vercel Serverless Upload & Read-Only Filesystem Resilience', () => {
  const originalVercel = process.env.VERCEL;
  const originalVercelEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;

    if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercelEnv;
  });

  it('switches writable data directory to os.tmpdir() on Vercel and uses .data locally', () => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    expect(isServerlessRuntime()).toBe(false);
    expect(getWritableDataDir()).toBe(path.join(process.cwd(), '.data'));

    process.env.VERCEL = '1';
    expect(isServerlessRuntime()).toBe(true);
    expect(getWritableDataDir()).toBe(path.join(os.tmpdir(), 'nail-salon-data'));
  });

  it('uploads gallery image cleanly on Vercel (VERCEL=1) without touching read-only /var/task/public/uploads', async () => {
    process.env.VERCEL = '1';

    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const file = new File([bytes], 'nail-art-sample.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'gallery');

    const req = new NextRequest('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      headers: {
        cookie:
          'sb-authenticated=true; sb-role=super_admin; sb-email=superadmin; sb-id=stf-superadmin',
      },
      body: formData,
    });

    const res = await postUpload(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.storage).toBe('inline_data_url');
    expect(data.url).toMatch(/^data:image\/jpeg;base64,/);
  });

  it('preserves PNG/WebP MIME types accurately in uploadCmsAsset serverless fallback', async () => {
    process.env.VERCEL = '1';

    const webpBuf = Buffer.from('RIFF....WEBP');
    const result = await uploadCmsAsset(webpBuf, 'salon_cms', '123456-abc.webp');

    expect(result.success).toBe(true);
    expect(result.url).toMatch(/^data:image\/webp;base64,/);
    expect(result.storage).toBe('inline_data_url');
  });

  it('accepts safe base64 raster data URIs in isSafeStoryImageUrl while blocking SVG/HTML XSS', () => {
    expect(isSafeStoryImageUrl('data:image/webp;base64,UklGRh4AAABXRUJQ')).toBe(true);
    expect(isSafeStoryImageUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe(true);
    expect(isSafeStoryImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isSafeStoryImageUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(isSafeStoryImageUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeStoryImageUrl('javascript:alert(1)')).toBe(false);
  });
});
