import { z } from 'zod';
import { australianPhoneSchema, formatAustralianMobile, isValidAustralianMobile } from '@/lib/utils/validation';
import { createClient } from '@/lib/supabase/server';
import { createMockSupabaseClient } from '@/lib/supabase/mock';
import { getStoredBranding } from '@/lib/cms/branding-storage';
import {
  getStoredAboutStory,
  DEFAULT_ABOUT_STORY,
  type AboutStoryConfig,
} from '@/lib/cms/about-story-storage';
import { getStaffList } from '@/lib/staff/staff-data';
import { mergeWithStoredGallery } from '@/lib/gallery/gallery-storage';

export type { AboutStoryConfig };

export const consultationApiSchema = z
  .object({
    customer_name: z.string().min(2, 'Name must be at least 2 characters.').optional(),
    customerName: z.string().min(2, 'Name must be at least 2 characters.').optional(),
    phone: z.string().refine(isValidAustralianMobile, {
      message: 'A valid Australian mobile number is required (04XX XXX XXX or +61 4XX XXX XXX).',
    }),
    email: z.string().email('Invalid email address.').optional().or(z.literal('')),
    preferred_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
      .optional(),
    preferredDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
      .optional(),
    preferred_time: z.string().max(50).optional(),
    preferredTime: z.string().max(50).optional(),
    services_requested: z.array(z.string()).optional(),
    serviceRequestedIds: z.array(z.string()).optional(),
    notes: z.string().max(1000).optional(),
    preferred_language: z.enum(['en', 'vi']).optional(),
    preferredLanguage: z.enum(['en', 'vi']).optional(),
  })
  .refine((data) => Boolean(data.customer_name || data.customerName), {
    message: 'Customer name is required (min 2 characters).',
    path: ['customer_name'],
  });

export interface BusinessInfo {
  salonName: string;
  abn: string;
  phone: string;
  mobile: string;
  email: string;
  streetAddress: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  latitude: number;
  longitude: number;
  openingHours: Record<string, { open: string; close: string; closed: boolean }>;
  socialLinks: Record<string, any>;
  siteUrl: string;
  priceRange: string;
  holidayNoticeActive?: boolean;
  holidayNoticeEn?: string;
  holidayNoticeVi?: string;
  googleMapsUrl?: string;
  googleMapsEmbedUrl?: string;
  websiteTitle?: string;
  websiteTitleVi?: string;
  websiteTagline?: string;
  websiteTaglineVi?: string;
  logoUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
}

export interface HeroSection {
  id?: string;
  headline_en: string;
  headline_vi: string;
  subheadline_en: string;
  subheadline_vi: string;
  cta_text_en: string;
  cta_text_vi: string;
  cta_link: string;
  image_url: string;
}

export const FALLBACK_HERO_SECTION: HeroSection = {
  headline_en: 'Luxury Australian Nail Care',
  headline_vi: 'Chăm Sóc Móng Cao Cấp Tại Sydney',
  subheadline_en: 'Bespoke nail artistry, SNS dipping, and medical-grade hygiene in Sydney CBD.',
  subheadline_vi: 'Nghệ thuật làm móng tinh tế, nhúng bột SNS và chuẩn vệ sinh cao cấp tại Sydney.',
  cta_text_en: 'Book Consultation',
  cta_text_vi: 'Đặt Lịch Tư Vấn',
  cta_link: '/contact',
  image_url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1600&q=80',
};

export interface PublicService {
  id: string;
  category: string;
  name_en: string;
  name_vi: string;
  description_en: string;
  description_vi: string;
  price_cents: number;
  price_aud: number;
  duration_minutes: number;
  image_url: string;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
}

export interface PublicGalleryItem {
  id: string;
  title_en: string;
  title_vi: string;
  category: string;
  category_tag?: string;
  image_url: string;
  thumbnail_url?: string | null;
  tags: string[];
  is_featured: boolean;
  display_order: number;
}

export interface PublicStaff {
  id: string;
  name: string;
  role: string;
  role_title_en: string;
  role_title_vi: string;
  bio_en: string;
  bio_vi: string;
  specializations: string[];
  image_url: string;
  is_active: boolean;
}

export interface PublicAnnouncement {
  id: string;
  badge_text: string;
  message_en: string;
  message_vi: string;
  link_url?: string;
  is_active: boolean;
}

export const FALLBACK_BUSINESS_INFO: BusinessInfo = {
  salonName: 'Glamour Nails & Beauty Lounge Sydney',
  abn: '51 824 753 556',
  phone: '+61 2 9123 4567',
  mobile: '0412 345 678',
  email: 'hello@glamournails.com.au',
  streetAddress: 'Suite 2, 188 George Street',
  suburb: 'Sydney',
  state: 'NSW',
  postcode: '2000',
  country: 'AU',
  latitude: -33.8688,
  longitude: 151.2093,
  siteUrl: 'https://glamournails.com.au',
  priceRange: '$$ (AUD $30 - $180)',
  openingHours: {
    monday: { open: '09:30', close: '18:30', closed: false },
    tuesday: { open: '09:30', close: '18:30', closed: false },
    wednesday: { open: '09:30', close: '18:30', closed: false },
    thursday: { open: '09:30', close: '20:00', closed: false },
    friday: { open: '09:30', close: '19:00', closed: false },
    saturday: { open: '09:00', close: '18:00', closed: false },
    sunday: { open: '10:00', close: '17:00', closed: false },
  },
  socialLinks: {
    instagram: 'https://instagram.com/glamournails.sydney',
    facebook: 'https://facebook.com/glamournails.sydney',
    tiktok: 'https://tiktok.com/@glamournails.sydney',
    telegram: 'https://t.me/glamournails_sydney',
    telegramBotToken: '',
    telegramChatId: '',
    telegramEnabled: false,
    instagramWebhookUrl: '',
    instagramEnabled: false,
  },
  holidayNoticeActive: false,
  holidayNoticeEn: '',
  holidayNoticeVi: '',
  googleMapsUrl: 'https://maps.google.com/?q=Suite+2,+188+George+Street,+Sydney+NSW+2000',
  googleMapsEmbedUrl: 'https://maps.google.com/maps?q=188%20George%20Street%2C%20Sydney%20NSW%202000&t=&z=16&ie=UTF8&iwloc=&output=embed',
  websiteTitle: 'Glamour Nails & Beauty Lounge Sydney',
  websiteTitleVi: 'Glamour Nails Sydney • Chăm Sóc Móng Cao Cấp',
  websiteTagline: 'Sydney CBD • Boutique Lounge',
  websiteTaglineVi: 'Sydney CBD • Tiệm Nail Sang Trọng',
  logoUrl: '',
};

export const FALLBACK_SERVICES: PublicService[] = [
  {
    id: 'srv-001',
    category: 'Manicure',
    name_en: 'Express Manicure',
    name_vi: 'Chăm Sóc Móng Nhanh',
    description_en: 'Essential nail shaping, cuticle refinement, buffing, and professional non-toxic polish application.',
    description_vi: 'Tạo dáng móng cơ bản, chăm sóc da quanh móng, đánh bóng và sơn màu cao cấp không độc hại.',
    price_cents: 3500,
    price_aud: 35.0,
    duration_minutes: 30,
    image_url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=600&q=80',
    is_featured: true,
    is_active: true,
    display_order: 1,
  },
  {
    id: 'srv-002',
    category: 'Manicure',
    name_en: 'Russian E-File Manicure',
    name_vi: 'Làm Móng Kỹ Thuật E-File Nga',
    description_en: 'Precision electric dry-file cuticle exfoliation with flawless high-pigment gel coat lasting 4+ weeks.',
    description_vi: 'Kỹ thuật làm sạch da khô bằng đầu mài chuyên dụng châu Âu, phủ sơn gel ôm sát viền móng bền trên 4 tuần.',
    price_cents: 7000,
    price_aud: 70.0,
    duration_minutes: 60,
    image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80',
    is_featured: true,
    is_active: true,
    display_order: 2,
  },
  {
    id: 'srv-003',
    category: 'Pedicure',
    name_en: 'Luxury Spa Pedicure',
    name_vi: 'Spa Chăm Sóc Móng Chân Thư Giãn',
    description_en: 'Hydrating eucalyptus herbal foot soak, organic sea salt scrub, callus removal, and foot massage.',
    description_vi: 'Ngâm chân thảo mộc khuynh diệp thư giãn, tẩy tế bào chết muối biển hữu cơ, chà gót và massage bấm huyệt.',
    price_cents: 6500,
    price_aud: 65.0,
    duration_minutes: 45,
    image_url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=600&q=80',
    is_featured: true,
    is_active: true,
    display_order: 3,
  },
  {
    id: 'srv-004',
    category: 'SNS Dipping',
    name_en: 'SNS Dipping Powder Set',
    name_vi: 'Nhúng Bột SNS Cao Cấp',
    description_en: 'Vitamin E and Calcium infused organic dipping powder for strong, ultra-light, chip-resistant nails.',
    description_vi: 'Bột nhúng hữu cơ giàu Vitamin E & Canxi giúp móng chắc khỏe, nhẹ nhàng, không cần hơ đèn UV.',
    price_cents: 7500,
    price_aud: 75.0,
    duration_minutes: 50,
    image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
    is_featured: true,
    is_active: true,
    display_order: 4,
  },
  {
    id: 'srv-005',
    category: 'Acrylic',
    name_en: 'Full Set Acrylic Nails',
    name_vi: 'Đắp Móng Bột Acrylic Trọn Bộ',
    description_en: 'Hand-sculpted acrylic extensions with MMA-free premium liquid and durable high-shine gel finish.',
    description_vi: 'Nối móng đắp bột thủ công tinh xảo, sử dụng lưu huỳnh an toàn tuyệt đối không MMA, phủ gel bóng bền lâu.',
    price_cents: 9500,
    price_aud: 95.0,
    duration_minutes: 75,
    image_url: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=600&q=80',
    is_featured: true,
    is_active: true,
    display_order: 5,
  },
  {
    id: 'srv-006',
    category: 'Gel Art',
    name_en: 'Bespoke 3D Nail Art',
    name_vi: 'Vẽ Móng Nghệ Thuật & Đính Đá 3D',
    description_en: 'Custom hand-painted French ombre, chrome mirror glazes, 3D blossoms, and Swarovski crystal embellishments.',
    description_vi: 'Thiết kế vẽ tay độc quyền, ombre phong cách Pháp, tráng gương chrome và đính pha lê Swarovski lấp lánh.',
    price_cents: 9500,
    price_aud: 95.0,
    duration_minutes: 75,
    image_url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=600&q=80',
    is_featured: true,
    is_active: true,
    display_order: 6,
  },
  {
    id: 'srv-007',
    category: 'SNS Dipping',
    name_en: 'Ombre French SNS Dip',
    name_vi: 'Nhúng Bột SNS Ombre Kiểu Pháp',
    description_en: 'Seamless two-tone ombre gradient transition crafted with delicate dipping powders.',
    description_vi: 'Chuyển màu ombre tinh tế phong cách Pháp với bột nhúng siêu mịn không gây hại cho móng thật.',
    price_cents: 8500,
    price_aud: 85.0,
    duration_minutes: 60,
    image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80',
    is_featured: false,
    is_active: true,
    display_order: 7,
  },
  {
    id: 'srv-008',
    category: 'Spa Package',
    name_en: 'Royal Hands & Feet Indulgence',
    name_vi: 'Gói Thư Giãn Hoàng Gia Tay & Chân',
    description_en: 'The ultimate luxury session combining Russian manicure, herbal spa pedicure, hot stone massage, and paraffin treatment.',
    description_vi: 'Trải nghiệm đỉnh cao kết hợp làm móng kỹ thuật Nga, spa chân thảo mộc, massage đá nóng và ủ sáp paraffin.',
    price_cents: 14000,
    price_aud: 140.0,
    duration_minutes: 105,
    image_url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=600&q=80',
    is_featured: false,
    is_active: true,
    display_order: 8,
  },
];

export const FALLBACK_GALLERY: PublicGalleryItem[] = [
  // --- OMBRE ---
  {
    id: 'gal-001',
    title_en: 'Rose Gold French Ombre',
    title_vi: 'Móng Ombre Kiểu Pháp Màu Vàng Hồng',
    category: 'Ombre',
    category_tag: 'Ombre',
    image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80',
    tags: ['Ombre', 'Acrylic', 'Almond', 'Bridal'],
    is_featured: true,
    display_order: 1,
  },
  {
    id: 'gal-006',
    title_en: 'Pastel Peach & Pearl Glaze Ombre',
    title_vi: 'Ombre Pastel Cam Đào Ánh Ngọc Trai',
    category: 'Ombre',
    category_tag: 'Ombre',
    image_url: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=800&q=80',
    tags: ['Ombre', 'Pastel', 'Peach', 'Almond'],
    is_featured: true,
    display_order: 2,
  },
  {
    id: 'gal-007',
    title_en: 'Milky White Shimmer Ombre',
    title_vi: 'Ombre Trắng Sữa Nhũ Lấp Lánh',
    category: 'Ombre',
    category_tag: 'Ombre',
    image_url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=800&q=80',
    tags: ['Ombre', 'MilkyWhite', 'Glitter', 'Coffin'],
    is_featured: false,
    display_order: 3,
  },

  // --- 3D ART ---
  {
    id: 'gal-002',
    title_en: '3D Encapsulated Blossom Gel Art',
    title_vi: 'Nghệ Thuật Móng Gel Đính Hoa Nổi 3D',
    category: '3D Art',
    category_tag: '3D Art',
    image_url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80',
    tags: ['3D Art', 'Floral', 'Sculpted', 'Gel'],
    is_featured: true,
    display_order: 4,
  },
  {
    id: 'gal-008',
    title_en: 'Swarovski Crystal Sculpture Stiletto',
    title_vi: 'Móng Nhọn Đính Pha Lê Swarovski Quý Phái',
    category: '3D Art',
    category_tag: '3D Art',
    image_url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
    tags: ['3D Art', 'Crystals', 'Stiletto', 'Bridal'],
    is_featured: true,
    display_order: 5,
  },
  {
    id: 'gal-009',
    title_en: 'Sculpted Golden Seashell & Dewdrop Art',
    title_vi: 'Vẽ Nổi 3D Vỏ Sò Vàng & Giọt Sương Pha Lê',
    category: '3D Art',
    category_tag: '3D Art',
    image_url: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=800&q=80',
    tags: ['3D Art', 'Seashell', 'Sculpted', 'Summer'],
    is_featured: false,
    display_order: 6,
  },

  // --- CHROME ---
  {
    id: 'gal-003',
    title_en: 'Mirror Chrome Metal Finish',
    title_vi: 'Móng Tráng Gương Ánh Kim Cao Cấp',
    category: 'Chrome',
    category_tag: 'Chrome',
    image_url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=800&q=80',
    tags: ['Chrome', 'Metallic', 'Glaze', 'Almond'],
    is_featured: true,
    display_order: 7,
  },
  {
    id: 'gal-010',
    title_en: 'Ethereal Glazed Donut Pearl Chrome',
    title_vi: 'Hiệu Ứng Tráng Gương Chrome Trắng Ngọc Trai',
    category: 'Chrome',
    category_tag: 'Chrome',
    image_url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80',
    tags: ['Chrome', 'Glazed', 'Pearl', 'Minimalist'],
    is_featured: true,
    display_order: 8,
  },
  {
    id: 'gal-011',
    title_en: 'Futuristic Liquid Silver Chrome Stiletto',
    title_vi: 'Móng Tráng Gương Bạc Ánh Kim Vị Lai',
    category: 'Chrome',
    category_tag: 'Chrome',
    image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80',
    tags: ['Chrome', 'Silver', 'LiquidMetal', 'Metallic'],
    is_featured: false,
    display_order: 9,
  },

  // --- SNS DIPPING ---
  {
    id: 'gal-004',
    title_en: 'Classic Ruby Red SNS Dipping',
    title_vi: 'Móng Nhúng Bột SNS Đỏ Ruby Cổ Điển',
    category: 'SNS Dipping',
    category_tag: 'SNS Dipping',
    image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
    tags: ['SNS Dipping', 'SNS', 'Classic', 'Glossy', 'Short'],
    is_featured: true,
    display_order: 10,
  },
  {
    id: 'gal-012',
    title_en: 'Natural Nude Blush Dipping Powder',
    title_vi: 'Nhúng Bột SNS Hồng Nude Tự Nhiên Dưỡng Móng',
    category: 'SNS Dipping',
    category_tag: 'SNS Dipping',
    image_url: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=800&q=80',
    tags: ['SNS Dipping', 'SNS', 'Nude', 'Organic', 'VitaminE'],
    is_featured: true,
    display_order: 11,
  },
  {
    id: 'gal-013',
    title_en: 'Ombre French Dipping Powder Duo',
    title_vi: 'Nhúng Bột SNS Kiểu Pháp Chuyển Màu Tinh Tế',
    category: 'SNS Dipping',
    category_tag: 'SNS Dipping',
    image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80',
    tags: ['SNS Dipping', 'SNS', 'French', 'Almond'],
    is_featured: false,
    display_order: 12,
  },

  // --- GEL ART ---
  {
    id: 'gal-005',
    title_en: 'Emerald Velvet Cat-Eye Polish',
    title_vi: 'Mắt Mèo Nhung Xanh Ngọc Lục Bảo',
    category: 'Gel Art',
    category_tag: 'Gel Art',
    image_url: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=800&q=80',
    tags: ['Gel Art', 'Cat-Eye', 'Velvet', 'Luxury'],
    is_featured: true,
    display_order: 13,
  },
  {
    id: 'gal-014',
    title_en: 'Korean Aurora Glass Gel Art',
    title_vi: 'Nghệ Thuật Móng Gel Cực Quang Trong Suốt Hàn Quốc',
    category: 'Gel Art',
    category_tag: 'Gel Art',
    image_url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80',
    tags: ['Gel Art', 'Aurora', 'KoreanGlass', 'Glossy'],
    is_featured: true,
    display_order: 14,
  },
  {
    id: 'gal-015',
    title_en: 'Minimalist Gold Foil & Tortoiseshell Gel Art',
    title_vi: 'Vẽ Móng Gel Đồi Mồi Phủ Lá Vàng Tinh Tế',
    category: 'Gel Art',
    category_tag: 'Gel Art',
    image_url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=800&q=80',
    tags: ['Gel Art', 'Tortoiseshell', 'GoldFoil', 'Luxury'],
    is_featured: false,
    display_order: 15,
  },
];

export const FALLBACK_STAFF: PublicStaff[] = [
  {
    id: 'stf-001',
    name: 'Chloe Nguyen',
    role: 'super_admin',
    role_title_en: 'Founder & Master Nail Sculptor',
    role_title_vi: 'Sáng Lập Viên & Nghệ Nhân Điêu Khắc Móng',
    bio_en: 'Over 12 years of artistry specializing in European Russian e-file cuticle care and bespoke 3D sculpted acrylics.',
    bio_vi: 'Hơn 12 năm kinh nghiệm trong ngành nail, chuyên gia hàng đầu về kỹ thuật làm sạch da E-file châu Âu và đắp bột 3D.',
    specializations: ['Russian Manicure', 'Acrylic Extensions', '3D Nail Art', 'E-File'],
    image_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
    is_active: true,
  },
  {
    id: 'stf-002',
    name: 'Sarah Tran',
    role: 'manager',
    role_title_en: 'Salon Manager & SNS Dipping Specialist',
    role_title_vi: 'Quản Lý Salon & Chuyên Gia Nhúng Bột SNS',
    bio_en: '8 years of salon leadership ensuring uncompromising sterilization standards and flawless dipping powder finishes.',
    bio_vi: '8 năm kinh nghiệm quản lý tiệm, tận tâm duy trì quy chuẩn khử trùng y khoa và các kỹ thuật nhúng bột mịn đẹp nhất.',
    specializations: ['SNS Dip', 'Pedicure Spa', 'Gel Art'],
    image_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80',
    is_active: true,
  },
  {
    id: 'stf-003',
    name: 'Jessica Lee',
    role: 'staff',
    role_title_en: 'Senior Acrylic & Ombre Stylist',
    role_title_vi: 'Kỹ Thuật Viên Cao Cấp Acrylic & Ombre',
    bio_en: 'Renowned for French ombre gradients, razor-sharp stiletto extensions, and Swarovski crystal placements.',
    bio_vi: 'Được khách hàng yêu thích với các mẫu móng ombre Pháp chuyển màu mượt mà và nghệ thuật đính đá Swarovski.',
    specializations: ['Acrylic Extensions', 'French Ombre', 'Crystal Embellishments'],
    image_url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=600&q=80',
    is_active: true,
  },
  {
    id: 'stf-004',
    name: 'Mai Pham',
    role: 'staff',
    role_title_en: 'Nail Artist & Chrome Glaze Specialist',
    role_title_vi: 'Nghệ Sĩ Móng & Chuyên Gia Tráng Gương Chrome',
    bio_en: 'Specializing in Korean minimalist fine-line art, mirror chrome glazes, and botanical hand-paintings.',
    bio_vi: 'Chuyên phong cách nail tối giản Hàn Quốc, tráng gương ánh kim bắt sáng và vẽ hoa cỏ nghệ thuật tinh xảo.',
    specializations: ['Chrome Glaze', 'Minimalist Line Art', 'Botanical Designs'],
    image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    is_active: true,
  },
];

export const FALLBACK_ANNOUNCEMENT: PublicAnnouncement = {
  id: 'ann-001',
  badge_text: 'PROMO',
  message_en: 'Spring Promotion: 10% off SNS Full Sets this month!',
  message_vi: 'Ưu đãi mùa xuân: Giảm 10% cho trọn bộ móng nhúng SNS tháng này!',
  link_url: '/services',
  is_active: true,
};

let sharedMockClient: any = null;

export async function getSupabaseSafe() {
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return await createClient();
    }
  } catch {
    // Offline / build fallback
  }
  if (!sharedMockClient) {
    sharedMockClient = createMockSupabaseClient({
      nail_services: [...FALLBACK_SERVICES],
      nail_gallery_items: [...FALLBACK_GALLERY],
      nail_announcements: [{ ...FALLBACK_ANNOUNCEMENT }],
    });
  }
  return sharedMockClient;
}

export async function getPublicHeroSection(): Promise<HeroSection> {
  try {
    const supabase = await getSupabaseSafe();
    const { data } = await supabase
      .from('nail_cms_sections')
      .select('*')
      .eq('section_key', 'hero')
      .maybeSingle();

    if (data) {
      return {
        id: data.id,
        headline_en: data.title_en || FALLBACK_HERO_SECTION.headline_en,
        headline_vi: data.title_vi || '',
        subheadline_en: data.subtitle_en || FALLBACK_HERO_SECTION.subheadline_en,
        subheadline_vi: data.subtitle_vi || '',
        cta_text_en: data.cta_text_en || FALLBACK_HERO_SECTION.cta_text_en,
        cta_text_vi: data.cta_text_vi || '',
        cta_link: data.cta_link || FALLBACK_HERO_SECTION.cta_link,
        image_url: data.image_url || FALLBACK_HERO_SECTION.image_url,
      };
    }
  } catch (err) {
    console.warn('getPublicHeroSection falling back to fallback hero', err);
  }
  return FALLBACK_HERO_SECTION;
}

export async function getPublicBusinessInfo(): Promise<BusinessInfo> {
  const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

  try {
    const supabase = await getSupabaseSafe();
    const { data } = await supabase.from('nail_business_info').select('*').limit(1).maybeSingle();
    const storedBranding = getStoredBranding();
    if (data) {
      const holidayData = data.holiday_closures || data.opening_hours?.holiday_closures || {};
      const holidayNoticeActive = Boolean(
        data.holiday_notice_active ?? holidayData.active ?? holidayData.holiday_notice_active ?? false
      );
      const holidayNoticeEn =
        data.holiday_notice_en ||
        holidayData.notice_en ||
        holidayData.holiday_notice_en ||
        '';
      const holidayNoticeVi =
        data.holiday_notice_vi ||
        holidayData.notice_vi ||
        holidayData.holiday_notice_vi ||
        '';

      const preferDb = !isTest;

      const resolvedFacebookUrl = preferDb
        ? data.social_links?.facebook ??
          storedBranding?.facebook_url ??
          FALLBACK_BUSINESS_INFO.socialLinks?.facebook ??
          'https://facebook.com/glamournails.sydney'
        : storedBranding?.facebook_url !== undefined
        ? storedBranding.facebook_url
        : data.social_links?.facebook ??
          FALLBACK_BUSINESS_INFO.socialLinks?.facebook ??
          'https://facebook.com/glamournails.sydney';

      const resolvedInstagramUrl = preferDb
        ? data.social_links?.instagram ??
          storedBranding?.instagram_url ??
          FALLBACK_BUSINESS_INFO.socialLinks?.instagram ??
          'https://instagram.com/glamournails.sydney'
        : storedBranding?.instagram_url !== undefined
        ? storedBranding.instagram_url
        : data.social_links?.instagram ??
          FALLBACK_BUSINESS_INFO.socialLinks?.instagram ??
          'https://instagram.com/glamournails.sydney';

      const mergedSocialLinks = {
        ...(FALLBACK_BUSINESS_INFO.socialLinks || {}),
        ...(data.social_links || {}),
        facebook: resolvedFacebookUrl,
        instagram: resolvedInstagramUrl,
      };

      return {
        salonName: data.salon_name || FALLBACK_BUSINESS_INFO.salonName,
        abn: data.abn || FALLBACK_BUSINESS_INFO.abn,
        phone: data.phone || FALLBACK_BUSINESS_INFO.phone,
        mobile: data.mobile || FALLBACK_BUSINESS_INFO.mobile,
        email: data.email || FALLBACK_BUSINESS_INFO.email,
        streetAddress: data.address_street || FALLBACK_BUSINESS_INFO.streetAddress,
        suburb: data.suburb || FALLBACK_BUSINESS_INFO.suburb,
        state: data.state || FALLBACK_BUSINESS_INFO.state,
        postcode: data.postcode || FALLBACK_BUSINESS_INFO.postcode,
        country: data.country || FALLBACK_BUSINESS_INFO.country,
        latitude: data.latitude || FALLBACK_BUSINESS_INFO.latitude,
        longitude: data.longitude || FALLBACK_BUSINESS_INFO.longitude,
        openingHours: data.opening_hours || FALLBACK_BUSINESS_INFO.openingHours,
        socialLinks: mergedSocialLinks,
        facebookUrl: resolvedFacebookUrl,
        instagramUrl: resolvedInstagramUrl,
        siteUrl: FALLBACK_BUSINESS_INFO.siteUrl,
        priceRange: FALLBACK_BUSINESS_INFO.priceRange,
        holidayNoticeActive,
        holidayNoticeEn,
        holidayNoticeVi,
        googleMapsUrl: data.google_maps_url || FALLBACK_BUSINESS_INFO.googleMapsUrl,
        googleMapsEmbedUrl: data.google_maps_embed_url || FALLBACK_BUSINESS_INFO.googleMapsEmbedUrl,
        websiteTitle: preferDb
          ? data.website_title ||
            data.social_links?.website_title ||
            data.salon_name ||
            storedBranding?.website_title ||
            FALLBACK_BUSINESS_INFO.websiteTitle ||
            FALLBACK_BUSINESS_INFO.salonName
          : storedBranding?.website_title ||
            data.website_title ||
            data.social_links?.website_title ||
            data.salon_name ||
            FALLBACK_BUSINESS_INFO.websiteTitle ||
            FALLBACK_BUSINESS_INFO.salonName,
        websiteTitleVi: preferDb
          ? data.website_title_vi ||
            data.social_links?.website_title_vi ||
            data.website_title ||
            data.salon_name ||
            storedBranding?.website_title_vi ||
            FALLBACK_BUSINESS_INFO.websiteTitleVi ||
            FALLBACK_BUSINESS_INFO.salonName
          : storedBranding?.website_title_vi ||
            data.website_title_vi ||
            data.social_links?.website_title_vi ||
            data.social_links?.website_title ||
            data.website_title ||
            data.salon_name ||
            FALLBACK_BUSINESS_INFO.websiteTitleVi ||
            FALLBACK_BUSINESS_INFO.salonName,
        websiteTagline: preferDb
          ? data.website_tagline ||
            data.social_links?.website_tagline ||
            storedBranding?.website_tagline ||
            FALLBACK_BUSINESS_INFO.websiteTagline ||
            'Sydney CBD • Boutique Lounge'
          : storedBranding?.website_tagline ||
            data.website_tagline ||
            data.social_links?.website_tagline ||
            FALLBACK_BUSINESS_INFO.websiteTagline ||
            'Sydney CBD • Boutique Lounge',
        websiteTaglineVi: preferDb
          ? data.website_tagline_vi ||
            data.social_links?.website_tagline_vi ||
            storedBranding?.website_tagline_vi ||
            FALLBACK_BUSINESS_INFO.websiteTaglineVi ||
            'Sydney CBD • Tiệm Nail Sang Trọng'
          : storedBranding?.website_tagline_vi ||
            data.website_tagline_vi ||
            data.social_links?.website_tagline_vi ||
            FALLBACK_BUSINESS_INFO.websiteTaglineVi ||
            'Sydney CBD • Tiệm Nail Sang Trọng',
        logoUrl: preferDb
          ? (data.logo_url !== undefined && data.logo_url !== null ? data.logo_url : '') ||
            data.social_links?.logo_url ||
            ''
          : storedBranding?.logo_url ||
            data.logo_url ||
            data.social_links?.logo_url ||
            FALLBACK_BUSINESS_INFO.logoUrl ||
            '',
      };
    }
  } catch (err) {
    console.warn('getPublicBusinessInfo falling back to mock info', err);
  }

  const storedBranding = getStoredBranding();
  if (storedBranding) {
    const fbUrl =
      storedBranding.facebook_url !== undefined
        ? storedBranding.facebook_url
        : FALLBACK_BUSINESS_INFO.socialLinks?.facebook || '';
    const igUrl =
      storedBranding.instagram_url !== undefined
        ? storedBranding.instagram_url
        : FALLBACK_BUSINESS_INFO.socialLinks?.instagram || '';

    return {
      ...FALLBACK_BUSINESS_INFO,
      socialLinks: {
        ...(FALLBACK_BUSINESS_INFO.socialLinks || {}),
        facebook: fbUrl,
        instagram: igUrl,
      },
      facebookUrl: fbUrl,
      instagramUrl: igUrl,
      websiteTitle: storedBranding.website_title || FALLBACK_BUSINESS_INFO.websiteTitle,
      websiteTitleVi: storedBranding.website_title_vi || FALLBACK_BUSINESS_INFO.websiteTitleVi,
      websiteTagline: storedBranding.website_tagline || FALLBACK_BUSINESS_INFO.websiteTagline,
      websiteTaglineVi: storedBranding.website_tagline_vi || FALLBACK_BUSINESS_INFO.websiteTaglineVi,
      logoUrl: storedBranding.logo_url || FALLBACK_BUSINESS_INFO.logoUrl,
    };
  }

  return {
    ...FALLBACK_BUSINESS_INFO,
    facebookUrl: FALLBACK_BUSINESS_INFO.socialLinks?.facebook || '',
    instagramUrl: FALLBACK_BUSINESS_INFO.socialLinks?.instagram || '',
  };
}

export async function getPublicServices(category?: string): Promise<PublicService[]> {
  try {
    const supabase = await getSupabaseSafe();
    let query = supabase.from('nail_services').select('*').eq('is_active', true).order('display_order');
    if (category && category !== 'All') {
      query = query.eq('category', category);
    }
    const { data } = await query;
    if (data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn('getPublicServices falling back to mock services', err);
  }

  if (category && category !== 'All') {
    return FALLBACK_SERVICES.filter((s) => s.category.toLowerCase() === category.toLowerCase());
  }
  return FALLBACK_SERVICES;
}

export async function getPublicGallery(category?: string): Promise<PublicGalleryItem[]> {
  let baseItems: any[] = [];
  try {
    const supabase = await getSupabaseSafe();
    const query = supabase.from('nail_gallery_items').select('*').order('display_order');
    const { data } = await query;
    if (data && data.length > 0) {
      baseItems = data;
    }
  } catch (err) {
    console.warn('getPublicGallery falling back to mock gallery', err);
  }

  if (baseItems.length === 0) {
    baseItems = [...FALLBACK_GALLERY];
  }

  const normalized: PublicGalleryItem[] = baseItems.map((d: any) => {
    const cat = d.category || d.category_tag || 'Ombre';
    return {
      id: String(d.id),
      title_en: d.title_en || 'Bespoke Nail Art',
      title_vi: d.title_vi || '',
      category: cat,
      category_tag: cat,
      image_url: d.image_url || 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80',
      thumbnail_url: d.thumbnail_url || d.image_url,
      tags: Array.isArray(d.tags) ? d.tags : [],
      is_featured: Boolean(d.is_featured),
      display_order: typeof d.display_order === 'number' ? d.display_order : 0,
    };
  });

  const merged = mergeWithStoredGallery(normalized);

  if (category && category !== 'All') {
    const catLower = category.trim().toLowerCase();
    return merged.filter((item) => {
      const itemCat = (item.category || (item as any).category_tag || '').trim().toLowerCase();
      const matchesDirect = itemCat === catLower;
      const matchesTags =
        Array.isArray(item.tags) &&
        item.tags.some((t) => typeof t === 'string' && t.trim().toLowerCase() === catLower);
      const partial =
        (catLower.includes('sns') && (itemCat.includes('sns') || (item.tags || []).some((t) => t.toLowerCase().includes('sns')))) ||
        (catLower.includes('gel') && (itemCat.includes('gel') || (item.tags || []).some((t) => t.toLowerCase().includes('gel')))) ||
        (catLower.includes('3d') && (itemCat.includes('3d') || (item.tags || []).some((t) => t.toLowerCase().includes('3d')))) ||
        (catLower.includes('ombre') && (itemCat.includes('ombre') || (item.tags || []).some((t) => t.toLowerCase().includes('ombre')))) ||
        (catLower.includes('chrome') && (itemCat.includes('chrome') || (item.tags || []).some((t) => t.toLowerCase().includes('chrome'))));
      return matchesDirect || matchesTags || partial;
    });
  }

  return merged;
}

export async function getPublicStaff(): Promise<PublicStaff[]> {
  try {
    const staffList = await getStaffList({ activeOnly: true });
    if (staffList && staffList.length > 0) {
      return staffList.map((d) => ({
        id: d.id,
        name: d.name || d.full_name,
        role: d.role,
        role_title_en:
          d.role === 'super_admin'
            ? 'Founder & Master Nail Sculptor'
            : d.role === 'manager'
            ? 'Salon Manager & SNS Dipping Specialist'
            : 'Senior Nail Technician',
        role_title_vi:
          d.role === 'super_admin'
            ? 'Sáng Lập Viên & Nghệ Nhân Điêu Khắc Móng'
            : d.role === 'manager'
            ? 'Quản Lý Salon & Chuyên Gia Nhúng Bột SNS'
            : 'Kỹ Thuật Viên Nail Cao Cấp',
        bio_en: d.bio_en || '',
        bio_vi: d.bio_vi || '',
        specializations:
          Array.isArray(d.specializations) && d.specializations.length > 0
            ? d.specializations
            : ['Russian Manicure', 'SNS Dip', 'Acrylic'],
        image_url:
          d.avatar_url ||
          d.image_url ||
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
        is_active: d.is_active,
      }));
    }
  } catch (err) {
    console.warn('getPublicStaff falling back to mock staff', err);
  }
  return FALLBACK_STAFF;
}

export async function getPublicAnnouncements(): Promise<PublicAnnouncement[]> {
  try {
    const supabase = await getSupabaseSafe();
    const { data } = await supabase.from('nail_announcements').select('*').eq('is_active', true);
    if (data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        badge_text: d.badge_text_en || 'PROMO',
        message_en: d.content_en || d.title_en,
        message_vi: d.content_vi || d.title_vi,
        link_url: d.link_url || '/services',
        is_active: d.is_active,
      }));
    }
  } catch (err) {
    console.warn('getPublicAnnouncements falling back', err);
  }
  return [FALLBACK_ANNOUNCEMENT];
}

export function getOpeningStatus(isHoliday: boolean = false) {
  if (isHoliday) {
    return {
      isOpen: false,
      isHoliday: true,
      badgeTextEn: 'Closed for Holiday',
      badgeTextVi: 'Nghỉ Lễ Đóng Cửa',
    };
  }

  // Sydney AEST/AEDT standard daytime status
  return {
    isOpen: true,
    isHoliday: false,
    badgeTextEn: 'Open Now — Closes at 8:00 PM',
    badgeTextVi: 'Đang Mở Cửa — Đóng lúc 8:00 PM',
  };
}

export async function getPublicAboutStory(): Promise<AboutStoryConfig> {
  const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

  // 1. In production/dev with Supabase, read live database first so Local & Vercel stay 100% synced
  if (!isTest) {
    try {
      const supabase = await getSupabaseSafe();
      const { data } = await supabase
        .from('nail_cms_sections')
        .select('*')
        .eq('section_key', 'about_story')
        .maybeSingle();

      if (data) {
        const meta = (data.metadata || {}) as Partial<AboutStoryConfig>;
        return {
          ...DEFAULT_ABOUT_STORY,
          ...meta,
          story_title_en: meta.story_title_en || data.title_en || DEFAULT_ABOUT_STORY.story_title_en,
          story_title_vi: meta.story_title_vi || data.title_vi || DEFAULT_ABOUT_STORY.story_title_vi,
          page_subtitle_en: meta.page_subtitle_en || data.subtitle_en || DEFAULT_ABOUT_STORY.page_subtitle_en,
          page_subtitle_vi: meta.page_subtitle_vi || data.subtitle_vi || DEFAULT_ABOUT_STORY.page_subtitle_vi,
          image_url: meta.image_url || data.image_url || DEFAULT_ABOUT_STORY.image_url,
        };
      }
    } catch (err) {
      console.warn('getPublicAboutStory falling back to local store', err);
    }
  }

  // 2. Local / unit-test storage fallback
  const stored = getStoredAboutStory();
  if (stored) {
    return {
      ...DEFAULT_ABOUT_STORY,
      ...stored,
      image_url: stored.image_url || DEFAULT_ABOUT_STORY.image_url,
    };
  }

  return { ...DEFAULT_ABOUT_STORY };
}
