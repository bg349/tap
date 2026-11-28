"use client";

import { useState } from "react";
import { Icon } from "@/components/shell/Icon";

// Local-only for now; the friends/feed thread wires this to a real reaction.
export function ReactButton({ initialCount, initialReacted }: { initialCount: number; initialReacted: boolean }) {
  const [reacted, setReacted] = useState(initialReacted);
  const count = initialCount + (reacted === initialReacted ? 0 : reacted ? 1 : -1);
  return (
    <button
      type="button"
      onClick={() => setReacted((r) => !r)}
      aria-pressed={reacted}
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm transition-colors ${
        reacted ? "text-[var(--brand)]" : "text-[var(--muted)] hover:text-[var(--fg)]"
      }`}
    >
      <Icon name="heart" className="size-6" filled={reacted} />
      <span>{count > 0 ? count : "React"}</span>
    </button>
  );
}
