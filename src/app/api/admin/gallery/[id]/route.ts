import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { triggerCmsRevalidation } from '@/lib/cms/revalidate';
import { FALLBACK_GALLERY } from '@/lib/cms/public-data';
import {
  getSupabaseAdminSafe,
  hasSupabaseAdminCredentials,
  isLiveSupabaseConfigured,
  isTestRuntime,
  buildDbWriteErrorMessage,
  execSupabaseUpdate,
} from '@/lib/supabase/admin';
import {
  getStoredGalleryData,
  persistUpdatedGalleryItem,
  persistDeletedGalleryItem,
} from '@/lib/gallery/gallery-storage';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: itemId } = await params;
    const body = await request.json();

    let existing: any = null;
    try {
      const supabase = await getSupabaseAdminSafe();
      const { data } = await supabase
        .from('nail_gallery_items')
        .select('*')
        .eq('id', itemId)
        .maybeSingle();
      if (data) existing = data;
    } catch {}

    if (!existing) {
      const stored = getStoredGalleryData();
      existing =
        stored.created.find((c) => c.id === itemId) ||
        stored.overrides[itemId] ||
        FALLBACK_GALLERY.find((f) => f.id === itemId);
    }

    if (!existing) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title_en !== undefined) updates.title_en = body.title_en;
    if (body.title_vi !== undefined) updates.title_vi = body.title_vi;
    if (body.category !== undefined) {
      updates.category = body.category;
      updates.category_tag = body.category;
    }
    if (body.category_tag !== undefined) {
      updates.category_tag = body.category_tag;
      updates.category = body.category_tag;
    }
    if (body.image_url !== undefined) {
      updates.image_url = body.image_url;
      // Always keep thumbnail_url synchronized when replacing image_url unless explicitly provided
      if (body.thumbnail_url === undefined) {
        updates.thumbnail_url = body.image_url;
      }
    }
    if (body.thumbnail_url !== undefined) updates.thumbnail_url = body.thumbnail_url;
    if (body.tags !== undefined) updates.tags = Array.isArray(body.tags) ? body.tags : [];
    if (body.is_featured !== undefined) updates.is_featured = Boolean(body.is_featured);
    if (body.display_order !== undefined) updates.display_order = body.display_order;

    const merged = { ...existing, ...updates };

    const supabase = await getSupabaseAdminSafe();
    const { category: _omitCat, ...dbUpdates } = updates;
    const dbRes = await execSupabaseUpdate(
      supabase,
      'nail_gallery_items',
      isTestRuntime() ? updates : dbUpdates,
      'id',
      itemId
    );
    const dbErrMsg = buildDbWriteErrorMessage(dbRes.error, dbRes.affected, 'nail_gallery_items');
    if (dbErrMsg) {
      return NextResponse.json(
        { success: false, error: dbErrMsg, requiresServiceRoleKey: !hasSupabaseAdminCredentials() },
        { status: 503 }
      );
    }

    if (isTestRuntime() || !isLiveSupabaseConfigured()) {
      persistUpdatedGalleryItem(itemId, merged);
    }

    await triggerCmsRevalidation({ path: '/[locale]/gallery', type: 'page' });
    await triggerCmsRevalidation({ path: '/[locale]', type: 'page' });

    return NextResponse.json({
      success: true,
      item: merged,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: itemId } = await params;

    const supabase = await getSupabaseAdminSafe();
    let existing: any = null;
    try {
      const { data } = await supabase
        .from('nail_gallery_items')
        .select('*')
        .eq('id', itemId)
        .maybeSingle();
      if (data) existing = data;
    } catch {}

    if (!existing) {
      const stored = getStoredGalleryData();
      existing =
        stored.created.find((c) => c.id === itemId) ||
        stored.overrides[itemId] ||
        FALLBACK_GALLERY.find((f) => f.id === itemId);
    }

    if (!existing) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
    }

    const delQuery = supabase.from('nail_gallery_items').delete().eq('id', itemId);
    const delRes = typeof delQuery?.select === 'function' ? await delQuery.select() : await delQuery;
    const delAffected = Array.isArray(delRes?.data)
      ? delRes.data.length
      : Number(delRes?.count || (delRes?.error ? 0 : 1));
    const dbErrMsg = buildDbWriteErrorMessage(delRes?.error, delAffected, 'nail_gallery_items');
    if (dbErrMsg) {
      return NextResponse.json(
        { success: false, error: dbErrMsg, requiresServiceRoleKey: !hasSupabaseAdminCredentials() },
        { status: 503 }
      );
    }

    if (isTestRuntime() || !isLiveSupabaseConfigured()) {
      persistDeletedGalleryItem(itemId);
    }

    await triggerCmsRevalidation({ path: '/[locale]/gallery', type: 'page' });
    await triggerCmsRevalidation({ path: '/[locale]', type: 'page' });

    return NextResponse.json({ success: true, message: 'Gallery item deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
