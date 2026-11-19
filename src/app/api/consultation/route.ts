import { NextResponse } from 'next/server';
import { formatAustralianMobile } from '@/lib/utils/validation';
import { consultationApiSchema } from '@/lib/cms/public-data';
import { createClient } from '@/lib/supabase/server';
import { createMockSupabaseClient } from '@/lib/supabase/mock';
import { dispatchConsultationAlerts } from '@/lib/notifications/dispatcher';
import { saveStoredConsultation, StoredConsultation } from '@/lib/crm/consultation-storage';

async function getSupabase() {
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return await createClient();
    }
  } catch {
    // Fall back to offline mock client
  }
  return createMockSupabaseClient();
}

export async function POST(request: Request) {
  try {
    let rawBody: any;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload in request body' },
        { status: 400 }
      );
    }

    const parseResult = consultationApiSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parseResult.error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const customerName = (data.customer_name || data.customerName)!.trim();
    const phone = formatAustralianMobile(data.phone);
    const email = data.email && data.email.trim() ? data.email.trim() : null;
    const preferredDate = data.preferred_date || data.preferredDate || null;
    const preferredTime = data.preferred_time || data.preferredTime || null;
    const preferredLanguage = data.preferred_language || data.preferredLanguage || 'en';
    const servicesRequested = data.services_requested || data.serviceRequestedIds || [];
    const notes = data.notes && data.notes.trim() ? data.notes.trim() : null;

    const generatedId = `inq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const nowIso = new Date().toISOString();

    const insertPayload = {
      customer_name: customerName,
      phone,
      email,
      preferred_language: preferredLanguage,
      preferred_date: preferredDate,
      preferred_time: preferredTime,
      services_requested: servicesRequested,
      notes,
      status: 'new' as const,
      source: 'web_form' as const,
    };

    const supabase = await getSupabase();
    const result = await supabase
      .from('crm_consultations')
      .insert(insertPayload);

    const insertError = result?.error;
    const inserted = Array.isArray(result?.data) ? result?.data[0] : result?.data;

    if (insertError) {
      console.error('Supabase consultation insert error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to record consultation inquiry' },
        { status: 500 }
      );
    }

    const inquiryId = inserted?.id || generatedId;

    // Always persist to local file store as reliable storage
    const storedRecord: StoredConsultation = {
      id: inquiryId,
      customer_name: customerName,
      phone,
      email,
      preferred_language: preferredLanguage,
      preferred_date: preferredDate,
      preferred_time: preferredTime,
      services_requested: servicesRequested,
      notes,
      status: 'new',
      source: 'web_form',
      created_at: nowIso,
    };
    saveStoredConsultation(storedRecord);

    // Dispatches automated Telegram and Instagram alerts
    let alertResults: any = null;
    try {
      alertResults = await dispatchConsultationAlerts({
        inquiryId,
        customerName,
        phone,
        email,
        preferredDate,
        preferredTime,
        preferredLanguage,
        servicesRequested,
        notes,
      });
    } catch (notifErr: any) {
      console.warn('[Consultation notification dispatch error]:', notifErr.message);
    }

    return NextResponse.json(
      {
        success: true,
        inquiry_id: inquiryId,
        status: 'new',
        message: 'Consultation inquiry received successfully.',
        telegram_sent: alertResults?.telegram?.success ?? false,
        alerts: alertResults,
        data: {
          id: inquiryId,
          customer_name: customerName,
          status: 'new',
          created_at: nowIso,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Consultation API unhandled error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed. Use POST to submit consultation inquiries.' },
    { status: 405 }
  );
}
