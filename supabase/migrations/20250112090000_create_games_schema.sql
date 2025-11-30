-- Game and queue schema for Por El Deporte

-- reusable trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'game_status') THEN
    CREATE TYPE public.game_status AS ENUM ('scheduled', 'locked', 'completed', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'game_queue_status') THEN
    CREATE TYPE public.game_queue_status AS ENUM ('confirmed', 'waitlisted', 'cancelled');
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location_name TEXT,
  location_notes TEXT,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  capacity SMALLINT NOT NULL CHECK (capacity > 0),
  waitlist_capacity SMALLINT,
  status public.game_status NOT NULL DEFAULT 'scheduled',
  created_by UUID NOT NULL REFERENCES public.profiles (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  cancelled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.game_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status public.game_queue_status NOT NULL DEFAULT 'waitlisted',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  promoted_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS game_queue_unique_profile_per_game
  ON public.game_queue (game_id, profile_id);

CREATE INDEX IF NOT EXISTS game_queue_game_status_idx
  ON public.game_queue (game_id, status);

CREATE OR REPLACE TRIGGER set_games_updated_at
BEFORE UPDATE ON public.games
FOR EACH ROW
EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_queue ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'games' AND policyname = 'Authenticated users can view games'
  ) THEN
    CREATE POLICY "Authenticated users can view games"
      ON public.games
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'games' AND policyname = 'Game creators can manage games'
  ) THEN
    CREATE POLICY "Game creators can manage games"
      ON public.games
      FOR ALL
      USING (auth.uid() = created_by)
      WITH CHECK (auth.uid() = created_by);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'game_queue' AND policyname = 'Members can view queue'
  ) THEN
    CREATE POLICY "Members can view queue"
      ON public.game_queue
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'game_queue' AND policyname = 'Members can manage own queue rows'
  ) THEN
    CREATE POLICY "Members can manage own queue rows"
      ON public.game_queue
      FOR ALL
      USING (auth.uid() = profile_id)
      WITH CHECK (auth.uid() = profile_id);
  END IF;
END;
$$;
