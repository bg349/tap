import type { FeedItem } from "../types";

/** One Last.fm row in the feed: a track playing now or one just scrobbled. */
export function LastfmEvent({ item }: { item: FeedItem }) {
  const p = item.payload as Record<string, string | null>;
  const live = item.kind === "listening";
  const body = (
    <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-4">
      {p.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.imageUrl} alt="" width={48} height={48} loading="lazy" decoding="async" className="size-12 shrink-0 rounded-lg object-cover" />
      ) : (
        <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#d51007] text-xl text-white">♪</span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{item.title}</div>
        <div className="truncate text-sm text-[var(--muted)]">{[item.detail, p.album].filter(Boolean).join(" · ")}</div>
      </div>
      {live && (
        <span aria-label="Playing now" className="flex h-5 items-end gap-0.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-1 animate-pulse rounded-full bg-[#d51007]" style={{ height: `${10 + i * 4}px`, animationDelay: `${i * 150}ms` }} />
          ))}
        </span>
      )}
    </div>
  );
  return p.url ? (
    <a href={p.url} target="_blank" rel="noreferrer" className="block transition-opacity hover:opacity-90">
      {body}
    </a>
  ) : (
    body
  );
}
