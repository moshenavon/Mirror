"use client";

import { useActionState } from "react";
import { updateTeamDetails, type FormState } from "@/app/actions/teams";
import { buttonClass, inputClass } from "@/components/ui";
import { LIMITS } from "@/lib/validation";

type Props = { teamId: string; name: string; description: string | null };

export function TeamDetailsForm({ teamId, name, description }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    updateTeamDetails.bind(null, teamId),
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block font-medium">שם הצוות</span>
        <input name="name" defaultValue={name} required maxLength={LIMITS.teamName} className={inputClass} />
      </label>
      <label className="block">
        <span className="mb-1.5 block font-medium">תיאור</span>
        <textarea
          name="description"
          defaultValue={description ?? ""}
          rows={2}
          maxLength={LIMITS.teamDescription}
          className={inputClass}
        />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass("primary", "md")}>
          {pending ? "שומר…" : "שמירה"}
        </button>
        {state?.success && <span className="text-success">{state.success}</span>}
        {state?.error && (
          <span role="alert" className="text-danger">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
