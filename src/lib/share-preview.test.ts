import { describe, expect, it } from "vitest";
import { shareCopy, shareTitle } from "./share-preview";

describe("shareCopy", () => {
  it("invites to join when the link allows joining", () => {
    const copy = shareCopy({ team_name: " צוות אלפא ", allow_join: true });
    expect(copy.kicker).toBe("הזמנה להצטרף לצוות");
    expect(copy.title).toBe("צוות אלפא");
    expect(copy.description).toContain("הצטרפו לצוות");
  });

  it("describes reporting when joining is off", () => {
    const copy = shareCopy({ team_name: "אלפא", allow_join: false, requires_identity: true });
    expect(copy.kicker).toBe("קישור לדיווח לצוות");
    expect(copy.description).toContain("אפשר לדווח לצוות");
    expect(copy.description).not.toContain("בלי שם");
  });

  it("mentions anonymity for anonymous links", () => {
    const copy = shareCopy({ team_name: "אלפא" });
    expect(copy.kicker).toBe("קישור לדיווח אנונימי לצוות");
    expect(copy.description).toContain("בלי שם ובלי הזדהות");
  });

  it("falls back to the generic copy for an inactive link", () => {
    expect(shareCopy(null).title).toBe("Mirror");
  });
});

describe("shareTitle", () => {
  it("names the team", () => {
    expect(shareTitle({ team_name: "אלפא", allow_join: true })).toBe("הצטרפו לצוות אלפא");
    expect(shareTitle({ team_name: "אלפא" })).toBe("דיווח לצוות אלפא");
    expect(shareTitle(null)).toBe("Mirror");
  });

  it("does not repeat the word צוות", () => {
    expect(shareTitle({ team_name: "צוות הפיתוח", allow_join: true })).toBe("הצטרפו לצוות הפיתוח");
  });
});
