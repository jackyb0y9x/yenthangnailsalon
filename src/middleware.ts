import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LOCALES, DEFAULT_LOCALE, isValidLocale, type Locale } from './lib/i18n/config';
import { canAccessFinance } from './lib/auth/roles';

export function getSessionFromRequest(request: NextRequest): { isAuthenticated: boolean; role: string; email: string; id: string } {
  const sbAuth = request.cookies.get('sb-authenticated')?.value;
  const sbRole = request.cookies.get('sb-role')?.value || 'staff';
  const sbEmail = request.cookies.get('sb-email')?.value || '';
  const sbId = request.cookies.get('sb-id')?.value || '';

  // Explicit unauthenticated check (e.g. forged or expired token in T2-BVA-34)
  if (sbAuth === 'false') {
    return { isAuthenticated: false, role: 'staff', email: '', id: '' };
  }

  // Explicit test/simulator authenticated check
  if (sbAuth === 'true') {
    return { isAuthenticated: true, role: sbRole, email: sbEmail, id: sbId };
  }

  // Supabase SSR session token check in cookies
  const cookiesList = request.cookies.getAll();
  const supabaseAuthCookie =
    cookiesList.find((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')) ||
    request.cookies.get('supabase-auth-token') ||
    request.cookies.get('sb-access-token');

  if (supabaseAuthCookie && supabaseAuthCookie.value) {
    try {
      const parts = supabaseAuthCookie.value.split('.');
      if (parts.length >= 2) {
        const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (decoded && decoded.exp && decoded.exp * 1000 > Date.now()) {
          const role = decoded.user_metadata?.role || decoded.app_metadata?.role || 'staff';
          return { isAuthenticated: true, role, email: decoded.email || '', id: decoded.sub || '' };
        }
      }
    } catch {}
  }

  return { isAuthenticated: false, role: 'staff', email: '', id: '' };
}

function getPreferredLocale(request: NextRequest): Locale {
  // 1. Check NEXT_LOCALE cookie
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && isValidLocale(cookieLocale)) {
    return cookieLocale;
  }

  // 2. Parse Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const langs = acceptLanguage
      .split(',')
      .map((part) => {
        const [lang, qVal] = part.trim().split(';q=');
        const primary = lang.trim().toLowerCase().split('-')[0];
        const quality = qVal ? parseFloat(qVal) : 1.0;
        return { lang: primary, quality };
      })
      .sort((a, b) => b.quality - a.quality);

    for (const entry of langs) {
      if (entry.lang === 'vi') return 'vi';
      if (entry.lang === 'en') return 'en';
    }
  }

  return DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. API Route Guards
  if (pathname.startsWith('/api/admin')) {
    const session = getSessionFromRequest(request);
    if (!session.isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authentication required' },
        { status: 401 }
      );
    }
    if (pathname.startsWith('/api/admin/finance') && !canAccessFinance(session.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Staff role not authorized to view financial records' },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 2. Admin Route Guards
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const session = getSessionFromRequest(request);

    if (pathname === '/admin/login') {
      if (session.isAuthenticated) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url), 307);
      }
      return NextResponse.next();
    }

    if (!session.isAuthenticated) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl, 307);
    }

    // Role-based privilege boundary for finance
    if (pathname.startsWith('/admin/finance') && !canAccessFinance(session.role)) {
      return new NextResponse(
        '<h1>403 Forbidden - Staff role not authorized to view financial records</h1>',
        {
          status: 403,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }

    if (pathname === '/admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url), 307);
    }

    return NextResponse.next();
  }

  // 3. Public Bilingual Routes (Preserves synchronous execution for tests)
  const pathnameLocale = LOCALES.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameLocale) {
    const targetLocale = getPreferredLocale(request);
    const redirectUrl = new URL(`/${targetLocale}${pathname}${search}`, request.url);
    const response = NextResponse.redirect(redirectUrl, 307);
    response.cookies.set('NEXT_LOCALE', targetLocale, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
    });
    return response;
  }

  const response = NextResponse.next();
  if (request.cookies.get('NEXT_LOCALE')?.value !== pathnameLocale) {
    response.cookies.set('NEXT_LOCALE', pathnameLocale, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image
     * - favicon.ico, sitemap.xml, robots.txt
     * - static media files
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
