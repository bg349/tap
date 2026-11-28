"use client";

import { useId, useState, type ReactNode } from "react";

/** Header + smooth expand/collapse for a group. Item cards arrive pre-rendered as children. */
export function GroupToggle({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="mt-3 flex h-10 w-full items-center justify-between rounded-2xl bg-[var(--surface-2)] px-4 text-sm font-medium"
      >
        <span>{open ? "Hide" : `Show all ${count}`}</span>
        <span aria-hidden className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      <div
        id={id}
        inert={!open}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="group-compact flex max-h-[26rem] flex-col gap-2 overflow-y-auto overscroll-contain rounded-2xl pt-3 pr-1">{children}</div>
        </div>
      </div>
    </>
  );
}
