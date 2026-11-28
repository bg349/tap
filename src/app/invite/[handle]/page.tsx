import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/home/Avatar";
import { Logo } from "@/components/Logo";
import { RefCookie } from "@/components/social/RefCookie";
import { card } from "@/components/ui";
import { invitePreview } from "@/lib/social/discovery";
import { createClient, getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "You're invited · Tap" };

export default function InvitePage(props: PageProps<"/invite/[handle]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8 sm:py-14">
      <Logo />
      <Suspense fallback={<div className={`${card} mt-14 h-72 animate-pulse`} />}>
        <Invite params={props.params} />
      </Suspense>
    </main>
  );
}

async function Invite({ params }: { params: PageProps<"/invite/[handle]">["params"] }) {
  const { handle } = await params;
  // Already a member: go straight to their profile, where "Add friend" lives.
  if (await getUser()) redirect(`/u/${encodeURIComponent(handle.toLowerCase())}`);
  const who = await invitePreview(await createClient(), handle);
  if (!who) notFound();

  return (
    <>
      <RefCookie handle={who.handle} />
      <div className={`${card} mt-14 text-center`}>
        <div className="flex justify-center">
          <Avatar name={who.displayName} src={who.avatarUrl} className="size-24 text-3xl" />
        </div>
        <h1 className="mt-5 text-3xl leading-tight font-semibold tracking-tight">
          {who.displayName} invited you to Tap
        </h1>
        <p className="mt-1 text-[var(--muted)]">@{who.handle}</p>
        <p className="mx-auto mt-4 max-w-xs text-sm text-[var(--muted)]">
          Tap puts what your friends are playing, listening to and watching in one calm feed. Their activity is shared only with friends, so join and send them a request to see it.
        </p>
        <Link href="/signup" className="mt-6 block h-12 rounded-full bg-[var(--brand)] text-base leading-[3rem] font-semibold text-[var(--brand-ink)] shadow-[var(--shadow)]">
          Join {who.displayName.split(" ")[0]} on Tap
        </Link>
        <Link href="/login" className="mt-3 block text-sm text-[var(--muted)] underline-offset-4 hover:underline">
          I already have an account
        </Link>
      </div>
    </>
  );
}
