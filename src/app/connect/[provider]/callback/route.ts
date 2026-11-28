import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { STATE_COOKIE, saveLink, siteOrigin } from "@/lib/providers/connect";
import { getProvider } from "@/lib/providers/registry";
import { createClient, getUser } from "@/lib/supabase/server";

/** Where the service sends the user back; finishes the link and returns to the account page. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: id } = await params;
  const provider = getProvider(id);
  const back = (result: string) => {
    const url = new URL("/account", request.nextUrl.origin);
    url.searchParams.set("link", `${id}:${result}`);
    const res = NextResponse.redirect(url);
    res.cookies.delete({ name: STATE_COOKIE, path: "/connect" });
    return res;
  };
  if (!provider?.connect) return back("failed");

  const query = request.nextUrl.searchParams;
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  if (query.get("error")) return back("denied");
  if (!query.get("state") || query.get("state") !== request.cookies.get(STATE_COOKIE)?.value) return back("failed");

  try {
    const { account, tokens } = await provider.connect.complete(query, await siteOrigin());
    await saveLink(await createClient(), user.id, id, account, tokens);
  } catch {
    return back("failed");
  }
  revalidatePath("/", "layout");
  return back("ok");
}
