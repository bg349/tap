"use server";

import { createClient, getUser } from "@/lib/supabase/server";

const REASONS = ["spam", "harassment", "inappropriate", "impersonation", "other"] as const;

/** File a report against a profile (optionally a specific comment). Only the service role can read reports. */
export async function reportUser(reportedId: string, reason: string, details: string, commentId?: string): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Sign in to report." };
  if (user.id === reportedId) return { error: "You can't report yourself." };
  if (!(REASONS as readonly string[]).includes(reason)) return { error: "Pick a reason." };
  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    reported_id: reportedId,
    comment_id: commentId ?? null,
    reason,
    details: details.trim().slice(0, 500) || null,
  });
  if (error) return { error: error.code === "P0001" ? error.message : "Couldn't send that report." };
  return {};
}
