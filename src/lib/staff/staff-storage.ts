/**
 * Persistent Staff Management Storage Engine
 * Manages full CRUD, avatars, and persistent retention across restarts.
 */

import fs from 'fs';
import path from 'path';
import type { StaffRecord } from './staff-data';

export interface StoredStaffPayload {
  overrides: Record<string, StaffRecord>;
  created: StaffRecord[];
  deletedIds: string[];
}

const STORAGE_DIR = path.join(process.cwd(), '.data');
const STORAGE_FILE = path.join(STORAGE_DIR, 'staff.json');

export function getStoredStaffData(): StoredStaffPayload {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    const mem = (globalThis as any).__mockStaffFileStorage;
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

  const mem = (globalThis as any).__mockStaffFileStorage;
  if (mem) {
    return {
      overrides: mem.overrides || {},
      created: mem.created || [],
      deletedIds: mem.deletedIds || [],
    };
  }

  return { overrides: {}, created: [], deletedIds: [] };
}

export function saveStoredStaffData(data: StoredStaffPayload): void {
  (globalThis as any).__mockStaffFileStorage = data;

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

export function persistNewStaff(member: StaffRecord): void {
  const current = getStoredStaffData();
  // Filter out any existing item with same id
  const remainingCreated = current.created.filter((c) => c.id !== member.id);
  remainingCreated.unshift(member);
  current.created = remainingCreated;
  // Make sure it's not marked deleted
  current.deletedIds = current.deletedIds.filter((id) => id !== member.id);
  saveStoredStaffData(current);
}

export function persistUpdatedStaff(id: string, updated: StaffRecord): void {
  const current = getStoredStaffData();
  const createdIdx = current.created.findIndex((c) => c.id === id);
  if (createdIdx !== -1) {
    current.created[createdIdx] = updated;
  }
  current.overrides[id] = updated;
  saveStoredStaffData(current);
}

export function persistDeletedStaff(id: string): void {
  const current = getStoredStaffData();
  current.created = current.created.filter((c) => c.id !== id);
  delete current.overrides[id];
  if (!current.deletedIds.includes(id)) {
    current.deletedIds.push(id);
  }
  saveStoredStaffData(current);
}

export function mergeWithStoredStaff(baseList: StaffRecord[]): StaffRecord[] {
  const { overrides, created, deletedIds } = getStoredStaffData();

  // 1. Filter out deleted base items
  const nonDeletedBase = baseList.filter((s) => !deletedIds.includes(s.id));

  // 2. Apply overrides to existing base items
  const overriddenBase = nonDeletedBase.map((s) => overrides[s.id] || s);

  // 3. Add created items that are not in base list, applying overrides if any
  const baseIds = new Set(overriddenBase.map((s) => s.id));
  const newCreated = created
    .filter((c) => !baseIds.has(c.id) && !deletedIds.includes(c.id))
    .map((c) => overrides[c.id] || c);

  return [...newCreated, ...overriddenBase];
}
