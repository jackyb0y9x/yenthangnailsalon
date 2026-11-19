import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { triggerCmsRevalidation } from '@/lib/cms/revalidate';
import { getSupabaseSafe, FALLBACK_GALLERY } from '@/lib/cms/public-data';
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
      const supabase = await getSupabaseSafe();
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
    if (body.image_url !== undefined) updates.image_url = body.image_url;
    if (body.thumbnail_url !== undefined) updates.thumbnail_url = body.thumbnail_url;
    if (body.tags !== undefined) updates.tags = Array.isArray(body.tags) ? body.tags : [];
    if (body.is_featured !== undefined) updates.is_featured = Boolean(body.is_featured);
    if (body.display_order !== undefined) updates.display_order = body.display_order;

    const merged = { ...existing, ...updates };

    // 1. Persist to local JSON storage
    persistUpdatedGalleryItem(itemId, merged);

    // 2. Background update to Supabase
    (async () => {
      try {
        const supabase = await getSupabaseSafe();
        await supabase.from('nail_gallery_items').update(updates).eq('id', itemId);
      } catch {}
    })();

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

    let existing: any = null;
    try {
      const supabase = await getSupabaseSafe();
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

    // 1. Persist deletion locally
    persistDeletedGalleryItem(itemId);

    // 2. Background delete in Supabase
    (async () => {
      try {
        const supabase = await getSupabaseSafe();
        await supabase.from('nail_gallery_items').delete().eq('id', itemId);
      } catch {}
    })();

    await triggerCmsRevalidation({ path: '/[locale]/gallery', type: 'page' });
    await triggerCmsRevalidation({ path: '/[locale]', type: 'page' });

    return NextResponse.json({ success: true, message: 'Gallery item deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
