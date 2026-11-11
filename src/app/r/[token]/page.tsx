import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createAnonClient } from "@/lib/supabase/server";
import { publicTokenSchema } from "@/lib/validation";
import { PageSkeleton } from "@/components/page-skeleton";
import { ReportBoard, type ReportField } from "@/components/report-board";
import { Emoji } from "@/components/emoji";
import { submitPublicEntry } from "@/app/actions/public-entries";

export const metadata: Metadata = {
  title: "שיתוף תובנה",
  robots: { index: false, follow: false },
};

type PublicForm = { team_name: string; fields: (ReportField & { position: number })[] };

export default function PublicReportPage({ params }: PageProps<"/r/[token]">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <Suspense fallback={<PageSkeleton rows={2} />}>
        <PublicReport params={params} />
      </Suspense>
    </main>
  );
}

async function PublicReport({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!publicTokenSchema.safeParse(token).success) notFound();

  const { data } = await createAnonClient().rpc("get_public_form", { p_token: token });
  const form = data as PublicForm | null;
  if (!form) {
    return (
      <div className="mx-auto max-w-md animate-pop-in py-16 text-center">
        <Emoji value="🤔" size={96} className="mx-auto" />
        <h1 className="mt-4 text-2xl font-bold">הקישור לא פעיל</h1>
        <p className="mt-2 text-muted">ייתכן שמנהל הצוות ביטל או החליף אותו.</p>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-8 animate-fade-up">
        <p className="text-sm font-semibold text-muted">שיתוף אנונימי עבור</p>
        <h1 className="text-3xl font-extrabold sm:text-4xl">{form.team_name}</h1>
        <p className="mt-2 text-lg text-muted">בחרו נושא, כתבו מה על הלב – ושלחו. בלי שם, בלי הזדהות. 🎭</p>
      </div>
      <ReportBoard
        anonymity="always"
        onSubmit={submitPublicEntry.bind(null, token)}
        fields={form.fields.map((f) => ({ id: f.id, label: f.label, emoji: f.emoji, placeholder: f.placeholder }))}
      />
    </section>
  );
}
