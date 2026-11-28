"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/app/auth/actions";
import { lastfm } from "@/lib/providers/lastfm";
import { lastfmUserExists } from "@/lib/providers/lastfm/api";
import { ensureProfile } from "@/lib/supabase/profile";
import { createClient, getUser } from "@/lib/supabase/server";

/** Link, change or (empty input) unlink a Last.fm account. New links start private ("only-me"). */
export async function saveLastfmUsername(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");
  const raw = String(form.get("lastfm") ?? "").trim();
  const supabase = await createClient();
  await ensureProfile(supabase, user);

  if (!raw) {
    const { error } = await supabase.from("connections").delete().eq("user_id", user.id).eq("source", "lastfm");
    return error ? { error: "Couldn't unlink right now. Try again." } : { notice: "Last.fm unlinked." };
  }
  const invalid = lastfm.validateAccount(raw);
  if (invalid) return { error: invalid, values: { lastfm: raw } };
  const username = lastfm.normalizeAccount(raw);
  if ((await lastfmUserExists(username)) === false) {
    return { error: `No Last.fm user named “${username}”.`, values: { lastfm: raw } };
  }

  const { data: existing } = await supabase
    .from("connections").select("id").eq("user_id", user.id).eq("source", "lastfm").maybeSingle();
  const { error } = existing
    ? await supabase.from("connections").update({ external_username: username, last_synced_at: null }).eq("id", existing.id)
    : await supabase.from("connections").insert({ user_id: user.id, source: "lastfm", external_username: username, audience: "only-me" });
  if (error) return { error: "Couldn't save right now. Try again.", values: { lastfm: raw } };
  return { notice: "Saved.", values: { lastfm: username } };
}
