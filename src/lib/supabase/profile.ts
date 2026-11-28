import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Makes sure the signed-in user has a profile row, and a chess.com connection
 * if they gave a username at sign-up. Runs on first sign-in (after email
 * confirmation), when the user's session can write their own rows under RLS.
 */
export async function ensureProfile(supabase: SupabaseClient, user: User) {
  const { data: existing } = await supabase.from("profiles").select("id,avatar_url,onboarded").eq("id", user.id).maybeSingle();
  if (existing) {
    // Still setting up and no photo yet: use the Google photo if there is one.
    if (!existing.avatar_url && !existing.onboarded) await adoptProviderAvatar(supabase, user);
    return;
  }

  const chess = typeof user.user_metadata?.chesscom === "string" ? user.user_metadata.chesscom : null;
  const emailName = user.email?.split("@")[0] ?? "player";
  const base = (chess ?? emailName).toLowerCase().replace(/[^a-z0-9_]/g, "_").padEnd(3, "_").slice(0, 15);

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

  await adoptProviderAvatar(supabase, user);

  if (chess) {
    await supabase
      .from("connections")
      .upsert(
        { user_id: user.id, source: "chesscom", external_username: chess, audience: "only-me" },
        { onConflict: "user_id,source", ignoreDuplicates: true },
      );
  }
}

const GOOGLE_PHOTO = /^https:\/\/[a-z0-9-]+\.googleusercontent\.com\//i;

/**
 * Google sign-in users get their Google photo as the default. It is copied into our own
 * avatars bucket (profiles.avatar_url may only point there) and only when there is no photo yet,
 * so an uploaded one is never overridden.
 */
export async function adoptProviderAvatar(supabase: SupabaseClient, user: User) {
  try {
    const meta = user.user_metadata as { avatar_url?: string; picture?: string };
    const raw = meta.avatar_url ?? meta.picture;
    if (!raw || !GOOGLE_PHOTO.test(raw)) return;
    const { data: p } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
    if (!p || p.avatar_url) return;
    const res = await fetch(raw.replace(/=s\d+(-c)?$/, "=s384-c"), { signal: AbortSignal.timeout(5000) });
    const type = res.headers.get("content-type")?.split(";")[0] ?? "";
    if (!res.ok || !["image/jpeg", "image/png", "image/webp"].includes(type)) return;
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength > 2 * 1024 * 1024) return;
    const path = `${user.id}/avatar-${Date.now()}.${type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg"}`;
    const { error } = await supabase.storage.from("avatars").upload(path, bytes, { contentType: type });
    if (error) return;
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id).is("avatar_url", null);
  } catch {
    // best effort: initials are a fine default
  }
}
