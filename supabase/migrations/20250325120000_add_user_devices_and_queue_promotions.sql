CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  app_version TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  disabled_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS user_devices_expo_push_token_key
  ON public.user_devices (expo_push_token);

CREATE INDEX IF NOT EXISTS user_devices_user_id_idx
  ON public.user_devices (user_id);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_devices'
      AND policyname = 'Users can view their devices'
  ) THEN
    CREATE POLICY "Users can view their devices"
      ON public.user_devices
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_devices'
      AND policyname = 'Users can manage their devices'
  ) THEN
    CREATE POLICY "Users can manage their devices"
      ON public.user_devices
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_game_queue(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_queue_row public.game_queue%ROWTYPE;
  v_game public.games%ROWTYPE;
  v_now timestamptz := timezone('utc', now());
  v_promote_id uuid;
  v_promoted_profile_id uuid;
  v_confirmed_count integer := 0;
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
    INTO v_queue_row
    FROM public.game_queue
    WHERE game_id = p_game_id
      AND profile_id = v_profile_id
    FOR UPDATE;

  IF NOT FOUND OR v_queue_row.status = 'cancelled' THEN
    RETURN jsonb_build_object('status', 'cancelled');
  END IF;

  SELECT *
    INTO v_game
    FROM public.games
    WHERE id = p_game_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'game_not_found' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.game_queue
    SET status = 'cancelled',
        cancelled_at = v_now,
        attendance_confirmed_at = NULL
    WHERE id = v_queue_row.id;

  IF v_queue_row.status = 'confirmed' THEN
    SELECT id, profile_id
      INTO v_promote_id, v_promoted_profile_id
      FROM public.game_queue
      WHERE game_id = p_game_id
        AND status = 'waitlisted'
      ORDER BY joined_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
      UPDATE public.game_queue
        SET status = 'confirmed',
            promoted_at = v_now,
            cancelled_at = NULL,
            attendance_confirmed_at = NULL
        WHERE id = v_promote_id;
    END IF;
  END IF;

  IF v_game.draft_status = 'pending' THEN
    SELECT COUNT(*)
      INTO v_confirmed_count
      FROM public.game_queue
      WHERE game_id = p_game_id
        AND status = 'confirmed';

    IF v_confirmed_count >= v_game.capacity THEN
      UPDATE public.games
        SET status = 'locked'
        WHERE id = p_game_id
          AND status <> 'locked'
          AND draft_status = 'pending';
    ELSE
      UPDATE public.games
        SET status = 'scheduled'
        WHERE id = p_game_id
          AND status = 'locked'
          AND draft_status = 'pending';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status', 'cancelled',
    'promoted_profile_id', v_promoted_profile_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_game_queue(uuid) TO authenticated;
