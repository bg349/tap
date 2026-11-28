import type { FeedEvent } from "../types";
import { NotFoundError, fetchFilms, type Film } from "./api";

const WINDOW_DAYS = 14;
const MAX_EVENTS = 20;

export const stars = (r: number) => "★".repeat(Math.floor(r)) + (r % 1 ? "½" : "");

export function eventsFromFilms(films: Film[], now = Date.now()): FeedEvent[] {
  const cutoff = now - WINDOW_DAYS * 86400_000;
  return films
    .filter((f) => new Date(f.watchedAt).getTime() >= cutoff)
    .slice(0, MAX_EVENTS)
    .map((f) => ({
      externalId: f.id,
      kind: f.review ? "review" : "watched",
      title: `${f.rewatch ? "Rewatched" : "Watched"} ${f.title}`,
      detail: [f.year, f.rating ? stars(f.rating) : null].filter(Boolean).join(" · ") || undefined,
      payload: { url: f.url, poster: f.poster, rating: f.rating, year: f.year, review: f.review },
      occurredAt: f.watchedAt,
    }));
}

/** Throws if Letterboxd is unreachable, so the sync is retried later. */
export async function fetchLetterboxdEvents(username: string): Promise<FeedEvent[]> {
  try {
    return eventsFromFilms(await fetchFilms(username));
  } catch (err) {
    if (err instanceof NotFoundError) return [];
    throw err;
  }
}
