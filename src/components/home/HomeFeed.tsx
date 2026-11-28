import { Suspense } from "react";
import { Feed, FeedSkeleton } from "@/components/feed/Feed";
import { AppShell } from "@/components/shell/AppShell";
import { currentTime } from "@/lib/feed/time";
import { loadPosts } from "@/lib/feed/queries";
import { loadFriendships } from "@/lib/social/queries";
import { createClient, getUser } from "@/lib/supabase/server";
import { FriendsRow, type Friend } from "./FriendsRow";

/** Logged-in homepage. Returns null when signed out so the caller can show the landing page. */
export async function HomeFeed() {
  const user = await getUser();
  if (!user) return null;
  const name =
    (typeof user.user_metadata?.chesscom === "string" && user.user_metadata.chesscom) ||
    user.email?.split("@")[0] ||
    "You";

  return (
    <AppShell>
      <Suspense fallback={<div className="h-24" />}>
        <Friends userId={user.id} name={name} />
      </Suspense>
      <div className="mt-5">
        <Suspense fallback={<FeedSkeleton />}>
          <Feed userId={user.id} />
        </Suspense>
      </div>
    </AppShell>
  );
}

async function Friends({ userId, name }: { userId: string; name: string }) {
  const supabase = await createClient();
  const [{ friends }, posts] = await Promise.all([loadFriendships(supabase, userId), loadPosts(supabase, userId)]);
  const now = currentTime();
  const latest = new Map<string, number>();
  for (const p of posts) {
    const t = new Date(p.occurredAt).getTime();
    if (t > (latest.get(p.author.id) ?? 0)) latest.set(p.author.id, t);
  }
  const row: Friend[] = friends.map(({ person: f }) => {
    const t = latest.get(f.id) ?? 0;
    return { id: f.id, handle: f.handle, name: f.displayName, active: now - t < 15 * 60_000, hasNew: now - t < 24 * 3600_000 };
  });
  return <FriendsRow me={{ name }} friends={row} />;
}
