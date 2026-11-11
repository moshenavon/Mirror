import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

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
}));
