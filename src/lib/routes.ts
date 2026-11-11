/** Paths reachable without signing in. */
const PUBLIC_PREFIXES = ["/login", "/auth/", "/r/", "/credits"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Sanitises a post-login redirect target so only same-origin relative paths
 * are accepted (prevents open redirects such as `//evil.com`).
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\r\n]/.test(next)) return fallback;
  if (next.startsWith("/login") || next.startsWith("/auth/")) return fallback;
  return next;
}
