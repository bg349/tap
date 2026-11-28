import { connection } from "next/server";
const UA = "Tap/0.1 (account verification; https://github.com/bg349/tap)";
const BROWSER = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
export async function GET() {
  await connection();
  const out: Record<string, unknown> = {};
  for (const [k, url] of Object.entries({
    lastfm: "https://www.last.fm/user/bg949",
    lastfm_rj: "https://www.last.fm/user/rj",
    lb: "https://letterboxd.com/bg49/",
    lb_rss: "https://letterboxd.com/bg49/rss/",
  })) {
    for (const [uk, ua] of [["tap", UA], ["browser", BROWSER]]) {
      try {
        const r = await fetch(url, { headers: { "User-Agent": ua, Accept: "text/html" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
        const t = await r.text();
        out[`${k}/${uk}`] = { status: r.status, len: t.length, head: t.slice(0, 120).replace(/\s+/g, " ") };
      } catch (e) {
        out[`${k}/${uk}`] = String(e);
      }
    }
  }
  return Response.json(out);
}
