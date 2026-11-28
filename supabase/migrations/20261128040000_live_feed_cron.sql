-- Live feed: realtime on items + background sync (pg_cron -> /api/cron/sync).
-- Replace REPLACE_WITH_CRON_SECRET with the same value as the CRON_SECRET env var on Vercel before running.

-- 1. Realtime: stream new items to subscribers (row-level security still applies per viewer).
do $$ begin
  alter publication supabase_realtime add table public.items;
exception when duplicate_object then null; end $$;

-- 2. Backoff bookkeeping for failing accounts.
alter table public.connections
  add column if not exists fail_count int not null default 0,
  add column if not exists next_attempt_at timestamptz;

-- 3. Shared secret (stored only as a hash) that lets the background job act without a signed-in user.
create table if not exists private.cron_auth (id int primary key default 1 check (id = 1), secret_hash text not null);
insert into private.cron_auth (id, secret_hash)
values (1, encode(extensions.digest('REPLACE_WITH_CRON_SECRET', 'sha256'), 'hex'))
on conflict (id) do update set secret_hash = excluded.secret_hash;

create or replace function private.cron_ok(p_secret text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.cron_auth where secret_hash = encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex'));
$$;

-- 4. Background-job functions. Each one checks the secret and raises otherwise.
create or replace function public.cron_due_syncs(p_secret text, p_max_age interval default '8 minutes', p_limit int default 24)
returns table (user_id uuid, source text, external_username text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.cron_ok(p_secret) then raise exception 'not allowed'; end if;
  return query
    select c.user_id, c.source, c.external_username
    from public.connections c
    where not c.paused and c.external_username is not null
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
  if not exists (select 1 from public.connections c where c.user_id = target and c.source = p_source and not c.paused) then
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

-- Failed fetch: wait 5 min, then 10, 20, ... up to 6 hours before trying that account again.
create or replace function public.cron_mark_failed(p_secret text, target uuid, p_source text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.cron_ok(p_secret) then raise exception 'not allowed'; end if;
  update public.connections
  set fail_count = fail_count + 1,
      next_attempt_at = now() + least(interval '5 minutes' * power(2, least(fail_count, 10)), interval '6 hours')
  where user_id = target and source = p_source;
end $$;

grant execute on function public.cron_due_syncs(text, interval, int), public.cron_ingest(text, uuid, text, jsonb),
  public.cron_mark_failed(text, uuid, text) to anon, authenticated;

-- 5. Every 5 minutes, ask the site to refresh stale linked accounts.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('tap-sync') where exists (select 1 from cron.job where jobname = 'tap-sync');
select cron.schedule('tap-sync', '*/5 * * * *', $job$
  select net.http_get(
    url := 'https://tap-rouge-five.vercel.app/api/cron/sync',
    headers := jsonb_build_object('Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'),
    timeout_milliseconds := 55000
  );
$job$);
