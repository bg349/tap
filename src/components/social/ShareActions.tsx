"use client";

import { useState } from "react";

const btn =
  "inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] px-4 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]";

/** Share an invite link: native share sheet where available, plus text/WhatsApp/email deep links and copy. */
export function ShareActions({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const text = "Join me on Tap and see what I'm up to live.";
  const body = encodeURIComponent(`${text} ${url}`);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Tap", text, url });
        return;
      } catch {
        /* cancelled: fall through to copy */
      }
    }
    await copy();
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={share} className="h-11 rounded-full bg-[var(--brand)] px-5 text-sm font-semibold text-[var(--brand-ink)]">
        Share invite
      </button>
      <button type="button" onClick={copy} className={btn}>{copied ? "Copied" : "Copy link"}</button>
      <a href={`sms:?&body=${body}`} className={btn}>Text / iMessage</a>
      <a href={`https://wa.me/?text=${body}`} target="_blank" rel="noopener noreferrer" className={btn}>WhatsApp</a>
      <a href={`mailto:?subject=${encodeURIComponent("Join me on Tap")}&body=${body}`} className={btn}>Email</a>
    </div>
  );
}
