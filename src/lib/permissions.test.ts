import { describe, expect, it } from "vitest";
import { isLastAdmin, teamPermissions } from "./permissions";

describe("teamPermissions", () => {
  it("admins can always manage and view insights", () => {
    expect(teamPermissions("admin", "admins")).toEqual({ isAdmin: true, canManageTeam: true, canViewInsights: true });
  });

  it("members view insights only when opened to members", () => {
    expect(teamPermissions("member", "admins").canViewInsights).toBe(false);
    expect(teamPermissions("member", "members").canViewInsights).toBe(true);
    expect(teamPermissions("member", "members").canManageTeam).toBe(false);
  });
});

describe("isLastAdmin", () => {
  const members = [
    { id: "1", email: "a@x.com", role: "admin" as const },
    { id: "2", email: "b@x.com", role: "member" as const },
  ];

  it("detects the only admin", () => {
    expect(isLastAdmin(members, "1")).toBe(true);
    expect(isLastAdmin(members, "2")).toBe(false);
    expect(isLastAdmin(members, "missing")).toBe(false);
  });

  it("is false when there are several admins", () => {
    expect(isLastAdmin([...members, { id: "3", email: "c@x.com", role: "admin" }], "1")).toBe(false);
  });
});
