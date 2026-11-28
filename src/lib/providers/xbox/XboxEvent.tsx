import type { FeedItem } from "../types";

/** One Xbox row in the feed: a game being played now, or one played recently. */
export function XboxEvent({ item }: { item: FeedItem }) {
  const image = typeof item.payload.image === "string" ? item.payload.image : null;
  const live = item.kind === "playing";
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-3">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" loading="lazy" className="size-12 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#107c10] text-2xl text-white" aria-hidden>🎮</span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{item.title}</div>
        {item.detail && <div className="truncate text-sm text-[var(--muted)]">{item.detail}</div>}
      </div>
      {live && <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-[#107c10]" aria-label="Playing now" />}
    </div>
  );
}
