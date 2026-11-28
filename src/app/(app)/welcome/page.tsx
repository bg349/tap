import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { PeopleYouMayKnow } from "@/components/social/PeopleYouMayKnow";
import { card } from "@/components/ui";
import { invitePreview } from "@/lib/social/discovery";
import { createClient, getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Welcome · Tap" };

export default function WelcomePage(props: PageProps<"/welcome">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 sm:py-14">
      <Logo />
      <Suspense fallback={<div className={`${card} mt-10 h-64 animate-pulse`} />}>
        <Welcome searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

const step = "grid size-9 shrink-0 place-items-center rounded-full bg-[var(--fg)] text-sm font-bold text-[var(--bg)]";

async function Welcome({ searchParams }: { searchParams: PageProps<"/welcome">["searchParams"] }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const { from } = await searchParams;
  const supabase = await createClient();
  const inviter = typeof from === "string" ? await invitePreview(supabase, from) : null;

  return (
    <>
      <h1 className="mt-10 text-4xl leading-[1.05] font-semibold tracking-tight">
        You&apos;re in.
        <span className="text-[var(--muted)]"> Two quick things.</span>
      </h1>
      {inviter && (
        <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
          You joined through <Link href={`/u/${inviter.handle}`} className="font-semibold underline-offset-4 hover:underline">{inviter.displayName}</Link>&apos;s invite, so we sent them a friend request. You&apos;ll see each other&apos;s activity once they accept.
        </p>
      )}

      <div className={`${card} mt-6 flex gap-4`}>
        <span className={step}>1</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Link your accounts</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Chess.com, Steam, Last.fm and Letterboxd. Everything starts private to you.</p>
          <Link href="/account" className="mt-3 inline-block h-10 rounded-full bg-[var(--brand)] px-5 text-sm leading-10 font-semibold text-[var(--brand-ink)]">Link accounts</Link>
        </div>
      </div>

      <div className={`${card} mt-4 flex gap-4`}>
        <span className={step}>2</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Add friends</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Find people below, search by username, or bring your own friends in.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/invite" className="h-10 rounded-full bg-[var(--brand)] px-5 text-sm leading-10 font-semibold text-[var(--brand-ink)]">Invite friends</Link>
            <Link href="/friends" className="h-10 rounded-full border border-[var(--border)] px-5 text-sm leading-10 font-medium">Search</Link>
          </div>
        </div>
      </div>

      <PeopleYouMayKnow limit={5} title="Already on Tap" />

      <Link href="/" className="mt-8 block text-center text-sm text-[var(--muted)] underline-offset-4 hover:underline">Skip for now, go to my feed</Link>
    </>
  );
}
