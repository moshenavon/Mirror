import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InsightsVisibilityToggle } from "./insights-visibility-toggle";

describe("InsightsVisibilityToggle", () => {
  it("defaults to admins and saves a change", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({ ok: true as const }));
    render(<InsightsVisibilityToggle teamId="t1" value="admins" action={action} />);
    expect(screen.getByRole("radio", { name: /מנהלים בלבד/ })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: /כל חברי הצוות/ }));
    await waitFor(() => expect(action).toHaveBeenCalledWith("t1", "members"));
    expect(screen.getByRole("radio", { name: /כל חברי הצוות/ })).toBeChecked();
  });

  it("reverts on failure", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({ ok: false as const, error: "אין הרשאה" }));
    render(<InsightsVisibilityToggle teamId="t1" value="admins" action={action} />);
    await user.click(screen.getByRole("radio", { name: /כל חברי הצוות/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("אין הרשאה");
    expect(screen.getByRole("radio", { name: /מנהלים בלבד/ })).toBeChecked();
  });
});
