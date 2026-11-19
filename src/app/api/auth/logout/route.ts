import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST() {
  const pendingSupabaseCookies: Array<{ name: string; value: string; options?: any }> = [];
  const existingAuthCookies: string[] = [];
  const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!isTest) {
    try {
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      for (const c of allCookies) {
        if (c.name.startsWith('sb-') && c.name.includes('auth-token')) {
          existingAuthCookies.push(c.name);
        }
      }

      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
          cookies: {
            getAll() {
              return allCookies;
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach((c) => pendingSupabaseCookies.push(c));
            },
          },
        });
        await supabase.auth.signOut();
      }
    } catch {
      // Outside Next.js request context or offline — continue clearing cookies
    }
  }

  const response = NextResponse.json({ success: true });

  const clearOptions = {
    path: '/',
    expires: new Date(0),
    maxAge: 0,
    sameSite: 'lax' as const,
  };

  response.cookies.set('sb-authenticated', '', clearOptions);
  response.cookies.set('sb-role', '', clearOptions);
  response.cookies.set('sb-email', '', clearOptions);
  response.cookies.set('sb-id', '', clearOptions);

  for (const { name, value, options } of pendingSupabaseCookies) {
    response.cookies.set(name, value, options);
  }

  for (const cookieName of existingAuthCookies) {
    response.cookies.set(cookieName, '', clearOptions);
  }

  return response;
}
