import Link from "next/link";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="var(--brand)" />
      <circle cx="32" cy="32" r="7" fill="#fff" />
      <circle cx="32" cy="32" r="15" fill="none" stroke="#fff" strokeWidth="4" opacity=".8" />
      <circle cx="32" cy="32" r="23" fill="none" stroke="#fff" strokeWidth="3" opacity=".4" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" aria-label="Tap home" className="inline-flex items-center gap-2.5 font-semibold tracking-tight">
      <LogoMark />
      <span className="text-xl lowercase">tap</span>
    </Link>
  );
}
