import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ActionItem } from "@/lib/action-items";
import { buildMentionables } from "@/lib/mentions";
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
  assignees: [],
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
    <ActionItemsList
      teamId="t1"
      items={items}
      canViewInsights
      currentUserName="אני"
      currentUserEmail="me@x.co"
      actions={actions}
      {...overrides}
    />,
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
    render(<ActionItemsList teamId="t1" items={items} canViewInsights currentUserName="אני" currentUserEmail="me@x.co" actions={actions} />);
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

  describe("filter by assignee", () => {
    const members = buildMentionables([
      { email: "me@x.co", name: "אני" },
      { email: "dana@x.co", name: "דנה" },
      { email: "yossi@x.co", name: "יוסי" },
    ]);
    const assigned = [
      item({ id: "a", title: "של דנה", createdAt: "2026-11-03T10:00:00Z", assignees: ["dana@x.co"] }),
      item({ id: "b", title: "שלי", createdAt: "2026-11-02T10:00:00Z", assignees: ["me@x.co"] }),
      item({ id: "c", title: "שלי ושל יוסי", createdAt: "2026-11-02T09:00:00Z", assignees: ["me@x.co", "yossi@x.co"], doneAt: "2026-11-04T10:00:00Z" }),
      item({ id: "d", title: "של אף אחד", createdAt: "2026-11-01T10:00:00Z" }),
    ];

    const choose = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
      await user.click(screen.getByRole("button", { name: /סינון/ }));
      await user.click(screen.getByRole("menuitemradio", { name }));
    };

    it("lists the assignees on every task", () => {
      setup({ items: assigned, members });
      expect(within(screen.getByRole("article", { name: "של דנה" })).getByTestId("assignees")).toHaveTextContent("דנה");
      expect(within(screen.getByRole("article", { name: "שלי ושל יוסי" })).getByTestId("assignees")).toHaveTextContent("אני, יוסי");
      expect(within(screen.getByRole("article", { name: "של אף אחד" })).getByTestId("assignees")).toHaveTextContent("לא משויכת");
    });

    it("offers all, assigned to me, unassigned and the other members", async () => {
      const { user } = setup({ items: assigned, members });
      await user.click(screen.getByRole("button", { name: "סינון" }));
      const options = screen.getAllByRole("menuitemradio");
      // the signed-in user is offered as "assigned to me", not as a member
      expect(options).toHaveLength(5);
      for (const [index, name] of ["כל המשימות", "משויכות אליי", "לא משויכות", "דנה", "יוסי"].entries()) {
        expect(options[index]).toHaveAccessibleName(name);
      }
      expect(screen.getByRole("menuitemradio", { name: "כל המשימות" })).toBeChecked();
    });

    it("shows only the tasks assigned to the signed-in user", async () => {
      const { user } = setup({ items: assigned, members });
      await choose(user, "משויכות אליי");
      await waitFor(() => expect(titles()).toEqual(["שלי", "שלי ושל יוסי"]));
      expect(screen.getByRole("button", { name: "סינון: המשימות שלי" })).toBeInTheDocument();
      expect(screen.getByText("1 מתוך 2 בוצעו")).toBeInTheDocument();
    });

    it("shows only the tasks of the chosen member", async () => {
      const { user } = setup({ items: assigned, members });
      await choose(user, "דנה");
      await waitFor(() => expect(titles()).toEqual(["של דנה"]));
      expect(screen.getByText("0 מתוך 1 בוצעו")).toBeInTheDocument();
    });

    it("shows only unassigned tasks", async () => {
      const { user } = setup({ items: assigned, members });
      await choose(user, "לא משויכות");
      await waitFor(() => expect(titles()).toEqual(["של אף אחד"]));
    });

    it("shows the all-done message when every task of the filter is done", async () => {
      const { user } = setup({ items: assigned, members });
      expect(screen.queryByText(/כל המשימות בוצעו/)).not.toBeInTheDocument();
      await choose(user, "יוסי");
      await waitFor(() => expect(titles()).toEqual(["שלי ושל יוסי"]));
      expect(screen.getByText("1 מתוך 1 בוצעו")).toBeInTheDocument();
      expect(screen.getByText(/כל המשימות בוצעו/)).toBeInTheDocument();
    });

    it("updates the all-done message when the last open task of the filter is checked", async () => {
      const { user } = setup({ items: assigned, members });
      await choose(user, "דנה");
      expect(screen.queryByText(/כל המשימות בוצעו/)).not.toBeInTheDocument();
      await user.click(screen.getByRole("checkbox", { name: 'סימון "של דנה" כבוצע' }));
      expect(screen.getByText(/כל המשימות בוצעו/)).toBeInTheDocument();
    });

    it("shows an empty state with a way back when the filter matches nothing", async () => {
      const { user } = setup({ items: assigned.filter((i) => i.id !== "c"), members });
      await choose(user, "יוסי");
      expect(screen.getByText("אין משימות שמשויכות ליוסי.")).toBeInTheDocument();
      expect(screen.queryByText(/כל המשימות בוצעו/)).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "הצגת כל המשימות" }));
      await waitFor(() => expect(titles()).toHaveLength(3));
    });
  });
});
