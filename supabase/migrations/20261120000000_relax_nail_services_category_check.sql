-- Migration: Allow canonical and flexible non-empty categories in nail_services
-- Prevents CHECK constraint violations when creating or editing services from Admin CMS.

ALTER TABLE public.nail_services
  DROP CONSTRAINT IF EXISTS nail_services_category_check;

ALTER TABLE public.nail_services
  ADD CONSTRAINT nail_services_category_check
  CHECK (char_length(btrim(category)) > 0);
