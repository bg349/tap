"use client";

import { useActionState, useState, type ReactNode } from "react";
import { button, card, input, label } from "@/components/ui";
import { checkVerification, startVerification, unlinkAccount } from "@/lib/verification/actions";
import { CODE_SERVICES, type CodeSource, type LinkView } from "@/lib/verification/config";
import { AudienceToggle } from "./AudienceToggle";
import { PauseToggle } from "./PauseControls";

export function StatusBadge({ status }: { status: LinkView["status"] }) {
  const map = {
    verified: ["Verified", "text-[var(--win)]"],
    pending: ["Pending verification", "text-amber-500"],
    expired: ["Code expired", "text-[var(--loss)]"],
    unverified: ["Needs verification", "text-amber-500"],
    none: ["Not linked", "text-[var(--muted)]"],
  } as const;
  const [text, cls] = map[status];
  return (
    <span className={`ml-auto inline-flex items-center gap-1.5 text-sm font-medium ${cls}`}>
      {status === "verified" && (
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden><path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      )}
      {text}
    </span>
  );
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 flex items-center gap-2">
      <code className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-center font-mono text-lg tracking-widest select-all">{code}</code>
      <button
        type="button"
        className="h-12 rounded-xl border border-[var(--border)] px-4 text-sm font-medium"
        onClick={async () => {
          try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function Msg({ state }: { state: { error?: string; notice?: string } | undefined }) {
  return (
    <>
      {state?.error && <p role="alert" className="mt-3 text-sm text-[var(--loss)]">{state.error}</p>}
      {state?.notice && <p className="mt-3 text-sm text-[var(--win)]">{state.notice}</p>}
    </>
  );
}

function Unlink({ source }: { source: string }) {
  const [state, action, pending] = useActionState(unlinkAccount, undefined);
  return (
    <form
      action={action}
      className="mt-4"
      onSubmit={(e) => {
        if (!window.confirm("Disconnect this account? Its activity will be removed from Tap and you'll need to verify it again to reconnect.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="source" value={source} />
      <button type="submit" disabled={pending} className="text-sm text-[var(--loss)] underline underline-offset-4 disabled:opacity-50">
        {pending ? "Disconnecting…" : "Disconnect account"}
      </button>
      <Msg state={state} />
    </form>
  );
}

/** One card per service. Walks through: Not linked → Pending verification → Verified / Failed. */
export function VerifyCard({ source, view, icon, blurb, masterPaused = false }: { source: CodeSource; view: LinkView; icon: ReactNode; blurb?: string; masterPaused?: boolean }) {
  const svc = CODE_SERVICES[source];
  const [startState, startAction, starting] = useActionState(startVerification, undefined);
  const [checkState, checkAction, checking] = useActionState(checkVerification, undefined);
  const pending = view.status === "pending";
  const verified = view.status === "verified";
  return (
    <section className={`${card} mt-6`}>
      <div className="flex items-center gap-3">
        {icon}
        <div className="font-semibold">{svc.name}</div>
        <StatusBadge status={view.status} />
      </div>
      {blurb && <p className="mt-3 text-sm text-[var(--muted)]">{blurb}</p>}

      {verified ? (
        <p className="mt-4 text-sm">
          Linked to <span className="font-medium">{view.account}</span>. Ownership confirmed.
        </p>
      ) : (
        <>
          <form action={startAction} className="mt-5">
            <input type="hidden" name="source" value={source} />
            <label htmlFor={`acct-${source}`} className={label}>{svc.accountLabel}</label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id={`acct-${source}`}
                name="account"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={svc.placeholder}
                defaultValue={startState?.values?.account ?? view.account ?? ""}
                className={`${input} flex-1`}
              />
              <button type="submit" disabled={starting} className={button}>
                {starting ? "Working…" : pending || view.status === "expired" || view.status === "unverified" ? "Get a new code" : "Get a code"}
              </button>
            </div>
            <Msg state={startState} />
          </form>

          {pending && view.code && (
            <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="text-sm font-medium">Prove it&apos;s you: put this code in your {svc.name} {svc.field}</div>
              <CopyCode code={view.code} />
              <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-[var(--muted)]">
                {svc.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a href={svc.editUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-xl border border-[var(--border)] px-4 text-sm font-medium">
                  {source === "letterboxd" ? "Open Letterboxd" : `Open ${svc.name} settings`}
                </a>
                <form action={checkAction}>
                  <input type="hidden" name="source" value={source} />
                  <button type="submit" disabled={checking} className={`${button} h-11`}>{checking ? "Checking…" : "Check now"}</button>
                </form>
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">
                The code works once and expires in 30 minutes. You can remove it from your profile after it says Verified. Until verified, nothing from this account is shown to anyone.
              </p>
              <Msg state={checkState} />
            </div>
          )}
          {view.status === "expired" && (
            <p role="alert" className="mt-3 text-sm text-[var(--loss)]">That code expired. Press “Get a new code” to try again.</p>
          )}
        </>
      )}

      {verified && (
        <div className="mt-6 border-t border-[var(--border)] pt-5">
          <div className="text-sm font-medium">Who can see this activity?</div>
          <AudienceToggle source={source} current={view.audience} />
          <PauseToggle source={source} paused={view.paused} masterPaused={masterPaused} />
        </div>
      )}
      {view.account && <Unlink source={source} />}
    </section>
  );
}
