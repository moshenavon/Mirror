import { NextResponse, type NextRequest } from "next/server";
import {
  OAUTH_COOKIE,
  exchangeCodeForIdToken,
  getGoogleConfig,
  openOAuthTransaction,
  verifyGoogleIdToken,
} from "@/lib/auth/google";
import { oauthSecret } from "@/lib/auth/oauth-secret";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";

function fail(origin: string, reason: string) {
  const response = NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(reason)}`, origin));
  response.cookies.delete({ name: OAUTH_COOKIE, path: "/auth" });
  return response;
}

/** Google redirects here with ?code&state. */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  if (searchParams.get("error")) return fail(origin, "denied");

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const tx = await openOAuthTransaction(request.cookies.get(OAUTH_COOKIE)?.value, oauthSecret());
  if (!code || !state || !tx || tx.state !== state) return fail(origin, "state");

  try {
    const { clientId, clientSecret } = getGoogleConfig();
    const idToken = await exchangeCodeForIdToken({
      code,
      codeVerifier: tx.verifier,
      clientId,
      clientSecret,
      redirectUri: `${origin}/auth/callback`,
    });
    const identity = await verifyGoogleIdToken(idToken, { clientId, nonce: tx.nonce });

    const db = await createServiceClient();
    const { data: profile, error } = await db
      .from("profiles")
      .upsert(
        {
          google_sub: identity.sub,
          email: identity.email,
          full_name: identity.name,
          avatar_url: identity.picture,
        },
        { onConflict: "google_sub" },
      )
      .select("id, email, full_name, avatar_url")
      .single();
    if (error || !profile) throw new Error(error?.message ?? "Profile upsert failed");

    const session = await createSessionToken({
      id: profile.id,
      email: profile.email,
      name: profile.full_name ?? profile.email.split("@")[0],
      avatarUrl: profile.avatar_url,
    });

    const response = NextResponse.redirect(new URL(tx.next, origin));
    response.cookies.set(SESSION_COOKIE, session, sessionCookieOptions());
    response.cookies.delete({ name: OAUTH_COOKIE, path: "/auth" });
    return response;
  } catch (error) {
    console.error("Google sign-in failed:", error instanceof Error ? error.message : error);
    return fail(origin, "auth");
  }
}
