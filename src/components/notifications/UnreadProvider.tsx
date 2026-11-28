"use client";

import { createBrowserClient } from "@supabase/ssr";
import { createContext, useContext, useEffect, useState } from "react";

const Ctx = createContext(0);
export const useUnread = () => useContext(Ctx);

/** Tells the app frame how many unread notifications there are, live. */
export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;
    const supabase = createBrowserClient(url, key);
    let alive = true;
    const load = async () => {
      const { count: c, error } = await supabase
        .from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
      if (alive && !error) setCount(c ?? 0);
    };
    void load();
    const channel = supabase
      .channel("notif-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => void load())
      .subscribe();
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("tap:notifications-changed", load);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("tap:notifications-changed", load);
      supabase.removeChannel(channel);
    };
  }, []);
  return <Ctx.Provider value={count}>{children}</Ctx.Provider>;
}

export function UnreadBadge({ className = "" }: { className?: string }) {
  const n = useUnread();
  if (n < 1) return null;
  return (
    <span
      aria-label={`${n} unread`}
      className={`grid min-w-[18px] place-items-center rounded-full bg-[var(--brand)] px-1 text-[11px] font-semibold leading-[18px] text-[var(--brand-ink)] ${className}`}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}
