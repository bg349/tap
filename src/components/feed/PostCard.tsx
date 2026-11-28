import Link from "next/link";
import { timeAgo } from "@/lib/feed/time";
import type { FeedPost } from "@/lib/feed/queries";
import { getProvider } from "@/lib/providers/registry";
import { Avatar } from "./Avatar";
import { LIVE_MS, iconFor, verbFor } from "./activity";
import { LivePill } from "./LivePill";
import { ReactionBar } from "./ReactionBar";
import { Comments } from "./Comments";

/** One activity post: who, what they did, when, the provider's own rendering, and reactions. */
export function PostCard({ post, now, index = 0, isMe = false, viewerId = "" }: { post: FeedPost; now: number; index?: number; isMe?: boolean; viewerId?: string }) {
  const provider = getProvider(post.source);
  const accent = provider?.accent ?? "var(--draw)";
  const live = now - new Date(post.occurredAt).getTime() < LIVE_MS;
  return (
    <article
      className="rise relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] sm:p-5"
      style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: live ? "var(--brand)" : accent, opacity: live ? 1 : 0.55 }} />
      <header className="flex items-center gap-3">
        <Link href={`/u/${post.author.handle}`} aria-label={post.author.displayName}>
          <Avatar name={post.author.displayName} />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[15px]">
            <Link href={`/u/${post.author.handle}`} className="font-semibold hover:underline">
              {isMe ? "You" : post.author.displayName}
            </Link>{" "}
            <span className="text-[var(--muted)]">{isMe ? verbFor(post.source, post.kind).replace(/^is /, "are ") : verbFor(post.source, post.kind)}</span>
          </p>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <span
              className="grid size-4 place-items-center rounded-full text-[9px] leading-none text-white"
              style={{ background: accent }}
              aria-hidden
            >
              {iconFor(post.source)}
            </span>
            {provider?.name ?? post.source} · {timeAgo(post.occurredAt, now)}
          </div>
        </div>
        {live && <LivePill />}
      </header>
      <div className="mt-3">
        {provider ? (
          provider.renderEvent(post)
        ) : (
          <div className="rounded-2xl bg-[var(--surface-2)] p-4 font-semibold">{post.title}</div>
        )}
      </div>
      <div className="mt-3">
        <ReactionBar itemId={post.id} reactions={post.reactions} />
      </div>
      <Comments itemId={post.id} ownerId={post.author.id} viewerId={viewerId} initialCount={post.commentCount} />
    </article>
  );
}
