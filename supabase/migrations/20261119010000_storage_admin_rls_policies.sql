-- Migration: Strict Admin RLS Policies for Salon Storage Buckets
-- Allows authenticated super_admin & manager users (verified via Supabase Auth JWT + user_roles)
-- to upload, update, and delete media across salon buckets without requiring SUPABASE_SERVICE_ROLE_KEY.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read salon media buckets'
  ) THEN
    CREATE POLICY "Public read salon media buckets"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id IN ('salon_cms', 'services', 'gallery', 'staff_avatars'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin read receipts bucket'
  ) THEN
    CREATE POLICY "Admin read receipts bucket"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'receipts'
        AND (SELECT public.current_user_role()) IN ('super_admin', 'manager')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin insert salon storage objects'
  ) THEN
    CREATE POLICY "Admin insert salon storage objects"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id IN ('salon_cms', 'services', 'gallery', 'staff_avatars', 'receipts')
        AND (SELECT public.current_user_role()) IN ('super_admin', 'manager')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin update salon storage objects'
  ) THEN
    CREATE POLICY "Admin update salon storage objects"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id IN ('salon_cms', 'services', 'gallery', 'staff_avatars', 'receipts')
        AND (SELECT public.current_user_role()) IN ('super_admin', 'manager')
      )
      WITH CHECK (
        bucket_id IN ('salon_cms', 'services', 'gallery', 'staff_avatars', 'receipts')
        AND (SELECT public.current_user_role()) IN ('super_admin', 'manager')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin delete salon storage objects'
  ) THEN
    CREATE POLICY "Admin delete salon storage objects"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id IN ('salon_cms', 'services', 'gallery', 'staff_avatars', 'receipts')
        AND (SELECT public.current_user_role()) IN ('super_admin', 'manager')
      );
  END IF;
END $$;
