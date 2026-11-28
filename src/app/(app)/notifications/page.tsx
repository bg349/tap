import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { NotificationRow, type RowData } from "@/components/notifications/NotificationRow";
import { NotificationsLive } from "@/components/notifications/NotificationsLive";
import { card } from "@/components/ui";
import { currentTime, timeAgo } from "@/lib/feed/time";
import { loadNotifications } from "@/lib/notifications/queries";
import { createClient, getUser } from "@/lib/supabase/server";
import { MarkAll } from "./MarkAll";

export const metadata: Metadata = { title: "Notifications · Tap" };

export default function NotificationsPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:py-12">
      <Suspense fallback={<div className={`${card} h-48 animate-pulse`} />}>
        <Notifications />
      </Suspense>
    </main>
  );
}

const bucketOf = (iso: string, now: number) => {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const t = new Date(iso).getTime();
  if (t >= startOfToday.getTime()) return "Today";
  if (t >= now - 7 * 864e5) return "This week";
  return "Earlier";
};

async function Notifications() {
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const list = await loadNotifications(supabase);
  const now = currentTime();
  const unread = list.filter((n) => !n.read).length;

  const groups = new Map<string, RowData[]>();
  for (const n of list) {
    const b = bucketOf(n.createdAt, now);
    const row: RowData = {
      id: n.id, type: n.type, read: n.read, ago: timeAgo(n.createdAt, now), name: n.actor.displayName, avatarUrl: n.actor.avatarUrl,
      handle: n.actor.handle, emoji: n.emoji, itemTitle: n.itemTitle, pendingFriendshipId: n.pendingFriendshipId,
    };
    groups.set(b, [...(groups.get(b) ?? []), row]);
  }

  return (
    <>
      <NotificationsLive />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
        {unread > 0 && <MarkAll />}
      </div>
      {list.length === 0 ? (
        <div className={`${card} mt-8 text-center`}>
          <div className="text-3xl" aria-hidden>🔔</div>
          <p className="mt-2 font-semibold">You&apos;re all caught up</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Friend requests and reactions to your activity will show up here.
          </p>
        </div>
      ) : (
        ["Today", "This week", "Earlier"].map((b) => {
          const rows = groups.get(b);
          if (!rows) return null;
          return (
            <section key={b}>
              <h2 className="mt-8 mb-2 text-sm font-medium text-[var(--muted)]">{b}</h2>
              <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                {rows.map((r) => <NotificationRow key={r.id} n={r} />)}
              </ul>
            </section>
          );
        })
      )}
    </>
  );
}
