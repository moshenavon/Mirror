import { NextResponse, type NextRequest } from "next/server";
import {
  OAUTH_COOKIE,
  OAUTH_MAX_AGE_SECONDS,
  buildGoogleAuthUrl,
  getGoogleConfig,
  pkceChallenge,
  randomToken,
  sealOAuthTransaction,
} from "@/lib/auth/google";
import { oauthSecret } from "@/lib/auth/oauth-secret";
import { safeNextPath } from "@/lib/routes";

/** Starts "Sign in with Google" (Authorization Code + PKCE, directly with Google). */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  let clientId: string;
  try {
    clientId = getGoogleConfig().clientId;
  } catch {
    return NextResponse.redirect(new URL("/login?error=config", origin));
  }

  const state = randomToken();
  const nonce = randomToken();
  const verifier = randomToken(48);
  const next = safeNextPath(searchParams.get("next"));

  const authUrl = buildGoogleAuthUrl({
    clientId,
    redirectUri: `${origin}/auth/callback`,
    state,
    nonce,
    codeChallenge: await pkceChallenge(verifier),
  });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(OAUTH_COOKIE, await sealOAuthTransaction({ state, nonce, verifier, next }, oauthSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth",
    maxAge: OAUTH_MAX_AGE_SECONDS,
  });
  return response;
}
