import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { triggerCmsRevalidation } from '@/lib/cms/revalidate';
import { getSupabaseSafe, FALLBACK_GALLERY } from '@/lib/cms/public-data';
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
      const supabase = await getSupabaseSafe();
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
    const newItem = {
      id: body.id || `gal-${Date.now()}`,
      title_en: body.title_en || 'New Nail Look',
      title_vi: body.title_vi !== undefined ? body.title_vi : '',
      category: chosenCat,
      category_tag: chosenCat,
      image_url: body.image_url,
      thumbnail_url: body.thumbnail_url || body.image_url,
      tags: Array.isArray(body.tags) ? body.tags : [],
      is_featured: !!body.is_featured,
      display_order: body.display_order || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Persist to local JSON storage immediately
    persistNewGalleryItem(newItem);

    // 2. Background sync to Supabase without blocking or failing on remote RLS
    (async () => {
      try {
        const supabase = await getSupabaseSafe();
        await supabase.from('nail_gallery_items').insert(newItem);
      } catch {
        // Fallback safely preserved in local store
      }
    })();

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
