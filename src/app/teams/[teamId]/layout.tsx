import { Suspense } from "react";
import { getTeamContext } from "@/lib/data";
import { TeamNav } from "@/components/team-nav";

export default function TeamLayout({ children, params }: LayoutProps<"/teams/[teamId]">) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <Suspense fallback={<div className="mb-6 h-20 animate-pulse rounded-2xl bg-border/60" />}>
        <TeamHeader params={params} />
      </Suspense>
      {children}
    </div>
  );
}

async function TeamHeader({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { team, permissions } = await getTeamContext(teamId);
  return (
    <div className="mb-6 space-y-3 sm:mb-8">
      <h1 className="text-2xl font-bold sm:text-3xl">{team.name}</h1>
      <TeamNav teamId={team.id} canViewInsights={permissions.canViewInsights} isAdmin={permissions.isAdmin} />
    </div>
  );
}
