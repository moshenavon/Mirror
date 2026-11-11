import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import confetti from "canvas-confetti";
import { ReportBoard, type ReportField } from "./report-board";

const fields: ReportField[] = [
  { id: "f1", label: "ממה אני שמח", emoji: "😄", placeholder: "מה עשה לי טוב?" },
  { id: "f2", label: "ממה הייתי עצוב", emoji: "😢", placeholder: null },
];

const okSubmit = () => vi.fn(async () => ({ ok: true as const }));

describe("ReportBoard", () => {
  it("renders a big button per field", () => {
    render(<ReportBoard fields={fields} onSubmit={okSubmit()} />);
    expect(screen.getByRole("button", { name: /ממה אני שמח/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ממה הייתי עצוב/ })).toBeInTheDocument();
  });

  it("shows an empty state without fields", () => {
    render(<ReportBoard fields={[]} onSubmit={okSubmit()} />);
    expect(screen.getByText(/לא הוגדרו שדות/)).toBeInTheDocument();
  });

  it("opens a dialog for the clicked field and submits the entry", async () => {
    const user = userEvent.setup();
    const submit = okSubmit();
    render(<ReportBoard fields={fields} onSubmit={submit} />);

    await user.click(screen.getByRole("button", { name: /ממה אני שמח/ }));
    expect(screen.getByRole("dialog", { name: "ממה אני שמח" })).toBeInTheDocument();

    const send = screen.getByRole("button", { name: /שליחה/ });
    expect(send).toBeDisabled();
    await user.type(screen.getByPlaceholderText("מה עשה לי טוב?"), "עבודת צוות מעולה");
    await user.click(send);

    await waitFor(() => expect(submit).toHaveBeenCalledWith("f1", "עבודת צוות מעולה", false));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText(/הדיווח נשלח/)).toBeInTheDocument();
    await waitFor(() => expect(confetti).toHaveBeenCalled());
  });

  it("can send anonymously and explains what it means", async () => {
    const user = userEvent.setup();
    const submit = okSubmit();
    render(<ReportBoard fields={fields} onSubmit={submit} />);

    await user.click(screen.getByRole("button", { name: /ממה הייתי עצוב/ }));
    const toggle = screen.getByRole("checkbox", { name: /שליחה אנונימית/ });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    expect(screen.getByText(/בלי שום שיוך אלייך/)).toBeInTheDocument();

    await user.type(screen.getByRole("textbox"), "משהו קשה");
    await user.click(screen.getByRole("button", { name: /שליחה/ }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith("f2", "משהו קשה", true));
    expect(await screen.findByText(/נשלח באנונימיות/)).toBeInTheDocument();
  });

  it("is always anonymous on the public link", async () => {
    const user = userEvent.setup();
    const submit = okSubmit();
    render(<ReportBoard fields={fields} onSubmit={submit} anonymity="always" />);
    await user.click(screen.getByRole("button", { name: /ממה אני שמח/ }));
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText(/אנונימי לחלוטין/)).toBeInTheDocument();
    await user.type(screen.getByRole("textbox"), "טוב");
    await user.click(screen.getByRole("button", { name: /שליחה/ }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith("f1", "טוב", true));
  });

  it("is never anonymous on an identified public link", async () => {
    const user = userEvent.setup();
    const submit = okSubmit();
    render(<ReportBoard fields={fields} onSubmit={submit} anonymity="never" />);
    await user.click(screen.getByRole("button", { name: /ממה אני שמח/ }));
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText(/יישלח בשמך/)).toBeInTheDocument();
    await user.type(screen.getByRole("textbox"), "טוב");
    await user.click(screen.getByRole("button", { name: /שליחה/ }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith("f1", "טוב", false));
    expect(await screen.findByText("הדיווח נשלח, תודה!")).toBeInTheDocument();
  });

  it("keeps the dialog open and shows the server error", async () => {
    const user = userEvent.setup();
    const submit = vi.fn(async () => ({ ok: false as const, error: "השדה הזה כבר לא פעיל" }));
    render(<ReportBoard fields={fields} onSubmit={submit} />);

    await user.click(screen.getByRole("button", { name: /ממה הייתי עצוב/ }));
    await user.type(screen.getByRole("textbox"), "משהו");
    await user.click(screen.getByRole("button", { name: /שליחה/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("השדה הזה כבר לא פעיל");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes the dialog on cancel without submitting", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    render(<ReportBoard fields={fields} onSubmit={submit} />);
    await user.click(screen.getByRole("button", { name: /ממה אני שמח/ }));
    await user.click(screen.getByRole("button", { name: "ביטול" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });
});
