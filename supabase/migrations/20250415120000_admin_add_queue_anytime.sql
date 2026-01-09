CREATE OR REPLACE FUNCTION public.admin_add_to_queue(p_game_id uuid, p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game public.games%ROWTYPE;
  v_existing public.game_queue%ROWTYPE;
  v_queue_item public.game_queue%ROWTYPE;
  v_has_existing boolean := FALSE;
  v_now timestamptz := timezone('utc', now());
  v_rostered_count integer := 0;
  v_new_status public.game_queue_status;
  v_is_member boolean := FALSE;
BEGIN
  SELECT *
    INTO v_game
    FROM public.games
    WHERE id = p_game_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'game_not_found' USING ERRCODE = 'P0001';
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.memberships
      WHERE community_id = v_game.community_id
        AND profile_id = p_profile_id
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'not_member' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
    INTO v_existing
    FROM public.game_queue
    WHERE game_id = p_game_id
      AND profile_id = p_profile_id
    FOR UPDATE;

  v_has_existing := FOUND;

  IF v_has_existing AND v_existing.status <> 'dropped' THEN
    RETURN jsonb_build_object('status', v_existing.status);
  END IF;

  v_rostered_count := 0;

  FOR v_queue_item IN
    SELECT *
    FROM public.game_queue
    WHERE game_id = p_game_id
    FOR UPDATE
  LOOP
    IF v_queue_item.status = 'rostered' THEN
      v_rostered_count := v_rostered_count + 1;
    END IF;
  END LOOP;

  IF v_rostered_count < v_game.capacity THEN
    v_new_status := 'rostered';
  ELSE
    v_new_status := 'waitlisted';
  END IF;

  IF v_has_existing THEN
    UPDATE public.game_queue
      SET status = v_new_status,
          joined_at = v_now,
          attendance_confirmed_at = NULL,
          promoted_at = CASE WHEN v_new_status = 'rostered' THEN v_now ELSE NULL END
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
      p_profile_id,
      v_new_status,
      v_now,
      CASE WHEN v_new_status = 'rostered' THEN v_now ELSE NULL END,
      NULL
    );
  END IF;

  RETURN jsonb_build_object('status', v_new_status);
END;
$$;
