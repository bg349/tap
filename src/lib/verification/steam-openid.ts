import "server-only";
import { headers } from "next/headers";

export const STEAM_OPENID = "https://steamcommunity.com/openid/login";
export const STATE_COOKIE = "tap_steam_state";

export async function origin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
}
