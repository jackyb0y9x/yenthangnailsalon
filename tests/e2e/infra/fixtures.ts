/**
 * Australian Domain Fixtures, Generators, and Validation Utilities
 */

export interface ServiceFixture {
  id: string;
  category: 'Manicure' | 'Pedicure' | 'SNS Dip' | 'Acrylic' | 'Gel Art';
  name_en: string;
  name_vi: string;
  price_cents: number;
  price_aud: number;
  duration_minutes: number;
  is_active: boolean;
}

export interface CustomerFixture {
  id?: string;
  name: string;
  phone: string;
  email: string;
  preferred_language: 'en' | 'vi';
  nail_shape?: string;
  preferred_products?: string[];
  allergies?: string;
  notes?: string;
}

export interface StaffFixture {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'super_admin' | 'manager' | 'staff';
  employment_type: 'Full-time' | 'Part-time' | 'Casual';
  specializations: string[];
  is_active: boolean;
}

export const FIXTURES = {
  salon: {
    name: 'Glamour Nails & Spa Sydney',
    abn: '51 824 753 556',
    phone: '+61 2 9123 4567',
    mobile: '0412 345 678',
    email: 'hello@glamournails.com.au',
    address: 'Suite 2, 188 George Street, Sydney NSW 2000',
    street: 'Suite 2, 188 George Street',
    suburb: 'Sydney',
    state: 'NSW',
    postcode: '2000',
    country: 'Australia',
    timezone: 'Australia/Sydney',
    geo: {
      latitude: -33.8688,
      longitude: 151.2093,
    },
    openingHours: [
      { dayOfWeek: 'Monday', opens: '09:00', closes: '18:00' },
      { dayOfWeek: 'Tuesday', opens: '09:00', closes: '18:00' },
      { dayOfWeek: 'Wednesday', opens: '09:00', closes: '18:00' },
      { dayOfWeek: 'Thursday', opens: '09:00', closes: '20:00' },
      { dayOfWeek: 'Friday', opens: '09:00', closes: '20:00' },
      { dayOfWeek: 'Saturday', opens: '09:00', closes: '18:00' },
      { dayOfWeek: 'Sunday', opens: '10:00', closes: '17:00' },
    ],
  },
  services: [
    {
      id: 'srv-001',
      category: 'Manicure',
      name_en: 'Express Manicure',
      name_vi: 'Chăm Sóc Móng Nhanh',
      price_cents: 3500,
      price_aud: 35.0,
      duration_minutes: 30,
      is_active: true,
    },
    {
      id: 'srv-002',
      category: 'Gel Art',
      name_en: 'Deluxe Russian Gel Manicure',
      name_vi: 'Làm Móng Gel Kỹ Thuật Nga',
      price_cents: 8500,
      price_aud: 85.0,
      duration_minutes: 60,
      is_active: true,
    },
    {
      id: 'srv-003',
      category: 'Acrylic',
      name_en: 'Full Set Acrylic Nails',
      name_vi: 'Đắp Móng Bột Acrylic Trọn Bộ',
      price_cents: 9500,
      price_aud: 95.0,
      duration_minutes: 75,
      is_active: true,
    },
    {
      id: 'srv-004',
      category: 'SNS Dip',
      name_en: 'SNS Dipping Powder Set',
      name_vi: 'Nhúng Bột SNS Cao Cấp',
      price_cents: 7500,
      price_aud: 75.0,
      duration_minutes: 50,
      is_active: true,
    },
    {
      id: 'srv-005',
      category: 'Pedicure',
      name_en: 'Luxury Spa Pedicure',
      name_vi: 'Spa Chăm Sóc Móng Chân Thư Giãn',
      price_cents: 6500,
      price_aud: 65.0,
      duration_minutes: 45,
      is_active: true,
    },
    {
      id: 'srv-006',
      category: 'Gel Art',
      name_en: '3D Encapsulated Nail Art',
      name_vi: 'Nghệ Thuật Móng 3D Đính Đá Hoa Nổi',
      price_cents: 4500,
      price_aud: 45.0,
      duration_minutes: 40,
      is_active: true,
    },
  ] as ServiceFixture[],
  customers: {
    vietnamese: {
      name: 'Nguyễn Thị Mai Lan',
      phone: '0412 345 678',
      email: 'mailan.nguyen@example.com.au',
      preferred_language: 'vi',
      nail_shape: 'Oval',
      preferred_products: ['SNS Dipping Powder', 'Gel Polish'],
      allergies: 'Severe Acetone sensitivity, Latex allergy',
      notes: 'Móng oval ngắn, chuộng màu pastel nhẹ, da tay mỏng dễ kích ứng',
    } as CustomerFixture,
    australian: {
      name: 'Chloe Taylor',
      phone: '+61 400 111 222',
      email: 'chloe.t@example.com.au',
      preferred_language: 'en',
      nail_shape: 'Almond',
      preferred_products: ['SNS Dipping', 'Acrylic'],
      allergies: 'None',
      notes: 'Almond shape SNS dipping powder, french tip line art',
    } as CustomerFixture,
    diacriticsList: [
      { name: 'Đặng Thị Đoan Trang', phone: '0421 111 222', email: 'doantrang@example.com' },
      { name: 'Dương Như Quỳnh', phone: '0422 222 333', email: 'quynh@example.com' },
      { name: 'Nguyễn Quốc Cường', phone: '0423 333 444', email: 'cuong@example.com' },
      { name: 'Trần Mai Phương', phone: '0424 444 555', email: 'phuong@example.com' },
      { name: 'Vũ Đình Đạt', phone: '0425 555 666', email: 'dat@example.com' },
    ],
  },
  staff: [
    {
      id: 'stf-001',
      name: 'Michelle Nguyen',
      phone: '0411 000 111',
      email: 'admin@glamournails.com.au',
      role: 'super_admin',
      employment_type: 'Full-time',
      specializations: ['Russian Manicure', 'Acrylic', 'SNS Dip', '3D Art'],
      is_active: true,
    },
    {
      id: 'stf-002',
      name: 'Sarah Jenkins',
      phone: '0412 000 222',
      email: 'manager@glamournails.com.au',
      role: 'manager',
      employment_type: 'Full-time',
      specializations: ['SNS Dip', 'Pedicure', 'Gel Art'],
      is_active: true,
    },
    {
      id: 'stf-003',
      name: 'Chloe Nguyen',
      phone: '0413 000 333',
      email: 'technician@glamournails.com.au',
      role: 'staff',
      employment_type: 'Full-time',
      specializations: ['SNS Dip', 'Acrylic Extensions', 'Russian Manicure', '3D Nail Art', 'E-File'],
      is_active: true,
    },
  ] as StaffFixture[],
  gallery: [
    {
      id: 'gal-001',
      title_en: 'Rose Gold French Ombre',
      title_vi: 'Móng Ombre Kiểu Pháp Màu Vàng Hồng',
      category: 'Ombre',
      image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80',
      is_featured: true,
    },
    {
      id: 'gal-002',
      title_en: '3D Encapsulated Blossom Gel Art',
      title_vi: 'Nghệ Thuật Móng Gel Đính Hoa Nổi 3D',
      category: '3D Art',
      image_url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80',
      is_featured: true,
    },
    {
      id: 'gal-003',
      title_en: 'Mirror Chrome Metal Finish',
      title_vi: 'Móng Tráng Gương Ánh Kim Cao Cấp',
      category: 'Chrome',
      image_url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=800&q=80',
      is_featured: true,
    },
  ],
  finance: {
    initialTransactions: [
      {
        id: 'tx-001',
        type: 'revenue',
        category: 'Services',
        amount_cents: 11000,
        amount_aud: 110.0,
        payment_method: 'EFTPOS',
        description: 'Full Set Acrylic Nails + Ombre Nail Art',
        date: '2026-11-15',
      },
      {
        id: 'tx-002',
        type: 'revenue',
        category: 'Services',
        amount_cents: 7500,
        amount_aud: 75.0,
        payment_method: 'Cash',
        description: 'SNS Dipping Powder Set',
        date: '2026-11-15',
      },
      {
        id: 'tx-003',
        type: 'expense',
        category: 'Supplies',
        amount_cents: 5500,
        amount_aud: 55.0,
        payment_method: 'Credit Card',
        description: 'SNS Dip powders and top coats wholesale',
        date: '2026-11-15',
        is_tax_deductible: true,
      },
      {
        id: 'tx-004',
        type: 'expense',
        category: 'Utilities',
        amount_cents: 3000,
        amount_aud: 30.0,
        payment_method: 'Bank Transfer',
        description: 'High-speed fiber internet monthly invoice',
        date: '2026-11-15',
        is_tax_deductible: true,
      },
    ],
  },
};

/**
 * Validates Australian Business Number (ABN) using official ATO Modulo-89 Checksum Algorithm
 */
export function validateAbn(abn: string): boolean {
  const digits = abn.replace(/\D/g, '');
  if (digits.length !== 11) return false;

  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  let sum = (parseInt(digits[0], 10) - 1) * weights[0];

  for (let i = 1; i < 11; i++) {
    sum += parseInt(digits[i], 10) * weights[i];
  }

  return sum % 89 === 0;
}

/**
 * Validates Australian Mobile and Landline phone numbers according to ACMA numbering rules
 */
export function validateAuPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // Australian Mobile (+614XXXXXXXX or 04XXXXXXXX)
  const mobileRegex = /^(?:\+?614|04)\d{8}$/;

  // Australian Geographic Landline (+612 / 02, +613 / 03, +617 / 07, +618 / 08)
  const landlineRegex = /^(?:\+?61[2378]|0[2378])\d{8}$/;

  return mobileRegex.test(cleaned) || landlineRegex.test(cleaned);
}

/**
 * Calculates Australian GST (10% / 1/11th inclusive) in integer cents precision
 */
export function calculateGst(amountCents: number): {
  grossCents: number;
  gstCents: number;
  netCents: number;
} {
  const grossCents = Math.round(amountCents);
  const gstCents = Math.round(grossCents / 11);
  const netCents = grossCents - gstCents;
  return { grossCents, gstCents, netCents };
}

/**
 * Formats integer cents into canonical Australian Dollar string
 */
export function formatAud(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)} AUD`;
}

/**
 * Normalizes Vietnamese diacritics for accent-insensitive search
 */
export function normalizeVietnamese(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}
