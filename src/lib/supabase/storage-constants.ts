export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB for CMS & Services
export const MAX_GALLERY_SIZE_BYTES = 8 * 1024 * 1024; // 8MB for Gallery

export function validateImageFile(
  file: { type: string; size: number; name?: string },
  bucket: string = 'salon_cms'
) {
  const maxSize = bucket === 'gallery' ? MAX_GALLERY_SIZE_BYTES : MAX_FILE_SIZE_BYTES;

  if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    throw new Error(
      `Invalid file type '${file.type}'. Allowed formats are JPEG, PNG, and WebP.`
    );
  }

  if (file.size > maxSize) {
    const maxMb = maxSize / (1024 * 1024);
    const actualMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `File size (${actualMb} MB) exceeds maximum allowed limit of ${maxMb} MB for ${bucket}.`
    );
  }

  return true;
}

export function sanitizeStorageFileName(originalName: string): string {
  const parts = originalName.split('.');
  const ext = (parts.pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomSuffix}.${cleanExt}`;
}
