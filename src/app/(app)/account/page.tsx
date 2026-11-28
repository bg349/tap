import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { card } from "@/components/ui";
import { LetterboxdMark } from "@/lib/providers/letterboxd/LetterboxdMark";
import { ensureProfile } from "@/lib/supabase/profile";
import { createClient, getUser } from "@/lib/supabase/server";
import type { LinkView } from "@/lib/verification/config";
import { signOut } from "@/app/auth/actions";
import { SteamCard } from "./SteamCard";
import { VerifyCard } from "./VerifyCard";
import { DataPrivacy } from "./DataPrivacy";
import { MasterPause } from "./PauseControls";

export const metadata: Metadata = { title: "Link accounts · Tap" };

export default function AccountPage({ searchParams }: { searchParams: Promise<{ steam?: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 sm:py-14">
      <header className="flex items-center justify-between">
        <Logo />
        <form action={signOut}>
          <button type="submit" className="text-sm text-[var(--muted)] underline-offset-4 hover:underline">
            Sign out
          </button>
        </form>
      </header>
      <Suspense fallback={<div className={`${card} mt-14 h-48 animate-pulse`} />}>
        <Account searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

interface Row {
  source: string;
  external_username: string | null;
  audience: string;
  paused: boolean;
  verified_at: string | null;
  verify_code: string | null;
  verify_expires_at: string | null;
}

function toView(row: Row | undefined): LinkView {
  const expired = row?.verify_expires_at ? new Date(row.verify_expires_at) < new Date() : false;
  return {
    account: row?.external_username ?? null,
    status: !row ? "none" : row.verified_at ? "verified" : row.verify_code && !expired ? "pending" : row.verify_code ? "expired" : "unverified",
    code: row?.verified_at ? null : (row?.verify_code ?? null),
    expiresAt: row?.verify_expires_at ?? null,
    paused: Boolean(row?.paused),
    audience: row?.audience === "friends" ? "friends" : "only-me",
  };
}

async function Account({ searchParams }: { searchParams: Promise<{ steam?: string }> }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const { steam: steamResult } = await searchParams;

  const supabase = await createClient();
  await ensureProfile(supabase, user);
  const { data } = await supabase
    .from("connections")
    .select("source, external_username, audience, paused, verified_at, verify_code, verify_expires_at")
    .eq("user_id", user.id)
    .returns<Row[]>();
  const { data: prof } = await supabase.from("profiles").select("sharing_paused").eq("id", user.id).maybeSingle();
  const masterPaused = Boolean(prof?.sharing_paused);
  const by = new Map((data ?? []).map((r) => [r.source, r]));
  const view = (s: string) => toView(by.get(s));
  // An old link with no code and no verification still needs proving: show it as "needs verification".
  const legacy = (s: string) => {
    const r = by.get(s);
    return Boolean(r && !r.verified_at && !r.verify_code);
  };
  const chess = view("chesscom");

  return (
    <>
      <h1 className="mt-14 text-4xl leading-[1.05] font-semibold tracking-tight">
        Link accounts
      </h1>
      <p className="mt-4 text-[var(--muted)]">
        Prove each account is really yours, then choose who sees it. Signed in as {user.email}. Edit your name, photo and bio on your <Link href="/profile" className="underline underline-offset-4">Profile</Link>.
      </p>
      {["chesscom", "lastfm", "letterboxd", ...(process.env.STEAM_API_KEY ? ["steam"] : [])].some(legacy) && (
        <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm">
          To keep accounts safe, links now need a quick ownership check. Your existing links are saved, but stay hidden from friends until you verify them below.
        </p>
      )}

      <MasterPause paused={masterPaused} />

      <VerifyCard
        masterPaused={masterPaused}
        source="chesscom"
        view={chess}
        icon={<span className="inline-block size-3 shrink-0 rounded-full" style={{ background: "#7fa650" }} />}
      />
      {process.env.STEAM_API_KEY && <SteamCard view={view("steam")} result={steamResult} />}
      <VerifyCard
        masterPaused={masterPaused}
        source="lastfm"
        view={view("lastfm")}
        icon={<span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#d51007] text-sm font-bold text-white">as</span>}
        blurb="Shows what you're listening to. Connect Spotify or Apple Music inside Last.fm and your plays appear here."
      />
      <VerifyCard masterPaused={masterPaused} source="letterboxd" view={view("letterboxd")} icon={<LetterboxdMark className="h-4 w-7 shrink-0" />} />

      <DataPrivacy />

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/friends" className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--border)] px-5 font-medium">Friends</Link>
        <Link href="/profile" className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--border)] px-5 font-medium">Profile</Link>
      </div>

      {chess.status === "verified" && chess.account && (
        <Link
          href={`/profile?chesscom=${encodeURIComponent(chess.account)}`}
          className="mt-6 inline-flex h-12 items-center justify-center rounded-xl border border-[var(--border)] px-5 font-medium"
        >
          View my card
        </Link>
      )}
    </>
  );
}
