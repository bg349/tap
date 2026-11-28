-- Allow Lichess as a code-verified source (profile Biography holds the one-time code).
create or replace function public.start_verification(p_source text, p_account text)
returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); code text; acct text := lower(btrim(p_account));
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_source not in ('chesscom','lastfm','letterboxd','xbox','lichess') then raise exception 'unsupported'; end if;
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
