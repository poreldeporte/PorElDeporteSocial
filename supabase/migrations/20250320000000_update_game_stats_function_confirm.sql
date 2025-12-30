drop function if exists public.get_game_statistics(uuid[], uuid);

create or replace function public.get_game_statistics(p_game_ids uuid[], p_profile_id uuid)
returns table (
  game_id uuid,
  confirmed_count integer,
  waitlisted_count integer,
  attendance_confirmed_count integer,
  user_status public.game_queue_status,
  user_attendance_confirmed_at timestamptz
)
language sql
stable
as $$
  select
    gid,
    coalesce(sum(case when q.status = 'confirmed' then 1 else 0 end), 0)::int as confirmed_count,
    coalesce(sum(case when q.status = 'waitlisted' then 1 else 0 end), 0)::int as waitlisted_count,
    coalesce(sum(case when q.status = 'confirmed' and q.attendance_confirmed_at is not null then 1 else 0 end), 0)::int as attendance_confirmed_count,
    max(case when q.profile_id = p_profile_id then q.status end) as user_status,
    max(case when q.profile_id = p_profile_id then q.attendance_confirmed_at end) as user_attendance_confirmed_at
  from unnest(coalesce(p_game_ids, array[]::uuid[])) as gid
  left join public.game_queue q on q.game_id = gid
  group by gid
$$;

grant execute on function public.get_game_statistics(uuid[], uuid) to authenticated;
