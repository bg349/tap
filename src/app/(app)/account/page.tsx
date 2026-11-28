import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { card } from "@/components/ui";
import { ensureProfile } from "@/lib/supabase/profile";
import { createClient, getUser } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ChessForm } from "./ChessForm";
import { LetterboxdCard } from "./LetterboxdCard";
import { AudienceToggle } from "./AudienceToggle";
import { SteamCard } from "./SteamCard";
import { LastfmCard } from "./LastfmCard";

export const metadata: Metadata = { title: "Your account · Tap" };

export default function AccountPage() {
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
        <Account />
      </Suspense>
    </main>
  );
}

async function Account() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  await ensureProfile(supabase, user);
  const [{ data: profile }, { data: chess }, { data: lastfmConn }] = await Promise.all([
    supabase.from("profiles").select("handle, display_name, bio, avatar_url").eq("id", user.id).maybeSingle(),
    supabase
      .from("connections")
      .select("external_username, audience")
      .eq("user_id", user.id)
      .eq("source", "chesscom")
      .maybeSingle(),
    supabase
      .from("connections")
      .select("external_username, audience")
      .eq("user_id", user.id)
      .eq("source", "lastfm")
      .maybeSingle(),
  ]);
  const { data: steam } = await supabase
    .from("connections").select("external_username, audience").eq("user_id", user.id).eq("source", "steam").maybeSingle();
  const { data: lb } = await supabase
    .from("connections").select("external_username, audience").eq("user_id", user.id).eq("source", "letterboxd").maybeSingle();
  const chessName = chess?.external_username ?? null;
  const chessAudience = chess?.audience === "friends" ? "friends" : "only-me";

  return (
    <>
      <h1 className="mt-14 text-4xl leading-[1.05] font-semibold tracking-tight">
        Hi, {profile?.display_name ?? user.email?.split("@")[0]}.
      </h1>
      <p className="mt-4 text-[var(--muted)]">Signed in as {user.email}</p>

      <section className={`${card} mt-10`}>
        <div className="font-semibold">Your profile</div>
        <ProfileForm
          mode="account"
          initial={{
            handle: profile?.handle ?? "",
            displayName: profile?.display_name ?? "",
            bio: profile?.bio ?? "",
            avatarUrl: profile?.avatar_url ?? null,
          }}
        />
      </section>

      <section className={`${card} mt-6`}>
        <div className="flex items-center gap-3">
          <span className="inline-block size-3 shrink-0 rounded-full" style={{ background: "#7fa650" }} />
          <div className="font-semibold">Chess.com</div>
          {chessName && <span className="ml-auto text-sm text-[var(--win)]">Linked</span>}
        </div>
        <div className="mt-5">
          <ChessForm current={chessName} />
        </div>
        {chessName && (
          <div className="mt-6 border-t border-[var(--border)] pt-5">
            <div className="text-sm font-medium">Who can see this activity?</div>
            <AudienceToggle source="chesscom" current={chessAudience} />
          </div>
        )}
      </section>

      <SteamCard current={steam?.external_username ?? null} audience={steam?.audience === "friends" ? "friends" : "only-me"} />
      <LastfmCard
        current={lastfmConn?.external_username ?? null}
        audience={lastfmConn?.audience === "friends" ? "friends" : "only-me"}
      />

      <section className={`${card} mt-6`}>
        <LetterboxdCard current={lb?.external_username ?? null} audience={lb?.audience === "friends" ? "friends" : "only-me"} />
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/friends" className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--border)] px-5 font-medium">Friends</Link>
        <Link href={`/u/${profile?.handle ?? ""}`} className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--border)] px-5 font-medium">My profile</Link>
      </div>

      {chessName && (
        <Link
          href={`/profile?chesscom=${encodeURIComponent(chessName)}`}
          className="mt-6 inline-flex h-12 items-center justify-center rounded-xl border border-[var(--border)] px-5 font-medium"
        >
          View my card
        </Link>
      )}
    </>
  );
}
