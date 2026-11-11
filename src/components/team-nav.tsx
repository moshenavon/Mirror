"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

type Props = {
  teamId: string;
  canViewInsights: boolean;
  isAdmin: boolean;
};

export function TeamNav({ teamId, canViewInsights, isAdmin }: Props) {
  const pathname = usePathname();
  const base = `/teams/${teamId}`;
  const items = [
    { href: base, label: "דיווח", icon: "✍️" },
    { href: `${base}/history`, label: "הדיווחים שלי", icon: "🗂️" },
    { href: `${base}/achievements`, label: "הישגים", icon: "🏆" },
    ...(canViewInsights ? [{ href: `${base}/insights`, label: "תובנות", icon: "🔍" }] : []),
    ...(isAdmin ? [{ href: `${base}/settings`, label: "הגדרות", icon: "⚙️" }] : []),
  ];

  return (
    <nav aria-label="ניווט צוות" className="-mx-1 flex gap-1 overflow-x-auto pb-1">
      {items.map((item) => {
        const active = item.href === base ? pathname === base : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              active ? "text-on-accent" : "text-foreground hover:bg-primary-soft"
            }`}
          >
            {active && (
              <motion.span
                layoutId="team-nav-pill"
                className="absolute inset-0 rounded-xl bg-accent shadow-sm"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <span aria-hidden className="relative">
              {item.icon}
            </span>
            <span className="relative">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
