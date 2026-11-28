"use server";

import { createClient as createPlainClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/auth/actions";
import { chesscom } from "@/lib/providers/chesscom";
import { lastfm } from "@/lib/providers/lastfm";
import { letterboxd } from "@/lib/providers/letterboxd";
import { xbox } from "@/lib/providers/xbox";
import { lichess } from "@/lib/providers/lichess";
import { ensureProfile } from "@/lib/supabase/profile";
import { createClient, getUser } from "@/lib/supabase/server";
import { CODE_SERVICES, isCodeSource, type CodeSource } from "./config";
import { findCode } from "./check";

const providers = { chesscom, lastfm, letterboxd, xbox, lichess } as const;

/** Step 1: the user names the account; we hand back a one-time code to put on its public profile. */
export async function startVerification(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");
  const source = String(form.get("source") ?? "");
  if (!isCodeSource(source)) return { error: "That service isn't supported." };
  const raw = String(form.get("account") ?? "").trim();
  const supabase = await createClient();
  await ensureProfile(supabase, user);

  if (!raw) return { error: "Enter your username first.", values: { account: raw } };
  const p = providers[source];
  const invalid = p.validateAccount(raw);
  if (invalid) return { error: invalid, values: { account: raw } };
  const account = p.normalizeAccount(raw);

  const { data: code, error } = await supabase.rpc("start_verification", { p_source: source, p_account: account });
  if (error) return { error: "Couldn't start verification. Try again.", values: { account: raw } };
  revalidatePath("/account");
  return { notice: code ? "Code ready. Follow the steps below." : "Already verified.", values: { account } };
}

/** Step 2: read the public profile, look for the code, and only then mark the link verified. */
export async function checkVerification(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");
  const source = String(form.get("source") ?? "");
  if (!isCodeSource(source)) return { error: "That service isn't supported." };
  const name = CODE_SERVICES[source].name;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("connections")
    .select("external_username, verify_code, verify_expires_at, verified_at")
    .eq("user_id", user.id)
    .eq("source", source)
    .maybeSingle();
  if (row?.verified_at) return { notice: "Already verified." };
  if (!row?.verify_code || !row.external_username) return { error: "Start verification first." };
  if (new Date(row.verify_expires_at ?? 0) < new Date()) {
    return { error: "That code expired. Press “Get a new code” and try again." };
  }

  const proof = await findCode(source as CodeSource, row.external_username, row.verify_code);
  if (proof === "unreachable") return { error: `Couldn't reach ${name} just now. Wait a moment and press Check now again.` };
  if (proof === "no_such_account") return { error: `${name} says “${row.external_username}” doesn't exist.` };
  if (proof === "missing") {
    return {
      error: `We couldn't see your code on ${row.external_username}'s ${name} profile yet. Make sure you saved it in ${CODE_SERVICES[source].field}, wait a few seconds, and try again.`,
    };
  }

  const secret = process.env.CRON_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!secret || !url || !key) return { error: "Verification isn't switched on yet. Check back soon." };
  const db = createPlainClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: result, error } = await db.rpc("finish_verification", {
    p_secret: secret,
    p_user: user.id,
    p_source: source,
    p_account: row.external_username,
    p_code: row.verify_code,
  });
  if (error) return { error: "Couldn't finish verifying. Try again." };
  if (result === "taken") {
    return { error: `Another Tap account has already verified “${row.external_username}”. If it's yours, contact support.` };
  }
  if (result !== "ok") return { error: "That code expired. Press “Get a new code” and try again." };
  revalidatePath("/account");
  return { notice: `${name} verified.` };
}

/** Remove a link (verified or not). */
export async function unlinkAccount(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");
  const source = String(form.get("source") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("connections").delete().eq("user_id", user.id).eq("source", source);
  if (error) return { error: "Couldn't unlink right now. Try again." };
  // Disconnecting also removes that app's shared activity (owner can delete own items).
  await supabase.from("items").delete().eq("user_id", user.id).eq("source", source);
  revalidatePath("/account");
  return { notice: "Unlinked." };
}
