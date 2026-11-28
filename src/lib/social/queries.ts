import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Person {
  id: string;
  handle: string;
  displayName: string;
}

export type Relation =
  | { state: "self" }
  | { state: "none" }
  | { state: "friends"; friendshipId: string }
  | { state: "sent"; friendshipId: string }
  | { state: "received"; friendshipId: string };

interface FriendshipRow {
  id: string;
  requester: string;
  addressee: string;
  status: "pending" | "accepted";
  created_at: string;
}

const person = (p: { id: string; handle: string; display_name: string }): Person => ({
  id: p.id,
  handle: p.handle,
  displayName: p.display_name,
});

/** Everything the friends screen needs: friends, incoming and outgoing requests. */
export async function loadFriendships(supabase: SupabaseClient, me: string) {
  const { data } = await supabase
    .from("friendships")
    .select("id,requester,addressee,status,created_at")
    .order("created_at", { ascending: false })
    .returns<FriendshipRow[]>();
  const rows = data ?? [];
  const otherIds = [...new Set(rows.map((r) => (r.requester === me ? r.addressee : r.requester)))];
  const { data: profs } = otherIds.length
    ? await supabase.from("profiles").select("id,handle,display_name").in("id", otherIds)
    : { data: [] };
  const byId = new Map((profs ?? []).map((p) => [p.id as string, person(p)]));
  const entry = (r: FriendshipRow) => ({
    friendshipId: r.id,
    person: byId.get(r.requester === me ? r.addressee : r.requester)!,
  });
  const ok = (r: FriendshipRow) => byId.has(r.requester === me ? r.addressee : r.requester);
  return {
    friends: rows.filter((r) => r.status === "accepted" && ok(r)).map(entry),
    incoming: rows.filter((r) => r.status === "pending" && r.addressee === me && ok(r)).map(entry),
    outgoing: rows.filter((r) => r.status === "pending" && r.requester === me && ok(r)).map(entry),
  };
}

export async function pendingRequestCount(supabase: SupabaseClient, me: string) {
  const { count } = await supabase
    .from("friendships")
    .select("id", { count: "exact", head: true })
    .eq("addressee", me)
    .eq("status", "pending");
  return count ?? 0;
}

export async function relationTo(supabase: SupabaseClient, me: string, other: string): Promise<Relation> {
  if (me === other) return { state: "self" };
  const { data } = await supabase
    .from("friendships")
    .select("id,requester,status")
    .or(`and(requester.eq.${me},addressee.eq.${other}),and(requester.eq.${other},addressee.eq.${me})`)
    .maybeSingle();
  if (!data) return { state: "none" };
  if (data.status === "accepted") return { state: "friends", friendshipId: data.id };
  return data.requester === me ? { state: "sent", friendshipId: data.id } : { state: "received", friendshipId: data.id };
}

/** Username/name search. Escapes LIKE wildcards; excludes me. */
export async function searchPeople(supabase: SupabaseClient, me: string, q: string): Promise<Person[]> {
  const term = q.trim().toLowerCase().replace(/[%_\\,()]/g, "").slice(0, 30);
  if (term.length < 2) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id,handle,display_name")
    .or(`handle.ilike.%${term}%,display_name.ilike.%${term}%`)
    .neq("id", me)
    .limit(20);
  return (data ?? []).map(person);
}
