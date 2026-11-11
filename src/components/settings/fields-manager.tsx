"use client";

import { useState, useTransition } from "react";
import {
  createField,
  deleteField,
  reorderFields,
  setFieldActive,
  updateField,
  type FieldPayload,
} from "@/app/actions/fields";
import { moveItem } from "@/lib/fields";
import { LIMITS } from "@/lib/validation";
import { buttonClass, inputClass } from "@/components/ui";

export type ManagedField = {
  id: string;
  label: string;
  emoji: string;
  placeholder: string | null;
  isActive: boolean;
};

export type FieldActions = {
  create: typeof createField;
  update: typeof updateField;
  setActive: typeof setFieldActive;
  remove: typeof deleteField;
  reorder: typeof reorderFields;
};

const defaultActions: FieldActions = {
  create: createField,
  update: updateField,
  setActive: setFieldActive,
  remove: deleteField,
  reorder: reorderFields,
};

const EMOJI_SUGGESTIONS = ["😄", "😢", "💡", "⚠️", "🙏", "🚀", "😤", "🤔", "🎯", "❤️"];

type Props = { teamId: string; fields: ManagedField[]; actions?: FieldActions };

export function FieldsManager({ teamId, fields, actions = defaultActions }: Props) {
  const [order, setOrder] = useState(fields);
  const [syncedFrom, setSyncedFrom] = useState(fields);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Keep local order in sync when the server sends a new list.
  if (fields !== syncedFrom) {
    setSyncedFrom(fields);
    setOrder(fields);
  }

  function run(task: () => Promise<{ ok: boolean; error?: string }>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (result.ok) onOk?.();
      else setError(result.error ?? "אירעה שגיאה");
    });
  }

  function move(index: number, direction: -1 | 1) {
    const next = moveItem(order, index, direction);
    const previous = order;
    setOrder(next);
    setError(null);
    startTransition(async () => {
      const result = await actions.reorder(
        teamId,
        next.map((f) => f.id),
      );
      if (!result.ok) {
        setOrder(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {order.map((field, index) => (
          <li
            key={field.id}
            className={`rounded-xl border border-border p-3 ${field.isActive ? "" : "bg-background opacity-70"}`}
          >
            {editingId === field.id ? (
              <FieldForm
                initial={field}
                submitLabel="שמירה"
                pending={pending}
                onCancel={() => setEditingId(null)}
                onSubmit={(payload) => run(() => actions.update(field.id, payload), () => setEditingId(null))}
              />
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-6 text-center text-sm text-muted">{index + 1}</span>
                <span aria-hidden className="text-3xl">
                  {field.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {field.label}
                    {!field.isActive && (
                      <span className="ms-2 rounded-full bg-border px-2 py-0.5 text-xs font-normal">מושבת</span>
                    )}
                  </div>
                  {field.placeholder && <div className="truncate text-sm text-muted">{field.placeholder}</div>}
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    aria-label={`הזזת ${field.label} למעלה`}
                    disabled={pending || index === 0}
                    onClick={() => move(index, -1)}
                    className={buttonClass("ghost", "sm")}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label={`הזזת ${field.label} למטה`}
                    disabled={pending || index === order.length - 1}
                    onClick={() => move(index, 1)}
                    className={buttonClass("ghost", "sm")}
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setEditingId(field.id)}
                    className={buttonClass("secondary", "sm")}
                  >
                    עריכה
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => actions.setActive(field.id, !field.isActive))}
                    className={buttonClass("secondary", "sm")}
                  >
                    {field.isActive ? "השבתה" : "הפעלה"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(`למחוק את השדה "${field.label}"?`)) run(() => actions.remove(field.id));
                    }}
                    className={buttonClass("ghost", "sm", "text-danger")}
                  >
                    מחיקה
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>

      {order.length === 0 && <p className="text-muted">אין שדות עדיין.</p>}

      {adding ? (
        <div className="rounded-xl border-2 border-dashed border-primary/40 p-3">
          <FieldForm
            submitLabel="הוספה"
            pending={pending}
            onCancel={() => setAdding(false)}
            onSubmit={(payload) => run(() => actions.create(teamId, payload), () => setAdding(false))}
          />
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={buttonClass("secondary", "md")}>
          ＋ הוספת שדה
        </button>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-2 text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function FieldForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: ManagedField;
  submitLabel: string;
  pending: boolean;
  onSubmit: (payload: FieldPayload) => void;
  onCancel: () => void;
}) {
  const [emoji, setEmoji] = useState(initial?.emoji ?? "💬");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [placeholder, setPlaceholder] = useState(initial?.placeholder ?? "");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ emoji, label, placeholder });
      }}
    >
      <div className="flex gap-3">
        <label className="w-24 shrink-0">
          <span className="mb-1 block text-sm font-medium">אימוג&apos;י</span>
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={LIMITS.fieldEmoji}
            className={`${inputClass} text-center text-2xl`}
          />
        </label>
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-sm font-medium">כותרת</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            maxLength={LIMITS.fieldLabel}
            placeholder="לדוגמה: ממה אני שמח"
            className={inputClass}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-1" aria-label="הצעות אימוג'י">
        {EMOJI_SUGGESTIONS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(e)}
            className={`rounded-lg px-2 py-1 text-xl hover:bg-primary-soft ${emoji === e ? "bg-primary-soft" : ""}`}
          >
            {e}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">טקסט עזר (מוצג בתיבת הכתיבה)</span>
        <input
          value={placeholder}
          onChange={(e) => setPlaceholder(e.target.value)}
          maxLength={LIMITS.fieldPlaceholder}
          className={inputClass}
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pending || !label.trim()} className={buttonClass("primary", "sm")}>
          {pending ? "שומר…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={pending} className={buttonClass("secondary", "sm")}>
          ביטול
        </button>
      </div>
    </form>
  );
}
