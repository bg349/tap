import type { Metadata } from "next";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Offline · Tap", robots: { index: false } };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo />
      <h1 className="text-2xl font-semibold tracking-tight">You&apos;re offline</h1>
      <p className="text-[var(--muted)]">Tap needs a connection to show your friends&apos; activity. Reconnect and it&apos;ll pick up right where you left off.</p>
    </main>
  );
}
