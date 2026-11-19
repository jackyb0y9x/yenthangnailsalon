import { createClient } from '@/lib/supabase/server';
import { createMockSupabaseClient } from '@/lib/supabase/mock';
import { mockCrmStore, MockCustomer, MockConsultation, MockVisit, MockTransaction } from './mock-customers';
import { formatAustralianMobile, isValidAustralianMobile } from '@/lib/utils/validation';
import {
  mergeWithStoredCustomers,
  persistNewCustomer,
  persistUpdatedCustomer,
  persistDeletedCustomer,
} from './customer-storage';
import {
  removeVietnameseDiacritics,
  normalizeVietnamese,
  normalizePhoneForSearch,
  matchesPhoneSearch,
  matchesCustomerSearch,
  sanitizeXss,
} from '@/lib/utils/vietnamese';

export {
  removeVietnameseDiacritics,
  normalizeVietnamese,
  normalizePhoneForSearch,
  matchesPhoneSearch,
  matchesCustomerSearch,
  sanitizeXss,
};

/**
 * Dual property aliases formatter ensuring compatibility across both Supabase
 * schema and E2E test assertions.
 */
export function formatCustomerRecord(c: any): MockCustomer {
  const fullName = c.name || c.full_name || '';
  const nailShape = c.nail_shape || c.nail_shape_preference || 'Almond';
  const nailLength = c.nail_length || c.nail_length_preference || 'Medium';
  const allergies = c.allergies !== undefined ? c.allergies : (c.allergies_sensitivities || null);
  const totalVisits = c.total_visits_count ?? c.total_visits ?? 0;
  const totalSpentAud =
    c.total_spent_aud !== undefined
      ? Number(c.total_spent_aud)
      : c.total_spend_cents !== undefined
      ? c.total_spend_cents / 100
      : 0;
  const totalSpendCents =
    c.total_spend_cents !== undefined ? c.total_spend_cents : Math.round(totalSpentAud * 100);

  const preferred = c.preferred_services || c.preferred_products || [];

  return {
    ...c,
    id: c.id,
    name: fullName,
    full_name: fullName,
    phone: c.phone,
    email: c.email || '',
    address: c.address || null,
    preferred_language: c.preferred_language || 'en',
    nail_shape: nailShape,
    nail_shape_preference: nailShape,
    nail_length: nailLength,
    nail_length_preference: nailLength,
    preferred_services: preferred,
    preferred_products: preferred,
    allergies: allergies ? sanitizeXss(allergies) : null,
    allergies_sensitivities: allergies ? sanitizeXss(allergies) : null,
    general_notes: c.general_notes || c.notes ? sanitizeXss(c.general_notes || c.notes) : '',
    notes: c.notes || c.general_notes ? sanitizeXss(c.notes || c.general_notes) : '',
    total_visits: totalVisits,
    total_visits_count: totalVisits,
    total_spent_aud: totalSpentAud,
    total_spend_cents: totalSpendCents,
    first_visit_date: c.first_visit_date || null,
    last_visit_date: c.last_visit_date || null,
    is_active: c.is_active !== false,
    created_at: c.created_at || new Date().toISOString(),
    updated_at: c.updated_at || new Date().toISOString(),
  };
}



/**
 * Check if Supabase live credentials are fully configured.
 */
function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Returns Supabase server client or offline mock client.
 */
async function getSupabase() {
  if (isSupabaseConfigured()) {
    try {
      return await createClient();
    } catch {
      // Fallback to mock on server error
    }
  }
  return createMockSupabaseClient();
}

// ============================================================================
// Customer Data Access Methods
// ============================================================================

export interface CustomerSearchParams {
  search?: string;
  page?: number;
  limit?: number;
  shape?: string;
  hasAllergy?: boolean;
  includeInactive?: boolean;
}

export async function getCustomers(options: CustomerSearchParams = {}) {
  const {
    search,
    page: rawPage = 1,
    limit: rawLimit = 50,
    shape,
    hasAllergy,
    includeInactive = false,
  } = options;

  const page = Math.max(1, isNaN(rawPage) ? 1 : Math.floor(rawPage));
  const limit = Math.max(1, isNaN(rawLimit) ? 50 : Math.floor(rawLimit));

  let customers: MockCustomer[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabase();
      let query = supabase.from('crm_customers').select('*');
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      if (shape) {
        query = query.eq('nail_shape_preference', shape);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        customers = data.map(formatCustomerRecord);
      }
    } catch {
      customers = [];
    }
  }

  // Fallback to mock store if database empty or offline
  if (customers.length === 0) {
    customers = mockCrmStore.customers
      .filter((c) => includeInactive || c.is_active)
      .map(formatCustomerRecord);
  }

  // Merge with stored/custom customers
  customers = mergeWithStoredCustomers(customers);

  if (!includeInactive) {
    customers = customers.filter((c) => c.is_active);
  }

  // Filter in memory for shape and allergies if not done at DB level
  if (shape) {
    customers = customers.filter(
      (c) => c.nail_shape === shape || c.nail_shape_preference === shape
    );
  }

  if (hasAllergy !== undefined) {
    customers = customers.filter((c) => {
      const has = Boolean(
        c.allergies &&
          c.allergies !== 'None' &&
          c.allergies.toLowerCase() !== 'none' &&
          c.allergies.trim() !== ''
      );
      return hasAllergy ? has : !has;
    });
  }

  // Filter by search query (Vietnamese accent-insensitive & phone formatting)
  if (search && search.trim()) {
    customers = customers.filter((c) => matchesCustomerSearch(c, search));
  }

  const total = customers.length;
  const startIndex = (page - 1) * limit;
  const paginated = customers.slice(startIndex, startIndex + limit);

  return {
    customers: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getCustomerById(id: string) {
  let customer: MockCustomer | null = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('crm_customers')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!error && data) {
        customer = formatCustomerRecord(data);
      }
    } catch {
      customer = null;
    }
  }

  if (!customer) {
    const found = mockCrmStore.customers.find((c) => c.id === id);
    if (found) {
      customer = formatCustomerRecord(found);
    }
  }

  if (!customer) return null;

  // Retrieve visit history
  let visits: MockVisit[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabase();
      const { data } = await supabase
        .from('crm_visit_history')
        .select('*')
        .eq('customer_id', id)
        .order('visit_date', { ascending: false });
      if (data) visits = data;
    } catch {
      visits = [];
    }
  }
  if (visits.length === 0) {
    visits = mockCrmStore.visits.filter((v) => v.customer_id === id);
  }

  // Retrieve consultation inquiries
  let consultations: MockConsultation[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabase();
      const { data } = await supabase
        .from('crm_consultations')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });
      if (data) consultations = data;
    } catch {
      consultations = [];
    }
  }
  if (consultations.length === 0) {
    consultations = mockCrmStore.consultations.filter(
      (c) => c.customer_id === id || c.converted_customer_id === id || c.phone === customer?.phone
    );
  }

  return {
    ...customer,
    visits,
    consultations,
  };
}

export async function createCustomer(payload: {
  full_name?: string;
  name?: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  preferred_language?: 'en' | 'vi';
  nail_shape_preference?: string | null;
  nail_shape?: string;
  nail_length_preference?: 'Short' | 'Medium' | 'Long' | 'Extra Long' | null;
  nail_length?: string;
  preferred_services?: string[];
  preferred_products?: string[];
  allergies_sensitivities?: string | null;
  allergies?: string | null;
  general_notes?: string | null;
  notes?: string;
}) {
  const fullName = (payload.full_name || payload.name || '').trim();
  const phone = formatAustralianMobile(payload.phone);
  const email = payload.email?.trim() || null;
  const address = payload.address?.trim() || null;
  const preferredLanguage = payload.preferred_language || 'en';
  const nailShape = payload.nail_shape || payload.nail_shape_preference || 'Almond';
  const nailLength = payload.nail_length || payload.nail_length_preference || 'Medium';
  const preferred = payload.preferred_services || payload.preferred_products || [];
  const rawAllergies = payload.allergies || payload.allergies_sensitivities || null;
  const rawNotes = payload.notes || payload.general_notes || null;
  const allergies = rawAllergies ? sanitizeXss(rawAllergies) : null;
  const notes = rawNotes ? sanitizeXss(rawNotes) : null;

  const newId = `cust-${Date.now()}`;
  const now = new Date().toISOString();

  const record: MockCustomer = formatCustomerRecord({
    id: newId,
    full_name: fullName,
    name: fullName,
    phone,
    email,
    address,
    preferred_language: preferredLanguage,
    nail_shape_preference: nailShape,
    nail_shape: nailShape,
    nail_length_preference: nailLength,
    nail_length: nailLength,
    preferred_services: preferred,
    preferred_products: preferred,
    allergies_sensitivities: allergies,
    allergies,
    general_notes: notes,
    notes,
    total_visits: 0,
    total_visits_count: 0,
    total_spent_aud: 0,
    total_spend_cents: 0,
    first_visit_date: null,
    last_visit_date: null,
    is_active: true,
    created_at: now,
    updated_at: now,
  });

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('crm_customers')
        .insert({
          full_name: fullName,
          phone,
          email,
          address,
          preferred_language: preferredLanguage,
          nail_shape_preference: nailShape,
          nail_length_preference: nailLength as any,
          preferred_services: preferred,
          allergies_sensitivities: allergies,
          general_notes: notes,
          is_active: true,
        })
        .select()
        .single();
      if (!error && data) {
        const formatted = formatCustomerRecord(data);
        mockCrmStore.customers.unshift(formatted);
        persistNewCustomer(formatted);
        return formatted;
      }
    } catch {
      // Fallback to in-memory store
    }
  }

  mockCrmStore.customers.unshift(record);
  persistNewCustomer(record);
  return record;
}

export async function updateCustomer(id: string, updates: any) {
  const existing = await getCustomerById(id);
  if (!existing) return null;

  const sanitizedUpdates = { ...updates };
  if (sanitizedUpdates.notes !== undefined) {
    sanitizedUpdates.notes = sanitizedUpdates.notes ? sanitizeXss(sanitizedUpdates.notes) : sanitizedUpdates.notes;
  }
  if (sanitizedUpdates.general_notes !== undefined) {
    sanitizedUpdates.general_notes = sanitizedUpdates.general_notes ? sanitizeXss(sanitizedUpdates.general_notes) : sanitizedUpdates.general_notes;
  }
  if (sanitizedUpdates.allergies !== undefined) {
    sanitizedUpdates.allergies = sanitizedUpdates.allergies ? sanitizeXss(sanitizedUpdates.allergies) : sanitizedUpdates.allergies;
  }
  if (sanitizedUpdates.allergies_sensitivities !== undefined) {
    sanitizedUpdates.allergies_sensitivities = sanitizedUpdates.allergies_sensitivities ? sanitizeXss(sanitizedUpdates.allergies_sensitivities) : sanitizedUpdates.allergies_sensitivities;
  }

  const merged = { ...existing, ...sanitizedUpdates, updated_at: new Date().toISOString() };
  const formatted = formatCustomerRecord(merged);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabase();
      await supabase
        .from('crm_customers')
        .update({
          full_name: formatted.full_name,
          phone: formatted.phone,
          email: formatted.email,
          address: formatted.address,
          preferred_language: formatted.preferred_language,
          nail_shape_preference: formatted.nail_shape_preference,
          nail_length_preference: formatted.nail_length_preference as any,
          preferred_services: formatted.preferred_services,
          allergies_sensitivities: formatted.allergies_sensitivities,
          general_notes: formatted.general_notes,
          is_active: formatted.is_active,
          updated_at: formatted.updated_at,
        })
        .eq('id', id);
    } catch {
      // Fallback to in-memory store
    }
  }

  const idx = mockCrmStore.customers.findIndex((c) => c.id === id);
  if (idx !== -1) {
    Object.assign(mockCrmStore.customers[idx], formatted);
  } else {
    mockCrmStore.customers.unshift(formatted);
  }

  persistUpdatedCustomer(id, formatted);
  return formatted;
}

export async function updateCustomerPreferences(
  id: string,
  preferences: {
    nail_shape?: string;
    nail_length?: string;
    preferred_products?: string[];
    allergies?: string;
    notes?: string;
  }
) {
  return updateCustomer(id, {
    nail_shape: preferences.nail_shape,
    nail_shape_preference: preferences.nail_shape,
    nail_length: preferences.nail_length,
    nail_length_preference: preferences.nail_length,
    preferred_products: preferences.preferred_products,
    preferred_services: preferences.preferred_products,
    allergies: preferences.allergies,
    allergies_sensitivities: preferences.allergies,
    notes: preferences.notes,
    general_notes: preferences.notes,
  });
}

export async function softDeleteCustomer(id: string) {
  const existing = await getCustomerById(id);
  if (!existing) return false;

  await updateCustomer(id, { is_active: false });
  return true;
}

// ============================================================================
// Consultations / Inquiries Triage Methods
// ============================================================================

export async function getInquiries(options: { status?: string; search?: string } = {}) {
  let inquiries: MockConsultation[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabase();
      let query = supabase.from('crm_consultations').select('*');
      if (options.status && options.status !== 'all') {
        query = query.eq('status', options.status);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        inquiries = data;
      }
    } catch {
      inquiries = [];
    }
  }

  if (inquiries.length === 0) {
    inquiries = [...mockCrmStore.consultations];
    if (options.status && options.status !== 'all') {
      inquiries = inquiries.filter((i) => i.status === options.status);
    }
  }

  if (options.search && options.search.trim()) {
    const q = options.search.trim().toLowerCase();
    inquiries = inquiries.filter(
      (i) =>
        i.customer_name.toLowerCase().includes(q) ||
        i.phone.includes(q) ||
        (i.email && i.email.toLowerCase().includes(q))
    );
  }

  // Ensure stored XSS sanitization on notes
  return inquiries.map((inq) => ({
    ...inq,
    notes: sanitizeXss(inq.notes),
  }));
}

export async function getInquiryById(id: string) {
  let inq: MockConsultation | null = null;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabase();
      const { data } = await supabase
        .from('crm_consultations')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (data) inq = data;
    } catch {
      inq = null;
    }
  }

  if (!inq) {
    const found = mockCrmStore.consultations.find((c) => c.id === id);
    if (found) inq = { ...found };
  }

  if (!inq) return null;
  return {
    ...inq,
    notes: sanitizeXss(inq.notes),
  };
}

export async function updateInquiryStatus(
  id: string,
  params: {
    status?: 'new' | 'contacted' | 'booked' | 'completed' | 'cancelled';
    convert_to_customer?: boolean;
    notes?: string;
  }
) {
  const inq = await getInquiryById(id);
  if (!inq) return null;

  const newStatus = params.status || inq.status;
  let convertedCustomerId = inq.converted_customer_id;

  // 1-Click Customer conversion when booked or explicitly requested
  if (params.convert_to_customer || newStatus === 'booked') {
    let existingCust = mockCrmStore.customers.find(
      (c) => c.phone === inq.phone || normalizePhoneForSearch(c.phone) === normalizePhoneForSearch(inq.phone)
    );

    if (!existingCust) {
      const allergyNote =
        inq.notes?.toLowerCase().includes('allergy') || inq.notes?.toLowerCase().includes('sensitive')
          ? inq.notes
          : 'None';

      existingCust = await createCustomer({
        full_name: inq.customer_name,
        phone: inq.phone,
        email: inq.email || '',
        preferred_language: inq.preferred_language,
        allergies: allergyNote,
        notes: inq.notes || '',
      });
    }

    convertedCustomerId = existingCust.id;
  }

  const updatedNotes = params.notes !== undefined ? sanitizeXss(params.notes) : inq.notes;

  const updatedInq: MockConsultation = {
    ...inq,
    status: newStatus,
    notes: updatedNotes,
    converted_customer_id: convertedCustomerId,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabase();
      await supabase
        .from('crm_consultations')
        .update({
          status: newStatus,
          notes: updatedNotes,
          customer_id: convertedCustomerId || null,
          updated_at: updatedInq.updated_at,
        })
        .eq('id', id);
    } catch {
      // Fallback to in-memory store
    }
  }

  const idx = mockCrmStore.consultations.findIndex((c) => c.id === id);
  if (idx !== -1) {
    mockCrmStore.consultations[idx] = updatedInq;
  } else {
    mockCrmStore.consultations.unshift(updatedInq);
  }

  return updatedInq;
}

// ============================================================================
// Visit Logging & Automated Financial Reconciliation
// ============================================================================

export interface LogVisitPayload {
  customer_id: string;
  staff_id?: string | null;
  visit_date?: string;
  services_rendered?: Array<{ name: string; price_cents?: number; price_aud?: number }>;
  total_amount_cents?: number;
  total_amount_aud?: number;
  price_charged_aud?: number;
  tip_aud?: number;
  payment_method?: string;
  notes?: string;
  rating?: number;
}

export async function logVisit(payload: LogVisitPayload) {
  const {
    customer_id,
    staff_id = null,
    visit_date = new Date().toISOString(),
    services_rendered = [],
    payment_method = 'EFTPOS',
    notes = '',
    rating = 5,
  } = payload;

  const totalCents =
    payload.total_amount_cents ??
    Math.round(
      (payload.total_amount_aud ??
        payload.price_charged_aud ??
        services_rendered.reduce((sum, s) => sum + (s.price_cents || (s.price_aud ? s.price_aud * 100 : 0)), 0)) *
        (payload.total_amount_aud !== undefined || payload.price_charged_aud !== undefined ? 100 : 1)
    );

  const totalAud = totalCents / 100;
  const tipAud = payload.tip_aud || 0;
  const priceChargedAud = payload.price_charged_aud ?? (totalAud - tipAud > 0 ? totalAud - tipAud : totalAud);

  // 1. Increment customer totals
  const customer = await getCustomerById(customer_id);
  if (customer) {
    const updatedVisits = (customer.total_visits_count || customer.total_visits || 0) + 1;
    const updatedSpendCents = (customer.total_spend_cents || 0) + totalCents;
    const updatedSpendAud = updatedSpendCents / 100;

    await updateCustomer(customer_id, {
      total_visits: updatedVisits,
      total_visits_count: updatedVisits,
      total_spend_cents: updatedSpendCents,
      total_spent_aud: updatedSpendAud,
      last_visit_date: visit_date.slice(0, 10),
    });
  }

  const visitId = `vis-${Date.now()}`;
  const transactionId = `tx-rev-${Date.now()}`;

  const visitRecord: MockVisit = {
    id: visitId,
    customer_id,
    staff_id,
    service_id: null,
    visit_date,
    services_rendered,
    price_charged_aud: priceChargedAud,
    tip_aud: tipAud,
    total_paid_aud: totalAud,
    total_amount_cents: totalCents,
    payment_method,
    notes,
    rating,
    photo_urls: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 2. Insert into mock visits store
  mockCrmStore.visits.push(visitRecord);

  // 3. Auto-reconcile revenue transaction in finance_transactions
  const transactionRecord: MockTransaction = {
    id: transactionId,
    type: 'revenue',
    category: 'Services',
    amount_cents: totalCents,
    amount_aud: totalAud,
    payment_method,
    reference_id: visitId,
    staff_id,
    customer_id,
    date: visit_date.slice(0, 10),
    description: `Service visit - ${customer?.name || customer?.full_name || 'Customer'}`,
    created_at: new Date().toISOString(),
  };

  mockCrmStore.transactions.push(transactionRecord);

  // 4. If Supabase configured, insert records to database
  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabase();
      await supabase.from('crm_visit_history').insert({
        customer_id,
        staff_id,
        visit_date: visit_date.slice(0, 10),
        price_charged_aud: priceChargedAud,
        tip_aud: tipAud,
        payment_method: payment_method.toLowerCase() as any,
        notes,
        rating,
        services_rendered: services_rendered as any,
      });

      await supabase.from('finance_transactions').insert({
        type: 'income',
        amount_aud: totalAud,
        payment_method: payment_method.toLowerCase() as any,
        reference_id: visitId,
        staff_id,
        customer_id,
        transaction_date: visit_date.slice(0, 10),
        description: `Service visit - ${customer?.full_name || 'Customer'}`,
      });
    } catch {
      // Handled via in-memory store
    }
  }

  return {
    success: true,
    visit_id: visitId,
    transaction_id: transactionId,
    visit: visitRecord,
    transaction: transactionRecord,
  };
}

export async function getVisits(options: { customerId?: string; staffId?: string } = {}) {
  let visits = [...mockCrmStore.visits];
  if (options.customerId) {
    visits = visits.filter((v) => v.customer_id === options.customerId);
  }
  if (options.staffId) {
    visits = visits.filter((v) => v.staff_id === options.staffId);
  }
  return visits.sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
}
