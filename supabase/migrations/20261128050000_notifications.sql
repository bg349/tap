-- In-app notifications: friend requests, accepted requests, reactions.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('friend_request', 'friend_accepted', 'reaction')),
  friendship_id uuid,
  item_id uuid references public.items(id) on delete cascade,
  emoji text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;
drop policy if exists "notifications read own" on public.notifications;
create policy "notifications read own" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "notifications delete own" on public.notifications;
create policy "notifications delete own" on public.notifications for delete to authenticated using (user_id = (select auth.uid()));
-- No insert policy: only the triggers below create notifications. Users may only change read_at.
revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Friendships
create or replace function private.notify_friendship() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into public.notifications (user_id, actor_id, type, friendship_id)
    values (new.addressee, new.requester, 'friend_request', new.id);
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status <> 'accepted' then
    delete from public.notifications where type = 'friend_request' and friendship_id = new.id;
    insert into public.notifications (user_id, actor_id, type, friendship_id)
    values (new.requester, new.addressee, 'friend_accepted', new.id);
  elsif tg_op = 'DELETE' then
    delete from public.notifications where type = 'friend_request' and friendship_id = old.id;
  end if;
  return null;
end $$;
drop trigger if exists notify_friendship on public.friendships;
create trigger notify_friendship after insert or update or delete on public.friendships
  for each row execute function private.notify_friendship();

-- Reactions (one notification per person per post; changing emoji refreshes it)
create or replace function private.notify_reaction() returns trigger
language plpgsql security definer set search_path = '' as $$
declare owner uuid;
begin
  if tg_op = 'DELETE' then
    delete from public.notifications where type = 'reaction' and actor_id = old.user_id and item_id = old.item_id;
    return null;
  end if;
  select user_id into owner from public.items where id = new.item_id;
  if owner is null or owner = new.user_id then return null; end if;
  delete from public.notifications where type = 'reaction' and actor_id = new.user_id and item_id = new.item_id;
  insert into public.notifications (user_id, actor_id, type, item_id, emoji)
  values (owner, new.user_id, 'reaction', new.item_id, new.emoji);
  return null;
end $$;
drop trigger if exists notify_reaction on public.reactions;
create trigger notify_reaction after insert or update or delete on public.reactions
  for each row execute function private.notify_reaction();

-- Realtime (row-level security applies per listener)
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
