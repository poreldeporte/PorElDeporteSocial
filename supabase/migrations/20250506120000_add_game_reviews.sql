CREATE TABLE IF NOT EXISTS public.game_reviews (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS game_reviews_game_profile_unique
  ON public.game_reviews (game_id, profile_id);

CREATE OR REPLACE TRIGGER set_game_reviews_updated_at
BEFORE UPDATE ON public.game_reviews
FOR EACH ROW
EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

ALTER TABLE public.game_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'game_reviews' AND policyname = 'Admins can view reviews'
  ) THEN
    CREATE POLICY "Admins can view reviews"
      ON public.game_reviews
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
      );
  END IF;
END;
$$;
