"use client";

import { useEffect } from "react";
import { refreshLive } from "@/lib/feed/actions";

const FAST_MS = 10_000;
const IDLE_MS = 60_000;

/**
 * Keeps Last.fm "now playing" close to real time while Tap is open: re-reads the
 * signed-in user's own Last.fm every ~10 seconds (only while the tab is visible).
 * New items reach friends' panels instantly over Realtime. Backs off to once a
 * minute when no Last.fm account is linked. Renders nothing.
 */
export function MusicPulse() {
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = FAST_MS;
    const run = async () => {
      if (stopped) return;
      if (document.visibilityState === "visible") {
        try {
          const r = await refreshLive();
          delay = r === -1 ? IDLE_MS : FAST_MS;
        } catch {
          delay = IDLE_MS;
        }
      }
      if (!stopped) timer = setTimeout(run, delay);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        void run();
      }
    };
    timer = setTimeout(run, 1500);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
