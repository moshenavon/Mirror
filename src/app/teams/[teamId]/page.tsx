import { Suspense } from "react";
import { getFields, getTeamContext } from "@/lib/data";
import { PageSkeleton } from "@/components/page-skeleton";
import { ReportBoard } from "@/components/report-board";

export default function ReportPage({ params }: PageProps<"/teams/[teamId]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <Report params={params} />
    </Suspense>
  );
}

async function Report({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { team, user } = await getTeamContext(teamId);
  const fields = await getFields(team.id, true);
  const firstName = user.name.split(" ")[0];

  return (
    <section>
      <p className="mb-6 text-xl text-muted">
        היי {firstName}, <span className="text-foreground">מה בא לך לשתף?</span>
      </p>
      <ReportBoard
        teamId={team.id}
        fields={fields.map((f) => ({ id: f.id, label: f.label, emoji: f.emoji, placeholder: f.placeholder }))}
      />
    </section>
  );
}
