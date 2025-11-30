-- Add pick_order to game_team_members and track per-player game stats

ALTER TABLE public.game_team_members
  ADD COLUMN IF NOT EXISTS pick_order SMALLINT;

CREATE TABLE IF NOT EXISTS public.game_player_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.game_teams (id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  result TEXT CHECK (result IN ('win', 'loss')) NOT NULL,
  pick_order SMALLINT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (game_id, profile_id)
);

CREATE INDEX IF NOT EXISTS game_player_stats_profile_idx ON public.game_player_stats (profile_id);

ALTER TABLE public.game_player_stats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'game_player_stats' AND policyname = 'Players can view their stats'
  ) THEN
    CREATE POLICY "Players can view their stats"
      ON public.game_player_stats
      FOR SELECT
      USING (auth.uid() = profile_id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'game_player_stats' AND policyname = 'Admins manage player stats'
  ) THEN
    CREATE POLICY "Admins manage player stats"
      ON public.game_player_stats
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
