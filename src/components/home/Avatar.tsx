/* eslint-disable @next/next/no-img-element */
const hues = [12, 28, 160, 200, 260, 320, 350];

export function Avatar({
  name,
  src,
  className = "size-12",
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const hue = hues[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % hues.length];
  if (src) return <img src={src} alt="" className={`${className} rounded-full object-cover`} />;
  return (
    <span
      aria-hidden="true"
      className={`${className} inline-flex shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white`}
      style={{ background: `hsl(${hue} 65% 52%)` }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
