// @vitest-environment node
import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { createSessionToken, verifySessionToken, SESSION_MAX_AGE_SECONDS } from "./session";

const SECRET = "test-secret-test-secret-test-secret-123";
const user = { id: "6f1c1d1e-0000-4000-8000-000000000001", email: "moshe@x.com", name: "משה נבון", avatarUrl: "https://a/p.png" };

describe("session tokens", () => {
  it("round-trips the user", async () => {
    const token = await createSessionToken(user, SECRET);
    expect(await verifySessionToken(token, SECRET)).toEqual(user);
  });

  it("rejects tampered, foreign or missing tokens", async () => {
    const token = await createSessionToken(user, SECRET);
    expect(await verifySessionToken(token.slice(0, -2) + "xx", SECRET)).toBeNull();
    expect(await verifySessionToken(token, "another-secret-another-secret-12345")).toBeNull();
    expect(await verifySessionToken(undefined, SECRET)).toBeNull();
    expect(await verifySessionToken("not-a-jwt", SECRET)).toBeNull();
  });

  it("expires after the session lifetime", async () => {
    const issued = Date.now() - (SESSION_MAX_AGE_SECONDS + 60) * 1000;
    const token = await createSessionToken(user, SECRET, issued);
    expect(await verifySessionToken(token, SECRET)).toBeNull();
  });

  it("does not accept tokens minted for another audience (e.g. Supabase JWTs)", async () => {
    const other = await new SignJWT({ email: user.email })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setAudience("authenticated")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifySessionToken(other, SECRET)).toBeNull();
  });

  it("requires a strong secret", async () => {
    await expect(createSessionToken(user, "short")).rejects.toThrow(/SESSION_SECRET/);
  });
});
