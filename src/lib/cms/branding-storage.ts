/**
 * Persistent Branding, Logo & Social Links Configuration Storage
 * Manages Website Title, Tagline, Logo URL, and Facebook/Instagram profile links
 * across Supabase, filesystem (.data/branding.json), and in-memory test caches.
 */

import fs from 'fs';
import path from 'path';
import { getWritableDataDir } from '@/lib/utils/storage-path';

export interface BrandingConfig {
  website_title: string;
  website_title_vi: string;
  website_tagline: string;
  website_tagline_vi: string;
  logo_url: string;
  facebook_url: string;
  instagram_url: string;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  website_title: 'Glamour Nails & Beauty Lounge Sydney',
  website_title_vi: 'Glamour Nails Sydney • Chăm Sóc Móng Cao Cấp',
  website_tagline: 'Sydney CBD • Boutique Lounge',
  website_tagline_vi: 'Sydney CBD • Tiệm Nail Sang Trọng',
  logo_url: '',
  facebook_url: 'https://facebook.com/glamournails.sydney',
  instagram_url: 'https://instagram.com/glamournails.sydney',
};

const STORAGE_DIR = getWritableDataDir();
const STORAGE_FILE = path.join(STORAGE_DIR, 'branding.json');

function isTestEnv(): boolean {
  return process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
}

/**
 * Normalizes a social link (auto-prepends https:// for bare domain/handle paths).
 * Returns empty string if input is blank (allows admins to intentionally hide an icon).
 */
export function normalizeSocialUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Reject non-http protocols like javascript:, data:, vbscript:, file:
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

/**
 * Validates that a social profile URL is either empty or a safe http(s) URL.
 */
export function isSafeSocialUrl(raw: string): boolean {
  const normalized = normalizeSocialUrl(raw);
  if (!normalized) return true;
  try {
    const parsed = new URL(normalized);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      Boolean(parsed.hostname) &&
      parsed.hostname.includes('.')
    );
  } catch {
    return false;
  }
}

export function getStoredBranding(): BrandingConfig | null {
  if (isTestEnv()) {
    const mem = (globalThis as any).__mockBrandingConfig;
    return mem ? { ...DEFAULT_BRANDING, ...mem } : null;
  }

  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        ...DEFAULT_BRANDING,
        ...parsed,
      };
    }
  } catch {}

  const mem = (globalThis as any).__mockBrandingConfig;
  if (mem) {
    return { ...DEFAULT_BRANDING, ...mem };
  }

  return null;
}

export function saveStoredBranding(config: Partial<BrandingConfig>): BrandingConfig {
  const current = getStoredBranding() || DEFAULT_BRANDING;
  const merged: BrandingConfig = {
    website_title:
      config.website_title !== undefined
        ? String(config.website_title).trim()
        : current.website_title,
    website_title_vi:
      config.website_title_vi !== undefined
        ? String(config.website_title_vi).trim()
        : current.website_title_vi,
    website_tagline:
      config.website_tagline !== undefined
        ? String(config.website_tagline).trim()
        : current.website_tagline,
    website_tagline_vi:
      config.website_tagline_vi !== undefined
        ? String(config.website_tagline_vi).trim()
        : current.website_tagline_vi,
    logo_url:
      config.logo_url !== undefined
        ? String(config.logo_url).trim()
        : current.logo_url,
    facebook_url:
      config.facebook_url !== undefined
        ? normalizeSocialUrl(String(config.facebook_url))
        : current.facebook_url,
    instagram_url:
      config.instagram_url !== undefined
        ? normalizeSocialUrl(String(config.instagram_url))
        : current.instagram_url,
  };

  (globalThis as any).__mockBrandingConfig = merged;

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
