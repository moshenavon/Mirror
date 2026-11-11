"use client";

import { useActionState } from "react";
import { createTeam, type FormState } from "@/app/actions/teams";
import { buttonClass, inputClass } from "@/components/ui";
import { LIMITS } from "@/lib/validation";

export function CreateTeamForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createTeam, undefined);

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="name" className="mb-1.5 block font-medium">
          שם הצוות
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={LIMITS.teamName}
          placeholder="לדוגמה: צוות פלטפורמה"
          className={inputClass}
          autoFocus
        />
      </div>
      <div>
        <label htmlFor="description" className="mb-1.5 block font-medium">
          תיאור <span className="text-sm font-normal text-muted">(לא חובה)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={LIMITS.teamDescription}
          className={inputClass}
        />
      </div>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-2.5 text-danger">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "w-full")}>
        {pending ? "יוצר…" : "יצירת הצוות"}
      </button>
    </form>
  );
}
