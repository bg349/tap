export function LivePill({ label = "Live" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--brand)_14%,transparent)] px-2 py-0.5 text-[11px] font-bold tracking-wider text-[var(--brand)] uppercase">
      <span className="live-dot" style={{ width: 6, height: 6 }} />
      {label}
    </span>
  );
}
