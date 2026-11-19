import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { canAccessFinance } from '@/lib/auth/roles';
import { getTransactions, createTransaction, deleteTransaction } from '@/lib/finance/store';
import { transactionSchema } from '@/lib/utils/validation';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session.isAuthenticated) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Admin authentication required' },
      { status: 401 }
    );
  }

  if (!canAccessFinance(session.role)) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Staff role not authorized to view financial records' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as any;
  const categoryId = searchParams.get('categoryId') || searchParams.get('category_id') || undefined;
  const paymentMethod = searchParams.get('paymentMethod') || searchParams.get('payment_method') || undefined;
  const startDate = searchParams.get('startDate') || searchParams.get('start_date') || undefined;
  const endDate = searchParams.get('endDate') || searchParams.get('end_date') || undefined;
  const search = searchParams.get('search') || searchParams.get('q') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const sortBy = searchParams.get('sortBy') as any;
  const sortOrder = searchParams.get('sortOrder') as any;

  const isTaxDeductibleParam = searchParams.get('is_tax_deductible') || searchParams.get('isTaxDeductible');
  const isTaxDeductible = isTaxDeductibleParam !== null ? isTaxDeductibleParam === 'true' : undefined;

  const result = await getTransactions({
    type,
    categoryId,
    paymentMethod,
    startDate,
    endDate,
    search,
    page: isNaN(page) ? 1 : page,
    limit: isNaN(limit) ? 50 : limit,
    sortBy,
    sortOrder,
    isTaxDeductible,
  });

  return NextResponse.json({
    success: true,
    transactions: result.transactions,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
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

  if (!canAccessFinance(session.role)) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Staff role not authorized to view financial records' },
      { status: 403 }
    );
  }

  try {
    const rawBody = await request.json();

    // Support camelCase or snake_case payload
    const normalizedBody = {
      transactionDate: rawBody.transactionDate || rawBody.transaction_date || rawBody.date || new Date().toISOString().slice(0, 10),
      type: rawBody.type,
      categoryId: rawBody.categoryId || rawBody.category_id,
      amountCents: rawBody.amountCents || rawBody.amount_cents,
      amountAud: rawBody.amountAud || rawBody.amount_aud,
      gstCents: rawBody.gstCents || rawBody.gst_cents,
      paymentMethod: rawBody.paymentMethod || rawBody.payment_method || 'eftpos',
      description: rawBody.description,
      referenceId: rawBody.referenceId || rawBody.reference_id,
      customerId: rawBody.customerId || rawBody.customer_id,
      staffId: rawBody.staffId || rawBody.staff_id,
      vendorName: rawBody.vendorName || rawBody.vendor_name,
      isTaxDeductible: rawBody.isTaxDeductible !== undefined ? rawBody.isTaxDeductible : rawBody.is_tax_deductible,
      notes: rawBody.notes,
    };

    const parseResult = transactionSchema.safeParse(normalizedBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          issues: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const validData = parseResult.data;

    const newTx = await createTransaction({
      transactionDate: validData.transactionDate,
      type: validData.type,
      categoryId: validData.categoryId,
      categoryName: rawBody.categoryName || rawBody.category_name,
      amountCents: validData.amountCents,
      amountAud: validData.amountAud,
      gstCents: validData.gstCents,
      paymentMethod: validData.paymentMethod,
      description: validData.description,
      referenceId: validData.referenceId,
      customerId: validData.customerId,
      staffId: validData.staffId,
      vendorName: validData.vendorName,
      isTaxDeductible: validData.isTaxDeductible,
      notes: validData.notes,
      receiptUrl: rawBody.receiptUrl || rawBody.receipt_url,
    });

    return NextResponse.json(
      {
        success: true,
        transaction_id: newTx.id,
        transaction: newTx,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process transaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session.isAuthenticated) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Admin authentication required' },
      { status: 401 }
    );
  }

  if (!canAccessFinance(session.role)) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Staff role not authorized to view financial records' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 });
  }

  const deleted = await deleteTransaction(id);
  if (!deleted) {
    return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: 'Transaction deleted successfully' });
}
