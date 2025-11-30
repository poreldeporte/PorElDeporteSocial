create or replace function public.get_game_statistics(p_game_ids uuid[], p_profile_id uuid)
returns table (
  game_id uuid,
  confirmed_count integer,
  waitlisted_count integer,
  user_status public.game_queue_status
)
language sql
stable
as $$
  select
    gid,
    coalesce(sum(case when q.status = 'confirmed' then 1 else 0 end), 0)::int as confirmed_count,
    coalesce(sum(case when q.status = 'waitlisted' then 1 else 0 end), 0)::int as waitlisted_count,
    max(case when q.profile_id = p_profile_id then q.status end) as user_status
  from unnest(coalesce(p_game_ids, array[]::uuid[])) as gid
  left join public.game_queue q on q.game_id = gid
  group by gid
$$;

grant execute on function public.get_game_statistics(uuid[], uuid) to authenticated;
