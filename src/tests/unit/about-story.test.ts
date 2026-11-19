import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  DEFAULT_ABOUT_STORY,
  getStoredAboutStory,
  saveStoredAboutStory,
  resetStoredAboutStory,
  isSafeStoryImageUrl,
} from '@/lib/cms/about-story-storage';
import { getPublicAboutStory } from '@/lib/cms/public-data';
import { GET, POST } from '@/app/api/admin/cms/about-story/route';

function createAdminRequest(
  method: 'GET' | 'POST',
  role: 'super_admin' | 'manager' | 'staff' | null,
  body?: Record<string, any>
): NextRequest {
  const headers: Record<string, string> = {};
  if (body) {
    headers['Content-Type'] = 'application/json';
  }
  if (role) {
    headers['cookie'] = `sb-authenticated=true; sb-role=${role}; sb-email=${role}@glamournails.com.au; sb-id=stf-test`;
  }
  return new NextRequest('http://localhost:3000/api/admin/cms/about-story', {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('About Story (/about) CMS Storage & API', () => {
  beforeEach(() => {
    (globalThis as any).__mockAboutStoryConfig = null;
  });

  it('provides complete bilingual default story values', () => {
    expect(DEFAULT_ABOUT_STORY.page_title_vi).toContain('Câu Chuyện');
    expect(DEFAULT_ABOUT_STORY.page_title_en).toContain('Story');
    expect(DEFAULT_ABOUT_STORY.story_p1_vi.length).toBeGreaterThan(20);
    expect(DEFAULT_ABOUT_STORY.story_p1_en.length).toBeGreaterThan(20);
    expect(DEFAULT_ABOUT_STORY.image_url).toMatch(/^https:\/\//);
  });

  it('validates safe image URLs and rejects javascript/data injection', () => {
    expect(isSafeStoryImageUrl('')).toBe(true);
    expect(isSafeStoryImageUrl('/uploads/salon_cms/story.webp')).toBe(true);
    expect(isSafeStoryImageUrl('https://images.unsplash.com/photo-123.jpg')).toBe(true);
    expect(isSafeStoryImageUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeStoryImageUrl('//evil.com/x.png')).toBe(false);
    expect(isSafeStoryImageUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('persists partial updates and reflects them in getPublicAboutStory()', async () => {
    saveStoredAboutStory({
      page_title_vi: 'Hành Trình Glamour Nails 2026',
      story_title_vi: '10 Năm Kiến Tạo Vẻ Đẹp Đôi Tay',
      story_p3_vi: 'Mỗi bộ móng là một tác phẩm nghệ thuật được chế tác tỉ mỉ.',
      stat1_value_vi: '10+ Năm',
    });

    const stored = getStoredAboutStory();
    expect(stored?.page_title_vi).toBe('Hành Trình Glamour Nails 2026');
    expect(stored?.story_p2_vi).toBe(DEFAULT_ABOUT_STORY.story_p2_vi);

    const publicStory = await getPublicAboutStory();
    expect(publicStory.page_title_vi).toBe('Hành Trình Glamour Nails 2026');
    expect(publicStory.story_title_vi).toBe('10 Năm Kiến Tạo Vẻ Đẹp Đôi Tay');
    expect(publicStory.story_p3_vi).toContain('tác phẩm nghệ thuật');
    expect(publicStory.stat1_value_vi).toBe('10+ Năm');
  });

  it('rejects anonymous GET and POST requests with HTTP 401', async () => {
    const getRes = await GET(createAdminRequest('GET', null));
    expect(getRes.status).toBe(401);

    const postRes = await POST(
      createAdminRequest('POST', null, { page_title_vi: 'Unauthorized Edit' })
    );
    expect(postRes.status).toBe(401);
  });

  it('enforces RBAC: denies staff POST with HTTP 403 while allowing authenticated GET', async () => {
    const getRes = await GET(createAdminRequest('GET', 'staff'));
    expect(getRes.status).toBe(200);

    const postRes = await POST(
      createAdminRequest('POST', 'staff', { page_title_vi: 'Staff Attempt' })
    );
    expect(postRes.status).toBe(403);
  });

  it('allows manager and super_admin to update About Story via POST and returns updated data on GET', async () => {
    const postRes = await POST(
      createAdminRequest('POST', 'manager', {
        badge_vi: 'Giá Trị Độc Bản',
        page_title_vi: 'Câu Chuyện Mới Của Salon',
        story_title_en: 'Crafted With Heart in Sydney',
        story_p1_vi: 'Đoạn giới thiệu mới nhất năm 2026.',
        image_url: '/uploads/salon_cms/custom-story.jpg',
        stat2_value_vi: '20.000+',
      })
    );

    expect(postRes.status).toBe(200);
    const postJson = await postRes.json();
    expect(postJson.success).toBe(true);
    expect(postJson.story.page_title_vi).toBe('Câu Chuyện Mới Của Salon');
    expect(postJson.story.image_url).toBe('/uploads/salon_cms/custom-story.jpg');

    const getRes = await GET(createAdminRequest('GET', 'super_admin'));
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.story.story_title_en).toBe('Crafted With Heart in Sydney');
    expect(getJson.story.stat2_value_vi).toBe('20.000+');
  });

  it('rejects unsafe image_url payloads with HTTP 400', async () => {
    const res = await POST(
      createAdminRequest('POST', 'super_admin', {
        image_url: 'javascript:alert("xss")',
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('supports resetting About Story back to defaults via POST { reset: true }', async () => {
    saveStoredAboutStory({
      page_title_vi: 'Tạm Thời Thay Đổi',
      story_p3_vi: 'Đoạn tạm',
    });

    const resetRes = await POST(
      createAdminRequest('POST', 'super_admin', { reset: true })
    );
    expect(resetRes.status).toBe(200);
    const data = await resetRes.json();
    expect(data.success).toBe(true);
    expect(data.story.page_title_vi).toBe(DEFAULT_ABOUT_STORY.page_title_vi);
    expect(data.story.story_p3_vi).toBe('');

    const directReset = resetStoredAboutStory();
    expect(directReset.story_title_en).toBe(DEFAULT_ABOUT_STORY.story_title_en);
  });
});
