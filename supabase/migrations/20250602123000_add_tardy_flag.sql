ALTER TABLE public.game_queue
  ADD COLUMN IF NOT EXISTS tardy_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tardy_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'game_queue_no_show_tardy_exclusive'
  ) THEN
    ALTER TABLE public.game_queue
      ADD CONSTRAINT game_queue_no_show_tardy_exclusive CHECK (
        NOT (no_show_at IS NOT NULL AND tardy_at IS NOT NULL)
      );
  END IF;
END;
$$;
