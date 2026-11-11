"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buildSections, countByField, entriesLabel, sectionStarts, type InsightEntry, type InsightField } from "@/lib/insights";
import { formatDateString, type DateRange } from "@/lib/dates";
import { buttonClass, cardClass, inputClass } from "@/components/ui";
import { Presenter } from "./presenter";

type Preset = { id: string; label: string; range: DateRange };

type Props = {
  teamId: string;
  teamName: string;
  range: DateRange;
  presets: Preset[];
  fields: InsightField[];
  entries: InsightEntry[];
};

export function InsightsView({ teamId, teamName, range, presets, fields, entries }: Props) {
  const sections = useMemo(() => buildSections(fields, entries), [fields, entries]);
  const counts = useMemo(() => countByField(fields, entries), [fields, entries]);
  const starts = useMemo(() => sectionStarts(sections), [sections]);
  const [presenting, setPresenting] = useState<{ startAt: number | null } | null>(null);
  const base = `/teams/${teamId}/insights`;
  const rangeLabel = `${formatDateString(range.from)} – ${formatDateString(range.to)}`;


  return (
    <div className="space-y-6">
      <section className={cardClass} aria-labelledby="range-title">
        <h2 id="range-title" className="mb-4 text-lg font-semibold">
          טווח תאריכים
        </h2>
        <form method="get" action={base} className="flex flex-wrap items-end gap-3">
          <label>
            <span className="mb-1 block text-sm font-medium">מתאריך</span>
            <input type="date" name="from" defaultValue={range.from} max={range.to} className={inputClass} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">עד תאריך</span>
            <input type="date" name="to" defaultValue={range.to} className={inputClass} />
          </label>
          <button type="submit" className={buttonClass("secondary", "md")}>
            הצגה
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="טווחים מהירים">
          {presets.map((p) => {
            const active = p.range.from === range.from && p.range.to === range.to;
            return (
              <Link
                key={p.id}
                href={`${base}?from=${p.range.from}&to=${p.range.to}`}
                aria-current={active ? "true" : undefined}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                  active ? "border-accent bg-accent text-on-accent" : "border-border hover:bg-primary-soft"
                }`}
              >
                {p.label} אחרונים
              </Link>
            );
          })}
        </div>
      </section>

      <section className={cardClass} aria-labelledby="summary-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="summary-title" className="text-lg font-semibold">
              סיכום
            </h2>
            <p className="text-sm text-muted">
              {rangeLabel} · {entriesLabel(entries.length)}
            </p>
          </div>
          <button
            type="button"
            disabled={entries.length === 0}
            onClick={() => setPresenting({ startAt: null })}
            className={buttonClass("primary", "lg")}
          >
            ▶ התחלת רטרו
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted">
            אין דיווחים בטווח התאריכים שנבחר.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {sections.map(({ field }, sectionIndex) => {
              const count = counts[field.id] ?? 0;
              return (
                <li key={field.id}>
                  <button
                    type="button"
                    onClick={() => setPresenting({ startAt: starts[sectionIndex] })}
                    className="flex w-full items-center gap-3 rounded-xl border border-border p-4 text-start transition hover:border-primary hover:bg-primary-soft"
                  >
                    <span aria-hidden className="text-3xl">
                      {field.emoji}
                    </span>
                    <span className="flex-1 font-medium">{field.label}</span>
                    <span className="rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">
                      {count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {presenting && (
        <Presenter
          title={teamName}
          subtitle={rangeLabel}
          sections={sections}
          startAt={presenting.startAt}
          onClose={() => setPresenting(null)}
        />
      )}
    </div>
  );
}
