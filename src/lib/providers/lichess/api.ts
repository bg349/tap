import "server-only";

/** Lichess public API: no key needed. LICHESS_API_BASE can point at a mock for local testing. */
const BASE = process.env.LICHESS_API_BASE ?? "https://lichess.org/api";
const UA = "Tap/0.1 (https://github.com/bg349/tap)";

export interface LichessProfile {
  username: string;
  bio: string;
  /** Ratings by speed, e.g. blitz: 1500. */
  ratings: Record<string, number>;
  createdAt: number | null;
  games: number | null;
  url: string;
}

export interface LichessData extends LichessProfile {
  playing: boolean;
}

export interface LichessGame {
  id: string;
  speed: string;
  rated: boolean;
  status: string;
  endedAt: number;
  me: "white" | "black";
  outcome: "win" | "loss" | "draw";
  opponent: string;
  opponentRating: number | null;
  rating: number | null;
  diff: number | null;
}

async function get(path: string, accept = "application/json") {
  return fetch(`${BASE}${path}`, {
    headers: { Accept: accept, "User-Agent": UA },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
}

/** Public profile, or null if no such account (or it was closed). */
export async function fetchLichessProfile(username: string): Promise<LichessProfile | null> {
  const res = await get(`/user/${encodeURIComponent(username)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Lichess returned ${res.status}`);
  const u = (await res.json()) as {
    username: string;
    closed?: boolean;
    disabled?: boolean;
    tosViolation?: boolean;
    createdAt?: number;
    url?: string;
    count?: { all?: number };
    profile?: { bio?: string };
    perfs?: Record<string, { rating?: number; games?: number }>;
  };
  if (u.closed || u.disabled) return null;
  const ratings: Record<string, number> = {};
  for (const [k, v] of Object.entries(u.perfs ?? {})) {
    if (typeof v?.rating === "number" && (v.games ?? 0) > 0) ratings[k] = v.rating;
  }
  return {
    username: u.username,
    bio: u.profile?.bio ?? "",
    ratings,
    createdAt: u.createdAt ?? null,
    games: u.count?.all ?? null,
    url: u.url ?? `https://lichess.org/@/${u.username}`,
  };
}

/** True while they are in the middle of a game. */
export async function fetchPlaying(username: string): Promise<boolean> {
  const res = await get(`/users/status?ids=${encodeURIComponent(username)}`).catch(() => null);
  if (!res?.ok) return false;
  const body = (await res.json().catch(() => null)) as { playing?: boolean }[] | null;
  return Boolean(body?.[0]?.playing);
}

/** Recent finished games, newest first. */
export async function fetchRecentGames(username: string, sinceMs: number, max = 30): Promise<LichessGame[]> {
  const qs = new URLSearchParams({ max: String(max), since: String(sinceMs), moves: "false", tags: "false", opening: "false", sort: "dateDesc" });
  const res = await get(`/games/user/${encodeURIComponent(username)}?${qs}`, "application/x-ndjson");
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Lichess returned ${res.status}`);
  const me = username.toLowerCase();
  const games: LichessGame[] = [];
  for (const line of (await res.text()).split("\n")) {
    if (!line.trim()) continue;
    let g: {
      id: string; rated?: boolean; speed?: string; status?: string; winner?: "white" | "black";
      createdAt?: number; lastMoveAt?: number;
      players?: Record<"white" | "black", { user?: { name?: string; id?: string }; rating?: number; ratingDiff?: number; aiLevel?: number }>;
    };
    try { g = JSON.parse(line); } catch { continue; }
    const w = g.players?.white, b = g.players?.black;
    if (!w || !b || !g.status || ["created", "started"].includes(g.status)) continue;
    const mine: "white" | "black" = (w.user?.id ?? w.user?.name?.toLowerCase()) === me ? "white" : "black";
    const mp = g.players![mine], op = g.players![mine === "white" ? "black" : "white"];
    games.push({
      id: g.id,
      speed: g.speed ?? "casual",
      rated: Boolean(g.rated),
      status: g.status,
      endedAt: g.lastMoveAt ?? g.createdAt ?? Date.now(),
      me: mine,
      outcome: !g.winner ? "draw" : g.winner === mine ? "win" : "loss",
      opponent: op.user?.name ?? (op.aiLevel ? `Stockfish level ${op.aiLevel}` : "Anonymous"),
      opponentRating: op.rating ?? null,
      rating: mp.rating ?? null,
      diff: mp.ratingDiff ?? null,
    });
  }
  return games;
}
