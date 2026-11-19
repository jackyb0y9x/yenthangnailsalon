import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { triggerCmsRevalidation } from '@/lib/cms/revalidate';
import { getPublicAboutStory } from '@/lib/cms/public-data';
import {
  getSupabaseAdminSafe,
  hasSupabaseAdminCredentials,
  buildDbWriteErrorMessage,
  execSupabaseUpdate,
  execSupabaseInsert,
} from '@/lib/supabase/admin';
import {
  saveStoredAboutStory,
  resetStoredAboutStory,
  isSafeStoryImageUrl,
  type AboutStoryConfig,
} from '@/lib/cms/about-story-storage';

const ALLOWED_FIELDS: Array<keyof AboutStoryConfig> = [
  'badge_en',
  'badge_vi',
  'page_title_en',
  'page_title_vi',
  'page_subtitle_en',
  'page_subtitle_vi',
  'story_eyebrow_en',
  'story_eyebrow_vi',
  'story_title_en',
  'story_title_vi',
  'story_p1_en',
  'story_p1_vi',
  'story_p2_en',
  'story_p2_vi',
  'story_p3_en',
  'story_p3_vi',
  'image_url',
  'stat1_value_en',
  'stat1_value_vi',
  'stat1_label_en',
  'stat1_label_vi',
  'stat2_value_en',
  'stat2_value_vi',
  'stat2_label_en',
  'stat2_label_vi',
];

async function syncAboutStoryToSupabase(story: AboutStoryConfig): Promise<string | null> {
  const supabase = await getSupabaseAdminSafe();
  const { data: existing } = await supabase
    .from('nail_cms_sections')
    .select('*')
    .eq('section_key', 'about_story')
    .maybeSingle();

  const payload: Record<string, any> = {
    section_key: 'about_story',
    title_en: story.story_title_en || 'The Glamour Nails Story',
    title_vi: story.story_title_vi || 'Câu Chuyện Glamour Nails',
    subtitle_en: story.page_subtitle_en,
    subtitle_vi: story.page_subtitle_vi,
    image_url: story.image_url,
    metadata: story,
    updated_at: story.updated_at || new Date().toISOString(),
  };

  const dbRes = existing
    ? await execSupabaseUpdate(supabase, 'nail_cms_sections', payload, 'section_key', 'about_story')
    : await execSupabaseInsert(supabase, 'nail_cms_sections', {
        ...payload,
        is_active: true,
        display_order: 2,
      });

  return buildDbWriteErrorMessage(dbRes.error, dbRes.affected, 'nail_cms_sections');
}

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session.isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized: Admin authentication required' },
      { status: 401 }
    );
  }

  try {
    const story = await getPublicAboutStory();
    return NextResponse.json({
      success: true,
      story,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to load About Story' },
      { status: 500 }
    );
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

    if (body?.reset === true) {
      const resetStory = resetStoredAboutStory();
      const dbErrMsg = await syncAboutStoryToSupabase(resetStory);
      if (dbErrMsg) {
        return NextResponse.json(
          { success: false, error: dbErrMsg, requiresServiceRoleKey: !hasSupabaseAdminCredentials() },
          { status: 503 }
        );
      }
      await triggerCmsRevalidation({ path: '/[locale]/about', type: 'page' });
      return NextResponse.json({
        success: true,
        story: resetStory,
        message: 'About story restored to defaults.',
      });
    }

    if (
      body.image_url !== undefined &&
      typeof body.image_url === 'string' &&
      !isSafeStoryImageUrl(body.image_url)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid image URL. Only http(s) URLs or local /uploads paths are allowed.',
        },
        { status: 400 }
      );
    }

    const updates: Partial<AboutStoryConfig> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== 'string') {
          return NextResponse.json(
            { success: false, error: `Invalid value for field "${field}".` },
            { status: 400 }
          );
        }
        const trimmed = body[field].trim();
        const maxLen = field === 'image_url' ? 2_000_000 : 5000;
        if (trimmed.length > maxLen) {
          return NextResponse.json(
            {
              success: false,
              error: `Field "${field}" exceeds maximum length of ${maxLen} characters.`,
            },
            { status: 400 }
          );
        }
        updates[field] = trimmed;
      }
    }

    const saved = saveStoredAboutStory(updates);

    const dbErrMsg = await syncAboutStoryToSupabase(saved);
    if (dbErrMsg) {
      return NextResponse.json(
        { success: false, error: dbErrMsg, requiresServiceRoleKey: !hasSupabaseAdminCredentials() },
        { status: 503 }
      );
    }

    // Instant revalidation for /en/about and /vi/about
    await triggerCmsRevalidation({ path: '/[locale]/about', type: 'page' });

    return NextResponse.json({
      success: true,
      story: saved,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to save About Story' },
      { status: 500 }
    );
  }
}
