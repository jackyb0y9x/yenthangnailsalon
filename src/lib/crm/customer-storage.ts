/**
 * Persistent Customer Storage Engine
 * Ensures custom customers added/updated/deleted persist across server restarts.
 */

import fs from 'fs';
import path from 'path';
import type { MockCustomer } from './mock-customers';
import { getWritableDataDir } from '@/lib/utils/storage-path';

export interface StoredCustomerPayload {
  overrides: Record<string, MockCustomer>;
  created: MockCustomer[];
  deletedIds: string[];
}

const STORAGE_DIR = getWritableDataDir();
const STORAGE_FILE = path.join(STORAGE_DIR, 'customers.json');

export function getStoredCustomerData(): StoredCustomerPayload {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    const mem = (globalThis as any).__mockCustomerFileStorage;
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

  const mem = (globalThis as any).__mockCustomerFileStorage;
  if (mem) {
    return {
      overrides: mem.overrides || {},
      created: mem.created || [],
      deletedIds: mem.deletedIds || [],
    };
  }

  return { overrides: {}, created: [], deletedIds: [] };
}

export function saveStoredCustomerData(data: StoredCustomerPayload): void {
  (globalThis as any).__mockCustomerFileStorage = data;

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

export function persistNewCustomer(customer: MockCustomer): void {
  const current = getStoredCustomerData();
  current.created = current.created.filter((c) => c.id !== customer.id);
  current.created.unshift(customer);
  current.deletedIds = current.deletedIds.filter((id) => id !== customer.id);
  saveStoredCustomerData(current);
}

export function persistUpdatedCustomer(id: string, updated: MockCustomer): void {
  const current = getStoredCustomerData();
  const createdIdx = current.created.findIndex((c) => c.id === id);
  if (createdIdx !== -1) {
    current.created[createdIdx] = updated;
  } else {
    current.overrides[id] = updated;
  }
  saveStoredCustomerData(current);
}

export function persistDeletedCustomer(id: string): void {
  const current = getStoredCustomerData();
  current.created = current.created.filter((c) => c.id !== id);
  delete current.overrides[id];
  if (!current.deletedIds.includes(id)) {
    current.deletedIds.push(id);
  }
  saveStoredCustomerData(current);
}

export function mergeWithStoredCustomers(baseList: MockCustomer[]): MockCustomer[] {
  const { overrides, created, deletedIds } = getStoredCustomerData();

  // 1. Filter out deleted
  const nonDeleted = baseList.filter((c) => !deletedIds.includes(c.id));

  // 2. Apply overrides
  const overridden = nonDeleted.map((c) => overrides[c.id] || c);

  // 3. Add created items
  const baseIds = new Set(overridden.map((c) => c.id));
  const newCreated = created.filter((c) => !baseIds.has(c.id) && !deletedIds.includes(c.id));

  return [...newCreated, ...overridden];
}
