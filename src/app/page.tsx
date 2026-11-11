import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser, getMyTeams } from "@/lib/data";
import { buttonClass, cardClass } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { Emoji } from "@/components/emoji";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <div className="mb-8 flex animate-fade-up flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">הצוותים שלי</h1>
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
      <div className={`${cardClass} animate-pop-in text-center`}>
        <Emoji value="🚀" size={96} className="mx-auto" />
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
      {teams.map((team, index) => (
        <li key={team.id} className="animate-fade-up stagger" style={{ "--i": index } as React.CSSProperties}>
          <Link
            href={`/teams/${team.id}`}
            className={`${cardClass} group block h-full transition duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-xl hover:shadow-accent/15`}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold">
                {team.name}
                <span className="ms-2 inline-block opacity-0 transition group-hover:-translate-x-1 group-hover:opacity-100">
                  ←
                </span>
              </h2>
              {team.role === "admin" && (
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-on-accent">
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
