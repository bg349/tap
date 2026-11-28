import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { createClient, getUser } from "@/lib/supabase/server";

/** Signed-in user's own chip: their photo, name and handle, linking to the Profile tab. */
export async function MeChip({ compact }: { compact?: boolean }) {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("handle,display_name,avatar_url").eq("id", user.id).maybeSingle();
  if (!p) return null;
  if (compact) {
    return (
      <Link href="/profile" aria-label="Your profile" className="ml-auto">
        <Avatar name={p.display_name} src={p.avatar_url} size={32} />
      </Link>
    );
  }
  return (
    <Link href="/profile" className="mx-3 mb-4 flex items-center gap-3 rounded-2xl p-2 hover:bg-[var(--surface-2)]">
      <Avatar name={p.display_name} src={p.avatar_url} size={36} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold">{p.display_name}</span>
        <span className="block truncate text-xs text-[var(--muted)]">@{p.handle}</span>
      </span>
    </Link>
  );
}
