DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'draft_status') THEN
    CREATE TYPE public.draft_status AS ENUM ('pending', 'ready', 'in_progress', 'completed');
  END IF;
END;
$$;

ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS draft_status public.draft_status NOT NULL DEFAULT 'pending';

ALTER TABLE public.game_queue
ADD COLUMN IF NOT EXISTS attendance_confirmed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.game_captains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  slot SMALLINT NOT NULL CHECK (slot IN (1, 2)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS game_captains_game_slot_key
  ON public.game_captains (game_id, slot);

CREATE UNIQUE INDEX IF NOT EXISTS game_captains_game_profile_key
  ON public.game_captains (game_id, profile_id);

ALTER TABLE public.game_captains ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'game_captains'
      AND policyname = 'Authenticated users can view captains'
  ) THEN
    CREATE POLICY "Authenticated users can view captains"
      ON public.game_captains
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'game_captains'
      AND policyname = 'Admins manage captains'
  ) THEN
    CREATE POLICY "Admins manage captains"
      ON public.game_captains
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
      );
  END IF;
END;
$$;
