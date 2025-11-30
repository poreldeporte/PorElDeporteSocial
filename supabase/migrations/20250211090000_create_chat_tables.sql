create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room text not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_room_created_at_idx
  on public.chat_messages (room, created_at);

alter table public.chat_messages enable row level security;

create policy chat_messages_select
  on public.chat_messages
  for select
  to authenticated
  using (true);

create policy chat_messages_insert
  on public.chat_messages
  for insert
  to authenticated
  with check (auth.uid() = profile_id);

create table if not exists public.chat_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  constraint chat_message_reactions_unique unique (message_id, profile_id)
);

create index if not exists chat_message_reactions_message_idx
  on public.chat_message_reactions (message_id);

alter table public.chat_message_reactions enable row level security;

create policy chat_message_reactions_select
  on public.chat_message_reactions
  for select
  to authenticated
  using (true);

create policy chat_message_reactions_mutate
  on public.chat_message_reactions
  for all
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
