const COLORS = ["#ff5a36", "#7fa650", "#4c8bf5", "#a259ff", "#e0a100", "#14a7a0"];

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: COLORS[hash % COLORS.length], fontSize: size * 0.42 }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
