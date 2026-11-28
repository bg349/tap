import Link from "next/link";
import { FriendButton } from "@/components/feed/FriendButton";
import { Avatar } from "@/components/home/Avatar";
import { loadSuggestions } from "@/lib/social/discovery";
import { createClient } from "@/lib/supabase/server";

/** Friends of friends first, then newest members. Everyone already in a friendship with you is left out. */
export async function PeopleYouMayKnow({ limit = 6, title = "People you may know" }: { limit?: number; title?: string }) {
  const people = await loadSuggestions(await createClient(), limit);
  if (people.length === 0) return null;
  return (
    <section>
      <h2 className="mt-8 text-sm font-medium text-[var(--muted)]">{title}</h2>
      <ul className="mt-1 divide-y divide-[var(--border)]">
        {people.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-3">
            <Link href={`/u/${p.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar name={p.displayName} src={p.avatarUrl} className="size-10" />
              <span className="min-w-0 leading-tight">
                <span className="block truncate font-semibold">{p.displayName}</span>
                <span className="block truncate text-sm text-[var(--muted)]">
                  {p.mutual > 0 ? `${p.mutual} mutual friend${p.mutual === 1 ? "" : "s"}` : "New on Tap"} · @{p.handle}
                </span>
              </span>
            </Link>
            <FriendButton relation={{ state: "none" }} userId={p.id} />
          </li>
        ))}
      </ul>
    </section>
  );
}
