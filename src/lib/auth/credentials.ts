/**
 * Admin Authentication Roster & Persistent Hashed Password Store
 *
 * Manages built-in administrative accounts (including `superadmin`) and
 * per-user hashed password updates persisted in `.data/auth-passwords.json`.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createClient } from '@/lib/supabase/server';
import { createMockSupabaseClient } from '@/lib/supabase/mock';
import { getStaffList } from '@/lib/staff/staff-data';
import { getWritableDataDir } from '@/lib/utils/storage-path';

export interface StaffAccount {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: 'super_admin' | 'manager' | 'staff';
  password?: string;
  passwords: string[];
  specializations?: string[];
}

interface StoredPasswordRecord {
  salt: string;
  hash: string;
  updated_at: string;
}

type PasswordStoreMap = Record<string, StoredPasswordRecord>;

export const DEFAULT_STAFF_ROSTER: StaffAccount[] = [
  {
    id: 'stf-superadmin',
    name: 'Super Admin',
    username: 'superadmin',
    email: 'superadmin',
    role: 'super_admin',
    passwords: ['YenThang@2026'],
    specializations: ['System Administration', 'Salon Management'],
  },
  {
    id: 'stf-001',
    name: 'Michelle Nguyen',
    username: 'admin',
    email: 'admin@glamournails.com.au',
    role: 'super_admin',
    passwords: ['SalonAdmin2026!', 'SecurePassword2026!'],
    specializations: ['Russian Manicure', 'Acrylic', 'SNS Dip', '3D Art'],
  },
  {
    id: 'stf-002',
    name: 'Sarah Jenkins',
    username: 'manager',
    email: 'manager@glamournails.com.au',
    role: 'manager',
    passwords: ['SalonManager2026!', 'SecurePassword2026!'],
    specializations: ['SNS Dip', 'Pedicure', 'Gel Art'],
  },
  {
    id: 'stf-003',
    name: 'Chloe Nguyen',
    username: 'technician',
    email: 'technician@glamournails.com.au',
    role: 'staff',
    passwords: ['SalonTech2026!', 'SecurePassword2026!'],
    specializations: ['SNS Dip', 'Acrylic Extensions', 'Russian Manicure', '3D Nail Art', 'E-File'],
  },
  {
    id: 'stf-004',
    name: 'Kevin Senior',
    email: 'kevin.senior@glamournails.com.au',
    role: 'staff',
    passwords: ['SecurePassword2026!', 'SalonSenior2026!'],
    specializations: ['Acrylic Extensions', 'French Ombre'],
  },
];

const STORAGE_DIR = getWritableDataDir();
const STORAGE_FILE = path.join(STORAGE_DIR, 'auth-passwords.json');

function isTestEnv(): boolean {
  return process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
}

function readPasswordStore(): PasswordStoreMap {
  if (isTestEnv()) {
    return ((globalThis as any).__mockAuthPasswordOverrides as PasswordStoreMap) || {};
  }

  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as PasswordStoreMap;
      }
    }
  } catch {}

  return ((globalThis as any).__mockAuthPasswordOverrides as PasswordStoreMap) || {};
}

function writePasswordStore(store: PasswordStoreMap): void {
  (globalThis as any).__mockAuthPasswordOverrides = store;

  if (!isTestEnv()) {
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(store, null, 2), 'utf-8');
    } catch {}
  }
}

export function hashPassword(plainPassword: string): StoredPasswordRecord {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
  return {
    salt,
    hash,
    updated_at: new Date().toISOString(),
  };
}

export function verifyPasswordHash(
  plainPassword: string,
  record: StoredPasswordRecord
): boolean {
  try {
    const derived = crypto.scryptSync(plainPassword, record.salt, 64);
    const stored = Buffer.from(record.hash, 'hex');
    if (derived.length !== stored.length) return false;
    return crypto.timingSafeEqual(derived, stored);
  } catch {
    return false;
  }
}

function getAccountKeys(account: { id?: string; email?: string; username?: string }): string[] {
  const keys: string[] = [];
  if (account.id) keys.push(`id:${account.id.trim().toLowerCase()}`);
  if (account.email) keys.push(`email:${account.email.trim().toLowerCase()}`);
  if (account.username) keys.push(`user:${account.username.trim().toLowerCase()}`);
  return keys;
}

export function getPasswordOverride(account: {
  id?: string;
  email?: string;
  username?: string;
}): StoredPasswordRecord | null {
  const store = readPasswordStore();
  for (const key of getAccountKeys(account)) {
    if (store[key]) {
      return store[key];
    }
  }
  return null;
}

export function updateAccountPassword(
  account: { id?: string; email?: string; username?: string },
  newPassword: string
): StoredPasswordRecord {
  const store = { ...readPasswordStore() };
  const record = hashPassword(newPassword);
  for (const key of getAccountKeys(account)) {
    store[key] = record;
  }
  writePasswordStore(store);
  return record;
}

export function validateNewPassword(newPassword: unknown): {
  valid: boolean;
  error?: string;
} {
  if (typeof newPassword !== 'string' || !newPassword.trim()) {
    return { valid: false, error: 'Mật khẩu mới là bắt buộc (New password is required).' };
  }
  if (newPassword.length < 8) {
    return {
      valid: false,
      error: 'Mật khẩu mới phải có ít nhất 8 ký tự (Minimum 8 characters required).',
    };
  }
  if (newPassword.length > 128) {
    return {
      valid: false,
      error: 'Mật khẩu mới không được vượt quá 128 ký tự (Maximum 128 characters).',
    };
  }
  return { valid: true };
}

async function getSupabaseSafe() {
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return await createClient();
    }
  } catch {}
  return createMockSupabaseClient();
}

function normalizeStaffRole(role: unknown): 'super_admin' | 'manager' | 'staff' {
  const r = String(role || '').toLowerCase();
  if (r === 'owner' || r === 'super_admin') return 'super_admin';
  if (r === 'manager') return 'manager';
  return 'staff';
}

export async function findStaffAccount(identifierOrId: {
  identifier?: string;
  id?: string;
}): Promise<StaffAccount | null> {
  const rawIdent = (identifierOrId.identifier || '').trim().toLowerCase();
  const rawId = (identifierOrId.id || '').trim().toLowerCase();

  // 1. Check built-in default roster (matches email, username, or id)
  const rosterMatch = DEFAULT_STAFF_ROSTER.find((s) => {
    if (rawIdent) {
      if (s.email.toLowerCase() === rawIdent) return true;
      if (s.username && s.username.toLowerCase() === rawIdent) return true;
    }
    if (rawId && s.id.toLowerCase() === rawId) return true;
    return false;
  });
  if (rosterMatch) return rosterMatch;

  // 2. Check local persistent staff directory (if an admin added a new staff member)
  try {
    const localStaff = await getStaffList({ activeOnly: false });
    const staffMatch = localStaff.find((s) => {
      if (rawIdent && s.email && s.email.toLowerCase() === rawIdent) return true;
      if (rawId && s.id.toLowerCase() === rawId) return true;
      return false;
    });
    if (staffMatch && staffMatch.is_active !== false) {
      return {
        id: staffMatch.id,
        name: staffMatch.name || staffMatch.full_name,
        email: staffMatch.email,
        role: normalizeStaffRole(staffMatch.role),
        passwords: ['SalonTech2026!'],
        specializations: staffMatch.specializations || [],
      };
    }
  } catch {}

  // 3. Check Supabase staff_members table
  if (rawIdent) {
    try {
      const supabase = await getSupabaseSafe();
      const { data } = await supabase
        .from('staff_members')
        .select('*')
        .eq('email', rawIdent)
        .maybeSingle();

      if (data) {
        return {
          id: data.id,
          name: data.full_name || data.name,
          email: data.email,
          role: normalizeStaffRole(data.role),
          passwords: [data.password || data.password_hash || 'SalonTech2026!'],
          specializations: data.specializations || [],
        };
      }
    } catch {}
  }

  return null;
}

export async function verifyAccountPassword(
  account: StaffAccount,
  plainPassword: string
): Promise<boolean> {
  // 1. If the user has updated their password, enforce ONLY the stored hashed password
  const override = getPasswordOverride(account);
  if (override) {
    return verifyPasswordHash(plainPassword, override);
  }

  // 2. Check against live Supabase Auth if email contains '@' and Supabase is configured
  if (
    account.email.includes('@') &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    try {
      const supabase = await createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: plainPassword,
      });
      if (!authError) {
        return true;
      }
    } catch {}
  }

  // 3. Fallback to assigned default credentials
  if (account.password && plainPassword === account.password) {
    return true;
  }
  if (Array.isArray(account.passwords) && account.passwords.includes(plainPassword)) {
    return true;
  }

  return false;
}
