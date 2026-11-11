import type { Metadata } from "next";

export const metadata: Metadata = { title: "קרדיטים" };

const linkClass = "font-medium text-foreground underline underline-offset-2";

export default function CreditsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight">קרדיטים</h1>
      <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-bold">אימוג&apos;י מונפשים</h2>
        <p className="mt-2 text-muted">
          האימוג&apos;י המונפשים באתר לקוחים מ־
          <a href="https://googlefonts.github.io/noto-emoji-animation/" className={linkClass} target="_blank" rel="noreferrer">
            Noto Emoji Animation
          </a>{" "}
          של Google, ומופצים ברישיון{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" className={linkClass} target="_blank" rel="noreferrer">
            Creative Commons Attribution 4.0 (CC BY 4.0)
          </a>
          .
        </p>
      </section>
    </main>
  );
}
