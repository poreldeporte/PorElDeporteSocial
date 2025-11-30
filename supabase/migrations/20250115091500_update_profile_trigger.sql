create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  first_name text := nullif(trim(coalesce((new.raw_user_meta_data ->> 'first_name'), '')), '');
  last_name text := nullif(trim(coalesce((new.raw_user_meta_data ->> 'last_name'), '')), '');
  phone text := nullif(trim(coalesce((new.raw_user_meta_data ->> 'phone'), '')), '');
  full_name text := nullif(trim(coalesce((new.raw_user_meta_data ->> 'full_name'), '')), '');
begin
  insert into public.profiles (id, first_name, last_name, phone, name)
  values (
    new.id,
    first_name,
    last_name,
    phone,
    coalesce(
      full_name,
      nullif(trim(concat_ws(' ', coalesce(first_name, ''), coalesce(last_name, ''))), ''),
      null
    )
  );

  return new;
end;
$$;
