import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SPLASH_ID, SPLASH_INIT_SCRIPT, SPLASH_SESSION_KEY } from "./splash";

function mountSplash() {
  const el = document.createElement("div");
  el.id = SPLASH_ID;
  document.body.appendChild(el);
  return el;
}

function runScript() {
  new Function(SPLASH_INIT_SCRIPT)();
}

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce && query.includes("reduce") }));
}

describe("splash init script", () => {
  beforeEach(() => {
    sessionStorage.clear();
    stubReducedMotion(false);
  });
  afterEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("shows the splash on the first load of a session and remembers it", () => {
    const el = mountSplash();
    runScript();
    expect(el.hidden).toBe(false);
    expect(sessionStorage.getItem(SPLASH_SESSION_KEY)).toBe("1");
  });

  it("hides the splash on later loads in the same session", () => {
    sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
    const el = mountSplash();
    runScript();
    expect(el.hidden).toBe(true);
  });

  it("hides the splash when the visitor prefers reduced motion", () => {
    stubReducedMotion(true);
    const el = mountSplash();
    runScript();
    expect(el.hidden).toBe(true);
    expect(sessionStorage.getItem(SPLASH_SESSION_KEY)).toBeNull();
  });

  it("hides the splash once its own fade-out animation ends", () => {
    const el = mountSplash();
    runScript();
    el.dispatchEvent(new Event("animationend"));
    expect(el.hidden).toBe(true);
  });
});
