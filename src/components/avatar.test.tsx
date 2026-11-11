import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "./avatar";

describe("Avatar", () => {
  it("renders the picture when available", () => {
    render(<Avatar name="משה נבון" src="https://example.com/a.png" />);
    expect(screen.getByRole("img", { name: "משה נבון" })).toHaveAttribute("src", "https://example.com/a.png");
  });

  it("falls back to initials", () => {
    render(<Avatar name="Moshe Navon" />);
    expect(screen.getByRole("img", { name: "Moshe Navon" })).toHaveTextContent("MN");
  });
});
