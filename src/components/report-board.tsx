"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createEntry } from "@/app/actions/entries";
import { LIMITS } from "@/lib/validation";
import { buttonClass, inputClass } from "./ui";

export type ReportField = {
  id: string;
  label: string;
  emoji: string;
  placeholder: string | null;
};

type Props = {
  teamId: string;
  fields: ReportField[];
  /** Injected for tests. */
  submit?: typeof createEntry;
};

export function ReportBoard({ teamId, fields, submit = createEntry }: Props) {
  const [active, setActive] = useState<ReportField | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  if (fields.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
        עדיין לא הוגדרו שדות דיווח לצוות הזה.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <button
            key={field.id}
            type="button"
            onClick={() => setActive(field)}
            className="group flex min-h-40 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-border bg-surface p-6 text-center shadow-sm transition hover:-translate-y-1 hover:border-primary hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-h-52"
          >
            <span aria-hidden className="text-6xl transition group-hover:scale-110 sm:text-7xl">
              {field.emoji}
            </span>
            <span className="text-2xl font-semibold sm:text-3xl">{field.label}</span>
          </button>
        ))}
      </div>

      {active && (
        <EntryDialog
          key={active.id}
          field={active}
          onClose={() => setActive(null)}
          onSubmit={async (content) => {
            const result = await submit(teamId, active.id, content);
            if (result.ok) {
              setActive(null);
              setToast("הדיווח נשלח, תודה! 🎉");
            }
            return result;
          }}
        />
      )}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        {toast && (
          <div className="pointer-events-auto rounded-2xl bg-success px-5 py-3 text-lg font-medium text-white shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </>
  );
}

type DialogProps = {
  field: ReportField;
  onClose: () => void;
  onSubmit: (content: string) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export function EntryDialog({ field, onClose, onSubmit }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  const trimmedLength = content.trim().length;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (trimmedLength === 0) {
      setError("אי אפשר לשלוח דיווח ריק");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await onSubmit(content);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="entry-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onClose();
      }}
      className="m-auto w-[min(40rem,calc(100%-2rem))] rounded-3xl border border-border bg-surface p-0 text-foreground shadow-2xl"
    >
      <form onSubmit={handleSubmit} className="p-6 sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          <span aria-hidden className="text-5xl">
            {field.emoji}
          </span>
          <h2 id="entry-dialog-title" className="text-2xl font-bold">
            {field.label}
          </h2>
        </div>
        <label htmlFor="entry-content" className="sr-only">
          תוכן הדיווח
        </label>
        <textarea
          id="entry-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={field.placeholder ?? "כתבו כאן…"}
          rows={6}
          maxLength={LIMITS.entryContent}
          autoFocus
          className={`${inputClass} text-lg leading-relaxed`}
        />
        <div className="mt-2 flex items-center justify-between text-sm text-muted">
          <span>
            {content.length}/{LIMITS.entryContent}
          </span>
        </div>
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-danger-soft px-4 py-2.5 text-danger">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={pending} className={buttonClass("secondary", "lg")}>
            ביטול
          </button>
          <button type="submit" disabled={pending || trimmedLength === 0} className={buttonClass("primary", "lg")}>
            {pending ? "שולח…" : "שליחה"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
