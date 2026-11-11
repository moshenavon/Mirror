import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MembersManager, type ManagedMember } from "./members-manager";

const members: ManagedMember[] = [
  { id: "m1", email: "admin@x.com", role: "admin", name: "Admin Person", avatarUrl: null },
  { id: "m2", email: "new@x.com", role: "member", name: null, avatarUrl: null },
];

function setup(list = members) {
  const actions = {
    add: vi.fn(async () => ({ ok: true as const, data: { added: ["a@x.com", "b@x.com"], skipped: [], invalid: [] } })),
    updateRole: vi.fn(async () => ({ ok: true as const })),
    remove: vi.fn(async () => ({ ok: true as const })),
  };
  render(<MembersManager teamId="t1" currentEmail="admin@x.com" members={list} actions={actions} />);
  return { actions, user: userEvent.setup() };
}

describe("MembersManager", () => {
  it("lists members and marks those who never signed in", () => {
    setup();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("Admin Person")).toBeInTheDocument();
    expect(within(items[1]).getByText("טרם התחבר/ה")).toBeInTheDocument();
  });

  it("protects the last admin from demotion or removal", () => {
    setup();
    expect(screen.getByRole("combobox", { name: "תפקיד של admin@x.com" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "הסרת admin@x.com" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "הסרת new@x.com" })).toBeEnabled();
  });

  it("adds several e-mails at once", async () => {
    const { user, actions } = setup();
    await user.type(screen.getByRole("textbox"), "a@x.com, b@x.com");
    await user.click(screen.getByRole("button", { name: "הוספת 2 חברים" }));
    await waitFor(() => expect(actions.add).toHaveBeenCalledWith("t1", "a@x.com, b@x.com", "member"));
    expect(await screen.findByRole("status")).toHaveTextContent("נוספו 2");
  });

  it("changes a member role", async () => {
    const { user, actions } = setup();
    await user.selectOptions(screen.getByRole("combobox", { name: "תפקיד של new@x.com" }), "admin");
    await waitFor(() => expect(actions.updateRole).toHaveBeenCalledWith("m2", "admin"));
  });

  it("removes a member after confirmation", async () => {
    const { user, actions } = setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "הסרת new@x.com" }));
    await waitFor(() => expect(actions.remove).toHaveBeenCalledWith("m2"));
  });
});
