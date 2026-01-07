DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.game_captains'::regclass
      AND conname = 'game_captains_slot_check'
  ) THEN
    ALTER TABLE public.game_captains
      DROP CONSTRAINT game_captains_slot_check;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.game_captains'::regclass
      AND conname = 'game_captains_slot_positive'
  ) THEN
    ALTER TABLE public.game_captains
      ADD CONSTRAINT game_captains_slot_positive CHECK (slot > 0);
  END IF;
END;
$$;
