import { currentTime } from "@/lib/feed/time";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/feed/Avatar";
import { FriendButton } from "@/components/feed/FriendButton";
import { PostCard } from "@/components/feed/PostCard";
import { PostGroup } from "@/components/feed/PostGroup";
import { groupPosts } from "@/lib/feed/group";
import { Logo } from "@/components/Logo";
import { card } from "@/components/ui";
import { loadPosts } from "@/lib/feed/queries";
import { relationTo } from "@/lib/social/queries";
import { createClient, getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile · Tap" };

export default function ProfilePage(props: PageProps<"/u/[handle]">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 sm:py-14">
      <header className="flex items-center justify-between">
        <Logo />
        <Link href="/friends" className="text-sm font-medium underline-offset-4 hover:underline">Friends</Link>
      </header>
      <Suspense fallback={<div className={`${card} mt-10 h-40 animate-pulse`} />}>
        <Profile params={props.params} />
      </Suspense>
    </main>
  );
}

async function Profile({ params }: { params: PageProps<"/u/[handle]">["params"] }) {
  const { handle } = await params;
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("profiles").select("id,handle,display_name,bio,avatar_url").eq("handle", handle.toLowerCase()).maybeSingle();
  if (!p) notFound();

  const [relation, posts] = await Promise.all([
    relationTo(supabase, user.id, p.id),
    loadPosts(supabase, user.id, { userId: p.id, limit: 20 }),
  ]);
  const now = currentTime();

  return (
    <>
      <section className="mt-10 flex items-center gap-4">
        <Avatar name={p.display_name} src={p.avatar_url} size={72} />
        <div className="min-w-0 flex-1 leading-tight">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{p.display_name}</h1>
          <div className="text-[var(--muted)]">@{p.handle}</div>
        </div>
        {relation.state === "self" ? (
          <Link href="/profile" className="h-10 rounded-full border border-[var(--border)] px-4 text-sm leading-10 font-medium">Edit</Link>
        ) : (
          <FriendButton relation={relation} userId={p.id} />
        )}
      </section>
      {p.bio && <p className="mt-4">{p.bio}</p>}

      <h2 className="mt-8 text-sm font-medium text-[var(--muted)]">Recent activity</h2>
      {posts.length === 0 ? (
        <div className={`${card} mt-3 text-center`}>
          <div className="text-3xl" aria-hidden>{relation.state === "friends" || relation.state === "self" ? "🌙" : "🔒"}</div>
          <p className="mt-2 font-semibold">
            {relation.state === "friends" || relation.state === "self" ? "Nothing to show yet" : "Activity is for friends"}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {relation.state === "friends" || relation.state === "self"
              ? "New games and milestones appear here once an account is linked and shared with friends."
              : "Become friends to see what they're up to."}
          </p>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          {groupPosts(posts).map((e, i) =>
            e.type === "group" ? (
              <PostGroup key={e.key} posts={e.posts} now={now} index={i} isMe={e.posts[0].author.id === user.id} />
            ) : (
              <PostCard key={e.post.id} post={e.post} now={now} index={i} isMe={e.post.author.id === user.id} viewerId={user.id} />
            ),
          )}
        </div>
      )}
    </>
  );
}
