"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Avatar } from "@/components/feed/Avatar";
import { markNotificationRead } from "@/lib/notifications/actions";
import { acceptFriendRequest, removeFriendship } from "@/lib/social/actions";
import { ping } from "./NotificationsLive";

export interface RowData {
  id: string;
  type: "friend_request" | "friend_accepted" | "reaction";
  read: boolean;
  ago: string;
  name: string;
  avatarUrl?: string | null;
  handle: string;
  emoji: string | null;
  itemTitle: string | null;
  pendingFriendshipId: string | null;
}

export function NotificationRow({ n }: { n: RowData }) {
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); ping(); });

  const text =
    n.type === "friend_request" ? (
      <>wants to be friends.</>
    ) : n.type === "friend_accepted" ? (
      <>accepted your friend request.</>
    ) : (
      <>
        reacted {n.emoji} to {n.itemTitle ? <>“{n.itemTitle}”</> : "your activity"}.
      </>
    );

  return (
    <li className={`flex items-start gap-3 px-4 py-3.5 ${n.read ? "" : "bg-[var(--brand)]/[0.06]"} ${busy ? "opacity-60" : ""}`}>
      <Link href={`/u/${n.handle}`} className="shrink-0" onClick={() => !n.read && run(() => markNotificationRead(n.id))}>
        <Avatar name={n.name} src={n.avatarUrl} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug">
          <Link href={`/u/${n.handle}`} className="font-semibold hover:underline" onClick={() => !n.read && run(() => markNotificationRead(n.id))}>
            {n.name}
          </Link>{" "}
          {text} <span className="whitespace-nowrap text-sm text-[var(--muted)]">{n.ago}</span>
        </p>
        {n.type === "friend_request" && n.pendingFriendshipId && (
          <div className="mt-2.5 flex gap-2">
            <button
              disabled={busy}
              onClick={() => run(() => acceptFriendRequest(n.pendingFriendshipId!))}
              className="h-9 rounded-full bg-[var(--brand)] px-4 text-sm font-semibold text-[var(--brand-ink)]"
            >
              Accept
            </button>
            <button
              disabled={busy}
              onClick={() => run(() => removeFriendship(n.pendingFriendshipId!))}
              className="h-9 rounded-full border border-[var(--border)] px-4 text-sm text-[var(--muted)]"
            >
              Decline
            </button>
          </div>
        )}
        {n.type === "friend_request" && !n.pendingFriendshipId && (
          <p className="mt-1 text-sm text-[var(--muted)]">Handled</p>
        )}
      </div>
      {!n.read && (
        <button
          disabled={busy}
          onClick={() => run(() => markNotificationRead(n.id))}
          aria-label="Mark as read"
          title="Mark as read"
          className="mt-1.5 grid size-6 shrink-0 place-items-center rounded-full hover:bg-[var(--surface-2)]"
        >
          <span className="size-2.5 rounded-full bg-[var(--brand)]" />
        </button>
      )}
    </li>
  );
}
