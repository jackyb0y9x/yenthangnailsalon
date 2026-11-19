import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { getCustomerById, updateCustomer, softDeleteCustomer } from '@/lib/crm/customers';
import { isValidAustralianMobile } from '@/lib/utils/validation';

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
  const customer = await getCustomerById(id);

  if (!customer) {
    return NextResponse.json(
      { success: false, error: 'Customer not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    customer,
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

    if (body.phone && !isValidAustralianMobile(body.phone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Australian phone format' },
        { status: 400 }
      );
    }

    const updated = await updateCustomer(id, body);
    return NextResponse.json({
      success: true,
      customer: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update customer' },
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

  const { id } = await params;
  const existing = await getCustomerById(id);
  if (!existing) {
    return NextResponse.json(
      { success: false, error: 'Customer not found' },
      { status: 404 }
    );
  }

  await softDeleteCustomer(id);
  return NextResponse.json({
    success: true,
    message: 'Customer soft-deleted successfully',
  });
}
