"use client";

import { useActionState } from "react";
import { button, card, input, label } from "@/components/ui";
import { AudienceToggle } from "./AudienceToggle";
import { saveLastfmUsername } from "./lastfm-actions";

/** Account-page card for linking Last.fm (covers Spotify and Apple Music listening). */
export function LastfmCard({ current, audience }: { current: string | null; audience: "only-me" | "friends" }) {
  const [state, action, pending] = useActionState(saveLastfmUsername, undefined);
  return (
    <section className={`${card} mt-6`}>
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#d51007] text-sm font-bold text-white">as</span>
        <div className="font-semibold">Last.fm</div>
        {current && <span className="ml-auto text-sm text-[var(--win)]">Linked</span>}
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Shows what you&apos;re listening to. Connect Spotify or Apple Music inside Last.fm and your plays appear here.
      </p>
      <form action={action} className="mt-5">
        <label htmlFor="lastfm" className={label}>Your Last.fm username</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="lastfm"
            name="lastfm"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="e.g. rj"
            defaultValue={state?.values?.lastfm ?? current ?? ""}
            className={`${input} flex-1`}
          />
          <button type="submit" disabled={pending} className={button}>{pending ? "Saving…" : "Save"}</button>
        </div>
        {state?.error && <p role="alert" className="mt-2 text-sm text-[var(--loss)]">{state.error}</p>}
        {state?.notice && <p className="mt-2 text-sm text-[var(--win)]">{state.notice}</p>}
      </form>
      {current && (
        <div className="mt-6 border-t border-[var(--border)] pt-5">
          <div className="text-sm font-medium">Who can see this activity?</div>
          <AudienceToggle source="lastfm" current={audience} />
        </div>
      )}
    </section>
  );
}
