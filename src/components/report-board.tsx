"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LIMITS } from "@/lib/validation";
import { celebrate } from "@/lib/confetti";
import { Emoji } from "./emoji";
import { buttonClass, inputClass } from "./ui";
import { IncognitoIcon } from "./incognito-icon";

export type ReportField = {
  id: string;
  label: string;
  emoji: string;
  placeholder: string | null;
};

type Result = { ok: true } | { ok: false; error: string };

type Props = {
  fields: ReportField[];
  onSubmit: (fieldId: string, content: string, anonymous: boolean) => Promise<Result>;
  /**
   * "optional": the sender may tick "anonymous";
   * "always": anonymous public link – every entry is anonymous;
   * "never": identified public link – every entry is stored under the sender's name.
   */
  anonymity?: Anonymity;
};

type Anonymity = "optional" | "always" | "never";

/** From this many fields, phones show the buttons in two columns. */
export const COMPACT_FROM = 4;

export function ReportBoard({ fields, onSubmit, anonymity = "optional" }: Props) {
  const [active, setActive] = useState<ReportField | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  if (fields.length === 0) {
    return (
      <p className="animate-fade-up rounded-2xl border border-dashed border-border p-8 text-center text-muted">
        עדיין לא הוגדרו שדות דיווח לצוות הזה.
      </p>
    );
  }

  // On phones a single column of big buttons quickly runs past the first screen,
  // so from COMPACT_FROM fields on, phones get two columns of smaller buttons.
  const compact = fields.length >= COMPACT_FROM;

  return (
    <>
      <div
        data-layout={compact ? "compact" : "comfortable"}
        className={`grid sm:grid-cols-2 sm:gap-4 ${compact ? "grid-cols-2 gap-3" : "grid-cols-1 gap-4"}`}
      >
        {fields.map((field, index) => (
          <motion.button
            key={field.id}
            type="button"
            onClick={() => setActive(field)}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.07, type: "spring", stiffness: 260, damping: 22 }}
            whileHover={{ y: -6, rotate: index % 2 ? 1 : -1 }}
            whileTap={{ scale: 0.96 }}
            className={`group relative flex flex-col items-center justify-center overflow-hidden border-2 border-border bg-surface text-center shadow-sm transition-[border-color,box-shadow] hover:border-accent hover:shadow-xl hover:shadow-accent/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-h-56 sm:gap-3 sm:rounded-[2rem] sm:p-6 ${
              compact
                ? `min-h-32 gap-2 rounded-3xl p-3 [--emoji-size:60px] sm:[--emoji-size:96px] ${
                    fields.length % 2 === 1 && index === fields.length - 1 ? "col-span-2 sm:col-span-1" : ""
                  }`
                : "min-h-44 gap-3 rounded-[2rem] p-6 [--emoji-size:96px]"
            }`}
          >
            <span
              aria-hidden
              className="absolute inset-x-0 -bottom-24 h-40 rounded-full bg-accent/0 blur-2xl transition duration-500 group-hover:bg-accent/30"
            />
            <Emoji
              value={field.emoji}
              size="var(--emoji-size)"
              className="relative transition-transform duration-300 group-hover:scale-110"
            />
            <span className={`relative font-bold leading-tight sm:text-3xl ${compact ? "text-lg" : "text-2xl"}`}>
              {field.label}
            </span>
          </motion.button>
        ))}
      </div>

      {active && (
        <EntryDialog
          key={active.id}
          field={active}
          anonymity={anonymity}
          onClose={() => setActive(null)}
          onSubmit={async (content, anonymous) => {
            const result = await onSubmit(active.id, content, anonymous);
            if (result.ok) {
              setActive(null);
              setToast(anonymous || anonymity === "always" ? "נשלח באנונימיות, תודה!" : "הדיווח נשלח, תודה!");
              void celebrate();
            }
            return result;
          }}
        />
      )}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast}
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-primary px-5 py-3 text-lg font-semibold text-on-primary shadow-2xl"
            >
              <Emoji value="🎉" size={36} />
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

type DialogProps = {
  field: ReportField;
  anonymity: Anonymity;
  onClose: () => void;
  onSubmit: (content: string, anonymous: boolean) => Promise<Result>;
};

export function EntryDialog({ field, anonymity, onClose, onSubmit }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(anonymity === "always");
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
      const result = await onSubmit(content, anonymous);
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
      className="m-auto w-[min(40rem,calc(100%-2rem))] overflow-visible bg-transparent p-0 text-foreground"
    >
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="relative rounded-[2rem] border border-border bg-surface p-6 shadow-2xl sm:p-8"
      >
        <div className="mb-5 flex items-center gap-3">
          <motion.span initial={{ rotate: -20, scale: 0.5 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.1 }}>
            <Emoji value={field.emoji} size={64} />
          </motion.span>
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
          placeholder={field.placeholder || "כתבו כאן…"}
          rows={6}
          maxLength={LIMITS.entryContent}
          autoFocus
          className={`${inputClass} text-lg leading-relaxed`}
        />
        <div className="mt-2 flex items-center justify-end text-sm text-muted">
          {content.length}/{LIMITS.entryContent}
        </div>

        {anonymity === "optional" ? (
          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-3 transition hover:bg-primary-soft has-[:checked]:border-accent has-[:checked]:bg-primary-soft">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full bg-border transition peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-primary"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${anonymous ? "right-[22px]" : "right-0.5"}`}
              />
            </span>
            <span>
              <span className="flex items-center gap-1.5 font-semibold">
                <IncognitoIcon size={20} /> שליחה אנונימית
              </span>
              <AnimatePresence initial={false}>
                {anonymous && (
                  <motion.span
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="block overflow-hidden text-sm text-muted"
                  >
                    הדיווח יישמר בלי שום שיוך אליך – גם לא במסד הנתונים. הוא לא יופיע בהיסטוריה שלך ולא תוכלו לערוך
                    אותו.
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </label>
        ) : anonymity === "always" ? (
          <p className="mt-3 flex items-center gap-2 rounded-2xl bg-primary-soft p-3 text-sm">
            <IncognitoIcon size={20} /> הדיווח יישלח באופן אנונימי לחלוטין.
          </p>
        ) : (
          <p className="mt-3 rounded-2xl bg-primary-soft p-3 text-sm">🪪 הדיווח יישלח בשמך.</p>
        )}

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
                שולח…
              </span>
            ) : (
              "שליחה ✨"
            )}
          </button>
        </div>
      </motion.form>
    </dialog>
  );
}
