import { NextResponse, type NextRequest } from "next/server";
import { STATE_COOKIE, siteOrigin } from "@/lib/providers/connect";
import { getProvider } from "@/lib/providers/registry";
import { getUser } from "@/lib/supabase/server";

/** Starts linking: sends the signed-in user to the service's own sign-in page. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: id } = await params;
  const provider = getProvider(id);
  const account = new URL("/account", request.nextUrl.origin);
  if (!provider?.connect) return NextResponse.redirect(account);
  if (!(await getUser())) return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  if (!provider.connect.isConfigured()) {
    account.searchParams.set("link", `${id}:soon`);
    return NextResponse.redirect(account);
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(provider.connect.begin(await siteOrigin(), state));
  response.cookies.set(STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/connect" });
  return response;
}
