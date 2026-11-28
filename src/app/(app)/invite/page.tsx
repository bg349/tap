import type { Metadata } from "next";
import QRCode from "qrcode";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/home/Avatar";
import { Logo } from "@/components/Logo";
import { PeopleYouMayKnow } from "@/components/social/PeopleYouMayKnow";
import { ShareActions } from "@/components/social/ShareActions";
import { card } from "@/components/ui";
import { createClient, getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Invite friends · Tap" };

export default function InvitePage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 sm:py-14">
      <header className="flex items-center justify-between">
        <Logo />
        <Link href="/friends" className="text-sm font-medium underline-offset-4 hover:underline">Friends</Link>
      </header>
      <h1 className="mt-10 text-3xl font-semibold tracking-tight">Invite friends</h1>
      <Suspense fallback={<div className={`${card} mt-6 h-80 animate-pulse`} />}>
        <Invite />
      </Suspense>
    </main>
  );
}

async function Invite() {
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const { data: me } = await supabase.from("profiles").select("handle,display_name,avatar_url").eq("id", user.id).maybeSingle();
  if (!me) redirect("/onboarding");

  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const url = `${origin}/invite/${me.handle}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 192, color: { dark: "#111111", light: "#ffffff" } });

  return (
    <>
      <p className="mt-2 text-[var(--muted)]">Your personal link. When someone joins through it, they&apos;ll ask to be your friend right after they set up.</p>
      <div className={`${card} mt-6`}>
        <div className="flex items-center gap-3">
          <Avatar name={me.display_name} src={me.avatar_url} className="size-12" />
          <div className="min-w-0 leading-tight">
            <div className="truncate font-semibold">{me.display_name}</div>
            <div className="truncate text-sm text-[var(--muted)]">{url.replace(/^https?:\/\//, "")}</div>
          </div>
        </div>
        <div className="mt-5 flex justify-center">
          <div
            role="img"
            aria-label={`QR code for ${url}`}
            className="size-48 overflow-hidden rounded-2xl border border-[var(--border)] bg-white p-1 [&>svg]:size-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
        <p className="mt-2 text-center text-xs text-[var(--muted)]">Scan with a phone camera to open your invite.</p>
        <div className="mt-5">
          <ShareActions url={url} />
        </div>
      </div>
      <p className="mt-4 text-xs text-[var(--muted)]">Your activity stays private until you share an account with friends. Invites only show your name and photo.</p>
      <PeopleYouMayKnow />
    </>
  );
}
