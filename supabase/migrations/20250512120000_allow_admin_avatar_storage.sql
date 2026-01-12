DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins manage avatars'
  ) THEN
    DROP POLICY "Admins manage avatars" ON storage.objects;
  END IF;

  CREATE POLICY "Admins manage avatars"
    ON storage.objects
    FOR ALL
    USING (
      bucket_id = 'avatars'
      AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'owner')
      )
    )
    WITH CHECK (
      bucket_id = 'avatars'
      AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'owner')
      )
    );
END;
$$;
