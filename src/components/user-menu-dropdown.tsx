"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { signOut } from "@/app/actions/auth";
import { Avatar } from "./avatar";

type Props = { name: string; avatarUrl?: string | null };

const itemClass =
  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm font-medium text-foreground transition hover:bg-primary-soft focus-visible:bg-primary-soft focus-visible:outline-none";

/** Profile picture that opens a floating menu with "my teams" and sign-out. */
export function UserMenuDropdown({ name, avatarUrl }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

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

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label="תפריט משתמש"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full p-0.5 transition hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:pe-3"
      >
        <Avatar name={name} src={avatarUrl} size={34} />
        <span className="hidden text-sm font-medium sm:inline">{name}</span>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute end-0 top-full z-30 mt-2 w-48 animate-pop-in rounded-xl border border-border bg-surface p-1.5 shadow-lg"
        >
          <p className="truncate px-3 pb-1.5 pt-1 text-xs text-muted sm:hidden">{name}</p>
          <Link href="/" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            <span aria-hidden>👥</span> הצוותים שלי
          </Link>
          <form action={signOut}>
            <button type="submit" role="menuitem" className={itemClass}>
              <span aria-hidden>🚪</span> התנתק
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
