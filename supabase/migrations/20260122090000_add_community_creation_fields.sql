-- Add community name normalization and creator tracking.

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS name_normalized text;

UPDATE public.communities
SET name_normalized = lower(regexp_replace(trim(name), '\s+', ' ', 'g'))
WHERE name IS NOT NULL
  AND (name_normalized IS NULL OR name_normalized = '');

ALTER TABLE public.communities
  ALTER COLUMN name_normalized SET NOT NULL;

CREATE INDEX IF NOT EXISTS communities_name_normalized_idx
  ON public.communities (name_normalized);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_community_id uuid REFERENCES public.communities (id);
