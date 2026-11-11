import type { Metadata } from "next";
import { CreateTeamForm } from "./create-team-form";
import { cardClass } from "@/components/ui";

export const metadata: Metadata = { title: "צוות חדש" };

export default function NewTeamPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold">צוות חדש</h1>
      <p className="mt-1 text-muted">
        אתם תהיו מנהלי הצוות. בשלב הבא תוכלו להוסיף חברים לפי כתובת מייל ולהתאים את שדות הדיווח.
      </p>
      <div className={`${cardClass} mt-6`}>
        <CreateTeamForm />
      </div>
    </main>
  );
}
