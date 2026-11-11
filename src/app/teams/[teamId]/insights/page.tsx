import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getFields, getInsights, getTeamContext } from "@/lib/data";
import { RANGE_PRESETS, presetRange, rangeToInterval, resolveRange } from "@/lib/dates";
import { PageSkeleton } from "@/components/page-skeleton";
import { InsightsView } from "@/components/insights/insights-view";

export const metadata: Metadata = { title: "תובנות" };

export default function InsightsPage({ params, searchParams }: PageProps<"/teams/[teamId]/insights">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <Insights params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Insights({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
  const { team, permissions } = await getTeamContext(teamId);
  if (!permissions.canViewInsights) notFound();

  const now = new Date();
  const range = resolveRange({ from: query.from, to: query.to }, now);
  const { fromIso, toIso } = rangeToInterval(range);
  const [fields, rows] = await Promise.all([getFields(team.id), getInsights(team.id, fromIso, toIso)]);

  return (
    <InsightsView
      key={`${range.from}_${range.to}`}
      teamId={team.id}
      teamName={team.name}
      range={range}
      presets={RANGE_PRESETS.map((p) => ({ id: p.id, label: p.label, range: presetRange(p.id, now) }))}
      fields={fields.map((f) => ({ id: f.id, label: f.label, emoji: f.emoji, position: f.position }))}
      entries={rows.map((r) => ({
        entry_id: r.entry_id,
        field_id: r.field_id,
        content: r.content,
        created_at: r.created_at,
        author_id: r.author_id,
        author_name: r.author_name,
        author_email: r.author_email,
        author_avatar_url: r.author_avatar_url,
      }))}
    />
  );
}
