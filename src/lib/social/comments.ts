"use server";

import { COMMENT_MAX } from "@/lib/social/comment-limits";
import { hasProfanity } from "@/lib/social/profanity";
import { createClient, getUser } from "@/lib/supabase/server";


/** Post a comment. RLS + a database trigger enforce visibility, rate limits and duplicates. */
export async function addComment(itemId: string, body: string): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Sign in to comment." };
  const text = body.trim();
  if (!text) return { error: "Write something first." };
  if (text.length > COMMENT_MAX) return { error: `Keep it under ${COMMENT_MAX} characters.` };
  if (hasProfanity(text)) return { error: "Please keep it friendly: that comment has language we don't allow." };
  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({ item_id: itemId, user_id: user.id, body: text });
  if (error) {
    if (error.code === "P0001") return { error: error.message };
    return { error: "Couldn't post that comment." };
  }
  return {};
}

/** Delete a comment: RLS allows the author or the owner of the item. */
export async function deleteComment(commentId: string): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Sign in first." };
  const supabase = await createClient();
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  return error ? { error: "Couldn't delete that." } : {};
}
