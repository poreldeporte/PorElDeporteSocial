create table if not exists public.game_captain_votes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  voter_profile_id uuid not null references public.profiles(id) on delete cascade,
  nominee_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint game_captain_votes_no_self check (voter_profile_id <> nominee_profile_id),
  constraint game_captain_votes_unique unique (game_id, voter_profile_id, nominee_profile_id)
);

create index if not exists game_captain_votes_game_idx
  on public.game_captain_votes (game_id);

create index if not exists game_captain_votes_nominee_idx
  on public.game_captain_votes (game_id, nominee_profile_id);

alter table public.game_captain_votes enable row level security;

create policy game_captain_votes_select
  on public.game_captain_votes
  for select
  to authenticated
  using (true);

create policy game_captain_votes_insert
  on public.game_captain_votes
  for insert
  to authenticated
  with check (auth.uid() = voter_profile_id);

create policy game_captain_votes_delete
  on public.game_captain_votes
  for delete
  to authenticated
  using (auth.uid() = voter_profile_id);
