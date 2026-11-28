"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";

export type DeleteState = { error?: string } | undefined;

/** Permanently deletes the signed-in user's account and everything linked to it. */
export async function deleteAccount(_prev: DeleteState, form: FormData): Promise<DeleteState> {
  const user = await getUser();
  if (!user) redirect("/login");
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== "delete") {
    return { error: "Type DELETE to confirm." };
  }

  const supabase = await createClient();

  // Remove uploaded photos first (the user's own session may delete files in their folder).
  const { data: files } = await supabase.storage.from("avatars").list(user.id, { limit: 100 });
  if (files?.length) await supabase.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`));

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: "Couldn't delete your account right now. Try again, or email us." };

  await supabase.auth.signOut();
  (await cookies()).delete("tap_onboarded");
  redirect("/?deleted=1");
}
