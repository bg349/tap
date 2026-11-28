-- Security hardening.

-- 1. Friendships: the addressee could rewrite requester/addressee when accepting, forging a friendship
--    with anyone. Only status may change, and only to 'accepted'.
create or replace function private.guard_friendship_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.requester <> old.requester or new.addressee <> old.addressee or new.created_at <> old.created_at
     or new.id <> old.id or new.status <> 'accepted' then
    raise exception 'only accepting a request is allowed';
  end if;
  return new;
end $$;
drop trigger if exists friendships_guard_update on public.friendships;
create trigger friendships_guard_update before update on public.friendships
  for each row execute function private.guard_friendship_update();

-- Friend-request spam limit: 40 new requests per hour per person.
create or replace function private.limit_friend_requests() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.friendships where requester = new.requester and created_at > now() - interval '1 hour') >= 40 then
    raise exception 'too many friend requests, try again later';
  end if;
  return new;
end $$;
drop trigger if exists friendships_rate_limit on public.friendships;
create trigger friendships_rate_limit before insert on public.friendships
  for each row execute function private.limit_friend_requests();

-- 2. Feed ingest: signed-in users may only write their own items (friends are refreshed by the background job).
create or replace function public.ingest_items(target uuid, p_source text, rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if (select auth.uid()) is null then raise exception 'not signed in'; end if;
  if target <> (select auth.uid()) then raise exception 'not allowed'; end if;
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) > 60 then raise exception 'bad rows'; end if;
  if not exists (select 1 from public.connections c where c.user_id = target and c.source = p_source and not c.paused) then
    return 0;
  end if;
  insert into public.items (user_id, source, external_id, kind, title, detail, payload, occurred_at)
  select target, p_source, r->>'external_id', r->>'kind', left(r->>'title', 200), left(r->>'detail', 300),
         coalesce(r->'payload', '{}'::jsonb), (r->>'occurred_at')::timestamptz
  from jsonb_array_elements(rows) r
  on conflict (user_id, source, external_id) do nothing;
  get diagnostics n = row_count;
  update public.connections set last_synced_at = now() where user_id = target and source = p_source;
  return n;
end $$;

create or replace function public.stale_syncs(max_age interval default '00:10:00')
returns table (user_id uuid, source text, external_username text)
language sql stable security definer set search_path = '' as $$
  select c.user_id, c.source, c.external_username
  from public.connections c
  where not c.paused and c.external_username is not null
    and (c.last_synced_at is null or c.last_synced_at < now() - max_age)
    and c.user_id = (select auth.uid())
  order by c.last_synced_at nulls first
  limit 12;
$$;

-- 3. Profiles: avatar must be one of our own stored files; sane lengths even for direct API writes.
alter table public.profiles drop constraint if exists profiles_avatar_own_storage;
alter table public.profiles add constraint profiles_avatar_own_storage
  check (avatar_url is null or avatar_url ~ '^https://dtxrvqcckszcpwbxmzbf\.supabase\.co/storage/v1/object/public/avatars/');
alter table public.profiles drop constraint if exists profiles_text_lengths;
alter table public.profiles add constraint profiles_text_lengths
  check (char_length(display_name) between 1 and 40 and (bio is null or char_length(bio) <= 160));

-- 4. Reactions: switching emoji needs an UPDATE policy (the app already tries to).
drop policy if exists "change own reaction" on public.reactions;
create policy "change own reaction" on public.reactions for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 5. Least privilege: signed-out visitors never touch tables; nobody needs TRUNCATE/TRIGGER/REFERENCES.
revoke all on all tables in schema public from anon;
revoke truncate, trigger, references on all tables in schema public from authenticated;
revoke execute on function public.cron_due_syncs(text, interval, int), public.cron_ingest(text, uuid, text, jsonb),
  public.cron_mark_failed(text, uuid, text), public.ingest_items(uuid, text, jsonb), public.stale_syncs(interval)
  from public, authenticated;
revoke execute on function public.ingest_items(uuid, text, jsonb), public.stale_syncs(interval) from anon;
grant execute on function public.ingest_items(uuid, text, jsonb), public.stale_syncs(interval) to authenticated;
grant execute on function public.cron_due_syncs(text, interval, int), public.cron_ingest(text, uuid, text, jsonb),
  public.cron_mark_failed(text, uuid, text) to anon;

-- 6. Account deletion: a signed-in user can remove their own account; everything cascades.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = (select auth.uid());
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
