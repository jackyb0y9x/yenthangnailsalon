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
      .from('nail_cms_sections')
      .select('*')
      .eq('section_key', 'hero')
      .maybeSingle();

    return NextResponse.json({
      success: true,
      hero: data || {
        headline_en: 'Luxury Australian Nail Care',
        headline_vi: 'Chăm Sóc Móng Cao Cấp Tại Sydney',
        subheadline_en: 'Bespoke nail artistry, SNS dipping, and medical-grade hygiene in Sydney.',
        subheadline_vi: 'Nghệ thuật làm móng tinh tế, nhúng bột SNS và chuẩn vệ sinh cao cấp tại Sydney.',
        cta_text_en: 'Book Consultation',
        cta_text_vi: 'Đặt Lịch Tư Vấn',
        cta_link: '/contact',
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

    const title_en = body.headline_en ?? body.title_en;
    const title_vi = body.headline_vi ?? body.title_vi;
    const subtitle_en = body.subheadline_en ?? body.subtitle_en;
    const subtitle_vi = body.subheadline_vi ?? body.subtitle_vi;
    const cta_text_en = body.cta_text_en;
    const cta_text_vi = body.cta_text_vi;
    const cta_link = body.cta_link;
    const image_url = body.image_url;

    const supabase = await getSupabaseSafe();
    const { data: existing } = await supabase
      .from('nail_cms_sections')
      .select('*')
      .eq('section_key', 'hero')
      .maybeSingle();

    const updatePayload: Record<string, any> = {
      section_key: 'hero',
      updated_at: new Date().toISOString(),
    };

    if (title_en !== undefined) updatePayload.title_en = title_en;
    if (title_vi !== undefined) updatePayload.title_vi = title_vi;
    if (subtitle_en !== undefined) updatePayload.subtitle_en = subtitle_en;
    if (subtitle_vi !== undefined) updatePayload.subtitle_vi = subtitle_vi;
    if (cta_text_en !== undefined) updatePayload.cta_text_en = cta_text_en;
    if (cta_text_vi !== undefined) updatePayload.cta_text_vi = cta_text_vi;
    if (cta_link !== undefined) updatePayload.cta_link = cta_link;
    if (image_url !== undefined) updatePayload.image_url = image_url;

    if (existing) {
      await supabase.from('nail_cms_sections').update(updatePayload).eq('section_key', 'hero');
    } else {
      await supabase.from('nail_cms_sections').insert({
        ...updatePayload,
        is_active: true,
        display_order: 1,
      });
    }

    // Trigger instant cache revalidation
    await triggerCmsRevalidation();

    const resultHero = {
      headline_en: title_en ?? existing?.title_en ?? 'Luxury Australian Nail Care',
      headline_vi: title_vi ?? existing?.title_vi ?? '',
      subheadline_en: subtitle_en ?? existing?.subtitle_en ?? '',
      subheadline_vi: subtitle_vi ?? existing?.subtitle_vi ?? '',
      cta_text_en: cta_text_en ?? existing?.cta_text_en ?? 'Book Consultation',
      cta_text_vi: cta_text_vi ?? existing?.cta_text_vi ?? 'Đặt Lịch Tư Vấn',
      cta_link: cta_link ?? existing?.cta_link ?? '/contact',
      image_url: image_url ?? existing?.image_url,
    };

    return NextResponse.json({ success: true, hero: resultHero });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
