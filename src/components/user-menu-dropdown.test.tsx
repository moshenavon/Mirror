import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserMenuDropdown } from "./user-menu-dropdown";

vi.mock("@/app/actions/auth", () => ({ signOut: vi.fn() }));

describe("UserMenuDropdown", () => {
  it("opens from the profile picture with my-teams and sign-out", () => {
    render(<UserMenuDropdown name="Dana" avatarUrl={null} />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "תפריט משתמש" }));
    expect(screen.getByRole("menuitem", { name: /הצוותים שלי/ })).toHaveAttribute("href", "/");
    expect(screen.getByRole("menuitem", { name: /התנתק/ })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
