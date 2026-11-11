"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { joinTeamViaLink } from "@/app/actions/public-entries";
import { buttonClass } from "./ui";

type Props = {
  token: string;
  teamName: string;
  /** "member": already in the team; "signed-in": may join now; "signed-out": must sign in first. */
  status: "member" | "signed-in" | "signed-out";
  /** Team page for an existing member. */
  teamHref?: string;
  join?: (token: string) => Promise<{ ok: true } | { ok: false; error: string }>;
};

/** Offers the visitor of a public link to join the team as a regular member. */
export function JoinTeamCard({ token, teamName, status, teamHref, join = joinTeamViaLink }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleJoin() {
    setError(null);
    startTransition(async () => {
      // On success the action redirects to the team, so only failures come back.
      const result = await join(token);
      if (!result.ok) setError(result.error);
    });
  }

  const box =
    "mb-8 flex animate-fade-up flex-col gap-3 rounded-2xl border border-accent/60 bg-primary-soft p-4 sm:flex-row sm:items-center sm:justify-between";

  if (status === "member") {
    return (
      <div className={box}>
        <p className="font-semibold">
          <span aria-hidden>✅</span> כבר הצטרפת לצוות {teamName}
        </p>
        {teamHref && (
          <Link href={teamHref} className={buttonClass("secondary", "sm", "shrink-0")}>
            מעבר לצוות ←
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={box}>
      <div>
        <p className="font-semibold">
          <span aria-hidden>🙋</span> רוצים להצטרף לצוות {teamName}?
        </p>
        <p className="text-sm text-muted">
          חברי צוות רואים את ההיסטוריה שלהם, את מסך ההישגים ומשתתפים ברטרו.
          {status === "signed-out" && " קודם מתחברים עם Google."}
        </p>
        {error && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
      {status === "signed-in" ? (
        <button
          type="button"
          onClick={handleJoin}
          disabled={pending}
          className={buttonClass("primary", "md", "shrink-0")}
        >
          {pending ? "מצרפים…" : "הצטרפות לצוות"}
        </button>
      ) : (
        <a
          href={`/auth/google?next=${encodeURIComponent(`/r/${token}`)}`}
          className={buttonClass("primary", "md", "shrink-0")}
        >
          התחברות עם Google
        </a>
      )}
    </div>
  );
}
