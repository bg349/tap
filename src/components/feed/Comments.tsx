"use client";

import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { COMMENT_MAX } from "@/lib/social/comment-limits";
import { addComment, deleteComment } from "@/lib/social/comments";
import { timeAgo } from "@/lib/feed/time";
import { ReportButton } from "./ReportButton";
import { Avatar } from "./Avatar";

type Comment = { id: string; user_id: string; body: string; created_at: string; handle: string; displayName: string; avatarUrl: string | null };

interface Row {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles: { handle: string; display_name: string; avatar_url: string | null } | null;
}

const SELECT = "id,user_id,body,created_at,profiles!comments_user_id_fkey(handle,display_name,avatar_url)";
const toComment = (r: Row): Comment => ({
  id: r.id,
  user_id: r.user_id,
  body: r.body,
  created_at: r.created_at,
  handle: r.profiles?.handle ?? "unknown",
  displayName: r.profiles?.display_name ?? "Someone",
  avatarUrl: r.profiles?.avatar_url ?? null,
});

/** Comment button plus a short thread under a card. Loads and goes live only once opened. */
export function Comments({ itemId, ownerId, viewerId, initialCount }: { itemId: string; ownerId: string; viewerId: string; initialCount: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const client = useRef<ReturnType<typeof createBrowserClient> | null>(null);
  const count = items ? items.length : initialCount;

  const getClient = useCallback(() => {
    if (client.current) return client.current;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return null;
    client.current = createBrowserClient(url, key);
    return client.current;
  }, []);

  const load = useCallback(async () => {
    const sb = getClient();
    if (!sb) return;
    const { data } = await sb.from("comments").select(SELECT).eq("item_id", itemId).order("created_at", { ascending: true }).limit(100);
    setItems(((data ?? []) as unknown as Row[]).map(toComment));
  }, [getClient, itemId]);

  useEffect(() => {
    if (!open) return;
    const sb = getClient();
    if (!sb) return;
    void load();
    const channel = sb
      .channel(`comments-${itemId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `item_id=eq.${itemId}` }, () => void load())
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [open, itemId, getClient, load]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || pending) return;
    setError(null);
    start(async () => {
      const res = await addComment(itemId, body);
      if (res.error) setError(res.error);
      else {
        setText("");
        await load();
      }
    });
  }

  function remove(id: string) {
    setItems((cur) => cur?.filter((c) => c.id !== id) ?? cur);
    start(async () => {
      const res = await deleteComment(id);
      if (res.error) setError(res.error);
      await load();
    });
  }

  const now = Date.now();
  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)]"
      >
        <span aria-hidden>💬</span>
        {count > 0 ? `${count} ${count === 1 ? "comment" : "comments"}` : "Comment"}
      </button>
      {open && (
        <div className="mt-2 space-y-3 border-t border-[var(--border)] pt-3">
          {items === null && <p className="text-sm text-[var(--muted)]">Loading…</p>}
          {items?.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Link href={`/u/${c.handle}`} aria-label={c.displayName}>
                <Avatar name={c.displayName} src={c.avatarUrl} size={28} />
              </Link>
              <div className="min-w-0 flex-1 text-sm leading-snug">
                <p>
                  <Link href={`/u/${c.handle}`} className="font-semibold hover:underline">{c.displayName}</Link>{" "}
                  <span className="text-xs text-[var(--muted)]">@{c.handle} · {timeAgo(c.created_at, now)}</span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
              </div>
              {c.user_id !== viewerId && <ReportButton userId={c.user_id} commentId={c.id} />}
              {(c.user_id === viewerId || ownerId === viewerId) && (
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  aria-label="Delete comment"
                  className="h-7 shrink-0 rounded-full px-2 text-xs text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
          <form onSubmit={submit} className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, COMMENT_MAX))}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) submit(e); }}
              rows={1}
              maxLength={COMMENT_MAX}
              placeholder="Add a comment…"
              className="min-h-10 flex-1 resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
            />
            <button
              type="submit"
              disabled={pending || !text.trim()}
              className="h-10 rounded-full bg-[var(--brand)] px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              Post
            </button>
          </form>
          <div className="flex justify-between text-xs text-[var(--muted)]">
            <span role="alert" className="text-[var(--brand)]">{error}</span>
            {text.length > COMMENT_MAX - 100 && <span>{text.length}/{COMMENT_MAX}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
