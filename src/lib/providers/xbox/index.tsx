import type { FeedEvent, Provider } from "../types";
import { fetchNowPlaying, fetchRecentTitles, lookupGamertag, type XboxData } from "./api";
import { XboxEvent } from "./XboxEvent";

const RECENT_DAYS = 14;

export const xbox: Provider<XboxData> = {
  id: "xbox",
  name: "Xbox",
  accent: "#107c10",
  accountLabel: "Xbox gamertag",
  accountPlaceholder: "e.g. Major Nelson",
  normalizeAccount(input) {
    const fromUrl = input.match(/xbox\.com\/[a-z-]+\/play\/user\/([^/?#]+)/i)?.[1];
    return decodeURIComponent(fromUrl ?? input).trim().replace(/^@/, "").replace(/\s+/g, " ");
  },
  validateAccount(input) {
    const g = this.normalizeAccount(input);
    if (!g) return "Enter a gamertag.";
    if (!/^[A-Za-z0-9][A-Za-z0-9 ]{0,14}$/.test(g)) return "That doesn't look like an Xbox gamertag.";
    return null;
  },

  async fetchAccount(gamertag) {
    try {
      const who = await lookupGamertag(gamertag);
      if (!who) return { ok: false, error: "not_found", message: "No Xbox account with that gamertag." };
      const [nowPlaying, recent] = await Promise.all([fetchNowPlaying(who.xuid), fetchRecentTitles(who.xuid)]);
      return {
        ok: true,
        identity: {
          username: who.gamertag,
          displayName: who.gamertag,
          avatarUrl: who.avatar ?? undefined,
          profileUrl: `https://www.xbox.com/play/user/${encodeURIComponent(who.gamertag)}`,
        },
        highlights: nowPlaying
          ? [{ label: "Playing now", value: nowPlaying }]
          : recent[0] ? [{ label: "Recently played", value: recent[0].name }] : [],
        data: { xuid: who.xuid, gamertag: who.gamertag, avatar: who.avatar, gamerscore: who.gamerscore, nowPlaying, recent },
      };
    } catch {
      return { ok: false, error: "upstream_error", message: "Xbox couldn't be reached right now." };
    }
  },

  async fetchEvents(gamertag): Promise<FeedEvent[]> {
    const who = await lookupGamertag(gamertag);
    if (!who) return [];
    const now = new Date();
    const events: FeedEvent[] = [];
    const nowPlaying = await fetchNowPlaying(who.xuid);
    if (nowPlaying) {
      events.push({
        externalId: `playing:${nowPlaying}:${now.toISOString().slice(0, 13)}`, // at most one per game per hour
        kind: "playing",
        title: nowPlaying,
        detail: "Playing now on Xbox",
        payload: {},
        occurredAt: now.toISOString(),
      });
    }
    const cutoff = now.getTime() - RECENT_DAYS * 86_400_000;
    for (const t of await fetchRecentTitles(who.xuid)) {
      const when = t.lastPlayed ? Date.parse(t.lastPlayed) : NaN;
      if (!Number.isFinite(when) || when < cutoff) continue;
      events.push({
        externalId: `title:${t.titleId}:${new Date(when).toISOString().slice(0, 13)}`,
        kind: "played",
        title: t.name,
        detail: "Played on Xbox",
        payload: { image: t.image },
        occurredAt: new Date(when).toISOString(),
      });
    }
    return events;
  },

  renderEvent: (item) => <XboxEvent item={item} />,

  renderSection: (data) => (
    <ul className="grid gap-2">
      {data.nowPlaying && (
        <li className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-sm">
          <span className="text-[var(--muted)]">Playing now · </span>
          <span className="font-medium">{data.nowPlaying}</span>
        </li>
      )}
      {data.recent.map((t) => (
        <li key={t.titleId} className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-4 py-3 text-sm">
          <span className="truncate font-medium">{t.name}</span>
        </li>
      ))}
      {!data.nowPlaying && !data.recent.length && (
        <li className="text-sm text-[var(--muted)]">No games played lately, or this profile is private.</li>
      )}
    </ul>
  ),
};
