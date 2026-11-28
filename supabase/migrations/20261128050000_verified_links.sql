-- Verified account links: a link only counts once the user proves they own the external account.
-- Existing links keep their data but start unverified, so they must be re-verified on the Link accounts page.

alter table public.connections
  add column if not exists verified_at timestamptz,
  add column if not exists verify_code text,
  add column if not exists verify_expires_at timestamptz;

-- One Tap user per external account (only verified links count; pending claims may overlap).
create unique index if not exists connections_verified_account_key
  on public.connections (source, lower(external_username)) where verified_at is not null;
-- A code identifies exactly one pending claim.
create unique index if not exists connections_verify_code_key
  on public.connections (verify_code) where verify_code is not null;

-- Users can never write verification columns themselves (RLS lets them edit their own row otherwise).
create or replace function private.guard_connection() returns trigger
language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('tap.verifying', true), '') = '1' then return new; end if;
  if tg_op = 'INSERT' then
    new.verified_at := null; new.verify_code := null; new.verify_expires_at := null;
  else
    new.verified_at := old.verified_at;
    new.verify_code := old.verify_code;
    new.verify_expires_at := old.verify_expires_at;
    if new.external_username is distinct from old.external_username then
      new.verified_at := null; new.verify_code := null; new.verify_expires_at := null;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists connections_guard on public.connections;
create trigger connections_guard before insert or update on public.connections
  for each row execute function private.guard_connection();

-- Start (or restart) a claim on an external account; returns a one-time code, or null if already verified.
create or replace function public.start_verification(p_source text, p_account text)
returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); code text; acct text := lower(btrim(p_account));
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_source not in ('chesscom','lastfm','letterboxd') then raise exception 'unsupported'; end if;
  if acct = '' or length(acct) > 64 then raise exception 'bad account'; end if;
  if exists (select 1 from public.connections c where c.user_id = uid and c.source = p_source
             and lower(c.external_username) = acct and c.verified_at is not null) then
    return null;
  end if;
  loop
    code := 'TAP-' || (select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
                       from generate_series(1, 4))
         || '-' || (select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
                    from generate_series(1, 4));
    exit when not exists (select 1 from public.connections where verify_code = code);
  end loop;
  perform set_config('tap.verifying', '1', true);
  insert into public.connections (user_id, source, external_username, audience, verify_code, verify_expires_at)
  values (uid, p_source, acct, 'only-me', code, now() + interval '30 minutes')
  on conflict (user_id, source) do update
    set external_username = excluded.external_username, verified_at = null,
        verify_code = excluded.verify_code, verify_expires_at = excluded.verify_expires_at,
        last_synced_at = null, fail_count = 0, next_attempt_at = null;
  return code;
end $$;

-- Mark a claim verified. Only the Tap server can call it (it knows CRON_SECRET) after checking the proof.
-- Code services pass the code they found on the user's public profile; Steam passes the OpenID-proven id.
create or replace function public.finish_verification(p_secret text, p_user uuid, p_source text, p_account text, p_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare acct text := lower(btrim(p_account)); row_ public.connections;
begin
  if not private.cron_ok(p_secret) then raise exception 'not allowed'; end if;
  perform set_config('tap.verifying', '1', true);
  if p_source = 'steam' then
    if acct !~ '^7656[0-9]{13}$' then return 'bad'; end if;
    insert into public.connections (user_id, source, external_username, audience, verified_at)
    values (p_user, 'steam', acct, 'only-me', now())
    on conflict (user_id, source) do update
      set external_username = excluded.external_username, verified_at = now(), verify_code = null,
          verify_expires_at = null, last_synced_at = null, fail_count = 0, next_attempt_at = null;
    return 'ok';
  end if;
  select * into row_ from public.connections where user_id = p_user and source = p_source;
  if not found or row_.verify_code is null or row_.verify_code <> p_code
     or lower(row_.external_username) <> acct or row_.verify_expires_at < now() then
    return 'expired';
  end if;
  update public.connections set verified_at = now(), verify_code = null, verify_expires_at = null,
         last_synced_at = null, fail_count = 0, next_attempt_at = null
  where id = row_.id;
  return 'ok';
exception when unique_violation then
  return 'taken';
end $$;

grant execute on function public.start_verification(text, text) to authenticated;
grant execute on function public.finish_verification(text, uuid, text, text, text) to anon, authenticated;

-- Unverified links never produce feed items, syncs or friend-visible data.
create or replace function private.can_view_item(item_owner uuid, item_source text, item_hidden boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) = item_owner
    or (
      not item_hidden
      and private.are_friends((select auth.uid()), item_owner)
      and exists (
        select 1 from public.connections c
        where c.user_id = item_owner and c.source = item_source and not c.paused and c.verified_at is not null
          and (
            c.audience = 'friends'
            or (c.audience = 'close-friends' and exists (
              select 1 from public.close_friends cf
              where cf.owner_id = item_owner and cf.friend_id = (select auth.uid())
            ))
          )
      )
    );
$$;

create or replace function public.stale_syncs(max_age interval default '00:10:00'::interval)
returns table(user_id uuid, source text, external_username text)
language sql stable security definer set search_path = '' as $$
  select c.user_id, c.source, c.external_username
  from public.connections c
  where not c.paused and c.external_username is not null and c.verified_at is not null
    and (c.last_synced_at is null or c.last_synced_at < now() - max_age)
    and (
      c.user_id = (select auth.uid())
      or (private.are_friends((select auth.uid()), c.user_id) and c.audience = 'friends')
    )
  order by c.last_synced_at nulls first
  limit 12;
$$;

create or replace function public.cron_due_syncs(p_secret text, p_max_age interval default '00:08:00'::interval, p_limit integer default 24)
returns table(user_id uuid, source text, external_username text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.cron_ok(p_secret) then raise exception 'not allowed'; end if;
  return query
    select c.user_id, c.source, c.external_username
    from public.connections c
    where not c.paused and c.external_username is not null and c.verified_at is not null
      and (c.last_synced_at is null or c.last_synced_at < now() - p_max_age)
      and (c.next_attempt_at is null or c.next_attempt_at <= now())
    order by c.last_synced_at nulls first
    limit least(p_limit, 60);
end $$;

create or replace function public.cron_ingest(p_secret text, target uuid, p_source text, rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not private.cron_ok(p_secret) then raise exception 'not allowed'; end if;
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) > 60 then raise exception 'bad rows'; end if;
  if not exists (select 1 from public.connections c where c.user_id = target and c.source = p_source and not c.paused and c.verified_at is not null) then
    return 0;
  end if;
  insert into public.items (user_id, source, external_id, kind, title, detail, payload, occurred_at)
  select target, p_source, r->>'external_id', r->>'kind', left(r->>'title', 200), left(r->>'detail', 300),
         coalesce(r->'payload', '{}'::jsonb), (r->>'occurred_at')::timestamptz
  from jsonb_array_elements(rows) r
  on conflict (user_id, source, external_id) do nothing;
  get diagnostics n = row_count;
  update public.connections set last_synced_at = now(), fail_count = 0, next_attempt_at = null
  where user_id = target and source = p_source;
  return n;
end $$;

create or replace function public.ingest_items(target uuid, p_source text, rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if (select auth.uid()) is null then raise exception 'not signed in'; end if;
  if target <> (select auth.uid()) and not private.are_friends((select auth.uid()), target) then
    raise exception 'not allowed';
  end if;
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) > 60 then raise exception 'bad rows'; end if;
  if not exists (select 1 from public.connections c where c.user_id = target and c.source = p_source and not c.paused and c.verified_at is not null) then
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
