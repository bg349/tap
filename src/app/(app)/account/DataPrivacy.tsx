"use client";

import { useActionState } from "react";
import { button, card, input } from "@/components/ui";
import { deleteAccount, type DeleteState } from "./data-actions";

export function DataPrivacy() {
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteAccount, undefined);
  return (
    <section className={`${card} mt-6`}>
      <h2 className="font-semibold">Your data</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Download everything Tap holds about you, or delete your account for good.
      </p>
      <a
        href="/api/export"
        download
        className="mt-4 inline-flex h-12 items-center justify-center rounded-xl border border-[var(--border)] px-5 font-medium"
      >
        Download my data
      </a>

      <details className="mt-6 border-t border-[var(--border)] pt-5">
        <summary className="cursor-pointer text-sm font-medium text-[var(--muted)]">Delete my account</summary>
        <form action={action} className="mt-4 space-y-3">
          <p className="text-sm text-[var(--muted)]">
            This removes your profile, linked accounts, feed activity, reactions and friendships. It can&apos;t be undone.
            Type <strong>DELETE</strong> to confirm.
          </p>
          <input name="confirm" autoComplete="off" className={input} placeholder="DELETE" aria-label="Type DELETE to confirm" />
          {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
          <button type="submit" disabled={pending} className={`${button} !bg-red-600 !text-white`}>
            {pending ? "Deleting…" : "Delete everything"}
          </button>
        </form>
      </details>
    </section>
  );
}
