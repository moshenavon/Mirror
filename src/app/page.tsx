import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser, getMyTeams } from "@/lib/data";
import { buttonClass, cardClass } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">הצוותים שלי</h1>
          <p className="mt-1 text-muted">בחרו צוות כדי לדווח, לצפות בהיסטוריה או לפתוח את מסך התובנות.</p>
        </div>
        <Link href="/teams/new" className={buttonClass("primary", "md")}>
          <span aria-hidden>＋</span> צוות חדש
        </Link>
      </div>
      <Suspense fallback={<PageSkeleton rows={2} />}>
        <TeamsList />
      </Suspense>
    </main>
  );
}

async function TeamsList() {
  const [user, teams] = await Promise.all([getCurrentUser(), getMyTeams()]);

  if (teams.length === 0) {
    return (
      <div className={`${cardClass} text-center`}>
        <div className="text-5xl" aria-hidden>
          👋
        </div>
        <h2 className="mt-3 text-xl font-semibold">עדיין אין לך צוותים</h2>
        <p className="mx-auto mt-2 max-w-md text-muted">
          בקשו ממנהל הצוות להוסיף את הכתובת <bdi className="font-medium text-foreground">{user.email}</bdi> לצוות, או
          צרו צוות חדש בעצמכם.
        </p>
        <Link href="/teams/new" className={buttonClass("primary", "md", "mt-6")}>
          יצירת צוות
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {teams.map((team) => (
        <li key={team.id}>
          <Link
            href={`/teams/${team.id}`}
            className={`${cardClass} block h-full transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md`}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold">{team.name}</h2>
              {team.role === "admin" && (
                <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                  מנהל
                </span>
              )}
            </div>
            {team.description && <p className="mt-2 line-clamp-2 text-muted">{team.description}</p>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
