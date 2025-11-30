alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists jersey_number smallint;
