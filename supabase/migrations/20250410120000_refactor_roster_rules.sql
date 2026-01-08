-- Align game roster rules with rostered/waitlisted/dropped states and community settings.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.communities (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  community_timezone TEXT NOT NULL DEFAULT 'UTC',
  confirmation_window_hours_before_kickoff SMALLINT NOT NULL DEFAULT 24,
  confirmation_reminders_local_times TIME[] NOT NULL DEFAULT ARRAY['09:00'::time, '12:00'::time, '15:00'::time],
  crunch_time_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  crunch_time_start_time_local TIME NOT NULL DEFAULT '17:00',
  game_notification_times_local TIME[] NOT NULL DEFAULT ARRAY[]::time[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS community_id UUID,
  ADD COLUMN IF NOT EXISTS confirmation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS join_cutoff_offset_minutes_from_kickoff INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS draft_mode_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS crunch_time_start_time_local TIME;

CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES public.communities (id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS memberships_community_profile_key
  ON public.memberships (community_id, profile_id);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'communities'
      AND policyname = 'Authenticated users can view communities'
  ) THEN
    CREATE POLICY "Authenticated users can view communities"
      ON public.communities
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'memberships'
      AND policyname = 'Users can view own memberships'
  ) THEN
    CREATE POLICY "Users can view own memberships"
      ON public.memberships
      FOR SELECT
      USING (auth.uid() = profile_id);
  END IF;
END;
$$;

DO $$
DECLARE
  v_default_community UUID;
BEGIN
  SELECT id INTO v_default_community FROM public.communities LIMIT 1;
  IF v_default_community IS NULL THEN
    INSERT INTO public.communities (community_timezone)
      VALUES ('UTC')
      RETURNING id INTO v_default_community;
  END IF;

  UPDATE public.games
    SET community_id = v_default_community
    WHERE community_id IS NULL;

  INSERT INTO public.memberships (community_id, profile_id)
    SELECT v_default_community, id
    FROM public.profiles
    ON CONFLICT DO NOTHING;
END;
$$;

ALTER TABLE public.games
  ALTER COLUMN community_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'games_community_id_fkey'
  ) THEN
    ALTER TABLE public.games
      ADD CONSTRAINT games_community_id_fkey
      FOREIGN KEY (community_id)
      REFERENCES public.communities (id);
  END IF;
END;
$$;

ALTER TYPE public.game_queue_status RENAME VALUE 'confirmed' TO 'rostered';
ALTER TYPE public.game_queue_status RENAME VALUE 'cancelled' TO 'dropped';

ALTER TABLE public.game_queue
  RENAME COLUMN cancelled_at TO dropped_at;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'locked'
      AND enumtypid = 'public.game_status'::regtype
  ) THEN
    CREATE TYPE public.game_status_next AS ENUM ('scheduled', 'completed', 'cancelled');

    ALTER TABLE public.games
      ALTER COLUMN status DROP DEFAULT;

    ALTER TABLE public.games
      ALTER COLUMN status TYPE public.game_status_next
      USING (
        CASE
          WHEN status::text = 'locked' THEN 'scheduled'
          ELSE status::text
        END
      )::public.game_status_next;

    ALTER TYPE public.game_status RENAME TO game_status_old;
    ALTER TYPE public.game_status_next RENAME TO game_status;
    DROP TYPE public.game_status_old;

    ALTER TABLE public.games
      ALTER COLUMN status SET DEFAULT 'scheduled'::public.game_status;
  END IF;
END;
$$;

ALTER TABLE public.game_captains
  DROP CONSTRAINT IF EXISTS game_captains_slot_check;

ALTER TABLE public.game_captains
  ADD CONSTRAINT game_captains_slot_check CHECK (slot >= 1);

DROP FUNCTION IF EXISTS public.get_game_statistics(uuid[], uuid);

CREATE OR REPLACE FUNCTION public.get_game_statistics(p_game_ids uuid[], p_profile_id uuid)
RETURNS TABLE (
  game_id uuid,
  rostered_count integer,
  waitlisted_count integer,
  attendance_confirmed_count integer,
  user_status public.game_queue_status,
  user_attendance_confirmed_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    gid,
    COALESCE(SUM(CASE WHEN q.status = 'rostered' THEN 1 ELSE 0 END), 0)::int AS rostered_count,
    COALESCE(SUM(CASE WHEN q.status = 'waitlisted' THEN 1 ELSE 0 END), 0)::int AS waitlisted_count,
    COALESCE(
      SUM(
        CASE
          WHEN q.status = 'rostered'
            AND (g.confirmation_enabled = FALSE OR q.attendance_confirmed_at IS NOT NULL)
            THEN 1
          ELSE 0
        END
      ),
      0
    )::int AS attendance_confirmed_count,
    MAX(CASE WHEN q.profile_id = p_profile_id THEN q.status END) AS user_status,
    MAX(CASE WHEN q.profile_id = p_profile_id THEN q.attendance_confirmed_at END) AS user_attendance_confirmed_at
  FROM unnest(COALESCE(p_game_ids, ARRAY[]::uuid[])) AS gid
  LEFT JOIN public.games g ON g.id = gid
  LEFT JOIN public.game_queue q ON q.game_id = gid
  GROUP BY gid, g.confirmation_enabled
$$;

GRANT EXECUTE ON FUNCTION public.get_game_statistics(uuid[], uuid) TO authenticated;

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
  v_row record;
BEGIN
  SELECT *
    INTO v_game
    FROM public.games
    WHERE id = p_game_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'game_not_found' USING ERRCODE = 'P0001';
  END IF;

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
        ORDER BY joined_at ASC
        LIMIT v_promote_count
        FOR UPDATE SKIP LOCKED
    LOOP
      UPDATE public.game_queue
        SET status = 'rostered',
            promoted_at = v_now,
            attendance_confirmed_at = NULL
        WHERE id = v_row.id;
      v_promoted_profile_ids := array_append(v_promoted_profile_ids, v_row.profile_id);
    END LOOP;
  ELSIF v_rostered_count > v_game.capacity THEN
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
        ORDER BY joined_at DESC
        LIMIT v_demote_count
        FOR UPDATE SKIP LOCKED
    LOOP
      UPDATE public.game_queue
        SET status = 'waitlisted',
            promoted_at = NULL,
            attendance_confirmed_at = NULL,
            joined_at = v_waitlist_min - make_interval(secs => v_shift)
        WHERE id = v_row.id;
      v_demoted_profile_ids := array_append(v_demoted_profile_ids, v_row.profile_id);
      v_shift := v_shift + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'promoted_profile_ids', v_promoted_profile_ids,
    'demoted_profile_ids', v_demoted_profile_ids
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_game_capacity(uuid) TO authenticated;

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

  IF v_game.status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'game_not_open' USING ERRCODE = 'P0001';
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
      ORDER BY joined_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
      UPDATE public.game_queue
        SET status = 'rostered',
            promoted_at = v_now,
            attendance_confirmed_at = NULL
        WHERE id = v_promote_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status', 'dropped',
    'promoted_profile_id', v_promoted_profile_id
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
  v_community public.communities%ROWTYPE;
  v_now timestamptz := timezone('utc', now());
  v_promote_id uuid;
  v_promoted_profile_id uuid;
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
      ORDER BY joined_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
      UPDATE public.game_queue
        SET status = 'rostered',
            promoted_at = v_now,
            attendance_confirmed_at = NULL
        WHERE id = v_promote_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status', 'dropped',
    'promoted_profile_id', v_promoted_profile_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_game_queue(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.grab_open_spot(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_game public.games%ROWTYPE;
  v_community public.communities%ROWTYPE;
  v_waitlisted_row public.game_queue%ROWTYPE;
  v_unconfirmed_row public.game_queue%ROWTYPE;
  v_now timestamptz := timezone('utc', now());
  v_rostered_count integer := 0;
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

  IF NOT v_game.confirmation_enabled THEN
    RAISE EXCEPTION 'confirmation_disabled' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
    INTO v_community
    FROM public.communities
    WHERE id = v_game.community_id;

  IF NOT v_community.crunch_time_enabled THEN
    RAISE EXCEPTION 'crunch_time_disabled' USING ERRCODE = 'P0001';
  END IF;

  v_join_cutoff := v_game.start_time - make_interval(mins => v_game.join_cutoff_offset_minutes_from_kickoff);
  IF v_now >= v_join_cutoff THEN
    RAISE EXCEPTION 'join_cutoff_passed' USING ERRCODE = 'P0001';
  END IF;

  v_confirmation_start := v_game.start_time
    - make_interval(hours => v_community.confirmation_window_hours_before_kickoff);

  IF v_join_cutoff <= v_confirmation_start THEN
    RAISE EXCEPTION 'crunch_time_closed' USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*)
    INTO v_rostered_count
    FROM public.game_queue
    WHERE game_id = p_game_id
      AND status = 'rostered';

  IF v_rostered_count < v_game.capacity THEN
    RAISE EXCEPTION 'no_open_spot' USING ERRCODE = 'P0001';
  END IF;

  v_crunch_time := COALESCE(v_game.crunch_time_start_time_local, v_community.crunch_time_start_time_local);
  v_local_start := v_game.start_time AT TIME ZONE v_community.community_timezone;
  v_crunch_start := (date(v_local_start) + v_crunch_time) AT TIME ZONE v_community.community_timezone;

  IF v_crunch_start >= v_join_cutoff OR v_now < v_crunch_start THEN
    RAISE EXCEPTION 'crunch_time_closed' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
    INTO v_waitlisted_row
    FROM public.game_queue
    WHERE game_id = p_game_id
      AND profile_id = v_profile_id
    FOR UPDATE;

  IF NOT FOUND OR v_waitlisted_row.status <> 'waitlisted' THEN
    RAISE EXCEPTION 'not_waitlisted' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
    INTO v_unconfirmed_row
    FROM public.game_queue
    WHERE game_id = p_game_id
      AND status = 'rostered'
      AND attendance_confirmed_at IS NULL
    ORDER BY joined_at DESC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_open_spot' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.game_queue
    SET status = 'dropped',
        dropped_at = COALESCE(dropped_at, v_now),
        attendance_confirmed_at = NULL
    WHERE id = v_unconfirmed_row.id;

  UPDATE public.game_queue
    SET status = 'rostered',
        promoted_at = v_now,
        attendance_confirmed_at = v_now
    WHERE id = v_waitlisted_row.id;

  RETURN jsonb_build_object('status', 'rostered');
END;
$$;

GRANT EXECUTE ON FUNCTION public.grab_open_spot(uuid) TO authenticated;
