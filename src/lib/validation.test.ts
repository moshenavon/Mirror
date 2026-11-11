import { describe, expect, it } from "vitest";
import { entryContentSchema, fieldSchema, firstError, publicTokenSchema, teamSchema, uuidSchema } from "./validation";

describe("validation", () => {
  it("validates and trims team input", () => {
    expect(teamSchema.parse({ name: "  הצוות שלי ", description: "  " })).toEqual({
      name: "הצוות שלי",
      description: null,
    });
    const bad = teamSchema.safeParse({ name: "   " });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(firstError(bad.error)).toBe("יש להזין שם צוות");
    expect(teamSchema.safeParse({ name: "x".repeat(81) }).success).toBe(false);
  });

  it("defaults the field emoji", () => {
    expect(fieldSchema.parse({ label: "שדה", emoji: "" })).toEqual({ label: "שדה", emoji: "💬", placeholder: null });
    expect(fieldSchema.parse({ label: "שדה", emoji: "🎉", placeholder: " עזרה " }).placeholder).toBe("עזרה");
  });

  it("rejects empty and too long entries", () => {
    expect(entryContentSchema.safeParse("  ").success).toBe(false);
    expect(entryContentSchema.safeParse("x".repeat(2001)).success).toBe(false);
    expect(entryContentSchema.parse("  hello ")).toBe("hello");
  });

  it("validates uuids", () => {
    expect(uuidSchema.safeParse("d3b07384-d9a0-4c3f-8a5e-2f5c6c7b9a10").success).toBe(true);
    expect(uuidSchema.safeParse("not-a-uuid").success).toBe(false);
  });

  it("validates public link tokens", () => {
    expect(publicTokenSchema.safeParse("a1".repeat(32)).success).toBe(true);
    expect(publicTokenSchema.safeParse("short").success).toBe(false);
    expect(publicTokenSchema.safeParse("Z".repeat(64)).success).toBe(false);
    expect(publicTokenSchema.safeParse("../etc/passwd").success).toBe(false);
  });
});
