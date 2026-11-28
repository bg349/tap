import "server-only";

const API = "https://api.steampowered.com";
const key = () => process.env.STEAM_API_KEY ?? "";

export class SteamConfigError extends Error {}

export interface SteamGame {
  appid: number;
  name: string;
  playtime_2weeks?: number;
  playtime_forever: number;
  img_icon_url?: string;
}

export interface SteamPlayer {
  steamid: string;
  personaname: string;
  profileurl: string;
  avatarfull?: string;
  /** 3 = public. Anything else hides game data. */
  communityvisibilitystate: number;
  gameextrainfo?: string;
  gameid?: string;
  timecreated?: number;
  loccountrycode?: string;
}

export interface SteamData {
  player: SteamPlayer;
  /** null when the profile's game details are private. */
  games: SteamGame[] | null;
}

async function call<T>(path: string, params: Record<string, string>): Promise<T> {
  if (!key()) throw new SteamConfigError("Steam isn't set up yet.");
  const res = await fetch(`${API}/${path}?${new URLSearchParams({ key: key(), ...params })}`, {
    next: { revalidate: 120 },
  });
  if (!res.ok) throw new Error(`Steam returned ${res.status}`);
  return (await res.json()) as T;
}

/** Accepts a profile URL, a 17-digit SteamID, or a vanity name; returns a SteamID64 or null. */
export async function resolveSteamId(input: string): Promise<string | null> {
  const raw = input.trim();
  const direct = raw.match(/(?:profiles\/)?\b(7656\d{13})\b/)?.[1];
  if (direct) return direct;
  const vanity = (raw.match(/steamcommunity\.com\/id\/([^/?#]+)/i)?.[1] ?? raw).replace(/^@/, "");
  if (!/^[A-Za-z0-9_-]{2,32}$/.test(vanity)) return null;
  const { response } = await call<{ response: { success: number; steamid?: string } }>(
    "ISteamUser/ResolveVanityURL/v1/",
    { vanityurl: vanity },
  );
  return response.success === 1 ? (response.steamid ?? null) : null;
}

export async function fetchPlayer(steamId: string): Promise<SteamPlayer | null> {
  const { response } = await call<{ response: { players: SteamPlayer[] } }>(
    "ISteamUser/GetPlayerSummaries/v2/",
    { steamids: steamId },
  );
  return response.players[0] ?? null;
}

export async function fetchRecentGames(steamId: string): Promise<SteamGame[] | null> {
  const { response } = await call<{ response: { games?: SteamGame[] } }>(
    "IPlayerService/GetRecentlyPlayedGames/v1/",
    { steamid: steamId, count: "5" },
  );
  // Absent `games` means private game details (or nothing played); an empty list means public + idle.
  return response.games ?? null;
}

export const gameIcon = (g: SteamGame) =>
  g.img_icon_url ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg` : null;

export function hours(min: number) {
  const h = min / 60;
  return `${h < 10 ? h.toFixed(1).replace(/\.0$/, "") : Math.round(h)} hr${h === 1 ? "" : "s"}`;
}
