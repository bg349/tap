import type { FeedItem } from "@/lib/home/data";
import { Avatar } from "./Avatar";
import { ReactButton } from "./ReactButton";

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function FeedCard({ item }: { item: FeedItem }) {
  return (
    <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
      <div className="flex items-center gap-3">
        <Avatar name={item.friend.name} src={item.friend.avatarUrl} className="size-10" />
        <div className="min-w-0 flex-1 text-[15px] leading-snug">
          <span className="font-semibold">{item.friend.name}</span> {item.text}
        </div>
        <time dateTime={item.at} className="shrink-0 text-xs text-[var(--muted)]">
          {timeAgo(item.at)}
        </time>
      </div>
      <div className="mt-3 flex justify-end border-t border-[var(--border)] pt-2">
        <ReactButton initialCount={item.reactions} initialReacted={item.reacted} />
      </div>
    </article>
  );
}
