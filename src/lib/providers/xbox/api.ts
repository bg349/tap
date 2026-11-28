import "server-only";

/**
 * Xbox via OpenXBL (https://xbl.io), which has a free tier with no approval:
 * sign in with Microsoft at xbl.io, copy the key, set XBL_API_KEY. Without the
 * key the Xbox card stays hidden and nothing here is called.
 * XBL_API_BASE can point at a mock for local testing.
 */
const BASE = process.env.XBL_API_BASE ?? "https://xbl.io/api/v2";

export class XboxConfigError extends Error {}
export class XboxNotFoundError extends Error {}

export interface XboxTitle {
  name: string;
  titleId: string;
  image: string | null;
  lastPlayed: string | null;
}

export interface XboxData {
  xuid: string;
  gamertag: string;
  avatar: string | null;
  gamerscore: number | null;
  /** What they are playing right now, if online. */
  nowPlaying: string | null;
  recent: XboxTitle[];
}

export const xboxEnabled = () => Boolean(process.env.XBL_API_KEY);

async function call<T>(path: string): Promise<T | null> {
  const key = process.env.XBL_API_KEY;
  if (!key) throw new XboxConfigError("Xbox isn't set up yet.");
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Authorization": key, Accept: "application/json", "Accept-Language": "en-US" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`OpenXBL returned ${res.status}`);
  return (await res.json()) as T;
}

interface Setting { id: string; value: string }
interface ProfileUser { id: string; settings?: Setting[] }
const setting = (u: ProfileUser, id: string) => u.settings?.find((s) => s.id === id)?.value ?? null;

/** Looks up a gamertag; returns its xuid and public profile text, or null if there is no such gamertag. */
export async function lookupGamertag(gamertag: string) {
  const found = await call<{ people?: { xuid: string; gamertag: string }[]; profileUsers?: ProfileUser[] }>(
    `/search/${encodeURIComponent(gamertag)}`,
  );
  const person = found?.people?.find((p) => p.gamertag.toLowerCase() === gamertag.toLowerCase());
  const xuid = person?.xuid ?? found?.profileUsers?.[0]?.id;
  if (!xuid) return null;
  const acct = await call<{ profileUsers?: ProfileUser[] }>(`/account/${xuid}`);
  const user = acct?.profileUsers?.[0];
  return {
    xuid,
    gamertag: (user && setting(user, "Gamertag")) ?? person?.gamertag ?? gamertag,
    bio: (user && setting(user, "Bio")) ?? "",
    avatar: (user && setting(user, "GameDisplayPicRaw")) ?? null,
    gamerscore: user ? Number(setting(user, "Gamerscore")) || null : null,
  };
}

export async function fetchNowPlaying(xuid: string): Promise<string | null> {
  const body = await call<unknown>(`/${xuid}/presence`).catch(() => null);
  const first = (Array.isArray(body) ? body[0] : body) as
    | { state?: string; devices?: { titles?: { name?: string; placement?: string; state?: string }[] }[] }
    | null;
  if (!first || first.state !== "Online") return null;
  for (const d of first.devices ?? []) {
    for (const t of d.titles ?? []) {
      if (t.name && t.placement !== "Background" && t.name.toLowerCase() !== "home") return t.name;
    }
  }
  return null;
}

export async function fetchRecentTitles(xuid: string): Promise<XboxTitle[]> {
  const body = await call<{
    titles?: { name: string; titleId: string; displayImage?: string; titleHistory?: { lastTimePlayed?: string } }[];
  }>(`/achievements/player/${xuid}`);
  return (body?.titles ?? [])
    .filter((t) => t.name)
    .map((t) => ({
      name: t.name,
      titleId: String(t.titleId),
      image: t.displayImage ?? null,
      lastPlayed: t.titleHistory?.lastTimePlayed ?? null,
    }))
    .slice(0, 6);
}
