import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ActionItem } from "@/lib/action-items";
import { ActionItemsList } from "./action-items-list";

const item = (overrides: Partial<ActionItem> & Pick<ActionItem, "id" | "title">): ActionItem => ({
  entryId: "e1",
  fieldLabel: "ממה הייתי עצוב",
  fieldEmoji: "😢",
  sourceContent: "הדדליין היה לחוץ",
  createdAt: "2026-11-01T10:00:00Z",
  createdByName: "משה",
  doneAt: null,
  doneByName: null,
  canDelete: true,
  ...overrides,
});

const items = [
  item({ id: "a", title: "לתכנן מחדש את הספרינט", createdAt: "2026-11-03T10:00:00Z" }),
  item({ id: "b", title: "לקבוע סשן ידע", createdAt: "2026-11-02T10:00:00Z" }),
  item({ id: "c", title: "לעדכן את התיעוד", createdAt: "2026-11-03T12:00:00Z", doneAt: "2026-11-04T10:00:00Z", doneByName: "דנה" }),
];

function setup(overrides: Partial<React.ComponentProps<typeof ActionItemsList>> = {}) {
  const actions = {
    setDone: vi.fn(async () => ({ ok: true as const })),
    remove: vi.fn(async () => ({ ok: true as const })),
  };
  render(
    <ActionItemsList teamId="t1" items={items} canViewInsights currentUserName="אני" actions={actions} {...overrides} />,
  );
  return { actions, user: userEvent.setup() };
}

const titles = () =>
  within(screen.getByRole("list", { name: "משימות" }))
    .getAllByRole("article")
    .map((a) => a.getAttribute("aria-label"));

describe("ActionItemsList", () => {
  it("shows open items first and done items struck through at the bottom", () => {
    setup();
    expect(titles()).toEqual(["לתכנן מחדש את הספרינט", "לקבוע סשן ידע", "לעדכן את התיעוד"]);
    expect(screen.getByText("1 מתוך 3 בוצעו")).toBeInTheDocument();

    const done = screen.getByRole("article", { name: "לעדכן את התיעוד" });
    expect(done).toHaveAttribute("data-done", "true");
    expect(within(done).getByText("לעדכן את התיעוד")).toHaveClass("strike");
    expect(within(done).getByText("לעדכן את התיעוד")).toHaveAttribute("data-done", "true");
    expect(within(done).getByText(/✓ בוצע/)).toHaveTextContent("דנה");
    expect(within(done).getByRole("checkbox")).toBeChecked();

    const open = screen.getByRole("article", { name: "לקבוע סשן ידע" });
    expect(within(open).getByText("לקבוע סשן ידע")).toHaveAttribute("data-done", "false");
    expect(within(open).getByText(/הדדליין היה לחוץ/)).toBeInTheDocument();
  });

  it("moves an item to the bottom with a done indication when checked", async () => {
    const { actions, user } = setup();
    await user.click(screen.getByRole("checkbox", { name: 'סימון "לתכנן מחדש את הספרינט" כבוצע' }));

    expect(actions.setDone).toHaveBeenCalledWith("a", true);
    expect(titles()).toEqual(["לקבוע סשן ידע", "לעדכן את התיעוד", "לתכנן מחדש את הספרינט"]);
    const moved = screen.getByRole("article", { name: "לתכנן מחדש את הספרינט" });
    expect(moved).toHaveAttribute("data-done", "true");
    expect(within(moved).getByText(/✓ בוצע/)).toHaveTextContent("אני");
    expect(screen.getByText("2 מתוך 3 בוצעו")).toBeInTheDocument();
  });

  it("re-opens a done item", async () => {
    const { actions, user } = setup();
    await user.click(screen.getByRole("checkbox", { name: 'סימון "לעדכן את התיעוד" כלא בוצע' }));
    expect(actions.setDone).toHaveBeenCalledWith("c", false);
    // back among the open items (newest first)
    expect(titles()).toEqual(["לעדכן את התיעוד", "לתכנן מחדש את הספרינט", "לקבוע סשן ידע"]);
    expect(screen.getByRole("article", { name: "לעדכן את התיעוד" })).toHaveAttribute("data-done", "false");
  });

  it("rolls back and shows the error when saving fails", async () => {
    const actions = {
      setDone: vi.fn(async () => ({ ok: false as const, error: "עדכון המשימה נכשל" })),
      remove: vi.fn(async () => ({ ok: true as const })),
    };
    const user = userEvent.setup();
    render(<ActionItemsList teamId="t1" items={items} canViewInsights currentUserName="אני" actions={actions} />);
    await user.click(screen.getByRole("checkbox", { name: 'סימון "לקבוע סשן ידע" כבוצע' }));
    expect(await screen.findByRole("alert")).toHaveTextContent("עדכון המשימה נכשל");
    expect(screen.getByRole("article", { name: "לקבוע סשן ידע" })).toHaveAttribute("data-done", "false");
    expect(titles()).toEqual(["לתכנן מחדש את הספרינט", "לקבוע סשן ידע", "לעדכן את התיעוד"]);
  });

  it("deletes after confirmation, only where allowed", async () => {
    const { actions, user } = setup({ items: [items[0], { ...items[1], canDelete: false }] });
    expect(screen.getAllByRole("button", { name: /מחיקת/ })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: 'מחיקת "לתכנן מחדש את הספרינט"' }));
    await user.click(screen.getByRole("button", { name: "כן, למחוק" }));
    expect(actions.remove).toHaveBeenCalledWith("a");
  });

  it("explains how to add items when the list is empty", () => {
    setup({ items: [] });
    expect(screen.getByText(/עדיין אין משימות/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "מסך התובנות" })).toHaveAttribute("href", "/teams/t1/insights");
  });
});
