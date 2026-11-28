import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { InviteBanner } from "@/components/social/InviteBanner";
import { Logo } from "@/components/Logo";
import { AuthForm } from "../auth/AuthForm";

export const metadata: Metadata = { title: "Sign up · Tap" };

export default function SignUpPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8 sm:py-14">
      <Logo />
      <Suspense fallback={null}>
        <InviteBanner />
      </Suspense>
      <h1 className="mt-14 text-4xl leading-[1.05] font-semibold tracking-tight">
        Make your Tap.
        <span className="text-[var(--muted)]"> Keep your card.</span>
      </h1>
      <p className="mt-4 text-[var(--muted)]">
        An account saves your linked accounts so your profile is always one link away.
      </p>
      <AuthForm mode="signup" />
      <p className="mt-6 text-xs text-[var(--muted)]">
        By signing up you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-4">
          Terms of Service
        </Link>{" "}
        and how we handle your data in our{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          privacy policy
        </Link>
        .
      </p>
    </main>
  );
}
