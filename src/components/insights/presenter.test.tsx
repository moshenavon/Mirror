import { fireEvent, render, screen } from "@testing-library/react";
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

  it("supports keyboard navigation (RTL arrows) and Escape", () => {
    const { onClose } = renderPresenter(0);
    expect(screen.getByRole("heading", { name: "משה נבון" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByRole("heading", { name: "יוסי כהן" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { name: "משה נבון" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("jumps directly to a field", async () => {
    const { user } = renderPresenter();
    await user.selectOptions(screen.getByRole("combobox", { name: "מעבר לשדה" }), "1");
    expect(screen.getByRole("heading", { name: "דנה לוי" })).toBeInTheDocument();
  });

  it("can start at a given slide", () => {
    renderPresenter(2);
    expect(screen.getByRole("heading", { name: "דנה לוי" })).toBeInTheDocument();
  });
});
