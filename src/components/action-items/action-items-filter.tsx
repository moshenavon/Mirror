"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ActionItemFilter } from "@/lib/action-items";
import { labelForEmail, type Mentionable } from "@/lib/mentions";
import { Avatar } from "@/components/avatar";

type Props = {
  value: ActionItemFilter;
  onChange: (filter: ActionItemFilter) => void;
  /** Team members that can be filtered by. */
  members: Mentionable[];
  /** The signed-in user – offered as "assigned to me" instead of in the member list. */
  currentEmail: string;
};

const itemClass =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm font-medium transition hover:bg-primary-soft focus-visible:bg-primary-soft focus-visible:outline-none";

/** Short text for the active filter (also used in the empty states). */
export function filterLabel(filter: ActionItemFilter, members: Mentionable[]): string {
  switch (filter.kind) {
    case "all":
      return "כל המשימות";
    case "mine":
      return "המשימות שלי";
    case "unassigned":
      return "לא משויכות";
    case "member":
      return labelForEmail(filter.email, members);
  }
}

/** The "filter" button of the Action items screen and its menu. */
export function ActionItemsFilterMenu({ value, onChange, members, currentEmail }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const me = currentEmail.toLowerCase();
  const others = members.filter((m) => m.email !== me);
  const active = value.kind !== "all";

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(filter: ActionItemFilter) {
    onChange(filter);
    setOpen(false);
  }

  const option = (key: string, checked: boolean, filter: ActionItemFilter, content: React.ReactNode) => (
    <button
      key={key}
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      onClick={() => choose(filter)}
      className={`${itemClass} ${checked ? "bg-primary-soft" : ""}`}
    >
      <span aria-hidden className="w-4 shrink-0 text-center">
        {checked ? "✓" : ""}
      </span>
      {content}
    </button>
  );

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          active ? "border-accent bg-accent text-on-accent" : "border-border bg-surface hover:bg-primary-soft"
        }`}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" />
        </svg>
        {active ? `סינון: ${filterLabel(value, members)}` : "סינון"}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="סינון משימות"
          className="absolute start-0 top-full z-30 mt-2 max-h-80 w-64 animate-pop-in overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-lg"
        >
          {option("all", value.kind === "all", { kind: "all" }, "כל המשימות")}
          {option("mine", value.kind === "mine", { kind: "mine" }, "משויכות אליי")}
          {option("unassigned", value.kind === "unassigned", { kind: "unassigned" }, "לא משויכות")}
          {others.length > 0 && (
            <>
              <p className="mt-1 border-t border-border px-3 pb-1 pt-2 text-xs font-semibold text-muted">חברי צוות</p>
              {others.map((m) =>
                option(
                  m.email,
                  value.kind === "member" && value.email === m.email,
                  { kind: "member", email: m.email },
                  <>
                    <span aria-hidden className="flex">
                      <Avatar name={m.name ?? m.email} src={m.avatarUrl} size={24} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{m.name ?? m.email}</span>
                  </>,
                ),
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
