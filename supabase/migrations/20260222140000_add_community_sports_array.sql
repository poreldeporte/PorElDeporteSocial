ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS sports TEXT[];

UPDATE public.communities
SET sports = ARRAY[sport]
WHERE sports IS NULL
  AND sport IS NOT NULL;
