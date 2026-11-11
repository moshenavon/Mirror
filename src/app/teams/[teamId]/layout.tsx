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
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-xl font-bold text-muted shadow-sm transition hover:bg-primary-soft hover:text-foreground sm:size-11"
      >
        <span aria-hidden>→</span>
      </Link>
      <h1 className="min-w-0 break-words text-3xl font-extrabold tracking-tight sm:text-4xl">{team.name}</h1>
    </div>
  );
}

async function TeamNavBar({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { team, permissions } = await getTeamContext(teamId);
  return <TeamNav teamId={team.id} canViewInsights={permissions.canViewInsights} isAdmin={permissions.isAdmin} />;
}
