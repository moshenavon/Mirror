"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
              active ? "bg-accent text-on-accent shadow-sm" : "text-foreground hover:bg-primary-soft"
            }`}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
