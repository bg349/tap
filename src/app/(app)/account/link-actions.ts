"use server";

import { revalidatePath } from "next/cache";
import { connectable } from "@/lib/providers/registry";
import { createClient, getUser } from "@/lib/supabase/server";

/** Unlinks a Connect-button service and forgets its stored tokens. */
export async function unlinkService(source: string) {
  const user = await getUser();
  if (!user || !connectable.some((p) => p.id === source)) return;
  const supabase = await createClient();
  const { data: conn } = await supabase.from("connections").select("id").eq("user_id", user.id).eq("source", source).maybeSingle();
  if (!conn) return;
  await supabase.from("connection_secrets").delete().eq("connection_id", conn.id);
  await supabase.from("connections").delete().eq("id", conn.id);
  revalidatePath("/", "layout");
}
