import { describe, expect, it } from "vitest";
import { isPublicPath, safeNextPath } from "./routes";

describe("routes", () => {
  it("identifies public paths", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/loginx")).toBe(false);
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/teams/1")).toBe(false);
  });

  it("only allows relative same-origin redirects", () => {
    expect(safeNextPath("/teams/1?x=1")).toBe("/teams/1?x=1");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("/login")).toBe("/");
    expect(safeNextPath(null, "/x")).toBe("/x");
  });
});
