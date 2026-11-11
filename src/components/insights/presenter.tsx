"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  displayName,
  flattenSlides,
  nextState,
  prevState,
  sectionStarts,
  type InsightSection,
  type PresenterState,
} from "@/lib/insights";
import { formatDate } from "@/lib/dates";
import { Avatar } from "@/components/avatar";
import { buttonClass } from "@/components/ui";

type Props = {
  title: string;
  subtitle: string;
  sections: InsightSection[];
  /** Slide index to start at; null shows the intro screen. */
  startAt: number | null;
  onClose: () => void;
};

export function Presenter({ title, subtitle, sections, startAt, onClose }: Props) {
  const slides = useMemo(() => flattenSlides(sections), [sections]);
  const starts = useMemo(() => sectionStarts(sections), [sections]);
  const [state, setState] = useState<PresenterState>(
    startAt === null || !slides[startAt] ? { kind: "intro" } : { kind: "slide", index: startAt },
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const next = useCallback(() => setState((s) => nextState(s, slides)), [slides]);
  const prev = useCallback(() => setState((s) => prevState(s, slides)), [slides]);

  useEffect(() => {
    containerRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

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

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`מצגת רטרו – ${title}`}
      className="fixed inset-0 z-50 flex flex-col bg-background outline-none"
    >
      {/* top bar */}
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{title}</div>
            <div className="text-sm text-muted">{subtitle}</div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">מעבר לשדה</span>
            <select
              value={currentSectionIndex >= 0 ? currentSectionIndex : ""}
              onChange={(e) => {
                const idx = Number(e.target.value);
                if (!Number.isNaN(idx)) setState({ kind: "slide", index: starts[idx] });
                containerRef.current?.focus();
              }}
              aria-label="מעבר לשדה"
              className="rounded-lg border border-border bg-surface px-2 py-1.5"
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
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {/* stage */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-8">
        <div className="w-full max-w-3xl" aria-live="polite">
          {state.kind === "intro" && (
            <div className="text-center">
              <div className="text-7xl" aria-hidden>
                🪞
              </div>
              <h2 className="mt-4 text-4xl font-bold">רטרו</h2>
              <p className="mt-2 text-xl text-muted">{subtitle}</p>
              <ol className="mx-auto mt-8 max-w-md space-y-2 text-start">
                {sections.map((s, i) => (
                  <li key={s.field.id} className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 shadow-sm">
                    <span className="text-muted">{i + 1}.</span>
                    <span className="text-2xl" aria-hidden>
                      {s.field.emoji}
                    </span>
                    <span className="flex-1 font-medium">{s.field.label}</span>
                    <span className="text-muted">{s.entries.length}</span>
                  </li>
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
                  <div className="mt-3 text-8xl" aria-hidden>
                    {sections[state.fromSection + 1].field.emoji}
                  </div>
                  <h2 className="mt-4 text-4xl font-bold">{sections[state.fromSection + 1].field.label}</h2>
                  <p className="mt-2 text-muted">{sections[state.fromSection + 1].entries.length} דיווחים</p>
                </>
              )}
            </div>
          )}

          {state.kind === "done" && (
            <div className="text-center">
              <div className="text-8xl" aria-hidden>
                🎉
              </div>
              <h2 className="mt-4 text-4xl font-bold">סיימנו את הרטרו!</h2>
              <p className="mt-2 text-xl text-muted">עברנו על {slides.length} דיווחים. כל הכבוד לצוות.</p>
              <button type="button" onClick={onClose} className={buttonClass("primary", "lg", "mt-8")}>
                סגירה
              </button>
            </div>
          )}
        </div>
      </div>

      {/* bottom controls */}
      <div className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            onClick={prev}
            disabled={state.kind === "intro"}
            className={buttonClass("secondary", "lg")}
          >
            → הקודם
          </button>
          <span className="text-sm text-muted" aria-live="polite">
            {state.kind === "slide" &&
              `${slides[state.index].indexInSection + 1} מתוך ${slides[state.index].sectionSize} · ${slides[state.index].field.label}`}
          </span>
          <button
            type="button"
            onClick={next}
            disabled={state.kind === "done"}
            className={buttonClass("primary", "lg")}
          >
            המשך ←
          </button>
        </div>
      </div>
    </div>
  );
}

function SlideView({ slide }: { slide: ReturnType<typeof flattenSlides>[number] }) {
  const name = displayName(slide.entry);
  return (
    <article className="text-center" aria-label={`${slide.field.label} – ${name}`}>
      <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-lg font-medium text-primary">
        <span aria-hidden>{slide.field.emoji}</span>
        {slide.field.label}
      </div>
      <div className="flex flex-col items-center">
        <Avatar name={name} src={slide.entry.author_avatar_url} size={112} className="shadow-lg ring-4 ring-surface" />
        <h2 className="mt-4 text-3xl font-bold">{name}</h2>
        <time dateTime={slide.entry.created_at} className="mt-1 text-muted">
          {formatDate(slide.entry.created_at)}
        </time>
      </div>
      <blockquote className="mt-8 whitespace-pre-wrap rounded-3xl bg-surface p-6 text-2xl leading-relaxed shadow-sm sm:p-10 sm:text-3xl">
        {slide.entry.content}
      </blockquote>
    </article>
  );
}
