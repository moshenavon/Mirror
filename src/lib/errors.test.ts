import { describe, expect, it } from "vitest";
import { dbErrorMessage } from "./errors";

describe("dbErrorMessage", () => {
  it("maps known database errors", () => {
    expect(dbErrorMessage({ code: "P0001", hint: "last_admin", message: "" })).toContain("מנהל אחד");
    expect(dbErrorMessage({ code: "P0001", message: "Field is not active" })).toContain("לא פעיל");
    expect(dbErrorMessage({ code: "P0001", hint: "link_disabled" })).toContain("הקישור");
    expect(dbErrorMessage({ code: "28000", hint: "identity_required" })).toContain("להתחבר עם Google");
    expect(dbErrorMessage({ code: "23505" })).toBe("הרשומה כבר קיימת");
    expect(dbErrorMessage({ code: "23503" })).toContain("קיימים דיווחים");
    expect(dbErrorMessage({ code: "42501" })).toContain("הרשאה");
  });

  it("falls back for unknown or missing errors", () => {
    expect(dbErrorMessage({ code: "XX000" })).toBe("אירעה שגיאה, נסו שוב");
    expect(dbErrorMessage(null, "fallback")).toBe("fallback");
  });
});
