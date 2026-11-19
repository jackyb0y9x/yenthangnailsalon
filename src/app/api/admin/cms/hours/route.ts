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
    const { data } = await supabase.from('nail_business_info').select('*').limit(1).maybeSingle();

    const holidayData = data?.holiday_closures || data?.opening_hours?.holiday_closures || {};
    return NextResponse.json({
      success: true,
      hours: {
        opening_hours: data?.opening_hours,
        holiday_notice_active: Boolean(
          data?.holiday_notice_active ?? holidayData.active ?? holidayData.holiday_notice_active ?? false
        ),
        holiday_notice_en:
          data?.holiday_notice_en || holidayData.notice_en || holidayData.holiday_notice_en || '',
        holiday_notice_vi:
          data?.holiday_notice_vi || holidayData.notice_vi || holidayData.holiday_notice_vi || '',
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

    const supabase = await getSupabaseAdminSafe();
    const { data: existing } = await supabase.from('nail_business_info').select('*').limit(1).maybeSingle();

    const currentOpeningHours = existing?.opening_hours || {};
    const newOpeningHours = body.opening_hours ? { ...currentOpeningHours, ...body.opening_hours } : currentOpeningHours;

    const holiday_notice_active =
      body.holiday_notice_active !== undefined ? Boolean(body.holiday_notice_active) : undefined;
    const holiday_notice_en = body.holiday_notice_en;
    const holiday_notice_vi = body.holiday_notice_vi;

    // Persist holiday closure in opening_hours.holiday_closures as well for compatibility
    if (holiday_notice_active !== undefined || holiday_notice_en !== undefined || holiday_notice_vi !== undefined) {
      newOpeningHours.holiday_closures = {
        active: holiday_notice_active ?? currentOpeningHours.holiday_closures?.active ?? false,
        notice_en: holiday_notice_en ?? currentOpeningHours.holiday_closures?.notice_en ?? '',
        notice_vi: holiday_notice_vi ?? currentOpeningHours.holiday_closures?.notice_vi ?? '',
      };
    }

    const updatePayload: Record<string, any> = {
      opening_hours: newOpeningHours,
      updated_at: new Date().toISOString(),
    };

    if (holiday_notice_active !== undefined) updatePayload.holiday_notice_active = holiday_notice_active;
    if (holiday_notice_en !== undefined) updatePayload.holiday_notice_en = holiday_notice_en;
    if (holiday_notice_vi !== undefined) updatePayload.holiday_notice_vi = holiday_notice_vi;

    const dbRes = existing
      ? await execSupabaseUpdate(supabase, 'nail_business_info', updatePayload, 'id', existing.id)
      : await execSupabaseInsert(supabase, 'nail_business_info', updatePayload);

    const dbErrMsg = buildDbWriteErrorMessage(dbRes.error, dbRes.affected, 'nail_business_info');
    if (dbErrMsg) {
      return NextResponse.json(
        { success: false, error: dbErrMsg, requiresServiceRoleKey: !hasSupabaseAdminCredentials() },
        { status: 503 }
      );
    }

    await triggerCmsRevalidation();

    const resultHours = {
      opening_hours: newOpeningHours,
      holiday_notice_active: holiday_notice_active ?? existing?.holiday_notice_active ?? false,
      holiday_notice_en: holiday_notice_en ?? existing?.holiday_notice_en ?? '',
      holiday_notice_vi: holiday_notice_vi ?? existing?.holiday_notice_vi ?? '',
    };

    return NextResponse.json({ success: true, hours: resultHours });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
