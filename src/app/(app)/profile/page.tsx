import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { ShareButton } from "@/components/ShareButton";
import { providers } from "@/lib/providers/registry";
import type { LinkedIdentity, Provider, ProviderResult } from "@/lib/providers/types";

export default function ProfilePage(props: PageProps<"/profile">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:py-10">
      <header className="flex items-center justify-between">
        <Logo />
        <ShareButton />
      </header>
      <Suspense fallback={<CardSkeleton />}>
        <Profile searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

type Linked = {
  provider: Provider;
  account: string;
  validation: string | null;
  result?: ProviderResult<unknown>;
};

async function Profile({ searchParams }: { searchParams: PageProps<"/profile">["searchParams"] }) {
  const params = await searchParams;

  const linked: Linked[] = providers.flatMap((provider) => {
    const raw = params[provider.id];
    const input = Array.isArray(raw) ? raw[0] : raw;
    if (!input) return [];
    const validation = provider.validateAccount(input);
    return [{ provider, account: provider.normalizeAccount(input), validation }];
  });

  if (linked.length === 0) return <Empty />;

  await Promise.all(
    linked
      .filter((l) => !l.validation)
      .map(async (l) => {
        l.result = await l.provider.fetchAccount(l.account);
      }),
  );

  const source = linked.find((l) => l.result?.ok);
  const me = source?.result?.ok ? source.result.identity : undefined;

  return (
    <article className="mt-8 overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
      <ProfileHeader identity={me} source={source?.provider.name} fallbackName={linked[0].account} linked={linked} />
      <div className="divide-y divide-[var(--border)]">
        {linked.map((l) => (
          <ProviderBlock key={l.provider.id} linked={l} />
        ))}
      </div>
    </article>
  );
}

function flag(code?: string) {
  if (!code) return null;
  return String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

function ProfileHeader({
  identity,
  source,
  fallbackName,
  linked,
}: {
  identity?: LinkedIdentity;
  source?: string;
  fallbackName: string;
  linked: Linked[];
}) {
  const name = identity?.displayName ?? fallbackName;
  const joined = identity?.joinedAt
    ? new Date(identity.joinedAt * 1000).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;
  return (
    <div className="relative">
      <div
        className="h-28 sm:h-32"
        style={{
          background: `radial-gradient(120% 140% at 0% 0%, var(--brand) 0%, transparent 55%), radial-gradient(120% 140% at 100% 0%, ${linked[0].provider.accent} 0%, transparent 60%), var(--surface-2)`,
        }}
      />
      <div className="px-5 pb-5 sm:px-7">
        <div className="-mt-12 flex items-end justify-between gap-4">
          <div className="size-24 overflow-hidden rounded-3xl border-4 border-[var(--surface)] bg-[var(--surface-2)]">
            {identity?.avatarUrl ? (
              <Image
                src={identity.avatarUrl}
                alt=""
                width={96}
                height={96}
                className="size-full object-cover"
                unoptimized
              />
            ) : (
              <div className="grid size-full place-items-center text-3xl font-semibold text-[var(--muted)]">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <h1 className="mt-3 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          {name}
          {identity?.countryCode && (
            <span className="text-xl" title={identity.countryCode}>
              {flag(identity.countryCode)}
            </span>
          )}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          @{identity?.username ?? fallbackName}
          {joined ? ` · on ${source} since ${joined}` : ""}
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {linked.map((l) => (
            <li
              key={l.provider.id}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium"
            >
              <span className="size-2 rounded-full" style={{ background: l.provider.accent }} />
              {l.provider.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ProviderBlock({ linked }: { linked: Linked }) {
  const { provider, result, validation, account } = linked;
  return (
    <section className="px-5 py-6 sm:px-7">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <span className="size-2.5 rounded-full" style={{ background: provider.accent }} />
          {provider.name}
        </h2>
        {result?.ok && (
          <a
            href={result.identity.profileUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[var(--muted)] hover:text-[var(--fg)]"
          >
            View on {provider.name} ↗
          </a>
        )}
      </div>
      {validation ? (
        <ErrorNote message={validation} />
      ) : result && !result.ok ? (
        <ErrorNote message={result.message} />
      ) : result?.ok ? (
        provider.renderSection(result.data, result.identity)
      ) : (
        <ErrorNote message={`Couldn't load ${account}.`} />
      )}
    </section>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] p-5 text-sm">
      <p>{message}</p>
      <Link href="/" className="mt-2 inline-block font-medium underline underline-offset-4">
        Try another username
      </Link>
    </div>
  );
}

function Empty() {
  return (
    <div className="mt-16 text-center">
      <p className="text-[var(--muted)]">No accounts linked yet.</p>
      <Link href="/" className="mt-3 inline-block font-medium underline underline-offset-4">
        Link an account
      </Link>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="mt-8 animate-pulse overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="h-32 bg-[var(--surface-2)]" />
      <div className="space-y-3 p-7">
        <div className="h-6 w-40 rounded bg-[var(--surface-2)]" />
        <div className="h-4 w-24 rounded bg-[var(--surface-2)]" />
        <div className="grid grid-cols-4 gap-3 pt-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-[var(--surface-2)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
