import { SignJWT } from "jose";

type Role = "authenticated" | "service_role";

/**
 * Signs a short-lived JWT that Supabase (PostgREST) accepts. `sub` feeds
 * auth.uid() so all Row Level Security policies keep working without
 * Supabase Auth.
 */
export async function mintSupabaseToken(
  claims: { sub?: string; email?: string; role: Role },
  options: { secret?: string; ttlSeconds?: number; now?: number } = {},
): Promise<string> {
  const secret = options.secret ?? process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("SUPABASE_JWT_SECRET is not configured");
  const iat = Math.floor((options.now ?? Date.now()) / 1000);
  const jwt = new SignJWT({ role: claims.role, ...(claims.email ? { email: claims.email } : {}) })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("mirror")
    .setAudience("authenticated")
    .setIssuedAt(iat)
    .setExpirationTime(iat + (options.ttlSeconds ?? 600));
  if (claims.sub) jwt.setSubject(claims.sub);
  return jwt.sign(new TextEncoder().encode(secret));
}
