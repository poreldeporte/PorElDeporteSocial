-- Auto-complete games after end time + grace window.
create or replace function public.auto_complete_games(
  p_default_duration_minutes integer default 90,
  p_grace_minutes integer default 30
)
returns integer
language sql
security definer
set search_path = public
as $$
  with updated as (
    update public.games
    set status = 'completed'
    where status = 'scheduled'
      and start_time is not null
      and timezone('utc', now()) >= (
        coalesce(end_time, start_time + make_interval(mins => p_default_duration_minutes))
        + make_interval(mins => p_grace_minutes)
      )
    returning 1
  )
  select count(*)::integer from updated;
$$;

-- Best-effort scheduling (runs every 10 minutes if pg_cron is available).
do $$
declare
  cron_ready boolean := false;
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    begin
      create extension if not exists pg_cron;
      cron_ready := true;
    exception
      when others then
        cron_ready := false;
    end;
  end if;

  if cron_ready and exists (select 1 from pg_namespace where nspname = 'cron') then
    if not exists (select 1 from cron.job where jobname = 'auto-complete-games') then
      perform cron.schedule('auto-complete-games', '*/10 * * * *', 'select public.auto_complete_games();');
    end if;
  end if;
end $$;

-- Player stats: games played are rostered + completed (confirmation respected).
create or replace function public.get_player_stats(p_profile_id uuid)
returns table (
  wins integer,
  losses integer,
  games integer
)
language sql
stable
as $$
  with played_games as (
    select g.id
    from public.game_queue q
    join public.games g on g.id = q.game_id
    where q.profile_id = p_profile_id
      and q.status = 'rostered'
      and g.status = 'completed'
      and (g.confirmation_enabled = false or q.attendance_confirmed_at is not null)
  ),
  member_teams as (
    select
      g.id as game_id,
      gt.id as team_id
    from public.game_team_members gtm
    join public.game_teams gt on gt.id = gtm.game_team_id
    join public.games g on g.id = gt.game_id
    where gtm.profile_id = p_profile_id
      and g.status = 'completed'
  ),
  outcomes as (
    select
      mt.game_id,
      case
        when gr.status = 'confirmed' and gr.winning_team_id = mt.team_id then 'win'
        when gr.status = 'confirmed' and gr.losing_team_id = mt.team_id then 'loss'
        else null
      end as outcome
    from member_teams mt
    left join public.game_results gr on gr.game_id = mt.game_id
  )
  select
    coalesce(sum(case when outcome = 'win' then 1 else 0 end), 0)::integer as wins,
    coalesce(sum(case when outcome = 'loss' then 1 else 0 end), 0)::integer as losses,
    (select count(*) from played_games)::integer as games
  from outcomes;
$$;

-- Leaderboard: games played from rostered + completed, wins/losses from confirmed results only.
create or replace function public.get_leaderboard_all_time(p_metric text default 'overall')
returns table (
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
language sql
stable
as $$
  with metric as (
    select case
      when lower(coalesce(p_metric, 'overall')) in ('overall', 'wins', 'goal_diff', 'captain')
        then lower(coalesce(p_metric, 'overall'))
      else 'overall'
    end as id
  ),
  played as (
    select
      q.profile_id,
      g.id as game_id,
      g.start_time
    from public.game_queue q
    join public.games g on g.id = q.game_id
    where q.status = 'rostered'
      and g.status = 'completed'
      and (g.confirmation_enabled = false or q.attendance_confirmed_at is not null)
  ),
  played_counts as (
    select
      profile_id,
      count(*)::integer as games
    from played
    group by profile_id
  ),
  result_games as (
    select
      gtm.profile_id,
      gtm.game_team_id,
      gt.game_id,
      g.start_time,
      gr.winning_team_id,
      gr.losing_team_id,
      gr.winner_score,
      gr.loser_score
    from public.game_team_members gtm
    join public.game_teams gt on gt.id = gtm.game_team_id
    join public.games g on g.id = gt.game_id
    join lateral (
      select gr.*
      from public.game_results gr
      where gr.game_id = g.id
        and gr.status = 'confirmed'
      order by gr.reported_at desc nulls last
      limit 1
    ) gr on true
    where g.status = 'completed'
  ),
  aggregates as (
    select
      rg.profile_id,
      sum(case when rg.winning_team_id = rg.game_team_id then 1 else 0 end)::integer as wins,
      sum(case when rg.losing_team_id = rg.game_team_id then 1 else 0 end)::integer as losses,
      sum(
        coalesce(
          case
            when rg.winning_team_id = rg.game_team_id then rg.winner_score
            else rg.loser_score
          end,
          0
        )
      )::integer as goals_for,
      sum(
        coalesce(
          case
            when rg.winning_team_id = rg.game_team_id then rg.loser_score
            else rg.winner_score
          end,
          0
        )
      )::integer as goals_against
    from result_games rg
    group by rg.profile_id
  ),
  recent as (
    select
      rg.profile_id,
      array(
        select outcome from (
          select
            case
              when rg2.winning_team_id = rg2.game_team_id then 'W'
              when rg2.losing_team_id = rg2.game_team_id then 'L'
              else null
            end as outcome,
            rg2.start_time
          from result_games rg2
          where rg2.profile_id = rg.profile_id
        ) t
        where outcome is not null
        order by start_time desc
        limit 5
      ) as recent_outcomes
    from result_games rg
    group by rg.profile_id
  ),
  captain_counts as (
    select
      gc.profile_id,
      count(*)::integer as games_as_captain
    from public.game_captains gc
    join played p on p.game_id = gc.game_id and p.profile_id = gc.profile_id
    group by gc.profile_id
  ),
  base as (
    select
      p.id as profile_id,
      p.name,
      p.avatar_url,
      p.jersey_number,
      p.position,
      pc.games,
      coalesce(a.wins, 0)::integer as wins,
      coalesce(a.losses, 0)::integer as losses,
      coalesce(c.games_as_captain, 0)::integer as games_as_captain,
      coalesce(a.goals_for, 0)::integer as goals_for,
      coalesce(a.goals_against, 0)::integer as goals_against,
      coalesce(a.goals_for, 0)::integer - coalesce(a.goals_against, 0)::integer as goal_diff,
      coalesce(r.recent_outcomes, array[]::text[]) as recent_outcomes,
      coalesce(a.wins::double precision / nullif(a.wins + a.losses, 0), 0)::double precision as win_rate
    from public.profiles p
    join played_counts pc on pc.profile_id = p.id
    left join aggregates a on a.profile_id = p.id
    left join captain_counts c on c.profile_id = p.id
    left join recent r on r.profile_id = p.id
  ),
  ranked as (
    select
      base.*,
      dense_rank() over (order by base.win_rate desc) as overall_rank,
      dense_rank() over (order by base.wins desc) as wins_rank,
      dense_rank() over (order by base.goal_diff desc) as goal_diff_rank,
      dense_rank() over (order by base.games_as_captain desc) as captain_rank
    from base
  ),
  ordered as (
    select
      ranked.*,
      case m.id
        when 'wins' then ranked.wins_rank
        when 'goal_diff' then ranked.goal_diff_rank
        when 'captain' then ranked.captain_rank
        else ranked.overall_rank
      end as rank,
      case m.id
        when 'wins' then ranked.wins
        when 'goal_diff' then ranked.goal_diff
        when 'captain' then ranked.games_as_captain
        else ranked.win_rate
      end as metric_value
    from ranked
    cross join metric m
  )
  select
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
  from ordered
  order by rank asc, metric_value desc, name asc;
$$;
