-- Ensure roster fullness automatically locks games and re-open when spots free up before drafting

CREATE OR REPLACE FUNCTION public.join_game_queue(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_game public.games%ROWTYPE;
  v_existing public.game_queue%ROWTYPE;
  v_queue_item public.game_queue%ROWTYPE;
  v_has_existing boolean := FALSE;
  v_now timestamptz := timezone('utc', now());
  v_confirmed_count integer := 0;
  v_waitlisted_count integer := 0;
  v_new_status public.game_queue_status;
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
    INTO v_game
    FROM public.games
    WHERE id = p_game_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'game_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF v_game.status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'game_not_open' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
    INTO v_existing
    FROM public.game_queue
    WHERE game_id = p_game_id
      AND profile_id = v_profile_id
    FOR UPDATE;

  v_has_existing := FOUND;

  IF v_has_existing AND v_existing.status <> 'cancelled' THEN
    RETURN jsonb_build_object('status', v_existing.status);
  END IF;

  v_confirmed_count := 0;
  v_waitlisted_count := 0;

  FOR v_queue_item IN
    SELECT *
    FROM public.game_queue
    WHERE game_id = p_game_id
    FOR UPDATE
  LOOP
    IF v_queue_item.status = 'confirmed' THEN
      v_confirmed_count := v_confirmed_count + 1;
    ELSIF v_queue_item.status = 'waitlisted' THEN
      v_waitlisted_count := v_waitlisted_count + 1;
    END IF;
  END LOOP;

  IF v_confirmed_count < v_game.capacity THEN
    v_new_status := 'confirmed';
  ELSE
    IF v_game.waitlist_capacity IS NOT NULL
       AND v_waitlisted_count >= v_game.waitlist_capacity THEN
      RAISE EXCEPTION 'waitlist_full' USING ERRCODE = 'P0001';
    END IF;
    v_new_status := 'waitlisted';
  END IF;

  IF v_has_existing THEN
    UPDATE public.game_queue
      SET status = v_new_status,
          joined_at = v_now,
          cancelled_at = NULL,
          attendance_confirmed_at = NULL,
          promoted_at = CASE WHEN v_new_status = 'confirmed' THEN v_now ELSE NULL END
      WHERE id = v_existing.id;
  ELSE
    INSERT INTO public.game_queue (
      game_id,
      profile_id,
      status,
      joined_at,
      promoted_at,
      attendance_confirmed_at
    )
    VALUES (
      p_game_id,
      v_profile_id,
      v_new_status,
      v_now,
      CASE WHEN v_new_status = 'confirmed' THEN v_now ELSE NULL END,
      NULL
    );
  END IF;

  IF v_new_status = 'confirmed' THEN
    v_confirmed_count := v_confirmed_count + 1;
  END IF;

  IF v_game.draft_status = 'pending' THEN
    IF v_confirmed_count >= v_game.capacity THEN
      UPDATE public.games
        SET status = 'locked'
        WHERE id = p_game_id
          AND status <> 'locked';
    ELSE
      UPDATE public.games
        SET status = 'scheduled'
        WHERE id = p_game_id
          AND status = 'locked';
    END IF;
  END IF;

  RETURN jsonb_build_object('status', v_new_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_game_queue(uuid) TO authenticated;

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
    SELECT id
      INTO v_promote_id
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

  RETURN jsonb_build_object('status', 'cancelled');
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_game_queue(uuid) TO authenticated;
