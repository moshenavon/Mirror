import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { MotionGlobalConfig } from "motion";

// Animations finish instantly in tests.
MotionGlobalConfig.skipAnimations = true;

afterEach(() => {
  cleanup();
});

// `server-only` throws when imported outside a React Server environment.
vi.mock("server-only", () => ({}));

// jsdom does not implement <dialog> methods.
if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

// Server actions are replaced in component tests; components receive
// injectable action props, but the default imports must still resolve.
vi.mock("@/app/actions/entries", () => ({
  createEntry: vi.fn(async () => ({ ok: true })),
  updateEntry: vi.fn(async () => ({ ok: true })),
  deleteEntry: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/app/actions/fields", () => ({
  createField: vi.fn(async () => ({ ok: true })),
  updateField: vi.fn(async () => ({ ok: true })),
  setFieldActive: vi.fn(async () => ({ ok: true })),
  deleteField: vi.fn(async () => ({ ok: true })),
  reorderFields: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/app/actions/members", () => ({
  addMembers: vi.fn(async () => ({ ok: true, data: { added: [], skipped: [], invalid: [] } })),
  updateMemberRole: vi.fn(async () => ({ ok: true })),
  removeMember: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/app/actions/teams", () => ({
  createTeam: vi.fn(),
  updateTeamDetails: vi.fn(),
  setInsightsVisibility: vi.fn(async () => ({ ok: true })),
  deleteTeam: vi.fn(async () => ({ ok: true })),
  setPublicSubmissions: vi.fn(async () => ({ ok: true })),
  setPublicRequiresIdentity: vi.fn(async () => ({ ok: true })),
  setPublicAllowJoin: vi.fn(async () => ({ ok: true })),
  regeneratePublicLink: vi.fn(async () => ({ ok: true, data: { token: "f".repeat(64) } })),
}));
vi.mock("@/app/actions/public-entries", () => ({
  submitPublicEntry: vi.fn(async () => ({ ok: true })),
  joinTeamViaLink: vi.fn(async () => ({ ok: true })),
}));

// Heavy browser-only animation libraries are stubbed.
vi.mock("lottie-web/build/player/lottie_light", () => ({
  default: {
    loadAnimation: vi.fn(() => ({ play: vi.fn(), stop: vi.fn(), goToAndStop: vi.fn(), destroy: vi.fn() })),
  },
}));
vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

// Emoji JSON requests never hit the network in tests.
vi.stubGlobal(
  "fetch",
  vi.fn(async () => new Response(JSON.stringify({ v: "5.8.1", fr: 60, ip: 0, op: 1, w: 10, h: 10, layers: [] }))),
);
