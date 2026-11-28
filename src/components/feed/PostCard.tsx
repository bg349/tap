import Link from "next/link";
import { timeAgo } from "@/lib/feed/time";
import type { FeedPost } from "@/lib/feed/queries";
import { getProvider } from "@/lib/providers/registry";
import { Avatar } from "./Avatar";
import { ReactionBar } from "./ReactionBar";

/** One activity post: who, when, the provider's own rendering, and reactions. */
export function PostCard({ post, now }: { post: FeedPost; now: number }) {
  const provider = getProvider(post.source);
  return (
    <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] sm:p-5">
      <header className="flex items-center gap-3">
        <Link href={`/u/${post.author.handle}`} aria-label={post.author.displayName}>
          <Avatar name={post.author.displayName} />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <Link href={`/u/${post.author.handle}`} className="block truncate font-semibold hover:underline">
            {post.author.displayName}
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <span className="inline-block size-2 rounded-full" style={{ background: provider?.accent ?? "var(--draw)" }} />
            {provider?.name ?? post.source} · {timeAgo(post.occurredAt, now)}
          </div>
        </div>
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
    </article>
  );
}
