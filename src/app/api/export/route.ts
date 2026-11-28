import { NextResponse } from "next/server";
import { createClient, getUser } from "@/lib/supabase/server";

/** Download everything Tap holds about the signed-in user, as one JSON file. */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401, headers: { "Cache-Control": "no-store" } });

  const db = await createClient();
  const [profile, connections, items, reactions, friendships, closeFriends] = await Promise.all([
    db.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    // Never include connection_secrets (tokens).
    db.from("connections").select("source, external_username, audience, paused, last_synced_at, created_at").eq("user_id", user.id),
    db.from("items").select("*").eq("user_id", user.id).order("occurred_at", { ascending: false }).limit(5000),
    db.from("reactions").select("*").eq("user_id", user.id),
    db.from("friendships").select("*").or(`requester.eq.${user.id},addressee.eq.${user.id}`),
    db.from("close_friends").select("*").eq("owner_id", user.id),
  ]);

  const body = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email, createdAt: user.created_at },
    profile: profile.data,
    connections: connections.data ?? [],
    feedItems: items.data ?? [],
    reactions: reactions.data ?? [],
    friendships: friendships.data ?? [],
    closeFriends: closeFriends.data ?? [],
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="tap-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
