"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buildSections, countByField, entriesLabel, sectionStarts, type InsightEntry, type InsightField } from "@/lib/insights";
import { formatDateString, type DateRange } from "@/lib/dates";
import { buttonClass, cardClass, inputClass } from "@/components/ui";
import { Presenter } from "./presenter";
import { Emoji } from "@/components/emoji";
import { createActionItem } from "@/app/actions/action-items";
import { groupByEntry, isDone, type ActionItem } from "@/lib/action-items";

type Preset = { id: string; label: string; range: DateRange };

type Props = {
  teamId: string;
  teamName: string;
  range: DateRange;
  presets: Preset[];
  fields: InsightField[];
  entries: InsightEntry[];
  actionItems?: ActionItem[];
  /** Injected for tests. */
  onCreateActionItem?: (teamId: string, entryId: string, title: string) => ReturnType<typeof createActionItem>;
};

export function InsightsView({
  teamId,
  teamName,
  range,
  presets,
  fields,
  entries,
  actionItems = [],
  onCreateActionItem = createActionItem,
}: Props) {
  const sections = useMemo(() => buildSections(fields, entries), [fields, entries]);
  const counts = useMemo(() => countByField(fields, entries), [fields, entries]);
  const starts = useMemo(() => sectionStarts(sections), [sections]);
  const actionItemsByEntry = useMemo(() => groupByEntry(actionItems), [actionItems]);
  const openActionItems = actionItems.filter((item) => !isDone(item)).length;
  const [presenting, setPresenting] = useState<{ startAt: number | null } | null>(null);
  const base = `/teams/${teamId}/insights`;
  const rangeLabel = `${formatDateString(range.from)} – ${formatDateString(range.to)}`;


  return (
    <div className="space-y-6">
      <section className={`${cardClass} animate-fade-up`} aria-labelledby="range-title">
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

      <section className={`${cardClass} animate-fade-up stagger`} style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="summary-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="summary-title" className="text-lg font-semibold">
              סיכום
            </h2>
            <p className="text-sm text-muted">
              {rangeLabel} · {entriesLabel(entries.length)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/teams/${teamId}/action-items`} className={buttonClass("secondary", "lg")}>
              <span aria-hidden>🎯</span> Action items
              {openActionItems > 0 && (
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-sm font-bold text-on-accent">
                  {openActionItems}
                  <span className="sr-only"> פתוחות</span>
                </span>
              )}
            </Link>
            <button
              type="button"
              disabled={entries.length === 0}
              onClick={() => setPresenting({ startAt: null })}
              className={buttonClass("primary", "lg", "group")}
            >
              <span className="transition group-hover:scale-125">▶</span> התחלת רטרו
            </button>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
            <Emoji value="🤔" size={72} className="mx-auto mb-2" />
            אין דיווחים בטווח התאריכים שנבחר.
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {sections.map((section, sectionIndex) => {
              if (section.kind !== "field") return null;
              const { field } = section;
              const count = counts[field.id] ?? 0;
              return (
                <li key={field.id} className="animate-fade-up stagger" style={{ "--i": sectionIndex + 3 } as React.CSSProperties}>
                  <button
                    type="button"
                    onClick={() => setPresenting({ startAt: starts[sectionIndex] })}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-border p-4 text-start transition hover:-translate-y-0.5 hover:border-accent hover:bg-primary-soft hover:shadow-md"
                  >
                    <Emoji value={field.emoji} size={44} className="transition group-hover:scale-110" />
                    <span className="flex-1 font-medium">{field.label}</span>
                    <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-on-accent">
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
          fields={fields}
          entries={entries}
          startAt={presenting.startAt}
          onClose={() => setPresenting(null)}
          actionItemsByEntry={actionItemsByEntry}
          onCreateActionItem={(entryId, title) => onCreateActionItem(teamId, entryId, title)}
        />
      )}
    </div>
  );
}
