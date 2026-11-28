-- Profanity filter on comments (enforced in the database so it can't be bypassed) and user reports.

create or replace function private.has_profanity(t text) returns boolean
language sql immutable set search_path = '' as $$
  select translate(lower(t), '01345$@!', 'oleass ai') ~
    '(^|[^a-z])(fuck\w*|f+u+c+k+\w*|shit\w*|bitch\w*|cunt\w*|asshole\w*|bastard\w*|dick(head)?s?|pussy|whore\w*|slut\w*|nigg\w*|fag(got)?s?|retard\w*|twat\w*|wank\w*|bullshit)([^a-z]|$)'
$$;

create or replace function private.comments_profanity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if private.has_profanity(new.body) then
    raise exception 'Please keep it friendly: that comment has language we don''t allow.' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists comments_profanity on public.comments;
create trigger comments_profanity before insert on public.comments
for each row execute function private.comments_profanity();

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete set null,
  reason text not null check (reason in ('spam','harassment','inappropriate','impersonation','other')),
  details text check (details is null or char_length(details) <= 500),
  status text not null default 'open' check (status in ('open','reviewed','dismissed')),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;
-- Users may file reports as themselves; nobody can read them except the service role (Supabase dashboard / SQL editor).
create policy "file own report" on public.reports for insert to authenticated
with check ((select auth.uid()) = reporter_id);

create or replace function private.reports_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.reports where reporter_id = new.reporter_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many reports for now, try again later.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.reports where reporter_id = new.reporter_id and reported_id = new.reported_id
             and coalesce(comment_id::text,'') = coalesce(new.comment_id::text,'') and status = 'open') then
    raise exception 'You already reported this. Thanks, we''ll take a look.' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists reports_guard on public.reports;
create trigger reports_guard before insert on public.reports
for each row execute function private.reports_guard();

-- Admin view (service role only): select * from public.open_reports;
create or replace view public.open_reports with (security_invoker = true) as
select r.id, r.created_at, r.reason, r.details, rp.handle as reporter, rd.handle as reported, c.body as comment
from public.reports r
join public.profiles rp on rp.id = r.reporter_id
join public.profiles rd on rd.id = r.reported_id
left join public.comments c on c.id = r.comment_id
where r.status = 'open' order by r.created_at desc;
revoke all on public.open_reports from anon, authenticated;
