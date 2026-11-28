"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = [...parts[0]][0] ?? "?";
  const last = parts.length > 1 ? ([...parts[parts.length - 1]][0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * The one avatar used across the whole site: the person's uploaded photo (profiles.avatar_url)
 * cropped to a circle, or their initials on an orange tile when there is none or it fails to load.
 * `size` is in px; `className` can add layout classes (it should not change the size).
 */
export function Avatar({
  name,
  src,
  size = 40,
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const box = { width: size, height: size, minWidth: size } as const;
  if (src && failed !== src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={() => setFailed(src)}
        className={`aspect-square shrink-0 rounded-full bg-[var(--surface-2)] object-cover ${className}`}
        style={box}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-grid aspect-square shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--brand)] to-[#ff8a3d] leading-none font-semibold text-white select-none ${className}`}
      style={{ ...box, fontSize: Math.max(10, Math.round(size * 0.38)) }}
    >
      {initials(name)}
    </span>
  );
}
