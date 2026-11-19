import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getTmpUploadsDir } from '@/lib/utils/storage-path';

export const dynamic = 'force-dynamic';

function findSafeUploadedFile(segments: string[]): string | 'FORBIDDEN' | null {
  const candidateRoots = [
    path.resolve(process.cwd(), 'public', 'uploads'),
    path.resolve(getTmpUploadsDir()),
  ];

  for (const root of candidateRoots) {
    const resolved = path.resolve(root, ...segments);
    if (!resolved.startsWith(root + path.sep) && resolved !== root) {
      return 'FORBIDDEN';
    }
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      return resolved;
    }
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    const safeFilePath = findSafeUploadedFile(segments);

    if (safeFilePath === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!safeFilePath) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const ext = path.extname(safeFilePath).toLowerCase().replace('.', '');
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      gif: 'image/gif',
      avif: 'image/avif',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const fileBuffer = await fs.promises.readFile(safeFilePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
