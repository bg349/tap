-- Profile onboarding: onboarded flag, stricter handle rules, avatar storage.
alter table public.profiles add column if not exists onboarded boolean not null default false;
update public.profiles set onboarded = true where onboarded = false and created_at < now();

alter table public.profiles drop constraint if exists profiles_handle_check;
alter table public.profiles add constraint profiles_handle_check
  check (handle ~ '^[a-z0-9_]{3,24}$') ;
-- New/changed handles: 3-20 chars and not reserved (existing rows are not re-checked).
alter table public.profiles drop constraint if exists profiles_handle_rules;
alter table public.profiles add constraint profiles_handle_rules
  check (handle ~ '^[a-z0-9_]{3,20}$' and handle not in (
    'admin','administrator','api','app','auth','login','logout','signup','signin','account','settings',
    'profile','profiles','friends','feed','home','help','support','terms','privacy','tap','taps','root',
    'system','null','undefined','about','u','www','mail','official','staff','moderator','onboarding','welcome'
  )) not valid;
-- Case-insensitive uniqueness (handles are lowercase by rule; this guards direct writes).
create unique index if not exists profiles_handle_lower_key on public.profiles (lower(handle));

-- Avatars: public read, each user writes only inside their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "avatars own insert" on storage.objects;
create policy "avatars own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "avatars own update" on storage.objects;
create policy "avatars own update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "avatars own delete" on storage.objects;
create policy "avatars own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
