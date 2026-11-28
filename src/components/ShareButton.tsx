"use client";

import { useState } from "react";

export function ShareButton() {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url });
        return;
      } catch {
        // User cancelled or share failed; fall back to copying.
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button
      type="button"
      onClick={share}
      className="h-9 rounded-full bg-[var(--fg)] px-4 text-sm font-medium text-[var(--bg)] transition-opacity hover:opacity-90"
    >
      {copied ? "Link copied" : "Share profile"}
    </button>
  );
}
