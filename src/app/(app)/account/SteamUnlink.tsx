"use client";

import { useActionState } from "react";
import { unlinkAccount } from "@/lib/verification/actions";

export function SteamUnlink() {
  const [state, action, pending] = useActionState(unlinkAccount, undefined);
  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="source" value="steam" />
      <button type="submit" disabled={pending} className="text-sm text-[var(--muted)] underline underline-offset-4 disabled:opacity-50">
        {pending ? "Unlinking…" : "Unlink"}
      </button>
      {state?.error && <p role="alert" className="mt-2 text-sm text-[var(--loss)]">{state.error}</p>}
    </form>
  );
}
