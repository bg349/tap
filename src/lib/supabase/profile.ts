import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Makes sure the signed-in user has a profile row, and a chess.com connection
 * if they gave a username at sign-up. Runs on first sign-in (after email
 * confirmation), when the user's session can write their own rows under RLS.
 */
export async function ensureProfile(supabase: SupabaseClient, user: User) {
  const { data: existing } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (existing) return;

  const chess = typeof user.user_metadata?.chesscom === "string" ? user.user_metadata.chesscom : null;
  const emailName = user.email?.split("@")[0] ?? "player";
  const base = (chess ?? emailName).toLowerCase().replace(/[^a-z0-9_]/g, "_").padEnd(3, "_").slice(0, 19);

  for (let attempt = 0; attempt < 5; attempt++) {
    const handle = attempt === 0 ? base : `${base}_${Math.floor(1000 + Math.random() * 9000)}`;
    const { error } = await supabase
      .from("profiles")
      .insert({ id: user.id, handle, display_name: chess ?? emailName });
    if (!error) break;
    if (error.code !== "23505") throw error; // anything but a taken handle
    const { data: raced } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (raced) break;
  }

  if (chess) {
    await supabase
      .from("connections")
      .upsert(
        { user_id: user.id, source: "chesscom", external_username: chess, audience: "only-me" },
        { onConflict: "user_id,source", ignoreDuplicates: true },
      );
  }
}
