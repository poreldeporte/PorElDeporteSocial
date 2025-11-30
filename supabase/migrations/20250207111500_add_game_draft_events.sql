-- Track draft activity for audits and undo operations

CREATE TABLE IF NOT EXISTS public.game_draft_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.game_teams (id) ON DELETE SET NULL,
  profile_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('pick', 'undo', 'reset', 'start', 'finalize')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS game_draft_events_game_idx ON public.game_draft_events (game_id, created_at);

ALTER TABLE public.game_draft_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'game_draft_events'
      AND policyname = 'Members can view draft events'
  ) THEN
    CREATE POLICY "Members can view draft events"
      ON public.game_draft_events
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'game_draft_events'
      AND policyname = 'Admins manage draft events'
  ) THEN
    CREATE POLICY "Admins manage draft events"
      ON public.game_draft_events
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
