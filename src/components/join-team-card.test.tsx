import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { JoinTeamCard } from "./join-team-card";

const TOKEN = "a".repeat(64);

describe("JoinTeamCard", () => {
  it("asks a signed-out visitor to sign in and come back to the link", () => {
    render(<JoinTeamCard token={TOKEN} teamName="צוות אלפא" status="signed-out" />);
    expect(screen.getByText(/רוצים להצטרף לצוות צוות אלפא/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /התחברות עם Google/ })).toHaveAttribute(
      "href",
      `/auth/google?next=${encodeURIComponent(`/r/${TOKEN}`)}`,
    );
  });

  it("joins when a signed-in visitor chooses to", async () => {
    const join = vi.fn(async () => ({ ok: true as const }));
    render(<JoinTeamCard token={TOKEN} teamName="צוות אלפא" status="signed-in" join={join} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "הצטרפות לצוות" }));
    await waitFor(() => expect(join).toHaveBeenCalledWith(TOKEN));
  });

  it("shows why joining failed", async () => {
    const join = vi.fn(async () => ({ ok: false as const, error: "ההצטרפות לצוות דרך הקישור הזה לא פעילה" }));
    render(<JoinTeamCard token={TOKEN} teamName="צוות אלפא" status="signed-in" join={join} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "הצטרפות לצוות" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("לא פעילה");
  });

  it("links an existing member straight to the team", () => {
    render(<JoinTeamCard token={TOKEN} teamName="צוות אלפא" status="member" teamHref="/teams/t1" />);
    expect(screen.queryByRole("button", { name: "הצטרפות לצוות" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /מעבר לצוות/ })).toHaveAttribute("href", "/teams/t1");
  });
});
