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
    <div className="mb-6 animate-fade-up space-y-3 sm:mb-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition hover:text-foreground"
      >
        <span aria-hidden>→</span> כל הצוותים
      </Link>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{team.name}</h1>
    </div>
  );
}

async function TeamNavBar({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { team, permissions } = await getTeamContext(teamId);
  return <TeamNav teamId={team.id} canViewInsights={permissions.canViewInsights} isAdmin={permissions.isAdmin} />;
}
