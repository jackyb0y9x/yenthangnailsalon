import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { triggerCmsRevalidation } from '@/lib/cms/revalidate';
import {
  getSupabaseAdminSafe,
  hasSupabaseAdminCredentials,
  isTestRuntime,
  buildDbWriteErrorMessage,
  execSupabaseUpdate,
} from '@/lib/supabase/admin';

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
    const { id: serviceId } = await params;
    const body = await request.json();

    const supabase = await getSupabaseAdminSafe();
    const { data: existing } = await supabase
      .from('nail_services')
      .select('*')
      .eq('id', serviceId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.price_cents !== undefined) {
      if (body.price_cents < 0) {
        return NextResponse.json({ error: 'Service price must be non-negative.' }, { status: 400 });
      }
      updates.price_cents = body.price_cents;
      updates.price_aud = Number((body.price_cents / 100).toFixed(2));
    } else if (body.price_aud !== undefined) {
      if (body.price_aud < 0) {
        return NextResponse.json({ error: 'Service price must be non-negative.' }, { status: 400 });
      }
      updates.price_aud = body.price_aud;
      updates.price_cents = Math.round(body.price_aud * 100);
    }

    if (body.name_en !== undefined) updates.name_en = body.name_en;
    if (body.name_vi !== undefined) updates.name_vi = body.name_vi;
    if (body.description_en !== undefined) updates.description_en = body.description_en;
    if (body.description_vi !== undefined) updates.description_vi = body.description_vi;
    if (body.category !== undefined) updates.category = body.category;
    if (body.duration_minutes !== undefined) updates.duration_minutes = body.duration_minutes;
    if (body.image_url !== undefined) updates.image_url = body.image_url;
    if (body.is_featured !== undefined) updates.is_featured = Boolean(body.is_featured);
    if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);
    if (body.display_order !== undefined) updates.display_order = body.display_order;

    const { price_cents: _omitCents, ...dbUpdates } = updates;
    const dbRes = await execSupabaseUpdate(
      supabase,
      'nail_services',
      isTestRuntime() ? updates : dbUpdates,
      'id',
      serviceId
    );
    const dbErrMsg = buildDbWriteErrorMessage(dbRes.error, dbRes.affected, 'nail_services');
    if (dbErrMsg) {
      return NextResponse.json(
        { success: false, error: dbErrMsg, requiresServiceRoleKey: !hasSupabaseAdminCredentials() },
        { status: 503 }
      );
    }

    await triggerCmsRevalidation({ path: '/[locale]/services', type: 'page' });

    return NextResponse.json({
      success: true,
      service: { ...existing, ...updates },
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
    const { id: serviceId } = await params;
    const supabase = await getSupabaseAdminSafe();

    const { data: existing } = await supabase
      .from('nail_services')
      .select('*')
      .eq('id', serviceId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Soft deletion: toggle is_active = false
    const dbRes = await execSupabaseUpdate(
      supabase,
      'nail_services',
      { is_active: false, updated_at: new Date().toISOString() },
      'id',
      serviceId
    );
    const dbErrMsg = buildDbWriteErrorMessage(dbRes.error, dbRes.affected, 'nail_services');
    if (dbErrMsg) {
      return NextResponse.json(
        { success: false, error: dbErrMsg, requiresServiceRoleKey: !hasSupabaseAdminCredentials() },
        { status: 503 }
      );
    }

    await triggerCmsRevalidation({ path: '/[locale]/services', type: 'page' });

    return NextResponse.json({ success: true, message: 'Service soft-deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
