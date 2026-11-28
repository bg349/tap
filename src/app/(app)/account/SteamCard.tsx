import { button, card } from "@/components/ui";
import { AudienceToggle } from "./AudienceToggle";
import { StatusBadge } from "./VerifyCard";
import { SteamUnlink } from "./SteamUnlink";
import type { LinkView } from "@/lib/verification/config";

function SteamLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" role="img" aria-label="Steam" className="shrink-0">
      <rect width="24" height="24" rx="6" fill="#1b2838" />
      <g fill="#fff">
        <circle cx="15.6" cy="9.4" r="3.3" />
        <circle cx="15.6" cy="9.4" r="1.4" fill="#1b2838" />
        <path d="M5 13.4 9.7 15.3a2.4 2.4 0 1 0 1.2-1.7L8.8 12.7c.3-.2.7-.3 1-.3.6 0 1.1.2 1.5.5l2.3-3.7-.1-.1c-.8-.6-2-.9-3.2-.3L5 13.4Z" />
      </g>
    </svg>
  );
}

const MESSAGES: Record<string, string> = {
  taken: "Another Tap account has already verified that Steam profile.",
  failed: "Steam couldn't confirm the sign-in. Please try again.",
  state: "That sign-in expired. Please try again.",
};

/** Steam proves ownership by signing in with Steam itself (OpenID), so no code is needed. */
export function SteamCard({ view, result }: { view: LinkView; result?: string }) {
  const verified = view.status === "verified";
  return (
    <section className={`${card} mt-6`}>
      <div className="flex items-center gap-3">
        <SteamLogo />
        <div className="font-semibold">Steam</div>
        <StatusBadge status={view.status === "none" ? "none" : verified ? "verified" : "unverified"} />
      </div>
      {verified ? (
        <p className="mt-4 text-sm">Signed in with Steam. Ownership confirmed.</p>
      ) : (
        <>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Press the button, sign in on Steam&apos;s own page, and approve. Tap never sees your Steam password. Your Steam profile and game details need to be public for games to show.
          </p>
          <a href="/api/steam/start" className={`${button} mt-5 inline-flex items-center`}>
            {view.account ? "Verify with Steam" : "Sign in with Steam"}
          </a>
          {view.account && (
            <p className="mt-3 text-sm text-amber-500">Your earlier Steam link needs to be verified again. Nothing from it is shown until you do.</p>
          )}
        </>
      )}
      {result && MESSAGES[result] && <p role="alert" className="mt-3 text-sm text-[var(--loss)]">{MESSAGES[result]}</p>}
      {result === "ok" && <p className="mt-3 text-sm text-[var(--win)]">Steam verified.</p>}
      {verified && (
        <div className="mt-6 border-t border-[var(--border)] pt-5">
          <div className="text-sm font-medium">Who can see this activity?</div>
          <AudienceToggle source="steam" current={view.audience} />
        </div>
      )}
      {view.account && <SteamUnlink />}
    </section>
  );
}
