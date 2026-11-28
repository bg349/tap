import { createClient as createPlainClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { origin, STATE_COOKIE, STEAM_OPENID } from "@/lib/verification/steam-openid";

/** Steam sends the user back here. We ask Steam to confirm the assertion is genuine, then mark the link verified. */
export async function GET(req: NextRequest) {
  const base = await origin();
  const back = (r: string) => {
    const res = NextResponse.redirect(`${base}/account?steam=${r}`);
    res.cookies.delete({ name: STATE_COOKIE, path: "/api/steam" });
    return res;
  };
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${base}/login`);

  const q = req.nextUrl.searchParams;
  const state = q.get("s");
  if (!state || state !== req.cookies.get(STATE_COOKIE)?.value) return back("state");
  if (q.get("openid.mode") !== "id_res") return back("failed");
  if (q.get("openid.return_to") !== `${base}/api/steam/callback?s=${state}`) return back("failed");

  const id = q.get("openid.claimed_id")?.match(/^https:\/\/steamcommunity\.com\/openid\/id\/(7656\d{13})$/)?.[1];
  if (!id) return back("failed");

  // Ask Steam to vouch for the assertion (it also burns the one-time nonce, so replays fail).
  const check = new URLSearchParams();
  for (const [k, v] of q) if (k.startsWith("openid.")) check.set(k, v);
  check.set("openid.mode", "check_authentication");
  try {
    const res = await fetch(STEAM_OPENID, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: check,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok || !/^is_valid\s*:\s*true/m.test(await res.text())) return back("failed");
  } catch {
    return back("failed");
  }

  const secret = process.env.CRON_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!secret || !url || !key) return back("failed");
  const db = createPlainClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.rpc("finish_verification", {
    p_secret: secret, p_user: user.id, p_source: "steam", p_account: id, p_code: null,
  });
  if (error) return back("failed");
  return back(data === "taken" ? "taken" : data === "ok" ? "ok" : "failed");
}
