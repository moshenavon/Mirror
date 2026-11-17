"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LIMITS } from "@/lib/validation";
import { Emoji } from "@/components/emoji";
import { MentionTextarea, MentionText } from "@/components/mention-textarea";
import { buttonClass } from "@/components/ui";
import { useKeyboardDialogStyle } from "@/lib/keyboard";
import { MENTION_HINT_KEYS, findMentions, type Mentionable } from "@/lib/mentions";

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
  /** `assignees` are the e-mail addresses of the members tagged with "@" in the title. */
  onSubmit: (title: string, assignees: string[]) => Promise<Result>;
  /** Team members that can be tagged (= assigned). */
  mentionables?: Mentionable[];
};

/** Dialog for turning an insight into a follow-up task for the team. */
export function ActionItemDialog({ source, onClose, onSubmit, mentionables = [] }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const keyboardStyle = useKeyboardDialogStyle();
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
      const result = await onSubmit(title, findMentions(title, mentionables));
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
      // Centred in the space the on-screen keyboard leaves free (see useKeyboardDialogStyle).
      style={keyboardStyle}
      className="m-auto w-[min(40rem,calc(100%-2rem))] overflow-visible bg-transparent p-0 text-foreground transition-[top,bottom] duration-200 motion-reduce:transition-none"
    >
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="relative rounded-3xl border border-border bg-surface p-4 text-start shadow-2xl sm:rounded-[2rem] sm:p-8"
      >
        <h2 id="action-item-dialog-title" className="mb-3 flex items-center gap-2 text-xl font-bold sm:mb-4 sm:text-2xl">
          <span aria-hidden>🎯</span> יצירת Action Item
        </h2>

        <figure className="mb-3 rounded-2xl bg-primary-soft p-3 sm:mb-5 sm:p-4">
          <figcaption className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <Emoji value={source.fieldEmoji} size={24} />
            {source.fieldLabel} · {source.authorName}
          </figcaption>
          <blockquote className="line-clamp-2 whitespace-pre-wrap text-muted sm:line-clamp-4">
            <MentionText text={source.content} mentionables={mentionables} />
          </blockquote>
        </figure>

        <label htmlFor="action-item-title" className="mb-1 block font-medium">
          מה הצוות צריך לעשות?
        </label>
        <MentionTextarea
          id="action-item-title"
          value={title}
          onChange={setTitle}
          mentionables={mentionables}
          hintKey={MENTION_HINT_KEYS.actionItem}
          placeholder="לדוגמה: לקבוע סשן שיתוף ידע על הדיפלוי עד סוף השבוע"
          rows={3}
          maxLength={LIMITS.actionItemTitle}
          autoFocus
          className="max-h-48 min-h-[5.5rem] text-lg leading-relaxed [field-sizing:content]"
        />
        <div className="mt-1 flex items-center justify-end text-sm text-muted">
          {title.length}/{LIMITS.actionItemTitle}
        </div>
        <AssigneesPreview title={title} mentionables={mentionables} />

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

        <div className="mt-4 flex gap-3 sm:justify-end">
          <button type="button" onClick={onClose} disabled={pending} className={buttonClass("secondary", "lg")}>
            ביטול
          </button>
          <button type="submit" disabled={pending || trimmedLength === 0} className={buttonClass("primary", "lg", "min-w-32 flex-1 sm:flex-none")}>
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

/** "Assigned to: ..." under the text, so it is clear that a tag assigns the task. */
function AssigneesPreview({ title, mentionables }: { title: string; mentionables: Mentionable[] }) {
  const assigned = findMentions(title, mentionables)
    .map((email) => mentionables.find((m) => m.email === email))
    .filter((m): m is Mentionable => m !== undefined);
  if (assigned.length === 0) return null;
  return (
    <p className="mt-2 rounded-xl bg-primary-soft px-3 py-2 text-sm" aria-live="polite">
      <span className="font-semibold">המשימה תשויך ל:</span> {assigned.map((m) => m.name ?? m.email).join(", ")}
    </p>
  );
}
