import { describe, expect, it } from "vitest";
import { actionItemsLabel, applyDone, filterActionItems, groupByEntry, isDone, sortActionItems, type ActionItem } from "./action-items";

const item = (id: string, createdAt: string, doneAt: string | null = null, entryId: string | null = null): ActionItem => ({
  id,
  title: `task ${id}`,
  entryId,
  fieldLabel: null,
  fieldEmoji: null,
  sourceContent: null,
  createdAt,
  createdByName: null,
  doneAt,
  doneByName: null,
  canDelete: false,
  assignees: [],
});

describe("sortActionItems", () => {
  it("puts open items first (newest first) and done items last in completion order", () => {
    const sorted = sortActionItems([
      item("a", "2026-11-01T00:00:00Z", "2026-11-05T00:00:00Z"),
      item("b", "2026-11-02T00:00:00Z"),
      item("c", "2026-11-03T00:00:00Z", "2026-11-04T00:00:00Z"),
      item("d", "2026-11-04T00:00:00Z"),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["d", "b", "c", "a"]);
  });
});

describe("applyDone", () => {
  const items = sortActionItems([item("a", "2026-11-01T00:00:00Z"), item("b", "2026-11-02T00:00:00Z"), item("c", "2026-11-03T00:00:00Z", "2026-11-04T00:00:00Z")]);

  it("moves a completed item to the bottom of the list", () => {
    const next = applyDone(items, "b", true, "2026-11-10T00:00:00Z", "משה");
    expect(next.map((i) => i.id)).toEqual(["a", "c", "b"]);
    expect(next[2]).toMatchObject({ doneAt: "2026-11-10T00:00:00Z", doneByName: "משה" });
    expect(isDone(next[2])).toBe(true);
  });

  it("brings a re-opened item back among the open items", () => {
    const next = applyDone(items, "c", false);
    expect(next.map((i) => i.id)).toEqual(["c", "b", "a"]);
    expect(next[0]).toMatchObject({ doneAt: null, doneByName: null });
  });

  it("keeps the original completion time when already done", () => {
    const next = applyDone(items, "c", true, "2030-01-01T00:00:00Z");
    expect(next.find((i) => i.id === "c")?.doneAt).toBe("2026-11-04T00:00:00Z");
  });
});

describe("groupByEntry", () => {
  it("groups by source entry and skips items without one", () => {
    const map = groupByEntry([item("a", "x", null, "e1"), item("b", "x", null, "e2"), item("c", "x", null, "e1"), item("d", "x")]);
    expect([...map.keys()]).toEqual(["e1", "e2"]);
    expect(map.get("e1")?.map((i) => i.id)).toEqual(["a", "c"]);
  });
});

describe("actionItemsLabel", () => {
  it("pluralises", () => {
    expect(actionItemsLabel(1)).toBe("משימה אחת");
    expect(actionItemsLabel(3)).toBe("3 משימות");
  });
});

describe("filterActionItems", () => {
  const items = [
    { id: "1", assignees: ["dana@x.co"] },
    { id: "2", assignees: ["dana@x.co", "me@x.co"] },
    { id: "3", assignees: [] },
    { id: "4", assignees: ["Yossi@X.co"] },
  ];
  const ids = (list: { id: string }[]) => list.map((i) => i.id);

  it("shows everything for 'all'", () => {
    expect(ids(filterActionItems(items, { kind: "all" }, "me@x.co"))).toEqual(["1", "2", "3", "4"]);
  });

  it("shows the items assigned to the signed-in user for 'mine'", () => {
    expect(ids(filterActionItems(items, { kind: "mine" }, "ME@x.co"))).toEqual(["2"]);
  });

  it("shows only items without assignees for 'unassigned'", () => {
    expect(ids(filterActionItems(items, { kind: "unassigned" }, "me@x.co"))).toEqual(["3"]);
  });

  it("shows the items of one member, ignoring e-mail case", () => {
    expect(ids(filterActionItems(items, { kind: "member", email: "dana@x.co" }, "me@x.co"))).toEqual(["1", "2"]);
    expect(ids(filterActionItems(items, { kind: "member", email: "yossi@x.co" }, "me@x.co"))).toEqual(["4"]);
    expect(filterActionItems(items, { kind: "member", email: "nobody@x.co" }, "me@x.co")).toEqual([]);
  });
});
