import { Avatar as Base } from "@/components/Avatar";

/** Legacy wrapper: maps Tailwind `size-N` classes onto the shared Avatar's pixel size. */
export function Avatar({ name, src, className = "size-12" }: { name: string; src?: string | null; className?: string }) {
  const n = /\bsize-(\d+)\b/.exec(className)?.[1];
  return <Base name={name} src={src} size={n ? Number(n) * 4 : 48} />;
}
