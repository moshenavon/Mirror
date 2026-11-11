import { SignJWT, jwtVerify } from "jose";

/** HttpOnly cookie that holds the signed session. */
export const SESSION_COOKIE = "mirror_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const ISSUER = "mirror";
const AUDIENCE = "mirror-session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

function secretKey(secret = process.env.SESSION_SECRET): Uint8Array {
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to a random string of at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser, secret?: string, now = Date.now()): Promise<string> {
  const iat = Math.floor(now / 1000);
  return new SignJWT({ email: user.email, name: user.name, picture: user.avatarUrl })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(iat)
    .setExpirationTime(iat + SESSION_MAX_AGE_SECONDS)
    .sign(secretKey(secret));
}

/** Returns the session user for a valid, unexpired token; otherwise null. */
export async function verifySessionToken(token: string | undefined | null, secret?: string): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(secret), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    return {
      id: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" && payload.name ? payload.name : payload.email.split("@")[0],
      avatarUrl: typeof payload.picture === "string" ? payload.picture : null,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
