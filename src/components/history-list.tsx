"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteEntry, updateEntry } from "@/app/actions/entries";
import { formatDateTime } from "@/lib/dates";
import { LIMITS } from "@/lib/validation";
import { buttonClass, cardClass, inputClass } from "./ui";
import { Emoji } from "./emoji";
import { IncognitoIcon } from "./incognito-icon";

export type HistoryField = { id: string; label: string; emoji: string; isActive: boolean };
export type HistoryEntry = { id: string; fieldId: string; content: string; createdAt: string; updatedAt: string };

type Actions = {
  update: typeof updateEntry;
  remove: typeof deleteEntry;
};

type Props = {
  fields: HistoryField[];
  entries: HistoryEntry[];
  /** Injected for tests. */
  actions?: Actions;
};

const defaultActions: Actions = { update: updateEntry, remove: deleteEntry };

export function HistoryList({ fields, entries, actions = defaultActions }: Props) {
  const [filter, setFilter] = useState<string>("all");
  const fieldById = useMemo(() => new Map(fields.map((f) => [f.id, f])), [fields]);
  const visible = filter === "all" ? entries : entries.filter((e) => e.fieldId === filter);

  if (entries.length === 0) {
    return (
      <div className="animate-fade-up rounded-2xl border border-dashed border-border p-8 text-center text-muted">
        <Emoji value="🤔" size={72} className="mx-auto mb-2" />
        עדיין לא שלחת דיווחים בצוות הזה.
        <p className="mt-1 text-sm">דיווחים אנונימיים לא נשמרים כאן.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="סינון לפי שדה">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          הכל ({entries.length})
        </FilterChip>
        {fields
          .filter((f) => entries.some((e) => e.fieldId === f.id))
          .map((f) => (
            <FilterChip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
              <span aria-hidden>{f.emoji}</span> {f.label} ({entries.filter((e) => e.fieldId === f.id).length})
            </FilterChip>
          ))}
      </div>

      <p className="text-sm text-muted">
        <IncognitoIcon className="me-1" /> דיווחים שנשלחו באנונימיות לא מופיעים כאן – אין להם שום שיוך אליך.
      </p>

      <ul className="space-y-3">
        {visible.map((entry, index) => (
          <li key={entry.id} className="animate-fade-up stagger" style={{ "--i": Math.min(index, 12) } as React.CSSProperties}>
            <HistoryItem entry={entry} field={fieldById.get(entry.fieldId)} fields={fields} actions={actions} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition active:scale-95 ${
        active ? "border-accent bg-accent text-on-accent" : "border-border bg-surface hover:bg-primary-soft"
      }`}
    >
      {children}
    </button>
  );
}

function HistoryItem({
  entry,
  field,
  fields,
  actions,
}: {
  entry: HistoryEntry;
  field: HistoryField | undefined;
  fields: HistoryField[];
  actions: Actions;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [content, setContent] = useState(entry.content);
  const [fieldId, setFieldId] = useState(entry.fieldId);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Moving is allowed to active fields, or keeping the current one.
  const fieldOptions = fields.filter((f) => f.isActive || f.id === entry.fieldId);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await actions.update(entry.id, fieldId, content);
      if (result.ok) setEditing(false);
      else setError(result.error);
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await actions.remove(entry.id);
      if (!result.ok) {
        setError(result.error);
        setConfirmingDelete(false);
      }
    });
  }

  const edited = entry.updatedAt.slice(0, 19) !== entry.createdAt.slice(0, 19);

  return (
    <article
      className={`${cardClass} group transition hover:-translate-y-0.5 hover:shadow-md`}
      aria-label={field?.label ?? "דיווח"}
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold">
          <Emoji value={field?.emoji ?? "💬"} size={32} />
          <span>{field?.label ?? "שדה שנמחק"}</span>
        </div>
        <time dateTime={entry.createdAt} className="text-sm text-muted">
          {formatDateTime(entry.createdAt)}
          {edited && " · נערך"}
        </time>
      </header>

      {editing ? (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">שדה</span>
            <select value={fieldId} onChange={(e) => setFieldId(e.target.value)} className={inputClass}>
              {fieldOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.emoji} {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">תוכן</span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              maxLength={LIMITS.entryContent}
              className={inputClass}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending || !content.trim()}
              className={buttonClass("primary", "sm")}
            >
              {pending ? "שומר…" : "שמירה"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setEditing(false);
                setContent(entry.content);
                setFieldId(entry.fieldId);
                setError(null);
              }}
              className={buttonClass("secondary", "sm")}
            >
              ביטול
            </button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-lg leading-relaxed">{entry.content}</p>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-danger-soft px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {!editing && (
        <footer className="mt-4 flex flex-wrap items-center gap-2">
          {confirmingDelete ? (
            <>
              <span className="text-sm">למחוק את הדיווח?</span>
              <button type="button" onClick={remove} disabled={pending} className={buttonClass("danger", "sm")}>
                {pending ? "מוחק…" : "כן, למחוק"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={pending}
                className={buttonClass("secondary", "sm")}
              >
                ביטול
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setEditing(true)} className={buttonClass("secondary", "sm")}>
                ✏️ עריכה
              </button>
              <button type="button" onClick={() => setConfirmingDelete(true)} className={buttonClass("ghost", "sm")}>
                🗑️ מחיקה
              </button>
            </>
          )}
        </footer>
      )}
    </article>
  );
}
