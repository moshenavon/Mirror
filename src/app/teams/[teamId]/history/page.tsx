import type { Metadata } from "next";
import { Suspense } from "react";
import { getFields, getMyEntries, getTeamContext } from "@/lib/data";
import { PageSkeleton } from "@/components/page-skeleton";
import { HistoryList } from "@/components/history-list";

export const metadata: Metadata = { title: "הדיווחים שלי" };

export default function HistoryPage({ params }: PageProps<"/teams/[teamId]/history">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <History params={params} />
    </Suspense>
  );
}

async function History({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { team } = await getTeamContext(teamId);
  const [fields, entries] = await Promise.all([getFields(team.id), getMyEntries(team.id)]);

  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold">הדיווחים שלי</h2>
      <HistoryList
        fields={fields.map((f) => ({ id: f.id, label: f.label, emoji: f.emoji, isActive: f.is_active }))}
        entries={entries.map((e) => ({
          id: e.id,
          fieldId: e.field_id,
          content: e.content,
          createdAt: e.created_at,
          updatedAt: e.updated_at,
        }))}
      />
    </section>
  );
}
