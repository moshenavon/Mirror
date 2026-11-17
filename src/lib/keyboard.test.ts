import { describe, expect, it } from "vitest";
import { visibleFrame } from "./keyboard";

const base = { innerHeight: 800, height: 800, offsetTop: 0, scale: 1 };

describe("visibleFrame", () => {
  it("is null while no keyboard is shown", () => {
    expect(visibleFrame(base)).toBeNull();
  });

  it("ignores browser chrome that is much smaller than a keyboard", () => {
    expect(visibleFrame({ ...base, height: 740 })).toBeNull();
  });

  it("returns the strip the keyboard covers", () => {
    expect(visibleFrame({ ...base, height: 480 })).toEqual({ top: 0, bottom: 320 });
  });

  it("accounts for the visual viewport being scrolled (iOS)", () => {
    expect(visibleFrame({ ...base, height: 420, offsetTop: 60 })).toEqual({ top: 60, bottom: 320 });
  });

  it("ignores a pinch-zoomed page", () => {
    expect(visibleFrame({ ...base, height: 400, scale: 2 })).toBeNull();
  });
});
