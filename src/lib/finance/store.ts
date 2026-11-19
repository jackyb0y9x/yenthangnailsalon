/**
 * Unified Financial Data Store for Australian Nail Salon.
 * Handles:
 * - Categories (Income & Expense)
 * - Transactions (Revenue & Operating Expenses with ATO 1/11th GST)
 * - CRM Visit Auto-Reconciliation (Idempotent sync)
 * - Supabase integration with seamless mock fallback
 * - Single source of truth with mockCrmStore.transactions
 */
import { calculateGST } from '@/lib/utils/currency';
import {
  calculateFinancialSummary,
  aggregateByCategory,
  filterTransactionsByDateRange,
  TransactionRecord,
  FinancialSummary,
  CategorySummary,
  FinancePaymentMethod,
} from './calculations';
import { mockCrmStore, MockTransaction } from '@/lib/crm/mock-customers';
import { getVisits } from '@/lib/crm/customers';
import { createClient } from '@/lib/supabase/server';
import { createMockSupabaseClient } from '@/lib/supabase/mock';

export interface FinanceCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  description: string | null;
  is_tax_deductible: boolean;
  is_default: boolean;
  display_order: number;
  created_at?: string;
}

export interface FinanceTransaction {
  id: string;
  transaction_date: string; // YYYY-MM-DD
  type: 'income' | 'expense' | 'revenue';
  category_id: string;
  category_name?: string;
  amount_aud: number;
  amount_cents: number;
  gst_amount_aud: number;
  gst_cents: number;
  net_cents: number;
  payment_method: FinancePaymentMethod | string;
  description: string;
  reference_id?: string | null;
  customer_id?: string | null;
  staff_id?: string | null;
  vendor_name?: string | null;
  is_tax_deductible?: boolean;
  notes?: string | null;
  receipt_url?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface TransactionFilterParams {
  type?: 'all' | 'income' | 'expense' | 'revenue';
  categoryId?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  isTaxDeductible?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'amount';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateTransactionInput {
  id?: string;
  transactionDate?: string;
  type: 'income' | 'expense' | 'revenue';
  categoryId: string;
  categoryName?: string;
  amountAud?: number;
  amountCents?: number;
  gstCents?: number;
  paymentMethod?: FinancePaymentMethod | string;
  description: string;
  referenceId?: string | null;
  customerId?: string | null;
  staffId?: string | null;
  vendorName?: string | null;
  isTaxDeductible?: boolean;
  notes?: string | null;
  receiptUrl?: string | null;
}

// ============================================================================
// Standard Categories Seed Data (Matching supabase/seed.sql)
// ============================================================================
export const INITIAL_FINANCE_CATEGORIES: FinanceCategory[] = [
  // Income Categories
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    name: 'Salon Services',
    type: 'income',
    description: 'Revenue from manicure, pedicure, acrylic, SNS, and nail art',
    is_tax_deductible: false,
    is_default: true,
    display_order: 1,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    name: 'Retail Product Sales',
    type: 'income',
    description: 'Cuticle oils, hand creams, and nail care kits',
    is_tax_deductible: false,
    is_default: false,
    display_order: 2,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    name: 'Gift Cards',
    type: 'income',
    description: 'Sales of electronic and physical salon vouchers',
    is_tax_deductible: false,
    is_default: false,
    display_order: 3,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000004',
    name: 'Tips & Gratuities',
    type: 'income',
    description: 'Customer tips collected for technicians',
    is_tax_deductible: false,
    is_default: false,
    display_order: 4,
  },
  // Expense Categories
  {
    id: 'b0000000-0000-0000-0000-000000000005',
    name: 'Rent & Salon Outgoings',
    type: 'expense',
    description: 'Commercial retail premises lease and council rates',
    is_tax_deductible: true,
    is_default: true,
    display_order: 1,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000006',
    name: 'Salon Supplies & Inventory',
    type: 'expense',
    description: 'Acrylic powders, monomers, gel polishes, tips, acetone, and sanitizers',
    is_tax_deductible: true,
    is_default: true,
    display_order: 2,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000007',
    name: 'Staff Wages & Superannuation',
    type: 'expense',
    description: 'Employee payroll wages, PAYG withholding, and 11.5% SG superannuation',
    is_tax_deductible: true,
    is_default: true,
    display_order: 3,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000008',
    name: 'Utilities (Electricity & Water)',
    type: 'expense',
    description: 'Electricity for autoclave & dryers, hot water and internet',
    is_tax_deductible: true,
    is_default: false,
    display_order: 4,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000009',
    name: 'Marketing & Social Ads',
    type: 'expense',
    description: 'Instagram/TikTok local promotion and Google Business ads',
    is_tax_deductible: true,
    is_default: false,
    display_order: 5,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000010',
    name: 'Merchant & Bank Fees',
    type: 'expense',
    description: 'EFTPOS terminal fees and card processing transaction surcharges',
    is_tax_deductible: true,
    is_default: false,
    display_order: 6,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000011',
    name: 'Equipment & Maintenance',
    type: 'expense',
    description: 'Nail drills, UV/LED lamps, autoclave sterilizers, and chair repairs',
    is_tax_deductible: true,
    is_default: false,
    display_order: 7,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000012',
    name: 'Insurance & Licences',
    type: 'expense',
    description: 'Public liability insurance, workers compensation, and salon council licences',
    is_tax_deductible: true,
    is_default: false,
    display_order: 8,
  },
  {
    id: 'b0000000-0000-0000-0000-000000000013',
    name: 'Professional Services (Accounting & Legal)',
    type: 'expense',
    description: 'Registered tax agent fees, BAS preparation, and commercial lease advice',
    is_tax_deductible: true,
    is_default: false,
    display_order: 9,
  },
];

// Helper to generate seed dates relative to today
function getDateOffset(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// Initial seed transactions with exact integer cents and GST
export const INITIAL_FINANCE_TRANSACTIONS: FinanceTransaction[] = [
  // Revenue 1
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    transaction_date: getDateOffset(14),
    type: 'income',
    category_id: 'b0000000-0000-0000-0000-000000000001',
    category_name: 'Salon Services',
    amount_aud: 65.0,
    amount_cents: 6500,
    gst_amount_aud: 5.91,
    gst_cents: 591,
    net_cents: 5909,
    payment_method: 'card',
    description: 'Service visit: SNS Dipping Powder Full Set + Tip ($60 + $5)',
    reference_id: 'a0000000-0000-0000-0000-000000000001',
    customer_id: '80000000-0000-0000-0000-000000000001',
    staff_id: '60000000-0000-0000-0000-000000000002',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  // Revenue 2
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    transaction_date: getDateOffset(10),
    type: 'income',
    category_id: 'b0000000-0000-0000-0000-000000000001',
    category_name: 'Salon Services',
    amount_aud: 95.0,
    amount_cents: 9500,
    gst_amount_aud: 8.64,
    gst_cents: 864,
    net_cents: 8636,
    payment_method: 'eftpos',
    description: 'Service visit: Ombré Full Set Acrylic + Tip ($85 + $10)',
    reference_id: 'a0000000-0000-0000-0000-000000000002',
    customer_id: '80000000-0000-0000-0000-000000000002',
    staff_id: '60000000-0000-0000-0000-000000000001',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  // Revenue 3
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    transaction_date: getDateOffset(7),
    type: 'income',
    category_id: 'b0000000-0000-0000-0000-000000000001',
    category_name: 'Salon Services',
    amount_aud: 90.0,
    amount_cents: 9000,
    gst_amount_aud: 8.18,
    gst_cents: 818,
    net_cents: 8182,
    payment_method: 'card',
    description: 'Service visit: Russian E-File Manicure + Tip ($80 + $10)',
    reference_id: 'a0000000-0000-0000-0000-000000000003',
    customer_id: '80000000-0000-0000-0000-000000000003',
    staff_id: '60000000-0000-0000-0000-000000000001',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  // Revenue 4: Retail
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    transaction_date: getDateOffset(5),
    type: 'income',
    category_id: 'b0000000-0000-0000-0000-000000000002',
    category_name: 'Retail Product Sales',
    amount_aud: 70.0,
    amount_cents: 7000,
    gst_amount_aud: 6.36,
    gst_cents: 636,
    net_cents: 6364,
    payment_method: 'card',
    description: 'Retail sale: 2x Organic Cuticle Oil Bottles + Australian Hand Hydration Cream',
    reference_id: null,
    customer_id: '80000000-0000-0000-0000-000000000001',
    staff_id: '60000000-0000-0000-0000-000000000002',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  // Revenue 5: Gift Card
  {
    id: 'c0000000-0000-0000-0000-000000000011',
    transaction_date: getDateOffset(3),
    type: 'income',
    category_id: 'b0000000-0000-0000-0000-000000000003',
    category_name: 'Gift Cards',
    amount_aud: 150.0,
    amount_cents: 15000,
    gst_amount_aud: 13.64,
    gst_cents: 1364,
    net_cents: 13636,
    payment_method: 'eftpos',
    description: 'Gift Voucher purchase - Birthday Spa Treatment ($150)',
    reference_id: null,
    customer_id: null,
    staff_id: '60000000-0000-0000-0000-000000000001',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  // Expense 1: Salon Supplies
  {
    id: 'c0000000-0000-0000-0000-000000000005',
    transaction_date: getDateOffset(15),
    type: 'expense',
    category_id: 'b0000000-0000-0000-0000-000000000006',
    category_name: 'Salon Supplies & Inventory',
    amount_aud: 480.0,
    amount_cents: 48000,
    gst_amount_aud: 43.64,
    gst_cents: 4364,
    net_cents: 43636,
    payment_method: 'bank_transfer',
    description: 'Wholesale Restock: Young Nails Acrylic Liquids, Kiara Sky Dipping Powders, Gelish Top Coats',
    vendor_name: 'Beauty Supplies Direct Australia',
    is_tax_deductible: true,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  // Expense 2: Utilities
  {
    id: 'c0000000-0000-0000-0000-000000000006',
    transaction_date: getDateOffset(12),
    type: 'expense',
    category_id: 'b0000000-0000-0000-0000-000000000008',
    category_name: 'Utilities (Electricity & Water)',
    amount_aud: 165.0,
    amount_cents: 16500,
    gst_amount_aud: 15.0,
    gst_cents: 1500,
    net_cents: 15000,
    payment_method: 'bank_transfer',
    description: 'Energy Australia: Electricity & Hot Water for Salon Sydney CBD',
    vendor_name: 'EnergyAustralia Pty Ltd',
    is_tax_deductible: true,
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
  // Expense 3: Marketing
  {
    id: 'c0000000-0000-0000-0000-000000000007',
    transaction_date: getDateOffset(8),
    type: 'expense',
    category_id: 'b0000000-0000-0000-0000-000000000009',
    category_name: 'Marketing & Social Ads',
    amount_aud: 110.0,
    amount_cents: 11000,
    gst_amount_aud: 10.0,
    gst_cents: 1000,
    net_cents: 10000,
    payment_method: 'card',
    description: 'Meta Ads: Sydney CBD Nails Instagram Showcase campaign',
    vendor_name: 'Meta Platforms Ireland Ltd',
    is_tax_deductible: true,
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  // Expense 4: Merchant Fees
  {
    id: 'c0000000-0000-0000-0000-000000000008',
    transaction_date: getDateOffset(2),
    type: 'expense',
    category_id: 'b0000000-0000-0000-0000-000000000010',
    category_name: 'Merchant & Bank Fees',
    amount_aud: 45.5,
    amount_cents: 4550,
    gst_amount_aud: 4.14,
    gst_cents: 414,
    net_cents: 4136,
    payment_method: 'bank_transfer',
    description: 'Monthly EFTPOS Terminal Rental & Processing Surcharges',
    vendor_name: 'Tyro Payments Australia',
    is_tax_deductible: true,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  // Expense 5: Rent
  {
    id: 'c0000000-0000-0000-0000-000000000009',
    transaction_date: getDateOffset(20),
    type: 'expense',
    category_id: 'b0000000-0000-0000-0000-000000000005',
    category_name: 'Rent & Salon Outgoings',
    amount_aud: 3200.0,
    amount_cents: 320000,
    gst_amount_aud: 290.91,
    gst_cents: 29091,
    net_cents: 290909,
    payment_method: 'bank_transfer',
    description: 'Monthly Commercial Premises Lease - Suite 4, 120 Castlereagh St Sydney',
    vendor_name: 'Castlereagh Property Group',
    is_tax_deductible: true,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
];

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

async function getSupabase() {
  if (isSupabaseConfigured()) {
    try {
      return await createClient();
    } catch {
      // Fallback
    }
  }
  return createMockSupabaseClient();
}

/**
 * Unified In-Memory Mock Store Class.
 */
class MockFinanceStore {
  categories: FinanceCategory[] = INITIAL_FINANCE_CATEGORIES.map((c) => ({ ...c }));
  transactions: FinanceTransaction[] = INITIAL_FINANCE_TRANSACTIONS.map((t) => ({ ...t }));

  constructor() {
    this.syncInitialMockCrmTransactions();
  }

  syncInitialMockCrmTransactions() {
    // If mockCrmStore.transactions has transactions not yet tracked in this.transactions, link them
    for (const crmTx of mockCrmStore.transactions) {
      if (!this.transactions.some((t) => t.id === crmTx.id || (crmTx.reference_id && t.reference_id === crmTx.reference_id))) {
        const gst = calculateGST(crmTx.amount_cents);
        this.transactions.push({
          id: crmTx.id,
          transaction_date: crmTx.date,
          type: 'revenue',
          category_id: crmTx.category_id || 'b0000000-0000-0000-0000-000000000001',
          category_name: crmTx.category || 'Salon Services',
          amount_aud: crmTx.amount_aud,
          amount_cents: crmTx.amount_cents,
          gst_amount_aud: gst.gstCents / 100,
          gst_cents: gst.gstCents,
          net_cents: gst.netCents,
          payment_method: (crmTx.payment_method?.toLowerCase() as any) || 'card',
          description: crmTx.description,
          reference_id: crmTx.reference_id,
          staff_id: crmTx.staff_id,
          customer_id: crmTx.customer_id,
          created_at: crmTx.created_at,
        });
      }
    }
  }

  reset() {
    this.categories = INITIAL_FINANCE_CATEGORIES.map((c) => ({ ...c }));
    this.transactions = INITIAL_FINANCE_TRANSACTIONS.map((t) => ({ ...t }));
    mockCrmStore.reset();
    this.syncInitialMockCrmTransactions();
  }
}

export const mockFinanceStore = new MockFinanceStore();

// ============================================================================
// Public Category Operations
// ============================================================================

export async function getCategories(type?: 'income' | 'expense' | 'revenue'): Promise<FinanceCategory[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabase();
      let query = supabase.from('finance_categories').select('*').order('display_order', { ascending: true });
      if (type) {
        const dbType = type === 'revenue' || type === 'income' ? 'income' : 'expense';
        query = query.eq('type', dbType);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as FinanceCategory[];
      }
    } catch {
      // Fall through to in-memory store
    }
  }

  let categories = [...mockFinanceStore.categories];
  if (type) {
    const normType = type === 'revenue' || type === 'income' ? 'income' : 'expense';
    categories = categories.filter((c) => c.type === normType);
  }
  return categories.sort((a, b) => a.display_order - b.display_order);
}

export function getCategoryById(id: string): FinanceCategory | undefined {
  return mockFinanceStore.categories.find((c) => c.id === id);
}

// ============================================================================
// Public Transaction Operations
// ============================================================================

function mapToTransactionRecord(t: FinanceTransaction): TransactionRecord {
  return {
    id: t.id,
    transactionDate: t.transaction_date,
    type: t.type === 'revenue' || t.type === 'income' ? 'revenue' : 'expense',
    categoryId: t.category_id,
    categoryName: t.category_name,
    amountCents: t.amount_cents,
    gstCents: t.gst_cents,
    paymentMethod: t.payment_method,
    description: t.description,
    referenceId: t.reference_id || undefined,
    staffId: t.staff_id || undefined,
    customerId: t.customer_id || undefined,
    vendorName: t.vendor_name || undefined,
    isTaxDeductible: t.is_tax_deductible,
    notes: t.notes || undefined,
  };
}

export async function getTransactions(params: TransactionFilterParams = {}): Promise<{
  transactions: FinanceTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  // Sync with mockCrmStore.transactions to pick up any dynamically logged visits
  mockFinanceStore.syncInitialMockCrmTransactions();

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabase();
      let query = supabase
        .from('finance_transactions')
        .select('*', { count: 'exact' });

      if (params.type && params.type !== 'all') {
        const dbType = params.type === 'revenue' || params.type === 'income' ? 'income' : 'expense';
        query = query.eq('type', dbType);
      }
      if (params.categoryId) {
        query = query.eq('category_id', params.categoryId);
      }
      if (params.paymentMethod) {
        query = query.eq('payment_method', params.paymentMethod);
      }
      if (params.startDate) {
        query = query.gte('transaction_date', params.startDate);
      }
      if (params.endDate) {
        query = query.lte('transaction_date', params.endDate);
      }
      if (params.search) {
        query = query.ilike('description', `%${params.search}%`);
      }

      const sortCol = params.sortBy === 'amount' ? 'amount_aud' : 'transaction_date';
      const ascending = params.sortOrder === 'asc';
      query = query.order(sortCol, { ascending });

      const page = Math.max(1, params.page || 1);
      const limit = Math.max(1, params.limit || 50);
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (!error && data) {
        const mapped: FinanceTransaction[] = data.map((d: any) => {
          const cents = Math.round((d.amount_aud || 0) * 100);
          const gst = d.gst_amount_aud !== undefined && d.gst_amount_aud !== null
            ? Math.round(d.gst_amount_aud * 100)
            : calculateGST(cents).gstCents;
          const net = cents - gst;
          return {
            id: d.id,
            transaction_date: d.transaction_date,
            type: d.type === 'income' ? 'revenue' : d.type,
            category_id: d.category_id,
            category_name: mockFinanceStore.categories.find((c) => c.id === d.category_id)?.name,
            amount_aud: Number(d.amount_aud),
            amount_cents: cents,
            gst_amount_aud: gst / 100,
            gst_cents: gst,
            net_cents: net,
            payment_method: d.payment_method || 'card',
            description: d.description,
            reference_id: d.reference_id,
            customer_id: d.customer_id,
            staff_id: d.staff_id,
            vendor_name: d.vendor_name,
            is_tax_deductible: d.is_tax_deductible,
            notes: d.notes,
            receipt_url: d.receipt_url,
            created_at: d.created_at || new Date().toISOString(),
          };
        });

        const totalCount = count || mapped.length;
        return {
          transactions: mapped,
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit) || 1,
        };
      }
    } catch {
      // Fallback to in-memory store
    }
  }

  let list = [...mockFinanceStore.transactions];

  // 1. Type filtering
  if (params.type && params.type !== 'all') {
    const isTargetRevenue = params.type === 'revenue' || params.type === 'income';
    list = list.filter((t) =>
      isTargetRevenue ? (t.type === 'revenue' || t.type === 'income') : t.type === 'expense'
    );
  }

  // 2. Category filtering
  if (params.categoryId) {
    list = list.filter((t) => t.category_id === params.categoryId);
  }

  // 3. Payment Method
  if (params.paymentMethod) {
    list = list.filter((t) => t.payment_method?.toLowerCase() === params.paymentMethod?.toLowerCase());
  }

  // 4. Date filtering
  if (params.startDate) {
    list = list.filter((t) => t.transaction_date >= params.startDate!);
  }
  if (params.endDate) {
    list = list.filter((t) => t.transaction_date <= params.endDate!);
  }

  // 5. Tax-Deductible filter
  if (params.isTaxDeductible !== undefined) {
    list = list.filter((t) => Boolean(t.is_tax_deductible) === params.isTaxDeductible);
  }

  // 6. Search
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        (t.vendor_name && t.vendor_name.toLowerCase().includes(q)) ||
        (t.category_name && t.category_name.toLowerCase().includes(q)) ||
        (t.reference_id && t.reference_id.toLowerCase().includes(q))
    );
  }

  // 7. Sort
  const sortCol = params.sortBy === 'amount' ? 'amount_cents' : 'transaction_date';
  const sortOrder = params.sortOrder || 'desc';
  list.sort((a, b) => {
    const valA = a[sortCol];
    const valB = b[sortCol];
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, params.limit || 50);
  const total = list.length;
  const from = (page - 1) * limit;
  const paginated = list.slice(from, from + limit);

  return {
    transactions: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getTransactionById(id: string): Promise<FinanceTransaction | null> {
  const tx = mockFinanceStore.transactions.find((t) => t.id === id);
  return tx || null;
}

export async function createTransaction(input: CreateTransactionInput): Promise<FinanceTransaction> {
  // Idempotency Guard: if referenceId is provided, check if a transaction already exists
  if (input.referenceId) {
    const existing = mockFinanceStore.transactions.find((t) => t.reference_id === input.referenceId);
    if (existing) {
      return existing;
    }
  }

  const transactionId = input.id || `c0000000-0000-0000-0000-${Date.now().toString(16).padStart(12, '0')}`;
  const date = input.transactionDate || new Date().toISOString().slice(0, 10);

  // Compute exact integer cents
  const amountCents = input.amountCents !== undefined
    ? Math.round(input.amountCents)
    : Math.round((input.amountAud || 0) * 100);
  const amountAud = input.amountAud !== undefined
    ? Number(input.amountAud)
    : amountCents / 100;

  // Compute GST with exact ATO 1/11th invariant
  let gstCents: number;
  let netCents: number;
  if (input.gstCents !== undefined) {
    gstCents = Math.round(input.gstCents);
    netCents = amountCents - gstCents;
  } else {
    const gstCalc = calculateGST(amountCents);
    gstCents = gstCalc.gstCents;
    netCents = gstCalc.netCents;
  }
  const gstAmountAud = gstCents / 100;

  // Resolve category name
  const category = mockFinanceStore.categories.find((c) => c.id === input.categoryId);
  const categoryName = input.categoryName || category?.name || 'Uncategorized';
  const isTaxDeductible = input.isTaxDeductible !== undefined
    ? input.isTaxDeductible
    : category?.is_tax_deductible ?? (input.type === 'expense');

  const newTx: FinanceTransaction = {
    id: transactionId,
    transaction_date: date,
    type: input.type,
    category_id: input.categoryId,
    category_name: categoryName,
    amount_aud: amountAud,
    amount_cents: amountCents,
    gst_amount_aud: gstAmountAud,
    gst_cents: gstCents,
    net_cents: netCents,
    payment_method: input.paymentMethod || 'eftpos',
    description: input.description,
    reference_id: input.referenceId || null,
    customer_id: input.customerId || null,
    staff_id: input.staffId || null,
    vendor_name: input.vendorName || null,
    is_tax_deductible: isTaxDeductible,
    notes: input.notes || null,
    receipt_url: input.receiptUrl || null,
    created_at: new Date().toISOString(),
  };

  // Add to in-memory store
  mockFinanceStore.transactions.unshift(newTx);

  // If revenue, also ensure single-source-of-truth in mockCrmStore.transactions
  if (input.type === 'revenue' || input.type === 'income') {
    const crmTx: MockTransaction = {
      id: newTx.id,
      type: 'revenue',
      category: categoryName,
      category_id: newTx.category_id,
      amount_cents: newTx.amount_cents,
      amount_aud: newTx.amount_aud,
      payment_method: newTx.payment_method,
      reference_id: newTx.reference_id || null,
      staff_id: newTx.staff_id || null,
      customer_id: newTx.customer_id || null,
      date: newTx.transaction_date,
      description: newTx.description,
      created_at: newTx.created_at,
    };
    if (!mockCrmStore.transactions.some((t) => t.id === newTx.id)) {
      mockCrmStore.transactions.push(crmTx);
    }
  }

  // If Supabase configured, attempt live insert
  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabase();
      const dbType = (input.type === 'revenue' || input.type === 'income') ? 'income' : 'expense';
      await supabase.from('finance_transactions').insert({
        id: newTx.id,
        transaction_date: newTx.transaction_date,
        type: dbType,
        category_id: newTx.category_id,
        amount_aud: newTx.amount_aud,
        gst_amount_aud: newTx.gst_amount_aud,
        payment_method: newTx.payment_method as any,
        description: newTx.description,
        reference_id: newTx.reference_id as any,
        customer_id: newTx.customer_id as any,
        staff_id: newTx.staff_id as any,
      });
    } catch {
      // Ignored for offline mock
    }
  }

  return newTx;
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const index = mockFinanceStore.transactions.findIndex((t) => t.id === id);
  if (index !== -1) {
    mockFinanceStore.transactions.splice(index, 1);
  }
  const crmIndex = mockCrmStore.transactions.findIndex((t) => t.id === id);
  if (crmIndex !== -1) {
    mockCrmStore.transactions.splice(crmIndex, 1);
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabase();
      await supabase.from('finance_transactions').delete().eq('id', id);
    } catch {
      // Fallback
    }
  }

  return index !== -1 || crmIndex !== -1;
}

// ============================================================================
// Feature 39: CRM Visit to Revenue Auto-Sync (Idempotent & Mutex-Protected)
// ============================================================================

/**
 * Module-level in-flight promise lock (Singleflight pattern).
 * Ensures concurrent callers coalesce into a single active sync execution,
 * preventing race condition duplicate transaction creation.
 */
let activeSyncPromise: Promise<{
  syncedCount: number;
  skippedCount: number;
  totalVisits: number;
  transactions: FinanceTransaction[];
}> | null = null;

export async function syncVisitsFromCrm(): Promise<{
  syncedCount: number;
  skippedCount: number;
  totalVisits: number;
  transactions: FinanceTransaction[];
}> {
  // If a synchronization is already in flight, coalesce into the existing promise
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = (async () => {
    try {
      // Sync in-memory store first
      mockFinanceStore.syncInitialMockCrmTransactions();

      const visits = await getVisits();
      const existingTransactions = mockFinanceStore.transactions;

      // Set of already reconciled visit IDs
      const existingRefIds = new Set<string>();
      for (const t of existingTransactions) {
        if (t.reference_id) {
          existingRefIds.add(t.reference_id);
        }
      }
      for (const t of mockCrmStore.transactions) {
        if (t.reference_id) {
          existingRefIds.add(t.reference_id);
        }
      }

      let syncedCount = 0;
      let skippedCount = 0;
      const newTransactions: FinanceTransaction[] = [];

      for (const visit of visits) {
        // Multi-layered guard: check local Set AND live store state
        if (
          !visit.id ||
          existingRefIds.has(visit.id) ||
          mockFinanceStore.transactions.some((t) => t.reference_id === visit.id) ||
          mockCrmStore.transactions.some((t) => t.reference_id === visit.id)
        ) {
          if (visit.id) {
            existingRefIds.add(visit.id);
          }
          skippedCount++;
          continue;
        }

        const amountCents = visit.total_amount_cents !== undefined
          ? Math.round(visit.total_amount_cents)
          : Math.round((visit.total_paid_aud || 0) * 100);

        if (amountCents <= 0) {
          skippedCount++;
          continue;
        }

        const visitDate = visit.visit_date
          ? (typeof visit.visit_date === 'string' ? visit.visit_date.slice(0, 10) : new Date().toISOString().slice(0, 10))
          : new Date().toISOString().slice(0, 10);

        const desc = visit.notes
          ? `Service visit - ${visit.notes}`
          : `Service visit (reconciled from CRM)`;

        const newTx = await createTransaction({
          type: 'revenue',
          categoryId: 'b0000000-0000-0000-0000-000000000001', // Salon Services
          categoryName: 'Salon Services',
          amountCents,
          amountAud: amountCents / 100,
          paymentMethod: (visit.payment_method?.toLowerCase() as any) || 'eftpos',
          transactionDate: visitDate,
          description: desc,
          referenceId: visit.id,
          customerId: visit.customer_id,
          staffId: visit.staff_id,
        });

        existingRefIds.add(visit.id);
        newTransactions.push(newTx);
        syncedCount++;
      }

      return {
        syncedCount,
        skippedCount,
        totalVisits: visits.length,
        transactions: newTransactions,
      };
    } finally {
      // Clear in-flight promise upon completion or failure
      activeSyncPromise = null;
    }
  })();

  return activeSyncPromise;
}

// ============================================================================
// Summary & Categorical Analytics Aggregator
// ============================================================================

export async function getFinancialSummaryData(params: {
  startDate?: string;
  endDate?: string;
} = {}): Promise<{
  summary: FinancialSummary;
  categoryBreakdown: {
    revenue: CategorySummary[];
    expenses: CategorySummary[];
  };
  transactions: FinanceTransaction[];
}> {
  const { transactions } = await getTransactions({
    startDate: params.startDate,
    endDate: params.endDate,
    limit: 10000,
  });

  const records = transactions.map(mapToTransactionRecord);
  const summary = calculateFinancialSummary(records);
  const revenueBreakdown = aggregateByCategory(records, 'revenue');
  const expenseBreakdown = aggregateByCategory(records, 'expense');

  return {
    summary,
    categoryBreakdown: {
      revenue: revenueBreakdown,
      expenses: expenseBreakdown,
    },
    transactions,
  };
}

export function resetFinanceStore(): void {
  activeSyncPromise = null;
  mockFinanceStore.reset();
}
