-- Add guest rating to game queue and enforce valid range.

ALTER TABLE public.game_queue
  ADD COLUMN IF NOT EXISTS guest_rating INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'game_queue_guest_rating_check'
  ) THEN
    ALTER TABLE public.game_queue
      ADD CONSTRAINT game_queue_guest_rating_check CHECK (
        guest_rating IS NULL OR (guest_rating BETWEEN 1 AND 5)
      );
  END IF;
END;
$$;

ALTER TABLE public.game_queue
  DROP CONSTRAINT IF EXISTS game_queue_member_or_guest_check;

ALTER TABLE public.game_queue
  ADD CONSTRAINT game_queue_member_or_guest_check CHECK (
    (profile_id IS NOT NULL
      AND guest_name IS NULL
      AND guest_phone IS NULL
      AND guest_notes IS NULL
      AND guest_rating IS NULL
      AND added_by_profile_id IS NULL)
    OR
    (profile_id IS NULL
      AND guest_name IS NOT NULL
      AND guest_phone IS NOT NULL
      AND added_by_profile_id IS NOT NULL)
  );

DROP FUNCTION IF EXISTS public.add_guest_to_queue(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.add_guest_to_queue(
  p_game_id uuid,
  p_guest_name text,
  p_guest_phone text,
  p_guest_notes text,
  p_guest_rating integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_game public.games%ROWTYPE;
  v_queue_item public.game_queue%ROWTYPE;
  v_now timestamptz := timezone('utc', now());
  v_rostered_count integer := 0;
  v_new_status public.game_queue_status;
  v_join_cutoff timestamptz;
  v_is_member boolean := FALSE;
  v_is_admin boolean := FALSE;
  v_in_group boolean := FALSE;
  v_guest_count integer := 0;
  v_queue_id uuid;
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  IF p_guest_rating IS NULL THEN
    RAISE EXCEPTION 'guest_rating_required' USING ERRCODE = 'P0001';
  END IF;

  IF p_guest_rating < 1 OR p_guest_rating > 5 THEN
    RAISE EXCEPTION 'guest_rating_invalid' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
    INTO v_game
    FROM public.games
    WHERE id = p_game_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'game_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF v_game.release_at IS NOT NULL AND v_game.released_at IS NULL THEN
    RAISE EXCEPTION 'game_not_released' USING ERRCODE = 'P0001';
  END IF;

  IF v_game.status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'game_not_open' USING ERRCODE = 'P0001';
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.memberships
      WHERE community_id = v_game.community_id
        AND profile_id = v_profile_id
  ) INTO v_is_member;

  SELECT COALESCE(profiles.role = 'admin', FALSE)
    INTO v_is_admin
    FROM public.profiles
    WHERE profiles.id = v_profile_id;

  IF NOT v_is_member AND NOT v_is_admin THEN
    RAISE EXCEPTION 'not_member' USING ERRCODE = 'P0001';
  END IF;

  IF v_game.audience_group_id IS NOT NULL AND NOT v_is_admin THEN
    SELECT EXISTS (
      SELECT 1
        FROM public.community_group_members
        WHERE group_id = v_game.audience_group_id
          AND profile_id = v_profile_id
    ) INTO v_in_group;

    IF NOT v_in_group THEN
      RAISE EXCEPTION 'not_in_group' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  v_join_cutoff := v_game.start_time - make_interval(mins => v_game.join_cutoff_offset_minutes_from_kickoff);
  IF NOT v_is_admin AND v_now >= v_join_cutoff THEN
    RAISE EXCEPTION 'join_cutoff_passed' USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*)
    INTO v_guest_count
    FROM public.game_queue
    WHERE game_id = p_game_id
      AND added_by_profile_id = v_profile_id
      AND status <> 'dropped';

  IF v_guest_count >= 4 THEN
    RAISE EXCEPTION 'guest_limit_reached' USING ERRCODE = 'P0001';
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

  INSERT INTO public.game_queue (
    game_id,
    profile_id,
    status,
    joined_at,
    promoted_at,
    attendance_confirmed_at,
    guest_name,
    guest_phone,
    guest_notes,
    guest_rating,
    added_by_profile_id
  )
  VALUES (
    p_game_id,
    NULL,
    v_new_status,
    v_now,
    CASE WHEN v_new_status = 'rostered' THEN v_now ELSE NULL END,
    NULL,
    p_guest_name,
    p_guest_phone,
    p_guest_notes,
    p_guest_rating,
    v_profile_id
  )
  RETURNING id INTO v_queue_id;

  RETURN jsonb_build_object(
    'status', v_new_status,
    'queue_id', v_queue_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_guest_to_queue(uuid, text, text, text, integer) TO authenticated;
