import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InsightsView } from "./insights-view";

const props = {
  teamId: "t1",
  teamName: "הצוות",
  range: { from: "2026-10-28", to: "2026-11-11" },
  presets: [
    { id: "week", label: "שבוע", range: { from: "2026-11-04", to: "2026-11-11" } },
    { id: "twoWeeks", label: "שבועיים", range: { from: "2026-10-28", to: "2026-11-11" } },
  ],
  fields: [
    { id: "sad", label: "ממה הייתי עצוב", emoji: "😢", position: 2 },
    { id: "happy", label: "ממה אני שמח", emoji: "😄", position: 1 },
    { id: "learn", label: "מה למדתי", emoji: "💡", position: 3 },
  ],
  entries: [
    {
      entry_id: "1",
      field_id: "sad",
      content: "עצוב",
      created_at: "2026-11-01T10:00:00Z",
      is_anonymous: false,
      author_id: "u1",
      author_name: "משה",
      author_email: "m@x.com",
      author_avatar_url: null,
    },
    {
      entry_id: "2",
      field_id: "happy",
      content: "שמח",
      created_at: "2026-11-02T10:00:00Z",
      is_anonymous: false,
      author_id: "u2",
      author_name: "יוסי",
      author_email: "y@x.com",
      author_avatar_url: null,
    },
  ],
};

describe("InsightsView", () => {
  it("shows the range, presets and per-field counts in field order", () => {
    render(<InsightsView {...props} />);
    expect(screen.getByLabelText("מתאריך")).toHaveValue("2026-10-28");
    expect(screen.getByLabelText("עד תאריך")).toHaveValue("2026-11-11");
    expect(screen.getByRole("link", { name: /שבועיים אחרונים/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByText(/2 דיווחים/)).toBeInTheDocument();

    const fieldButtons = screen.getAllByRole("button", { name: /ממה/ });
    expect(fieldButtons.map((b) => b.textContent)).toEqual(["😄ממה אני שמח1", "😢ממה הייתי עצוב1"]);
    expect(screen.queryByRole("button", { name: /מה למדתי/ })).not.toBeInTheDocument();
  });

  it("starts the presenter from a specific field", async () => {
    const user = userEvent.setup();
    render(<InsightsView {...props} />);
    await user.click(screen.getByRole("button", { name: /ממה הייתי עצוב/ }));
    expect(screen.getByRole("dialog", { name: /מצגת רטרו/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "משה" })).toBeInTheDocument();
  });

  it("disables the retro when there are no entries", () => {
    render(<InsightsView {...props} entries={[]} />);
    expect(screen.getByRole("button", { name: /התחלת רטרו/ })).toBeDisabled();
    expect(screen.getByText(/אין דיווחים בטווח/)).toBeInTheDocument();
  });

  it("links to the action items with the open count and creates items for the team", async () => {
    const onCreate = vi.fn(async () => ({ ok: true as const }));
    const actionItems = [
      { id: "a1", title: "פתוחה", entryId: "1", fieldLabel: null, fieldEmoji: null, sourceContent: null, createdAt: "2026-11-03T00:00:00Z", createdByName: null, doneAt: null, doneByName: null, canDelete: true },
      { id: "a2", title: "סגורה", entryId: "1", fieldLabel: null, fieldEmoji: null, sourceContent: null, createdAt: "2026-11-02T00:00:00Z", createdByName: null, doneAt: "2026-11-04T00:00:00Z", doneByName: null, canDelete: true },
    ];
    const user = userEvent.setup();
    render(<InsightsView {...props} actionItems={actionItems} onCreateActionItem={onCreate} />);
    const link = screen.getByRole("link", { name: /Action items/ });
    expect(link).toHaveAttribute("href", "/teams/t1/action-items");
    expect(link).toHaveTextContent("1 פתוחות");

    await user.click(screen.getByRole("button", { name: /ממה הייתי עצוב/ }));
    await user.click(screen.getByRole("button", { name: /יצירת Action Item/ }));
    await user.type(screen.getByLabelText("מה הצוות צריך לעשות?"), "לדבר על זה");
    await user.click(screen.getByRole("button", { name: "הוספת משימה" }));
    expect(onCreate).toHaveBeenCalledWith("t1", "1", "לדבר על זה");
  });
});
