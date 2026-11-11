import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { InsightEntry, InsightField } from "@/lib/insights";
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

const entries = [
  mk("1", "happy", "משה נבון", "עבודת צוות מעולה", "2026-11-01T10:00:00Z"),
  mk("2", "happy", "יוסי כהן", "הילדים התנהגו יפה", "2026-11-02T10:00:00Z"),
  mk("3", "sad", "דנה לוי", "הדדליין היה לחוץ", "2026-11-03T10:00:00Z"),
];

function renderPresenter(startAt: number | null = null) {
  const onClose = vi.fn();
  render(
    <Presenter title="צוות" subtitle="1.11.2026 – 14.11.2026" fields={fields} entries={entries} startAt={startAt} onClose={onClose} />,
  );
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
    const anon = [
      { ...mk("9", "sad", "", "סוד", "2026-11-04T00:00:00Z"), is_anonymous: true, author_id: null, author_name: null, author_email: null },
    ];
    render(<Presenter title="צוות" subtitle="" fields={fields} entries={anon} startAt={0} onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "אנונימי" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "אנונימי" }).querySelector('[data-icon="incognito"]')).not.toBeNull();
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

  it("shows the avatar next to the reporter name", () => {
    renderPresenter(0);
    const heading = screen.getByRole("heading", { name: "משה נבון" });
    expect(heading.previousElementSibling?.querySelector('[role="img"]')).toHaveAccessibleName("משה נבון");
  });

  it("can present by reporter: all entries of one reporter in field order, then the next", async () => {
    const byReporter = [
      mk("1", "sad", "משה נבון", "עצוב של משה", "2026-11-01T10:00:00Z"),
      mk("2", "happy", "משה נבון", "שמח של משה", "2026-11-03T10:00:00Z"),
      mk("3", "happy", "דנה לוי", "שמח של דנה", "2026-11-02T10:00:00Z"),
    ].map((e) => (e.author_name === "משה נבון" ? { ...e, author_id: "moshe" } : e));
    const user = userEvent.setup();
    render(<Presenter title="צוות" subtitle="" fields={fields} entries={byReporter} startAt={null} onClose={vi.fn()} />);

    expect(screen.getByRole("radio", { name: /לפי שדות/ })).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("radio", { name: /לפי מדווחים/ }));
    expect(screen.getByRole("radio", { name: /לפי מדווחים/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("combobox", { name: "מעבר למדווח" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /יאללה/ }));
    expect(screen.getByRole("heading", { name: "דנה לוי" })).toBeInTheDocument();
    expect(screen.getByText("שמח של דנה")).toBeInTheDocument();
    expect(screen.getByText(/1 מתוך 1 · דנה לוי/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /המשך/ }));
    expect(screen.getByText("סיימנו עם דנה לוי")).toBeInTheDocument();
    expect(screen.getByText("המדווח הבא")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "משה נבון" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /המשך/ }));
    expect(screen.getByText("שמח של משה")).toBeInTheDocument(); // field order: happy before sad
    expect(screen.getByText(/1 מתוך 2 · משה נבון/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /המשך/ }));
    expect(screen.getByText("עצוב של משה")).toBeInTheDocument();
  });
});
