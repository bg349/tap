import { Logo } from "@/components/Logo";
import { providers, upcoming } from "@/lib/providers/registry";

export default function Home() {
  const [primary] = providers;
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 sm:py-14">
      <Logo />

      <h1 className="mt-14 text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl">
        Everything you play, stream and do.
        <span className="text-[var(--muted)]"> One profile.</span>
      </h1>
      <p className="mt-4 text-[var(--muted)]">
        Link your accounts and Tap turns them into a profile card your friends can see.
      </p>

      <form
        action="/profile"
        method="get"
        className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-6"
      >
        <div className="flex items-center gap-3">
          <ProviderDot color={primary.accent} />
          <div className="font-semibold">Link {primary.name}</div>
        </div>
        <label htmlFor={primary.id} className="mt-5 block text-sm text-[var(--muted)]">
          Your {primary.accountLabel}
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id={primary.id}
            name={primary.id}
            required
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={primary.accountPlaceholder}
            className="h-12 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-base outline-none focus:border-[var(--fg)]"
          />
          <button
            type="submit"
            className="h-12 rounded-xl bg-[var(--fg)] px-5 font-medium text-[var(--bg)] transition-opacity hover:opacity-90"
          >
            Build my card
          </button>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Uses chess.com&apos;s public data. No password needed.
        </p>
      </form>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-[var(--muted)]">Coming soon</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {upcoming.map((p) => (
            <li
              key={p.id}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)]"
            >
              <ProviderDot color={p.accent} small />
              {p.name}
            </li>
          ))}
        </ul>
      </section>
    </main>
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
