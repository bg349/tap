import { currentTime } from "@/lib/feed/time";
import Link from "next/link";
import { card } from "@/components/ui";
import { loadPosts } from "@/lib/feed/queries";
import { syncFeed } from "@/lib/feed/sync";
import { loadFriendships } from "@/lib/social/queries";
import { createClient } from "@/lib/supabase/server";
import { PostCard } from "./PostCard";

/**
 * The Home feed: refreshes stale accounts, then lists newest activity from you
 * and your friends (privacy is enforced by the database). Render inside <Suspense>.
 * Pass `userId` of the signed-in user.
 */
export async function Feed({ userId }: { userId: string }) {
  const supabase = await createClient();
  await Promise.race([syncFeed(supabase), new Promise((r) => setTimeout(r, 7000))]).catch(() => {});
  const [posts, { friends }] = await Promise.all([loadPosts(supabase, userId), loadFriendships(supabase, userId)]);
  const now = currentTime();

  if (posts.length === 0) {
    return (
      <div className={`${card} text-center`}>
        <div className="text-4xl" aria-hidden>{friends.length ? "🌙" : "👋"}</div>
        <p className="mt-3 text-lg font-semibold">{friends.length ? "Quiet so far" : "Your feed is waiting"}</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-[var(--muted)]">
          {friends.length
            ? "When you or a friend finish a chess.com game, it shows up here. Make sure your account is shared with friends."
            : "Add friends and link chess.com. Their games and milestones land here, newest first."}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/friends" className="h-11 rounded-full bg-[var(--brand)] px-5 text-sm leading-[2.75rem] font-semibold text-[var(--brand-ink)]">Find friends</Link>
          <Link href="/account" className="h-11 rounded-full border border-[var(--border)] px-5 text-sm leading-[2.75rem] font-medium">Link an account</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {posts.map((p) => <PostCard key={p.id} post={p} now={now} />)}
    </div>
  );
}
