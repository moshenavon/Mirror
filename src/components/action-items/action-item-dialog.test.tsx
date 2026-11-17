import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildMentionables } from "@/lib/mentions";
import { ActionItemDialog } from "./action-item-dialog";

const team = buildMentionables([
  { email: "dana@x.co", name: "דנה" },
  { email: "yossi@x.co", name: "יוסי" },
]);
const source = { fieldEmoji: "😢", fieldLabel: "ממה הייתי עצוב", authorName: "משה", content: "הדדליין היה לחוץ" };

function setup() {
  const onSubmit = vi.fn(async () => ({ ok: true as const }));
  render(<ActionItemDialog source={source} onClose={vi.fn()} onSubmit={onSubmit} mentionables={team} />);
  return { onSubmit, user: userEvent.setup() };
}

beforeEach(() => window.localStorage.clear());

describe("ActionItemDialog tagging", () => {
  it("assigns the task to the members tagged with @", async () => {
    const { onSubmit, user } = setup();
    const box = screen.getByLabelText("מה הצוות צריך לעשות?");
    await user.type(box, "@ד");
    await user.click(screen.getByRole("option", { name: /דנה/ }));
    await user.type(box, "לקבוע סשן עם ");
    await user.type(box, "@");
    await user.click(screen.getByRole("option", { name: /יוסי/ }));

    expect(screen.getByText(/המשימה תשויך ל:/).closest("p")).toHaveTextContent("דנה, יוסי");
    await user.click(screen.getByRole("button", { name: "הוספת משימה" }));
    expect(onSubmit).toHaveBeenCalledWith("@דנה לקבוע סשן עם @יוסי ", ["dana@x.co", "yossi@x.co"]);
  });

  it("does not assign a member whose tag was deleted from the text", async () => {
    const { onSubmit, user } = setup();
    const box = screen.getByLabelText("מה הצוות צריך לעשות?");
    await user.type(box, "@ד");
    await user.click(screen.getByRole("option", { name: /דנה/ }));
    await user.clear(box);
    await user.type(box, "משימה בלי תיוג");
    expect(screen.queryByText(/המשימה תשויך ל:/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "הוספת משימה" }));
    expect(onSubmit).toHaveBeenCalledWith("משימה בלי תיוג", []);
  });

  it("shows the tagging tip once in the action item dialog, independently of the report tip", () => {
    window.localStorage.setItem("mirror:hint:mention-report", "1");
    const first = render(<ActionItemDialog source={source} onClose={vi.fn()} onSubmit={vi.fn()} mentionables={team} />);
    expect(screen.getByRole("note")).toHaveTextContent("@");
    first.unmount();
    render(<ActionItemDialog source={source} onClose={vi.fn()} onSubmit={vi.fn()} mentionables={team} />);
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});
