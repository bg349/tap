import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/feed/Avatar";
import { FriendButton } from "@/components/feed/FriendButton";
import { Logo } from "@/components/Logo";
import { card, input } from "@/components/ui";
import { PeopleYouMayKnow } from "@/components/social/PeopleYouMayKnow";
import { acceptFriendRequest, removeFriendship } from "@/lib/social/actions";
import { loadFriendships, searchPeople, type Person, type Relation } from "@/lib/social/queries";
import { createClient, getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Friends · Tap" };

export default function FriendsPage(props: PageProps<"/friends">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 sm:py-14">
      <header className="flex items-center justify-between">
        <Logo />
        <Link href="/account" className="text-sm font-medium underline-offset-4 hover:underline">Your account</Link>
      </header>
      <h1 className="mt-10 text-3xl font-semibold tracking-tight">Friends</h1>
      <Suspense fallback={<div className={`${card} mt-6 h-40 animate-pulse`} />}>
        <Friends searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

function PersonRow({ person, children }: { person: Person; children?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Link href={`/u/${person.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={person.displayName} src={person.avatarUrl} />
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-semibold">{person.displayName}</span>
          <span className="block truncate text-sm text-[var(--muted)]">@{person.handle}</span>
        </span>
      </Link>
      {children}
    </li>
  );
}

const sectionTitle = "mt-8 text-sm font-medium text-[var(--muted)]";

async function Friends({ searchParams }: { searchParams: PageProps<"/friends">["searchParams"] }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const { q: rawQ } = await searchParams;
  const q = typeof rawQ === "string" ? rawQ : "";

  const supabase = await createClient();
  const [{ friends, incoming, outgoing }, results] = await Promise.all([
    loadFriendships(supabase, user.id),
    searchPeople(supabase, user.id, q),
  ]);

  const relationOf = (id: string): Relation => {
    const f = friends.find((x) => x.person.id === id);
    if (f) return { state: "friends", friendshipId: f.friendshipId };
    const i = incoming.find((x) => x.person.id === id);
    if (i) return { state: "received", friendshipId: i.friendshipId };
    const o = outgoing.find((x) => x.person.id === id);
    if (o) return { state: "sent", friendshipId: o.friendshipId };
    return { state: "none" };
  };

  return (
    <>
      <form action="/friends" className="mt-6 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          type="search"
          autoComplete="off"
          autoCapitalize="none"
          placeholder="Find people by username or name"
          className={`${input} flex-1`}
        />
        <button className="h-12 rounded-xl bg-[var(--brand)] px-5 font-semibold text-[var(--brand-ink)]">Search</button>
      </form>

      <Link href="/invite" className="mt-3 inline-block text-sm font-medium underline-offset-4 hover:underline">
        Invite friends with a link or QR code
      </Link>

      {q.trim().length >= 2 && (
        <section>
          <h2 className={sectionTitle}>Results</h2>
          {results.length === 0 ? (
            <p className="mt-3 text-[var(--muted)]">No one found for “{q}”. Check the spelling, or invite them to join Tap.</p>
          ) : (
            <ul className="mt-1 divide-y divide-[var(--border)]">
              {results.map((p) => (
                <PersonRow key={p.id} person={p}>
                  <FriendButton relation={relationOf(p.id)} userId={p.id} />
                </PersonRow>
              ))}
            </ul>
          )}
        </section>
      )}

      {incoming.length > 0 && (
        <section>
          <h2 className={sectionTitle}>Requests · {incoming.length}</h2>
          <ul className="mt-1 divide-y divide-[var(--border)]">
            {incoming.map(({ friendshipId, person }) => (
              <PersonRow key={friendshipId} person={person}>
                <form action={acceptFriendRequest.bind(null, friendshipId)}>
                  <button className="h-10 rounded-full bg-[var(--brand)] px-4 text-sm font-semibold text-[var(--brand-ink)]">Accept</button>
                </form>
                <form action={removeFriendship.bind(null, friendshipId)}>
                  <button className="h-10 rounded-full border border-[var(--border)] px-4 text-sm text-[var(--muted)]">Decline</button>
                </form>
              </PersonRow>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className={sectionTitle}>Your friends · {friends.length}</h2>
        {friends.length === 0 ? (
          <div className={`${card} mt-3 text-center`}>
            <div className="text-3xl" aria-hidden>👋</div>
            <p className="mt-2 font-semibold">No friends yet</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Search for a friend&apos;s username above to send a request. Once they accept, you&apos;ll see each other&apos;s activity.</p>
          </div>
        ) : (
          <ul className="mt-1 divide-y divide-[var(--border)]">
            {friends.map(({ friendshipId, person }) => (
              <PersonRow key={friendshipId} person={person} />
            ))}
          </ul>
        )}
      </section>

      <Suspense fallback={null}>
        <PeopleYouMayKnow />
      </Suspense>

      {outgoing.length > 0 && (
        <section>
          <h2 className={sectionTitle}>Sent requests</h2>
          <ul className="mt-1 divide-y divide-[var(--border)]">
            {outgoing.map(({ friendshipId, person }) => (
              <PersonRow key={friendshipId} person={person}>
                <form action={removeFriendship.bind(null, friendshipId)}>
                  <button className="h-10 rounded-full border border-[var(--border)] px-4 text-sm text-[var(--muted)]">Cancel</button>
                </form>
              </PersonRow>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
