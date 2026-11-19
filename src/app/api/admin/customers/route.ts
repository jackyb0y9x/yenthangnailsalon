import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { getCustomers, createCustomer } from '@/lib/crm/customers';
import { isValidAustralianMobile } from '@/lib/utils/validation';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session.isAuthenticated) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Admin authentication required' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || searchParams.get('query') || undefined;
  const rawPage = parseInt(searchParams.get('page') || '1', 10);
  const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
  const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
  const limit = Math.max(1, isNaN(rawLimit) ? 50 : rawLimit);
  const shape = searchParams.get('shape') || undefined;
  const hasAllergyParam = searchParams.get('has_allergy') || searchParams.get('hasAllergy');
  const hasAllergy = hasAllergyParam !== null ? hasAllergyParam === 'true' : undefined;
  const includeInactive =
    searchParams.get('include_inactive') === 'true' ||
    searchParams.get('includeInactive') === 'true';

  const result = await getCustomers({
    search,
    page,
    limit,
    shape,
    hasAllergy,
    includeInactive,
  });

  return NextResponse.json({
    success: true,
    customers: result.customers,
    pagination: result.pagination,
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

  try {
    const body = await request.json();
    const fullName = body.full_name || body.name;
    const phone = body.phone;

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2 || !phone) {
      return NextResponse.json(
        { success: false, error: 'Name and Australian phone required' },
        { status: 400 }
      );
    }

    if (!isValidAustralianMobile(phone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Australian phone format' },
        { status: 400 }
      );
    }

    const newCustomer = await createCustomer({
      full_name: fullName,
      phone,
      email: body.email,
      address: body.address,
      preferred_language: body.preferred_language,
      nail_shape_preference: body.nail_shape_preference || body.nail_shape,
      nail_length_preference: body.nail_length_preference || body.nail_length,
      preferred_services: body.preferred_services || body.preferred_products,
      allergies_sensitivities: body.allergies_sensitivities || body.allergies,
      general_notes: body.general_notes || body.notes,
    });

    return NextResponse.json(
      {
        success: true,
        customer_id: newCustomer.id,
        customer: newCustomer,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to create customer' },
      { status: 400 }
    );
  }
}
