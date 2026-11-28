import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-xl px-4 pb-24 text-xs md:pb-8 text-[var(--muted)]">
      <nav className="flex gap-4 border-t border-[var(--border)] pt-4" aria-label="Legal">
        <Link href="/privacy" className="underline-offset-4 hover:underline">
          Privacy
        </Link>
        <Link href="/terms" className="underline-offset-4 hover:underline">
          Terms
        </Link>
      </nav>
    </footer>
  );
}
