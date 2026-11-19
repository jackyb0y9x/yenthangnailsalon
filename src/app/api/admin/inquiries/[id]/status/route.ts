import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { updateInquiryStatus } from '@/lib/crm/customers';

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
  try {
    const body = await request.json();
    const status = body.status;
    const convertToCustomer = body.convert_to_customer === true;
    const notes = body.notes;

    const updated = await updateInquiryStatus(id, {
      status,
      convert_to_customer: convertToCustomer,
      notes,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Inquiry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      inquiry: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update inquiry status' },
      { status: 400 }
    );
  }
}
