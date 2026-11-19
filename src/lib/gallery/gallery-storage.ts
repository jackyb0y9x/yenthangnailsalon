/**
 * Persistent Gallery Storage Engine
 * Manages Full CRUD for Nail Art Gallery & Lookbook, keeping data intact across restarts and offline/remote states.
 */

import fs from 'fs';
import path from 'path';

export interface GalleryItemRecord {
  id: string;
  title_en: string;
  title_vi: string;
  category: string;
  category_tag?: string;
  image_url: string;
  thumbnail_url?: string | null;
  tags: string[];
  is_featured: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface StoredGalleryPayload {
  overrides: Record<string, GalleryItemRecord>;
  created: GalleryItemRecord[];
  deletedIds: string[];
}

const STORAGE_DIR = path.join(process.cwd(), '.data');
const STORAGE_FILE = path.join(STORAGE_DIR, 'gallery.json');

export function getStoredGalleryData(): StoredGalleryPayload {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    const mem = (globalThis as any).__mockGalleryFileStorage;
    return mem || { overrides: {}, created: [], deletedIds: [] };
  }

  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        overrides: parsed.overrides || {},
        created: Array.isArray(parsed.created) ? parsed.created : [],
        deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [],
      };
    }
  } catch {}

  const mem = (globalThis as any).__mockGalleryFileStorage;
  if (mem) {
    return {
      overrides: mem.overrides || {},
      created: mem.created || [],
      deletedIds: mem.deletedIds || [],
    };
  }

  return { overrides: {}, created: [], deletedIds: [] };
}

export function saveStoredGalleryData(data: StoredGalleryPayload): void {
  (globalThis as any).__mockGalleryFileStorage = data;

  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    return;
  }

  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}
}

export function persistNewGalleryItem(item: GalleryItemRecord): void {
  const current = getStoredGalleryData();
  const remaining = current.created.filter((c) => c.id !== item.id);
  remaining.unshift(item);
  current.created = remaining;
  current.deletedIds = current.deletedIds.filter((id) => id !== item.id);
  saveStoredGalleryData(current);
}

export function persistUpdatedGalleryItem(id: string, updated: GalleryItemRecord): void {
  const current = getStoredGalleryData();
  const createdIdx = current.created.findIndex((c) => c.id === id);
  if (createdIdx !== -1) {
    current.created[createdIdx] = updated;
  }
  current.overrides[id] = updated;
  saveStoredGalleryData(current);
}

export function persistDeletedGalleryItem(id: string): void {
  const current = getStoredGalleryData();
  current.created = current.created.filter((c) => c.id !== id);
  delete current.overrides[id];
  if (!current.deletedIds.includes(id)) {
    current.deletedIds.push(id);
  }
  saveStoredGalleryData(current);
}

export function mergeWithStoredGallery(baseList: GalleryItemRecord[]): GalleryItemRecord[] {
  const { overrides, created, deletedIds } = getStoredGalleryData();

  // 1. Exclude deleted base items
  const nonDeletedBase = baseList.filter((g) => !deletedIds.includes(g.id));

  // 2. Apply updates/overrides to base items
  const overriddenBase = nonDeletedBase.map((g) => {
    const override = overrides[g.id];
    if (override) {
      return { ...g, ...override };
    }
    return g;
  });

  // 3. Add newly created items
  const baseIds = new Set(overriddenBase.map((g) => g.id));
  const newCreated = created
    .filter((c) => !baseIds.has(c.id) && !deletedIds.includes(c.id))
    .map((c) => overrides[c.id] || c);

  return [...newCreated, ...overriddenBase];
}
