import { describe, expect, it } from "vitest";
import {
  buildMentionables,
  filterMentionables,
  findMentions,
  getMentionQuery,
  insertMention,
  labelForEmail,
  splitMentions,
} from "./mentions";

const team = buildMentionables([
  { email: "dana@x.co", name: "דנה כהן" },
  { email: "dan@x.co", name: "דן" },
  { email: "yossi@x.co", name: null },
  { email: "a1@x.co", name: "אורי" },
  { email: "a2@x.co", name: "אורי" },
]);

describe("buildMentionables", () => {
  it("uses the name, falls back to the e-mail, and tells apart shared names by e-mail", () => {
    expect(team.map((m) => m.label)).toEqual(["דנה כהן", "דן", "yossi@x.co", "a1@x.co", "a2@x.co"]);
  });
});

describe("getMentionQuery", () => {
  it("finds the query after an @ at the start or after whitespace", () => {
    expect(getMentionQuery("@", 1)).toEqual({ start: 0, query: "" });
    expect(getMentionQuery("שלום @דנ", 8)).toEqual({ start: 5, query: "דנ" });
    expect(getMentionQuery("a\n@d", 4)).toEqual({ start: 2, query: "d" });
  });

  it("ignores e-mail addresses, finished words and carets before the @", () => {
    expect(getMentionQuery("mail me at a@b", 14)).toBeNull();
    expect(getMentionQuery("@דנה כבר", 8)).toBeNull();
    expect(getMentionQuery("שלום", 4)).toBeNull();
    expect(getMentionQuery("hi @dan", 2)).toBeNull();
  });
});

describe("filterMentionables", () => {
  it("returns everyone for an empty query", () => {
    expect(filterMentionables(team, "")).toHaveLength(team.length);
  });

  it("ranks prefix matches before word and substring matches", () => {
    expect(filterMentionables(team, "דנ").map((m) => m.email)).toEqual(["dana@x.co", "dan@x.co"]);
    expect(filterMentionables(team, "כהן").map((m) => m.email)).toEqual(["dana@x.co"]);
    expect(filterMentionables(team, "YOS").map((m) => m.email)).toEqual(["yossi@x.co"]);
    expect(filterMentionables(team, "zzz")).toEqual([]);
  });
});

describe("insertMention", () => {
  it("replaces the typed @query with the tag and moves the caret after it", () => {
    expect(insertMention("שלום @דנ", 5, 8, "דנה כהן")).toEqual({ text: "שלום @דנה כהן ", caret: 14 });
  });

  it("does not double the space when text follows", () => {
    expect(insertMention("@ד בבקשה", 0, 2, "דן")).toEqual({ text: "@דן בבקשה", caret: 4 });
  });
});

describe("splitMentions / findMentions", () => {
  it("finds tags on word boundaries", () => {
    expect(findMentions("תודה @דנה כהן, וגם @דן!", team)).toEqual(["dana@x.co", "dan@x.co"]);
    expect(findMentions("@yossi@x.co ו-@yossi@x.co", team)).toEqual(["yossi@x.co"]);
  });

  it("prefers the longest label, so a longer name is not also tagged as a shorter one", () => {
    expect(findMentions("@דנה כהן", team)).toEqual(["dana@x.co"]);
    expect(findMentions("@דנהל", team)).toEqual([]);
  });

  it("ignores half-deleted tags and unknown names", () => {
    expect(findMentions("@דנ", team)).toEqual([]);
    expect(findMentions("@מישהו אחר", team)).toEqual([]);
    expect(findMentions("דנה@x.co", team)).toEqual([]);
  });

  it("is case-insensitive for e-mail labels and treats shared names as separate people", () => {
    expect(findMentions("@A1@X.co @a2@x.co", team)).toEqual(["a1@x.co", "a2@x.co"]);
  });

  it("splits text into plain and tagged segments", () => {
    const segments = splitMentions("היי @דן, תבדוק", team);
    expect(segments.map((s) => [s.text, s.mention?.email ?? null])).toEqual([
      ["היי ", null],
      ["@דן", "dan@x.co"],
      [", תבדוק", null],
    ]);
    expect(splitMentions("בלי תגיות", team)).toEqual([{ text: "בלי תגיות", mention: null }]);
  });
});

describe("labelForEmail", () => {
  it("falls back to the part before @ for someone who is no longer in the team", () => {
    expect(labelForEmail("dana@x.co", team)).toBe("דנה כהן");
    expect(labelForEmail("gone@x.co", team)).toBe("gone");
  });
});
