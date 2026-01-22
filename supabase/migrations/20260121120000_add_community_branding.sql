ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS community_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS community_primary_color TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('community-logos', 'community-logos', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins manage community logos'
  ) THEN
    DROP POLICY "Admins manage community logos" ON storage.objects;
  END IF;

  CREATE POLICY "Admins manage community logos"
    ON storage.objects
    FOR ALL
    USING (
      bucket_id = 'community-logos'
      AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'owner')
      )
    )
    WITH CHECK (
      bucket_id = 'community-logos'
      AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'owner')
      )
    );
END;
$$;
