import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface NotificationView {
  id: string;
  type: "friend_request" | "friend_accepted" | "reaction";
  read: boolean;
  createdAt: string;
  actor: { handle: string; displayName: string };
  emoji: string | null;
  itemTitle: string | null;
  /** For friend requests: the request is still waiting for an answer. */
  pendingFriendshipId: string | null;
}

interface Row {
  id: string;
  type: NotificationView["type"];
  actor_id: string;
  friendship_id: string | null;
  item_id: string | null;
  emoji: string | null;
  read_at: string | null;
  created_at: string;
}

/** My latest notifications. If the table isn't there yet, returns an empty list. */
export async function loadNotifications(supabase: SupabaseClient, limit = 60): Promise<NotificationView[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,type,actor_id,friendship_id,item_id,emoji,read_at,created_at")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Row[]>();
  if (error || !data?.length) return [];
  const actorIds = [...new Set(data.map((r) => r.actor_id))];
  const itemIds = [...new Set(data.map((r) => r.item_id).filter((x): x is string => !!x))];
  const friendshipIds = data.filter((r) => r.type === "friend_request" && r.friendship_id).map((r) => r.friendship_id!);
  const [{ data: profs }, { data: items }, { data: pending }] = await Promise.all([
    supabase.from("profiles").select("id,handle,display_name").in("id", actorIds),
    itemIds.length ? supabase.from("items").select("id,title").in("id", itemIds) : Promise.resolve({ data: [] }),
    friendshipIds.length
      ? supabase.from("friendships").select("id").in("id", friendshipIds).eq("status", "pending")
      : Promise.resolve({ data: [] }),
  ]);
  const byActor = new Map((profs ?? []).map((p) => [p.id as string, p]));
  const byItem = new Map((items ?? []).map((i) => [i.id as string, i.title as string]));
  const stillPending = new Set((pending ?? []).map((f) => f.id as string));
  return data.flatMap((r) => {
    const a = byActor.get(r.actor_id);
    if (!a) return [];
    return [{
      id: r.id,
      type: r.type,
      read: !!r.read_at,
      createdAt: r.created_at,
      actor: { handle: a.handle as string, displayName: a.display_name as string },
      emoji: r.emoji,
      itemTitle: r.item_id ? (byItem.get(r.item_id) ?? null) : null,
      pendingFriendshipId: r.friendship_id && stillPending.has(r.friendship_id) ? r.friendship_id : null,
    }];
  });
}
