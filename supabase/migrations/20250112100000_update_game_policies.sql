DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'games'
      AND policyname = 'Admins can manage games'
  ) THEN
    DROP POLICY "Admins can manage games" ON public.games;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'games'
      AND policyname = 'Admins can insert games'
  ) THEN
    DROP POLICY "Admins can insert games" ON public.games;
  END IF;
END;
$$;

CREATE POLICY "Admins can insert games"
  ON public.games
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
    AND created_by = auth.uid()
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'games'
      AND policyname = 'Admins can modify games'
  ) THEN
    DROP POLICY "Admins can modify games" ON public.games;
  END IF;
END;
$$;

CREATE POLICY "Admins can modify games"
  ON public.games
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'games'
      AND policyname = 'Admins can delete games'
  ) THEN
    DROP POLICY "Admins can delete games" ON public.games;
  END IF;
END;
$$;

CREATE POLICY "Admins can delete games"
  ON public.games
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
