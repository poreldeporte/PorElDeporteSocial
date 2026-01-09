DO $$
DECLARE
  v_owner uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'owner') THEN
    SELECT created_by
      INTO v_owner
      FROM public.games
      WHERE created_by IN (SELECT id FROM public.profiles WHERE role = 'admin')
      ORDER BY created_at ASC
      LIMIT 1;

    IF v_owner IS NULL THEN
      SELECT id
        INTO v_owner
        FROM public.profiles
        WHERE role = 'admin'
        ORDER BY id ASC
        LIMIT 1;
    END IF;

    IF v_owner IS NOT NULL THEN
      UPDATE public.profiles
        SET role = 'owner'
        WHERE id = v_owner;
    END IF;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Admins can update profiles'
  ) THEN
    DROP POLICY "Admins can update profiles" ON public.profiles;
  END IF;

  CREATE POLICY "Admins can update profiles"
    ON public.profiles
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1
        FROM public.profiles AS actor
        WHERE actor.id = auth.uid()
          AND actor.role IN ('admin', 'owner')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.profiles AS actor
        WHERE actor.id = auth.uid()
          AND actor.role IN ('admin', 'owner')
      )
    );
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'games'
      AND policyname = 'Admins can insert games'
  ) THEN
    DROP POLICY "Admins can insert games" ON public.games;
  END IF;

  CREATE POLICY "Admins can insert games"
    ON public.games
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'owner')
      )
      AND created_by = auth.uid()
    );
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'games'
      AND policyname = 'Admins can modify games'
  ) THEN
    DROP POLICY "Admins can modify games" ON public.games;
  END IF;

  CREATE POLICY "Admins can modify games"
    ON public.games
    FOR UPDATE
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
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'games'
      AND policyname = 'Admins can delete games'
  ) THEN
    DROP POLICY "Admins can delete games" ON public.games;
  END IF;

  CREATE POLICY "Admins can delete games"
    ON public.games
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'owner')
      )
    );
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'game_captains'
      AND policyname = 'Admins manage captains'
  ) THEN
    DROP POLICY "Admins manage captains" ON public.game_captains;
  END IF;

  CREATE POLICY "Admins manage captains"
    ON public.game_captains
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
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chat_messages'
      AND policyname = 'chat_messages_delete_admin'
  ) THEN
    DROP POLICY chat_messages_delete_admin ON public.chat_messages;
  END IF;

  CREATE POLICY chat_messages_delete_admin
    ON public.chat_messages
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'owner')
      )
    );
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'game_teams'
      AND policyname = 'Admins manage teams'
  ) THEN
    DROP POLICY "Admins manage teams" ON public.game_teams;
  END IF;

  CREATE POLICY "Admins manage teams"
    ON public.game_teams
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
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'game_player_stats'
      AND policyname = 'Players can view their stats'
  ) THEN
    DROP POLICY "Players can view their stats" ON public.game_player_stats;
  END IF;

  CREATE POLICY "Players can view their stats"
    ON public.game_player_stats
    FOR SELECT
    USING (
      auth.uid() = profile_id
      OR EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'owner')
      )
    );
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'game_player_stats'
      AND policyname = 'Admins manage player stats'
  ) THEN
    DROP POLICY "Admins manage player stats" ON public.game_player_stats;
  END IF;

  CREATE POLICY "Admins manage player stats"
    ON public.game_player_stats
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
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'game_draft_events'
      AND policyname = 'Admins manage draft events'
  ) THEN
    DROP POLICY "Admins manage draft events" ON public.game_draft_events;
  END IF;

  CREATE POLICY "Admins manage draft events"
    ON public.game_draft_events
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
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'game_reviews'
      AND policyname = 'Admins can view reviews'
  ) THEN
    DROP POLICY "Admins can view reviews" ON public.game_reviews;
  END IF;

  CREATE POLICY "Admins can view reviews"
    ON public.game_reviews
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'owner')
      )
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

  SELECT COALESCE(profiles.role IN ('admin', 'owner'), FALSE)
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
