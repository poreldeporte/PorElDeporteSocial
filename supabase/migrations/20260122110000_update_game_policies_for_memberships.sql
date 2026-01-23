-- Align game RLS policies with community membership roles.

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

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'games'
      AND policyname = 'Admins can modify games'
  ) THEN
    DROP POLICY "Admins can modify games" ON public.games;
  END IF;

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

CREATE POLICY "Admins can insert games"
  ON public.games
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.memberships
      WHERE memberships.profile_id = auth.uid()
        AND memberships.community_id = community_id
        AND memberships.status = 'approved'
        AND memberships.role IN ('admin', 'owner')
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Admins can modify games"
  ON public.games
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.memberships
      WHERE memberships.profile_id = auth.uid()
        AND memberships.community_id = community_id
        AND memberships.status = 'approved'
        AND memberships.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.memberships
      WHERE memberships.profile_id = auth.uid()
        AND memberships.community_id = community_id
        AND memberships.status = 'approved'
        AND memberships.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins can delete games"
  ON public.games
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.memberships
      WHERE memberships.profile_id = auth.uid()
        AND memberships.community_id = community_id
        AND memberships.status = 'approved'
        AND memberships.role IN ('admin', 'owner')
    )
  );
