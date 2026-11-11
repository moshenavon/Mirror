// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import {
  buildGoogleAuthUrl,
  exchangeCodeForIdToken,
  openOAuthTransaction,
  pkceChallenge,
  randomToken,
  sealOAuthTransaction,
  verifyGoogleIdToken,
} from "./google";

const CLIENT_ID = "client-123.apps.googleusercontent.com";

async function googleKeys() {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256" };
  return { privateKey, jwks: createLocalJWKSet({ keys: [jwk] }) };
}

async function idToken(privateKey: CryptoKey, claims: Record<string, unknown> = {}) {
  return new SignJWT({ email: "Moshe@Gmail.com", email_verified: true, name: "משה", picture: "https://p", nonce: "n1", ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setIssuer("https://accounts.google.com")
    .setAudience(CLIENT_ID)
    .setSubject("google-sub-1")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

describe("Google OAuth helpers", () => {
  it("creates url-safe random tokens", () => {
    const a = randomToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomToken()).not.toBe(a);
  });

  it("computes the RFC 7636 S256 challenge", async () => {
    // Test vector from RFC 7636 Appendix B
    expect(await pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });

  it("builds the authorization URL", () => {
    const url = new URL(
      buildGoogleAuthUrl({ clientId: CLIENT_ID, redirectUri: "https://app/auth/callback", state: "s", nonce: "n", codeChallenge: "c" }),
    );
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: CLIENT_ID,
      redirect_uri: "https://app/auth/callback",
      response_type: "code",
      scope: "openid email profile",
      state: "s",
      nonce: "n",
      code_challenge: "c",
      code_challenge_method: "S256",
    });
  });

  it("seals and opens the OAuth transaction cookie", async () => {
    const secret = new TextEncoder().encode("x".repeat(40));
    const tx = { state: "s", nonce: "n", verifier: "v", next: "/teams/1" };
    const sealed = await sealOAuthTransaction(tx, secret);
    expect(await openOAuthTransaction(sealed, secret)).toEqual(tx);
    expect(await openOAuthTransaction(sealed, new TextEncoder().encode("y".repeat(40)))).toBeNull();
    expect(await openOAuthTransaction(undefined, secret)).toBeNull();
  });

  it("exchanges the code with PKCE", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ id_token: "tok" }), { status: 200 }));
    const token = await exchangeCodeForIdToken({
      code: "c",
      codeVerifier: "v",
      clientId: CLIENT_ID,
      clientSecret: "secret",
      redirectUri: "https://app/auth/callback",
      fetchImpl,
    });
    expect(token).toBe("tok");
    const body = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as URLSearchParams;
    expect(body.get("code_verifier")).toBe("v");
    expect(body.get("grant_type")).toBe("authorization_code");
  });

  it("fails the exchange on Google errors", async () => {
    const fetchImpl = vi.fn(async () => new Response("bad", { status: 400 }));
    await expect(
      exchangeCodeForIdToken({ code: "c", codeVerifier: "v", clientId: CLIENT_ID, clientSecret: "s", redirectUri: "r", fetchImpl }),
    ).rejects.toThrow(/400/);
  });

  describe("verifyGoogleIdToken", () => {
    it("accepts a valid token and lower-cases the e-mail", async () => {
      const { privateKey, jwks } = await googleKeys();
      const identity = await verifyGoogleIdToken(await idToken(privateKey), { clientId: CLIENT_ID, nonce: "n1", jwks });
      expect(identity).toEqual({ sub: "google-sub-1", email: "moshe@gmail.com", name: "משה", picture: "https://p" });
    });

    it("rejects a wrong nonce, unverified e-mail or another audience", async () => {
      const { privateKey, jwks } = await googleKeys();
      await expect(verifyGoogleIdToken(await idToken(privateKey), { clientId: CLIENT_ID, nonce: "other", jwks })).rejects.toThrow(
        /nonce/,
      );
      await expect(
        verifyGoogleIdToken(await idToken(privateKey, { email_verified: false }), { clientId: CLIENT_ID, nonce: "n1", jwks }),
      ).rejects.toThrow(/verified/);
      await expect(verifyGoogleIdToken(await idToken(privateKey), { clientId: "someone-else", nonce: "n1", jwks })).rejects.toThrow();
    });

    it("rejects tokens signed by an unknown key", async () => {
      const { jwks } = await googleKeys();
      const { privateKey: otherKey } = await googleKeys();
      await expect(verifyGoogleIdToken(await idToken(otherKey), { clientId: CLIENT_ID, nonce: "n1", jwks })).rejects.toThrow();
    });
  });
});
