import { describe, expect, it } from "vitest";
import { moveItem, nextPosition, sortByPosition } from "./fields";

describe("fields helpers", () => {
  it("moves items up and down", () => {
    expect(moveItem(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
  });

  it("ignores moves past the edges and returns a copy", () => {
    const items = ["a", "b"];
    const moved = moveItem(items, 0, -1);
    expect(moved).toEqual(["a", "b"]);
    expect(moved).not.toBe(items);
    expect(moveItem(items, 1, 1)).toEqual(["a", "b"]);
    expect(moveItem(items, 5, 1)).toEqual(["a", "b"]);
  });

  it("computes the next position", () => {
    expect(nextPosition([])).toBe(1);
    expect(nextPosition([{ position: 3 }, { position: 7 }])).toBe(8);
  });

  it("sorts by position", () => {
    expect(sortByPosition([{ position: 2 }, { position: 1 }]).map((f) => f.position)).toEqual([1, 2]);
  });
});
