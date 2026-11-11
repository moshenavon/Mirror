"use client";

import { useState, useTransition } from "react";
import { setInsightsVisibility } from "@/app/actions/teams";
import type { InsightsVisibility } from "@/lib/supabase/database.types";

type Props = {
  teamId: string;
  value: InsightsVisibility;
  action?: typeof setInsightsVisibility;
};

const OPTIONS: { value: InsightsVisibility; title: string; description: string }[] = [
  { value: "admins", title: "מנהלים בלבד", description: "רק מנהלי הצוות יכולים לפתוח את מסך התובנות" },
  { value: "members", title: "כל חברי הצוות", description: "כל חבר צוות יכול לפתוח את מסך התובנות ולראות את כל הדיווחים" },
];

export function InsightsVisibilityToggle({ teamId, value, action = setInsightsVisibility }: Props) {
  const [current, setCurrent] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(next: InsightsVisibility) {
    if (next === current) return;
    const previous = current;
    setCurrent(next);
    setError(null);
    startTransition(async () => {
      const result = await action(teamId, next);
      if (!result.ok) {
        setCurrent(previous);
        setError(result.error);
      }
    });
  }

  return (
    <fieldset disabled={pending}>
      <legend className="sr-only">הרשאת צפייה בתובנות</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition ${
              current === option.value ? "border-primary bg-primary-soft" : "border-border hover:border-primary/50"
            }`}
          >
            <input
              type="radio"
              name="insights_visibility"
              value={option.value}
              checked={current === option.value}
              onChange={() => choose(option.value)}
              className="mt-1 accent-[var(--primary)]"
            />
            <span>
              <span className="block font-medium">{option.title}</span>
              <span className="block text-sm text-muted">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
