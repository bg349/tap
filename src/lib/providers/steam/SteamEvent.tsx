import type { FeedItem } from "../types";

/** One Steam row in the feed: a game being played now, or recent playtime. */
export function SteamEvent({ item }: { item: FeedItem }) {
  const image = typeof item.payload.image === "string" ? item.payload.image : null;
  const url = typeof item.payload.url === "string" ? item.payload.url : undefined;
  const body = (
    <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-3">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" loading="lazy" className="size-12 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#1b2838] text-2xl" aria-hidden>🎮</span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{item.title}</div>
        {item.detail && <div className="truncate text-sm text-[var(--muted)]">{item.detail}</div>}
      </div>
    </div>
  );
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="block transition-opacity hover:opacity-90">{body}</a>
  ) : body;
}
