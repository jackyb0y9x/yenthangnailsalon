/**
 * Server-only Supabase Admin Client
 *
 * Used strictly inside authenticated `/api/admin/*` route handlers after
 * Next.js session + RBAC verification (`getSessionFromRequest`).
 *
 * Authentication priority (uniform across BOTH Local and Vercel Serverless):
 * 1. If `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`) is configured,
 *    uses a dedicated server-side service client.
 * 2. Otherwise, uses the `@supabase/ssr` server client carrying the logged-in
 *    admin's real Supabase Auth JWT (`auth.uid()`), which satisfies Postgres
 *    and Storage RLS policies (`public.current_user_role() IN ('super_admin', 'manager')`)
 *    with ZERO extra environment variables required.
 *
 * NEVER import this file in client components.
 */

import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabaseSafe } from '@/lib/cms/public-data';
import { isServerlessRuntime } from '@/lib/utils/storage-path';

export interface SupabaseSyncStatus {
  hasAdminKey: boolean;
  hasSupabaseAuthSession: boolean;
  canWriteToDb: boolean;
  isLiveSupabase: boolean;
  isServerless: boolean;
  authEmail?: string | null;
}

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

  if (url && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    try {
      const ssrClient = await createServerSupabaseClient();
      // Trigger automatic JWT refresh if access token expired while refresh token is valid
      await ssrClient.auth.getUser().catch(() => null);
      return ssrClient;
    } catch {
      // Fall back safely outside request scope
    }
  }

  return getSupabaseSafe();
}

export async function getSupabaseSyncStatus(supabase?: any): Promise<SupabaseSyncStatus> {
  const isLive = isLiveSupabaseConfigured();
  const hasAdminKey = hasSupabaseAdminCredentials();
  const serverless = isServerlessRuntime();

  if (!isLive || hasAdminKey) {
    return {
      hasAdminKey,
      hasSupabaseAuthSession: false,
      canWriteToDb: true,
      isLiveSupabase: isLive,
      isServerless: serverless,
      authEmail: null,
    };
  }

  let hasSupabaseAuthSession = false;
  let authEmail: string | null = null;

  try {
    const client = supabase || (await getSupabaseAdminSafe());
    if (client?.auth?.getUser) {
      const { data } = await client.auth.getUser();
      const user = data?.user;
      if (user?.id) {
        authEmail = user.email || null;
        const { data: roleRow } = await client
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        if (roleRow?.role === 'super_admin' || roleRow?.role === 'manager') {
          hasSupabaseAuthSession = true;
        }
      }
    }
  } catch {
    hasSupabaseAuthSession = false;
  }

  return {
    hasAdminKey,
    hasSupabaseAuthSession,
    canWriteToDb: hasAdminKey || hasSupabaseAuthSession,
    isLiveSupabase: isLive,
    isServerless: serverless,
    authEmail,
  };
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
    if (
      !hasSupabaseAdminCredentials() &&
      (dbError.code === '42501' || /row-level security/i.test(dbError.message || ''))
    ) {
      return `Phiên đăng nhập hiện tại chưa được xác thực Supabase Auth để ghi bảng "${tableName}". Vui lòng Đăng xuất và Đăng nhập lại (tài khoản superadmin hoặc admin) để đồng bộ trực tiếp lên Supabase DB.`;
    }
    return `Lỗi lưu cơ sở dữ liệu Supabase (${tableName}): ${dbError.message || dbError.code || 'Unknown error'}`;
  }

  if (affectedCount === 0) {
    if (!hasSupabaseAdminCredentials()) {
      return `Phiên đăng nhập hiện tại chưa có token Supabase Auth để ghi bảng "${tableName}" (0 dòng được cập nhật do RLS bảo vệ). Vui lòng Đăng xuất và Đăng nhập lại bằng tài khoản superadmin để lưu trực tiếp lên Supabase DB.`;
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
