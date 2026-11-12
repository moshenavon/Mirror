import { describe, expect, it } from "vitest";
import { rtlWords, visualWord } from "./og-text";

describe("visualWord", () => {
  it("reverses Hebrew words", () => {
    expect(visualWord("שלום")).toBe("םולש");
  });

  it("keeps punctuation on the visual left of a Hebrew word", () => {
    expect(visualWord("עולם,")).toBe(",םלוע");
  });

  it("leaves Latin and numbers untouched", () => {
    expect(visualWord("Alpha")).toBe("Alpha");
    expect(visualWord("2026")).toBe("2026");
  });

  it("keeps numbers readable inside Hebrew words", () => {
    expect(visualWord("ה-10")).toBe("10-ה");
  });

  it("mirrors brackets", () => {
    expect(visualWord("(צוות)")).toBe("(תווצ)");
  });
});

describe("rtlWords", () => {
  it("lists words from right to left in visual order", () => {
    expect(rtlWords("צוות הפיתוח")).toEqual(["תווצ", "חותיפה"]);
  });

  it("keeps consecutive Latin words together", () => {
    expect(rtlWords("צוות Alpha Team 2")).toEqual(["תווצ", "Alpha Team 2"]);
  });

  it("collapses whitespace", () => {
    expect(rtlWords("  א   ב ")).toEqual(["א", "ב"]);
  });
});
