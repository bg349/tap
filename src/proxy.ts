import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps the Supabase session cookie fresh on each request.
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return response;

  // Signed-in users without a finished profile go to onboarding. A cookie caches
  // "done" so most requests skip the database. Lookup failures never block anyone.
  const path = request.nextUrl.pathname;
  const exempt = ["/onboarding", "/auth", "/login", "/signup", "/terms", "/privacy"].some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
  if (exempt || request.cookies.get("tap_onboarded")?.value === "1") return response;

  const { data: profile, error } = await supabase.from("profiles").select("onboarded").eq("id", user.id).maybeSingle();
  if (error) return response;
  if (profile?.onboarded) {
    response.cookies.set("tap_onboarded", "1", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return response;
  }
  // No row yet (just signed up) or not finished: onboarding creates/completes it.
  if (request.method === "GET" && !request.headers.has("next-action")) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
