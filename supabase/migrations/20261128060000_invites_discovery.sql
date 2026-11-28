-- Invites and discovery.
-- invite_preview: what a signed-out visitor sees on an invite link (name + photo only; activity stays friends-only).
-- people_you_may_know: friends of friends first, then newest members; excludes anyone I already have a friendship row with.

create or replace function public.invite_preview(p_handle text)
returns table (handle text, display_name text, avatar_url text)
language sql stable security definer set search_path = ''
as $$
  select p.handle, p.display_name, p.avatar_url
  from public.profiles p
  where p.handle = lower(p_handle) and p.onboarded
  limit 1;
$$;

create or replace function public.people_you_may_know(max_rows int default 12)
returns table (id uuid, handle text, display_name text, avatar_url text, mutual_count int)
language sql stable security definer set search_path = ''
as $$
  with me as (select auth.uid() as uid),
  my_friends as (
    select case when f.requester = me.uid then f.addressee else f.requester end as fid
    from public.friendships f, me
    where f.status = 'accepted' and (f.requester = me.uid or f.addressee = me.uid)
  ),
  candidates as (
    select case when f.requester = mf.fid then f.addressee else f.requester end as cid
    from public.friendships f
    join my_friends mf on (f.requester = mf.fid or f.addressee = mf.fid)
    where f.status = 'accepted'
  ),
  mutual as (select cid, count(*)::int as n from candidates group by cid)
  select p.id, p.handle, p.display_name, p.avatar_url, coalesce(m.n, 0) as mutual_count
  from public.profiles p
  cross join me
  left join mutual m on m.cid = p.id
  where me.uid is not null
    and p.onboarded
    and p.id <> me.uid
    and not exists (
      select 1 from public.friendships x
      where (x.requester = me.uid and x.addressee = p.id) or (x.addressee = me.uid and x.requester = p.id)
    )
  order by coalesce(m.n, 0) desc, p.created_at desc
  limit least(greatest(max_rows, 1), 30);
$$;

revoke all on function public.invite_preview(text) from public;
grant execute on function public.invite_preview(text) to anon, authenticated;
revoke all on function public.people_you_may_know(int) from public, anon;
grant execute on function public.people_you_may_know(int) to authenticated;
