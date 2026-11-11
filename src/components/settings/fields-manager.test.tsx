import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FieldsManager, type ManagedField } from "./fields-manager";

const fields: ManagedField[] = [
  { id: "a", label: "ממה אני שמח", emoji: "😄", placeholder: null, isActive: true },
  { id: "b", label: "ממה הייתי עצוב", emoji: "😢", placeholder: "עזרה", isActive: true },
  { id: "c", label: "ישן", emoji: "🗃️", placeholder: null, isActive: false },
];

function setup(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  const actions = {
    create: vi.fn(async () => ({ ok: true as const })),
    update: vi.fn(async () => ({ ok: true as const })),
    setActive: vi.fn(async () => ({ ok: true as const })),
    remove: vi.fn(async () => ({ ok: true as const })),
    reorder: vi.fn(async () => ({ ok: true as const })),
    ...overrides,
  };
  render(<FieldsManager teamId="t1" fields={fields} actions={actions as never} />);
  return { actions, user: userEvent.setup() };
}

describe("FieldsManager", () => {
  it("reorders fields and saves the new order", async () => {
    const { user, actions } = setup();
    await user.click(screen.getByRole("button", { name: "הזזת ממה הייתי עצוב למעלה" }));
    await waitFor(() => expect(actions.reorder).toHaveBeenCalledWith("t1", ["b", "a", "c"]));
    const labels = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(labels[0]).toContain("ממה הייתי עצוב");
  });

  it("reverts the order when saving fails", async () => {
    const { user } = setup({ reorder: vi.fn(async () => ({ ok: false, error: "שגיאה" })) });
    await user.click(screen.getByRole("button", { name: "הזזת ממה הייתי עצוב למעלה" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("שגיאה");
    expect(screen.getAllByRole("listitem")[0].textContent).toContain("ממה אני שמח");
  });

  it("disables moving past the edges", () => {
    setup();
    expect(screen.getByRole("button", { name: "הזזת ממה אני שמח למעלה" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "הזזת ישן למטה" })).toBeDisabled();
  });

  it("adds a new field", async () => {
    const { user, actions } = setup();
    await user.click(screen.getByRole("button", { name: /הוספת שדה/ }));
    await user.type(screen.getByPlaceholderText("לדוגמה: ממה אני שמח"), "תודות");
    await user.click(screen.getByRole("button", { name: "🙏" }));
    await user.click(screen.getByRole("button", { name: "הוספה" }));
    await waitFor(() =>
      expect(actions.create).toHaveBeenCalledWith("t1", { emoji: "🙏", label: "תודות", placeholder: "" }),
    );
  });

  it("toggles a field active state", async () => {
    const { user, actions } = setup();
    await user.click(screen.getByRole("button", { name: "הפעלה" }));
    await waitFor(() => expect(actions.setActive).toHaveBeenCalledWith("c", true));
  });

  it("shows the server error when deleting a field with entries", async () => {
    const { user } = setup({ remove: vi.fn(async () => ({ ok: false, error: "לשדה יש דיווחים" })) });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getAllByRole("button", { name: "מחיקה" })[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent("לשדה יש דיווחים");
  });
});
