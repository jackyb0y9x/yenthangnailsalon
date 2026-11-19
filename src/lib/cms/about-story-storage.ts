/**
 * Persistent About Story Configuration Storage
 * Manages the bilingual "Our Story / Câu Chuyện" content shown on /[locale]/about
 * across file system persistence (.data/about-story.json) and in-memory test caches.
 */

import fs from 'fs';
import path from 'path';
import { getWritableDataDir } from '@/lib/utils/storage-path';

export interface AboutStoryConfig {
  badge_en: string;
  badge_vi: string;
  page_title_en: string;
  page_title_vi: string;
  page_subtitle_en: string;
  page_subtitle_vi: string;
  story_eyebrow_en: string;
  story_eyebrow_vi: string;
  story_title_en: string;
  story_title_vi: string;
  story_p1_en: string;
  story_p1_vi: string;
  story_p2_en: string;
  story_p2_vi: string;
  story_p3_en: string;
  story_p3_vi: string;
  image_url: string;
  stat1_value_en: string;
  stat1_value_vi: string;
  stat1_label_en: string;
  stat1_label_vi: string;
  stat2_value_en: string;
  stat2_value_vi: string;
  stat2_label_en: string;
  stat2_label_vi: string;
  updated_at?: string;
}

export const DEFAULT_ABOUT_STORY: AboutStoryConfig = {
  badge_en: 'Our Heritage & Values',
  badge_vi: 'Di Sản & Giá Trị Cốt Lõi',
  page_title_en: 'The Glamour Nails Story',
  page_title_vi: 'Câu Chuyện Glamour Nails',
  page_subtitle_en:
    'Where Vietnamese precision artistry meets Australian luxury standards.',
  page_subtitle_vi:
    'Nơi kỹ thuật điêu luyện của nghệ nhân Việt hòa quyện cùng tiêu chuẩn dịch vụ cao cấp của Úc.',
  story_eyebrow_en: 'Sydney CBD Sanctuary',
  story_eyebrow_vi: 'Không Gian Đẳng Cấp Sydney CBD',
  story_title_en: '8+ Years of Nail Perfection in Sydney CBD',
  story_title_vi: 'Hơn 8 Năm Tinh Hoa Nghệ Thuật Móng Tại Sydney CBD',
  story_p1_en:
    'Founded in 2018 in the vibrant heart of Sydney, Glamour Nails & Spa was born with a single mission: to elevate nail care into an uncompromising ritual of beauty, safety, and wellness.',
  story_p1_vi:
    'Thành lập năm 2018 tại trung tâm sôi động của Sydney, Glamour Nails & Spa ra đời với sứ mệnh: nâng tầm dịch vụ làm móng thành trải nghiệm thư giãn đẳng cấp, an toàn và tinh tế.',
  story_p2_en:
    'Our salon brings together the legendary dexterity and patience of Vietnamese master nail artisans with Australian hospitality and stringent healthcare hygiene protocols.',
  story_p2_vi:
    'Chúng tôi quy tụ đội ngũ chuyên viên gốc Việt tài hoa kết hợp phong cách phục vụ hiếu khách của nước Úc cùng quy chuẩn vệ sinh y tế khắt khe nhất.',
  story_p3_en: '',
  story_p3_vi: '',
  image_url:
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80',
  stat1_value_en: '8+ Years',
  stat1_value_vi: '8+ Năm',
  stat1_label_en: 'Sydney CBD Excellence',
  stat1_label_vi: 'Kinh Nghiệm Tại Sydney CBD',
  stat2_value_en: '15,000+',
  stat2_value_vi: '15.000+',
  stat2_label_en: 'Satisfied Clients',
  stat2_label_vi: 'Khách Hàng Hài Lòng',
};

const STORAGE_DIR = getWritableDataDir();
const STORAGE_FILE = path.join(STORAGE_DIR, 'about-story.json');

function isTestEnv(): boolean {
  return process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
}

export function isSafeStoryImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('/')) return !trimmed.startsWith('//');
  // Allow safe raster base64 data URIs (for serverless inline fallback) while rejecting SVG/HTML XSS
  if (/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getStoredAboutStory(): AboutStoryConfig | null {
  if (isTestEnv()) {
    const mem = (globalThis as any).__mockAboutStoryConfig;
    return mem ? { ...DEFAULT_ABOUT_STORY, ...mem } : null;
  }

  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        ...DEFAULT_ABOUT_STORY,
        ...parsed,
      };
    }
  } catch {}

  const mem = (globalThis as any).__mockAboutStoryConfig;
  if (mem) {
    return { ...DEFAULT_ABOUT_STORY, ...mem };
  }

  return null;
}

export function saveStoredAboutStory(
  config: Partial<AboutStoryConfig>
): AboutStoryConfig {
  const current = getStoredAboutStory() || DEFAULT_ABOUT_STORY;

  const pick = (key: keyof AboutStoryConfig): string => {
    const nextVal = config[key];
    if (nextVal !== undefined && nextVal !== null) {
      return String(nextVal).trim();
    }
    return String(current[key] ?? DEFAULT_ABOUT_STORY[key] ?? '');
  };

  const merged: AboutStoryConfig = {
    badge_en: pick('badge_en'),
    badge_vi: pick('badge_vi'),
    page_title_en: pick('page_title_en'),
    page_title_vi: pick('page_title_vi'),
    page_subtitle_en: pick('page_subtitle_en'),
    page_subtitle_vi: pick('page_subtitle_vi'),
    story_eyebrow_en: pick('story_eyebrow_en'),
    story_eyebrow_vi: pick('story_eyebrow_vi'),
    story_title_en: pick('story_title_en'),
    story_title_vi: pick('story_title_vi'),
    story_p1_en: pick('story_p1_en'),
    story_p1_vi: pick('story_p1_vi'),
    story_p2_en: pick('story_p2_en'),
    story_p2_vi: pick('story_p2_vi'),
    story_p3_en: pick('story_p3_en'),
    story_p3_vi: pick('story_p3_vi'),
    image_url: pick('image_url') || DEFAULT_ABOUT_STORY.image_url,
    stat1_value_en: pick('stat1_value_en'),
    stat1_value_vi: pick('stat1_value_vi'),
    stat1_label_en: pick('stat1_label_en'),
    stat1_label_vi: pick('stat1_label_vi'),
    stat2_value_en: pick('stat2_value_en'),
    stat2_value_vi: pick('stat2_value_vi'),
    stat2_label_en: pick('stat2_label_en'),
    stat2_label_vi: pick('stat2_label_vi'),
    updated_at: new Date().toISOString(),
  };

  (globalThis as any).__mockAboutStoryConfig = merged;

  if (!isTestEnv()) {
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    } catch {}
  }

  return merged;
}

export function resetStoredAboutStory(): AboutStoryConfig {
  const fresh: AboutStoryConfig = {
    ...DEFAULT_ABOUT_STORY,
    updated_at: new Date().toISOString(),
  };

  (globalThis as any).__mockAboutStoryConfig = fresh;

  if (!isTestEnv()) {
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(fresh, null, 2), 'utf-8');
    } catch {}
  }

  return fresh;
}
