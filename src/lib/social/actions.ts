"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { REACTION_EMOJI } from "@/lib/feed/queries";
import { createClient, getUser } from "@/lib/supabase/server";

async function me() {
  const user = await getUser();
  if (!user) redirect("/login");
  return { user, supabase: await createClient() };
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function sendFriendRequest(userId: string) {
  const { user, supabase } = await me();
  if (userId === user.id) return;
  // If they already asked me, accept instead of making a second row.
  const { data: theirs } = await supabase
    .from("friendships").select("id").eq("requester", userId).eq("addressee", user.id).maybeSingle();
  if (theirs) {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", theirs.id);
  } else {
    await supabase.from("friendships").insert({ requester: user.id, addressee: userId, status: "pending" });
  }
  refresh();
}

export async function acceptFriendRequest(friendshipId: string) {
  const { user, supabase } = await me();
  await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId).eq("addressee", user.id);
  refresh();
}

/** Decline, cancel a sent request, or unfriend: all just delete the row. */
export async function removeFriendship(friendshipId: string) {
  const { supabase } = await me();
  await supabase.from("friendships").delete().eq("id", friendshipId);
  refresh();
}

export async function toggleReaction(itemId: string, emoji: string) {
  const { user, supabase } = await me();
  if (!(REACTION_EMOJI as readonly string[]).includes(emoji)) return;
  const { data: existing } = await supabase
    .from("reactions").select("emoji").eq("item_id", itemId).eq("user_id", user.id).maybeSingle();
  if (existing?.emoji === emoji) {
    await supabase.from("reactions").delete().eq("item_id", itemId).eq("user_id", user.id);
  } else if (existing) {
    await supabase.from("reactions").update({ emoji }).eq("item_id", itemId).eq("user_id", user.id);
  } else {
    await supabase.from("reactions").insert({ item_id: itemId, user_id: user.id, emoji });
  }
  refresh();
}

export async function setAudience(source: string, audience: "only-me" | "friends") {
  const { user, supabase } = await me();
  if (audience !== "only-me" && audience !== "friends") return;
  await supabase.from("connections").update({ audience }).eq("user_id", user.id).eq("source", source);
  refresh();
}

/** Pause or resume sharing for one linked app. Enforced in the database (feed visibility + sync). */
export async function setSourcePaused(source: string, paused: boolean) {
  const { user, supabase } = await me();
  await supabase.from("connections").update({ paused: Boolean(paused) }).eq("user_id", user.id).eq("source", source);
  revalidatePath("/", "layout");
}

/** Master switch: pause or resume sharing from every app at once. */
export async function setAllPaused(paused: boolean) {
  const { user, supabase } = await me();
  await supabase.from("profiles").update({ sharing_paused: Boolean(paused) }).eq("id", user.id);
  revalidatePath("/", "layout");
}
