import { createClient } from '@/lib/supabase/server';
import { createMockSupabaseClient } from '@/lib/supabase/mock';
import { mockCrmStore } from '@/lib/crm/mock-customers';
import { removeVietnameseDiacritics, matchesPhoneSearch } from '@/lib/utils/vietnamese';
import {
  mergeWithStoredStaff,
  persistNewStaff,
  persistUpdatedStaff,
  persistDeletedStaff,
} from './staff-storage';

export interface StaffRecord {
  id: string;
  name: string;
  full_name: string;
  phone: string;
  email: string;
  role: 'super_admin' | 'manager' | 'staff' | string;
  employment_type: 'Full-time' | 'Part-time' | 'Casual' | 'Contractor';
  specializations: string[];
  is_active: boolean;
  bio_en?: string | null;
  bio_vi?: string | null;
  avatar_url?: string | null;
  image_url?: string | null;
  hire_date?: string;
  created_at: string;
  updated_at: string;
}

export const INITIAL_STAFF_MEMBERS: StaffRecord[] = [
  {
    id: 'stf-001',
    name: 'Michelle Nguyen',
    full_name: 'Michelle Nguyen',
    phone: '0411 000 111',
    email: 'admin@glamournails.com.au',
    role: 'super_admin',
    employment_type: 'Full-time',
    specializations: ['Russian Manicure', 'Acrylic Extensions', 'SNS Dip', '3D Nail Art'],
    is_active: true,
    hire_date: '2024-01-15',
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2026-11-01T10:00:00Z',
  },
  {
    id: 'stf-002',
    name: 'Sarah Jenkins',
    full_name: 'Sarah Jenkins',
    phone: '0412 000 222',
    email: 'manager@glamournails.com.au',
    role: 'manager',
    employment_type: 'Full-time',
    specializations: ['SNS Dip', 'Pedicure', 'Gel Art', 'Ombre'],
    is_active: true,
    hire_date: '2024-03-01',
    created_at: '2024-03-01T09:00:00Z',
    updated_at: '2026-11-01T10:00:00Z',
  },
  {
    id: 'stf-003',
    name: 'Chloe Nguyen',
    full_name: 'Chloe Nguyen',
    phone: '0413 000 333',
    email: 'technician@glamournails.com.au',
    role: 'staff',
    employment_type: 'Full-time',
    specializations: ['SNS Dip', 'Acrylic Extensions', 'Russian Manicure', '3D Nail Art', 'E-File'],
    is_active: true,
    hire_date: '2024-06-15',
    created_at: '2024-06-15T09:00:00Z',
    updated_at: '2026-11-01T10:00:00Z',
  },
  {
    id: 'stf-004',
    name: 'Kevin Pham',
    full_name: 'Kevin Pham',
    phone: '0422 123 456',
    email: 'kevin.p@glamournails.com.au',
    role: 'staff',
    employment_type: 'Part-time',
    specializations: ['Acrylic Extensions', '3D Nail Art', 'E-File'],
    is_active: true,
    hire_date: '2025-02-10',
    created_at: '2025-02-10T09:00:00Z',
    updated_at: '2026-11-01T10:00:00Z',
  },
];

class MockStaffStore {
  staff: StaffRecord[] = INITIAL_STAFF_MEMBERS.map((s) => ({ ...s }));

  reset() {
    this.staff = INITIAL_STAFF_MEMBERS.map((s) => ({ ...s }));
    (globalThis as any).__mockStaffFileStorage = null;
  }
}

export const mockStaffStore = new MockStaffStore();

function formatStaff(s: any): StaffRecord {
  const name = s.name || s.full_name || 'Staff Member';
  const avatar = s.avatar_url || s.image_url || null;
  return {
    ...s,
    id: s.id,
    name,
    full_name: name,
    phone: s.phone || '',
    email: s.email || '',
    role: s.role || 'staff',
    employment_type: s.employment_type || 'Full-time',
    specializations: Array.isArray(s.specializations) ? s.specializations : [],
    is_active: s.is_active !== false,
    bio_en: s.bio_en || null,
    bio_vi: s.bio_vi || null,
    avatar_url: avatar,
    image_url: avatar,
    hire_date: s.hire_date || new Date().toISOString().slice(0, 10),
    created_at: s.created_at || new Date().toISOString(),
    updated_at: s.updated_at || new Date().toISOString(),
  };
}

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

export async function getStaffList(options: { activeOnly?: boolean; search?: string } = {}) {
  let list: StaffRecord[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabase();
      let query = supabase.from('staff_members').select('*');
      if (options.activeOnly) {
        query = query.eq('is_active', true);
      }
      const { data, error } = await query.order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        list = data.map(formatStaff);
      }
    } catch {
      list = [];
    }
  }

  if (list.length === 0) {
    list = mockStaffStore.staff
      .filter((s) => !options.activeOnly || s.is_active)
      .map(formatStaff);
  }

  // Merge with persistent overrides & newly added staff
  list = mergeWithStoredStaff(list);

  if (options.activeOnly) {
    list = list.filter((s) => s.is_active);
  }

  if (options.search && options.search.trim()) {
    const q = options.search.trim();
    const normQ = removeVietnameseDiacritics(q).toLowerCase();
    const qWords = normQ.split(/\s+/).filter(Boolean);

    list = list.filter((s) => {
      const staffName = s.full_name || s.name || '';
      const normName = removeVietnameseDiacritics(staffName).toLowerCase();
      const normEmail = removeVietnameseDiacritics(s.email || '').toLowerCase();
      const normRole = (s.role || '').toLowerCase();
      const phoneMatches = matchesPhoneSearch(s.phone, q);

      const nameMatches = qWords.length === 0 || qWords.every((word) => normName.includes(word));
      const emailMatches = normEmail.includes(normQ);
      const roleMatches = normRole.includes(normQ);
      const specMatches =
        Array.isArray(s.specializations) &&
        s.specializations.some((sp) => removeVietnameseDiacritics(sp).toLowerCase().includes(normQ));

      return nameMatches || emailMatches || roleMatches || phoneMatches || specMatches;
    });
  }

  return list;
}

export async function getStaffById(id: string) {
  const all = await getStaffList();
  const found = all.find((s) => s.id === id);
  if (found) return found;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabase();
      const { data } = await supabase
        .from('staff_members')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (data) return formatStaff(data);
    } catch {
      // Fallback
    }
  }

  const memFound = mockStaffStore.staff.find((s) => s.id === id);
  return memFound ? formatStaff(memFound) : null;
}

export async function createStaffMember(payload: {
  full_name?: string;
  name?: string;
  phone?: string;
  email?: string;
  role?: string;
  employment_type?: 'Full-time' | 'Part-time' | 'Casual' | 'Contractor';
  specializations?: string[];
  bio_en?: string;
  bio_vi?: string;
  avatar_url?: string;
  image_url?: string;
}) {
  const name = (payload.full_name || payload.name || 'Staff Member').trim();
  const phone = payload.phone?.trim() || '0400 000 000';
  const email = payload.email?.trim() || `staff${Date.now()}@glamournails.com.au`;
  const role = payload.role || 'staff';
  const employmentType = payload.employment_type || 'Full-time';
  const specializations = payload.specializations || [];
  const avatar = payload.avatar_url || payload.image_url || null;

  const newId = `stf-${Date.now()}`;
  const now = new Date().toISOString();

  const record: StaffRecord = formatStaff({
    id: newId,
    name,
    full_name: name,
    phone,
    email,
    role,
    employment_type: employmentType,
    specializations,
    is_active: true,
    bio_en: payload.bio_en || null,
    bio_vi: payload.bio_vi || null,
    avatar_url: avatar,
    image_url: avatar,
    hire_date: now.slice(0, 10),
    created_at: now,
    updated_at: now,
  });

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('staff_members')
        .insert({
          full_name: name,
          phone,
          email,
          role: role as any,
          employment_type: employmentType as any,
          is_active: true,
          avatar_url: avatar,
          bio_en: payload.bio_en || null,
          bio_vi: payload.bio_vi || null,
        })
        .select()
        .single();
      if (!error && data) {
        const formatted = formatStaff(data);
        mockStaffStore.staff.push(formatted);
        persistNewStaff(formatted);
        return formatted;
      }
    } catch {
      // Fallback
    }
  }

  mockStaffStore.staff.push(record);
  persistNewStaff(record);
  return record;
}

export async function updateStaffMember(id: string, updates: Partial<StaffRecord>) {
  const existing = await getStaffById(id);
  if (!existing) return null;

  const merged = { ...existing, ...updates, updated_at: new Date().toISOString() };
  const formatted = formatStaff(merged);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabase();
      await supabase
        .from('staff_members')
        .update({
          full_name: formatted.full_name,
          phone: formatted.phone,
          email: formatted.email,
          role: formatted.role as any,
          employment_type: formatted.employment_type as any,
          is_active: formatted.is_active,
          avatar_url: formatted.avatar_url,
          bio_en: formatted.bio_en,
          bio_vi: formatted.bio_vi,
          updated_at: formatted.updated_at,
        })
        .eq('id', id);
    } catch {
      // Fallback
    }
  }

  const idx = mockStaffStore.staff.findIndex((s) => s.id === id);
  if (idx !== -1) {
    Object.assign(mockStaffStore.staff[idx], formatted);
  } else {
    mockStaffStore.staff.push(formatted);
  }

  persistUpdatedStaff(id, formatted);
  return formatted;
}

export async function deleteStaffMember(id: string): Promise<boolean> {
  const existing = await getStaffById(id);
  if (!existing) return false;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabase();
      await supabase.from('staff_members').delete().eq('id', id);
    } catch {
      // Fallback
    }
  }

  mockStaffStore.staff = mockStaffStore.staff.filter((s) => s.id !== id);
  persistDeletedStaff(id);
  return true;
}

export async function updateStaffRole(id: string, newRole: string) {
  return updateStaffMember(id, { role: newRole });
}

export async function updateStaffSpecializations(id: string, specializations: string[]) {
  return updateStaffMember(id, { specializations });
}

export async function updateStaffStatus(id: string, isActive: boolean) {
  return updateStaffMember(id, { is_active: isActive });
}

export async function calculateStaffProductivity(staffId: string) {
  let visits: any[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('crm_visit_history')
        .select('*')
        .eq('staff_id', staffId);

      if (!error && data && data.length > 0) {
        visits = data;
      }
    } catch {
      visits = [];
    }
  }

  // Fallback to mockCrmStore.visits if empty or unconfigured
  if (visits.length === 0) {
    visits = mockCrmStore.visits.filter((v) => v.staff_id === staffId);
  }

  const completedVisits = visits.length;

  const totalRevenueCents = visits.reduce((acc, v) => {
    if (v.total_amount_cents !== undefined) return acc + v.total_amount_cents;
    const paidAud = v.total_paid_aud ?? ((v.price_charged_aud || 0) + (v.tip_aud || 0));
    return acc + Math.round((paidAud || 0) * 100);
  }, 0);

  const totalRevenueAud = totalRevenueCents / 100;
  const averageTicketAud = completedVisits > 0 ? totalRevenueAud / completedVisits : 0;

  return {
    staff_id: staffId,
    completed_visits: completedVisits,
    total_revenue_cents: totalRevenueCents,
    total_revenue_aud: totalRevenueAud,
    average_ticket_aud: averageTicketAud,
  };
}
