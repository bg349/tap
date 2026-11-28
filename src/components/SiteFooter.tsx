import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-xl px-4 pb-8 text-xs text-[var(--muted)]">
      <nav className="flex gap-4 border-t border-[var(--border)] pt-4" aria-label="Legal">
        <Link href="/privacy" className="underline-offset-4 hover:underline">
          Privacy
        </Link>
      </nav>
    </footer>
  );
}
