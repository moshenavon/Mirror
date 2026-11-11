import type { Metadata } from "next";
import { Suspense } from "react";
import { GoogleSignInButton } from "./google-sign-in-button";

export const metadata: Metadata = { title: "התחברות" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 text-center shadow-sm sm:p-10">
        <div className="mb-4 text-6xl" aria-hidden>
          🪞
        </div>
        <h1 className="text-3xl font-bold">Mirror</h1>
        <p className="mt-3 text-lg text-muted">
          מתעדים מחשבות ותובנות לאורך הדרך,
          <br />
          ומדברים עליהן בפגישת הרטרו.
        </p>
        <div className="mt-8">
          <Suspense fallback={<div className="h-14 rounded-2xl bg-primary-soft" />}>
            <GoogleSignInButton />
          </Suspense>
        </div>
        <p className="mt-6 text-sm text-muted">ההתחברות מתבצעת עם חשבון Google שהמייל שלו שויך לצוות.</p>
      </div>
    </main>
  );
}
