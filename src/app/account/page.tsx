import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { card } from "@/components/ui";
import { ensureProfile } from "@/lib/supabase/profile";
import { createClient, getUser } from "@/lib/supabase/server";
import { signOut } from "../auth/actions";
import { ChessForm } from "./ChessForm";

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
  const [{ data: profile }, { data: chess }] = await Promise.all([
    supabase.from("profiles").select("handle, display_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("connections")
      .select("external_username")
      .eq("user_id", user.id)
      .eq("source", "chesscom")
      .maybeSingle(),
  ]);
  const chessName = chess?.external_username ?? null;

  return (
    <>
      <h1 className="mt-14 text-4xl leading-[1.05] font-semibold tracking-tight">
        Hi, {profile?.display_name ?? user.email?.split("@")[0]}.
      </h1>
      <p className="mt-4 text-[var(--muted)]">Signed in as {user.email}</p>

      <section className={`${card} mt-10`}>
        <div className="flex items-center gap-3">
          <span className="inline-block size-3 shrink-0 rounded-full" style={{ background: "#7fa650" }} />
          <div className="font-semibold">Chess.com</div>
          {chessName && <span className="ml-auto text-sm text-[var(--win)]">Linked</span>}
        </div>
        <div className="mt-5">
          <ChessForm current={chessName} />
        </div>
      </section>

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
