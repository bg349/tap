"use client";

import { useOptimistic, useTransition } from "react";
import { setAudience } from "@/lib/social/actions";

type Audience = "only-me" | "friends";
const OPTIONS: { value: Audience; label: string; hint: string }[] = [
  { value: "only-me", label: "Only me", hint: "Private. Nothing from this account reaches your friends' feeds." },
  { value: "friends", label: "Friends", hint: "Your accepted friends see new games and milestones in their feed." },
];

export function AudienceToggle({ source, current }: { source: string; current: Audience }) {
  const [, start] = useTransition();
  const [value, setValue] = useOptimistic(current);
  return (
    <div className="mt-3">
      <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1" role="radiogroup" aria-label="Audience">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => start(async () => { setValue(o.value); await setAudience(source, o.value); })}
            className={`h-9 rounded-full px-4 text-sm font-medium transition-colors ${
              value === o.value ? "bg-[var(--brand)] text-[var(--brand-ink)]" : "text-[var(--muted)]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">{OPTIONS.find((o) => o.value === value)?.hint}</p>
    </div>
  );
}
