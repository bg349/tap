"use server";

import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/supabase/profile";
import { createClient, getUser } from "@/lib/supabase/server";
import { fetchLetterboxdAccount } from "./api";
import { letterboxd } from "./index";

type State = { error?: string; notice?: string; values?: Record<string, string> } | undefined;

export async function saveLetterboxdUsername(_prev: State, form: FormData): Promise<State> {
  const user = await getUser();
  if (!user) redirect("/login");

  const raw = String(form.get("letterboxd") ?? "").trim();
  const supabase = await createClient();
  await ensureProfile(supabase, user);

  if (!raw) {
    const { error } = await supabase.from("connections").delete().eq("user_id", user.id).eq("source", "letterboxd");
    return error ? { error: "Couldn't unlink right now. Try again." } : { notice: "Letterboxd unlinked." };
  }

  const invalid = letterboxd.validateAccount(raw);
  if (invalid) return { error: invalid, values: { letterboxd: raw } };
  const username = letterboxd.normalizeAccount(raw);

  const found = await fetchLetterboxdAccount(username);
  if (!found.ok && found.error === "not_found") return { error: found.message, values: { letterboxd: raw } };

  // New links start private ("only-me"); re-saving keeps whatever audience the owner chose.
  const { data: existing } = await supabase
    .from("connections").select("id").eq("user_id", user.id).eq("source", "letterboxd").maybeSingle();
  const { error } = existing
    ? await supabase.from("connections").update({ external_username: username, last_synced_at: null }).eq("id", existing.id)
    : await supabase
        .from("connections")
        .insert({ user_id: user.id, source: "letterboxd", external_username: username, audience: "only-me" });
  if (error) return { error: "Couldn't save right now. Try again.", values: { letterboxd: raw } };
  return { notice: "Saved.", values: { letterboxd: username } };
}
