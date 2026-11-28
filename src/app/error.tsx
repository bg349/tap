"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <Logo />
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-[var(--muted)]">That one&apos;s on us. Give it another go.</p>
      <div className="mt-2 flex gap-3">
        <button onClick={reset} className="h-11 rounded-full bg-[var(--brand)] px-6 font-medium text-[var(--brand-ink)]">Try again</button>
        <Link href="/" className="inline-flex h-11 items-center rounded-full border border-[var(--border)] px-6 font-medium">Home</Link>
      </div>
    </main>
  );
}
