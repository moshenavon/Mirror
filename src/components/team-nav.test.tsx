import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TeamNav } from "./team-nav";

vi.mock("next/navigation", () => ({ usePathname: () => "/teams/t1/history" }));

describe("TeamNav", () => {
  it("shows only permitted links and highlights the current page", () => {
    render(<TeamNav teamId="t1" canViewInsights={false} isAdmin={false} />);
    expect(screen.getByRole("link", { name: "דיווח" })).toHaveAttribute("href", "/teams/t1");
    expect(screen.getByRole("link", { name: /הדיווחים שלי/ })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: /תובנות/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /משימות/ })).toHaveAttribute("href", "/teams/t1/action-items");
    expect(screen.queryByRole("link", { name: /הגדרות/ })).not.toBeInTheDocument();
  });

  it("shows insights and settings for admins", () => {
    render(<TeamNav teamId="t1" canViewInsights isAdmin />);
    expect(screen.getByRole("link", { name: /תובנות/ })).toHaveAttribute("href", "/teams/t1/insights");
    expect(screen.getByRole("link", { name: /הגדרות/ })).toHaveAttribute("href", "/teams/t1/settings");
  });
});
