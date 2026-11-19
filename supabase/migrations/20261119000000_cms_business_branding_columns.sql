-- =============================================================================
-- Migration: 20261119000000_cms_business_branding_columns.sql
-- Description: Adds branding, website title/tagline, logo, Google Maps, and
--              holiday notice columns to public.nail_business_info so CMS edits
--              persist cleanly in Supabase Postgres across Local and Vercel.
-- =============================================================================

ALTER TABLE public.nail_business_info
  ADD COLUMN IF NOT EXISTS google_maps_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS google_maps_embed_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS website_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS website_title_vi text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS website_tagline text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS website_tagline_vi text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS holiday_notice_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS holiday_notice_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS holiday_notice_vi text NOT NULL DEFAULT '';

-- Backfill empty branding fields on existing singleton business record
UPDATE public.nail_business_info
SET
  website_title = CASE WHEN website_title = '' THEN salon_name ELSE website_title END,
  website_title_vi = CASE WHEN website_title_vi = '' THEN 'Glamour Nails Sydney • Chăm Sóc Móng Cao Cấp' ELSE website_title_vi END,
  website_tagline = CASE WHEN website_tagline = '' THEN 'Sydney CBD • Boutique Lounge' ELSE website_tagline END,
  website_tagline_vi = CASE WHEN website_tagline_vi = '' THEN 'Sydney CBD • Tiệm Nail Sang Trọng' ELSE website_tagline_vi END,
  google_maps_url = CASE WHEN google_maps_url = '' THEN 'https://maps.google.com/?q=Suite+2,+188+George+Street,+Sydney+NSW+2000' ELSE google_maps_url END,
  google_maps_embed_url = CASE WHEN google_maps_embed_url = '' THEN 'https://maps.google.com/maps?q=188%20George%20Street%2C%20Sydney%20NSW%202000&t=&z=16&ie=UTF8&iwloc=&output=embed' ELSE google_maps_embed_url END
WHERE id IS NOT NULL;
