import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { getStaffById, calculateStaffProductivity } from '@/lib/staff/staff-data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSessionFromRequest(request);
  if (!session.isAuthenticated) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Admin authentication required' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const staff = await getStaffById(id);

  if (!staff) {
    return NextResponse.json(
      { success: false, error: 'Staff member not found' },
      { status: 404 }
    );
  }

  const metrics = await calculateStaffProductivity(id);

  return NextResponse.json({
    success: true,
    ...metrics,
  });
}
