// @vitest-environment node
import { describe, expect, it } from "vitest";
import { jwtVerify } from "jose";
import { mintSupabaseToken } from "./jwt";

const SECRET = "super-secret-jwt-token-with-at-least-32-characters-long";

describe("mintSupabaseToken", () => {
  it("signs an authenticated token that feeds auth.uid()", async () => {
    const token = await mintSupabaseToken({ sub: "user-1", email: "a@x.com", role: "authenticated" }, { secret: SECRET });
    const { payload, protectedHeader } = await jwtVerify(token, new TextEncoder().encode(SECRET), { audience: "authenticated" });
    expect(protectedHeader.alg).toBe("HS256");
    expect(payload).toMatchObject({ sub: "user-1", email: "a@x.com", role: "authenticated" });
    expect(payload.exp! - payload.iat!).toBe(600);
  });

  it("signs service-role tokens without a subject", async () => {
    const token = await mintSupabaseToken({ role: "service_role" }, { secret: SECRET, ttlSeconds: 60 });
    const { payload } = await jwtVerify(token, new TextEncoder().encode(SECRET));
    expect(payload.role).toBe("service_role");
    expect(payload.sub).toBeUndefined();
  });

  it("requires the secret", async () => {
    const previous = process.env.SUPABASE_JWT_SECRET;
    delete process.env.SUPABASE_JWT_SECRET;
    await expect(mintSupabaseToken({ role: "authenticated", sub: "x" })).rejects.toThrow(/SUPABASE_JWT_SECRET/);
    process.env.SUPABASE_JWT_SECRET = previous;
  });
});
