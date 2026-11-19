import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { canElevateRole, isValidRole } from '@/lib/auth/roles';
import { updateStaffRole } from '@/lib/staff/staff-data';

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

  const { id: staffId } = await params;

  try {
    const body = await request.json();
    const requestedRole = body.role;

    if (!requestedRole || !isValidRole(requestedRole)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing role parameter' },
        { status: 400 }
      );
    }

    // Role elevation privilege check using authentic RBAC domain logic
    if (!canElevateRole(session.role, requestedRole)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only super_admin can modify staff roles or elevate to super_admin' },
        { status: 403 }
      );
    }

    const updated = await updateStaffRole(staffId, requestedRole);

    return NextResponse.json({
      success: true,
      staff: updated || {
        id: staffId,
        role: requestedRole,
        updated_at: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Malformed JSON payload' },
      { status: 400 }
    );
  }
}
