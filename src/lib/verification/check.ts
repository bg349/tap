import "server-only";
import type { CodeSource } from "./config";
import { lookupGamertag } from "@/lib/providers/xbox/api";

const UA = "Tap/0.1 (account verification; https://github.com/bg349/tap)";
const CHESS_API = process.env.CHESSCOM_API_BASE ?? "https://api.chess.com/pub";
const LETTERBOXD = process.env.LETTERBOXD_BASE ?? "https://letterboxd.com";
const LASTFM_SITE = process.env.LASTFM_SITE_BASE ?? "https://www.last.fm";

export type ProofResult = "found" | "missing" | "no_such_account" | "unreachable";

const norm = (s: string) => s.toUpperCase().replace(/\s+/g, "");
const hasCode = (text: string, code: string) => norm(text).includes(norm(code));

async function get(url: string, accept: string) {
  return fetch(url, { headers: { "User-Agent": UA, Accept: accept }, cache: "no-store", signal: AbortSignal.timeout(8000) });
}

/** Reads the user's public profile and looks for their one-time code in the field we asked them to edit. */
export async function findCode(source: CodeSource, account: string, code: string): Promise<ProofResult> {
  try {
    if (source === "chesscom") {
      const res = await get(`${CHESS_API}/player/${encodeURIComponent(account)}`, "application/json");
      if (res.status === 404) return "no_such_account";
      if (!res.ok) return "unreachable";
      const body = (await res.json()) as { location?: string; name?: string };
      return hasCode(body.location ?? "", code) ? "found" : "missing";
    }
    if (source === "lastfm") {
      const res = await get(`${LASTFM_SITE}/user/${encodeURIComponent(account)}`, "text/html");
      if (res.status === 404) return "no_such_account";
      if (!res.ok) return "unreachable";
      return hasCode(await res.text(), code) ? "found" : "missing";
    }
    if (source === "xbox") {
      const who = await lookupGamertag(account);
      if (!who) return "no_such_account";
      return hasCode(who.bio, code) ? "found" : "missing";
    }
    const res = await get(`${LETTERBOXD}/${encodeURIComponent(account)}/`, "text/html");
    if (res.status === 404) return "no_such_account";
    if (!res.ok) return "unreachable";
    return hasCode(await res.text(), code) ? "found" : "missing";
  } catch {
    return "unreachable";
  }
}
