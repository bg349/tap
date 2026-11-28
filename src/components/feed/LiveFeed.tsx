"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { refreshMine } from "@/lib/feed/actions";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

type Status = "connecting" | "live" | "offline";

/**
 * Honest live status + "new activity" pill. Subscribes to inserts on `items`
 * over Supabase Realtime; row-level security means we only hear about items
 * this viewer may see. "Live" is shown only while the channel is truly
 * subscribed; otherwise it says updates are paused.
 */
export function LiveFeed({ knownIds }: { knownIds: string[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("connecting");
  const [fresh, setFresh] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [updating, setUpdating] = useState(false);
  const known = useRef(new Set(knownIds));
  const lastSync = useRef(0);
  // Pull my own accounts right now (at most once per 30s) so my activity shows up almost instantly.
  const syncNow = useCallback(
    async (force = false) => {
      if (!force && Date.now() - lastSync.current < 30_000) return;
      lastSync.current = Date.now();
      setUpdating(true);
      try {
        // Always refresh on a manual tap: the background sync may already have stored the item.
        const added = await refreshMine();
        if (added > 0 || force) router.refresh();
      } finally {
        setUpdating(false);
      }
    },
    [router],
  );
  useEffect(() => {
    void syncNow();
  }, [syncNow]);
  useEffect(() => {
    known.current = new Set(knownIds);
    setFresh((f) => f.filter((id) => !known.current.has(id)));
  }, [knownIds]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;
    const supabase = createBrowserClient(url, key);
    const channel = supabase
      .channel("feed-items")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "items" }, (payload) => {
        const id = (payload.new as { id?: string }).id;
        if (!id || known.current.has(id)) return;
        setFresh((f) => (f.includes(id) ? f : [...f, id]));
      })
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setStatus("live");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setStatus("offline");
      });

    // Catch up after the tab was in the background (browsers throttle sockets).
    let last = Date.now();
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last > 20_000) {
        last = Date.now();
        router.refresh();
      }
      if (document.visibilityState === "visible") void syncNow();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [router, syncNow]);

  const label = status === "live" ? "Live updates on" : status === "connecting" ? "Connecting…" : "Updates paused, reconnecting";
  return (
    <div className="sticky top-2 z-20 flex flex-col items-center gap-2">
      <p className="flex items-center gap-1.5 self-end text-[11px] text-[var(--muted)]" role="status">
        <span
          aria-hidden
          className={status === "live" ? "live-dot" : "inline-block rounded-full"}
          style={status === "live" ? { width: 6, height: 6 } : { width: 6, height: 6, background: "var(--muted)" }}
        />
        {updating ? "Updating…" : label}
        <button
          type="button"
          onClick={() => void syncNow(true)}
          disabled={updating}
          aria-label="Refresh my activity"
          className="ml-1 grid size-6 place-items-center rounded-full border border-[var(--border)] text-[var(--muted)] disabled:opacity-60"
        >
          <span aria-hidden className={updating ? "inline-block animate-spin" : ""}>↻</span>
        </button>
      </p>
      {fresh.length > 0 && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              router.refresh();
              setFresh([]);
            })
          }
          className="rise rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--brand-ink)] shadow-[var(--shadow)]"
        >
          {pending ? "Loading…" : `↑ ${fresh.length} new ${fresh.length === 1 ? "activity" : "activities"}`}
        </button>
      )}
    </div>
  );
}
