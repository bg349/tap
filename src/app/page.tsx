import Link from "next/link";
import { Suspense } from "react";
import { HomeFeed } from "@/components/home/HomeFeed";
import { AuthNav, GuestNav } from "@/components/AuthNav";
import { Logo } from "@/components/Logo";
import { providers } from "@/lib/providers/registry";

export default function Home() {
  return (
    <Suspense fallback={<div className="flex-1" aria-busy="true" />}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  return (await HomeFeed()) ?? <Landing />;
}

function Landing() {
  const [primary] = providers;
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 py-6 sm:py-8">
        <header className="flex items-center justify-between">
          <Logo />
          <Suspense fallback={<GuestNav />}>
            <AuthNav />
          </Suspense>
        </header>

        <section className="mt-12 grid items-center gap-12 md:mt-20 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold tracking-wide uppercase">
              Your friends, in one feed
            </span>
            <h1 className="mt-5 text-5xl leading-[0.98] font-semibold tracking-tight sm:text-7xl">
              See what your friends are <span className="text-[var(--brand)]">up to</span>, all in one place.
            </h1>
            <p className="mt-5 max-w-md text-lg text-[var(--muted)]">
              Tap links the accounts you already have. Games played, songs scrobbled and films watched land in one feed. It updates whenever you open Tap.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="h-12 rounded-full bg-[var(--brand)] px-7 text-base leading-[3rem] font-semibold text-[var(--brand-ink)] shadow-[var(--shadow)] transition-transform hover:scale-[1.03]">
                Get started free
              </Link>
              <Link href="/login" className="h-12 rounded-full border border-[var(--border)] px-6 text-base leading-[2.9rem] font-medium">
                Sign in
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-2" aria-label="Supported services">
              {providers.map((p) => (
                <li key={p.id} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm">
                  <ProviderDot color={p.accent} small />
                  {p.name}
                </li>
              ))}
            </ul>
          </div>

          <Preview />
        </section>

        <section className="mt-24 grid gap-4 sm:grid-cols-3">
          {[
            ["1", "Link your apps", "Connect chess.com, Steam, Last.fm and Letterboxd. Public data only, no passwords. Everything starts private to you."],
            ["2", "Add your friends", "Add friends by handle and choose which of your accounts they can see. Each one starts as only you."],
            ["3", "Watch it happen", "Games, songs and films from your friends gather in one calm feed, refreshed whenever you open Tap."],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="grid size-9 place-items-center rounded-full bg-[var(--fg)] text-sm font-bold text-[var(--bg)]">{n}</div>
              <h2 className="mt-4 text-lg font-semibold tracking-tight">{t}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{d}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
          <form action="/profile" method="get" className="grid items-center gap-5 md:grid-cols-[1fr_1.2fr]">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Just want a profile card?</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Paste a {primary.accountLabel} and get a shareable card. No account needed.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id={primary.id}
                name={primary.id}
                required
                aria-label={primary.accountLabel}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={primary.accountPlaceholder}
                className="h-12 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-base outline-none focus:border-[var(--fg)]"
              />
              <button type="submit" className="h-12 rounded-xl bg-[var(--fg)] px-5 font-medium text-[var(--bg)] transition-opacity hover:opacity-90">
                Build my card
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

/** Illustrative sample of the feed (made-up people, not real data). */
function Preview() {
  const rows = [
    { n: "Maya", icon: "♟", c: "#7fa650", t: "Won by checkmate · Blitz", s: "1342", d: "▲ 9", live: true, when: "2m" },
    { n: "Leo", icon: "♪", c: "#d51007", t: "Scrobbled Nights", s: "Frank Ocean", d: "", live: false, when: "4m" },
    { n: "Sam", icon: "▶", c: "#00e054", t: "Watched Past Lives", s: "★★★★½", d: "", live: false, when: "12m" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden>
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-[color-mix(in_srgb,var(--brand)_16%,transparent)] blur-2xl" />
      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg)] p-3 shadow-[var(--shadow)] md:rotate-2">
        <div className="mb-3 flex items-center justify-between rounded-2xl bg-[var(--fg)] px-4 py-3 text-[var(--bg)]">
          <span className="text-sm font-semibold">Sample feed</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-[var(--brand)]">Example</span>
        </div>
        <div className="flex flex-col gap-3">
          {rows.map((r, i) => (
            <div key={r.n} className="rise relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3" style={{ animationDelay: `${i * 120}ms` }}>
              <span className="absolute inset-x-0 top-0 h-1" style={{ background: r.live ? "var(--brand)" : r.c, opacity: r.live ? 1 : 0.5 }} />
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-full text-sm font-semibold text-white" style={{ background: r.c }}>{r.n[0]}</span>
                <div className="min-w-0 flex-1 text-sm leading-tight"><b>{r.n}</b> <span className="text-[var(--muted)]">{r.icon} · {r.when}</span></div>
                
              </div>
              <div className="mt-2 flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-3 py-2.5 text-sm">
                <span className="font-medium">{r.t}</span>
                <span className="text-[var(--muted)] tabular-nums">{r.s} <b className="text-[var(--win)]">{r.d}</b></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProviderDot({ color, small }: { color: string; small?: boolean }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${small ? "size-2" : "size-3"}`}
      style={{ background: color }}
    />
  );
}
