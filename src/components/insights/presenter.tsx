"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  displayName,
  entriesLabel,
  flattenSlides,
  nextState,
  prevState,
  sectionStarts,
  type InsightSection,
  type PresenterState,
  type Slide,
} from "@/lib/insights";
import { formatDate } from "@/lib/dates";
import { finale } from "@/lib/confetti";
import { Avatar } from "@/components/avatar";
import { Emoji } from "@/components/emoji";
import { buttonClass } from "@/components/ui";

type Props = {
  title: string;
  subtitle: string;
  sections: InsightSection[];
  /** Slide index to start at; null shows the intro screen. */
  startAt: number | null;
  onClose: () => void;
};

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

export function Presenter({ title, subtitle, sections, startAt, onClose }: Props) {
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
      if (target?.tagName === "SELECT") return;
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
          : (starts[state.fromSection] + sections[state.fromSection].entries.length) / slides.length;

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
            <span className="sr-only">מעבר לשדה</span>
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
              aria-label="מעבר לשדה"
              className="rounded-xl border border-border bg-surface px-2 py-1.5"
            >
              {currentSectionIndex < 0 && <option value="">בחירת שדה…</option>}
              {sections.map((s, i) => (
                <option key={s.field.id} value={i}>
                  {s.field.emoji} {s.field.label} ({s.entries.length})
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
      <div className="flex flex-1 items-center justify-center overflow-y-auto overflow-x-hidden px-4 py-8">
        <div className="w-full max-w-3xl" aria-live="polite">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={stateKey(state)}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
            >
              {state.kind === "intro" && (
                <div className="text-center">
                  <Emoji value="🚀" size={120} className="mx-auto" />
                  <h2 className="mt-4 text-5xl font-extrabold">רטרו</h2>
                  <p className="mt-2 text-xl text-muted">{subtitle}</p>
                  <ol className="mx-auto mt-8 max-w-md space-y-2 text-start">
                    {sections.map((s, i) => (
                      <motion.li
                        key={s.field.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.08 }}
                        className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-sm"
                      >
                        <span className="text-muted">{i + 1}.</span>
                        <Emoji value={s.field.emoji} size={36} />
                        <span className="flex-1 font-semibold">{s.field.label}</span>
                        <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-sm font-bold">{s.entries.length}</span>
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
                <div className="text-center">
                  <p className="text-xl text-muted">
                    סיימנו את {sections[state.fromSection].field.emoji} {sections[state.fromSection].field.label}
                  </p>
                  {sections[state.fromSection + 1] && (
                    <>
                      <p className="mt-8 text-lg text-muted">השדה הבא</p>
                      <Emoji value={sections[state.fromSection + 1].field.emoji} size={150} className="mx-auto mt-3" />
                      <h2 className="mt-4 text-4xl font-extrabold">{sections[state.fromSection + 1].field.label}</h2>
                      <p className="mt-2 text-muted">{entriesLabel(sections[state.fromSection + 1].entries.length)}</p>
                    </>
                  )}
                </div>
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
              `${slides[state.index].indexInSection + 1} מתוך ${slides[state.index].sectionSize} · ${slides[state.index].field.label}`}
          </span>
          <button type="button" onClick={next} disabled={state.kind === "done"} className={buttonClass("primary", "lg")}>
            המשך ←
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SlideView({ slide }: { slide: Slide }) {
  const name = displayName(slide.entry);
  const anonymous = slide.entry.is_anonymous;
  return (
    <article className="text-center" aria-label={`${slide.field.label} – ${name}`}>
      <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-primary-soft py-1.5 pe-4 ps-2 text-lg font-semibold">
        <Emoji value={slide.field.emoji} size={32} />
        {slide.field.label}
      </div>
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.4, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.08 }}
        >
          {anonymous ? (
            <span
              role="img"
              aria-label={name}
              className="flex h-28 w-28 items-center justify-center rounded-full bg-primary text-6xl shadow-lg ring-4 ring-accent"
            >
              🎭
            </span>
          ) : (
            <Avatar name={name} src={slide.entry.author_avatar_url} size={112} className="shadow-lg ring-4 ring-accent" />
          )}
        </motion.div>
        <h2 className="mt-4 text-3xl font-extrabold">{name}</h2>
        <time dateTime={slide.entry.created_at} className="mt-1 text-muted">
          {formatDate(slide.entry.created_at)}
        </time>
      </div>
      <motion.blockquote
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="relative mt-8 whitespace-pre-wrap rounded-[2rem] border border-border bg-surface p-6 text-2xl leading-relaxed shadow-sm sm:p-10 sm:text-3xl"
      >
        <span aria-hidden className="absolute -top-6 right-6 text-6xl leading-none text-accent">
          ”
        </span>
        {slide.entry.content}
      </motion.blockquote>
    </article>
  );
}
