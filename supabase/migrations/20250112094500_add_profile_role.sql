DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_role') THEN
    CREATE TYPE public.profile_role AS ENUM ('member', 'captain', 'admin');
  END IF;
END;
$$;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role public.profile_role NOT NULL DEFAULT 'member';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'games' AND policyname = 'Game creators can manage games'
  ) THEN
    DROP POLICY "Game creators can manage games" ON public.games;
  END IF;

  CREATE POLICY "Admins can manage games"
    ON public.games
    FOR ALL
    USING (
      created_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      )
    )
    WITH CHECK (
      created_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      )
    );
END;
$$;
