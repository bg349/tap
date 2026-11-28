-- Master pause for all activity sharing (per-app pause already exists as connections.paused).
-- Paused means nothing new is ingested AND friends can't see existing items, enforced in the database.

alter table public.profiles add column if not exists sharing_paused boolean not null default false;

create or replace function private.sharing_on(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select not coalesce((select p.sharing_paused from public.profiles p where p.id = uid), false);
$$;

create or replace function private.can_view_item(item_owner uuid, item_source text, item_hidden boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) = item_owner
    or (
      not item_hidden
      and private.sharing_on(item_owner)
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

create or replace function public.ingest_items(target uuid, p_source text, rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if (select auth.uid()) is null then raise exception 'not signed in'; end if;
  if target <> (select auth.uid()) then raise exception 'not allowed'; end if;
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) > 60 then raise exception 'bad rows'; end if;
  if not private.sharing_on(target)
     or not exists (select 1 from public.connections c where c.user_id = target and c.source = p_source and not c.paused) then
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

create or replace function public.cron_ingest(p_secret text, target uuid, p_source text, rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not private.cron_ok(p_secret) then raise exception 'not allowed'; end if;
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) > 60 then raise exception 'bad rows'; end if;
  if not private.sharing_on(target)
     or not exists (select 1 from public.connections c where c.user_id = target and c.source = p_source and not c.paused and c.verified_at is not null) then
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

create or replace function public.cron_due_syncs(p_secret text, p_max_age interval default '00:08:00', p_limit integer default 24)
returns table(user_id uuid, source text, external_username text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.cron_ok(p_secret) then raise exception 'not allowed'; end if;
  return query
    select c.user_id, c.source, c.external_username
    from public.connections c
    where not c.paused and c.external_username is not null and c.verified_at is not null
      and private.sharing_on(c.user_id)
      and (c.last_synced_at is null or c.last_synced_at < now() - p_max_age)
      and (c.next_attempt_at is null or c.next_attempt_at <= now())
    order by c.last_synced_at nulls first
    limit least(p_limit, 60);
end $$;

create or replace function public.stale_syncs(max_age interval default '00:10:00')
returns table(user_id uuid, source text, external_username text)
language sql stable security definer set search_path = '' as $$
  select c.user_id, c.source, c.external_username
  from public.connections c
  where not c.paused and c.external_username is not null and private.sharing_on(c.user_id)
    and (c.last_synced_at is null or c.last_synced_at < now() - max_age)
    and c.user_id = (select auth.uid())
  order by c.last_synced_at nulls first
  limit 12;
$$;
