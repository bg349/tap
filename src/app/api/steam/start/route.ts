import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { origin, STATE_COOKIE, STEAM_OPENID } from "@/lib/verification/steam-openid";

/** Sends the signed-in user to Steam's own sign-in page. */
export async function GET() {
  const base = await origin();
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${base}/login`);
  const state = crypto.randomUUID();
  const returnTo = `${base}/api/steam/callback?s=${state}`;
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": base,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  const res = NextResponse.redirect(`${STEAM_OPENID}?${params}`);
  res.cookies.set(STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/steam" });
  return res;
}
