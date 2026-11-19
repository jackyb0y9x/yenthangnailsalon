import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSessionFromRequest } from '@/middleware';
import {
  findStaffAccount,
  getSupabaseAuthEmail,
  verifyAccountPassword,
  updateAccountPassword,
  validateNewPassword,
} from '@/lib/auth/credentials';

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session.isAuthenticated) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Please sign in first.' },
      { status: 401 }
    );
  }

  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Malformed JSON payload.' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Payload must be an object.' },
        { status: 400 }
      );
    }

    const currentPassword =
      typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword =
      typeof body.newPassword === 'string' ? body.newPassword : '';
    const confirmPassword =
      body.confirmPassword !== undefined ? String(body.confirmPassword) : undefined;

    if (!currentPassword.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vui lòng nhập mật khẩu hiện tại (Current password is required).',
        },
        { status: 400 }
      );
    }

    const validation = validateNewPassword(newPassword);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    if (confirmPassword !== undefined && confirmPassword !== newPassword) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Mật khẩu xác nhận không khớp với mật khẩu mới (Confirm password does not match).',
        },
        { status: 400 }
      );
    }

    if (newPassword === currentPassword) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Mật khẩu mới phải khác mật khẩu hiện tại (New password must be different from current password).',
        },
        { status: 400 }
      );
    }

    // Strictly resolve the currently logged-in account from HttpOnly session cookies
    const account = await findStaffAccount({
      id: session.id,
      identifier: session.email,
    });

    if (!account) {
      return NextResponse.json(
        {
          success: false,
          error: 'Không tìm thấy thông tin tài khoản hiện tại (Active account not found).',
        },
        { status: 404 }
      );
    }

    const pendingSupabaseCookies: Array<{ name: string; value: string; options?: any }> = [];
    const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    const supabaseClient =
      !isTest && supabaseUrl && supabaseAnonKey
        ? createServerClient(supabaseUrl, supabaseAnonKey, {
            cookies: {
              getAll() {
                return request.cookies.getAll();
              },
              setAll(cookiesToSet) {
                cookiesToSet.forEach((c) => pendingSupabaseCookies.push(c));
              },
            },
          })
        : undefined;

    const isCurrentValid = await verifyAccountPassword(account, currentPassword, supabaseClient);
    if (!isCurrentValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mật khẩu hiện tại không chính xác (Current password is incorrect).',
        },
        { status: 401 }
      );
    }

    // Sync new password to live Supabase Auth so password changes persist across Local & Vercel
    const authEmail = getSupabaseAuthEmail(account);
    if (supabaseClient && authEmail) {
      try {
        const { error: updateErr } = await supabaseClient.auth.updateUser({
          password: newPassword,
        });
        if (updateErr) {
          return NextResponse.json(
            {
              success: false,
              error: `Không thể cập nhật mật khẩu trên Supabase Auth: ${updateErr.message}`,
            },
            { status: 500 }
          );
        }
      } catch (err: any) {
        return NextResponse.json(
          {
            success: false,
            error: `Lỗi đồng bộ mật khẩu Supabase Auth: ${err?.message || 'Unknown error'}`,
          },
          { status: 500 }
        );
      }
    }

    // Also persist salted scrypt hash locally (used in test/offline mode)
    const record = updateAccountPassword(account, newPassword);

    const response = NextResponse.json({
      success: true,
      message: 'Cập nhật mật khẩu thành công! (Password updated successfully.)',
      updated_at: record.updated_at,
    });

    for (const { name, value, options } of pendingSupabaseCookies) {
      response.cookies.set(name, value, options);
    }

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
