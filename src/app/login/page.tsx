import type { Metadata } from "next";
import { Suspense } from "react";
import { GoogleSignInButton } from "./google-sign-in-button";
import { Logo } from "@/components/logo";
import { Emoji } from "@/components/emoji";

export const metadata: Metadata = { title: "התחברות" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="relative w-full max-w-md animate-pop-in rounded-[2rem] border border-border bg-surface p-8 text-center shadow-xl shadow-primary/5 sm:p-10">
        <div className="pointer-events-none absolute -top-7 left-6 -rotate-12" aria-hidden>
          <Emoji value="🎉" size={56} />
        </div>
        <div className="pointer-events-none absolute -bottom-6 right-6 rotate-6" aria-hidden>
          <Emoji value="💡" size={48} />
        </div>
        <div className="mx-auto mb-5 w-fit animate-float">
          <Logo size={88} className="shadow-lg" />
        </div>
        <h1 className="font-logo text-4xl font-extrabold tracking-tight">Mirror</h1>
        <p className="mt-3 text-lg text-muted">
          מתעדים מחשבות ותובנות לאורך הדרך,
          <br />
          ומדברים עליהן בפגישת הרטרו.
        </p>
        <div className="mt-8">
          <Suspense fallback={<div className="h-[60px] rounded-2xl bg-primary-soft" />}>
            <GoogleSignInButton />
          </Suspense>
        </div>
        <p className="mt-6 text-sm text-muted">ההתחברות מתבצעת עם חשבון Google שהמייל שלו שויך לצוות.</p>
      </div>
    </main>
  );
}
