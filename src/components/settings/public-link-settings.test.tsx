import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PublicLinkSettings } from "./public-link-settings";

const TOKEN = "a".repeat(64);

function setup(enabled = false) {
  const actions = {
    setEnabled: vi.fn(async () => ({ ok: true as const })),
    regenerate: vi.fn(async () => ({ ok: true as const, data: { token: "b".repeat(64) } })),
  };
  render(<PublicLinkSettings teamId="t1" enabled={enabled} token={TOKEN} origin="https://mirror.app" actions={actions} />);
  return { actions, user: userEvent.setup() };
}

describe("PublicLinkSettings", () => {
  it("is off by default and hides the link", () => {
    setup();
    expect(screen.getByRole("switch", { name: /מילוי ללא הזדהות/ })).not.toBeChecked();
    expect(screen.queryByRole("textbox", { name: /קישור ציבורי/ })).not.toBeInTheDocument();
  });

  it("enables the link and shows the URL", async () => {
    const { user, actions } = setup();
    await user.click(screen.getByRole("switch", { name: /מילוי ללא הזדהות/ }));
    await waitFor(() => expect(actions.setEnabled).toHaveBeenCalledWith("t1", true));
    expect(screen.getByRole("textbox", { name: /קישור ציבורי/ })).toHaveValue(`https://mirror.app/r/${TOKEN}`);
  });

  it("copies the link", async () => {
    const { user } = setup(true);
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await user.click(screen.getByRole("button", { name: "העתקה" }));
    expect(writeText).toHaveBeenCalledWith(`https://mirror.app/r/${TOKEN}`);
    expect(await screen.findByRole("button", { name: /הועתק/ })).toBeInTheDocument();
  });

  it("regenerates the link after confirmation", async () => {
    const { user, actions } = setup(true);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: /החלפת קישור/ }));
    await waitFor(() => expect(actions.regenerate).toHaveBeenCalledWith("t1"));
    expect(screen.getByRole("textbox", { name: /קישור ציבורי/ })).toHaveValue(`https://mirror.app/r/${"b".repeat(64)}`);
  });

  it("reverts the switch when saving fails", async () => {
    const { user, actions } = setup();
    actions.setEnabled.mockResolvedValueOnce({ ok: false, error: "אין הרשאה" } as never);
    await user.click(screen.getByRole("switch", { name: /מילוי ללא הזדהות/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("אין הרשאה");
    expect(screen.getByRole("switch", { name: /מילוי ללא הזדהות/ })).not.toBeChecked();
  });
});
