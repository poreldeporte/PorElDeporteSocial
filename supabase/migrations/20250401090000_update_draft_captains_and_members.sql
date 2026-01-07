-- Expand captain slots and enforce one team assignment per game

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname
    INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.game_captains'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%slot IN (1, 2)%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.game_captains DROP CONSTRAINT %I', constraint_name);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.game_captains'::regclass
      AND conname = 'game_captains_slot_positive'
  ) THEN
    ALTER TABLE public.game_captains
      ADD CONSTRAINT game_captains_slot_positive CHECK (slot > 0);
  END IF;
END;
$$;

ALTER TABLE public.game_team_members
  ADD COLUMN IF NOT EXISTS game_id UUID;

UPDATE public.game_team_members gtm
SET game_id = gt.game_id
FROM public.game_teams gt
WHERE gtm.game_team_id = gt.id
  AND gtm.game_id IS NULL;

ALTER TABLE public.game_team_members
  ALTER COLUMN game_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.game_team_members'::regclass
      AND conname = 'game_team_members_game_id_fkey'
  ) THEN
    ALTER TABLE public.game_team_members
      ADD CONSTRAINT game_team_members_game_id_fkey
      FOREIGN KEY (game_id) REFERENCES public.games (id) ON DELETE CASCADE;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS game_team_members_game_profile_unique
  ON public.game_team_members (game_id, profile_id);
