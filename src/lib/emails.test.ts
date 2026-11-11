import { describe, expect, it } from "vitest";
import { isValidEmail, normalizeEmail, parseEmailList } from "./emails";

describe("emails", () => {
  it("normalizes case and whitespace", () => {
    expect(normalizeEmail("  Moshe@Gmail.COM ")).toBe("moshe@gmail.com");
  });

  it("validates addresses", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("no-at.example.com")).toBe(false);
    expect(isValidEmail("a b@c.com")).toBe(false);
  });

  it("parses lists separated by commas, semicolons, spaces and new lines", () => {
    const result = parseEmailList("a@x.com, B@x.com;c@x.com\nd@x.com   e@x.com");
    expect(result.valid).toEqual(["a@x.com", "b@x.com", "c@x.com", "d@x.com", "e@x.com"]);
    expect(result.invalid).toEqual([]);
  });

  it("dedupes case-insensitively and keeps input order", () => {
    expect(parseEmailList("b@x.com a@x.com B@X.com").valid).toEqual(["b@x.com", "a@x.com"]);
  });

  it("reports invalid tokens that look like addresses", () => {
    const result = parseEmailList("ok@x.com, bad@, @nope.com, x@y");
    expect(result.valid).toEqual(["ok@x.com"]);
    expect(result.invalid).toEqual(["bad@", "@nope.com", "x@y"]);
  });

  it("supports the 'Name <email>' format", () => {
    expect(parseEmailList('Moshe Navon <moshe@x.com>, "Yossi" <yossi@x.com>').valid).toEqual([
      "moshe@x.com",
      "yossi@x.com",
    ]);
  });

  it("returns empty results for empty input", () => {
    expect(parseEmailList("   ")).toEqual({ valid: [], invalid: [] });
  });
});
