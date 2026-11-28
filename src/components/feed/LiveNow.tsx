import Link from "next/link";
import type { FeedPost } from "@/lib/feed/queries";
import { timeAgo } from "@/lib/feed/time";
import { getProvider } from "@/lib/providers/registry";
import { Avatar } from "./Avatar";
import { LIVE_MS, iconFor, verbFor } from "./activity";
import { LivePill } from "./LivePill";

/** Friends with activity in the last 15 minutes, one tile each (latest post). */
export function LiveNow({ posts, now, myId }: { posts: FeedPost[]; now: number; myId: string }) {
  const seen = new Set<string>();
  const live = posts.filter((p) => {
    if (p.author.id === myId || seen.has(p.author.id) || now - new Date(p.occurredAt).getTime() > LIVE_MS) return false;
    seen.add(p.author.id);
    return true;
  });
  return (
    <section aria-label="Live now" className="rounded-3xl bg-[var(--fg)] p-4 text-[var(--bg)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Live now</h2>
        <LivePill label={live.length ? `${live.length} active` : "quiet"} />
      </div>
      {live.length === 0 ? (
        <p className="mt-2 text-sm opacity-70">No one&apos;s active this minute. When a friend plays, listens or runs, they light up here.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {live.map((p) => (
            <li key={p.author.id}>
              <Link
                href={`/u/${p.author.handle}`}
                className="flex items-center gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--bg)_10%,transparent)] p-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--bg)_16%,transparent)]"
              >
                <Avatar name={p.author.displayName} size={40} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-sm font-semibold">{p.author.displayName}</span>
                  <span className="block truncate text-xs opacity-70">
                    {iconFor(p.source)} {getProvider(p.source)?.name ?? p.source} · {verbFor(p.source, p.kind)} · {timeAgo(p.occurredAt, now)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
