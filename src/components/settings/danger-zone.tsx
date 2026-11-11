"use client";

import { useState, useTransition } from "react";
import { deleteTeam } from "@/app/actions/teams";
import { buttonClass, inputClass } from "@/components/ui";

export function DangerZone({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="rounded-2xl border border-danger/40 p-5 sm:p-6" aria-labelledby="danger-title">
      <h2 id="danger-title" className="text-xl font-semibold text-danger">
        מחיקת הצוות
      </h2>
      <p className="mt-1 text-sm text-muted">המחיקה סופית: כל השדות, החברים והדיווחים של הצוות יימחקו.</p>
      {open ? (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm">
              להקליד את שם הצוות <strong>{teamName}</strong> לאישור:
            </span>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending || confirm.trim() !== teamName.trim()}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const result = await deleteTeam(teamId, confirm);
                  if (result && !result.ok) setError(result.error);
                })
              }
              className={buttonClass("danger", "md")}
            >
              {pending ? "מוחק…" : "מחיקה סופית"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className={buttonClass("secondary", "md")}>
              ביטול
            </button>
          </div>
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={buttonClass("secondary", "md", "mt-4 text-danger")}>
          מחיקת הצוות…
        </button>
      )}
    </section>
  );
}
