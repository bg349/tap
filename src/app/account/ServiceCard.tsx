import { ProviderLogo } from "@/components/ProviderLogo";
import { card } from "@/components/ui";
import type { Provider } from "@/lib/providers/types";
import { AudienceToggle } from "./AudienceToggle";
import { unlinkService } from "./link-actions";

const MESSAGES: Record<string, { text: string; good?: boolean }> = {
  ok: { text: "Linked. Your activity will show up in your feed shortly.", good: true },
  denied: { text: "No problem. Nothing was linked." },
  failed: { text: "Couldn't finish linking. Please try again." },
  soon: { text: "Coming soon. This one isn't switched on yet." },
};

/** One Connect-button service on the account page: link, privacy, unlink. */
export function ServiceCard({
  provider,
  linked,
  audience,
  notice,
}: {
  provider: Provider;
  linked: string | null;
  audience: "only-me" | "friends";
  notice?: string;
}) {
  const connect = provider.connect!;
  const ready = connect.isConfigured();
  const message = notice ? MESSAGES[notice] : undefined;
  return (
    <section className={`${card} mt-6`}>
      <div className="flex items-center gap-3">
        <ProviderLogo id={provider.id} size={36} />
        <div className="min-w-0">
          <div className="font-semibold">{provider.name}</div>
          {linked && <div className="truncate text-sm text-[var(--muted)]">{connect.describe(linked)}</div>}
        </div>
        {linked ? (
          <span className="ml-auto text-sm text-[var(--win)]">Linked</span>
        ) : !ready ? (
          <span className="ml-auto rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--muted)]">Coming soon</span>
        ) : null}
      </div>

      {message && (
        <p role="status" className={`mt-4 text-sm ${message.good ? "text-[var(--win)]" : "text-[var(--muted)]"}`}>{message.text}</p>
      )}

      {linked ? (
        <>
          <div className="mt-6 border-t border-[var(--border)] pt-5">
            <div className="text-sm font-medium">Who can see this activity?</div>
            <AudienceToggle source={provider.id} current={audience} />
          </div>
          <form action={unlinkService.bind(null, provider.id)} className="mt-5">
            <button type="submit" className="text-sm text-[var(--muted)] underline-offset-4 hover:underline">
              Unlink {provider.name}
            </button>
          </form>
        </>
      ) : ready ? (
        <a
          href={`/connect/${provider.id}`}
          className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-[var(--fg)] px-5 font-medium text-[var(--bg)] transition-opacity hover:opacity-90"
        >
          Connect {provider.name}
        </a>
      ) : (
        <p className="mt-4 text-sm text-[var(--muted)]">Linking {provider.name} will be available soon. It stays private unless you choose to share it.</p>
      )}
    </section>
  );
}
