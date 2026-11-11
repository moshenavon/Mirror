"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { regeneratePublicLink, setPublicSubmissions } from "@/app/actions/teams";
import { buttonClass, inputClass } from "@/components/ui";

export type PublicLinkActions = {
  setEnabled: typeof setPublicSubmissions;
  regenerate: typeof regeneratePublicLink;
};

const defaultActions: PublicLinkActions = { setEnabled: setPublicSubmissions, regenerate: regeneratePublicLink };

type Props = {
  teamId: string;
  enabled: boolean;
  token: string;
  /** Origin used to build the shareable URL (e.g. https://mirror.example.com). */
  origin: string;
  actions?: PublicLinkActions;
};

export function PublicLinkSettings({ teamId, enabled, token, origin, actions = defaultActions }: Props) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [currentToken, setCurrentToken] = useState(token);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const url = `${origin}/r/${currentToken}`;

  function toggle(next: boolean) {
    const previous = isEnabled;
    setIsEnabled(next);
    setError(null);
    startTransition(async () => {
      const result = await actions.setEnabled(teamId, next);
      if (!result.ok) {
        setIsEnabled(previous);
        setError(result.error);
      }
    });
  }

  function regenerate() {
    if (!window.confirm("להחליף את הקישור? הקישור הנוכחי יפסיק לעבוד מיד.")) return;
    setError(null);
    startTransition(async () => {
      const result = await actions.regenerate(teamId);
      if (result.ok) {
        setCurrentToken(result.data.token);
        setCopied(false);
      } else setError(result.error);
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("לא הצלחנו להעתיק – אפשר לסמן את הקישור ולהעתיק ידנית");
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          role="switch"
          checked={isEnabled}
          disabled={pending}
          onChange={(e) => toggle(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="relative mt-0.5 inline-flex h-7 w-12 shrink-0 rounded-full bg-border transition peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-primary"
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${isEnabled ? "right-[22px]" : "right-0.5"}`}
          />
        </span>
        <span>
          <span className="block font-semibold">מילוי ללא הזדהות</span>
          <span className="block text-sm text-muted">
            כל מי שמחזיק בקישור יוכל לשלוח דיווחים – תמיד באופן אנונימי, בלי להתחבר.
          </span>
        </span>
      </label>

      <AnimatePresence initial={false}>
        {isEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 rounded-2xl border border-accent/60 bg-primary-soft p-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={url}
                  dir="ltr"
                  aria-label="קישור ציבורי למילוי"
                  onFocus={(e) => e.currentTarget.select()}
                  className={`${inputClass} text-left font-mono text-sm`}
                />
                <button type="button" onClick={copy} className={buttonClass("primary", "md", "shrink-0")}>
                  {copied ? "✓ הועתק" : "העתקה"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={url} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
                  פתיחה בחלון חדש ↗
                </a>
                <button type="button" onClick={regenerate} disabled={pending} className={buttonClass("ghost", "sm")}>
                  🔄 החלפת קישור
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
