import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProvider } from "@/lib/providers/registry";

/**
 * Pulls new activity for the signed-in user and their friends (whoever hasn't
 * synced in the last few minutes) and stores it as feed items. Safe to call on
 * every feed load: the database hands back only stale accounts and dedupes
 * events, so repeat calls are cheap.
 */
export async function syncFeed(supabase: SupabaseClient) {
  const { data: stale } = await supabase.rpc("stale_syncs", { max_age: "10 minutes" });
  if (!stale?.length) return;

  await Promise.allSettled(
    (stale as { user_id: string; source: string; external_username: string }[]).map(async (s) => {
      const provider = getProvider(s.source);
      if (!provider) return;
      const events = await provider.fetchEvents(s.external_username);
      const { error } = await supabase.rpc("ingest_items", {
        target: s.user_id,
        p_source: s.source,
        rows: events.map((e) => ({
          external_id: e.externalId,
          kind: e.kind,
          title: e.title,
          detail: e.detail ?? null,
          payload: e.payload,
          occurred_at: e.occurredAt,
        })),
      });
      if (error) throw error;
    }),
  );
}
