import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { getStaffById, updateStaffStatus } from '@/lib/staff/staff-data';
import { triggerCmsRevalidation } from '@/lib/cms/revalidate';

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

  // RBAC guard: staff role cannot update staff status
  if (session.role === 'staff') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Staff role not permitted to update staff status' },
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
    if (typeof body.is_active !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'is_active must be a boolean' },
        { status: 400 }
      );
    }

    const updated = await updateStaffStatus(id, body.is_active);
    await triggerCmsRevalidation({ path: '/[locale]/about', type: 'page' });
    return NextResponse.json({
      success: true,
      staff: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update staff status' },
      { status: 400 }
    );
  }
}
