import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { createClient } from '@/lib/supabase/server';
import {
  findStaffAccount,
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

    const isCurrentValid = await verifyAccountPassword(account, currentPassword);
    if (!isCurrentValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mật khẩu hiện tại không chính xác (Current password is incorrect).',
        },
        { status: 401 }
      );
    }

    // Persist salted scrypt hash locally (and invalidate old default password)
    const record = updateAccountPassword(account, newPassword);

    // Best-effort sync to live Supabase Auth if active
    if (
      account.email.includes('@') &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      try {
        const supabase = await createClient();
        await supabase.auth.updateUser({ password: newPassword });
      } catch {
        // Local hashed credential store already updated cleanly
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật mật khẩu thành công! (Password updated successfully.)',
      updated_at: record.updated_at,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
