import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { getVisits, logVisit } from '@/lib/crm/customers';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session.isAuthenticated) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Admin authentication required' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customer_id') || undefined;
  const staffId = searchParams.get('staff_id') || undefined;

  const visits = await getVisits({ customerId, staffId });
  return NextResponse.json({
    success: true,
    visits,
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
    if (!body || !body.customer_id) {
      return NextResponse.json(
        { success: false, error: 'customer_id is required' },
        { status: 400 }
      );
    }

    const result = await logVisit({
      customer_id: body.customer_id,
      staff_id: body.staff_id || null,
      visit_date: body.visit_date || new Date().toISOString(),
      services_rendered: body.services_rendered || [],
      total_amount_cents: body.total_amount_cents,
      total_amount_aud: body.total_amount_aud,
      price_charged_aud: body.price_charged_aud,
      tip_aud: body.tip_aud,
      payment_method: body.payment_method || 'EFTPOS',
      notes: body.notes || '',
      rating: body.rating,
    });

    return NextResponse.json(
      {
        success: true,
        visit_id: result.visit_id,
        transaction_id: result.transaction_id,
        visit: result.visit,
        transaction: result.transaction,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to log visit' },
      { status: 400 }
    );
  }
}
