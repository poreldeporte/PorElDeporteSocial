ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

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
  member_games as (
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
      mg.profile_id,
      count(*)::integer as games,
      sum(case when mg.winning_team_id = mg.game_team_id then 1 else 0 end)::integer as wins,
      sum(case when mg.losing_team_id = mg.game_team_id then 1 else 0 end)::integer as losses,
      sum(coalesce(case when mg.winning_team_id = mg.game_team_id then mg.winner_score else mg.loser_score end, 0))::integer as goals_for,
      sum(coalesce(case when mg.winning_team_id = mg.game_team_id then mg.loser_score else mg.winner_score end, 0))::integer as goals_against
    from member_games mg
    group by mg.profile_id
  ),
  recent as (
    select
      mg.profile_id,
      array(
        select outcome from (
          select
            case
              when mg2.winning_team_id = mg2.game_team_id then 'W'
              when mg2.losing_team_id = mg2.game_team_id then 'L'
              else null
            end as outcome,
            mg2.start_time
          from member_games mg2
          where mg2.profile_id = mg.profile_id
        ) t
        where outcome is not null
        order by start_time desc
        limit 5
      ) as recent_outcomes
    from member_games mg
    group by mg.profile_id
  ),
  captain_counts as (
    select
      gc.profile_id,
      count(*)::integer as games_as_captain
    from public.game_captains gc
    join (select distinct game_id from member_games) mg on mg.game_id = gc.game_id
    group by gc.profile_id
  ),
  base as (
    select
      p.id as profile_id,
      p.name,
      p.avatar_url,
      p.jersey_number,
      p.position,
      coalesce(a.games, 0)::integer as games,
      coalesce(a.wins, 0)::integer as wins,
      coalesce(a.losses, 0)::integer as losses,
      coalesce(c.games_as_captain, 0)::integer as games_as_captain,
      coalesce(a.goals_for, 0)::integer as goals_for,
      coalesce(a.goals_against, 0)::integer as goals_against,
      coalesce(a.goals_for, 0)::integer - coalesce(a.goals_against, 0)::integer as goal_diff,
      coalesce(r.recent_outcomes, array[]::text[]) as recent_outcomes,
      coalesce(a.wins::double precision / nullif(a.games, 0), 0)::double precision as win_rate
    from public.profiles p
    left join aggregates a on a.profile_id = p.id
    left join captain_counts c on c.profile_id = p.id
    left join recent r on r.profile_id = p.id
    where a.games > 0
      and p.deactivated_at is null
      and p.deleted_at is null
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
