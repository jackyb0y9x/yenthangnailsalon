import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { canAccessFinance } from '@/lib/auth/roles';
import { getCategories } from '@/lib/finance/store';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session.isAuthenticated) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Admin authentication required' },
      { status: 401 }
    );
  }

  if (!canAccessFinance(session.role)) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Staff role not authorized to view financial records' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as any;

  const categories = await getCategories(type);

  return NextResponse.json({
    success: true,
    categories,
  });
}
