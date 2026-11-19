import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { getStaffList, createStaffMember } from '@/lib/staff/staff-data';
import { isValidAustralianMobile } from '@/lib/utils/validation';
import { triggerCmsRevalidation } from '@/lib/cms/revalidate';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session.isAuthenticated) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Admin authentication required' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === 'true';
  const search = searchParams.get('search') || searchParams.get('query') || undefined;

  const staff = await getStaffList({ activeOnly, search });
  return NextResponse.json({
    success: true,
    staff,
  });
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session.isAuthenticated) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Admin authentication required' },
      { status: 401 }
    );
  }

  // RBAC guard: staff cannot create staff members
  if (session.role === 'staff') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Staff role not permitted to create staff members' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const fullName = body.full_name || body.name;

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Full name is required (min 2 characters)' },
        { status: 400 }
      );
    }

    if (body.phone && !isValidAustralianMobile(body.phone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Australian phone format' },
        { status: 400 }
      );
    }

    const newStaff = await createStaffMember({
      full_name: fullName,
      phone: body.phone,
      email: body.email,
      role: body.role,
      employment_type: body.employment_type,
      specializations: body.specializations,
      bio_en: body.bio_en,
      bio_vi: body.bio_vi,
      avatar_url: body.avatar_url || body.image_url,
      image_url: body.image_url || body.avatar_url,
    });

    await triggerCmsRevalidation({ path: '/[locale]/about', type: 'page' });

    return NextResponse.json(
      {
        success: true,
        staff_id: newStaff.id,
        staff: newStaff,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to create staff member' },
      { status: 400 }
    );
  }
}
