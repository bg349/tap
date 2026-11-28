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
