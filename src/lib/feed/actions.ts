"use server";

import { syncFeed } from "@/lib/feed/sync";
import { createClient, getUser } from "@/lib/supabase/server";

/** Quick refresh of the signed-in user's own linked accounts. Returns how many new items landed. */
export async function refreshMine(): Promise<number> {
  const user = await getUser();
  if (!user) return 0;
  const supabase = await createClient();
  return Promise.race([
    syncFeed(supabase, { maxAge: "25 seconds", onlyUserId: user.id }),
    new Promise<number>((r) => setTimeout(() => r(0), 9000)),
  ]).catch(() => 0);
}

/**
 * Fast path for live music: re-reads only the signed-in user's Last.fm "now playing".
 * Throttled in the database (an account is skipped if it synced under 8s ago), so
 * extra tabs or rapid calls cost nothing. Returns new items, or -1 if no Last.fm is linked/active.
 */
export async function refreshLive(): Promise<number> {
  const user = await getUser();
  if (!user) return -1;
  const supabase = await createClient();
  const { data } = await supabase.rpc("stale_syncs", { max_age: "0 seconds" });
  const linked = ((data ?? []) as { user_id: string; source: string }[]).some((s) => s.user_id === user.id && s.source === "lastfm");
  if (!linked) return -1;
  return Promise.race([
    syncFeed(supabase, { maxAge: "8 seconds", onlyUserId: user.id, onlySource: "lastfm" }),
    new Promise<number>((r) => setTimeout(() => r(0), 7000)),
  ]).catch(() => 0);
}
