"use client";

import { useActionState } from "react";
import { button, input, label } from "@/components/ui";
import { saveChessUsername } from "../auth/actions";

export function ChessForm({ current }: { current: string | null }) {
  const [state, action, pending] = useActionState(saveChessUsername, undefined);
  return (
    <form action={action}>
      <label htmlFor="chesscom" className={label}>Your chess.com username</label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="chesscom"
          name="chesscom"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="e.g. hikaru"
          defaultValue={state?.values?.chesscom ?? current ?? ""}
          className={`${input} flex-1`}
        />
        <button type="submit" disabled={pending} className={button}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {state?.error && <p role="alert" className="mt-2 text-sm text-[var(--loss)]">{state.error}</p>}
      {state?.notice && <p className="mt-2 text-sm text-[var(--win)]">{state.notice}</p>}
    </form>
  );
}
