"use client";

import { useEffect } from "react";

/** Remembers who invited this visitor for 30 days, so onboarding can send the friend request. */
export function RefCookie({ handle }: { handle: string }) {
  useEffect(() => {
    document.cookie = `tap_ref=${encodeURIComponent(handle)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  }, [handle]);
  return null;
}
