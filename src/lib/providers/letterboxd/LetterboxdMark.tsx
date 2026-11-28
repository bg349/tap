/** Letterboxd's three-dot mark. */
export function LetterboxdMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 18" aria-hidden className={className}>
      <circle cx="6" cy="9" r="5.5" fill="#00e054" />
      <circle cx="15" cy="9" r="5.5" fill="#40bcf4" />
      <circle cx="24" cy="9" r="5.5" fill="#ff8000" />
    </svg>
  );
}
