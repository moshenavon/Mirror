import { describe, expect, it } from "vitest";
import { cacheTags } from "./cache-tags";

describe("cacheTags", () => {
  it("builds stable, distinct tags", () => {
    expect(cacheTags.teamsOf("Dana@Example.com")).toBe("teams:dana@example.com");
    expect(cacheTags.team("t1")).toBe("team:t1");
    expect(cacheTags.fields("t1")).toBe("fields:t1");
    expect(new Set([cacheTags.team("x"), cacheTags.fields("x"), cacheTags.teamsOf("x")]).size).toBe(3);
  });
});
