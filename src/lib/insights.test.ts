import { describe, expect, it } from "vitest";
import {
  buildSections,
  countByField,
  displayName,
  flattenSlides,
  initials,
  nextState,
  prevState,
  sectionStarts,
  type InsightEntry,
  type InsightField,
  type PresenterState,
} from "./insights";

const fields: InsightField[] = [
  { id: "sad", label: "ממה הייתי עצוב", emoji: "😢", position: 2 },
  { id: "happy", label: "ממה אני שמח", emoji: "😄", position: 1 },
  { id: "learn", label: "מה למדתי", emoji: "💡", position: 3 },
];

const entry = (id: string, field_id: string, created_at: string, name: string | null = "Moshe"): InsightEntry => ({
  entry_id: id,
  field_id,
  content: `content ${id}`,
  created_at,
  is_anonymous: false,
  author_id: `u-${id}`,
  author_name: name,
  author_email: `${id}@x.com`,
  author_avatar_url: null,
});

const entries = [
  entry("e3", "sad", "2026-11-03T10:00:00Z"),
  entry("e2", "happy", "2026-11-02T10:00:00Z"),
  entry("e1", "happy", "2026-11-01T10:00:00Z"),
  entry("e4", "unknown", "2026-11-01T10:00:00Z"),
];

describe("buildSections", () => {
  it("orders sections by field position, entries by time, and skips empty fields", () => {
    const sections = buildSections(fields, entries);
    expect(sections.map((s) => s.field.id)).toEqual(["happy", "sad"]);
    expect(sections[0].entries.map((e) => e.entry_id)).toEqual(["e1", "e2"]);
    expect(sections[1].entries.map((e) => e.entry_id)).toEqual(["e3"]);
  });

  it("does not mutate its inputs", () => {
    const fieldsCopy = structuredClone(fields);
    buildSections(fields, entries);
    expect(fields).toEqual(fieldsCopy);
  });
});

describe("flattenSlides / sectionStarts", () => {
  it("creates a slide per entry with section metadata", () => {
    const sections = buildSections(fields, entries);
    const slides = flattenSlides(sections);
    expect(slides).toHaveLength(3);
    expect(slides[1]).toMatchObject({ index: 1, sectionIndex: 0, indexInSection: 1, sectionSize: 2 });
    expect(slides[2]).toMatchObject({ index: 2, sectionIndex: 1, indexInSection: 0, sectionSize: 1 });
    expect(sectionStarts(sections)).toEqual([0, 2]);
  });
});

describe("countByField", () => {
  it("counts entries per known field", () => {
    expect(countByField(fields, entries)).toEqual({ sad: 1, happy: 2, learn: 0 });
  });
});

describe("names", () => {
  it("falls back to the e-mail user part", () => {
    expect(displayName({ author_name: "  ", author_email: "yossi@x.com" })).toBe("yossi");
    expect(displayName({ author_name: "יוסי כהן", author_email: "y@x.com" })).toBe("יוסי כהן");
  });

  it("never reveals anything for anonymous entries", () => {
    expect(displayName({ author_name: null, author_email: null, is_anonymous: true })).toBe("אנונימי");
  });

  it("builds initials", () => {
    expect(initials("Moshe Navon")).toBe("MN");
    expect(initials("משה נבון")).toBe("מנ");
    expect(initials("solo")).toBe("S");
    expect(initials("")).toBe("?");
  });
});

describe("presenter state machine", () => {
  const slides = flattenSlides(buildSections(fields, entries));

  it("walks forward through slides with a transition between sections", () => {
    const visited: PresenterState[] = [];
    let state: PresenterState = { kind: "intro" };
    for (let i = 0; i < 6; i++) {
      state = nextState(state, slides);
      visited.push(state);
    }
    expect(visited).toEqual([
      { kind: "slide", index: 0 },
      { kind: "slide", index: 1 },
      { kind: "transition", fromSection: 0 },
      { kind: "slide", index: 2 },
      { kind: "done" },
      { kind: "done" },
    ]);
  });

  it("walks backward symmetrically", () => {
    const visited: PresenterState[] = [];
    let state: PresenterState = { kind: "done" };
    for (let i = 0; i < 6; i++) {
      state = prevState(state, slides);
      visited.push(state);
    }
    expect(visited).toEqual([
      { kind: "slide", index: 2 },
      { kind: "transition", fromSection: 0 },
      { kind: "slide", index: 1 },
      { kind: "slide", index: 0 },
      { kind: "intro" },
      { kind: "intro" },
    ]);
  });

  it("handles an empty deck", () => {
    expect(nextState({ kind: "intro" }, [])).toEqual({ kind: "done" });
    expect(prevState({ kind: "done" }, [])).toEqual({ kind: "intro" });
  });
});

describe("entriesLabel", () => {
  it("uses Hebrew singular and plural forms", async () => {
    const { entriesLabel } = await import("./insights");
    expect(entriesLabel(1)).toBe("דיווח אחד");
    expect(entriesLabel(0)).toBe("0 דיווחים");
    expect(entriesLabel(5)).toBe("5 דיווחים");
  });
});
