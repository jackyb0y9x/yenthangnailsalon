-- =============================================================================
-- Migration: 20261116000000_nail_salon_schema.sql
-- Description: Complete idempotent schema for Australian Nail Salon application
-- Tables: nail_business_info, nail_cms_sections, nail_services, nail_gallery_items,
--         nail_announcements, crm_customers, crm_consultations, staff_members,
--         staff_specializations, crm_visit_history, finance_categories,
--         finance_transactions, user_roles
-- Best Practices: Idempotent execution, B-tree indexed foreign keys, RLS cached (select auth.uid()),
--                 updated_at triggers, customer stats recalculation trigger.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. CMS MODULE TABLES
-- =============================================================================

-- 1.1 nail_business_info (Singleton Australian Salon Business Configuration)
CREATE TABLE IF NOT EXISTS public.nail_business_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_name text NOT NULL DEFAULT 'Glamour Nails & Beauty Lounge',
  abn text NOT NULL DEFAULT '51 824 753 556',
  phone text NOT NULL DEFAULT '+61 2 9123 4567',
  mobile text NOT NULL DEFAULT '+61 412 345 678',
  email text NOT NULL DEFAULT 'contact@glamournails.com.au',
  address_street text NOT NULL DEFAULT 'Suite 2, 188 George Street',
  suburb text NOT NULL DEFAULT 'Sydney',
  state text NOT NULL DEFAULT 'NSW' CHECK (state IN ('NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT')),
  postcode text NOT NULL DEFAULT '2000' CHECK (postcode ~ '^[0-9]{4}$'),
  country text NOT NULL DEFAULT 'Australia',
  latitude numeric(10, 7) NOT NULL DEFAULT -33.8688,
  longitude numeric(10, 7) NOT NULL DEFAULT 151.2093,
  opening_hours jsonb NOT NULL DEFAULT '{
    "monday": {"open": "09:30", "close": "18:30", "closed": false},
    "tuesday": {"open": "09:30", "close": "18:30", "closed": false},
    "wednesday": {"open": "09:30", "close": "18:30", "closed": false},
    "thursday": {"open": "09:30", "close": "20:00", "closed": false},
    "friday": {"open": "09:30", "close": "19:00", "closed": false},
    "saturday": {"open": "09:00", "close": "18:00", "closed": false},
    "sunday": {"open": "10:00", "close": "17:00", "closed": false}
  }'::jsonb,
  social_links jsonb NOT NULL DEFAULT '{
    "instagram": "https://instagram.com/glamournails.sydney",
    "facebook": "https://facebook.com/glamournails.sydney",
    "tiktok": "https://tiktok.com/@glamournails.sydney"
  }'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 1.2 nail_cms_sections (Dynamic Homepage Sections)
CREATE TABLE IF NOT EXISTS public.nail_cms_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text UNIQUE NOT NULL,
  title_en text NOT NULL,
  title_vi text NOT NULL,
  subtitle_en text,
  subtitle_vi text,
  content_en text,
  content_vi text,
  cta_text_en text,
  cta_text_vi text,
  cta_link text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nail_cms_sections_active_order ON public.nail_cms_sections(is_active, display_order);

-- 1.3 nail_services (Service Menu Catalog with AUD Pricing)
CREATE TABLE IF NOT EXISTS public.nail_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('Manicure', 'Pedicure', 'SNS & Dipping', 'Acrylic & Extensions', 'Gel Art & Design', 'Spa Packages')),
  name_en text NOT NULL,
  name_vi text NOT NULL,
  description_en text,
  description_vi text,
  duration_minutes integer NOT NULL DEFAULT 45 CHECK (duration_minutes > 0),
  price_aud numeric(12, 2) NOT NULL CHECK (price_aud >= 0),
  image_url text,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nail_services_category ON public.nail_services(category);
CREATE INDEX IF NOT EXISTS idx_nail_services_active_order ON public.nail_services(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_nail_services_featured ON public.nail_services(is_featured) WHERE is_featured = true;

-- 1.4 nail_gallery_items (Image Showcase Lookbook)
CREATE TABLE IF NOT EXISTS public.nail_gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en text NOT NULL,
  title_vi text NOT NULL,
  category_tag text NOT NULL,
  image_url text NOT NULL,
  thumbnail_url text,
  tags text[] NOT NULL DEFAULT '{}',
  is_featured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nail_gallery_featured ON public.nail_gallery_items(is_featured, display_order);
CREATE INDEX IF NOT EXISTS idx_nail_gallery_category ON public.nail_gallery_items(category_tag);

-- 1.5 nail_announcements (Top Promotional Bar & Notices)
CREATE TABLE IF NOT EXISTS public.nail_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en text NOT NULL,
  title_vi text NOT NULL,
  content_en text NOT NULL,
  content_vi text NOT NULL,
  badge_text_en text DEFAULT 'Special Offer',
  badge_text_vi text DEFAULT 'Ưu Đãi Đặc Biệt',
  link_url text,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nail_announcements_active ON public.nail_announcements(is_active, priority);

-- =============================================================================
-- 2. CRM & CUSTOMER TABLES
-- =============================================================================

-- 2.1 crm_customers (Customer Directory & Nail Preferences)
CREATE TABLE IF NOT EXISTS public.crm_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text,
  preferred_language text NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'vi')),
  nail_shape_preference text CHECK (nail_shape_preference IS NULL OR nail_shape_preference IN ('Almond', 'Coffin', 'Square', 'Oval', 'Stiletto', 'Squoval')),
  preferred_services text[] NOT NULL DEFAULT '{}',
  allergies_sensitivities text,
  general_notes text,
  total_visits integer NOT NULL DEFAULT 0 CHECK (total_visits >= 0),
  total_spent_aud numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_spent_aud >= 0),
  first_visit_date date,
  last_visit_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_customers_phone ON public.crm_customers(phone);
CREATE INDEX IF NOT EXISTS idx_crm_customers_name ON public.crm_customers(full_name);
CREATE INDEX IF NOT EXISTS idx_crm_customers_email ON public.crm_customers(email) WHERE email IS NOT NULL;

-- 2.2 crm_consultations (Website Inquiries & Consultation Triage)
CREATE TABLE IF NOT EXISTS public.crm_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  phone text NOT NULL,
  email text,
  preferred_language text NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'vi')),
  preferred_date date,
  preferred_time text,
  service_requested_id uuid REFERENCES public.nail_services(id) ON DELETE SET NULL,
  services_requested text[] NOT NULL DEFAULT '{}',
  notes text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'booked', 'completed', 'cancelled')),
  source text NOT NULL DEFAULT 'web_form' CHECK (source IN ('web_form', 'phone', 'walk_in', 'social_media')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_consultations_customer_id ON public.crm_consultations(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_consultations_service_id ON public.crm_consultations(service_requested_id);
CREATE INDEX IF NOT EXISTS idx_crm_consultations_status ON public.crm_consultations(status, created_at DESC);

-- =============================================================================
-- 3. STAFF MODULE TABLES
-- =============================================================================

-- 3.1 staff_members (Employee Directory)
CREATE TABLE IF NOT EXISTS public.staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'technician' CHECK (role IN ('owner', 'manager', 'senior_technician', 'technician', 'apprentice', 'receptionist')),
  employment_type text NOT NULL DEFAULT 'Full-time' CHECK (employment_type IN ('Full-time', 'Part-time', 'Casual', 'Contractor')),
  bio_en text,
  bio_vi text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  hire_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_members_auth_user ON public.staff_members(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_members_active_role ON public.staff_members(is_active, role);

-- 3.2 staff_specializations (Technician Specializations & Skills)
CREATE TABLE IF NOT EXISTS public.staff_specializations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  specialization text NOT NULL,
  proficiency_level text NOT NULL DEFAULT 'expert' CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert', 'master')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_specializations_staff_skill_unique UNIQUE (staff_id, specialization)
);
CREATE INDEX IF NOT EXISTS idx_staff_specializations_staff_id ON public.staff_specializations(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_specializations_skill ON public.staff_specializations(specialization);

-- =============================================================================
-- 4. SERVICE VISIT HISTORY TABLE
-- =============================================================================

-- 4.1 crm_visit_history (Client Service Visits)
CREATE TABLE IF NOT EXISTS public.crm_visit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.nail_services(id) ON DELETE SET NULL,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  price_charged_aud numeric(12, 2) NOT NULL CHECK (price_charged_aud >= 0),
  tip_aud numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (tip_aud >= 0),
  total_paid_aud numeric(12, 2) GENERATED ALWAYS AS (price_charged_aud + tip_aud) STORED,
  payment_method text NOT NULL DEFAULT 'card' CHECK (payment_method IN ('cash', 'card', 'eftpos', 'bank_transfer', 'gift_card', 'other')),
  notes text,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  photo_urls text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_visit_customer_id ON public.crm_visit_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_visit_staff_id ON public.crm_visit_history(staff_id);
CREATE INDEX IF NOT EXISTS idx_crm_visit_service_id ON public.crm_visit_history(service_id);
CREATE INDEX IF NOT EXISTS idx_crm_visit_date ON public.crm_visit_history(visit_date DESC);

-- =============================================================================
-- 5. FINANCE MODULE TABLES
-- =============================================================================

-- 5.1 finance_categories (Transaction Categories)
CREATE TABLE IF NOT EXISTS public.finance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  description text,
  is_tax_deductible boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT finance_categories_name_type_unique UNIQUE (name, type)
);
CREATE INDEX IF NOT EXISTS idx_finance_categories_type ON public.finance_categories(type, display_order);

-- 5.2 finance_transactions (Financial Ledger & GST Accounting)
CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category_id uuid NOT NULL REFERENCES public.finance_categories(id) ON DELETE RESTRICT,
  amount_aud numeric(12, 2) NOT NULL CHECK (amount_aud > 0),
  gst_amount_aud numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (gst_amount_aud >= 0),
  payment_method text NOT NULL DEFAULT 'card' CHECK (payment_method IN ('cash', 'card', 'eftpos', 'bank_transfer', 'gift_card', 'other')),
  description text NOT NULL,
  reference_id uuid,
  receipt_url text,
  customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_finance_trans_date ON public.finance_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_trans_type_date ON public.finance_transactions(type, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_trans_category_id ON public.finance_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_finance_trans_ref_id ON public.finance_transactions(reference_id) WHERE reference_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finance_trans_customer_id ON public.finance_transactions(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finance_trans_staff_id ON public.finance_transactions(staff_id) WHERE staff_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finance_trans_created_by ON public.finance_transactions(created_by) WHERE created_by IS NOT NULL;

-- =============================================================================
-- 6. ROLE-BASED ACCESS CONTROL (RBAC)
-- =============================================================================

-- 6.1 user_roles (RBAC Mapping table)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('super_admin', 'manager', 'staff')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- =============================================================================
-- 7. DATABASE FUNCTIONS & TRIGGERS
-- =============================================================================

-- 7.1 Automatic updated_at handler
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all mutable tables
DROP TRIGGER IF EXISTS set_updated_at_nail_business_info ON public.nail_business_info;
CREATE TRIGGER set_updated_at_nail_business_info BEFORE UPDATE ON public.nail_business_info FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_nail_cms_sections ON public.nail_cms_sections;
CREATE TRIGGER set_updated_at_nail_cms_sections BEFORE UPDATE ON public.nail_cms_sections FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_nail_services ON public.nail_services;
CREATE TRIGGER set_updated_at_nail_services BEFORE UPDATE ON public.nail_services FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_nail_gallery_items ON public.nail_gallery_items;
CREATE TRIGGER set_updated_at_nail_gallery_items BEFORE UPDATE ON public.nail_gallery_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_nail_announcements ON public.nail_announcements;
CREATE TRIGGER set_updated_at_nail_announcements BEFORE UPDATE ON public.nail_announcements FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_crm_customers ON public.crm_customers;
CREATE TRIGGER set_updated_at_crm_customers BEFORE UPDATE ON public.crm_customers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_crm_consultations ON public.crm_consultations;
CREATE TRIGGER set_updated_at_crm_consultations BEFORE UPDATE ON public.crm_consultations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_staff_members ON public.staff_members;
CREATE TRIGGER set_updated_at_staff_members BEFORE UPDATE ON public.staff_members FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_crm_visit_history ON public.crm_visit_history;
CREATE TRIGGER set_updated_at_crm_visit_history BEFORE UPDATE ON public.crm_visit_history FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_finance_transactions ON public.finance_transactions;
CREATE TRIGGER set_updated_at_finance_transactions BEFORE UPDATE ON public.finance_transactions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_user_roles ON public.user_roles;
CREATE TRIGGER set_updated_at_user_roles BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7.2 Customer Statistics Auto-Recalculation Trigger
CREATE OR REPLACE FUNCTION public.recalculate_customer_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_customer_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_customer_id := OLD.customer_id;
  ELSE
    target_customer_id := NEW.customer_id;
  END IF;

  UPDATE public.crm_customers
  SET
    total_visits = (SELECT count(*) FROM public.crm_visit_history WHERE customer_id = target_customer_id),
    total_spent_aud = COALESCE((SELECT sum(total_paid_aud) FROM public.crm_visit_history WHERE customer_id = target_customer_id), 0.00),
    first_visit_date = (SELECT min(visit_date) FROM public.crm_visit_history WHERE customer_id = target_customer_id),
    last_visit_date = (SELECT max(visit_date) FROM public.crm_visit_history WHERE customer_id = target_customer_id)
  WHERE id = target_customer_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalculate_customer_stats ON public.crm_visit_history;
CREATE TRIGGER trg_recalculate_customer_stats
AFTER INSERT OR UPDATE OR DELETE ON public.crm_visit_history
FOR EACH ROW EXECUTE FUNCTION public.recalculate_customer_stats();

-- =============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS across all 13 tables
ALTER TABLE public.nail_business_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nail_cms_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nail_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nail_gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nail_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_visit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helper role function (cached subquery)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid());
$$;

-- 8.1 CMS Policies: Public Read, Admin Manage
DROP POLICY IF EXISTS "Public read nail_business_info" ON public.nail_business_info;
CREATE POLICY "Public read nail_business_info" ON public.nail_business_info FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage nail_business_info" ON public.nail_business_info;
CREATE POLICY "Admin manage nail_business_info" ON public.nail_business_info FOR ALL
  USING ((SELECT public.current_user_role()) IN ('super_admin', 'manager'));

DROP POLICY IF EXISTS "Public read active nail_cms_sections" ON public.nail_cms_sections;
CREATE POLICY "Public read active nail_cms_sections" ON public.nail_cms_sections FOR SELECT
  USING (is_active = true OR (SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admin manage nail_cms_sections" ON public.nail_cms_sections;
CREATE POLICY "Admin manage nail_cms_sections" ON public.nail_cms_sections FOR ALL
  USING ((SELECT public.current_user_role()) IN ('super_admin', 'manager'));

DROP POLICY IF EXISTS "Public read active nail_services" ON public.nail_services;
CREATE POLICY "Public read active nail_services" ON public.nail_services FOR SELECT
  USING (is_active = true OR (SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admin manage nail_services" ON public.nail_services;
CREATE POLICY "Admin manage nail_services" ON public.nail_services FOR ALL
  USING ((SELECT public.current_user_role()) IN ('super_admin', 'manager'));

DROP POLICY IF EXISTS "Public read nail_gallery_items" ON public.nail_gallery_items;
CREATE POLICY "Public read nail_gallery_items" ON public.nail_gallery_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage nail_gallery_items" ON public.nail_gallery_items;
CREATE POLICY "Admin manage nail_gallery_items" ON public.nail_gallery_items FOR ALL
  USING ((SELECT public.current_user_role()) IN ('super_admin', 'manager'));

DROP POLICY IF EXISTS "Public read active nail_announcements" ON public.nail_announcements;
CREATE POLICY "Public read active nail_announcements" ON public.nail_announcements FOR SELECT
  USING (is_active = true OR (SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admin manage nail_announcements" ON public.nail_announcements;
CREATE POLICY "Admin manage nail_announcements" ON public.nail_announcements FOR ALL
  USING ((SELECT public.current_user_role()) IN ('super_admin', 'manager'));

-- 8.2 Consultations Policies: Public Insert, Staff/Admin Manage
DROP POLICY IF EXISTS "Public submit consultation" ON public.crm_consultations;
CREATE POLICY "Public submit consultation" ON public.crm_consultations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Staff manage crm_consultations" ON public.crm_consultations;
CREATE POLICY "Staff manage crm_consultations" ON public.crm_consultations FOR ALL
  USING ((SELECT public.current_user_role()) IN ('super_admin', 'manager', 'staff'));

-- 8.3 CRM & Visit History Policies: Staff/Admin Manage
DROP POLICY IF EXISTS "Staff manage crm_customers" ON public.crm_customers;
CREATE POLICY "Staff manage crm_customers" ON public.crm_customers FOR ALL
  USING ((SELECT public.current_user_role()) IN ('super_admin', 'manager', 'staff'));

DROP POLICY IF EXISTS "Staff manage crm_visit_history" ON public.crm_visit_history;
CREATE POLICY "Staff manage crm_visit_history" ON public.crm_visit_history FOR ALL
  USING ((SELECT public.current_user_role()) IN ('super_admin', 'manager', 'staff'));

-- 8.4 Staff Policies: Public Read Active, Admin Manage
DROP POLICY IF EXISTS "Public read active staff_members" ON public.staff_members;
CREATE POLICY "Public read active staff_members" ON public.staff_members FOR SELECT
  USING (is_active = true OR (SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admin manage staff_members" ON public.staff_members;
CREATE POLICY "Admin manage staff_members" ON public.staff_members FOR ALL
  USING ((SELECT public.current_user_role()) IN ('super_admin', 'manager'));

DROP POLICY IF EXISTS "Public read staff_specializations" ON public.staff_specializations;
CREATE POLICY "Public read staff_specializations" ON public.staff_specializations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage staff_specializations" ON public.staff_specializations;
CREATE POLICY "Admin manage staff_specializations" ON public.staff_specializations FOR ALL
  USING ((SELECT public.current_user_role()) IN ('super_admin', 'manager'));

-- 8.5 Finance Policies: Strict Super Admin & Manager Restriction
DROP POLICY IF EXISTS "Staff read finance_categories" ON public.finance_categories;
CREATE POLICY "Staff read finance_categories" ON public.finance_categories FOR SELECT
  USING ((SELECT public.current_user_role()) IN ('super_admin', 'manager', 'staff'));

DROP POLICY IF EXISTS "Manager manage finance_categories" ON public.finance_categories;
CREATE POLICY "Manager manage finance_categories" ON public.finance_categories FOR ALL
  USING ((SELECT public.current_user_role()) IN ('super_admin', 'manager'));

DROP POLICY IF EXISTS "Manager manage finance_transactions" ON public.finance_transactions;
CREATE POLICY "Manager manage finance_transactions" ON public.finance_transactions FOR ALL
  USING ((SELECT public.current_user_role()) IN ('super_admin', 'manager'));

-- 8.6 RBAC User Roles Policies
DROP POLICY IF EXISTS "Super admin manage user_roles" ON public.user_roles;
CREATE POLICY "Super admin manage user_roles" ON public.user_roles FOR ALL
  USING ((SELECT public.current_user_role()) = 'super_admin');

DROP POLICY IF EXISTS "Users read own role" ON public.user_roles;
CREATE POLICY "Users read own role" ON public.user_roles FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- =============================================================================
-- 9. STORAGE BUCKETS (Provisioning)
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('salon_cms', 'salon_cms', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('services', 'services', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('gallery', 'gallery', true, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('staff_avatars', 'staff_avatars', true, 3145728, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('receipts', 'receipts', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;
