import crypto from 'crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { triggerCmsRevalidation } from '@/lib/cms/revalidate';
import { FALLBACK_GALLERY } from '@/lib/cms/public-data';
import {
  getSupabaseAdminSafe,
  hasSupabaseAdminCredentials,
  isTestRuntime,
  buildDbWriteErrorMessage,
  execSupabaseInsert,
} from '@/lib/supabase/admin';
import {
  mergeWithStoredGallery,
  persistNewGalleryItem,
} from '@/lib/gallery/gallery-storage';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session.isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized: Admin authentication required' },
      { status: 401 }
    );
  }

  try {
    let baseItems: any[] = [];
    try {
      const supabase = await getSupabaseAdminSafe();
      const { data } = await supabase
        .from('nail_gallery_items')
        .select('*')
        .order('display_order');
      if (data && data.length > 0) {
        baseItems = data;
      }
    } catch {
      // Offline fallback
    }

    if (baseItems.length === 0) {
      baseItems = [...FALLBACK_GALLERY];
    }

    const normalized = baseItems.map((d: any) => ({
      ...d,
      category: d.category || d.category_tag || 'Ombre',
      category_tag: d.category_tag || d.category || 'Ombre',
      tags: Array.isArray(d.tags) ? d.tags : [],
    }));

    const gallery = mergeWithStoredGallery(normalized);

    return NextResponse.json({
      success: true,
      gallery,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session.isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized: Admin authentication required' },
      { status: 401 }
    );
  }

  if (session.role === 'staff') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (!body.image_url || typeof body.image_url !== 'string' || !body.image_url.trim()) {
      return NextResponse.json(
        { error: 'Gallery item image URL is required.' },
        { status: 400 }
      );
    }

    const chosenCat = body.category || body.category_tag || 'Ombre';
    const generatedId = body.id || (isTestRuntime() ? `gal-${Date.now()}` : crypto.randomUUID());
    const nowIso = new Date().toISOString();
    const newItem = {
      id: generatedId,
      title_en: body.title_en || 'New Nail Look',
      title_vi: body.title_vi !== undefined ? body.title_vi : '',
      category: chosenCat,
      category_tag: chosenCat,
      image_url: body.image_url,
      thumbnail_url: body.thumbnail_url || body.image_url,
      tags: Array.isArray(body.tags) ? body.tags : [],
      is_featured: !!body.is_featured,
      display_order: body.display_order || 0,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const supabase = await getSupabaseAdminSafe();
    const dbPayload = isTestRuntime()
      ? newItem
      : {
          id: newItem.id,
          title_en: newItem.title_en,
          title_vi: newItem.title_vi,
          category_tag: newItem.category_tag,
          image_url: newItem.image_url,
          thumbnail_url: newItem.thumbnail_url,
          tags: newItem.tags,
          is_featured: newItem.is_featured,
          display_order: newItem.display_order,
          updated_at: nowIso,
        };

    const dbRes = await execSupabaseInsert(supabase, 'nail_gallery_items', dbPayload);
    const dbErrMsg = buildDbWriteErrorMessage(dbRes.error, dbRes.affected, 'nail_gallery_items');
    if (dbErrMsg) {
      return NextResponse.json(
        { success: false, error: dbErrMsg, requiresServiceRoleKey: !hasSupabaseAdminCredentials() },
        { status: 503 }
      );
    }

    // Keep local test/offline store synced when not backed by live Supabase admin write
    if (isTestRuntime() || !hasSupabaseAdminCredentials()) {
      persistNewGalleryItem(newItem);
    }

    await triggerCmsRevalidation({ path: '/[locale]/gallery', type: 'page' });
    await triggerCmsRevalidation({ path: '/[locale]', type: 'page' });

    return NextResponse.json(
      {
        success: true,
        item_id: newItem.id,
        item: newItem,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
