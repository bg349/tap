import Link from "next/link";
import { getFeed, getFriends } from "@/lib/home/data";
import { getUser } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { FeedCard } from "./FeedCard";
import { FriendsRow } from "./FriendsRow";

/** Logged-in homepage. Returns null when signed out so the caller can show the landing page. */
export async function HomeFeed() {
  const user = await getUser();
  if (!user) return null;
  const [friends, feed] = await Promise.all([getFriends(user.id), getFeed(user.id)]);
  const name =
    (typeof user.user_metadata?.chesscom === "string" && user.user_metadata.chesscom) ||
    user.email?.split("@")[0] ||
    "You";

  return (
    <AppShell>
      <FriendsRow me={{ name }} friends={friends} />
      <div className="mt-5 flex flex-col gap-4">
        {feed.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--border)] px-6 py-14 text-center">
            <div className="text-lg font-semibold">It&apos;s quiet in here.</div>
            <p className="mx-auto mt-2 max-w-xs text-sm text-[var(--muted)]">
              When your friends play, listen or work out, it shows up here. Link your accounts so they can see you too.
            </p>
            <Link
              href="/account"
              className="mt-5 inline-flex h-11 items-center rounded-full bg-[var(--brand)] px-6 font-medium text-[var(--brand-ink)] transition-opacity hover:opacity-90"
            >
              Link an account
            </Link>
          </div>
        ) : (
          feed.map((item) => <FeedCard key={item.id} item={item} />)
        )}
      </div>
    </AppShell>
  );
}
