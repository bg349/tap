"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/app/auth/actions";
import { fetchPlayer, resolveSteamId, SteamConfigError } from "@/lib/providers/steam/api";
import { ensureProfile } from "@/lib/supabase/profile";
import { createClient, getUser } from "@/lib/supabase/server";

export async function saveSteamAccount(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");
  const raw = String(form.get("steam") ?? "").trim();
  const supabase = await createClient();
  await ensureProfile(supabase, user);

  if (!raw) {
    const { error } = await supabase.from("connections").delete().eq("user_id", user.id).eq("source", "steam");
    return error ? { error: "Couldn't unlink right now. Try again." } : { notice: "Steam unlinked." };
  }

  let steamId: string | null;
  let name = "";
  let isPublic = true;
  try {
    steamId = await resolveSteamId(raw);
    const player = steamId ? await fetchPlayer(steamId) : null;
    if (!player) steamId = null;
    else {
      name = player.personaname;
      isPublic = player.communityvisibilitystate === 3;
    }
  } catch (e) {
    return {
      error: e instanceof SteamConfigError ? "Steam linking isn't switched on yet. Check back soon." : "Couldn't reach Steam. Try again.",
      values: { steam: raw },
    };
  }
  if (!steamId) {
    return { error: "We couldn't find that Steam profile. Paste the link from your profile page.", values: { steam: raw } };
  }

  const { data: existing } = await supabase
    .from("connections").select("id").eq("user_id", user.id).eq("source", "steam").maybeSingle();
  const { error } = existing
    ? await supabase.from("connections").update({ external_username: steamId, last_synced_at: null }).eq("id", existing.id)
    : await supabase
        .from("connections")
        .insert({ user_id: user.id, source: "steam", external_username: steamId, audience: "only-me" });
  if (error) return { error: "Couldn't save right now. Try again.", values: { steam: raw } };
  return {
    notice: isPublic
      ? `Linked ${name}.`
      : `Linked ${name}, but your Steam profile is private, so no games will show. In Steam, open Edit Profile → Privacy Settings and set My profile and Game details to Public.`,
    values: { steam: raw },
  };
}
