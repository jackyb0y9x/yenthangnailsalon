import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { canAccessFinance } from '@/lib/auth/roles';
import { getFinancialSummaryData } from '@/lib/finance/store';
import { getAustralianFinancialYear, getBASDateRange } from '@/lib/utils/date';

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
  const period = searchParams.get('period') || undefined;
  let startDate = searchParams.get('startDate') || searchParams.get('start_date') || undefined;
  let endDate = searchParams.get('endDate') || searchParams.get('end_date') || undefined;
  const fyParam = searchParams.get('fy') || searchParams.get('fyYear');

  const currentFY = getAustralianFinancialYear(new Date());
  const targetFYStartYear = fyParam ? parseInt(fyParam, 10) : currentFY.startYear;

  let periodLabel = `FY${targetFYStartYear}-${(targetFYStartYear + 1).toString().slice(-2)}`;

  if (period) {
    const p = period.toLowerCase();
    if (p === 'current_fy') {
      const fy = getAustralianFinancialYear(new Date());
      startDate = fy.startDate;
      endDate = fy.endDate;
      periodLabel = `Current Financial Year (${fy.label})`;
    } else if (p === 'previous_fy') {
      const prevStart = currentFY.startYear - 1;
      const range = getBASDateRange(prevStart, 'ALL');
      startDate = range.startDate;
      endDate = range.endDate;
      periodLabel = `Previous Financial Year (${range.label})`;
    } else if (['q1', 'q2', 'q3', 'q4'].includes(p)) {
      const quarter = p.toUpperCase() as 'Q1' | 'Q2' | 'Q3' | 'Q4';
      const range = getBASDateRange(targetFYStartYear, quarter);
      startDate = range.startDate;
      endDate = range.endDate;
      periodLabel = range.label;
    } else if (p === 'all') {
      startDate = undefined;
      endDate = undefined;
      periodLabel = 'All Time';
    }
  }

  const result = await getFinancialSummaryData({ startDate, endDate });

  return NextResponse.json({
    success: true,
    period: {
      startDate: startDate || null,
      endDate: endDate || null,
      label: periodLabel,
    },
    summary: result.summary,
    categoryBreakdown: result.categoryBreakdown,
  });
}
