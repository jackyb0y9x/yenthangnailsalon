-- ==============================================================================
-- Migration: 20261116000001_crm_staff_enhancements.sql
-- Description: Milestone 4 CRM soft-deletion, nail length preferences,
--              expanded staff operational roles, and visit services rendered.
-- ==============================================================================

-- 1. Add is_active and nail_length_preference to crm_customers
ALTER TABLE public.crm_customers
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.crm_customers
  ADD COLUMN IF NOT EXISTS nail_length_preference text
  CHECK (nail_length_preference IS NULL OR nail_length_preference IN ('Short', 'Medium', 'Long', 'Extra Long'));

CREATE INDEX IF NOT EXISTS idx_crm_customers_active
  ON public.crm_customers(is_active);

-- 2. Expand staff_members.role check constraint to include operational RBAC roles
ALTER TABLE public.staff_members
  DROP CONSTRAINT IF EXISTS staff_members_role_check;

ALTER TABLE public.staff_members
  ADD CONSTRAINT staff_members_role_check
  CHECK (role IN ('super_admin', 'manager', 'staff', 'owner', 'senior_technician', 'technician', 'apprentice', 'receptionist'));

-- 3. Ensure crm_visit_history has services_rendered JSONB column
ALTER TABLE public.crm_visit_history
  ADD COLUMN IF NOT EXISTS services_rendered jsonb NOT NULL DEFAULT '[]'::jsonb;
