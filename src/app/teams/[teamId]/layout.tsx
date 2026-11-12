import Link from "next/link";
import { Suspense } from "react";
import { getTeamContext } from "@/lib/data";
import { TeamNav } from "@/components/team-nav";

export default function TeamLayout({ children, params }: LayoutProps<"/teams/[teamId]">) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pt-6 sm:pt-8">
      <Suspense fallback={<div className="mb-6 h-20 animate-pulse rounded-2xl bg-border/60" />}>
        <TeamHeader params={params} />
      </Suspense>
      <div className="flex-1">{children}</div>
      {/* Pinned to the bottom of the screen while scrolling. */}
      <Suspense fallback={<div aria-hidden className="sticky bottom-0 -mx-4 mt-8 h-[3.25rem] border-t border-border bg-surface/90" />}>
        <TeamNavBar params={params} />
      </Suspense>
    </div>
  );
}

async function TeamHeader({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { team } = await getTeamContext(teamId);
  return (
    // RTL: the back button comes first, so it sits to the right of the team name.
    <div className="mb-6 flex animate-fade-up items-center gap-3 sm:mb-8">
      <Link
        href="/"
        aria-label="כל הצוותים"
        title="כל הצוותים"
        className="inline-flex shrink-0 items-center justify-center text-muted transition hover:text-foreground"
      >
        {/* Thin-stroke arrow pointing right (= back in RTL). */}
        <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-7 sm:size-8">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
      <span aria-hidden className="h-8 w-px shrink-0 bg-border sm:h-10" />
      <h1 className="min-w-0 break-words text-3xl font-extrabold tracking-tight sm:text-4xl">{team.name}</h1>
    </div>
  );
}

async function TeamNavBar({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { team, permissions } = await getTeamContext(teamId);
  return <TeamNav teamId={team.id} canViewInsights={permissions.canViewInsights} isAdmin={permissions.isAdmin} />;
}
