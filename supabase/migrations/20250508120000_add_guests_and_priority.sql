-- Guest support + community priority for roster ordering.

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS community_priority_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.game_queue
  ALTER COLUMN profile_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone TEXT,
  ADD COLUMN IF NOT EXISTS guest_notes TEXT,
  ADD COLUMN IF NOT EXISTS added_by_profile_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS game_queue_added_by_idx
  ON public.game_queue (game_id, added_by_profile_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'game_queue_member_or_guest_check'
  ) THEN
    ALTER TABLE public.game_queue
      ADD CONSTRAINT game_queue_member_or_guest_check CHECK (
        (profile_id IS NOT NULL
          AND guest_name IS NULL
          AND guest_phone IS NULL
          AND guest_notes IS NULL
          AND added_by_profile_id IS NULL)
        OR
        (profile_id IS NULL
          AND guest_name IS NOT NULL
          AND guest_phone IS NOT NULL
          AND added_by_profile_id IS NOT NULL)
      );
  END IF;
END;
$$;

ALTER TABLE public.game_team_members
  ALTER COLUMN profile_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_queue_id UUID REFERENCES public.game_queue (id) ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'game_team_members_member_or_guest_check'
  ) THEN
    ALTER TABLE public.game_team_members
      ADD CONSTRAINT game_team_members_member_or_guest_check CHECK (
        (profile_id IS NOT NULL AND guest_queue_id IS NULL)
        OR
        (profile_id IS NULL AND guest_queue_id IS NOT NULL)
      );
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS game_team_members_team_guest_unique
  ON public.game_team_members (game_team_id, guest_queue_id)
  WHERE guest_queue_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS game_team_members_game_guest_unique
  ON public.game_team_members (game_id, guest_queue_id)
  WHERE guest_queue_id IS NOT NULL;

ALTER TABLE public.game_draft_events
  ADD COLUMN IF NOT EXISTS guest_queue_id UUID REFERENCES public.game_queue (id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.reconcile_game_capacity(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game public.games%ROWTYPE;
  v_now timestamptz := timezone('utc', now());
  v_rostered_count integer := 0;
  v_promote_count integer := 0;
  v_demote_count integer := 0;
  v_waitlist_min timestamptz;
  v_shift integer := 1;
  v_promoted_profile_ids uuid[] := ARRAY[]::uuid[];
  v_demoted_profile_ids uuid[] := ARRAY[]::uuid[];
  v_promoted_guest_queue_ids uuid[] := ARRAY[]::uuid[];
  v_demoted_guest_queue_ids uuid[] := ARRAY[]::uuid[];
  v_row record;
  v_priority_enabled boolean := FALSE;
BEGIN
  SELECT *
    INTO v_game
    FROM public.games
    WHERE id = p_game_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'game_not_found' USING ERRCODE = 'P0001';
  END IF;

  SELECT community_priority_enabled
    INTO v_priority_enabled
    FROM public.communities
    WHERE id = v_game.community_id;

  SELECT COUNT(*)
    INTO v_rostered_count
    FROM public.game_queue
    WHERE game_id = p_game_id
      AND status = 'rostered';

  IF v_rostered_count < v_game.capacity THEN
    v_promote_count := v_game.capacity - v_rostered_count;

    FOR v_row IN
      SELECT id, profile_id
        FROM public.game_queue
        WHERE game_id = p_game_id
          AND status = 'waitlisted'
        ORDER BY
          CASE WHEN v_priority_enabled THEN (profile_id IS NULL)::int ELSE 0 END,
          joined_at ASC
        LIMIT v_promote_count
        FOR UPDATE
    LOOP
      UPDATE public.game_queue
        SET status = 'rostered',
            promoted_at = v_now,
            attendance_confirmed_at = NULL
        WHERE id = v_row.id;

      IF v_row.profile_id IS NULL THEN
        v_promoted_guest_queue_ids := array_append(v_promoted_guest_queue_ids, v_row.id);
      ELSE
        v_promoted_profile_ids := array_append(v_promoted_profile_ids, v_row.profile_id);
      END IF;
    END LOOP;
  END IF;

  IF v_rostered_count > v_game.capacity THEN
    v_demote_count := v_rostered_count - v_game.capacity;

    SELECT MIN(joined_at)
      INTO v_waitlist_min
      FROM public.game_queue
      WHERE game_id = p_game_id
        AND status = 'waitlisted';

    IF v_waitlist_min IS NULL THEN
      v_waitlist_min := v_now;
    END IF;

    FOR v_row IN
      SELECT id, profile_id
        FROM public.game_queue
        WHERE game_id = p_game_id
          AND status = 'rostered'
        ORDER BY
          CASE WHEN v_priority_enabled THEN (profile_id IS NULL)::int ELSE 0 END DESC,
          joined_at DESC
        LIMIT v_demote_count
        FOR UPDATE
    LOOP
      UPDATE public.game_queue
        SET status = 'waitlisted',
            promoted_at = NULL,
            attendance_confirmed_at = NULL,
            joined_at = v_waitlist_min - make_interval(secs => v_shift)
        WHERE id = v_row.id;

      IF v_row.profile_id IS NULL THEN
        v_demoted_guest_queue_ids := array_append(v_demoted_guest_queue_ids, v_row.id);
      ELSE
        v_demoted_profile_ids := array_append(v_demoted_profile_ids, v_row.profile_id);
      END IF;
      v_shift := v_shift + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'promoted_profile_ids', v_promoted_profile_ids,
    'demoted_profile_ids', v_demoted_profile_ids,
    'promoted_guest_queue_ids', v_promoted_guest_queue_ids,
    'demoted_guest_queue_ids', v_demoted_guest_queue_ids
  );
END;
$$;

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
  v_priority_enabled boolean := FALSE;
  v_waitlist_min timestamptz;
  v_demote_guest_id uuid;
BEGIN
  SELECT *
    INTO v_game
    FROM public.games
    WHERE id = p_game_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'game_not_found' USING ERRCODE = 'P0001';
  END IF;

  SELECT community_priority_enabled
    INTO v_priority_enabled
    FROM public.communities
    WHERE id = v_game.community_id;

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
    IF v_priority_enabled THEN
      SELECT id
        INTO v_demote_guest_id
        FROM public.game_queue
        WHERE game_id = p_game_id
          AND status = 'rostered'
          AND profile_id IS NULL
        ORDER BY joined_at DESC
        LIMIT 1
        FOR UPDATE SKIP LOCKED;

      IF FOUND THEN
        SELECT MIN(joined_at)
          INTO v_waitlist_min
          FROM public.game_queue
          WHERE game_id = p_game_id
            AND status = 'waitlisted';

        IF v_waitlist_min IS NULL THEN
          v_waitlist_min := v_now;
        END IF;

        UPDATE public.game_queue
          SET status = 'waitlisted',
              promoted_at = NULL,
              attendance_confirmed_at = NULL,
              joined_at = v_waitlist_min - make_interval(secs => 1)
          WHERE id = v_demote_guest_id;

        v_new_status := 'rostered';
      END IF;
    END IF;
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

CREATE OR REPLACE FUNCTION public.admin_remove_queue_entry(p_queue_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_row public.game_queue%ROWTYPE;
  v_game public.games%ROWTYPE;
  v_community public.communities%ROWTYPE;
  v_now timestamptz := timezone('utc', now());
  v_promote_id uuid;
  v_promoted_profile_id uuid;
  v_promoted_guest_queue_id uuid;
  v_join_cutoff timestamptz;
  v_confirmation_start timestamptz;
  v_crunch_start timestamptz;
  v_local_start timestamp;
  v_crunch_time time;
BEGIN
  SELECT *
    INTO v_queue_row
    FROM public.game_queue
    WHERE id = p_queue_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'queue_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF v_queue_row.status = 'dropped' THEN
    RETURN jsonb_build_object('status', 'dropped');
  END IF;

  SELECT *
    INTO v_game
    FROM public.games
    WHERE id = v_queue_row.game_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'game_not_found' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
    INTO v_community
    FROM public.communities
    WHERE id = v_game.community_id;

  UPDATE public.game_queue
    SET status = 'dropped',
        dropped_at = COALESCE(dropped_at, v_now),
        attendance_confirmed_at = NULL
    WHERE id = v_queue_row.id;

  v_join_cutoff := v_game.start_time - make_interval(mins => v_game.join_cutoff_offset_minutes_from_kickoff);
  v_confirmation_start := v_game.start_time
    - make_interval(hours => v_community.confirmation_window_hours_before_kickoff);

  v_crunch_start := NULL;
  IF v_game.confirmation_enabled
     AND v_community.crunch_time_enabled
     AND v_join_cutoff > v_confirmation_start THEN
    v_crunch_time := COALESCE(v_game.crunch_time_start_time_local, v_community.crunch_time_start_time_local);
    v_local_start := v_game.start_time AT TIME ZONE v_community.community_timezone;
    v_crunch_start := (date(v_local_start) + v_crunch_time) AT TIME ZONE v_community.community_timezone;
    IF v_crunch_start >= v_join_cutoff THEN
      v_crunch_start := NULL;
    END IF;
  END IF;

  IF v_queue_row.status = 'rostered'
     AND v_now < v_join_cutoff
     AND (v_crunch_start IS NULL OR v_now < v_crunch_start) THEN
    SELECT id, profile_id
      INTO v_promote_id, v_promoted_profile_id
      FROM public.game_queue
      WHERE game_id = v_game.id
        AND status = 'waitlisted'
      ORDER BY
        CASE WHEN v_community.community_priority_enabled THEN (profile_id IS NULL)::int ELSE 0 END,
        joined_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
      UPDATE public.game_queue
        SET status = 'rostered',
            promoted_at = v_now,
            attendance_confirmed_at = NULL
        WHERE id = v_promote_id;

      IF v_promoted_profile_id IS NULL THEN
        v_promoted_guest_queue_id := v_promote_id;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status', 'dropped',
    'promoted_profile_id', v_promoted_profile_id,
    'promoted_guest_queue_id', v_promoted_guest_queue_id
  );
END;
$$;

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
  v_rostered_count integer := 0;
  v_new_status public.game_queue_status;
  v_join_cutoff timestamptz;
  v_is_member boolean := FALSE;
  v_priority_enabled boolean := FALSE;
  v_waitlist_min timestamptz;
  v_demote_guest_id uuid;
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

  SELECT community_priority_enabled
    INTO v_priority_enabled
    FROM public.communities
    WHERE id = v_game.community_id;

  SELECT EXISTS (
    SELECT 1
      FROM public.memberships
      WHERE community_id = v_game.community_id
        AND profile_id = v_profile_id
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'not_member' USING ERRCODE = 'P0001';
  END IF;

  v_join_cutoff := v_game.start_time - make_interval(mins => v_game.join_cutoff_offset_minutes_from_kickoff);
  IF v_now >= v_join_cutoff THEN
    RAISE EXCEPTION 'join_cutoff_passed' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
    INTO v_existing
    FROM public.game_queue
    WHERE game_id = p_game_id
      AND profile_id = v_profile_id
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
    IF v_priority_enabled THEN
      SELECT id
        INTO v_demote_guest_id
        FROM public.game_queue
        WHERE game_id = p_game_id
          AND status = 'rostered'
          AND profile_id IS NULL
        ORDER BY joined_at DESC
        LIMIT 1
        FOR UPDATE SKIP LOCKED;

      IF FOUND THEN
        SELECT MIN(joined_at)
          INTO v_waitlist_min
          FROM public.game_queue
          WHERE game_id = p_game_id
            AND status = 'waitlisted';

        IF v_waitlist_min IS NULL THEN
          v_waitlist_min := v_now;
        END IF;

        UPDATE public.game_queue
          SET status = 'waitlisted',
              promoted_at = NULL,
              attendance_confirmed_at = NULL,
              joined_at = v_waitlist_min - make_interval(secs => 1)
          WHERE id = v_demote_guest_id;

        v_new_status := 'rostered';
      END IF;
    END IF;
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
      v_profile_id,
      v_new_status,
      v_now,
      CASE WHEN v_new_status = 'rostered' THEN v_now ELSE NULL END,
      NULL
    );
  END IF;

  RETURN jsonb_build_object('status', v_new_status);
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
  v_community public.communities%ROWTYPE;
  v_now timestamptz := timezone('utc', now());
  v_promote_id uuid;
  v_promoted_profile_id uuid;
  v_promoted_guest_queue_id uuid;
  v_join_cutoff timestamptz;
  v_confirmation_start timestamptz;
  v_crunch_start timestamptz;
  v_local_start timestamp;
  v_crunch_time time;
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

  IF NOT FOUND OR v_queue_row.status = 'dropped' THEN
    RETURN jsonb_build_object('status', 'dropped');
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

  v_join_cutoff := v_game.start_time - make_interval(mins => v_game.join_cutoff_offset_minutes_from_kickoff);
  IF v_now >= v_join_cutoff THEN
    RAISE EXCEPTION 'join_cutoff_passed' USING ERRCODE = 'P0001';
  END IF;

  IF v_game.draft_status = 'in_progress' THEN
    RAISE EXCEPTION 'draft_in_progress' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
    INTO v_community
    FROM public.communities
    WHERE id = v_game.community_id;

  UPDATE public.game_queue
    SET status = 'dropped',
        dropped_at = COALESCE(dropped_at, v_now),
        attendance_confirmed_at = NULL
    WHERE id = v_queue_row.id;

  v_confirmation_start := v_game.start_time
    - make_interval(hours => v_community.confirmation_window_hours_before_kickoff);

  v_crunch_start := NULL;
  IF v_game.confirmation_enabled
     AND v_community.crunch_time_enabled
     AND v_join_cutoff > v_confirmation_start THEN
    v_crunch_time := COALESCE(v_game.crunch_time_start_time_local, v_community.crunch_time_start_time_local);
    v_local_start := v_game.start_time AT TIME ZONE v_community.community_timezone;
    v_crunch_start := (date(v_local_start) + v_crunch_time) AT TIME ZONE v_community.community_timezone;
    IF v_crunch_start >= v_join_cutoff THEN
      v_crunch_start := NULL;
    END IF;
  END IF;

  IF v_queue_row.status = 'rostered'
     AND v_now < v_join_cutoff
     AND (v_crunch_start IS NULL OR v_now < v_crunch_start) THEN
    SELECT id, profile_id
      INTO v_promote_id, v_promoted_profile_id
      FROM public.game_queue
      WHERE game_id = p_game_id
        AND status = 'waitlisted'
      ORDER BY
        CASE WHEN v_community.community_priority_enabled THEN (profile_id IS NULL)::int ELSE 0 END,
        joined_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
      UPDATE public.game_queue
        SET status = 'rostered',
            promoted_at = v_now,
            attendance_confirmed_at = NULL
        WHERE id = v_promote_id;

      IF v_promoted_profile_id IS NULL THEN
        v_promoted_guest_queue_id := v_promote_id;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status', 'dropped',
    'promoted_profile_id', v_promoted_profile_id,
    'promoted_guest_queue_id', v_promoted_guest_queue_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.add_guest_to_queue(
  p_game_id uuid,
  p_guest_name text,
  p_guest_phone text,
  p_guest_notes text
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
  v_guest_count integer := 0;
  v_queue_id uuid;
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
    v_profile_id
  )
  RETURNING id INTO v_queue_id;

  RETURN jsonb_build_object(
    'status', v_new_status,
    'queue_id', v_queue_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_guest_to_queue(uuid, text, text, text) TO authenticated;
