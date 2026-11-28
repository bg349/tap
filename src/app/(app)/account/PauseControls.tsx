"use client";

import { useOptimistic, useTransition } from "react";
import { setAllPaused, setSourcePaused } from "@/lib/social/actions";

function Switch({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-[var(--brand)]" : "bg-[var(--border)]"}`}
    >
      <span className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}

/** Per-app: sharing on (default) / paused. */
export function PauseToggle({ source, paused, masterPaused }: { source: string; paused: boolean; masterPaused: boolean }) {
  const [, start] = useTransition();
  const [value, setValue] = useOptimistic(paused);
  const sharing = !value && !masterPaused;
  return (
    <div className="mt-5 flex items-center gap-4 border-t border-[var(--border)] pt-5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">Share activity from this app</div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {masterPaused
            ? "Everything is paused with the master switch above."
            : sharing
              ? "On. New activity reaches the friends you chose."
              : "Paused. Nothing from this app shows to friends, and nothing new is picked up."}
        </p>
      </div>
      <Switch
        on={sharing}
        label="Share activity from this app"
        onToggle={() => start(async () => { setValue(!value); await setSourcePaused(source, !value); })}
      />
    </div>
  );
}

/** Master pause for all apps. */
export function MasterPause({ paused }: { paused: boolean }) {
  const [, start] = useTransition();
  const [value, setValue] = useOptimistic(paused);
  return (
    <section className="mt-8 flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{value ? "Sharing is paused" : "Sharing is on"}</div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {value
            ? "Friends see nothing from any app until you turn this back on. Your links and history are kept."
            : "Turn off to pause every app at once. Your links and history are kept."}
        </p>
      </div>
      <Switch
        on={!value}
        label="Share activity from all apps"
        onToggle={() => start(async () => { setValue(!value); await setAllPaused(!value); })}
      />
    </section>
  );
}
