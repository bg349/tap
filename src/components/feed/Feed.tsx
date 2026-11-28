import { currentTime } from "@/lib/feed/time";
import Link from "next/link";
import { card } from "@/components/ui";
import { loadPosts } from "@/lib/feed/queries";
import { syncFeed } from "@/lib/feed/sync";
import { loadFriendships } from "@/lib/social/queries";
import { createClient } from "@/lib/supabase/server";
import { upcoming } from "@/lib/providers/registry";
import { InviteButton } from "./InviteButton";
import { LiveNow } from "./LiveNow";
import { PostCard } from "./PostCard";

export function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading activity">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`${card} animate-pulse`}>
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full bg-[var(--surface-2)]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 rounded bg-[var(--surface-2)]" />
              <div className="h-3 w-1/3 rounded bg-[var(--surface-2)]" />
            </div>
          </div>
          <div className="mt-4 h-16 rounded-2xl bg-[var(--surface-2)]" />
        </div>
      ))}
    </div>
  );
}

/**
 * The Home feed: refreshes stale accounts, then shows who's live and the newest
 * activity from you and your friends (privacy is enforced by the database).
 * Render inside <Suspense>. Pass `userId` of the signed-in user.
 */
export async function Feed({ userId }: { userId: string }) {
  const supabase = await createClient();
  await Promise.race([syncFeed(supabase), new Promise((r) => setTimeout(r, 7000))]).catch(() => {});
  const [posts, { friends }] = await Promise.all([loadPosts(supabase, userId), loadFriendships(supabase, userId)]);
  const now = currentTime();

  if (posts.length === 0) {
    const none = friends.length === 0;
    return (
      <div className="flex flex-col gap-4">
        <div className={`${card} relative overflow-hidden text-center`}>
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-8 size-24 -translate-x-1/2">
            {[0, 1, 2].map((i) => (
              <span key={i} className="absolute inset-0 rounded-full border-2 border-[var(--brand)]" style={{ animation: `tap-ripple 3s ease-out ${i}s infinite` }} />
            ))}
          </div>
          <div className="relative mx-auto mt-8 grid size-24 place-items-center text-3xl" aria-hidden>{none ? "👋" : "🌙"}</div>
          <p className="mt-3 text-xl font-semibold tracking-tight">{none ? "It's quiet in here" : "Nothing live yet"}</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-[var(--muted)]">
            {none
              ? "Tap is better with friends. Invite someone and you'll see what they're up to the moment they do it."
              : "When you or a friend finish a game, it lands here instantly. Make sure your accounts are shared with friends."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <InviteButton className="h-11 rounded-full bg-[var(--brand)] px-5 text-sm font-semibold text-[var(--brand-ink)]" />
            <Link href="/friends" className="h-11 rounded-full border border-[var(--border)] px-5 text-sm leading-[2.6rem] font-medium">Find friends</Link>
            <Link href="/account" className="h-11 rounded-full border border-[var(--border)] px-5 text-sm leading-[2.6rem] font-medium">Link an account</Link>
          </div>
        </div>
        <div className={card}>
          <p className="text-sm font-semibold">More services coming</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">Each one adds a new kind of live activity to your feed.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {upcoming.map((p) => (
              <li key={p.id} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)]">
                <span className="size-2 rounded-full" style={{ background: p.accent }} />{p.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <LiveNow posts={posts} now={now} myId={userId} />
      {posts.map((p, i) => <PostCard key={p.id} post={p} now={now} index={i} />)}
      {friends.length === 0 && (
        <div className={`${card} flex items-center justify-between gap-3`}>
          <p className="text-sm text-[var(--muted)]">Your feed is just you. Bring a friend along.</p>
          <InviteButton className="h-10 shrink-0 rounded-full bg-[var(--brand)] px-4 text-sm font-semibold text-[var(--brand-ink)]" />
        </div>
      )}
    </div>
  );
}
