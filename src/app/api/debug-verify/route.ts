import { connection } from "next/server";
export async function GET() {
  await connection();
  const probe = async (url: string) => {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Tap/0.1 (profile aggregator)", Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
      return { status: r.status, head: (await r.text()).slice(0, 120) };
    } catch (e) {
      return { error: String(e) };
    }
  };
  return Response.json({
    about: await probe("https://www.reddit.com/user/spez/about.json"),
    rss: await probe("https://www.reddit.com/user/spez/.rss"),
    old: await probe("https://old.reddit.com/user/spez/about.json"),
  });
}
