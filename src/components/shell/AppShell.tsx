import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SidebarLinks, TabBar } from "./NavLinks";

/** Logged-in frame: top bar (mobile), left sidebar (desktop), bottom tabs (mobile). */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[var(--border)] px-4 py-6 md:flex">
        <div className="px-3">
          <Logo />
        </div>
        <SidebarLinks />
        <div className="mt-auto px-3 text-xs text-[var(--muted)]">
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <span className="mx-2">·</span>
          <Link href="/terms" className="hover:underline">Terms</Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-[var(--border)] bg-[var(--bg)]/90 px-4 backdrop-blur md:hidden">
          <Logo />
        </header>
        <main className="mx-auto w-full max-w-[470px] flex-1 px-4 pt-4 pb-24 md:pt-8 md:pb-12">{children}</main>
      </div>

      <TabBar />
    </div>
  );
}
