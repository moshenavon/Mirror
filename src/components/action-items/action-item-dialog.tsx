"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LIMITS } from "@/lib/validation";
import { Emoji } from "@/components/emoji";
import { buttonClass, inputClass } from "@/components/ui";

type Result = { ok: true } | { ok: false; error: string };

export type ActionItemSource = {
  fieldEmoji: string;
  fieldLabel: string;
  authorName: string;
  content: string;
};

type Props = {
  source: ActionItemSource;
  onClose: () => void;
  onSubmit: (title: string) => Promise<Result>;
};

/** Dialog for turning an insight into a follow-up task for the team. */
export function ActionItemDialog({ source, onClose, onSubmit }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  const trimmedLength = title.trim().length;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (trimmedLength === 0) {
      setError("יש לכתוב מה צריך לעשות");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await onSubmit(title);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="action-item-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onClose();
      }}
      className="m-auto w-[min(40rem,calc(100%-2rem))] overflow-visible bg-transparent p-0 text-foreground"
    >
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="relative rounded-[2rem] border border-border bg-surface p-6 text-start shadow-2xl sm:p-8"
      >
        <h2 id="action-item-dialog-title" className="mb-4 flex items-center gap-2 text-2xl font-bold">
          <span aria-hidden>🎯</span> יצירת Action Item
        </h2>

        <figure className="mb-5 rounded-2xl bg-primary-soft p-4">
          <figcaption className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <Emoji value={source.fieldEmoji} size={24} />
            {source.fieldLabel} · {source.authorName}
          </figcaption>
          <blockquote className="line-clamp-4 whitespace-pre-wrap text-muted">{source.content}</blockquote>
        </figure>

        <label htmlFor="action-item-title" className="mb-1 block font-medium">
          מה הצוות צריך לעשות?
        </label>
        <textarea
          id="action-item-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="לדוגמה: לקבוע סשן שיתוף ידע על הדיפלוי עד סוף השבוע"
          rows={3}
          maxLength={LIMITS.actionItemTitle}
          autoFocus
          className={`${inputClass} text-lg leading-relaxed`}
        />
        <div className="mt-2 flex items-center justify-end text-sm text-muted">
          {title.length}/{LIMITS.actionItemTitle}
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              role="alert"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: [12, -8, 6, -4, 0] }}
              exit={{ opacity: 0 }}
              className="mt-3 rounded-xl bg-danger-soft px-4 py-2.5 text-danger"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={pending} className={buttonClass("secondary", "lg")}>
            ביטול
          </button>
          <button type="submit" disabled={pending || trimmedLength === 0} className={buttonClass("primary", "lg", "min-w-32")}>
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                שומר…
              </span>
            ) : (
              "הוספת משימה"
            )}
          </button>
        </div>
      </motion.form>
    </dialog>
  );
}
