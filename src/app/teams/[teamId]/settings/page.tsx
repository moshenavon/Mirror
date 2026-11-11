import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getFields, getMembers, getTeamContext } from "@/lib/data";
import { PageSkeleton } from "@/components/page-skeleton";
import { cardClass } from "@/components/ui";
import { TeamDetailsForm } from "@/components/settings/team-details-form";
import { InsightsVisibilityToggle } from "@/components/settings/insights-visibility-toggle";
import { FieldsManager } from "@/components/settings/fields-manager";
import { MembersManager } from "@/components/settings/members-manager";
import { DangerZone } from "@/components/settings/danger-zone";
import { Emoji } from "@/components/emoji";
import { PublicLinkSettings } from "@/components/settings/public-link-settings";
import { headers } from "next/headers";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = { title: "הגדרות צוות" };

export default function SettingsPage({ params, searchParams }: PageProps<"/teams/[teamId]/settings">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <Settings params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Settings({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
  const { team, permissions, user } = await getTeamContext(teamId);
  if (!permissions.isAdmin) notFound();
  const [fields, members, requestHeaders] = await Promise.all([getFields(team.id), getMembers(team.id), headers()]);
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : siteUrl();

  return (
    <div className="space-y-6 [&>section]:animate-fade-up">
      {query.created === "1" && (
        <div className="flex animate-pop-in items-center gap-4 rounded-2xl border border-success/30 bg-success-soft p-5">
          <Emoji value="🎉" size={64} />
          <div>
          <p className="text-lg font-semibold">הצוות נוצר!</p>
          <p className="mt-1">
            עכשיו הוסיפו את חברי הצוות לפי כתובת המייל של חשבון Google שלהם, והתאימו את שדות הדיווח.
          </p>
          </div>
        </div>
      )}

      <section className={cardClass} aria-labelledby="members-title">
        <h2 id="members-title" className="mb-1 text-xl font-semibold">
          חברי הצוות
        </h2>
        <p className="mb-4 text-sm text-muted">
          כל מי שמתחבר עם חשבון Google שהמייל שלו מופיע כאן – משויך לצוות.
        </p>
        <MembersManager
          teamId={team.id}
          currentEmail={user.email}
          members={members.map((m) => ({
            id: m.id,
            email: m.email,
            role: m.role,
            name: m.profile?.full_name ?? null,
            avatarUrl: m.profile?.avatar_url ?? null,
          }))}
        />
      </section>

      <section className={cardClass} aria-labelledby="fields-title">
        <h2 id="fields-title" className="mb-1 text-xl font-semibold">
          שדות דיווח
        </h2>
        <p className="mb-4 text-sm text-muted">
          השדות מוצגים כפתורים במסך הדיווח, ובמסך התובנות הדיון מתנהל לפי הסדר שנקבע כאן.
        </p>
        <FieldsManager
          teamId={team.id}
          fields={fields.map((f) => ({
            id: f.id,
            label: f.label,
            emoji: f.emoji,
            placeholder: f.placeholder,
            isActive: f.is_active,
          }))}
        />
      </section>

      <section className={cardClass} aria-labelledby="public-title">
        <h2 id="public-title" className="mb-4 text-xl font-semibold">
          קישור ציבורי למילוי
        </h2>
        <PublicLinkSettings
          teamId={team.id}
          enabled={team.public_submissions_enabled}
          requiresIdentity={team.public_requires_identity}
          token={team.public_token ?? ""}
          origin={origin}
        />
      </section>

      <section className={cardClass} aria-labelledby="insights-title">
        <h2 id="insights-title" className="mb-4 text-xl font-semibold">
          מי יכול לפתוח את מסך התובנות?
        </h2>
        <InsightsVisibilityToggle teamId={team.id} value={team.insights_visibility} />
      </section>

      <section className={cardClass} aria-labelledby="details-title">
        <h2 id="details-title" className="mb-4 text-xl font-semibold">
          פרטי הצוות
        </h2>
        <TeamDetailsForm teamId={team.id} name={team.name} description={team.description} />
      </section>

      <DangerZone teamId={team.id} teamName={team.name} />
    </div>
  );
}
