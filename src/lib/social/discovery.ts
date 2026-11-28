import "server-only";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

export const REF_COOKIE = "tap_ref";
const HANDLE = /^[a-z0-9_]{3,24}$/;

export interface Suggestion {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  mutual: number;
}

export interface InvitePreview {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
}

export async function loadSuggestions(supabase: SupabaseClient, limit = 8): Promise<Suggestion[]> {
  const { data } = await supabase.rpc("people_you_may_know", { max_rows: limit });
  return ((data ?? []) as { id: string; handle: string; display_name: string; avatar_url: string | null; mutual_count: number }[]).map(
    (r) => ({ id: r.id, handle: r.handle, displayName: r.display_name, avatarUrl: r.avatar_url, mutual: r.mutual_count }),
  );
}

export async function invitePreview(supabase: SupabaseClient, handle: string): Promise<InvitePreview | null> {
  const h = handle.toLowerCase();
  if (!HANDLE.test(h)) return null;
  const { data } = await supabase.rpc("invite_preview", { p_handle: h });
  const row = (data as { handle: string; display_name: string; avatar_url: string | null }[] | null)?.[0];
  return row ? { handle: row.handle, displayName: row.display_name, avatarUrl: row.avatar_url } : null;
}

/** The handle from the invite cookie, if it looks valid. */
export async function refHandle(): Promise<string | null> {
  const v = (await cookies()).get(REF_COOKIE)?.value?.toLowerCase();
  return v && HANDLE.test(v) ? v : null;
}

/**
 * After onboarding: turn the invite cookie into a friend request to the inviter
 * (or accept theirs if they already asked). Never throws. Returns the inviter's handle.
 */
export async function redeemInvite(supabase: SupabaseClient, me: string): Promise<string | null> {
  const handle = await refHandle();
  if (!handle) return null;
  try {
    const { data: inviter } = await supabase.from("profiles").select("id,handle").eq("handle", handle).maybeSingle();
    if (!inviter || inviter.id === me) return null;
    const { data: existing } = await supabase
      .from("friendships")
      .select("id,requester,status")
      .or(`and(requester.eq.${me},addressee.eq.${inviter.id}),and(requester.eq.${inviter.id},addressee.eq.${me})`)
      .maybeSingle();
    if (!existing) {
      await supabase.from("friendships").insert({ requester: me, addressee: inviter.id, status: "pending" });
    } else if (existing.status === "pending" && existing.requester === inviter.id) {
      await supabase.from("friendships").update({ status: "accepted" }).eq("id", existing.id);
    }
    return inviter.handle;
  } catch {
    return null;
  }
}
