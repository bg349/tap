/** Shared feed row for activity from linked services: art or icon, a title, a detail line, and an optional link. */
export function ActivityRow({
  title,
  detail,
  imageUrl,
  emoji,
  href,
}: {
  title: string;
  detail?: string | null;
  imageUrl?: string;
  emoji?: string;
  href?: string;
}) {
  const body = (
    <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-3">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" loading="lazy" className="size-12 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--surface)] text-2xl" aria-hidden>
          {emoji ?? "✨"}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{title}</div>
        {detail && <div className="truncate text-sm text-[var(--muted)]">{detail}</div>}
      </div>
    </div>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="block transition-opacity hover:opacity-90">
      {body}
    </a>
  ) : (
    body
  );
}
