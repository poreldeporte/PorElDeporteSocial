DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins can update profiles'
  ) THEN
    CREATE POLICY "Admins can update profiles"
      ON public.profiles
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles AS actor
          WHERE actor.id = auth.uid()
            AND actor.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles AS actor
          WHERE actor.id = auth.uid()
            AND actor.role = 'admin'
        )
      );
  END IF;
END;
$$;
