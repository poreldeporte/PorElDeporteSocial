DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'draft_visibility') THEN
    CREATE TYPE public.draft_visibility AS ENUM ('public', 'admin_only');
  END IF;
END;
$$;

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS draft_visibility public.draft_visibility NOT NULL DEFAULT 'public';

UPDATE public.games
  SET draft_visibility = 'public'
  WHERE draft_visibility IS NULL;
