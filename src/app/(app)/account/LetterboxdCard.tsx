"use client";

import { useActionState } from "react";
import { button, input, label } from "@/components/ui";
import { LetterboxdMark } from "@/lib/providers/letterboxd/LetterboxdMark";
import { saveLetterboxdUsername } from "@/lib/providers/letterboxd/actions";
import { AudienceToggle } from "./AudienceToggle";

export function LetterboxdCard({ current, audience }: { current: string | null; audience: "only-me" | "friends" }) {
  const [state, action, pending] = useActionState(saveLetterboxdUsername, undefined);
  return (
    <>
      <div className="flex items-center gap-3">
        <LetterboxdMark className="h-4 w-7 shrink-0" />
        <div className="font-semibold">Letterboxd</div>
        {current && <span className="ml-auto text-sm text-[var(--win)]">Linked</span>}
      </div>
      <form action={action} className="mt-5">
        <label htmlFor="letterboxd" className={label}>Your Letterboxd username</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="letterboxd"
            name="letterboxd"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="e.g. dave"
            defaultValue={state?.values?.letterboxd ?? current ?? ""}
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
          <AudienceToggle source="letterboxd" current={audience} />
        </div>
      )}
    </>
  );
}
