"use client";

import { useTransition } from "react";
import { ping } from "@/components/notifications/NotificationsLive";
import { markAllNotificationsRead } from "@/lib/notifications/actions";

export function MarkAll() {
  const [busy, start] = useTransition();
  return (
    <button
      disabled={busy}
      onClick={() => start(async () => { await markAllNotificationsRead(); ping(); })}
      className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-medium hover:bg-[var(--surface-2)] disabled:opacity-50"
    >
      Mark all read
    </button>
  );
}
