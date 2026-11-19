import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { getStaffById, updateStaffMember, deleteStaffMember } from '@/lib/staff/staff-data';
import { canElevateRole, isValidRole } from '@/lib/auth/roles';
import { triggerCmsRevalidation } from '@/lib/cms/revalidate';

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

  return NextResponse.json({
    success: true,
    staff,
  });
}

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

  // RBAC guard: staff role cannot update staff members
  if (session.role === 'staff') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Staff role not permitted to update staff members' },
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

    // Enforce role assignment authorization
    if (body.role && body.role !== existing.role) {
      if (!isValidRole(body.role)) {
        return NextResponse.json(
          { success: false, error: 'Invalid role parameter' },
          { status: 400 }
        );
      }
      if (!canElevateRole(session.role, body.role)) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Insufficient privileges to assign requested role' },
          { status: 403 }
        );
      }
    }

    const updated = await updateStaffMember(id, body);
    await triggerCmsRevalidation({ path: '/[locale]/about', type: 'page' });
    return NextResponse.json({
      success: true,
      staff: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update staff member' },
      { status: 400 }
    );
  }
}

export async function DELETE(
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

  // RBAC guard: staff cannot delete staff members
  if (session.role === 'staff') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Staff role not permitted to delete staff members' },
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
    const deleted = await deleteStaffMember(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete staff member' },
        { status: 400 }
      );
    }

    await triggerCmsRevalidation({ path: '/[locale]/about', type: 'page' });

    return NextResponse.json({
      success: true,
      message: 'Staff member deleted successfully.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete staff member' },
      { status: 500 }
    );
  }
}
