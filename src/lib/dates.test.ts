import { describe, expect, it } from "vitest";
import {
  addDays,
  defaultRange,
  formatDateString,
  isValidDateString,
  presetRange,
  rangeToInterval,
  resolveRange,
  startOfDayUtc,
  toDateString,
} from "./dates";

const TZ = "Asia/Jerusalem";

describe("dates", () => {
  it("formats an instant as a local calendar date", () => {
    // 22:30 UTC on Nov 10 is already Nov 11 in Israel (UTC+2 in winter)
    expect(toDateString(new Date("2026-11-10T22:30:00Z"), TZ)).toBe("2026-11-11");
    expect(toDateString(new Date("2026-11-10T21:59:00Z"), TZ)).toBe("2026-11-10");
  });

  it("validates YYYY-MM-DD strings", () => {
    expect(isValidDateString("2026-02-28")).toBe(true);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("2026-2-3")).toBe(false);
    expect(isValidDateString(undefined)).toBe(false);
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("computes local midnight in UTC for winter and summer time", () => {
    expect(startOfDayUtc("2026-11-11", TZ).toISOString()).toBe("2026-11-10T22:00:00.000Z");
    expect(startOfDayUtc("2026-07-01", TZ).toISOString()).toBe("2026-06-30T21:00:00.000Z");
    expect(startOfDayUtc("2026-07-01", "UTC").toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("defaults to the last 14 days including today", () => {
    expect(defaultRange(new Date("2026-11-11T10:00:00Z"), TZ)).toEqual({ from: "2026-10-28", to: "2026-11-11" });
  });

  it("supports presets", () => {
    const now = new Date("2026-11-11T10:00:00Z");
    expect(presetRange("week", now, TZ)).toEqual({ from: "2026-11-04", to: "2026-11-11" });
    expect(presetRange("month", now, TZ)).toEqual({ from: "2026-10-12", to: "2026-11-11" });
  });

  it("resolves query params with fallbacks and swaps reversed ranges", () => {
    const now = new Date("2026-11-11T10:00:00Z");
    expect(resolveRange({}, now, TZ)).toEqual({ from: "2026-10-28", to: "2026-11-11" });
    expect(resolveRange({ from: "2026-11-01", to: "bad" }, now, TZ)).toEqual({ from: "2026-11-01", to: "2026-11-11" });
    expect(resolveRange({ from: "2026-11-05", to: "2026-11-01" }, now, TZ)).toEqual({
      from: "2026-11-01",
      to: "2026-11-05",
    });
    expect(resolveRange({ from: ["2026-11-02", "x"] }, now, TZ).from).toBe("2026-11-02");
  });

  it("converts a range to a half-open UTC interval covering whole days", () => {
    expect(rangeToInterval({ from: "2026-11-01", to: "2026-11-11" }, TZ)).toEqual({
      fromIso: "2026-10-31T22:00:00.000Z",
      toIso: "2026-11-11T22:00:00.000Z",
    });
  });

  it("formats date strings for display", () => {
    expect(formatDateString("2026-03-05")).toBe("5.3.2026");
  });
});
