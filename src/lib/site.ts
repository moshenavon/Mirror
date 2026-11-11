export const SITE_NAME = "Mirror";
export const SITE_DESCRIPTION = "מחשבות ותובנות של הצוות, מסודרות לפגישת הרטרו.";

/** Absolute site URL (used for metadata, OAuth redirect URIs fallback and share links). */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
