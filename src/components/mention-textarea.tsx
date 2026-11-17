"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { inputClass } from "@/components/ui";
import {
  filterMentionables,
  getMentionQuery,
  insertMention,
  splitMentions,
  type Mentionable,
} from "@/lib/mentions";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Team members that can be tagged. With none, this is a plain textarea (no dropdown, no tip). */
  mentionables?: Mentionable[];
  /** localStorage key of the one-time "you can tag with @" tip; no tip without it. */
  hintKey?: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  autoFocus?: boolean;
  className?: string;
};

/**
 * A textarea where typing "@" opens a list of team members; picking one writes `@Name`
 * at the caret. Arrow keys + Enter/Tab (or a tap) pick, Escape closes the list only.
 * New users see a one-time tip about tagging.
 */
export function MentionTextarea({
  id,
  value,
  onChange,
  mentionables = [],
  hintKey,
  placeholder,
  rows,
  maxLength,
  autoFocus,
  className = "",
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const listId = useId();
  const [caret, setCaret] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  // The "@" whose list was closed with Escape; it stays closed until a new "@" is typed.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const pendingCaret = useRef<number | null>(null);
  const hint = useOneTimeHint(hintKey, mentionables.length > 0);

  const query = caret === null || mentionables.length === 0 ? null : getMentionQuery(value, caret);
  const matches = query ? filterMentionables(mentionables, query.query) : [];
  const open = query !== null && matches.length > 0 && dismissedAt !== query.start;
  const activeIndex = Math.min(active, Math.max(matches.length - 1, 0));

  useLayoutEffect(() => {
    if (pendingCaret.current === null) return;
    ref.current?.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  }, [value]);

  function pick(member: Mentionable) {
    if (!query || caret === null) return;
    const next = insertMention(value, query.start, caret, member.label);
    pendingCaret.current = next.caret;
    setCaret(next.caret);
    setActive(0);
    hint.dismiss();
    onChange(next.text);
    ref.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!open || event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + matches.length) % matches.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      pick(matches[activeIndex]);
    } else if (event.key === "Escape") {
      // Closes the list only – not the dialog the textarea lives in.
      event.preventDefault();
      event.stopPropagation();
      setDismissedAt(query.start);
    }
  }

  return (
    <div>
      <div className="relative">
        <textarea
          ref={ref}
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setCaret(e.target.selectionStart);
            setActive(0);
            if (getMentionQuery(e.target.value, e.target.selectionStart)) hint.dismiss();
          }}
          onSelect={(e) => {
            const { selectionStart, selectionEnd } = e.currentTarget;
            setCaret(selectionStart === selectionEnd ? selectionStart : null);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setCaret(null)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          autoFocus={autoFocus}
          aria-autocomplete={mentionables.length > 0 ? "list" : undefined}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
          className={`${inputClass} ${className}`}
        />
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label="תיוג חבר צוות"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 animate-pop-in overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-lg"
          >
            {matches.map((member, index) => (
              <li
                key={member.email}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                // pointer down (not click) so the textarea keeps focus and its caret
                onPointerDown={(e) => {
                  e.preventDefault();
                  pick(member);
                }}
                onPointerEnter={() => setActive(index)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 ${
                  index === activeIndex ? "bg-primary-soft" : ""
                }`}
              >
                <span aria-hidden className="flex">
                  <Avatar name={member.name ?? member.email} src={member.avatarUrl} size={28} />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{member.label}</span>
                {member.name && member.label !== member.email && (
                  <span dir="ltr" className="truncate text-xs text-muted">
                    {member.email}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {hint.visible && !open && (
        <p role="note" className="mt-2 flex items-center gap-2 rounded-xl bg-primary-soft px-3 py-2 text-sm">
          <span aria-hidden>💡</span>
          <span className="flex-1">
            טיפ: הקלידו <kbd className="rounded bg-surface px-1.5 font-mono font-bold">@</kbd> כדי לתייג חבר צוות
          </span>
          <button
            type="button"
            onClick={hint.dismiss}
            aria-label="סגירת הטיפ"
            className="rounded-full px-2 text-muted transition hover:bg-surface hover:text-foreground"
          >
            ✕
          </button>
        </p>
      )}
    </div>
  );
}

/**
 * True the first time it is mounted in this browser (per `key`), and never again:
 * the "seen" mark is written as soon as the tip is shown. Only for components that
 * render on the client after an interaction (dialogs), where reading localStorage
 * during the first render is safe. Without storage nothing is shown.
 */
function useOneTimeHint(key: string | undefined, enabled: boolean) {
  const [visible, setVisible] = useState(() => {
    if (!key || !enabled || typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(key) === null;
    } catch {
      return false;
    }
  });

  useLayoutEffect(() => {
    if (!visible || !key) return;
    try {
      window.localStorage.setItem(key, "1");
    } catch {
      // private mode: the tip simply is not remembered
    }
  }, [visible, key]);

  return { visible, dismiss: () => setVisible(false) };
}

/** Text with its `@Name` tags highlighted. */
export function MentionText({ text, mentionables }: { text: string; mentionables: Mentionable[] }) {
  return (
    <>
      {splitMentions(text, mentionables).map((segment, index) =>
        segment.mention ? (
          <span key={index} className="rounded-md bg-primary-soft px-1 font-semibold text-foreground">
            {segment.text}
          </span>
        ) : (
          segment.text
        ),
      )}
    </>
  );
}
