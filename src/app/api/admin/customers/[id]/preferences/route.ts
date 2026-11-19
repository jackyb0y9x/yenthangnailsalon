import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { getCustomerById, updateCustomerPreferences } from '@/lib/crm/customers';

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

  const { id } = await params;
  const existing = await getCustomerById(id);
  if (!existing) {
    return NextResponse.json(
      { success: false, error: 'Customer not found' },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const updated = await updateCustomerPreferences(id, {
      nail_shape: body.nail_shape || body.nail_shape_preference,
      nail_length: body.nail_length || body.nail_length_preference,
      preferred_products: body.preferred_products || body.preferred_services,
      allergies: body.allergies || body.allergies_sensitivities,
      notes: body.notes || body.general_notes,
    });

    return NextResponse.json({
      success: true,
      customer: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update preferences' },
      { status: 400 }
    );
  }
}
