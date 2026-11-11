import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buildSections, type InsightEntry, type InsightField } from "@/lib/insights";
import { Presenter } from "./presenter";

const fields: InsightField[] = [
  { id: "happy", label: "ממה אני שמח", emoji: "😄", position: 1 },
  { id: "sad", label: "ממה הייתי עצוב", emoji: "😢", position: 2 },
];

const mk = (id: string, field_id: string, name: string, content: string, created_at: string): InsightEntry => ({
  entry_id: id,
  field_id,
  content,
  created_at,
  is_anonymous: false,
  author_id: `u-${id}`,
  author_name: name,
  author_email: `${id}@x.com`,
  author_avatar_url: null,
});

const sections = buildSections(fields, [
  mk("1", "happy", "משה נבון", "עבודת צוות מעולה", "2026-11-01T10:00:00Z"),
  mk("2", "happy", "יוסי כהן", "הילדים התנהגו יפה", "2026-11-02T10:00:00Z"),
  mk("3", "sad", "דנה לוי", "הדדליין היה לחוץ", "2026-11-03T10:00:00Z"),
]);

function renderPresenter(startAt: number | null = null) {
  const onClose = vi.fn();
  render(<Presenter title="צוות" subtitle="1.11.2026 – 14.11.2026" sections={sections} startAt={startAt} onClose={onClose} />);
  return { onClose, user: userEvent.setup() };
}

describe("Presenter", () => {
  it("walks through entries in field order with author and content", async () => {
    const { user } = renderPresenter();
    expect(screen.getByRole("heading", { name: "רטרו" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /יאללה/ }));
    expect(screen.getByRole("heading", { name: "משה נבון" })).toBeInTheDocument();
    expect(screen.getByText("עבודת צוות מעולה")).toBeInTheDocument();
    expect(screen.getByText(/1 מתוך 2 · ממה אני שמח/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /המשך/ }));
    expect(screen.getByRole("heading", { name: "יוסי כהן" })).toBeInTheDocument();

    // end of section → transition screen announcing the next field
    await user.click(screen.getByRole("button", { name: /המשך/ }));
    expect(screen.getByText(/סיימנו את 😄 ממה אני שמח/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ממה הייתי עצוב" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /המשך/ }));
    expect(screen.getByRole("heading", { name: "דנה לוי" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /המשך/ }));
    expect(screen.getByRole("heading", { name: /סיימנו את הרטרו/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /המשך/ })).toBeDisabled();
  });

  it("supports keyboard navigation (RTL arrows) and Escape", async () => {
    const { onClose } = renderPresenter(0);
    expect(screen.getByRole("heading", { name: "משה נבון" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(await screen.findByRole("heading", { name: "יוסי כהן" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(await screen.findByRole("heading", { name: "משה נבון" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("jumps directly to a field", async () => {
    const { user } = renderPresenter();
    await user.selectOptions(screen.getByRole("combobox", { name: "מעבר לשדה" }), "1");
    expect(screen.getByRole("heading", { name: "דנה לוי" })).toBeInTheDocument();
  });

  it("shows anonymous entries without any author details", async () => {
    const anon = buildSections(fields, [
      { ...mk("9", "sad", "", "סוד", "2026-11-04T00:00:00Z"), is_anonymous: true, author_id: null, author_name: null, author_email: null },
    ]);
    render(<Presenter title="צוות" subtitle="" sections={anon} startAt={0} onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "אנונימי" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "אנונימי" })).toHaveTextContent("🎭");
    expect(screen.getByText("סוד")).toBeInTheDocument();
  });

  it("fires a confetti finale at the end", async () => {
    const confetti = (await import("canvas-confetti")).default;
    const { user } = renderPresenter(2);
    await user.click(screen.getByRole("button", { name: /המשך/ }));
    expect(await screen.findByRole("heading", { name: /סיימנו את הרטרו/ })).toBeInTheDocument();
    await waitFor(() => expect(confetti).toHaveBeenCalled());
  });

  it("can start at a given slide", () => {
    renderPresenter(2);
    expect(screen.getByRole("heading", { name: "דנה לוי" })).toBeInTheDocument();
  });

  it("creates an action item from the current insight without moving the slides", async () => {
    const onCreate = vi.fn(async () => ({ ok: true as const }));
    render(
      <Presenter title="צוות" subtitle="" sections={sections} startAt={0} onClose={vi.fn()} onCreateActionItem={onCreate} />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /יצירת Action Item/ }));

    const dialog = screen.getByRole("dialog", { name: /יצירת Action Item/ });
    expect(dialog).toHaveTextContent("עבודת צוות מעולה");
    // typing (incl. space / Enter / Backspace) inside the dialog must not change slides
    await user.type(screen.getByLabelText("מה הצוות צריך לעשות?"), "לשמר את הסשן השבועי{Backspace}י");
    expect(screen.getByRole("heading", { name: "משה נבון" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "הוספת משימה" }));
    expect(onCreate).toHaveBeenCalledWith("1", "לשמר את הסשן השבועי");
    expect(await screen.findByText(/המשימה נוספה/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /יצירת Action Item/ })).not.toBeInTheDocument();
  });

  it("keeps the dialog open and shows the error when creation fails", async () => {
    const onCreate = vi.fn(async () => ({ ok: false as const, error: "אין לך הרשאה לבצע את הפעולה" }));
    render(
      <Presenter title="צוות" subtitle="" sections={sections} startAt={0} onClose={vi.fn()} onCreateActionItem={onCreate} />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /יצירת Action Item/ }));
    await user.type(screen.getByLabelText("מה הצוות צריך לעשות?"), "משימה");
    await user.click(screen.getByRole("button", { name: "הוספת משימה" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("אין לך הרשאה");
    expect(screen.getByRole("dialog", { name: /יצירת Action Item/ })).toBeInTheDocument();
  });

  it("lists the action items already linked to the insight, marking done ones", () => {
    const linked = new Map([
      [
        "1",
        [
          { id: "a1", title: "פתוחה", doneAt: null },
          { id: "a2", title: "סגורה", doneAt: "2026-11-05T00:00:00Z" },
        ],
      ],
    ]);
    render(<Presenter title="צוות" subtitle="" sections={sections} startAt={0} onClose={vi.fn()} actionItemsByEntry={linked} />);
    const list = screen.getByRole("list", { name: "משימות מהתובנה הזו" });
    expect(list).toHaveTextContent("פתוחה");
    expect(list).toHaveTextContent("סגורה(בוצע)");
    // without a create handler there is no create button
    expect(screen.queryByRole("button", { name: /יצירת Action Item/ })).not.toBeInTheDocument();
  });
});
