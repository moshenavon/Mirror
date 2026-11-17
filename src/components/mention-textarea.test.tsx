import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { buildMentionables } from "@/lib/mentions";
import { MentionText, MentionTextarea } from "./mention-textarea";

const team = buildMentionables([
  { email: "dana@x.co", name: "דנה כהן" },
  { email: "dan@x.co", name: "דן" },
  { email: "yossi@x.co", name: "יוסי" },
]);

function Harness({ hintKey, members = team }: { hintKey?: string; members?: typeof team }) {
  const [value, setValue] = useState("");
  return (
    <>
      <label htmlFor="t">טקסט</label>
      <MentionTextarea id="t" value={value} onChange={setValue} mentionables={members} hintKey={hintKey} />
      <output data-testid="value">{value}</output>
    </>
  );
}

beforeEach(() => window.localStorage.clear());

describe("MentionTextarea", () => {
  it("opens the member list when @ is typed and tags the clicked member", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const box = screen.getByRole("textbox", { name: "טקסט" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    await user.type(box, "שלום @");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);

    await user.click(screen.getByRole("option", { name: /יוסי/ }));
    expect(box).toHaveValue("שלום @יוסי ");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    // the caret is after the tag, so typing continues there
    await user.type(box, "תבדוק");
    expect(box).toHaveValue("שלום @יוסי תבדוק");
  });

  it("filters while typing and picks with the keyboard", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const box = screen.getByRole("textbox", { name: "טקסט" });
    await user.type(box, "@דנ");
    expect(screen.getAllByRole("option")).toHaveLength(2);

    await user.keyboard("{ArrowDown}");
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    expect(box).toHaveAttribute("aria-activedescendant", screen.getAllByRole("option")[1].id);
    await user.keyboard("{Enter}");
    expect(box).toHaveValue("@דן ");
  });

  it("closes the list with Escape without losing the text, and never opens for e-mail addresses", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const box = screen.getByRole("textbox", { name: "טקסט" });
    await user.type(box, "@י");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(box).toHaveValue("@י");

    await user.clear(box);
    await user.type(box, "mail a@");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows nothing when no member matches", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByRole("textbox", { name: "טקסט" }), "@zzz");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("is a plain textarea without members", async () => {
    const user = userEvent.setup();
    render(<Harness members={[]} hintKey="k" />);
    await user.type(screen.getByRole("textbox", { name: "טקסט" }), "@");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});

describe("one-time tagging tip", () => {
  it("shows once per key, then never again", () => {
    const first = render(<Harness hintKey="tip-a" />);
    expect(screen.getByRole("note")).toHaveTextContent("הקלידו @ כדי לתייג חבר צוות");
    first.unmount();

    render(<Harness hintKey="tip-a" />);
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("is tracked separately for each field", () => {
    render(<Harness hintKey="tip-report" />).unmount();
    render(<Harness hintKey="tip-action" />);
    expect(screen.getByRole("note")).toBeInTheDocument();
  });

  it("goes away when dismissed or when the user starts tagging", async () => {
    const user = userEvent.setup();
    const first = render(<Harness hintKey="tip-b" />);
    await user.click(screen.getByRole("button", { name: "סגירת הטיפ" }));
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    first.unmount();

    window.localStorage.clear();
    render(<Harness hintKey="tip-b" />);
    await user.type(screen.getByRole("textbox", { name: "טקסט" }), "@");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});

describe("MentionText", () => {
  it("highlights tagged members", () => {
    render(<MentionText text="תודה @דן וגם @מישהו" mentionables={team} />);
    expect(screen.getByText("@דן")).toHaveClass("font-semibold");
    expect(screen.queryByText("@מישהו")).not.toBeInTheDocument();
  });
});
