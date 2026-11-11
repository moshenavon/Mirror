"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type Props = {
  teamId: string;
  canViewInsights: boolean;
  isAdmin: boolean;
};

/** Width (px) of the faded strip at an edge that hides more tabs. */
const FADE = 28;

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function TeamNav({ teamId, canViewInsights, isAdmin }: Props) {
  const pathname = usePathname();
  const base = `/teams/${teamId}`;
  const items = [
    { href: base, label: "דיווח", icon: "✍️" },
    { href: `${base}/history`, label: "הדיווחים שלי", icon: "🗂️" },
    { href: `${base}/achievements`, label: "הישגים", icon: "🏆" },
    ...(canViewInsights ? [{ href: `${base}/insights`, label: "תובנות", icon: "🔍" }] : []),
    { href: `${base}/action-items`, label: "משימות", icon: "🎯" },
    ...(isAdmin ? [{ href: `${base}/settings`, label: "הגדרות", icon: "⚙️" }] : []),
  ];

  // The tab the user just tapped is highlighted straight away, instead of only
  // once the new page has arrived — otherwise it sits un-highlighted (white)
  // for the length of the navigation and then turns yellow.
  const [pending, setPending] = useState<{ href: string; from: string } | null>(null);
  const pendingHref = pending && pending.from === pathname ? pending.href : null;
  const isActive = (href: string) =>
    pendingHref ? pendingHref === href : href === base ? pathname === base : pathname.startsWith(href);

  // Fade whichever edge still has tabs scrolled out of view.
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // In RTL scrollLeft is 0 at the start and goes negative towards the end.
    const pos = Math.abs(el.scrollLeft);
    const start = pos > 1;
    const end = max - pos > 1;
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);
  useIsoLayoutEffect(() => {
    measure();
    const el = scroller.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, items.length]);

  // Keep the active tab in view (e.g. "הגדרות" on a narrow phone).
  const activeHref = items.find((item) => isActive(item.href))?.href;
  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>('[aria-current="page"]');
    el?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [activeHref]);

  // RTL: the start edge is on the right.
  const mask = `linear-gradient(to left, ${edges.start ? "transparent" : "#000"} 0, #000 ${FADE}px, #000 calc(100% - ${FADE}px), ${
    edges.end ? "transparent" : "#000"
  } 100%)`;

  return (
    <nav
      aria-label="ניווט צוות"
      className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div
        ref={scroller}
        onScroll={measure}
        data-fade-start={edges.start || undefined}
        data-fade-end={edges.end || undefined}
        style={{ maskImage: mask, WebkitMaskImage: mask }}
        className="flex gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:justify-center"
      >
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                if (item.href !== pathname) setPending({ href: item.href, from: pathname });
              }}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold ${
                active ? "bg-accent text-on-accent shadow-sm" : "text-foreground hover:bg-primary-soft"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
