import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    const uploadsRoot = path.resolve(process.cwd(), 'public', 'uploads');
    const safeFilePath = path.resolve(uploadsRoot, ...segments);

    // Path traversal defense
    if (!safeFilePath.startsWith(uploadsRoot)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!fs.existsSync(safeFilePath) || !fs.statSync(safeFilePath).isFile()) {
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
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
