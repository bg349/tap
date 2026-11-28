"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { navItems } from "./nav";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Left sidebar links (desktop). */
export function SidebarLinks() {
  const pathname = usePathname();
  return (
    <ul className="mt-6 flex flex-col gap-1">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);
        const cls = `flex items-center gap-4 rounded-xl px-3 py-3 text-[15px] transition-colors ${
          active ? "font-semibold text-[var(--fg)]" : "text-[var(--fg)]/80"
        }`;
        const inner = (
          <>
            <Icon name={item.id} filled={active && item.id === "home"} />
            <span>{item.label}</span>
            {!item.ready && <span className="ml-auto rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--muted)]">Soon</span>}
          </>
        );
        return (
          <li key={item.id}>
            {item.ready ? (
              <Link href={item.href} aria-current={active ? "page" : undefined} className={`${cls} hover:bg-[var(--surface-2)]`}>
                {inner}
              </Link>
            ) : (
              <span aria-disabled="true" className={`${cls} cursor-default opacity-50`}>{inner}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Bottom tab bar (mobile). */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-xl items-stretch justify-around">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const cls = `flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] ${
            active ? "text-[var(--brand)]" : "text-[var(--muted)]"
          }`;
          const inner = (
            <>
              <Icon name={item.id} className="size-6" filled={active && item.id === "home"} />
              <span className="sr-only">{item.label}</span>
            </>
          );
          return (
            <li key={item.id} className="flex-1">
              {item.ready ? (
                <Link href={item.href} aria-label={item.label} aria-current={active ? "page" : undefined} className={cls}>
                  {inner}
                </Link>
              ) : (
                <span aria-label={`${item.label} (coming soon)`} className={`${cls} opacity-40`}>{inner}</span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
