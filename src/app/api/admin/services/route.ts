import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { triggerCmsRevalidation } from '@/lib/cms/revalidate';
import { getSupabaseSafe } from '@/lib/cms/public-data';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session.isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized: Admin authentication required' },
      { status: 401 }
    );
  }

  try {
    const supabase = await getSupabaseSafe();
    const { data } = await supabase
      .from('nail_services')
      .select('*')
      .order('display_order');

    return NextResponse.json({
      success: true,
      services: data || [],
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

    if (body.price_cents < 0 || (body.price_aud !== undefined && body.price_aud < 0)) {
      return NextResponse.json(
        { error: 'Service price must be non-negative.' },
        { status: 400 }
      );
    }

    if (body.price_aud > 999999.99 || body.price_cents > 99999999) {
      return NextResponse.json(
        { error: 'Service price exceeds maximum allowed limit.' },
        { status: 400 }
      );
    }

    if (body.duration_minutes !== undefined && body.duration_minutes <= 0) {
      return NextResponse.json(
        { error: 'Duration minutes must be greater than zero.' },
        { status: 400 }
      );
    }

    if (body.name_en !== undefined && !body.name_en.trim()) {
      return NextResponse.json(
        { error: 'Service name (English) is required.' },
        { status: 400 }
      );
    }

    const price_cents = body.price_cents ?? Math.round((body.price_aud || 0) * 100);
    const price_aud = Number((price_cents / 100).toFixed(2));

    const newService = {
      id: body.id || `srv-${Date.now()}`,
      category: body.category || 'Gel Art',
      name_en: body.name_en || 'New Service',
      name_vi: body.name_vi || '',
      description_en: body.description_en || '',
      description_vi: body.description_vi || '',
      price_cents,
      price_aud,
      duration_minutes: body.duration_minutes || 45,
      image_url: body.image_url || '',
      is_featured: !!body.is_featured,
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
      display_order: body.display_order || 0,
      updated_at: new Date().toISOString(),
    };

    const supabase = await getSupabaseSafe();
    await supabase.from('nail_services').insert(newService);

    await triggerCmsRevalidation({ path: '/[locale]/services', type: 'page' });

    return NextResponse.json(
      {
        success: true,
        service_id: newService.id,
        service: newService,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
