import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getProvider } from "@/lib/providers/registry";

export const maxDuration = 60;

const BATCH = 24;
const CONCURRENCY = 4;
const PER_ACCOUNT_MS = 8000;

interface Due {
  user_id: string;
  source: string;
  external_username: string;
}

/**
 * Background refresh of linked accounts, so friends' activity updates even when
 * nobody has Tap open. Called every minute by Supabase pg_cron (and daily by
 * Vercel Cron as a safety net). Bearer-protected with CRON_SECRET. The database
 * decides which accounts are due (stale, not paused, not backing off), dedupes
 * events, and records failures with exponential backoff.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "not configured" }, { status: 500 });
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data, error } = await db.rpc("cron_due_syncs", { p_secret: secret, p_max_age: "50 seconds", p_limit: BATCH });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const due = (data ?? []) as Due[];

  const stats = { due: due.length, ok: 0, failed: 0, newItems: 0 };
  const queue = [...due];
  async function worker() {
    for (let d = queue.shift(); d; d = queue.shift()) {
      try {
        const provider = getProvider(d.source);
        if (!provider) continue;
        const events = await Promise.race([
          provider.fetchEvents(d.external_username),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), PER_ACCOUNT_MS)),
        ]);
        const { data: n, error: e } = await db.rpc("cron_ingest", {
          p_secret: secret,
          target: d.user_id,
          p_source: d.source,
          rows: events.map((ev) => ({
            external_id: ev.externalId,
            kind: ev.kind,
            title: ev.title,
            detail: ev.detail ?? null,
            payload: ev.payload,
            occurred_at: ev.occurredAt,
          })),
        });
        if (e) throw e;
        stats.ok++;
        stats.newItems += typeof n === "number" ? n : 0;
      } catch {
        stats.failed++;
        await db.rpc("cron_mark_failed", { p_secret: secret, target: d.user_id, p_source: d.source });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, due.length) }, worker));
  console.log("sync", JSON.stringify(stats));
  return NextResponse.json(stats);
}
