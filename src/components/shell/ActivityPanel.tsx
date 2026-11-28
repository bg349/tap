"use client";

import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/feed/Avatar";
import { LIVE_MS, iconFor } from "@/components/feed/activity";
import { timeAgo } from "@/lib/feed/time";

interface Friend {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
}
interface Row {
  user_id: string;
  source: string;
  kind: string;
  title: string;
  detail: string | null;
  occurred_at: string;
}
interface Line {
  source: string;
  text: string;
  at: string;
}
interface Entry {
  friend: Friend;
  lines: Line[]; // newest first, one per service
  live: boolean;
}

const NAMES: Record<string, string> = { chesscom: "chess.com", lastfm: "Last.fm", letterboxd: "Letterboxd", steam: "Steam", xbox: "Xbox", lichess: "Lichess", spotify: "Spotify", strava: "Strava" };
const DAY = 24 * 60 * 60_000;

/** "Playing Counter-Strike 2", "Listening to X · Y", "Played a bullet game on chess.com". */
function describe(r: Row): string {
  const name = NAMES[r.source] ?? r.source;
  switch (r.source) {
    case "steam":
    case "xbox":
      return `Playing ${r.title}`;
    case "lastfm":
    case "spotify":
      return `Listening to ${r.title}${r.detail ? ` · ${r.detail}` : ""}`;
    case "lichess":
    case "chesscom": {
      if (r.kind !== "game") return r.title;
      const mode = r.detail?.split(" · ")[0]?.toLowerCase();
      return `Played ${mode ? `a ${mode} game` : "a game"} on ${name}`;
    }
    default:
      return r.title || `Active on ${name}`;
  }
}

const ago = (iso: string, now: number) => {
  const t = timeAgo(iso, now);
  return t === "just now" ? t : /^\d+[mhd]$/.test(t) ? `${t} ago` : t;
};

/**
 * Discord-style "Now active" rail on the right edge (desktop). Collapsed it is a slim strip of
 * friend avatars with status dots; hover, focus or the toggle expands it over the page. Data comes
 * straight from Supabase as the signed-in viewer, so row-level security decides what is visible.
 */
export function ActivityPanel() {
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [hover, setHover] = useState(false);
  const [pinned, setPinnedState] = useState(false);
  const setPinned = useCallback((v: boolean | ((p: boolean) => boolean)) => {
    setPinnedState((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      try { localStorage.setItem("tap_panel_pinned", next ? "1" : "0"); } catch {}
      return next;
    });
  }, []);
  useEffect(() => {
    try { if (localStorage.getItem("tap_panel_pinned") === "1") setPinnedState(true); } catch {}
  }, []);
  const [error, setError] = useState(false);
  const clientRef = useRef<ReturnType<typeof createBrowserClient> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const supabase = clientRef.current;
    if (!supabase) return;
    try {
      const { data: auth } = await supabase.auth.getUser();
      const me = auth.user?.id;
      if (!me) return;
      setMeId(me);
      const { data: fs, error: fe } = await supabase
        .from("friendships")
        .select("requester,addressee")
        .eq("status", "accepted");
      if (fe) throw fe;
      const ids = [...new Set(((fs ?? []) as { requester: string; addressee: string }[]).map((f) => (f.requester === me ? f.addressee : f.requester) as string))];
      const since = new Date(Date.now() - DAY).toISOString();
      const [{ data: ps, error: pe }, { data: its, error: ie }] = await Promise.all([
        supabase.from("profiles").select("id,handle,display_name,avatar_url").in("id", [me, ...ids]),
        supabase
          .from("items")
          .select("user_id,source,kind,title,detail,occurred_at")
          .in("user_id", [me, ...ids])
          .gte("occurred_at", since)
          .order("occurred_at", { ascending: false })
          .limit(200),
      ]);
      if (pe || ie) throw pe ?? ie;
      setFriends(((ps ?? []) as { id: string; handle: string; display_name: string; avatar_url: string | null }[]).map((p) => ({ id: p.id, handle: p.handle, displayName: p.display_name, avatarUrl: p.avatar_url })));
      setRows((its ?? []) as Row[]);
      setNow(Date.now());
      setError(false);
    } catch {
      setError(true);
      setFriends((f) => f ?? []);
    }
  }, []);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;
    const supabase = createBrowserClient(url, key);
    clientRef.current = supabase;
    const first = setTimeout(() => void load(), 0);
    const schedule = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void load(), 1500);
    };
    const channel = supabase
      .channel("activity-panel")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "items" }, schedule)
      .subscribe();
    const poll = setInterval(() => void load(), 60_000);
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(poll);
      clearInterval(tick);
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
      clientRef.current = null;
    };
  }, [load]);

  const { active, idle, you } = useMemo(() => {
    const byUser = new Map<string, Row[]>();
    for (const r of rows) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r]);
    const build = (friend: Friend): Entry => {
      const mine = byUser.get(friend.id) ?? [];
      const recent = mine.filter((r) => now - new Date(r.occurred_at).getTime() <= LIVE_MS);
      const pool = recent.length ? recent : mine.slice(0, 1);
      const seen = new Set<string>();
      const lines: Line[] = [];
      for (const r of pool) {
        if (seen.has(r.source)) continue;
        seen.add(r.source);
        lines.push({ source: r.source, text: describe(r), at: r.occurred_at });
      }
      return { friend, lines, live: recent.length > 0 };
    };
    const all = friends ?? [];
    const entries: Entry[] = all.filter((f) => f.id !== meId).map(build);
    const meFriend = all.find((f) => f.id === meId);
    const you = meFriend ? build({ ...meFriend, displayName: "You" }) : null;
    const latest = (e: Entry) => (e.lines[0] ? new Date(e.lines[0].at).getTime() : 0);
    entries.sort((a, b) => latest(b) - latest(a));
    return { active: entries.filter((e) => e.live), idle: entries.filter((e) => !e.live), you };
  }, [friends, rows, now, meId]);

  const open = hover || pinned;
  const total = active.length + idle.length;
  const anyLive = active.length > 0 || !!you?.live;

  return (
    <aside
      aria-label="Friend activity"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setHover(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHover(false);
      }}
      className={`fixed top-0 right-0 z-30 hidden h-screen flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--bg)] transition-[width,box-shadow] duration-200 lg:flex ${
        open ? "w-72 shadow-[var(--shadow)]" : "w-16"
      }`}
    >
      <button
        type="button"
        onClick={() => setPinned((p) => !p)}
        aria-expanded={open}
        aria-label={pinned ? "Unpin activity panel" : "Pin activity panel open"}
        className="flex h-14 shrink-0 items-center gap-2 px-[22px] text-sm font-semibold tracking-tight"
      >
        <span className={anyLive ? "live-dot" : "inline-block size-2 rounded-full bg-[var(--muted)]"} aria-hidden />
        {open && (
          <>
            <span className="flex-1 text-left">Now active</span>
            <span className="text-xs font-normal text-[var(--muted)]">{pinned ? "Pinned" : "Pin"}</span>
          </>
        )}
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-6">
        {friends === null ? (
          <p className="px-4 text-xs text-[var(--muted)]">{open ? "Loading…" : "…"}</p>
        ) : (
          <>
            {you && <ul><Row e={you} open={open} now={now} self /></ul>}
            {total === 0 ? (
          open ? (
            <p className="px-5 text-sm text-[var(--muted)]">
              No friends yet. <Link href="/friends" className="font-medium text-[var(--fg)] underline underline-offset-4">Add some</Link> to see what they&apos;re up to.
            </p>
          ) : (
            <Link href="/friends" aria-label="Add friends" className="mx-auto grid size-9 place-items-center rounded-full border border-dashed border-[var(--border)] text-[var(--muted)]">+</Link>
          )
        ) : (
          <>
            <Section title="Active now" count={active.length} open={open} />
            {active.length === 0 && open && <p className="px-5 pb-2 text-sm text-[var(--muted)]">No friends active right now</p>}
            <ul>{active.map((e) => <Row key={e.friend.id} e={e} open={open} now={now} />)}</ul>
            {idle.length > 0 && (
              <>
                <Section title="Offline" count={idle.length} open={open} />
                <ul>{idle.map((e) => <Row key={e.friend.id} e={e} open={open} now={now} />)}</ul>
              </>
            )}
          </>
        )}
          </>
        )}
        {error && open && <p className="px-5 pt-2 text-xs text-[var(--muted)]">Couldn&apos;t refresh. Retrying.</p>}
      </div>
    </aside>
  );
}

function Section({ title, count, open }: { title: string; count: number; open: boolean }) {
  return open ? (
    <h3 className="px-5 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">
      {title} · {count}
    </h3>
  ) : (
    <div className="mx-5 my-2 h-px bg-[var(--border)]" aria-hidden />
  );
}

function Row({ e, open, now, self }: { e: Entry; open: boolean; now: number; self?: boolean }) {
  const first = e.lines[0];
  const extra = e.lines.length - 1;
  return (
    <li>
      <Link
        href={`/u/${e.friend.handle}`}
        title={open ? undefined : `${e.friend.displayName}${first ? ` · ${first.text}` : ""}`}
        className={`flex items-center gap-3 px-[14px] py-2 transition-colors hover:bg-[var(--surface-2)] ${e.live || self ? "" : "opacity-60"}`}
      >
        <span className="relative shrink-0">
          <Avatar name={e.friend.displayName} src={e.friend.avatarUrl} size={36} />
          <span
            aria-hidden
            className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-[var(--bg)] ${e.live ? "bg-[var(--brand)]" : "bg-[var(--muted)]"}`}
          />
        </span>
        {open && (
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-semibold">{e.friend.displayName}</span>
            {self ? (
              <span className="block truncate text-xs text-[var(--muted)]">
                {e.live ? (
                  <>
                    <span aria-hidden>{iconFor(first.source)} </span>
                    {first.text} · {ago(first.at, now)}
                  </>
                ) : (
                  "Nothing live right now"
                )}
              </span>
            ) : first ? (
              <span className="block truncate text-xs text-[var(--muted)]">
                <span aria-hidden>{iconFor(first.source)} </span>
                {e.live ? first.text : `Last active ${ago(first.at, now)}`}
                {e.live && <> · {ago(first.at, now)}</>}
              </span>
            ) : (
              <span className="block truncate text-xs text-[var(--muted)]">No recent activity</span>
            )}
            {e.live && extra > 0 && (
              <span className="block truncate text-xs text-[var(--muted)]">
                {e.lines.slice(1).map((l) => `${iconFor(l.source)} ${l.text}`).join(" · ")}
              </span>
            )}
          </span>
        )}
      </Link>
    </li>
  );
}
