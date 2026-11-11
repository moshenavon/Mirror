import { createRemoteJWKSet, jwtVerify, SignJWT, type JWTVerifyGetKey } from "jose";

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

/** Short-lived cookie holding state/nonce/PKCE verifier during the OAuth round-trip. */
export const OAUTH_COOKIE = "mirror_oauth";
export const OAUTH_MAX_AGE_SECONDS = 600;

export function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not configured");
  }
  return { clientId, clientSecret };
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** RFC 7636 S256 code challenge. */
export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

export function buildGoogleAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.search = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: params.state,
    nonce: params.nonce,
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account",
    access_type: "online",
  }).toString();
  return url.toString();
}

export type OAuthTransaction = { state: string; nonce: string; verifier: string; next: string };

export async function sealOAuthTransaction(tx: OAuthTransaction, secret: Uint8Array): Promise<string> {
  return new SignJWT({ ...tx })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${OAUTH_MAX_AGE_SECONDS}s`)
    .setAudience("mirror-oauth")
    .sign(secret);
}

export async function openOAuthTransaction(token: string | undefined, secret: Uint8Array): Promise<OAuthTransaction | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { audience: "mirror-oauth", algorithms: ["HS256"] });
    const { state, nonce, verifier, next } = payload as Record<string, unknown>;
    if ([state, nonce, verifier, next].some((v) => typeof v !== "string")) return null;
    return { state, nonce, verifier, next } as OAuthTransaction;
  } catch {
    return null;
  }
}

export async function exchangeCodeForIdToken(params: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const res = await (params.fetchImpl ?? fetch)(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code,
      code_verifier: params.codeVerifier,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const data = (await res.json()) as { id_token?: string };
  if (!data.id_token) throw new Error("Google did not return an id_token");
  return data.id_token;
}

export type GoogleIdentity = {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
};

let remoteJwks: JWTVerifyGetKey | null = null;
function googleJwks(): JWTVerifyGetKey {
  remoteJwks ??= createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
  return remoteJwks;
}

/** Verifies signature, issuer, audience, expiry, nonce and that the e-mail is verified. */
export async function verifyGoogleIdToken(
  idToken: string,
  options: { clientId: string; nonce: string; jwks?: JWTVerifyGetKey },
): Promise<GoogleIdentity> {
  const { payload } = await jwtVerify(idToken, options.jwks ?? googleJwks(), {
    issuer: GOOGLE_ISSUERS,
    audience: options.clientId,
    algorithms: ["RS256"],
  });
  if (payload.nonce !== options.nonce) throw new Error("Invalid nonce");
  if (typeof payload.sub !== "string" || typeof payload.email !== "string") throw new Error("Missing claims");
  if (payload.email_verified !== true && payload.email_verified !== "true") throw new Error("E-mail is not verified");
  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    name: typeof payload.name === "string" ? payload.name : null,
    picture: typeof payload.picture === "string" ? payload.picture : null,
  };
}
