import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { canAccessFinance } from '@/lib/auth/roles';
import { syncVisitsFromCrm } from '@/lib/finance/store';

export async function POST(request: NextRequest) {
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

  try {
    const result = await syncVisitsFromCrm();
    return NextResponse.json({
      success: true,
      message: `Reconciled ${result.syncedCount} new visit(s) into financial ledger (${result.skippedCount} already synced).`,
      syncedCount: result.syncedCount,
      skippedCount: result.skippedCount,
      totalVisits: result.totalVisits,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync visits' },
      { status: 500 }
    );
  }
}
