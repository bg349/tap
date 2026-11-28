import type { FeedEvent, Provider } from "../types";
import { fetchPlayer, fetchRecentGames, gameIcon, hours, type SteamData } from "./api";
import { SteamEvent } from "./SteamEvent";

export const steam: Provider<SteamData> = {
  id: "steam",
  name: "Steam",
  accent: "#66c0f4",
  accountLabel: "Steam profile URL or name",
  accountPlaceholder: "steamcommunity.com/id/yourname",
  // Vanity names need an API call, so they're resolved to a SteamID in the link action (see steam-actions.ts).
  normalizeAccount: (input) => input.match(/\b(7656\d{13})\b/)?.[1] ?? input.trim(),
  validateAccount(input) {
    return /^7656\d{13}$/.test(this.normalizeAccount(input)) ? null : "That doesn't look like a Steam ID.";
  },

  async fetchAccount(id) {
    const player = await fetchPlayer(id);
    if (!player) return { ok: false, error: "not_found", message: "No Steam account with that ID." };
    const games = player.communityvisibilitystate === 3 ? await fetchRecentGames(id) : null;
    return {
      ok: true,
      identity: {
        username: player.personaname,
        displayName: player.personaname,
        avatarUrl: player.avatarfull,
        profileUrl: player.profileurl,
        countryCode: player.loccountrycode,
        joinedAt: player.timecreated,
      },
      highlights: games?.[0] ? [{ label: "Recently played", value: games[0].name }] : [],
      data: { player, games },
    };
  },

  async fetchEvents(id): Promise<FeedEvent[]> {
    const player = await fetchPlayer(id);
    if (!player || player.communityvisibilitystate !== 3) return [];
    const now = new Date().toISOString();
    const events: FeedEvent[] = [];
    if (player.gameextrainfo && player.gameid) {
      events.push({
        externalId: `playing:${player.gameid}:${now.slice(0, 13)}`, // at most one per game per hour
        kind: "playing",
        title: player.gameextrainfo,
        detail: "Playing now on Steam",
        payload: { url: `https://store.steampowered.com/app/${player.gameid}` },
        occurredAt: now,
      });
    }
    for (const g of (await fetchRecentGames(id)) ?? []) {
      if (!g.playtime_2weeks) continue;
      events.push({
        // Changes whenever total playtime grows, so each new stretch of play shows up once.
        externalId: `${g.appid}:${g.playtime_forever}`,
        kind: "played",
        title: g.name,
        detail: `${hours(g.playtime_2weeks)} in the last 2 weeks · ${hours(g.playtime_forever)} total`,
        payload: { url: `https://store.steampowered.com/app/${g.appid}`, image: gameIcon(g) },
        occurredAt: now,
      });
    }
    return events;
  },

  renderEvent: (item) => <SteamEvent item={item} />,

  renderSection: (data) => (
    <ul className="grid gap-2">
      {(data.games ?? []).map((g) => (
        <li key={g.appid} className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-4 py-3 text-sm">
          <span className="truncate font-medium">{g.name}</span>
          <span className="ml-3 shrink-0 text-[var(--muted)]">{hours(g.playtime_2weeks ?? 0)} / 2 wks</span>
        </li>
      ))}
      {!data.games?.length && (
        <li className="text-sm text-[var(--muted)]">
          {data.player.communityvisibilitystate === 3 ? "No games played lately." : "This Steam profile is private."}
        </li>
      )}
    </ul>
  ),
};
