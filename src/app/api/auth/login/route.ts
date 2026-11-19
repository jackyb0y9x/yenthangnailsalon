import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import {
  findStaffAccount,
  verifyAccountPassword,
} from '@/lib/auth/credentials';

export async function POST(request: NextRequest) {
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

    const rawIdentifier = body.username ?? body.identifier ?? body.email;
    const rawPassword = body.password;

    if (!rawIdentifier || typeof rawIdentifier !== 'string' || !rawIdentifier.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email or username is required.' },
        { status: 400 }
      );
    }

    if (rawPassword === undefined || rawPassword === null || String(rawPassword).trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Password is required.' },
        { status: 400 }
      );
    }

    const identifier = rawIdentifier.trim().toLowerCase();
    const password = String(rawPassword);

    const staffMember = await findStaffAccount({ identifier });
    if (!staffMember) {
      return NextResponse.json(
        { success: false, error: 'Invalid login credentials.' },
        { status: 401 }
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

    const authenticated = await verifyAccountPassword(staffMember, password, supabaseClient);
    if (!authenticated) {
      return NextResponse.json(
        { success: false, error: 'Invalid login credentials.' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      supabaseSynced: pendingSupabaseCookies.length > 0,
      user: {
        id: staffMember.id,
        name: staffMember.name,
        username: staffMember.username || staffMember.email,
        email: staffMember.email,
        role: staffMember.role,
      },
    });

    const cookieOptions = {
      path: '/',
      httpOnly: true,
      sameSite: 'lax' as const,
      maxAge: 86400, // 24 hours
    };

    response.cookies.set('sb-authenticated', 'true', cookieOptions);
    response.cookies.set('sb-role', staffMember.role, cookieOptions);
    response.cookies.set('sb-email', staffMember.email, cookieOptions);
    response.cookies.set('sb-id', staffMember.id, cookieOptions);

    // Attach real Supabase Auth JWT session cookies for RLS-authenticated DB & Storage writes
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
