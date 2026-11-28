import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import type { Provider, TokenSet } from "./types";

export const STATE_COOKIE = "tap_connect_state";

/** The site's public origin, e.g. https://tap-rouge-five.vercel.app. */
export async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
}

/** Saves (or re-saves) the link. New links start private; re-linking keeps the owner's audience choice. */
export async function saveLink(
  supabase: SupabaseClient,
  userId: string,
  source: string,
  account: string,
  tokens?: TokenSet,
) {
  const { data: existing } = await supabase
    .from("connections").select("id").eq("user_id", userId).eq("source", source).maybeSingle();
  let id = existing?.id as string | undefined;
  if (id) {
    const { error } = await supabase.from("connections").update({ external_username: account, last_synced_at: null }).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("connections")
      .insert({ user_id: userId, source, external_username: account, audience: "only-me" })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id as string;
  }
  if (tokens) {
    const { error } = await supabase.from("connection_secrets").upsert({
      connection_id: id,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken ?? null,
      expires_at: tokens.expiresAt ? new Date(tokens.expiresAt * 1000).toISOString() : null,
    });
    if (error) throw error;
  }
}

/** A valid access token for the owner's linked account, refreshed if it's about to expire. Null if unavailable. */
export async function getAccessToken(supabase: SupabaseClient, userId: string, provider: Provider): Promise<string | null> {
  const { data: conn } = await supabase
    .from("connections").select("id").eq("user_id", userId).eq("source", provider.id).maybeSingle();
  if (!conn) return null;
  const { data: s } = await supabase
    .from("connection_secrets").select("access_token, refresh_token, expires_at").eq("connection_id", conn.id).maybeSingle();
  if (!s?.access_token) return null;

  const expiresAt = s.expires_at ? Date.parse(s.expires_at) : Infinity;
  if (expiresAt - Date.now() > 60_000) return s.access_token;
  if (!s.refresh_token || !provider.connect?.refresh) return null;

  const fresh = await provider.connect.refresh(s.refresh_token);
  await supabase.from("connection_secrets").update({
    access_token: fresh.accessToken,
    refresh_token: fresh.refreshToken ?? s.refresh_token,
    expires_at: fresh.expiresAt ? new Date(fresh.expiresAt * 1000).toISOString() : null,
  }).eq("connection_id", conn.id);
  return fresh.accessToken;
}
