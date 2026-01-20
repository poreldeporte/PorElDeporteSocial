-- Community rating snapshots and ledger

CREATE TABLE IF NOT EXISTS public.community_ratings (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES public.communities (id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  rating DOUBLE PRECISION NOT NULL DEFAULT 1500 CHECK (rating >= 0),
  rated_games INTEGER NOT NULL DEFAULT 0 CHECK (rated_games >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS community_ratings_unique
  ON public.community_ratings (community_id, profile_id);

CREATE INDEX IF NOT EXISTS community_ratings_profile_idx
  ON public.community_ratings (profile_id);

CREATE TABLE IF NOT EXISTS public.community_game_ratings (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES public.communities (id) ON DELETE CASCADE,
  rated BOOLEAN NOT NULL DEFAULT FALSE,
  team_a_id UUID NOT NULL,
  team_b_id UUID NOT NULL,
  goal_diff INTEGER NOT NULL,
  team_a_rating DOUBLE PRECISION NOT NULL CHECK (team_a_rating >= 0),
  team_b_rating DOUBLE PRECISION NOT NULL CHECK (team_b_rating >= 0),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  invalidated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS community_game_ratings_game_unique
  ON public.community_game_ratings (game_id);

CREATE INDEX IF NOT EXISTS community_game_ratings_community_idx
  ON public.community_game_ratings (community_id);

CREATE TABLE IF NOT EXISTS public.community_game_rating_players (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  game_rating_id UUID NOT NULL REFERENCES public.community_game_ratings (id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES public.communities (id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  team_side TEXT NOT NULL CHECK (team_side IN ('A', 'B')),
  pre_rating DOUBLE PRECISION NOT NULL CHECK (pre_rating >= 0),
  pre_rated_games INTEGER NOT NULL CHECK (pre_rated_games >= 0),
  k_used INTEGER NOT NULL,
  delta DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (game_id, profile_id)
);

CREATE INDEX IF NOT EXISTS community_game_rating_players_profile_idx
  ON public.community_game_rating_players (profile_id);

CREATE INDEX IF NOT EXISTS community_game_rating_players_game_idx
  ON public.community_game_rating_players (game_id);

CREATE TABLE IF NOT EXISTS public.community_rating_events (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES public.communities (id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  delta DOUBLE PRECISION NOT NULL,
  rated_games_delta INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('apply', 'adjust', 'rollback')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS community_rating_events_profile_time_idx
  ON public.community_rating_events (community_id, profile_id, created_at);

ALTER TABLE public.community_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_game_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_game_rating_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_rating_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_ratings'
      AND policyname = 'Players can view own community ratings'
  ) THEN
    CREATE POLICY "Players can view own community ratings"
      ON public.community_ratings
      FOR SELECT
      USING (
        auth.uid() = profile_id OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_ratings'
      AND policyname = 'Admins manage community ratings'
  ) THEN
    CREATE POLICY "Admins manage community ratings"
      ON public.community_ratings
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_game_ratings'
      AND policyname = 'Admins manage community game ratings'
  ) THEN
    CREATE POLICY "Admins manage community game ratings"
      ON public.community_game_ratings
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_game_rating_players'
      AND policyname = 'Admins manage community game rating players'
  ) THEN
    CREATE POLICY "Admins manage community game rating players"
      ON public.community_game_rating_players
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_rating_events'
      AND policyname = 'Admins manage community rating events'
  ) THEN
    CREATE POLICY "Admins manage community rating events"
      ON public.community_rating_events
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_community_ratings_updated_at'
  ) THEN
    CREATE TRIGGER set_community_ratings_updated_at
    BEFORE UPDATE ON public.community_ratings
    FOR EACH ROW
    EXECUTE PROCEDURE public.set_current_timestamp_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_community_game_ratings_updated_at'
  ) THEN
    CREATE TRIGGER set_community_game_ratings_updated_at
    BEFORE UPDATE ON public.community_game_ratings
    FOR EACH ROW
    EXECUTE PROCEDURE public.set_current_timestamp_updated_at();
  END IF;
END;
$$;
