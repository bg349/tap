"use client";

import { useState, useTransition } from "react";
import { reportUser } from "@/lib/social/reports";

const REASONS: [string, string][] = [
  ["spam", "Spam"],
  ["harassment", "Harassment"],
  ["inappropriate", "Inappropriate"],
  ["impersonation", "Impersonation"],
  ["other", "Something else"],
];

/** Small "Report" link that opens a dialog. Works for a whole profile or one comment. */
export function ReportButton({ userId, commentId, label = "Report" }: { userId: string; commentId?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function send() {
    start(async () => {
      const res = await reportUser(userId, reason, details, commentId);
      setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: "Thanks. We'll take a look." });
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setMsg(null); }}
        className="h-7 shrink-0 rounded-full px-2 text-xs text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
      >
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Report" onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--fg)] shadow-xl">
            <h2 className="text-lg font-semibold">Report {commentId ? "comment" : "profile"}</h2>
            {msg?.ok ? (
              <p className="mt-3 text-sm">{msg.text}</p>
            ) : (
              <>
                <div className="mt-3 flex flex-col gap-1.5">
                  {REASONS.map(([v, l]) => (
                    <label key={v} className="flex items-center gap-2 text-sm">
                      <input type="radio" name="reason" checked={reason === v} onChange={() => setReason(v)} /> {l}
                    </label>
                  ))}
                </div>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="Anything else we should know? (optional)"
                  className="mt-3 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                />
                {msg && <p role="alert" className="mt-2 text-sm text-[var(--brand)]">{msg.text}</p>}
              </>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-full px-4 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)]">
                {msg?.ok ? "Close" : "Cancel"}
              </button>
              {!msg?.ok && (
                <button type="button" onClick={send} disabled={pending}
                  className="h-10 rounded-full bg-[var(--brand)] px-4 text-sm font-semibold text-[var(--brand-ink)] disabled:opacity-40">
                  Send report
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
