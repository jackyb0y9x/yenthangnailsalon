import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { validateImageFile, uploadCmsAsset, sanitizeStorageFileName } from '@/lib/supabase/storage';

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session.isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucket = (formData.get('bucket') as string) || 'salon_cms';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided in upload request.' },
        { status: 400 }
      );
    }

    const allowedBuckets = ['salon_cms', 'gallery', 'services', 'staff', 'salon_staff', 'receipts'];
    if (!allowedBuckets.includes(bucket)) {
      return NextResponse.json(
        { success: false, error: `Invalid storage bucket '${bucket}'. Allowed buckets: ${allowedBuckets.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate MIME type and file size
    try {
      validateImageFile({ type: file.type, size: file.size, name: file.name }, bucket);
    } catch (valErr: any) {
      return NextResponse.json(
        { success: false, error: valErr.message },
        { status: 400 }
      );
    }

    const sanitizedPath = sanitizeStorageFileName(file.name || 'image.webp');
    const uploadResult = await uploadCmsAsset(file, bucket, sanitizedPath);

    return NextResponse.json(uploadResult, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'File upload failed.' },
      { status: 500 }
    );
  }
}
