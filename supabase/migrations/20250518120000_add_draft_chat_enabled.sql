ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS draft_chat_enabled BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE public.games
  SET draft_chat_enabled = FALSE
  WHERE draft_mode_enabled = FALSE;

CREATE OR REPLACE FUNCTION public.release_recurring_games(
  p_interval_days integer default 7,
  p_limit integer default 50
)
RETURNS TABLE (
  released_count integer,
  created_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := timezone('utc', now());
  v_released_count integer := 0;
  v_created_count integer := 0;
  v_game public.games%ROWTYPE;
  v_timezone text;
  v_local_start timestamp;
  v_local_end timestamp;
  v_local_release timestamp;
  v_next_start timestamptz;
  v_next_end timestamptz;
  v_next_release timestamptz;
  v_updated integer;
BEGIN
  FOR v_game IN
    SELECT g.*
    FROM public.games g
    WHERE g.release_at IS NOT NULL
      AND g.released_at IS NULL
      AND g.release_at <= v_now
    ORDER BY g.release_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT COALESCE(c.community_timezone, 'UTC')
      INTO v_timezone
      FROM public.communities c
      WHERE c.id = v_game.community_id;

    IF NOT FOUND THEN
      v_timezone := 'UTC';
    END IF;
    UPDATE public.games
      SET released_at = v_now
      WHERE id = v_game.id
        AND released_at IS NULL;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
      CONTINUE;
    END IF;

    v_released_count := v_released_count + 1;

    v_local_start := v_game.start_time AT TIME ZONE v_timezone;
    v_next_start := (v_local_start + make_interval(days => p_interval_days)) AT TIME ZONE v_timezone;

    IF v_game.end_time IS NOT NULL THEN
      v_local_end := v_game.end_time AT TIME ZONE v_timezone;
      v_next_end := (v_local_end + make_interval(days => p_interval_days)) AT TIME ZONE v_timezone;
    ELSE
      v_next_end := NULL;
    END IF;

    v_local_release := v_game.release_at AT TIME ZONE v_timezone;
    v_next_release := (v_local_release + make_interval(days => p_interval_days)) AT TIME ZONE v_timezone;

    INSERT INTO public.games (
      name,
      description,
      start_time,
      end_time,
      location_name,
      location_notes,
      cost_cents,
      capacity,
      waitlist_capacity,
      status,
      created_by,
      community_id,
      confirmation_enabled,
      join_cutoff_offset_minutes_from_kickoff,
      draft_mode_enabled,
      draft_visibility,
      draft_chat_enabled,
      crunch_time_start_time_local,
      release_at,
      released_at
    )
    VALUES (
      v_game.name,
      v_game.description,
      v_next_start,
      v_next_end,
      v_game.location_name,
      v_game.location_notes,
      v_game.cost_cents,
      v_game.capacity,
      v_game.waitlist_capacity,
      'scheduled',
      v_game.created_by,
      v_game.community_id,
      v_game.confirmation_enabled,
      v_game.join_cutoff_offset_minutes_from_kickoff,
      v_game.draft_mode_enabled,
      v_game.draft_visibility,
      v_game.draft_chat_enabled,
      v_game.crunch_time_start_time_local,
      v_next_release,
      NULL
    );

    v_created_count := v_created_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_released_count, v_created_count;
END;
$$;
