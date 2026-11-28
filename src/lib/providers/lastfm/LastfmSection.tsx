import type { LastfmData } from "./api";

/** Profile-card section: what they're playing now and recent tracks. */
export function LastfmSection({ data }: { data: LastfmData }) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold tracking-tight">Listening</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{data.playcount.toLocaleString("en-US")} scrobbles</p>
      {data.tracks.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">No plays yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {data.tracks.slice(0, 6).map((t, i) => (
            <li key={`${t.url}-${i}`}>
              <a href={t.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-3">
                {t.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.imageUrl} alt="" width={40} height={40} loading="lazy" decoding="async" className="size-10 shrink-0 rounded-md object-cover" />
                ) : (
                  <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-md bg-[#d51007] text-white">♪</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{t.title}</span>
                  <span className="block truncate text-xs text-[var(--muted)]">{t.artist}</span>
                </span>
                {t.nowPlaying && <span className="text-xs font-medium text-[#d51007]">Now</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
