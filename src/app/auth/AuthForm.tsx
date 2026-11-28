"use client";

import Link from "next/link";
import { useActionState } from "react";
import { button, card, input, label } from "@/components/ui";
import { signIn, signUp } from "./actions";

export function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const isSignup = mode === "signup";
  const [state, action, pending] = useActionState(isSignup ? signUp : signIn, undefined);

  if (state?.notice) {
    return (
      <div className={`${card} mt-10`}>
        <div className="font-semibold">Almost there</div>
        <p className="mt-2 text-[var(--muted)]">{state.notice}</p>
      </div>
    );
  }

  return (
    <form action={action} className={`${card} mt-10 space-y-5`}>
      <div>
        <label htmlFor="email" className={label}>Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state?.values?.email}
          className={`${input} mt-2`}
        />
      </div>
      <div>
        <label htmlFor="password" className={label}>Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={isSignup ? 8 : undefined}
          autoComplete={isSignup ? "new-password" : "current-password"}
          className={`${input} mt-2`}
        />
        {isSignup && <p className="mt-2 text-xs text-[var(--muted)]">At least 8 characters.</p>}
      </div>
      {isSignup && (
        <div>
          <label htmlFor="chesscom" className={label}>
            Chess.com username <span className="opacity-70">(optional)</span>
          </label>
          <input
            id="chesscom"
            name="chesscom"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="e.g. hikaru"
            defaultValue={state?.values?.chesscom}
            className={`${input} mt-2`}
          />
        </div>
      )}

      {state?.error && (
        <p role="alert" className="text-sm text-[var(--loss)]">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className={`${button} w-full`}>
        {pending ? "One moment…" : isSignup ? "Create account" : "Sign in"}
      </button>

      <p className="text-center text-sm text-[var(--muted)]">
        {isSignup ? "Already have an account? " : "New to Tap? "}
        <Link href={isSignup ? "/login" : "/signup"} className="font-medium text-[var(--fg)] underline underline-offset-4">
          {isSignup ? "Sign in" : "Create one"}
        </Link>
      </p>
    </form>
  );
}
