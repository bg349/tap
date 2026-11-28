import Link from "next/link";
import { timeAgo } from "@/lib/feed/time";
import { summarize } from "@/lib/feed/group";
import type { FeedPost } from "@/lib/feed/queries";
import { getProvider } from "@/lib/providers/registry";
import { Avatar } from "./Avatar";
import { LIVE_MS, iconFor } from "./activity";
import { GroupToggle } from "./GroupToggle";
import { LivePill } from "./LivePill";
import { ReactionBar } from "./ReactionBar";

/** Several same-service posts by one person, collapsed into one card that expands to the originals. */
export function PostGroup({ posts, now, index = 0, isMe = false }: { posts: FeedPost[]; now: number; index?: number; isMe?: boolean }) {
  const newest = posts[0];
  const provider = getProvider(newest.source);
  const accent = provider?.accent ?? "var(--draw)";
  const live = now - new Date(newest.occurredAt).getTime() < LIVE_MS;
  const { headline, detail } = summarize(posts);
  return (
    <article
      className="rise relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] sm:p-5"
      style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: live ? "var(--brand)" : accent, opacity: live ? 1 : 0.55 }} />
      <header className="flex items-center gap-3">
        <Link href={`/u/${newest.author.handle}`} aria-label={newest.author.displayName}>
          <Avatar name={newest.author.displayName} src={newest.author.avatarUrl} />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[15px]">
            <Link href={`/u/${newest.author.handle}`} className="font-semibold hover:underline">{isMe ? "You" : newest.author.displayName}</Link>{" "}
            <span className="text-[var(--muted)]">{headline}</span>
          </p>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <span className="grid size-4 place-items-center rounded-full text-[9px] leading-none text-white" style={{ background: accent }} aria-hidden>
              {iconFor(newest.source)}
            </span>
            {provider?.name ?? newest.source} · {timeAgo(newest.occurredAt, now)}
          </div>
        </div>
        {live && <LivePill />}
      </header>
      <p className="mt-3 rounded-2xl bg-[var(--surface-2)] p-4 text-[15px] font-semibold">{detail}</p>
      <div className="mt-3">
        <ReactionBar itemId={newest.id} reactions={newest.reactions} />
      </div>
      <GroupToggle count={posts.length}>
        {posts.map((p) => (
          <div key={p.id} className="rounded-xl border border-[var(--border)] px-3 py-2">
            <p className="mb-1 text-[11px] text-[var(--muted)]">{timeAgo(p.occurredAt, now)}</p>
            {provider ? provider.renderEvent(p) : <div className="rounded-xl bg-[var(--surface-2)] p-2 text-sm font-semibold">{p.title}</div>}
          </div>
        ))}
      </GroupToggle>
    </article>
  );
}
