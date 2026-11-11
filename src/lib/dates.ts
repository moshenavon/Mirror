/** Time zone used to interpret calendar days (date pickers, "today"). */
export const APP_TIME_ZONE = process.env.NEXT_PUBLIC_APP_TIME_ZONE || "Asia/Jerusalem";

export const DEFAULT_RANGE_DAYS = 14;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type DateRange = { from: string; to: string };
export type RangePreset = "week" | "twoWeeks" | "month";

export const RANGE_PRESETS: { id: RangePreset; label: string; days: number }[] = [
  { id: "week", label: "שבוע", days: 7 },
  { id: "twoWeeks", label: "שבועיים", days: 14 },
  { id: "month", label: "חודש", days: 30 },
];

/** Calendar date ("YYYY-MM-DD") of an instant in the given time zone. */
export function toDateString(date: Date, timeZone = APP_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** Adds (or subtracts) whole calendar days to a "YYYY-MM-DD" string. */
export function addDays(dateString: string, days: number): string {
  const m = DATE_RE.exec(dateString);
  if (!m) throw new Error(`Invalid date: ${dateString}`);
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days));
  return date.toISOString().slice(0, 10);
}

/** Offset (ms) of `timeZone` from UTC at the given instant. */
export function timeZoneOffsetMs(instant: Date, timeZone = APP_TIME_ZONE): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  const truncated = Math.floor(instant.getTime() / 1000) * 1000;
  return asUtc - truncated;
}

/** UTC instant of local midnight at the start of `dateString` in `timeZone`. */
export function startOfDayUtc(dateString: string, timeZone = APP_TIME_ZONE): Date {
  const m = DATE_RE.exec(dateString);
  if (!m) throw new Error(`Invalid date: ${dateString}`);
  const naiveUtc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // Two passes handle DST transitions around midnight.
  let guess = naiveUtc - timeZoneOffsetMs(new Date(naiveUtc), timeZone);
  guess = naiveUtc - timeZoneOffsetMs(new Date(guess), timeZone);
  return new Date(guess);
}

/** Default insights range: the last 14 days up to and including today. */
export function defaultRange(now = new Date(), timeZone = APP_TIME_ZONE): DateRange {
  const to = toDateString(now, timeZone);
  return { from: addDays(to, -DEFAULT_RANGE_DAYS), to };
}

export function presetRange(preset: RangePreset, now = new Date(), timeZone = APP_TIME_ZONE): DateRange {
  const days = RANGE_PRESETS.find((p) => p.id === preset)?.days ?? DEFAULT_RANGE_DAYS;
  const to = toDateString(now, timeZone);
  return { from: addDays(to, -days), to };
}

/**
 * Reads a range from query parameters, falling back to the default range
 * for missing/invalid values and swapping reversed ranges.
 */
export function resolveRange(
  params: { from?: string | string[]; to?: string | string[] },
  now = new Date(),
  timeZone = APP_TIME_ZONE,
): DateRange {
  const fallback = defaultRange(now, timeZone);
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const from = isValidDateString(pick(params.from)) ? (pick(params.from) as string) : fallback.from;
  const to = isValidDateString(pick(params.to)) ? (pick(params.to) as string) : fallback.to;
  return from <= to ? { from, to } : { from: to, to: from };
}

/** Half-open UTC interval [fromIso, toIso) covering whole local days. */
export function rangeToInterval(range: DateRange, timeZone = APP_TIME_ZONE): { fromIso: string; toIso: string } {
  return {
    fromIso: startOfDayUtc(range.from, timeZone).toISOString(),
    toIso: startOfDayUtc(addDays(range.to, 1), timeZone).toISOString(),
  };
}

export function formatDate(iso: string, timeZone = APP_TIME_ZONE): string {
  return new Intl.DateTimeFormat("he-IL", { timeZone, day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso),
  );
}

export function formatDateTime(iso: string, timeZone = APP_TIME_ZONE): string {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** "YYYY-MM-DD" → "D.M.YYYY" */
export function formatDateString(dateString: string): string {
  const m = DATE_RE.exec(dateString);
  if (!m) return dateString;
  return `${Number(m[3])}.${Number(m[2])}.${m[1]}`;
}
