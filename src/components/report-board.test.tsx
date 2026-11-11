import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReportBoard, type ReportField } from "./report-board";

const fields: ReportField[] = [
  { id: "f1", label: "ממה אני שמח", emoji: "😄", placeholder: "מה עשה לי טוב?" },
  { id: "f2", label: "ממה הייתי עצוב", emoji: "😢", placeholder: null },
];

describe("ReportBoard", () => {
  it("renders a big button per field", () => {
    render(<ReportBoard teamId="t1" fields={fields} />);
    expect(screen.getByRole("button", { name: /ממה אני שמח/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ממה הייתי עצוב/ })).toBeInTheDocument();
  });

  it("shows an empty state without fields", () => {
    render(<ReportBoard teamId="t1" fields={[]} />);
    expect(screen.getByText(/לא הוגדרו שדות/)).toBeInTheDocument();
  });

  it("opens a dialog for the clicked field and submits the entry", async () => {
    const user = userEvent.setup();
    const submit = vi.fn(async () => ({ ok: true as const }));
    render(<ReportBoard teamId="t1" fields={fields} submit={submit} />);

    await user.click(screen.getByRole("button", { name: /ממה אני שמח/ }));
    const dialog = screen.getByRole("dialog", { name: "ממה אני שמח" });
    expect(dialog).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText("מה עשה לי טוב?");
    const send = screen.getByRole("button", { name: "שליחה" });
    expect(send).toBeDisabled();

    await user.type(textarea, "עבודת צוות מעולה");
    await user.click(send);

    await waitFor(() => expect(submit).toHaveBeenCalledWith("t1", "f1", "עבודת צוות מעולה"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText(/הדיווח נשלח/)).toBeInTheDocument();
  });

  it("keeps the dialog open and shows the server error", async () => {
    const user = userEvent.setup();
    const submit = vi.fn(async () => ({ ok: false as const, error: "השדה הזה כבר לא פעיל" }));
    render(<ReportBoard teamId="t1" fields={fields} submit={submit} />);

    await user.click(screen.getByRole("button", { name: /ממה הייתי עצוב/ }));
    await user.type(screen.getByRole("textbox"), "משהו");
    await user.click(screen.getByRole("button", { name: "שליחה" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("השדה הזה כבר לא פעיל");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes the dialog on cancel without submitting", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    render(<ReportBoard teamId="t1" fields={fields} submit={submit} />);
    await user.click(screen.getByRole("button", { name: /ממה אני שמח/ }));
    await user.click(screen.getByRole("button", { name: "ביטול" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });
});
