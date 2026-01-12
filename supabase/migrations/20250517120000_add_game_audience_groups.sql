-- Add community groups and game audience targeting.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.community_groups (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES public.communities (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.community_group_members (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.community_groups (id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS community_group_members_group_profile_key
  ON public.community_group_members (group_id, profile_id);

CREATE INDEX IF NOT EXISTS community_groups_community_id_idx
  ON public.community_groups (community_id);

CREATE INDEX IF NOT EXISTS community_group_members_profile_id_idx
  ON public.community_group_members (profile_id);

ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_group_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_groups'
      AND policyname = 'Admins manage community groups'
  ) THEN
    CREATE POLICY "Admins manage community groups"
      ON public.community_groups
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_group_members'
      AND policyname = 'Admins manage community group members'
  ) THEN
    CREATE POLICY "Admins manage community group members"
      ON public.community_group_members
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_group_members'
      AND policyname = 'Users can view own group memberships'
  ) THEN
    CREATE POLICY "Users can view own group memberships"
      ON public.community_group_members
      FOR SELECT
      USING (auth.uid() = profile_id);
  END IF;
END;
$$;

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS audience_group_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'games_audience_group_id_fkey'
  ) THEN
    ALTER TABLE public.games
      ADD CONSTRAINT games_audience_group_id_fkey
      FOREIGN KEY (audience_group_id)
      REFERENCES public.community_groups (id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS games_audience_group_id_idx
  ON public.games (audience_group_id);

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
  v_in_group boolean := FALSE;
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

  IF v_game.release_at IS NOT NULL AND v_game.released_at IS NULL THEN
    RAISE EXCEPTION 'game_not_released' USING ERRCODE = 'P0001';
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

  IF v_game.audience_group_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
        FROM public.community_group_members
        WHERE group_id = v_game.audience_group_id
          AND profile_id = p_profile_id
    ) INTO v_in_group;

    IF NOT v_in_group THEN
      RAISE EXCEPTION 'not_in_group' USING ERRCODE = 'P0001';
    END IF;
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
  v_in_group boolean := FALSE;
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

  IF v_game.release_at IS NOT NULL AND v_game.released_at IS NULL THEN
    RAISE EXCEPTION 'game_not_released' USING ERRCODE = 'P0001';
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

  IF v_game.audience_group_id IS NOT NULL THEN
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
  v_in_group boolean := FALSE;
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

  IF v_game.release_at IS NOT NULL AND v_game.released_at IS NULL THEN
    RAISE EXCEPTION 'game_not_released' USING ERRCODE = 'P0001';
  END IF;

  IF v_game.status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'game_not_open' USING ERRCODE = 'P0001';
  END IF;

  IF v_game.audience_group_id IS NOT NULL THEN
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
  v_in_group boolean := FALSE;
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
