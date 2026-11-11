"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  buildSections,
  displayName,
  entriesLabel,
  flattenSlides,
  nextState,
  prevState,
  sectionLabel,
  sectionStarts,
  type InsightEntry,
  type InsightField,
  type InsightSection,
  type PresentationOrder,
  type PresenterState,
  type Reporter,
  type Slide,
} from "@/lib/insights";
import { formatDate } from "@/lib/dates";
import { finale } from "@/lib/confetti";
import { Avatar } from "@/components/avatar";
import { Emoji } from "@/components/emoji";
import { buttonClass } from "@/components/ui";
import { IncognitoIcon } from "@/components/incognito-icon";

type Props = {
  title: string;
  subtitle: string;
  fields: InsightField[];
  entries: InsightEntry[];
  /** Slide index (in field order) to start at; null shows the intro screen, where the order is chosen. */
  startAt: number | null;
  onClose: () => void;
};

const ORDERS: { id: PresentationOrder; label: string; icon: string; hint: string }[] = [
  { id: "fields", label: "לפי שדות", icon: "🗂️", hint: "שדה אחרי שדה, כל הדיווחים של כל שדה ברצף" },
  { id: "reporters", label: "לפי מדווחים", icon: "🙋", hint: "מדווח אחרי מדווח, כל הדיווחים שלו לפי סדר השדות" },
];

function stateKey(state: PresenterState): string {
  switch (state.kind) {
    case "slide":
      return `slide-${state.index}`;
    case "transition":
      return `transition-${state.fromSection}`;
    default:
      return state.kind;
  }
}

export function Presenter({ title, subtitle, fields, entries, startAt, onClose }: Props) {
  const [order, setOrder] = useState<PresentationOrder>("fields");
  const sections = useMemo(() => buildSections(fields, entries, order), [fields, entries, order]);
  const slides = useMemo(() => flattenSlides(sections), [sections]);
  const starts = useMemo(() => sectionStarts(sections), [sections]);
  const [state, setState] = useState<PresenterState>(
    startAt === null || !slides[startAt] ? { kind: "intro" } : { kind: "slide", index: startAt },
  );
  // +1 = forward, -1 = backward (drives the slide direction)
  const [direction, setDirection] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const next = useCallback(() => {
    setDirection(1);
    setState((s) => nextState(s, slides));
  }, [slides]);
  const prev = useCallback(() => {
    setDirection(-1);
    setState((s) => prevState(s, slides));
  }, [slides]);

  useEffect(() => {
    containerRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (state.kind === "done") void finale();
  }, [state.kind]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "SELECT" || target?.closest?.('[role="radiogroup"]')) return;
      // RTL: "forward" is to the left.
      if (["ArrowLeft", "PageDown", " ", "Enter"].includes(event.key)) {
        event.preventDefault();
        next();
      } else if (["ArrowRight", "PageUp", "Backspace"].includes(event.key)) {
        event.preventDefault();
        prev();
      } else if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  const currentSectionIndex =
    state.kind === "slide"
      ? slides[state.index].sectionIndex
      : state.kind === "transition"
        ? state.fromSection
        : state.kind === "done"
          ? sections.length - 1
          : -1;

  const progress =
    state.kind === "intro"
      ? 0
      : state.kind === "done"
        ? 1
        : state.kind === "slide"
          ? (state.index + 1) / slides.length
          : (starts[state.fromSection] + sections[state.fromSection].items.length) / slides.length;
  const jumpLabel = order === "fields" ? "מעבר לשדה" : "מעבר למדווח";
  const isSlide = state.kind === "slide";

  // In RTL "forward" content enters from the left.
  const variants = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? -80 : 80, scale: 0.96 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? 80 : -80, scale: 0.96 }),
  };

  return (
    <motion.div
      ref={containerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`מצגת רטרו – ${title}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col bg-background outline-none"
    >
      {/* top bar */}
      <div className="border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold">{title}</div>
            <div className="text-sm text-muted">{subtitle}</div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">{jumpLabel}</span>
            <select
              value={currentSectionIndex >= 0 ? currentSectionIndex : ""}
              onChange={(e) => {
                const idx = Number(e.target.value);
                if (!Number.isNaN(idx)) {
                  setDirection(1);
                  setState({ kind: "slide", index: starts[idx] });
                }
                containerRef.current?.focus();
              }}
              aria-label={jumpLabel}
              className="rounded-xl border border-border bg-surface px-2 py-1.5"
            >
              {currentSectionIndex < 0 && <option value="">{order === "fields" ? "בחירת שדה…" : "בחירת מדווח…"}</option>}
              {sections.map((s, i) => (
                <option key={s.key} value={i}>
                  {sectionLabel(s)} ({s.items.length})
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={onClose} className={buttonClass("ghost", "sm")} aria-label="סגירת המצגת">
            ✕ סגירה
          </button>
        </div>
        <div className="h-1.5 bg-border" aria-hidden>
          <motion.div
            className="h-full bg-accent"
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      </div>

      {/* stage */}
      <div className="flex min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-8 sm:py-8">
        <div
          className={`mx-auto w-full ${isSlide ? "flex max-w-7xl flex-col" : "my-auto max-w-3xl"}`}
          aria-live="polite"
        >
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={stateKey(state)}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className={isSlide ? "flex min-h-0 flex-1 flex-col" : undefined}
            >
              {state.kind === "intro" && (
                <div className="text-center">
                  <Emoji value="🚀" size={120} className="mx-auto" />
                  <h2 className="mt-4 text-5xl font-extrabold">רטרו</h2>
                  <p className="mt-2 text-xl text-muted">{subtitle}</p>

                  <div className="mt-8">
                    <p id="order-title" className="mb-2 font-semibold">
                      סדר ההצגה
                    </p>
                    <div
                      role="radiogroup"
                      aria-labelledby="order-title"
                      className="inline-flex gap-1 rounded-2xl border border-border bg-surface p-1 shadow-sm"
                    >
                      {ORDERS.map((o) => {
                        const active = order === o.id;
                        return (
                          <button
                            key={o.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setOrder(o.id)}
                            className={`relative rounded-xl px-4 py-2 font-semibold transition ${
                              active ? "text-on-accent" : "hover:bg-primary-soft"
                            }`}
                          >
                            {active && (
                              <motion.span
                                layoutId="retro-order-pill"
                                className="absolute inset-0 rounded-xl bg-accent shadow-sm"
                              />
                            )}
                            <span className="relative">
                              {o.icon} {o.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-sm text-muted">{ORDERS.find((o) => o.id === order)?.hint}</p>
                  </div>

                  <ol
                    key={order}
                    className={`mx-auto mt-6 grid gap-2 text-start ${
                      order === "reporters" && sections.length > 4 ? "max-w-2xl sm:grid-cols-2" : "max-w-md"
                    }`}
                  >
                    {sections.map((s, i) => (
                      <motion.li
                        key={s.key}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + Math.min(i, 12) * 0.05 }}
                        className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-sm"
                      >
                        <span className="text-muted">{i + 1}.</span>
                        {s.kind === "field" ? (
                          <Emoji value={s.field.emoji} size={36} />
                        ) : (
                          <ReporterAvatar reporter={s.reporter} size={36} />
                        )}
                        <span className="min-w-0 flex-1 truncate font-semibold">
                          {s.kind === "field" ? s.field.label : s.reporter.name}
                        </span>
                        <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-sm font-bold">{s.items.length}</span>
                      </motion.li>
                    ))}
                  </ol>
                  <button type="button" onClick={next} className={buttonClass("primary", "lg", "mt-8")}>
                    יאללה, מתחילים ←
                  </button>
                </div>
              )}

              {state.kind === "slide" && <SlideView slide={slides[state.index]} />}

              {state.kind === "transition" && (
                <TransitionView from={sections[state.fromSection]} next={sections[state.fromSection + 1]} />
              )}

              {state.kind === "done" && (
                <div className="text-center">
                  <Emoji value="🎉" size={150} className="mx-auto" />
                  <h2 className="mt-4 text-4xl font-extrabold">סיימנו את הרטרו!</h2>
                  <p className="mt-2 text-xl text-muted">עברנו על {entriesLabel(slides.length)}. כל הכבוד לצוות.</p>
                  <button type="button" onClick={onClose} className={buttonClass("primary", "lg", "mt-8")}>
                    סגירה
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* bottom controls */}
      <div className="border-t border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <button type="button" onClick={prev} disabled={state.kind === "intro"} className={buttonClass("secondary", "lg")}>
            → הקודם
          </button>
          <span className="text-sm text-muted" aria-live="polite">
            {state.kind === "slide" &&
              `${slides[state.index].indexInSection + 1} מתוך ${slides[state.index].sectionSize} · ${plainTitle(
                sections[slides[state.index].sectionIndex],
              )}`}
          </span>
          <button type="button" onClick={next} disabled={state.kind === "done"} className={buttonClass("primary", "lg")}>
            המשך ←
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function plainTitle(section: InsightSection): string {
  return section.kind === "field" ? section.field.label : section.reporter.name;
}

function ReporterAvatar({ reporter, size, className = "" }: { reporter: Reporter; size: number | string; className?: string }) {
  if (reporter.anonymous) {
    const style =
      typeof size === "number"
        ? { width: size, height: size, fontSize: Math.round(size * 0.6) }
        : { width: size, height: size, fontSize: `calc(${size} * 0.6)` };
    return (
      <span
        role="img"
        aria-label={reporter.name}
        style={style}
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-primary leading-none text-on-primary ${className}`}
      >
        <IncognitoIcon />
      </span>
    );
  }
  return <Avatar name={reporter.name} src={reporter.avatarUrl} size={size} className={className} />;
}

function TransitionView({ from, next }: { from: InsightSection; next: InsightSection | undefined }) {
  return (
    <div className="text-center">
      <p className="text-xl text-muted">
        {from.kind === "field" ? `סיימנו את ${from.field.emoji} ${from.field.label}` : `סיימנו עם ${from.reporter.name}`}
      </p>
      {next && (
        <>
          <p className="mt-8 text-lg text-muted">{next.kind === "field" ? "השדה הבא" : "המדווח הבא"}</p>
          {next.kind === "field" ? (
            <Emoji value={next.field.emoji} size={150} className="mx-auto mt-3" />
          ) : (
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
              className="mt-3 flex justify-center"
            >
              <ReporterAvatar reporter={next.reporter} size={150} className="shadow-xl ring-4 ring-accent" />
            </motion.div>
          )}
          <h2 className="mt-4 text-4xl font-extrabold">{plainTitle(next)}</h2>
          <p className="mt-2 text-muted">{entriesLabel(next.items.length)}</p>
        </>
      )}
    </div>
  );
}

const MIN_CONTENT_PX = 18;
const MAX_CONTENT_PX = 96;

/**
 * Picks the largest font size (MIN..MAX px) at which `text` still fits inside `box`,
 * so short entries become big on large screens and long ones stay readable.
 */
function useFitText(boxRef: React.RefObject<HTMLElement | null>, textRef: React.RefObject<HTMLElement | null>, content: string) {
  useLayoutEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;
    let available = 0;
    const fits = () => text.offsetHeight <= available && text.scrollWidth <= text.clientWidth + 1;
    const fit = () => {
      if (!box.clientHeight || !box.clientWidth) return; // not laid out (e.g. tests): keep the CSS size
      const style = getComputedStyle(box);
      // room for the text inside the box padding, with a little air for the card's shadow
      available = box.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - 4;
      let lo = MIN_CONTENT_PX;
      let hi = MAX_CONTENT_PX;
      text.style.fontSize = `${hi}px`;
      if (fits()) return;
      while (hi - lo > 0.5) {
        const mid = (lo + hi) / 2;
        text.style.fontSize = `${mid}px`;
        if (fits()) lo = mid;
        else hi = mid;
      }
      text.style.fontSize = `${Math.floor(lo)}px`;
    };
    fit();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [boxRef, textRef, content]);
}

function SlideView({ slide }: { slide: Slide }) {
  const name = displayName(slide.entry);
  const anonymous = slide.entry.is_anonymous;
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLQuoteElement>(null);
  useFitText(boxRef, textRef, slide.entry.content);
  // Name and avatar share one size that grows with the screen.
  const nameSize = "clamp(1.5rem, 4.5vmin, 3.25rem)";
  const avatarSize = `calc(${nameSize} * 1.4)`;

  return (
    <article className="flex min-h-0 flex-1 flex-col text-center" aria-label={`${slide.field.label} – ${name}`}>
      <header className="shrink-0">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft py-1.5 pe-4 ps-2 text-lg font-semibold">
          <Emoji value={slide.field.emoji} size={32} />
          {slide.field.label}
        </div>
        <div className="mt-4 flex items-center justify-center gap-3 sm:gap-4">
          <motion.div
            initial={{ scale: 0.4, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.08 }}
            className="flex"
          >
            <ReporterAvatar
              reporter={{ key: "", name, avatarUrl: slide.entry.author_avatar_url, anonymous }}
              size={avatarSize}
              className="shadow-md ring-[3px] ring-accent"
            />
          </motion.div>
          <h2 className="min-w-0 font-extrabold leading-tight" style={{ fontSize: nameSize }}>
            {name}
          </h2>
        </div>
        <time dateTime={slide.entry.created_at} className="mt-1 block text-muted">
          {formatDate(slide.entry.created_at)}
        </time>
      </header>
      <div ref={boxRef} className="mt-6 flex min-h-40 flex-1 items-center overflow-y-auto pt-5">
        <motion.blockquote
          ref={textRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="relative w-full whitespace-pre-wrap break-words rounded-[2rem] border border-border bg-surface px-[1em] py-[0.7em] text-2xl leading-snug shadow-sm sm:text-3xl"
        >
          <span aria-hidden className="absolute -top-6 right-6 text-6xl leading-none text-accent">
            ”
          </span>
          {slide.entry.content}
        </motion.blockquote>
      </div>
    </article>
  );
}
