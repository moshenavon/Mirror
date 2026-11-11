import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HistoryList, type HistoryEntry, type HistoryField } from "./history-list";

const fields: HistoryField[] = [
  { id: "happy", label: "ממה אני שמח", emoji: "😄", isActive: true },
  { id: "sad", label: "ממה הייתי עצוב", emoji: "😢", isActive: true },
  { id: "old", label: "שדה ישן", emoji: "🗃️", isActive: false },
];

const entries: HistoryEntry[] = [
  { id: "e1", fieldId: "happy", content: "יום מעולה", createdAt: "2026-11-10T10:00:00Z", updatedAt: "2026-11-10T10:00:00Z" },
  { id: "e2", fieldId: "sad", content: "באג בפרודקשן", createdAt: "2026-11-09T10:00:00Z", updatedAt: "2026-11-09T12:00:00Z" },
];

function setup() {
  const actions = {
    update: vi.fn(async () => ({ ok: true as const })),
    remove: vi.fn(async () => ({ ok: true as const })),
  };
  render(<HistoryList fields={fields} entries={entries} actions={actions} />);
  return { actions, user: userEvent.setup() };
}

describe("HistoryList", () => {
  it("lists entries with their field and marks edited entries", () => {
    setup();
    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(2);
    expect(within(articles[0]).getByText("ממה אני שמח")).toBeInTheDocument();
    expect(within(articles[1]).getByText(/נערך/)).toBeInTheDocument();
  });

  it("filters by field", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /ממה הייתי עצוב \(1\)/ }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("באג בפרודקשן")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /הכל/ }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("edits content and field of an entry", async () => {
    const { user, actions } = setup();
    const first = screen.getAllByRole("article")[0];
    await user.click(within(first).getByRole("button", { name: /עריכה/ }));

    const select = within(first).getByRole("combobox");
    // inactive fields are not offered
    expect(within(select).queryByText(/שדה ישן/)).not.toBeInTheDocument();
    await user.selectOptions(select, "sad");

    const textarea = within(first).getByRole("textbox");
    await user.clear(textarea);
    await user.type(textarea, "יום טוב");
    await user.click(within(first).getByRole("button", { name: "שמירה" }));

    await waitFor(() => expect(actions.update).toHaveBeenCalledWith("e1", "sad", "יום טוב"));
  });

  it("asks for confirmation before deleting", async () => {
    const { user, actions } = setup();
    const first = screen.getAllByRole("article")[0];
    await user.click(within(first).getByRole("button", { name: /מחיקה/ }));
    expect(actions.remove).not.toHaveBeenCalled();
    await user.click(within(first).getByRole("button", { name: "כן, למחוק" }));
    await waitFor(() => expect(actions.remove).toHaveBeenCalledWith("e1"));
  });

  it("shows an empty state", () => {
    render(<HistoryList fields={fields} entries={[]} />);
    expect(screen.getByText(/עדיין לא שלחת דיווחים/)).toBeInTheDocument();
  });
});
