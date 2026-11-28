import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedItem } from "@/lib/providers/types";

export const REACTION_EMOJI = ["🔥", "👏", "😮", "😂"] as const;

export interface FeedPost extends FeedItem {
  author: { id: string; handle: string; displayName: string };
  reactions: { emoji: string; count: number; mine: boolean }[];
}

interface Row {
  id: string;
  user_id: string;
  source: string;
  kind: string;
  title: string;
  detail: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
  profiles: { handle: string; display_name: string } | null;
}

/** Newest-first items the viewer is allowed to see (RLS decides), optionally for one person. */
export async function loadPosts(
  supabase: SupabaseClient,
  viewerId: string,
  opts: { userId?: string; limit?: number } = {},
): Promise<FeedPost[]> {
  let q = supabase
    .from("items")
    .select("id,user_id,source,kind,title,detail,payload,occurred_at,profiles(handle,display_name)")
    .order("occurred_at", { ascending: false })
    .limit(opts.limit ?? 40);
  if (opts.userId) q = q.eq("user_id", opts.userId);
  const { data } = await q.returns<Row[]>();
  const rows = data ?? [];
  if (!rows.length) return [];

  const { data: rx } = await supabase
    .from("reactions")
    .select("item_id,user_id,emoji")
    .in("item_id", rows.map((r) => r.id));
  const byItem = new Map<string, { emoji: string; user_id: string }[]>();
  for (const r of rx ?? []) {
    const list = byItem.get(r.item_id) ?? [];
    list.push(r);
    byItem.set(r.item_id, list);
  }

  return rows.map((r) => {
    const list = byItem.get(r.id) ?? [];
    return {
      id: r.id,
      source: r.source,
      kind: r.kind,
      title: r.title,
      detail: r.detail,
      payload: r.payload ?? {},
      occurredAt: r.occurred_at,
      author: {
        id: r.user_id,
        handle: r.profiles?.handle ?? "unknown",
        displayName: r.profiles?.display_name ?? "Someone",
      },
      reactions: REACTION_EMOJI.map((emoji) => ({
        emoji,
        count: list.filter((x) => x.emoji === emoji).length,
        mine: list.some((x) => x.emoji === emoji && x.user_id === viewerId),
      })),
    };
  });
}
