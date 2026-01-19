DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'draft_style') THEN
    CREATE TYPE public.draft_style AS ENUM ('snake', 'original', 'auction');
  END IF;
END $$;

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS draft_style public.draft_style;

ALTER TABLE public.games
  ALTER COLUMN draft_style SET DEFAULT 'snake';

UPDATE public.games
  SET draft_style = 'snake'
  WHERE draft_style IS NULL;
