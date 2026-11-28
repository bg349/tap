import type { FeedPost } from "./queries";

/** Same person + same service within this gap (between neighbouring items) belong together. */
export const GROUP_GAP_MS = 3 * 3600_000;
/** Only collapse when there are at least this many items; fewer render as normal cards. */
export const GROUP_MIN = 3;

export type FeedEntry =
  | { type: "post"; post: FeedPost }
  | { type: "group"; key: string; posts: FeedPost[] }; // posts newest-first

/** Pure: collapses runs of the same author + source into groups, keeping newest-first order. */
export function groupPosts(posts: FeedPost[]): FeedEntry[] {
  const open = new Map<string, FeedPost[]>();
  const clusters: FeedPost[][] = [];
  for (const p of posts) {
    const k = `${p.author.id}:${p.source}`;
    const cur = open.get(k);
    const last = cur?.[cur.length - 1];
    if (cur && last && new Date(last.occurredAt).getTime() - new Date(p.occurredAt).getTime() <= GROUP_GAP_MS) {
      cur.push(p);
    } else {
      const fresh = [p];
      open.set(k, fresh);
      clusters.push(fresh);
    }
  }
  // clusters are already ordered by their newest member (first-seen order).
  return clusters.flatMap<FeedEntry>((c) =>
    c.length >= GROUP_MIN
      ? [{ type: "group", key: `${c[0].author.id}:${c[0].source}:${c[c.length - 1].id}`, posts: c }]
      : c.map((post) => ({ type: "post", post })),
  );
}

const num = (v: unknown) => (typeof v === "number" ? v : undefined);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const names = (titles: string[], max = 3) =>
  titles.length <= max ? titles.join(", ") : `${titles.slice(0, max).join(", ")} +${titles.length - max} more`;
const unique = (xs: string[]) => [...new Set(xs)];

export interface GroupSummary {
  /** e.g. "played 8 games" (follows the author's name) */
  headline: string;
  /** e.g. "5 wins, 3 losses · rating 887 → 912" */
  detail: string;
}

/** Per-service wording for a collapsed group. `posts` are newest-first. */
export function summarize(posts: FeedPost[]): GroupSummary {
  const n = posts.length;
  const oldestFirst = [...posts].reverse();
  switch (posts[0].source) {
    case "chesscom": {
      const games = oldestFirst.filter((p) => p.kind === "game");
      const w = games.filter((p) => p.payload.outcome === "win").length;
      const l = games.filter((p) => p.payload.outcome === "loss").length;
      const d = games.length - w - l;
      const parts = [plural(w, "win"), plural(l, "loss", "losses")];
      if (d) parts.push(plural(d, "draw"));
      // Rating change in the most-played time control.
      const counts = new Map<string, number>();
      for (const g of games) counts.set(String(g.payload.timeClass), (counts.get(String(g.payload.timeClass)) ?? 0) + 1);
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const rs = games.filter((g) => String(g.payload.timeClass) === top).map((g) => num(g.payload.rating)).filter((r): r is number => r !== undefined);
      let detail = parts.join(", ");
      if (rs.length > 1) detail += ` · ${top} rating ${rs[0]} → ${rs[rs.length - 1]}`;
      const ms = posts.filter((p) => p.kind === "milestone");
      if (ms.length) detail += ` · ${ms[0].title}`;
      return { headline: `played ${plural(games.length || n, "game")}`, detail };
    }
    case "letterboxd": {
      const t = unique(posts.map((p) => p.title.replace(/^(Rewatched|Watched) /, "")));
      return { headline: `watched ${plural(t.length, "film")}`, detail: names(t) };
    }
    case "lastfm":
    case "spotify": {
      const t = unique(posts.map((p) => p.title));
      return { headline: `listened to ${plural(n, "track")}`, detail: names(t, 2) };
    }
    case "steam": {
      const t = unique(posts.map((p) => p.title));
      const hrs = posts.map((p) => /([\d.]+)\s*h/.exec(p.detail ?? "")?.[1]).filter(Boolean).map(Number);
      const total = hrs.reduce((a, b) => a + b, 0);
      return { headline: `played ${plural(t.length, "game")}`, detail: names(t) + (total ? ` · ${Math.round(total)}h` : "") };
    }
    case "strava":
      return { headline: `logged ${plural(n, "activity", "activities")}`, detail: names(unique(posts.map((p) => p.title))) };
    default:
      return { headline: `did ${n} things`, detail: names(unique(posts.map((p) => p.title))) };
  }
}
