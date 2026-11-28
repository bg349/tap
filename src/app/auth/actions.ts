"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { chesscom } from "@/lib/providers/chesscom";
import { ensureProfile } from "@/lib/supabase/profile";
import { createClient, getUser, supabaseConfig } from "@/lib/supabase/server";

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
      emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/`,
    },
  });
  if (error) return { error: error.message, values };

  // Supabase returns a user with no identities when the email is already registered.
  if (data.user && data.user.identities?.length === 0) {
    return { error: "That email already has an account. Try signing in.", values };
  }
  if (data.session) redirect("/");
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
  redirect("/");
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
  await ensureProfile(supabase, user);

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

  // New links start private ("only-me"); re-saving keeps whatever audience the owner chose.
  const { data: existing } = await supabase
    .from("connections").select("id").eq("user_id", user.id).eq("source", "chesscom").maybeSingle();
  const { error } = existing
    ? await supabase
        .from("connections")
        .update({ external_username: username, last_synced_at: null })
        .eq("id", existing.id)
    : await supabase
        .from("connections")
        .insert({ user_id: user.id, source: "chesscom", external_username: username, audience: "only-me" });
  if (error) return { error: "Couldn't save right now. Try again.", values: { chesscom: raw } };
  return { notice: "Saved.", values: { chesscom: username } };
}

const OAUTH_PROVIDERS = { google: "Google", apple: "Apple" } as const;
type OAuthProvider = keyof typeof OAUTH_PROVIDERS;

/** Which social sign-ins are switched on in Supabase. Empty if Supabase can't be reached. */
async function enabledProviders(): Promise<Record<string, boolean>> {
  try {
    const { url, key } = supabaseConfig();
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, cache: "no-store" });
    if (!res.ok) return {};
    const body = (await res.json()) as { external?: Record<string, boolean> };
    return body.external ?? {};
  } catch {
    return {};
  }
}

export async function signInWithProvider(_prev: FormState, form: FormData): Promise<FormState> {
  const provider = field(form, "provider") as OAuthProvider;
  const name = OAUTH_PROVIDERS[provider];
  if (!name) return { error: "That sign-in option isn't available." };

  const enabled = await enabledProviders();
  if (!enabled[provider]) {
    return { error: `${name} sign-in isn't switched on yet. Use email for now.` };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${await siteOrigin()}/auth/confirm?next=/`, skipBrowserRedirect: true },
  });
  if (error || !data.url) return { error: `Couldn't reach ${name} right now. Try again.` };
  redirect(data.url);
}
