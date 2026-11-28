import type { LetterboxdData } from "./api";
import { stars } from "./events";

export function LetterboxdSection({ data }: { data: LetterboxdData }) {
  if (!data.films.length) return <p className="text-sm text-[var(--muted)]">No films logged lately.</p>;
  return (
    <ul className="divide-y divide-[var(--border)]">
      {data.films.slice(0, 8).map((f) => (
        <li key={f.id}>
          <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 py-2.5">
            <span className="truncate font-medium">{f.title}{f.year ? <span className="text-[var(--muted)]"> {f.year}</span> : null}</span>
            <span className="shrink-0 text-sm text-[var(--muted)]">{f.rating ? stars(f.rating) : ""}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
