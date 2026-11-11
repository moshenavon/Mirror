/** Key used to seal the short-lived OAuth transaction cookie. */
export function oauthSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET is not configured");
  return new TextEncoder().encode(`oauth:${secret}`);
}
