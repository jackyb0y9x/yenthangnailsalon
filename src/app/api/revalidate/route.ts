import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

const DEFAULT_SECRET = process.env.REVALIDATION_SECRET || 'glamour-revalidate-secret-2026';

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const { searchParams } = new URL(request.url);
    const secret =
      body?.secret ||
      searchParams.get('secret') ||
      request.headers.get('x-revalidate-secret');

    if (!secret || secret !== DEFAULT_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing revalidation secret token' },
        { status: 401 }
      );
    }

    const path = body?.path || searchParams.get('path');
    const tag = body?.tag || searchParams.get('tag');
    const type = (body?.type || searchParams.get('type') || 'layout') as 'page' | 'layout';

    if (!path && !tag) {
      return NextResponse.json(
        { success: false, error: 'Path or tag parameter is required for revalidation' },
        { status: 400 }
      );
    }

    if (path) {
      revalidatePath(path, type);
    }

    if (tag) {
      revalidateTag(tag);
    }

    return NextResponse.json(
      {
        success: true,
        revalidated: true,
        path: path || null,
        tag: tag || null,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Revalidation failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret') || request.headers.get('x-revalidate-secret');

  if (!secret || secret !== DEFAULT_SECRET) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing revalidation secret token' },
      { status: 401 }
    );
  }

  const path = searchParams.get('path');
  const tag = searchParams.get('tag');
  const type = (searchParams.get('type') || 'layout') as 'page' | 'layout';

  if (!path && !tag) {
    return NextResponse.json(
      { success: false, error: 'Path or tag parameter is required for revalidation' },
      { status: 400 }
    );
  }

  if (path) {
    revalidatePath(path, type);
  }

  if (tag) {
    revalidateTag(tag);
  }

  return NextResponse.json(
    {
      success: true,
      revalidated: true,
      path: path || null,
      tag: tag || null,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
