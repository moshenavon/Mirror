import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createAnonClient } from "@/lib/supabase/server";
import { publicTokenSchema } from "@/lib/validation";
import { PageSkeleton } from "@/components/page-skeleton";
import { ReportBoard, type ReportField } from "@/components/report-board";
import { Emoji } from "@/components/emoji";
import { Avatar } from "@/components/avatar";
import { getOptionalUser } from "@/lib/data";
import { submitPublicEntry } from "@/app/actions/public-entries";
import { GoogleSignInButton } from "@/app/login/google-sign-in-button";

export const metadata: Metadata = {
  title: "שיתוף תובנה",
  robots: { index: false, follow: false },
};

type PublicForm = {
  team_name: string;
  requires_identity?: boolean;
  fields: (ReportField & { position: number })[];
};

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

  const [{ data }, user] = await Promise.all([
    createAnonClient().rpc("get_public_form", { p_token: token }),
    getOptionalUser(),
  ]);
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

  const fields = form.fields.map((f) => ({ id: f.id, label: f.label, emoji: f.emoji, placeholder: f.placeholder }));

  if (form.requires_identity) {
    if (!user) {
      return (
        <div className="mx-auto max-w-md animate-pop-in rounded-[2rem] border border-border bg-surface p-8 text-center shadow-xl shadow-primary/5 sm:p-10">
          <Emoji value="🪪" size={88} className="mx-auto" />
          <p className="mt-4 text-sm font-semibold text-muted">שיתוף עבור</p>
          <h1 className="text-3xl font-extrabold">{form.team_name}</h1>
          <p className="mt-3 text-lg text-muted">כדי לדווח בקישור הזה צריך להזדהות. הדיווחים יישמרו בשמך.</p>
          <div className="mt-8">
            <GoogleSignInButton next={`/r/${token}`} />
          </div>
        </div>
      );
    }

    return (
      <section>
        <div className="mb-8 animate-fade-up">
          <p className="text-sm font-semibold text-muted">שיתוף עבור</p>
          <h1 className="text-3xl font-extrabold sm:text-4xl">{form.team_name}</h1>
          <p className="mt-2 text-lg text-muted">בחרו נושא, כתבו מה על הלב – ושלחו.</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary-soft py-1.5 pe-4 ps-1.5 text-sm">
            <Avatar name={user.name} src={user.avatarUrl} size={28} />
            מדווחים בתור <span className="font-semibold">{user.name}</span>
          </p>
        </div>
        <ReportBoard anonymity="never" onSubmit={submitPublicEntry.bind(null, token)} fields={fields} />
      </section>
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
        fields={fields}
      />
    </section>
  );
}
