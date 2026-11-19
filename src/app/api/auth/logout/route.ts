import { NextResponse } from 'next/server';

export async function POST() {
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

  return response;
}
