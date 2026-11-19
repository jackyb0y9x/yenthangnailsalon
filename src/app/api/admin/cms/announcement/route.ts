import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { triggerCmsRevalidation } from '@/lib/cms/revalidate';
import {
  getSupabaseAdminSafe,
  hasSupabaseAdminCredentials,
  buildDbWriteErrorMessage,
  execSupabaseUpdate,
  execSupabaseInsert,
} from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session.isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized: Admin authentication required' },
      { status: 401 }
    );
  }

  try {
    const supabase = await getSupabaseAdminSafe();
    const { data } = await supabase.from('nail_announcements').select('*').limit(1).maybeSingle();

    return NextResponse.json({
      success: true,
      announcement: data
        ? {
            is_active: Boolean(data.is_active),
            badge_text: data.badge_text_en || data.badge_text || 'PROMO',
            message_en: data.content_en || data.message_en || data.title_en || '',
            message_vi: data.content_vi || data.message_vi || data.title_vi || '',
            link_url: data.link_url || '/services',
          }
        : {
            is_active: true,
            badge_text: 'PROMO',
            message_en: 'Spring Promotion: 10% off SNS Full Sets this month!',
            message_vi: 'Ưu đãi mùa xuân: Giảm 10% cho trọn bộ móng nhúng SNS tháng này!',
            link_url: '/services',
          },
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

    const is_active = body.is_active !== undefined ? Boolean(body.is_active) : undefined;
    const message_en = body.message_en ?? body.content_en ?? body.title_en;
    const message_vi = body.message_vi ?? body.content_vi ?? body.title_vi;
    const badge_text = body.badge_text ?? body.badge_text_en;
    const link_url = body.link_url;

    const supabase = await getSupabaseAdminSafe();
    const { data: existing } = await supabase.from('nail_announcements').select('*').limit(1).maybeSingle();

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (is_active !== undefined) updatePayload.is_active = is_active;
    if (message_en !== undefined) {
      updatePayload.content_en = message_en;
      updatePayload.title_en = message_en;
    }
    if (message_vi !== undefined) {
      updatePayload.content_vi = message_vi;
      updatePayload.title_vi = message_vi;
    }
    if (badge_text !== undefined) {
      updatePayload.badge_text_en = badge_text;
      updatePayload.badge_text_vi = badge_text;
    }
    if (link_url !== undefined) {
      updatePayload.link_url = link_url;
    }

    const dbRes = existing
      ? await execSupabaseUpdate(supabase, 'nail_announcements', updatePayload, 'id', existing.id)
      : await execSupabaseInsert(supabase, 'nail_announcements', {
          ...updatePayload,
          title_en: message_en ?? 'Special Offer',
          title_vi: message_vi ?? 'Ưu Đãi Đặc Biệt',
          content_en: message_en ?? '',
          content_vi: message_vi ?? '',
          is_active: is_active ?? true,
          priority: 1,
        });

    const dbErrMsg = buildDbWriteErrorMessage(dbRes.error, dbRes.affected, 'nail_announcements');
    if (dbErrMsg) {
      return NextResponse.json(
        { success: false, error: dbErrMsg, requiresServiceRoleKey: !hasSupabaseAdminCredentials() },
        { status: 503 }
      );
    }

    await triggerCmsRevalidation();

    const resultAnnouncement = {
      is_active: is_active ?? existing?.is_active ?? true,
      badge_text: badge_text ?? existing?.badge_text_en ?? 'PROMO',
      message_en: message_en ?? existing?.content_en ?? existing?.title_en ?? '',
      message_vi: message_vi ?? existing?.content_vi ?? existing?.title_vi ?? '',
      link_url: link_url ?? existing?.link_url ?? '/services',
    };

    return NextResponse.json({ success: true, announcement: resultAnnouncement });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
