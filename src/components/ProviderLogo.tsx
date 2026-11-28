/** Simple brand marks (white glyph on the service's color) for the link screen. */
const MARKS: Record<string, { bg: string; glyph: React.ReactNode }> = {
  spotify: {
    bg: "#1db954",
    glyph: (
      <g fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="2.4">
        <path d="M7.5 15.2c3.2-1 6.6-.7 9.6 1" />
        <path d="M6.8 11.6c3.8-1.3 8-.9 11.4 1.1" />
        <path d="M6 8c4.4-1.5 9.4-1 13 1.2" />
      </g>
    ),
  },
  strava: {
    bg: "#fc4c02",
    glyph: <path fill="#fff" d="m10.6 5 5.2 10.2h-3.1L10.6 11 8.5 15.2H5.4L10.6 5Zm5.2 10.2 1.7 3.3 1.7-3.3h-2.4l-1 2-1-2Z" />,
  },
  steam: {
    bg: "#1b2838",
    glyph: (
      <g fill="#fff">
        <circle cx="15.6" cy="9.4" r="3.3" />
        <circle cx="15.6" cy="9.4" r="1.4" fill="#1b2838" />
        <path d="M5 13.4 9.7 15.3a2.4 2.4 0 1 0 1.2-1.7L8.8 12.7c.3-.2.7-.3 1-.3.6 0 1.1.2 1.5.5l2.3-3.7-.1-.1c-.8-.6-2-.9-3.2-.3L5 13.4Z" />
      </g>
    ),
  },
  chesscom: { bg: "#7fa650", glyph: <path fill="#fff" d="M8 18h8l-.7-2h-6.6L8 18Zm1.9-3.5h4.2c.1-1.7.6-3 1.7-4.2a3.8 3.8 0 0 0-7.6 0c1.1 1.2 1.6 2.5 1.7 4.2Z" /> },
};

export function ProviderLogo({ id, size = 40 }: { id: string; size?: number }) {
  const mark = MARKS[id];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={id} className="shrink-0">
      <rect width="24" height="24" rx="6" fill={mark?.bg ?? "#888"} />
      {mark?.glyph}
    </svg>
  );
}
