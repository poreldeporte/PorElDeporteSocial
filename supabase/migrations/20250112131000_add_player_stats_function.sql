create or replace function public.get_player_stats(p_profile_id uuid)
returns table (
  wins integer,
  losses integer,
  games integer
)
language sql
stable
as $$
  with member_teams as (
    select
      g.id as game_id,
      gt.id as team_id
    from public.game_team_members gtm
    join public.game_teams gt on gt.id = gtm.game_team_id
    join public.games g on g.id = gt.game_id
    where gtm.profile_id = p_profile_id
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
    (select count(*) from member_teams)::integer as games
  from outcomes;
$$;
