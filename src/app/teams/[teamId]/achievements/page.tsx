import type { Metadata } from "next";
import { Suspense } from "react";
import { getAchievements, getTeamContext } from "@/lib/data";
import { toPlayer } from "@/lib/achievements";
import { PageSkeleton } from "@/components/page-skeleton";
import { AchievementsMap } from "@/components/achievements-map";

export const metadata: Metadata = { title: "הישגים" };

export default function AchievementsPage({ params }: PageProps<"/teams/[teamId]/achievements">) {
  return (
    <Suspense fallback={<PageSkeleton rows={5} />}>
      <Achievements params={params} />
    </Suspense>
  );
}

async function Achievements({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { team } = await getTeamContext(teamId);
  const rows = await getAchievements(team.id);
  return <AchievementsMap teamId={team.id} players={rows.map(toPlayer)} />;
}
