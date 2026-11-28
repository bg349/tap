"use client";

import { useOptimistic, useTransition } from "react";
import { toggleReaction } from "@/lib/social/actions";

type Reaction = { emoji: string; count: number; mine: boolean };

export function ReactionBar({ itemId, reactions }: { itemId: string; reactions: Reaction[] }) {
  const [, start] = useTransition();
  const [shown, flip] = useOptimistic(reactions, (cur, emoji: string) => {
    const hadMine = cur.find((r) => r.mine)?.emoji;
    return cur.map((r) => {
      if (r.emoji === emoji) return r.mine ? { ...r, mine: false, count: r.count - 1 } : { ...r, mine: true, count: r.count + 1 };
      if (r.emoji === hadMine) return { ...r, mine: false, count: r.count - 1 };
      return r;
    });
  });

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Reactions">
      {shown.map((r) => (
        <button
          key={r.emoji}
          type="button"
          aria-pressed={r.mine}
          onClick={() => start(async () => { flip(r.emoji); await toggleReaction(itemId, r.emoji); })}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors ${
            r.mine
              ? "border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_12%,transparent)]"
              : "border-[var(--border)] hover:bg-[var(--surface-2)]"
          }`}
        >
          <span>{r.emoji}</span>
          {r.count > 0 && <span className="tabular-nums text-[var(--muted)]">{r.count}</span>}
        </button>
      ))}
    </div>
  );
}
