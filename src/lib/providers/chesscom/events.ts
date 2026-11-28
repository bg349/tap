import type { FeedEvent } from "../types";
import { NotFoundError, getJson, toGame, type ChessGame, type RawGame } from "./api";

/** How far back the first sync looks, so a new link doesn't flood the feed. */
const WINDOW_DAYS = 7;
const MAX_EVENTS = 30;

const RESULT_WORDS: Record<string, string> = {
  checkmated: "checkmate",
  resigned: "resignation",
  timeout: "time",
  abandoned: "abandonment",
  agreed: "agreement",
  repetition: "repetition",
  stalemate: "stalemate",
  insufficient: "insufficient material",
  "50move": "the 50-move rule",
  timevsinsufficient: "time vs insufficient material",
  kingofthehill: "king of the hill",
};

export function resultWord(result: string) {
  return RESULT_WORDS[result] ?? result;
}

const MODE_NAMES: Record<string, string> = { rapid: "Rapid", blitz: "Blitz", bullet: "Bullet", daily: "Daily" };
export const modeName = (m: string) => MODE_NAMES[m] ?? m;

/** Pure: turns games (any order) into feed events for the recent window. */
export function eventsFromGames(games: ChessGame[], now = Date.now() / 1000): FeedEvent[] {
  const cutoff = now - WINDOW_DAYS * 86400;
  const asc = [...games].sort((a, b) => a.endTime - b.endTime);
  const lastRating = new Map<string, number>();
  const events: FeedEvent[] = [];

  for (const g of asc) {
    const prev = lastRating.get(g.timeClass);
    lastRating.set(g.timeClass, g.myRating);
    if (g.endTime < cutoff) continue;

    const delta = prev === undefined ? undefined : g.myRating - prev;
    const occurredAt = new Date(g.endTime * 1000).toISOString();
    const verb = g.outcome === "win" ? "Beat" : g.outcome === "loss" ? "Lost to" : "Drew with";
    events.push({
      externalId: g.url,
      kind: "game",
      title: `${verb} ${g.opponent}`,
      detail: `${modeName(g.timeClass)} · ${g.myRating}${delta ? ` (${delta > 0 ? "+" : ""}${delta})` : ""}`,
      payload: {
        url: g.url,
        outcome: g.outcome,
        opponent: g.opponent,
        opponentRating: g.opponentRating,
        rating: g.myRating,
        delta: delta ?? null,
        timeClass: g.timeClass,
        timeControl: g.timeControl,
        rated: g.rated,
        color: g.color,
        result: g.result,
      },
      occurredAt,
    });

    // Milestone: crossed a new hundred upward (e.g. 1195 -> 1203 => "Hit 1200").
    if (prev !== undefined && g.rated && Math.floor(g.myRating / 100) > Math.floor(prev / 100)) {
      const level = Math.floor(g.myRating / 100) * 100;
      events.push({
        externalId: `milestone:${g.timeClass}:${level}`,
        kind: "milestone",
        title: `Hit ${level} in ${modeName(g.timeClass).toLowerCase()}`,
        detail: `New rating ${g.myRating}`,
        payload: { url: g.url, rating: g.myRating, level, timeClass: g.timeClass },
        // Just after the game so it sorts above it.
        occurredAt: new Date(g.endTime * 1000 + 1000).toISOString(),
      });
    }
  }

  return events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, MAX_EVENTS);
}

/** Last two months of games -> feed events. Throws if chess.com is unreachable, so the caller retries later. */
export async function fetchChessEvents(username: string): Promise<FeedEvent[]> {
  try {
    const { archives } = await getJson<{ archives: string[] }>(`/player/${username}/games/archives`);
    const raw: RawGame[] = [];
    for (const archive of archives.slice(-2)) {
      const month = await getJson<{ games: RawGame[] }>(archive.replace(/^.*\/pub/, ""));
      raw.push(...month.games.filter((g) => g.rules === "chess"));
    }
    return eventsFromGames(raw.map((g) => toGame(g, username.toLowerCase())));
  } catch (err) {
    if (err instanceof NotFoundError) return [];
    throw err;
  }
}
