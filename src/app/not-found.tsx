import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Not found · Tap" };

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <Logo />
      <div className="text-6xl font-semibold tracking-tight text-[var(--brand)]">404</div>
      <h1 className="text-xl font-semibold">Nothing here</h1>
      <p className="text-[var(--muted)]">That page or profile doesn&apos;t exist, or it moved.</p>
      <Link href="/" className="mt-2 inline-flex h-11 items-center rounded-full bg-[var(--brand)] px-6 font-medium text-[var(--brand-ink)]">Back to Tap</Link>
    </main>
  );
}
