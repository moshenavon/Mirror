"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { deleteActionItem, setActionItemDone } from "@/app/actions/action-items";
import { applyDone, isDone, type ActionItem } from "@/lib/action-items";
import { formatDate } from "@/lib/dates";
import { celebrate } from "@/lib/confetti";
import { Emoji } from "@/components/emoji";
import { buttonClass } from "@/components/ui";

type Actions = {
  setDone: typeof setActionItemDone;
  remove: typeof deleteActionItem;
};

type Props = {
  teamId: string;
  items: ActionItem[];
  canViewInsights: boolean;
  /** Shown as "done by" until the server confirms. */
  currentUserName: string | null;
  /** Injected for tests. */
  actions?: Actions;
};

const defaultActions: Actions = { setDone: setActionItemDone, remove: deleteActionItem };

export function ActionItemsList({ teamId, items, canViewInsights, currentUserName, actions = defaultActions }: Props) {
  // Local copy for instant (optimistic) re-ordering; reset whenever the server sends a new list.
  const [list, setList] = useState(items);
  const [source, setSource] = useState(items);
  if (source !== items) {
    setSource(items);
    setList(items);
  }
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const doneCount = list.filter(isDone).length;

  function toggle(item: ActionItem, done: boolean, origin?: { x: number; y: number }) {
    setError(null);
    setList((current) => applyDone(current, item.id, done, new Date().toISOString(), currentUserName));
    if (done) void celebrate(origin);
    startTransition(async () => {
      const result = await actions.setDone(item.id, done);
      if (!result.ok) {
        setError(result.error);
        setList((current) => applyDone(current, item.id, !done, item.doneAt ?? undefined, item.doneByName));
      }
    });
  }

  async function remove(item: ActionItem): Promise<boolean> {
    setError(null);
    const result = await actions.remove(item.id);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setList((current) => current.filter((i) => i.id !== item.id));
    return true;
  }

  if (list.length === 0) {
    return (
      <div className="animate-fade-up rounded-2xl border border-dashed border-border p-8 text-center text-muted">
        <Emoji value="🚀" size={72} className="mx-auto mb-2" />
        עדיין אין משימות לצוות.
        {canViewInsights ? (
          <p className="mt-1 text-sm">
            במצגת הרטרו ב
            <Link href={`/teams/${teamId}/insights`} className="font-semibold text-foreground underline underline-offset-4">
              מסך התובנות
            </Link>{" "}
            לחצו על &quot;יצירת Action Item&quot; כדי להוסיף משימה מתוך תובנה.
          </p>
        ) : (
          <p className="mt-1 text-sm">משימות שנוצרות מתוך התובנות בפגישת הרטרו יופיעו כאן.</p>
        )}
      </div>
    );
  }

  const progress = doneCount / list.length;

  return (
    <div className="space-y-4">
      <div className="animate-fade-up rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold">
            {doneCount} מתוך {list.length} בוצעו
          </span>
          {doneCount === list.length && <span className="font-semibold text-success">כל המשימות בוצעו 🎉</span>}
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-label="התקדמות המשימות"
          aria-valuemin={0}
          aria-valuemax={list.length}
          aria-valuenow={doneCount}
        >
          <motion.div
            className="h-full rounded-full bg-success"
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-2.5 text-danger">
          {error}
        </p>
      )}

      <ul className="space-y-3" aria-label="משימות">
        <AnimatePresence initial={false}>
          {list.map((item) => (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
            >
              <ActionItemRow item={item} onToggle={toggle} onRemove={remove} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

function ActionItemRow({
  item,
  onToggle,
  onRemove,
}: {
  item: ActionItem;
  onToggle: (item: ActionItem, done: boolean, origin?: { x: number; y: number }) => void;
  onRemove: (item: ActionItem) => Promise<boolean>;
}) {
  const done = isDone(item);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, startDelete] = useTransition();

  return (
    <article
      aria-label={item.title}
      data-done={done}
      className={`rounded-2xl border p-4 shadow-sm transition-colors duration-300 sm:p-5 ${
        done ? "border-success/40 bg-success-soft" : "border-border bg-surface hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-3">
        <label className="relative mt-0.5 shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={done}
            onChange={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const origin =
                typeof window !== "undefined" && window.innerWidth
                  ? { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight }
                  : undefined;
              onToggle(item, e.target.checked, origin);
            }}
            aria-label={done ? `סימון "${item.title}" כלא בוצע` : `סימון "${item.title}" כבוצע`}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary ${
              done ? "border-success bg-success text-white" : "border-muted/50 bg-surface hover:border-success hover:bg-success-soft"
            }`}
          >
            <AnimatePresence initial={false}>
              {done && (
                <motion.svg
                  key="check"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                >
                  <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} />
                </motion.svg>
              )}
            </AnimatePresence>
          </span>
        </label>

        <div className="min-w-0 flex-1">
          <p className={`text-lg leading-relaxed ${done ? "text-muted" : ""}`}>
            <span className="strike whitespace-pre-wrap" data-done={done}>
              {item.title}
            </span>
          </p>

          {item.sourceContent && (
            <p className="mt-2 flex items-start gap-1.5 text-sm text-muted">
              {item.fieldEmoji && <Emoji value={item.fieldEmoji} size={20} className="shrink-0" />}
              <span className="line-clamp-2">
                {item.fieldLabel && <span className="font-semibold">{item.fieldLabel}: </span>}
                &quot;{item.sourceContent}&quot;
              </span>
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
            <AnimatePresence initial={false} mode="popLayout">
              {done ? (
                <motion.span
                  key="done"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-0.5 font-semibold text-white"
                >
                  ✓ בוצע
                  {item.doneAt && <span className="font-normal">· {formatDate(item.doneAt)}</span>}
                  {item.doneByName && <span className="font-normal">· {item.doneByName}</span>}
                </motion.span>
              ) : (
                <motion.span key="open" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  פתוחה
                </motion.span>
              )}
            </AnimatePresence>
            <span>
              נוצרה {formatDate(item.createdAt)}
              {item.createdByName && ` · ${item.createdByName}`}
            </span>

            {item.canDelete && (
              <span className="ms-auto flex items-center gap-2">
                {confirmingDelete ? (
                  <>
                    <span>למחוק?</span>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() =>
                        startDelete(async () => {
                          if (!(await onRemove(item))) setConfirmingDelete(false);
                        })
                      }
                      className={buttonClass("danger", "sm")}
                    >
                      {deleting ? "מוחק…" : "כן, למחוק"}
                    </button>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => setConfirmingDelete(false)}
                      className={buttonClass("secondary", "sm")}
                    >
                      ביטול
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className={buttonClass("ghost", "sm")}
                    aria-label={`מחיקת "${item.title}"`}
                  >
                    🗑️
                  </button>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
