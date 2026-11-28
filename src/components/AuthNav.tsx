import Link from "next/link";
import { getUser } from "@/lib/supabase/server";

export async function AuthNav() {
  const user = await getUser();
  if (user) {
    return (
      <Link href="/account" className="text-sm font-medium underline-offset-4 hover:underline">
        Your account
      </Link>
    );
  }
  return <GuestNav />;
}

export function GuestNav() {
  return (
    <nav className="flex items-center gap-4 text-sm">
      <Link href="/login" className="text-[var(--muted)] underline-offset-4 hover:underline">
        Sign in
      </Link>
      <Link
        href="/signup"
        className="rounded-full bg-[var(--fg)] px-3.5 py-1.5 font-medium text-[var(--bg)] transition-opacity hover:opacity-90"
      >
        Sign up
      </Link>
    </nav>
  );
}
