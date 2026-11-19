/**
 * In-memory mock store for CRM Customers, Consultations, and Visit History
 * Used in offline/test environments and fallback when Supabase is not configured.
 */

export interface MockCustomer {
  id: string;
  full_name: string;
  name?: string;
  phone: string;
  email: string | null;
  address: string | null;
  preferred_language: 'en' | 'vi';
  nail_shape_preference: string | null;
  nail_shape?: string;
  nail_length_preference?: 'Short' | 'Medium' | 'Long' | 'Extra Long' | null;
  nail_length?: string;
  preferred_services: string[];
  preferred_products?: string[];
  allergies_sensitivities: string | null;
  allergies?: string | null;
  general_notes: string | null;
  notes?: string;
  total_visits: number;
  total_visits_count?: number;
  total_spent_aud: number;
  total_spend_cents?: number;
  first_visit_date: string | null;
  last_visit_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MockConsultation {
  id: string;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  email: string | null;
  preferred_language: 'en' | 'vi';
  preferred_date: string | null;
  preferred_time: string | null;
  service_requested_id: string | null;
  services_requested: string[];
  notes: string | null;
  status: 'new' | 'contacted' | 'booked' | 'completed' | 'cancelled';
  source: 'web_form' | 'phone' | 'walk_in' | 'social_media';
  converted_customer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface MockVisit {
  id: string;
  customer_id: string;
  staff_id: string | null;
  service_id: string | null;
  visit_date: string;
  services_rendered: Array<{ name: string; price_cents?: number; price_aud?: number }>;
  price_charged_aud: number;
  tip_aud: number;
  total_paid_aud: number;
  total_amount_cents?: number;
  payment_method: string;
  notes: string | null;
  rating: number | null;
  photo_urls: string[];
  created_at: string;
  updated_at: string;
}

export interface MockTransaction {
  id: string;
  type: 'revenue' | 'expense' | 'income';
  category: string;
  category_id?: string;
  amount_cents: number;
  amount_aud: number;
  payment_method: string;
  reference_id: string | null;
  staff_id: string | null;
  customer_id: string | null;
  date: string;
  description: string;
  created_at: string;
}

export const INITIAL_MOCK_CUSTOMERS: MockCustomer[] = [
  {
    id: '80000000-0000-0000-0000-000000000001',
    full_name: 'Emily Watson',
    name: 'Emily Watson',
    phone: '0412 345 678',
    email: 'emily.watson@gmail.com',
    address: '12 Miller Street, North Sydney NSW 2060',
    preferred_language: 'en',
    nail_shape_preference: 'Almond',
    nail_shape: 'Almond',
    nail_length_preference: 'Medium',
    nail_length: 'Medium',
    preferred_services: ['SNS Dipping Powder', 'Chrome'],
    preferred_products: ['SNS Dipping Powder', 'Chrome'],
    allergies_sensitivities: 'Sensitive to acetone soak-offs; prefers peel-base or foil wrap.',
    allergies: 'Sensitive to acetone soak-offs; prefers peel-base or foil wrap.',
    general_notes: 'Prefers quiet appointment slots. Always drinks herbal tea.',
    notes: 'Prefers quiet appointment slots. Always drinks herbal tea.',
    total_visits: 4,
    total_visits_count: 4,
    total_spent_aud: 320.0,
    total_spend_cents: 32000,
    first_visit_date: '2026-08-10',
    last_visit_date: '2026-11-02',
    is_active: true,
    created_at: '2026-08-10T10:00:00Z',
    updated_at: '2026-11-02T12:00:00Z',
  },
  {
    id: '80000000-0000-0000-0000-000000000002',
    full_name: 'Nguyễn Thị Lan Anh',
    name: 'Nguyễn Thị Lan Anh',
    phone: '0423 456 789',
    email: 'lananh.nguyen@yahoo.com',
    address: '45 Victoria Avenue, Chatswood NSW 2067',
    preferred_language: 'vi',
    nail_shape_preference: 'Coffin',
    nail_shape: 'Coffin',
    nail_length_preference: 'Long',
    nail_length: 'Long',
    preferred_services: ['Acrylic & Extensions', '3D Nail Sculpture'],
    preferred_products: ['Acrylic & Extensions', '3D Nail Sculpture'],
    allergies_sensitivities: null,
    allergies: null,
    general_notes: 'Yêu thích phong cách vẽ hoa nổi 3D và đính đá phong thuỷ.',
    notes: 'Yêu thích phong cách vẽ hoa nổi 3D và đính đá phong thuỷ.',
    total_visits: 2,
    total_visits_count: 2,
    total_spent_aud: 190.0,
    total_spend_cents: 19000,
    first_visit_date: '2026-10-15',
    last_visit_date: '2026-11-06',
    is_active: true,
    created_at: '2026-10-15T09:30:00Z',
    updated_at: '2026-11-06T11:00:00Z',
  },
  {
    id: '80000000-0000-0000-0000-000000000003',
    full_name: 'Olivia Davies',
    name: 'Olivia Davies',
    phone: '0434 567 890',
    email: 'olivia.davies@outlook.com',
    address: '88 Crown Street, Surry Hills NSW 2010',
    preferred_language: 'en',
    nail_shape_preference: 'Square',
    nail_shape: 'Square',
    nail_length_preference: 'Short',
    nail_length: 'Short',
    preferred_services: ['Russian E-File Manicure', 'Pedicure'],
    preferred_products: ['Russian E-File Manicure', 'Pedicure'],
    allergies_sensitivities: 'Mild latex allergy. Ensure vinyl/nitrile gloves only.',
    allergies: 'Mild latex allergy. Ensure vinyl/nitrile gloves only.',
    general_notes: 'Enjoys luxury spa pedicures with paraffin wax treatments.',
    notes: 'Enjoys luxury spa pedicures with paraffin wax treatments.',
    total_visits: 1,
    total_visits_count: 1,
    total_spent_aud: 85.0,
    total_spend_cents: 8500,
    first_visit_date: '2026-11-01',
    last_visit_date: '2026-11-01',
    is_active: true,
    created_at: '2026-11-01T14:00:00Z',
    updated_at: '2026-11-01T15:30:00Z',
  },
  {
    id: '80000000-0000-0000-0000-000000000004',
    full_name: 'Trần Hương Giang',
    name: 'Trần Hương Giang',
    phone: '0445 678 901',
    email: 'giang.tran@gmail.com',
    address: '3/14 Marrickville Road, Marrickville NSW 2204',
    preferred_language: 'vi',
    nail_shape_preference: 'Oval',
    nail_shape: 'Oval',
    nail_length_preference: 'Medium',
    nail_length: 'Medium',
    preferred_services: ['SNS & Dipping'],
    preferred_products: ['SNS & Dipping'],
    allergies_sensitivities: null,
    allergies: null,
    general_notes: 'Móng tự nhiên mỏng, ưu tiên nhúng bột có canxi dưỡng móng.',
    notes: 'Móng tự nhiên mỏng, ưu tiên nhúng bột có canxi dưỡng móng.',
    total_visits: 3,
    total_visits_count: 3,
    total_spent_aud: 225.0,
    total_spend_cents: 22500,
    first_visit_date: '2026-09-05',
    last_visit_date: '2026-10-28',
    is_active: true,
    created_at: '2026-09-05T11:00:00Z',
    updated_at: '2026-10-28T13:00:00Z',
  },
  {
    id: '80000000-0000-0000-0000-000000000005',
    full_name: 'Nguyễn Thị Mai Lan',
    name: 'Nguyễn Thị Mai Lan',
    phone: '0412 345 678',
    email: 'mailan.nguyen@example.com.au',
    address: '100 George Street, Sydney NSW 2000',
    preferred_language: 'vi',
    nail_shape_preference: 'Oval',
    nail_shape: 'Oval',
    nail_length_preference: 'Short',
    nail_length: 'Short',
    preferred_services: ['SNS Dipping Powder', 'Gel Polish'],
    preferred_products: ['SNS Dipping Powder', 'Gel Polish'],
    allergies_sensitivities: 'Severe Acetone sensitivity, Latex allergy',
    allergies: 'Severe Acetone sensitivity, Latex allergy',
    general_notes: 'Móng oval ngắn, chuộng màu pastel nhẹ, da tay mỏng dễ kích ứng',
    notes: 'Móng oval ngắn, chuộng màu pastel nhẹ, da tay mỏng dễ kích ứng',
    total_visits: 1,
    total_visits_count: 1,
    total_spent_aud: 75.0,
    total_spend_cents: 7500,
    first_visit_date: '2026-10-01',
    last_visit_date: '2026-10-01',
    is_active: true,
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
  },
  {
    id: '80000000-0000-0000-0000-000000000006',
    full_name: 'Đặng Thị Đoan Trang',
    name: 'Đặng Thị Đoan Trang',
    phone: '0421 111 222',
    email: 'doantrang@example.com',
    address: '22 Campbell Street, Haymarket NSW 2000',
    preferred_language: 'vi',
    nail_shape_preference: 'Coffin',
    nail_shape: 'Coffin',
    nail_length_preference: 'Long',
    nail_length: 'Long',
    preferred_services: ['Acrylic & Extensions'],
    preferred_products: ['Acrylic & Extensions'],
    allergies_sensitivities: null,
    allergies: null,
    general_notes: 'Thích màu đỏ đô và đính charm',
    notes: 'Thích màu đỏ đô và đính charm',
    total_visits: 2,
    total_visits_count: 2,
    total_spent_aud: 160.0,
    total_spend_cents: 16000,
    first_visit_date: '2026-10-20',
    last_visit_date: '2026-11-05',
    is_active: true,
    created_at: '2026-10-20T10:00:00Z',
    updated_at: '2026-11-05T12:00:00Z',
  },
];

export const INITIAL_MOCK_CONSULTATIONS: MockConsultation[] = [
  {
    id: 'inq-001',
    customer_id: null,
    customer_name: 'Sophie Clark',
    phone: '0450 111 222',
    email: 'sophie.c@example.com',
    preferred_language: 'en',
    preferred_date: '2026-11-20',
    preferred_time: '14:00',
    service_requested_id: null,
    services_requested: ['Russian E-File Manicure'],
    notes: 'First time getting Russian manicure, curious about cuticle care',
    status: 'new',
    source: 'web_form',
    created_at: '2026-11-15T08:30:00Z',
    updated_at: '2026-11-15T08:30:00Z',
  },
  {
    id: 'inq-002',
    customer_id: '80000000-0000-0000-0000-000000000001',
    customer_name: 'Emily Watson',
    phone: '0412 345 678',
    email: 'emily.watson@gmail.com',
    preferred_language: 'en',
    preferred_date: '2026-11-22',
    preferred_time: '11:00',
    service_requested_id: null,
    services_requested: ['SNS Dipping Powder'],
    notes: 'Need fresh holiday set before leaving for Gold Coast',
    status: 'contacted',
    source: 'web_form',
    created_at: '2026-11-14T09:00:00Z',
    updated_at: '2026-11-14T11:00:00Z',
  },
];

export const INITIAL_MOCK_VISITS: MockVisit[] = [
  {
    id: 'vis-001',
    customer_id: '80000000-0000-0000-0000-000000000001',
    staff_id: 'stf-001',
    service_id: null,
    visit_date: '2026-11-02T10:00:00Z',
    services_rendered: [{ name: 'SNS Dipping Powder', price_cents: 7500, price_aud: 75.0 }],
    price_charged_aud: 75.0,
    tip_aud: 5.0,
    total_paid_aud: 80.0,
    total_amount_cents: 8000,
    payment_method: 'card',
    notes: 'Almond shape, neutral nude shade #42 with chrome dusting',
    rating: 5,
    photo_urls: [],
    created_at: '2026-11-02T11:00:00Z',
    updated_at: '2026-11-02T11:00:00Z',
  },
];

export const INITIAL_MOCK_TRANSACTIONS: MockTransaction[] = [
  {
    id: 'tx-rev-001',
    type: 'revenue',
    category: 'Services',
    amount_cents: 8000,
    amount_aud: 80.0,
    payment_method: 'card',
    reference_id: 'vis-001',
    staff_id: 'stf-001',
    customer_id: '80000000-0000-0000-0000-000000000001',
    date: '2026-11-02',
    description: 'Service visit - Emily Watson',
    created_at: '2026-11-02T11:00:00Z',
  },
];

class MockCrmStore {
  customers: MockCustomer[] = INITIAL_MOCK_CUSTOMERS.map((c) => ({ ...c }));
  consultations: MockConsultation[] = INITIAL_MOCK_CONSULTATIONS.map((c) => ({ ...c }));
  visits: MockVisit[] = INITIAL_MOCK_VISITS.map((v) => ({ ...v }));
  transactions: MockTransaction[] = INITIAL_MOCK_TRANSACTIONS.map((t) => ({ ...t }));

  reset() {
    this.customers = INITIAL_MOCK_CUSTOMERS.map((c) => ({ ...c }));
    this.consultations = INITIAL_MOCK_CONSULTATIONS.map((c) => ({ ...c }));
    this.visits = INITIAL_MOCK_VISITS.map((v) => ({ ...v }));
    this.transactions = INITIAL_MOCK_TRANSACTIONS.map((t) => ({ ...t }));
  }
}

export const mockCrmStore = new MockCrmStore();
