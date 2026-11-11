import type { Metadata } from "next";
import { Suspense } from "react";
import { getActionItems, getTeamContext } from "@/lib/data";
import { PageSkeleton } from "@/components/page-skeleton";
import { ActionItemsList } from "@/components/action-items/action-items-list";

export const metadata: Metadata = { title: "משימות" };

export default function ActionItemsPage({ params }: PageProps<"/teams/[teamId]/action-items">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <ActionItems params={params} />
    </Suspense>
  );
}

async function ActionItems({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { team, permissions, user } = await getTeamContext(teamId);
  const items = await getActionItems(team.id);

  return (
    <section aria-labelledby="action-items-title">
      <div className="mb-4">
        <h2 id="action-items-title" className="text-xl font-semibold">
          Action items
        </h2>
        <p className="text-sm text-muted">משימות להמשך שנוצרו מתוך התובנות. משימה שבוצעה יורדת לסוף הרשימה.</p>
      </div>
      <ActionItemsList
        teamId={team.id}
        items={items}
        canViewInsights={permissions.canViewInsights}
        currentUserName={user.name || user.email}
      />
    </section>
  );
}
