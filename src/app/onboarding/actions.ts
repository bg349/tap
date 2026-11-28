"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { handleProblem } from "@/lib/handle";
import { redeemInvite } from "@/lib/social/discovery";
import { ensureProfile } from "@/lib/supabase/profile";
import { createClient, getUser } from "@/lib/supabase/server";

export type ProfileState = { error?: string; notice?: string; field?: "handle" | "display_name" | "bio" } | undefined;

export type HandleCheck = { ok: boolean; message: string };

/** Live availability check. Own current handle counts as available. */
export async function checkHandle(raw: string): Promise<HandleCheck> {
  const handle = raw.trim();
  const problem = handleProblem(handle);
  if (problem) return { ok: false, message: problem };
  const user = await getUser();
  if (!user) return { ok: false, message: "Sign in first." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id").ilike("handle", handle).maybeSingle();
  if (error) return { ok: false, message: "Couldn't check right now. Try again." };
  if (data && data.id !== user.id) return { ok: false, message: "That one's taken. Try another." };
  return { ok: true, message: "Available" };
}

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

/** Creates (onboarding) or edits (account page) the signed-in user's profile. */
export async function saveProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await getUser();
  if (!user) redirect("/login");

  const handle = text(form, "handle");
  const displayName = text(form, "display_name");
  const bio = text(form, "bio");
  const mode = text(form, "mode");
  const avatar = form.get("avatar");
  const removeAvatar = text(form, "remove_avatar") === "1";

  const problem = handleProblem(handle);
  if (problem) return { error: problem, field: "handle" };
  if (displayName.length < 1 || displayName.length > 40) {
    return { error: "Display name should be 1 to 40 characters.", field: "display_name" };
  }
  if (bio.length > 160) return { error: "Keep your bio to 160 characters.", field: "bio" };

  const supabase = await createClient();
  await ensureProfile(supabase, user);

  const update: Record<string, unknown> = { handle, display_name: displayName, bio };
  if (mode === "onboarding") update.onboarded = true;

  if (avatar instanceof File && avatar.size > 0) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(avatar.type) || avatar.size > 2 * 1024 * 1024) {
      return { error: "Use a JPG, PNG or WebP image under 2 MB." };
    }
    const path = `${user.id}/avatar-${Date.now()}.${avatar.type === "image/png" ? "png" : avatar.type === "image/webp" ? "webp" : "jpg"}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, avatar, { contentType: avatar.type });
    if (upErr) return { error: "Couldn't upload that photo. Try a different one." };
    update.avatar_url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  } else if (removeAvatar) {
    update.avatar_url = null;
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) {
    if (error.code === "23505") return { error: "That username was just taken. Try another.", field: "handle" };
    if (error.code === "23514") return { error: handleProblem(handle) ?? "That username isn't allowed.", field: "handle" };
    return { error: "Couldn't save right now. Try again." };
  }

  if (mode === "onboarding") {
    (await cookies()).set("tap_onboarded", "1", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    const from = await redeemInvite(supabase, user.id);
    (await cookies()).delete("tap_ref");
    redirect(from ? `/welcome?from=${encodeURIComponent(from)}` : "/welcome");
  }
  return { notice: "Saved." };
}
