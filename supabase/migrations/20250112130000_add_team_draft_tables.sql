-- Team draft & results schema

CREATE TABLE IF NOT EXISTS public.game_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  draft_order SMALLINT NOT NULL,
  captain_profile_id UUID REFERENCES public.profiles (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS game_teams_game_order_key
  ON public.game_teams (game_id, draft_order);

CREATE TABLE IF NOT EXISTS public.game_team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_team_id UUID NOT NULL REFERENCES public.game_teams (id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles (id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS game_team_members_unique ON public.game_team_members (game_team_id, profile_id);

CREATE TABLE IF NOT EXISTS public.game_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  winning_team_id UUID REFERENCES public.game_teams (id),
  losing_team_id UUID REFERENCES public.game_teams (id),
  winner_score SMALLINT,
  loser_score SMALLINT,
  reported_by UUID REFERENCES public.profiles (id),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS game_results_game_unique ON public.game_results (game_id);

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS draft_turn SMALLINT,
  ADD COLUMN IF NOT EXISTS draft_direction SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE public.games
  ADD CONSTRAINT draft_direction_valid CHECK (draft_direction IN (1, -1));

ALTER TABLE public.game_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'game_team_members' AND policyname = 'Members can view teams'
  ) THEN
    CREATE POLICY "Members can view teams"
      ON public.game_team_members
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'game_teams' AND policyname = 'Members can view team metadata'
  ) THEN
    CREATE POLICY "Members can view team metadata"
      ON public.game_teams
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'game_teams' AND policyname = 'Admins manage teams'
  ) THEN
    CREATE POLICY "Admins manage teams"
      ON public.game_teams
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

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'game_results' AND policyname = 'Members can view results'
  ) THEN
    CREATE POLICY "Members can view results"
      ON public.game_results
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END;
$$;
