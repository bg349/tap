import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { card } from "@/components/ui";
import { handleProblem } from "@/lib/handle";
import { ensureProfile } from "@/lib/supabase/profile";
import { createClient, getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Create your Tap profile · Tap" };

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8 sm:py-14">
      <Logo />
      <Suspense fallback={<div className={`${card} mt-14 h-72 animate-pulse`} />}>
        <Onboarding />
      </Suspense>
    </main>
  );
}

async function Onboarding() {
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  await ensureProfile(supabase, user);
  const { data: p } = await supabase
    .from("profiles")
    .select("handle, display_name, bio, avatar_url, onboarded")
    .eq("id", user.id)
    .maybeSingle();
  if (p?.onboarded) redirect("/");

  const meta = user.user_metadata as { full_name?: string; name?: string };
  const guess = (p?.handle ?? "").replace(/_\d{4}$/, "");
  return (
    <>
      <h1 className="mt-14 text-4xl leading-[1.05] font-semibold tracking-tight">
        Make your Tap.
        <span className="text-[var(--muted)]"> Pick a username.</span>
      </h1>
      <p className="mt-4 text-[var(--muted)]">This is how friends find and add you. You can change it later.</p>
      <ProfileForm
        mode="onboarding"
        suggestion={handleProblem(guess) ? "" : guess}
        initial={{
          handle: p?.handle ?? "",
          displayName: meta.full_name ?? meta.name ?? p?.display_name ?? "",
          bio: p?.bio ?? "",
          avatarUrl: p?.avatar_url ?? null,
        }}
      />
    </>
  );
}
