import type { ProviderResult } from "../types";

/**
 * Letterboxd public RSS feed (https://letterboxd.com/<user>/rss/). No key, no
 * login, no approval. LETTERBOXD_BASE can point at a mock for local testing.
 */
const BASE = process.env.LETTERBOXD_BASE ?? "https://letterboxd.com";

export class NotFoundError extends Error {}

export interface Film {
  /** Letterboxd's own id for this diary entry, stable across fetches. */
  id: string;
  title: string;
  year: number | null;
  /** 0.5 to 5, or null when watched without a rating. */
  rating: number | null;
  rewatch: boolean;
  url: string;
  poster: string | null;
  review: string | null;
  /** ISO timestamp. */
  watchedAt: string;
}

export interface LetterboxdData {
  films: Film[];
}

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");

const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  if (!m) return null;
  return decode(m[1].replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1").trim());
};

/** Pure: RSS text -> films (diary entries and reviews only, newest first). */
export function parseFeed(xml: string): Film[] {
  const films: Film[] = [];
  for (const item of xml.split("<item>").slice(1)) {
    const guid = tag(item, "guid") ?? "";
    if (!/^letterboxd-(watch|review)-/.test(guid)) continue;
    const title = tag(item, "letterboxd:filmTitle");
    const link = tag(item, "link");
    if (!title || !link) continue;
    const desc = tag(item, "description") ?? "";
    const text = decode(desc.replace(/<img[^>]*>/g, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    const rating = tag(item, "letterboxd:memberRating");
    const watched = tag(item, "letterboxd:watchedDate");
    const pub = tag(item, "pubDate");
    const when = new Date(pub ?? (watched ? `${watched}T12:00:00Z` : NaN));
    if (Number.isNaN(when.getTime())) continue;
    films.push({
      id: guid,
      title,
      year: Number(tag(item, "letterboxd:filmYear")) || null,
      rating: rating ? Number(rating) : null,
      rewatch: tag(item, "letterboxd:rewatch") === "Yes",
      url: link,
      poster: desc.match(/<img src="([^"]+)"/)?.[1] ?? null,
      review: text && !/^Watched on /i.test(text) ? text.slice(0, 280) : null,
      watchedAt: when.toISOString(),
    });
  }
  return films.sort((a, b) => b.watchedAt.localeCompare(a.watchedAt));
}

export async function fetchFilms(username: string): Promise<Film[]> {
  const res = await fetch(`${BASE}/${encodeURIComponent(username)}/rss/`, {
    headers: { "User-Agent": "Tap/0.1 (profile aggregator)", Accept: "application/rss+xml" },
    next: { revalidate: 300 },
  });
  if (res.status === 404) throw new NotFoundError(username);
  if (!res.ok) throw new Error(`Letterboxd ${res.status}`);
  return parseFeed(await res.text());
}

export async function fetchLetterboxdAccount(username: string): Promise<ProviderResult<LetterboxdData>> {
  try {
    const films = await fetchFilms(username);
    return {
      ok: true,
      identity: { username, displayName: username, profileUrl: `https://letterboxd.com/${username}/` },
      highlights: [{ label: "Recent films", value: String(films.length) }],
      data: { films },
    };
  } catch (err) {
    if (err instanceof NotFoundError) return { ok: false, error: "not_found", message: `No Letterboxd user "${username}".` };
    return { ok: false, error: "upstream_error", message: "Letterboxd isn't answering right now. Try again in a bit." };
  }
}
