import { cacheLife } from "next/cache";
import type { ProviderResult } from "../types";

/**
 * chess.com Published-Data API (public, no auth).
 * Docs: https://www.chess.com/news/view/published-data-api
 * CHESSCOM_API_BASE can point at a mock server for local testing.
 */
const API_BASE = process.env.CHESSCOM_API_BASE ?? "https://api.chess.com/pub";
const USER_AGENT = "Tap/0.1 (profile aggregator; https://github.com/bg349/tap)";

// ---------- Raw API shapes (only the fields we use) ----------

interface RawPlayer {
  username: string;
  name?: string;
  avatar?: string;
  url: string;
  country?: string; // e.g. "https://api.chess.com/pub/country/US"
  joined?: number;
  last_online?: number;
  followers?: number;
  title?: string;
  status?: string;
  league?: string;
}

interface RawRecord {
  win: number;
  loss: number;
  draw: number;
}

interface RawModeStats {
  last?: { rating: number; date: number };
  best?: { rating: number; date: number; game?: string };
  record?: RawRecord;
}

interface RawStats {
  chess_rapid?: RawModeStats;
  chess_blitz?: RawModeStats;
  chess_bullet?: RawModeStats;
  chess_daily?: RawModeStats;
  tactics?: {
    highest?: { rating: number; date: number };
    lowest?: { rating: number; date: number };
  };
  puzzle_rush?: { best?: { score: number; total_attempts: number } };
}

interface RawGameSide {
  username: string;
  rating: number;
  result: string;
}

interface RawGame {
  url: string;
  end_time: number;
  time_class: string;
  time_control: string;
  rated: boolean;
  rules: string;
  white: RawGameSide;
  black: RawGameSide;
}

// ---------- Normalized shapes ----------

export type ChessMode = "rapid" | "blitz" | "bullet" | "daily";
export const CHESS_MODES: ChessMode[] = ["rapid", "blitz", "bullet", "daily"];

export interface ChessModeStats {
  mode: ChessMode;
  rating: number;
  best?: number;
  record: RawRecord;
}

export interface ChessGame {
  url: string;
  endTime: number;
  timeClass: string;
  timeControl: string;
  rated: boolean;
  color: "white" | "black";
  outcome: "win" | "loss" | "draw";
  /** Raw chess.com result code, e.g. "checkmated", "resigned", "timeout". */
  result: string;
  myRating: number;
  opponent: string;
  opponentRating: number;
}

export interface ChessData {
  title?: string;
  followers?: number;
  lastOnline?: number;
  modes: ChessModeStats[];
  totals: RawRecord;
  puzzles?: { highest: number; lowest?: number };
  puzzleRushBest?: number;
  recentGames: ChessGame[];
}

// ---------- Fetching ----------

class NotFoundError extends Error {}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (res.status === 404 || res.status === 410) throw new NotFoundError(path);
  if (!res.ok) throw new Error(`chess.com ${res.status} for ${path}`);
  return (await res.json()) as T;
}

const DRAW_RESULTS = new Set([
  "agreed",
  "repetition",
  "stalemate",
  "insufficient",
  "50move",
  "timevsinsufficient",
]);

function outcomeOf(result: string): ChessGame["outcome"] {
  if (result === "win") return "win";
  if (DRAW_RESULTS.has(result)) return "draw";
  return "loss";
}

function toGame(raw: RawGame, username: string): ChessGame {
  const isWhite = raw.white.username.toLowerCase() === username;
  const me = isWhite ? raw.white : raw.black;
  const them = isWhite ? raw.black : raw.white;
  return {
    url: raw.url,
    endTime: raw.end_time,
    timeClass: raw.time_class,
    timeControl: raw.time_control,
    rated: raw.rated,
    color: isWhite ? "white" : "black",
    outcome: outcomeOf(me.result),
    result: me.result === "win" ? them.result : me.result,
    myRating: me.rating,
    opponent: them.username,
    opponentRating: them.rating,
  };
}

async function fetchRecentGames(username: string, limit: number): Promise<ChessGame[]> {
  const { archives } = await getJson<{ archives: string[] }>(
    `/player/${username}/games/archives`,
  );
  const games: RawGame[] = [];
  // Walk back month by month (newest first) until we have enough games.
  for (let i = archives.length - 1; i >= 0 && i >= archives.length - 3; i--) {
    const monthPath = archives[i].replace(/^.*\/pub/, "");
    const month = await getJson<{ games: RawGame[] }>(monthPath);
    games.push(...month.games.filter((g) => g.rules === "chess"));
    if (games.length >= limit) break;
  }
  return games
    .sort((a, b) => b.end_time - a.end_time)
    .slice(0, limit)
    .map((g) => toGame(g, username));
}

function countryCodeOf(countryUrl?: string): string | undefined {
  const code = countryUrl?.split("/").pop();
  // chess.com uses "X*" codes for non-country regions (e.g. XE = England).
  return code && /^[A-Z]{2}$/.test(code) && !code.startsWith("X") ? code : undefined;
}

export async function fetchChessAccount(username: string): Promise<ProviderResult<ChessData>> {
  "use cache";
  try {
    const [player, stats] = await Promise.all([
      getJson<RawPlayer>(`/player/${username}`),
      getJson<RawStats>(`/player/${username}/stats`),
    ]);
    // Recent games are a nice-to-have; don't fail the whole card on them.
    const recentGames = await fetchRecentGames(username, 10).catch(() => []);

    const modes: ChessModeStats[] = [];
    for (const mode of CHESS_MODES) {
      const s = stats[`chess_${mode}`];
      if (!s?.last) continue;
      modes.push({
        mode,
        rating: s.last.rating,
        best: s.best?.rating,
        record: s.record ?? { win: 0, loss: 0, draw: 0 },
      });
    }
    const totals = modes.reduce(
      (t, m) => ({
        win: t.win + m.record.win,
        loss: t.loss + m.record.loss,
        draw: t.draw + m.record.draw,
      }),
      { win: 0, loss: 0, draw: 0 },
    );

    const data: ChessData = {
      title: player.title,
      followers: player.followers,
      lastOnline: player.last_online,
      modes,
      totals,
      puzzles: stats.tactics?.highest
        ? { highest: stats.tactics.highest.rating, lowest: stats.tactics.lowest?.rating }
        : undefined,
      puzzleRushBest: stats.puzzle_rush?.best?.score,
      recentGames,
    };

    const top = [...modes].sort((a, b) => b.rating - a.rating)[0];
    cacheLife("minutes");
    return {
      ok: true,
      identity: {
        username: player.username,
        displayName: player.name?.trim() || player.username,
        avatarUrl: player.avatar,
        profileUrl: player.url,
        countryCode: countryCodeOf(player.country),
        joinedAt: player.joined,
      },
      highlights: top ? [{ label: `${top.mode} rating`, value: String(top.rating) }] : [],
      data,
    };
  } catch (err) {
    cacheLife("seconds");
    if (err instanceof NotFoundError) {
      return { ok: false, error: "not_found", message: `No chess.com player named “${username}”.` };
    }
    console.error("[chesscom]", err);
    return {
      ok: false,
      error: "upstream_error",
      message: "chess.com didn't respond. Try again in a minute.",
    };
  }
}
