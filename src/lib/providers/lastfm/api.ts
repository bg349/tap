import { cacheLife } from "next/cache";
import type { FeedEvent, ProviderResult } from "../types";

/**
 * Last.fm public API (no OAuth). Needs a free API key in LASTFM_API_KEY.
 * Docs: https://www.last.fm/api/show/user.getRecentTracks
 * Last.fm collects plays from Spotify, Apple Music and most other players.
 */
const API_BASE = process.env.LASTFM_API_BASE ?? "https://ws.audioscrobbler.com/2.0/";
const USER_AGENT = "Tap/0.1 (profile aggregator; https://github.com/bg349/tap)";

export const lastfmConfigured = () => Boolean(process.env.LASTFM_API_KEY);

class NotFoundError extends Error {}

interface RawImage { size: string; "#text": string }
interface RawTrack {
  name: string;
  url: string;
  artist: { "#text": string; name?: string };
  album?: { "#text": string };
  image?: RawImage[];
  date?: { uts: string };
  "@attr"?: { nowplaying?: string };
}
interface RawUser {
  name: string;
  realname?: string;
  url: string;
  image?: RawImage[];
  playcount?: string;
  country?: string;
  registered?: { unixtime: string };
}

export interface LastfmTrack {
  title: string;
  artist: string;
  album?: string;
  url: string;
  imageUrl?: string;
  /** Unix seconds; undefined while the track is playing right now. */
  playedAt?: number;
  nowPlaying: boolean;
}

export interface LastfmData {
  playcount: number;
  tracks: LastfmTrack[];
}

async function call<T>(method: string, params: Record<string, string>): Promise<T> {
  const key = process.env.LASTFM_API_KEY;
  if (!key) throw new Error("LASTFM_API_KEY is not set");
  const qs = new URLSearchParams({ method, api_key: key, format: "json", ...params });
  const res = await fetch(`${API_BASE}?${qs}`, {
    signal: AbortSignal.timeout(6000),
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  const body = (await res.json().catch(() => null)) as (T & { error?: number; message?: string }) | null;
  if (body?.error === 6) throw new NotFoundError(params.user);
  if (!res.ok || !body || body.error) throw new Error(`last.fm ${res.status} ${body?.message ?? ""}`);
  return body;
}

const imageOf = (images?: RawImage[]) => {
  const url = images?.find((i) => i.size === "large")?.["#text"] || images?.at(-1)?.["#text"];
  // Last.fm serves a grey "no art" star for missing covers; treat as none.
  return url && !url.includes("2a96cbd8b46e442fc41c2b86b821562f") ? url : undefined;
};

function toTrack(t: RawTrack): LastfmTrack {
  const nowPlaying = t["@attr"]?.nowplaying === "true";
  return {
    title: t.name,
    artist: t.artist["#text"] ?? t.artist.name ?? "",
    album: t.album?.["#text"] || undefined,
    url: t.url,
    imageUrl: imageOf(t.image),
    playedAt: nowPlaying || !t.date ? undefined : Number(t.date.uts),
    nowPlaying,
  };
}

async function recentTracks(username: string, limit: number): Promise<LastfmTrack[]> {
  const res = await call<{ recenttracks?: { track?: RawTrack | RawTrack[] } }>("user.getrecenttracks", {
    user: username,
    limit: String(limit),
  });
  const raw = res.recenttracks?.track ?? [];
  return (Array.isArray(raw) ? raw : [raw]).map(toTrack);
}

export async function fetchLastfmAccount(username: string): Promise<ProviderResult<LastfmData>> {
  "use cache";
  if (!lastfmConfigured()) {
    cacheLife("seconds");
    return { ok: false, error: "upstream_error", message: "Last.fm isn't switched on yet." };
  }
  try {
    const [info, tracks] = await Promise.all([
      call<{ user: RawUser }>("user.getinfo", { user: username }).then((r) => r.user),
      recentTracks(username, 10),
    ]);
    const playcount = Number(info.playcount ?? 0);
    cacheLife("minutes");
    return {
      ok: true,
      identity: {
        username: info.name,
        displayName: info.realname?.trim() || info.name,
        avatarUrl: imageOf(info.image),
        profileUrl: info.url,
        joinedAt: info.registered ? Number(info.registered.unixtime) : undefined,
      },
      highlights: [{ label: "scrobbles", value: playcount.toLocaleString("en-US") }],
      data: { playcount, tracks },
    };
  } catch (err) {
    cacheLife("seconds");
    if (err instanceof NotFoundError) {
      return { ok: false, error: "not_found", message: `No Last.fm user named “${username}”.` };
    }
    console.error("[lastfm]", err);
    return { ok: false, error: "upstream_error", message: "Last.fm didn't respond. Try again in a minute." };
  }
}

/** Only look back this far, and cap rows, so a new link doesn't flood the feed. */
const WINDOW_HOURS = 24;
const MAX_TRACKS = 15;
const NOW_BUCKET_S = 15 * 60;

/** Pure: now-playing + recent scrobbles -> feed events. */
export function eventsFromTracks(tracks: LastfmTrack[], now = Date.now() / 1000): FeedEvent[] {
  const cutoff = now - WINDOW_HOURS * 3600;
  const events: FeedEvent[] = [];
  for (const t of tracks) {
    const payload = {
      url: t.url,
      artist: t.artist,
      album: t.album ?? null,
      imageUrl: t.imageUrl ?? null,
      track: t.title,
    };
    if (t.nowPlaying) {
      events.push({
        // One row per track per 15 minutes while it's on, so a long listen isn't re-posted every sync.
        externalId: `np:${t.url}:${Math.floor(now / NOW_BUCKET_S)}`,
        kind: "listening",
        title: t.title,
        detail: t.artist,
        payload,
        occurredAt: new Date(now * 1000).toISOString(),
      });
    } else if (t.playedAt && t.playedAt >= cutoff) {
      events.push({
        externalId: `scrobble:${t.playedAt}:${t.url}`,
        kind: "track",
        title: t.title,
        detail: t.artist,
        payload,
        occurredAt: new Date(t.playedAt * 1000).toISOString(),
      });
    }
  }
  return events.slice(0, MAX_TRACKS);
}

/** Throws if Last.fm is unreachable so the sync retries; [] when unconfigured or no such user. */
export async function fetchLastfmEvents(username: string): Promise<FeedEvent[]> {
  if (!lastfmConfigured()) return [];
  try {
    return eventsFromTracks(await recentTracks(username, MAX_TRACKS));
  } catch (err) {
    if (err instanceof NotFoundError) return [];
    throw err;
  }
}

/** For the link form: does this Last.fm user exist? null = couldn't check (don't block saving). */
export async function lastfmUserExists(username: string): Promise<boolean | null> {
  if (!lastfmConfigured()) return null;
  try {
    await call("user.getinfo", { user: username });
    return true;
  } catch (err) {
    return err instanceof NotFoundError ? false : null;
  }
}
