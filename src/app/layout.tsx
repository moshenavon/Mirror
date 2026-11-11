import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { UserMenu } from "@/components/user-menu";
import { Logo } from "@/components/logo";
import { MotionProvider } from "@/components/motion-provider";
import { ThemeColorGuard } from "@/components/theme-color-guard";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: "he_IL",
  },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION },
  appleWebApp: { title: SITE_NAME, capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffd02f" },
    { media: "(prefers-color-scheme: dark)", color: "#050038" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <ThemeColorGuard />
        <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <Link href="/" className="group flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
              <Logo size={32} className="transition duration-300 group-hover:-rotate-6 group-hover:scale-110" />
              Mirror
            </Link>
            <Suspense fallback={null}>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        <MotionProvider>
          <div className="flex flex-1 flex-col">{children}</div>
        </MotionProvider>
        <footer className="py-6 text-center text-xs text-muted">
          אימוג&apos;י מונפשים:{" "}
          <a
            href="https://googlefonts.github.io/noto-emoji-animation/"
            className="underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Noto Emoji Animation
          </a>{" "}
          (CC BY 4.0)
        </footer>
      </body>
    </html>
  );
}
