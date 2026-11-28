"use client";

import { useState } from "react";

/** Shares the signup link so a friend can join and show up in your feed. */
export function InviteButton({ className = "" }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  async function invite() {
    const url = `${window.location.origin}/signup`;
    const text = "Join me on Tap and see what I'm up to live.";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Tap", text, url });
        return;
      } catch {
        /* cancelled: fall through to copy */
      }
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button type="button" onClick={invite} className={className}>
      {copied ? "Invite link copied" : "Invite a friend"}
    </button>
  );
}
