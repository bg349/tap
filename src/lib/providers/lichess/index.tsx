import type { FeedEvent, Provider } from "../types";
import { ChessEvent } from "../chesscom/ChessEvent";
import { modeName } from "../chesscom/events";
import { fetchLichessProfile, fetchPlaying, fetchRecentGames, type LichessData } from "./api";

const WINDOW_DAYS = 7;
/** Lichess statuses mapped to the wording the shared chess row already knows. */
const RESULT: Record<string, string> = {
  mate: "checkmated", resign: "resigned", outoftime: "timeout", timeout: "timeout", draw: "agreed",
  stalemate: "stalemate", noStart: "abandoned", cheat: "abandoned", variantEnd: "variant end",
};

export const lichess: Provider<LichessData> = {
  id: "lichess",
  name: "Lichess",
  accent: "#e8e8e8",
  accountLabel: "Lichess username",
  accountPlaceholder: "e.g. DrNykterstein",
  normalizeAccount(input) {
    const fromUrl = input.match(/lichess\.org\/@\/([^/?#]+)/i)?.[1];
    return decodeURIComponent(fromUrl ?? input).trim().replace(/^@/, "").toLowerCase();
  },
  validateAccount(input) {
    const u = this.normalizeAccount(input);
    if (!u) return "Enter a username.";
    if (!/^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/.test(u)) return "That doesn't look like a Lichess username.";
    return null;
  },

  async fetchAccount(username) {
    try {
      const p = await fetchLichessProfile(username);
      if (!p) return { ok: false, error: "not_found", message: "No Lichess account with that username." };
      const playing = await fetchPlaying(username);
      const top = Object.entries(p.ratings).sort((a, b) => b[1] - a[1])[0];
      return {
        ok: true,
        identity: {
          username: p.username,
          displayName: p.username,
          profileUrl: p.url,
          joinedAt: p.createdAt ? Math.floor(p.createdAt / 1000) : undefined,
        },
        highlights: top ? [{ label: modeName(top[0]) || top[0], value: String(top[1]) }] : [],
        data: { ...p, playing },
      };
    } catch {
      return { ok: false, error: "upstream_error", message: "Lichess couldn't be reached right now." };
    }
  },

  async fetchEvents(username): Promise<FeedEvent[]> {
    const now = Date.now();
    const events: FeedEvent[] = [];
    if (await fetchPlaying(username)) {
      events.push({
        externalId: `playing:${new Date(now).toISOString().slice(0, 13)}`, // at most one per hour
        kind: "playing",
        title: "Playing a game on Lichess",
        detail: "Playing now",
        payload: {},
        occurredAt: new Date(now).toISOString(),
      });
    }
    for (const g of await fetchRecentGames(username, now - WINDOW_DAYS * 86_400_000)) {
      const verb = g.outcome === "win" ? "Beat" : g.outcome === "loss" ? "Lost to" : "Drew with";
      events.push({
        externalId: g.id,
        kind: "game",
        title: `${verb} ${g.opponent}`,
        detail: `${modeName(g.speed) || g.speed} · ${g.rating ?? "?"}${g.diff ? ` (${g.diff > 0 ? "+" : ""}${g.diff})` : ""}`,
        payload: {
          url: `https://lichess.org/${g.id}/${g.me}`,
          outcome: g.outcome,
          opponent: g.opponent,
          opponentRating: g.opponentRating,
          rating: g.rating,
          delta: g.diff,
          timeClass: g.speed,
          rated: g.rated,
          color: g.me,
          result: RESULT[g.status] ?? g.status,
        },
        occurredAt: new Date(g.endedAt).toISOString(),
      });
    }
    return events;
  },

  renderEvent: (item) =>
    item.kind === "playing" ? (
      <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-4">
        <span className="text-2xl" aria-hidden>♞</span>
        <div className="min-w-0 flex-1 font-semibold">{item.title}</div>
        <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-[var(--win)]" aria-label="Playing now" />
      </div>
    ) : (
      <ChessEvent item={item} />
    ),

  renderSection: (data) => (
    <ul className="grid gap-2">
      {data.playing && (
        <li className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-sm font-medium">Playing a game now</li>
      )}
      {Object.entries(data.ratings).map(([mode, r]) => (
        <li key={mode} className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-4 py-3 text-sm">
          <span className="capitalize text-[var(--muted)]">{mode}</span>
          <span className="font-semibold tabular-nums">{r}</span>
        </li>
      ))}
      {!Object.keys(data.ratings).length && <li className="text-sm text-[var(--muted)]">No rated games yet.</li>}
    </ul>
  ),
};
