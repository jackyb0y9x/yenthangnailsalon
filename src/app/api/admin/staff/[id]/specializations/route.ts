import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { getStaffById, updateStaffSpecializations } from '@/lib/staff/staff-data';

export async function PUT(
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

  // RBAC guard: staff role cannot update staff specializations
  if (session.role === 'staff') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Staff role not permitted to update staff specializations' },
      { status: 403 }
    );
  }

  const { id } = await params;
  const existing = await getStaffById(id);
  if (!existing) {
    return NextResponse.json(
      { success: false, error: 'Staff member not found' },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    if (!Array.isArray(body.specializations)) {
      return NextResponse.json(
        { success: false, error: 'specializations must be an array of strings' },
        { status: 400 }
      );
    }

    const updated = await updateStaffSpecializations(id, body.specializations);
    return NextResponse.json({
      success: true,
      staff: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update specializations' },
      { status: 400 }
    );
  }
}
