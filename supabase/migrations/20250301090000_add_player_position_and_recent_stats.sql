alter table public.profiles
  add column if not exists position text;

create or replace function public.get_player_recent_records(p_profile_ids uuid[])
returns table (
  profile_id uuid,
  wins integer,
  losses integer,
  recent_outcomes text[]
)
language sql
stable
as $$
  with player_games as (
    select
      gtm.profile_id,
      g.id as game_id,
      g.start_time,
      case
        when gr.status = 'confirmed' and gr.winning_team_id = gt.id then 'W'
        when gr.status = 'confirmed' and gr.losing_team_id = gt.id then 'L'
        else null
      end as outcome
    from public.game_team_members gtm
    join public.game_teams gt on gt.id = gtm.game_team_id
    join public.games g on g.id = gt.game_id
    left join public.game_results gr on gr.game_id = g.id
    where gtm.profile_id = any(p_profile_ids)
  )
  select
    profile_id,
    coalesce(sum(case when outcome = 'W' then 1 else 0 end), 0)::integer as wins,
    coalesce(sum(case when outcome = 'L' then 1 else 0 end), 0)::integer as losses,
    coalesce(
      array(
        select outcome
        from player_games pg
        where pg.profile_id = player_games.profile_id and outcome is not null
        order by pg.start_time desc
        limit 5
      ),
      array[]::text[]
    ) as recent_outcomes
  from player_games
  group by profile_id;
$$;
