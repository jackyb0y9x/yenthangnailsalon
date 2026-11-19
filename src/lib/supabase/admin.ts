/**
 * Server-only Supabase Admin Client
 *
 * Used strictly inside authenticated `/api/admin/*` route handlers after
 * Next.js session + RBAC verification (`getSessionFromRequest`).
 * Uses `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`) so writes
 * persist directly to RLS-protected Supabase Postgres tables uniformly
 * across BOTH Local development and Vercel Serverless deployments.
 *
 * NEVER import this file in client components.
 */

import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { getSupabaseSafe } from '@/lib/cms/public-data';

export function isTestRuntime(): boolean {
  return process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
}

export function getSupabaseAdminSecretKey(): string | null {
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    ''
  ).trim();
  return key || null;
}

export function hasSupabaseAdminCredentials(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && getSupabaseAdminSecretKey()
  );
}

export function isLiveSupabaseConfigured(): boolean {
  if (isTestRuntime()) return false;
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      (getSupabaseAdminSecretKey() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())
  );
}

export async function getSupabaseAdminSafe(): Promise<any> {
  if (isTestRuntime()) {
    return getSupabaseSafe();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const adminKey = getSupabaseAdminSecretKey();

  if (url && adminKey) {
    return createSupabaseJsClient(url, adminKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return getSupabaseSafe();
}

/**
 * Verifies a Supabase mutation response so RLS silent 0-row updates or
 * schema/constraint errors are NEVER silently swallowed as "success".
 */
export function buildDbWriteErrorMessage(
  dbError: any,
  affectedCount: number,
  tableName: string
): string | null {
  if (isTestRuntime() || !isLiveSupabaseConfigured()) {
    return null;
  }

  if (dbError) {
    if (!hasSupabaseAdminCredentials() && (dbError.code === '42501' || /row-level security/i.test(dbError.message || ''))) {
      return `Supabase RLS từ chối quyền ghi bảng "${tableName}". Vui lòng thêm biến môi trường SUPABASE_SERVICE_ROLE_KEY vào .env.local và Vercel Environment Variables rồi Redeploy.`;
    }
    return `Lỗi lưu cơ sở dữ liệu Supabase (${tableName}): ${dbError.message || dbError.code || 'Unknown error'}`;
  }

  if (affectedCount === 0) {
    if (!hasSupabaseAdminCredentials()) {
      return `Không thể ghi thay đổi vào bảng "${tableName}" trên Supabase (0 dòng được cập nhật do RLS chặn anon key). Vui lòng cấu hình biến môi trường SUPABASE_SERVICE_ROLE_KEY trên Vercel và .env.local rồi Redeploy.`;
    }
    return `Không tìm thấy bản ghi để cập nhật trong bảng "${tableName}" trên Supabase.`;
  }

  return null;
}

export async function execSupabaseUpdate(
  supabase: any,
  table: string,
  payload: Record<string, any>,
  matchCol: string,
  matchVal: any
): Promise<{ rows: any[]; error: any; affected: number }> {
  const query = supabase.from(table).update(payload).eq(matchCol, matchVal);
  const res = typeof query?.select === 'function' ? await query.select() : await query;
  const rows = Array.isArray(res?.data) ? res.data : res?.data ? [res.data] : [];
  const affected = rows.length || Number(res?.count || 0);
  return { rows, error: res?.error || null, affected };
}

export async function execSupabaseInsert(
  supabase: any,
  table: string,
  payload: Record<string, any>
): Promise<{ rows: any[]; error: any; affected: number }> {
  const query = supabase.from(table).insert(payload);
  const res = typeof query?.select === 'function' ? await query.select() : await query;
  const rows = Array.isArray(res?.data) ? res.data : res?.data ? [res.data] : [];
  const affected = rows.length || (res?.error ? 0 : 1);
  return { rows, error: res?.error || null, affected };
}

