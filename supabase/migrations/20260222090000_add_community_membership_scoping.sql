-- Community membership roles/status + community naming + favorites.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_status') THEN
    CREATE TYPE public.membership_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_role') THEN
    CREATE TYPE public.membership_role AS ENUM ('owner', 'admin', 'member');
  END IF;
END;
$$;

ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS status public.membership_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS role public.membership_role NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS requested_at timestamptz NOT NULL DEFAULT timezone('utc', now());

UPDATE public.memberships
SET status = 'approved'
WHERE status IS NULL OR status = 'pending';

UPDATE public.memberships
SET requested_at = created_at
WHERE requested_at IS NULL;

UPDATE public.memberships
SET role = profiles.role::text::public.membership_role
FROM public.profiles
WHERE memberships.profile_id = profiles.id
  AND profiles.role IN ('owner', 'admin');

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS sport text,
  ADD COLUMN IF NOT EXISTS description text;

UPDATE public.communities
SET name = 'Community'
WHERE name IS NULL OR name = '';

ALTER TABLE public.communities
  ALTER COLUMN name SET NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS favorite_community_id uuid REFERENCES public.communities (id);

DROP TRIGGER IF EXISTS profiles_add_membership_on_approval ON public.profiles;
DROP FUNCTION IF EXISTS public.add_membership_on_approval();

-- Update storage policies to use membership roles.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins manage community logos'
  ) THEN
    DROP POLICY "Admins manage community logos" ON storage.objects;
  END IF;

  CREATE POLICY "Admins manage community logos"
    ON storage.objects
    FOR ALL
    USING (
      bucket_id = 'community-logos'
      AND EXISTS (
        SELECT 1
        FROM public.memberships
        WHERE memberships.profile_id = auth.uid()
          AND memberships.status = 'approved'
          AND memberships.role IN ('admin', 'owner')
          AND memberships.community_id = (storage.foldername(name))[1]::uuid
      )
    )
    WITH CHECK (
      bucket_id = 'community-logos'
      AND EXISTS (
        SELECT 1
        FROM public.memberships
        WHERE memberships.profile_id = auth.uid()
          AND memberships.status = 'approved'
          AND memberships.role IN ('admin', 'owner')
          AND memberships.community_id = (storage.foldername(name))[1]::uuid
      )
    );
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins manage community banners'
  ) THEN
    DROP POLICY "Admins manage community banners" ON storage.objects;
  END IF;

  CREATE POLICY "Admins manage community banners"
    ON storage.objects
    FOR ALL
    USING (
      bucket_id = 'community-banners'
      AND EXISTS (
        SELECT 1
        FROM public.memberships
        WHERE memberships.profile_id = auth.uid()
          AND memberships.status = 'approved'
          AND memberships.role IN ('admin', 'owner')
          AND memberships.community_id = (storage.foldername(name))[1]::uuid
      )
    )
    WITH CHECK (
      bucket_id = 'community-banners'
      AND EXISTS (
        SELECT 1
        FROM public.memberships
        WHERE memberships.profile_id = auth.uid()
          AND memberships.status = 'approved'
          AND memberships.role IN ('admin', 'owner')
          AND memberships.community_id = (storage.foldername(name))[1]::uuid
      )
    );
END;
$$;

-- Queue functions must require approved membership.
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
        AND status = 'approved'
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
        ORDER BY joined_at ASC
        LIMIT 1;

      IF v_demote_guest_id IS NOT NULL THEN
        UPDATE public.game_queue
          SET status = 'waitlisted',
              promoted_at = v_now
          WHERE id = v_demote_guest_id;

        RETURN jsonb_build_object(
          'status', v_new_status,
          'promoted_guest_queue_id', v_demote_guest_id
        );
      END IF;
    END IF;
  END IF;

  IF v_has_existing THEN
    UPDATE public.game_queue
      SET status = v_new_status,
          promoted_at = case when v_new_status = 'rostered' then v_now else null end,
          dropped_at = null
      WHERE id = v_existing.id;
    RETURN jsonb_build_object('status', v_new_status);
  END IF;

  INSERT INTO public.game_queue (
    game_id,
    profile_id,
    status,
    joined_at
  ) VALUES (
    p_game_id,
    p_profile_id,
    v_new_status,
    v_now
  );

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
        AND status = 'approved'
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
      SELECT min(joined_at)
        INTO v_waitlist_min
        FROM public.game_queue
        WHERE game_id = p_game_id
          AND status = 'waitlisted';

      IF v_waitlist_min IS NOT NULL AND v_waitlist_min < v_now - interval '10 minutes' THEN
        SELECT id
          INTO v_demote_guest_id
          FROM public.game_queue
          WHERE game_id = p_game_id
            AND status = 'rostered'
            AND profile_id IS NULL
          ORDER BY joined_at ASC
          LIMIT 1;

        IF v_demote_guest_id IS NOT NULL THEN
          UPDATE public.game_queue
            SET status = 'waitlisted',
                promoted_at = v_now
            WHERE id = v_demote_guest_id;

          RETURN jsonb_build_object(
            'status', v_new_status,
            'promoted_guest_queue_id', v_demote_guest_id
          );
        END IF;
      END IF;
    END IF;
  END IF;

  IF v_has_existing THEN
    UPDATE public.game_queue
      SET status = v_new_status,
          promoted_at = case when v_new_status = 'rostered' then v_now else null end,
          dropped_at = null
      WHERE id = v_existing.id;
    RETURN jsonb_build_object('status', v_new_status);
  END IF;

  INSERT INTO public.game_queue (
    game_id,
    profile_id,
    status,
    joined_at
  ) VALUES (
    p_game_id,
    v_profile_id,
    v_new_status,
    v_now
  );

  RETURN jsonb_build_object('status', v_new_status);
END;
$$;

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
        AND status = 'approved'
  ) INTO v_is_member;

  SELECT EXISTS (
    SELECT 1
      FROM public.memberships
      WHERE community_id = v_game.community_id
        AND profile_id = v_profile_id
        AND status = 'approved'
        AND role IN ('admin', 'owner')
  ) INTO v_is_admin;

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
  IF v_now >= v_join_cutoff THEN
    RAISE EXCEPTION 'join_cutoff_passed' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*)
    INTO v_guest_count
    FROM public.game_queue
    WHERE game_id = p_game_id
      AND added_by_profile_id = v_profile_id
      AND profile_id IS NULL
      AND status <> 'dropped';

  IF v_guest_count >= 4 AND NOT v_is_admin THEN
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
    guest_name,
    guest_phone,
    guest_notes,
    guest_rating,
    status,
    joined_at,
    added_by_profile_id
  ) VALUES (
    p_game_id,
    p_guest_name,
    p_guest_phone,
    p_guest_notes,
    p_guest_rating,
    v_new_status,
    v_now,
    v_profile_id
  )
  RETURNING id INTO v_queue_id;

  RETURN jsonb_build_object(
    'status', v_new_status,
    'queue_id', v_queue_id
  );
END;
$$;

-- Community-scoped stats functions.
CREATE OR REPLACE FUNCTION public.get_player_stats(
  p_profile_id uuid,
  p_community_id uuid default null
)
RETURNS table (
  wins integer,
  losses integer,
  games integer
)
LANGUAGE sql
STABLE
AS $$
  WITH played_games AS (
    SELECT g.id
    FROM public.game_queue q
    JOIN public.games g ON g.id = q.game_id
    WHERE q.profile_id = p_profile_id
      AND q.status = 'rostered'
      AND g.status = 'completed'
      AND (g.confirmation_enabled = false OR q.attendance_confirmed_at IS NOT NULL)
      AND (p_community_id IS NULL OR g.community_id = p_community_id)
  ),
  member_teams AS (
    SELECT
      g.id AS game_id,
      gt.id AS team_id
    FROM public.game_team_members gtm
    JOIN public.game_teams gt ON gt.id = gtm.game_team_id
    JOIN public.games g ON g.id = gt.game_id
    WHERE gtm.profile_id = p_profile_id
      AND g.status = 'completed'
      AND (p_community_id IS NULL OR g.community_id = p_community_id)
  ),
  outcomes AS (
    SELECT
      mt.game_id,
      CASE
        WHEN gr.status = 'confirmed' AND gr.winning_team_id = mt.team_id THEN 'win'
        WHEN gr.status = 'confirmed' AND gr.losing_team_id = mt.team_id THEN 'loss'
        ELSE NULL
      END AS outcome
    FROM member_teams mt
    LEFT JOIN public.game_results gr ON gr.game_id = mt.game_id
  )
  SELECT
    COALESCE(SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END), 0)::integer AS wins,
    COALESCE(SUM(CASE WHEN outcome = 'loss' THEN 1 ELSE 0 END), 0)::integer AS losses,
    (SELECT COUNT(*) FROM played_games)::integer AS games
  FROM outcomes;
$$;

GRANT EXECUTE ON FUNCTION public.get_player_stats(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_leaderboard_all_time(
  p_metric text default 'overall',
  p_community_id uuid default null
)
RETURNS table (
  profile_id uuid,
  name text,
  avatar_url text,
  jersey_number integer,
  "position" text,
  games integer,
  wins integer,
  losses integer,
  games_as_captain integer,
  goals_for integer,
  goals_against integer,
  goal_diff integer,
  win_rate double precision,
  recent_outcomes text[],
  overall_rank integer,
  wins_rank integer,
  goal_diff_rank integer,
  captain_rank integer,
  rank integer
)
LANGUAGE sql
STABLE
AS $$
  WITH metric AS (
    SELECT CASE
      WHEN lower(coalesce(p_metric, 'overall')) IN ('overall', 'wins', 'goal_diff', 'captain')
        THEN lower(coalesce(p_metric, 'overall'))
      ELSE 'overall'
    END AS id
  ),
  member_games AS (
    SELECT
      gtm.profile_id,
      gtm.game_team_id,
      gt.game_id,
      g.start_time,
      gr.winning_team_id,
      gr.losing_team_id,
      gr.winner_score,
      gr.loser_score
    FROM public.game_team_members gtm
    JOIN public.game_teams gt ON gt.id = gtm.game_team_id
    JOIN public.games g ON g.id = gt.game_id
    JOIN LATERAL (
      SELECT gr.*
      FROM public.game_results gr
      WHERE gr.game_id = g.id
        AND gr.status = 'confirmed'
      ORDER BY gr.reported_at DESC NULLS LAST
      LIMIT 1
    ) gr ON true
    WHERE g.status = 'completed'
      AND (p_community_id IS NULL OR g.community_id = p_community_id)
  ),
  aggregates AS (
    SELECT
      mg.profile_id,
      COUNT(*)::integer AS games,
      SUM(CASE WHEN mg.winning_team_id = mg.game_team_id THEN 1 ELSE 0 END)::integer AS wins,
      SUM(CASE WHEN mg.losing_team_id = mg.game_team_id THEN 1 ELSE 0 END)::integer AS losses,
      SUM(COALESCE(CASE WHEN mg.winning_team_id = mg.game_team_id THEN mg.winner_score ELSE mg.loser_score END, 0))::integer AS goals_for,
      SUM(COALESCE(CASE WHEN mg.winning_team_id = mg.game_team_id THEN mg.loser_score ELSE mg.winner_score END, 0))::integer AS goals_against
    FROM member_games mg
    GROUP BY mg.profile_id
  ),
  recent AS (
    SELECT
      mg.profile_id,
      ARRAY(
        SELECT outcome FROM (
          SELECT
            CASE
              WHEN mg2.winning_team_id = mg2.game_team_id THEN 'W'
              WHEN mg2.losing_team_id = mg2.game_team_id THEN 'L'
              ELSE NULL
            END AS outcome,
            mg2.start_time
          FROM member_games mg2
          WHERE mg2.profile_id = mg.profile_id
        ) t
        WHERE outcome IS NOT NULL
        ORDER BY start_time DESC
        LIMIT 5
      ) AS recent_outcomes
    FROM member_games mg
    GROUP BY mg.profile_id
  ),
  captain_counts AS (
    SELECT
      gc.profile_id,
      COUNT(*)::integer AS games_as_captain
    FROM public.game_captains gc
    JOIN (SELECT DISTINCT game_id FROM member_games) mg ON mg.game_id = gc.game_id
    GROUP BY gc.profile_id
  ),
  base AS (
    SELECT
      p.id AS profile_id,
      p.name,
      p.avatar_url,
      p.jersey_number,
      p.position,
      COALESCE(a.games, 0)::integer AS games,
      COALESCE(a.wins, 0)::integer AS wins,
      COALESCE(a.losses, 0)::integer AS losses,
      COALESCE(c.games_as_captain, 0)::integer AS games_as_captain,
      COALESCE(a.goals_for, 0)::integer AS goals_for,
      COALESCE(a.goals_against, 0)::integer AS goals_against,
      COALESCE(a.goals_for, 0)::integer - COALESCE(a.goals_against, 0)::integer AS goal_diff,
      COALESCE(r.recent_outcomes, ARRAY[]::text[]) AS recent_outcomes,
      COALESCE(a.wins::double precision / NULLIF(a.games, 0), 0)::double precision AS win_rate
    FROM public.profiles p
    LEFT JOIN aggregates a ON a.profile_id = p.id
    LEFT JOIN captain_counts c ON c.profile_id = p.id
    LEFT JOIN recent r ON r.profile_id = p.id
    WHERE a.games > 0
      AND p.deactivated_at IS NULL
      AND p.deleted_at IS NULL
  ),
  ranked AS (
    SELECT
      base.*,
      DENSE_RANK() OVER (ORDER BY base.win_rate DESC) AS overall_rank,
      DENSE_RANK() OVER (ORDER BY base.wins DESC) AS wins_rank,
      DENSE_RANK() OVER (ORDER BY base.goal_diff DESC) AS goal_diff_rank,
      DENSE_RANK() OVER (ORDER BY base.games_as_captain DESC) AS captain_rank
    FROM base
  ),
  ordered AS (
    SELECT
      ranked.*,
      CASE m.id
        WHEN 'wins' THEN ranked.wins_rank
        WHEN 'goal_diff' THEN ranked.goal_diff_rank
        WHEN 'captain' THEN ranked.captain_rank
        ELSE ranked.overall_rank
      END AS rank,
      CASE m.id
        WHEN 'wins' THEN ranked.wins
        WHEN 'goal_diff' THEN ranked.goal_diff
        WHEN 'captain' THEN ranked.games_as_captain
        ELSE ranked.win_rate
      END AS metric_value
    FROM ranked
    CROSS JOIN metric m
  )
  SELECT
    profile_id,
    name,
    avatar_url,
    jersey_number,
    position,
    games,
    wins,
    losses,
    games_as_captain,
    goals_for,
    goals_against,
    goal_diff,
    win_rate,
    recent_outcomes,
    overall_rank,
    wins_rank,
    goal_diff_rank,
    captain_rank,
    rank
  FROM ordered
  ORDER BY rank ASC, metric_value DESC, name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard_all_time(text, uuid) TO authenticated;
