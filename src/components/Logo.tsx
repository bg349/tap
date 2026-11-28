import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid size-7 place-items-center rounded-full bg-[var(--brand)] text-[var(--brand-ink)]">
        <span className="size-2.5 rounded-full bg-current" />
      </span>
      <span className="text-lg">tap</span>
    </Link>
  );
}
