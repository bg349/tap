-- Comments on activity items. Visible to anyone who can see the item; authors and the item's owner can delete.

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists comments_item_idx on public.comments (item_id, created_at);
create index if not exists comments_user_idx on public.comments (user_id, created_at desc);

alter table public.comments enable row level security;

create policy "see comments on visible items" on public.comments for select to authenticated
using (exists (select 1 from public.items i where i.id = comments.item_id and private.can_view_item(i.user_id, i.source, i.hidden)));

create policy "comment on visible items" on public.comments for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.items i where i.id = comments.item_id and private.can_view_item(i.user_id, i.source, i.hidden))
);

create policy "delete own or on my items" on public.comments for delete to authenticated
using (
  (select auth.uid()) = user_id
  or exists (select 1 from public.items i where i.id = comments.item_id and i.user_id = (select auth.uid()))
);

-- Spam guard: trim, max 6 comments/minute and 40/hour per person, no repeating the same text within 10 minutes.
create or replace function private.comments_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.body := btrim(new.body);
  if (select count(*) from public.comments where user_id = new.user_id and created_at > now() - interval '1 minute') >= 6 then
    raise exception 'Slow down: too many comments, try again in a minute.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.comments where user_id = new.user_id and created_at > now() - interval '1 hour') >= 40 then
    raise exception 'Comment limit reached for now, try again later.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.comments where user_id = new.user_id and item_id = new.item_id
             and lower(body) = lower(new.body) and created_at > now() - interval '10 minutes') then
    raise exception 'You already posted that.' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists comments_guard on public.comments;
create trigger comments_guard before insert on public.comments
for each row execute function private.comments_guard();

-- Realtime so new comments appear live (row-level security still applies per viewer).
do $$ begin
  alter publication supabase_realtime add table public.comments;
exception when duplicate_object then null; end $$;
