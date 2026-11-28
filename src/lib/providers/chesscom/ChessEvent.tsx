import type { FeedItem } from "../types";
import { modeName, resultWord } from "./events";

const TONE = { win: "var(--win)", loss: "var(--loss)", draw: "var(--draw-text)" } as const;

/** One chess.com row in the feed: a finished game or a rating milestone. */
export function ChessEvent({ item }: { item: FeedItem }) {
  const p = item.payload as Record<string, string | number | boolean | null>;
  const url = typeof p.url === "string" ? p.url : undefined;

  if (item.kind === "milestone") {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-4">
        <span className="text-2xl" aria-hidden>🏆</span>
        <div className="min-w-0">
          <div className="font-semibold">{item.title}</div>
          <div className="text-sm text-[var(--muted)]">{item.detail}</div>
        </div>
      </div>
    );
  }

  const outcome = (p.outcome as keyof typeof TONE) ?? "draw";
  const delta = typeof p.delta === "number" ? p.delta : null;
  const word = outcome === "win" ? "Won" : outcome === "loss" ? "Lost" : "Draw";
  const body = (
    <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-4">
      <span
        className="grid size-11 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
        style={{ background: TONE[outcome] }}
      >
        {outcome === "win" ? "W" : outcome === "loss" ? "L" : "D"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{item.title}</div>
        <div className="truncate text-sm text-[var(--muted)]">
          {word} by {resultWord(String(p.result ?? ""))} · {modeName(String(p.timeClass ?? ""))} · vs {p.opponentRating}
        </div>
      </div>
      <div className="text-right">
        <div className="font-semibold tabular-nums">{p.rating}</div>
        {delta !== null && delta !== 0 && (
          <div className="text-xs font-medium tabular-nums" style={{ color: delta > 0 ? "var(--win)" : "var(--loss)" }}>
            {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
          </div>
        )}
      </div>
    </div>
  );
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="block transition-opacity hover:opacity-90">
      {body}
    </a>
  ) : (
    body
  );
}
