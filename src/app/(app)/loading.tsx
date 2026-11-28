/** Instant skeleton while a signed-in page streams in. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-8" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-[var(--surface-2)]" />
      <div className="mt-6 flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--surface)]" />
        ))}
      </div>
    </div>
  );
}
