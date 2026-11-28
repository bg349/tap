"use client";

import { useActionState } from "react";
import { button, card, input, label } from "@/components/ui";
import { AudienceToggle } from "./AudienceToggle";
import { saveSteamAccount } from "./steam-actions";

function SteamLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" role="img" aria-label="Steam" className="shrink-0">
      <rect width="24" height="24" rx="6" fill="#1b2838" />
      <g fill="#fff">
        <circle cx="15.6" cy="9.4" r="3.3" />
        <circle cx="15.6" cy="9.4" r="1.4" fill="#1b2838" />
        <path d="M5 13.4 9.7 15.3a2.4 2.4 0 1 0 1.2-1.7L8.8 12.7c.3-.2.7-.3 1-.3.6 0 1.1.2 1.5.5l2.3-3.7-.1-.1c-.8-.6-2-.9-3.2-.3L5 13.4Z" />
      </g>
    </svg>
  );
}

/** Link card for Steam: paste a profile URL, vanity name or SteamID. Private by default. */
export function SteamCard({ current, audience }: { current: string | null; audience: "only-me" | "friends" }) {
  const [state, action, pending] = useActionState(saveSteamAccount, undefined);
  const linked = Boolean(current) && state?.notice !== "Steam unlinked.";
  return (
    <section className={`${card} mt-6`}>
      <div className="flex items-center gap-3">
        <SteamLogo />
        <div className="font-semibold">Steam</div>
        {linked && <span className="ml-auto text-sm text-[var(--win)]">Linked</span>}
      </div>
      <form action={action} className="mt-5">
        <label htmlFor="steam" className={label}>Your Steam profile link or name</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="steam"
            name="steam"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="steamcommunity.com/id/yourname"
            defaultValue={state?.values?.steam ?? (current ? `steamcommunity.com/profiles/${current}` : "")}
            className={`${input} flex-1`}
          />
          <button type="submit" disabled={pending} className={button}>{pending ? "Saving…" : "Save"}</button>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">Your Steam profile and game details need to be public for games to show.</p>
        {state?.error && <p role="alert" className="mt-2 text-sm text-[var(--loss)]">{state.error}</p>}
        {state?.notice && <p className="mt-2 text-sm text-[var(--win)]">{state.notice}</p>}
      </form>
      {linked && (
        <div className="mt-6 border-t border-[var(--border)] pt-5">
          <div className="text-sm font-medium">Who can see this activity?</div>
          <AudienceToggle source="steam" current={audience} />
        </div>
      )}
    </section>
  );
}
