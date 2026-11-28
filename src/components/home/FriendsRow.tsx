import Link from "next/link";
import type { Friend } from "@/lib/home/data";
import { Avatar } from "./Avatar";

export function FriendsRow({ me, friends }: { me: { name: string; avatarUrl?: string | null }; friends: Friend[] }) {
  return (
    <section aria-label="Friends">
      <ul className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <li className="shrink-0">
          <Link href="/account" className="flex w-16 flex-col items-center gap-1.5">
            <span className="relative">
              <span className="block rounded-full border-2 border-dashed border-[var(--border)] p-[3px]">
                <Avatar name={me.name} src={me.avatarUrl} className="size-14" />
              </span>
              <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full border-2 border-[var(--bg)] bg-[var(--brand)] text-sm leading-none font-bold text-[var(--brand-ink)]">
                +
              </span>
            </span>
            <span className="w-full truncate text-center text-xs text-[var(--muted)]">You</span>
          </Link>
        </li>
        {friends.map((f) => (
          <li key={f.id} className="shrink-0">
            <Link href={`/profile?u=${encodeURIComponent(f.handle)}`} className="flex w-16 flex-col items-center gap-1.5">
              <span className="relative">
                <span
                  className={`block rounded-full p-[3px] ${
                    f.hasNew ? "bg-gradient-to-tr from-[var(--brand)] to-amber-400" : "border-2 border-[var(--border)]"
                  }`}
                >
                  <span className="block rounded-full border-2 border-[var(--bg)]">
                    <Avatar name={f.name} src={f.avatarUrl} className="size-14" />
                  </span>
                </span>
                {f.active && (
                  <span
                    title="Active now"
                    className="absolute right-0.5 bottom-0.5 size-4 rounded-full border-2 border-[var(--bg)] bg-[var(--win)]"
                  />
                )}
              </span>
              <span className="w-full truncate text-center text-xs">{f.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      {friends.length === 0 && (
        <p className="mt-1 text-xs text-[var(--muted)]">Friends who are active right now will show up here.</p>
      )}
    </section>
  );
}
