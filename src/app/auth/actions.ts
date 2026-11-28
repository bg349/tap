"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { chesscom } from "@/lib/providers/chesscom";
import { createClient, getUser } from "@/lib/supabase/server";

export type FormState = { error?: string; notice?: string; values?: Record<string, string> } | undefined;

const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  const email = field(form, "email");
  const password = String(form.get("password") ?? "");
  const rawChess = field(form, "chesscom");
  const values = { email, chesscom: rawChess };

  if (!email.includes("@")) return { error: "Enter a valid email.", values };
  if (password.length < 8) return { error: "Use at least 8 characters for your password.", values };

  let chess: string | undefined;
  if (rawChess) {
    const invalid = chesscom.validateAccount(rawChess);
    if (invalid) return { error: invalid, values };
    chess = chesscom.normalizeAccount(rawChess);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: chess ? { chesscom: chess } : {},
      emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/account`,
    },
  });
  if (error) return { error: error.message, values };

  // Supabase returns a user with no identities when the email is already registered.
  if (data.user && data.user.identities?.length === 0) {
    return { error: "That email already has an account. Try signing in.", values };
  }
  if (data.session) redirect("/account");
  return { notice: `Check ${email} for a link to confirm your account.` };
}

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const email = field(form, "email");
  const password = String(form.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const message = /confirm/i.test(error.message)
      ? "Confirm your email first. The link is in your inbox."
      : "That email and password don't match.";
    return { error: message, values: { email } };
  }
  redirect("/account");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function saveChessUsername(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login");

  const raw = field(form, "chesscom");
  const supabase = await createClient();

  if (!raw) {
    const { error } = await supabase
      .from("connections")
      .delete()
      .eq("user_id", user.id)
      .eq("source", "chesscom");
    return error ? { error: "Couldn't unlink right now. Try again." } : { notice: "Chess.com unlinked." };
  }

  const invalid = chesscom.validateAccount(raw);
  if (invalid) return { error: invalid, values: { chesscom: raw } };
  const username = chesscom.normalizeAccount(raw);

  const { error } = await supabase
    .from("connections")
    .upsert(
      { user_id: user.id, source: "chesscom", external_username: username, audience: "friends" },
      { onConflict: "user_id,source" },
    );
  if (error) return { error: "Couldn't save right now. Try again.", values: { chesscom: raw } };
  return { notice: "Saved.", values: { chesscom: username } };
}
