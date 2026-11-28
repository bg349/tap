/* eslint-disable @next/next/no-img-element */
import type { FeedItem } from "../types";

/** One Letterboxd row in the feed: a film watched, with poster, stars and any review. */
export function LetterboxdEvent({ item }: { item: FeedItem }) {
  const p = item.payload as { url?: string; poster?: string | null; review?: string | null };
  const body = (
    <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-3">
      {p.poster ? (
        <img src={p.poster} alt="" width={48} height={72} loading="lazy" className="h-[72px] w-12 shrink-0 rounded-lg object-cover" />
      ) : (
        <span className="grid h-[72px] w-12 shrink-0 place-items-center rounded-lg bg-[var(--border)] text-xl" aria-hidden>🎬</span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{item.title}</div>
        {item.detail && <div className="truncate text-sm text-[var(--muted)]">{item.detail}</div>}
        {p.review && <div className="mt-1 line-clamp-2 text-sm">{p.review}</div>}
      </div>
    </div>
  );
  return p.url ? (
    <a href={p.url} target="_blank" rel="noreferrer" className="block transition-opacity hover:opacity-90">{body}</a>
  ) : (
    body
  );
}
