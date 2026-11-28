-- Creates a profile (and a chess.com connection, if given at sign-up) for each new auth user.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chess text := nullif(trim(new.raw_user_meta_data->>'chesscom'), '');
  base text;
  candidate text;
begin
  if chess is not null and chess !~ '^[A-Za-z0-9_-]{3,25}$' then
    chess := null;
  end if;

  base := lower(regexp_replace(coalesce(chess, split_part(new.email, '@', 1), 'player'), '[^a-zA-Z0-9_]', '_', 'g'));
  base := left(rpad(base, 3, '_'), 19);
  candidate := base;
  while exists (select 1 from public.profiles where handle = candidate) loop
    candidate := base || '_' || floor(random() * 9000 + 1000)::int;
  end loop;

  insert into public.profiles (id, handle, display_name)
  values (new.id, candidate, coalesce(chess, split_part(new.email, '@', 1)));

  if chess is not null then
    insert into public.connections (user_id, source, external_username, audience)
    values (new.id, 'chesscom', lower(chess), 'friends');
  end if;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
