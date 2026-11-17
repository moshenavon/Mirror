import { Suspense } from "react";
import { notFound } from "next/navigation";
import { uuidSchema } from "@/lib/validation";
import { getFields, getMentionables, getTeamContext } from "@/lib/data";
import { PageSkeleton } from "@/components/page-skeleton";
import { ReportBoard } from "@/components/report-board";
import { createEntry } from "@/app/actions/entries";

export default function ReportPage({ params }: PageProps<"/teams/[teamId]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <Report params={params} />
    </Suspense>
  );
}

async function Report({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  if (!uuidSchema.safeParse(teamId).success) notFound();
  // All reads are cached on the server and run in parallel; fields and members are RLS-protected,
  // and getTeamContext 404s for non-members.
  const [{ team, user }, fields, mentionables] = await Promise.all([
    getTeamContext(teamId),
    getFields(teamId, true),
    getMentionables(teamId),
  ]);
  const firstName = user.name.split(" ")[0];

  return (
    <section>
      <p className="mb-6 animate-fade-up text-xl text-muted">
        היי {firstName} 👋 <span className="font-semibold text-foreground">מה בא לך לשתף?</span>
      </p>
      <ReportBoard
        onSubmit={createEntry.bind(null, team.id)}
        mentionables={mentionables}
        fields={fields.map((f) => ({ id: f.id, label: f.label, emoji: f.emoji, placeholder: f.placeholder }))}
      />
    </section>
  );
}
