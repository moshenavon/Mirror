/**
 * "@" tagging of team members inside free text (report entries and action items).
 *
 * A tag is the plain text `@<label>` (label = the member's name, or their e-mail
 * when the name is missing or shared with another member). Nothing but the text
 * is stored for reports; for action items the tagged people are derived from the
 * final text with `findMentions`, so a tag that was deleted from the text never
 * counts.
 */

export type Mentionable = {
  email: string;
  /** What is written after the "@" – unique within the team. */
  label: string;
  /** Display name when the member has one (the label may be the e-mail instead). */
  name: string | null;
  avatarUrl: string | null;
};

type MemberLike = { email: string; name: string | null; avatarUrl?: string | null };

/** Builds the tag list for a team. Members that share a name are told apart by their e-mail. */
export function buildMentionables(members: readonly MemberLike[]): Mentionable[] {
  const nameCount = new Map<string, number>();
  for (const m of members) {
    const key = (m.name ?? "").trim().toLowerCase();
    if (key) nameCount.set(key, (nameCount.get(key) ?? 0) + 1);
  }
  return members.map((m) => {
    const name = m.name?.trim() || null;
    const unique = name !== null && nameCount.get(name.toLowerCase()) === 1;
    return { email: m.email.toLowerCase(), label: unique ? name : m.email.toLowerCase(), name, avatarUrl: m.avatarUrl ?? null };
  });
}

/** Name to show for an e-mail address that may belong to someone who left the team. */
export function labelForEmail(email: string, mentionables: readonly Mentionable[]): string {
  const found = mentionables.find((m) => m.email === email.toLowerCase());
  return found ? (found.name ?? found.email) : email.split("@")[0];
}

export type MentionQuery = {
  /** Index of the "@" that opened the query. */
  start: number;
  /** Text typed after the "@" up to the caret. */
  query: string;
};

/**
 * The "@query" the caret is currently in, or null. An "@" only starts a tag at the
 * beginning of the text or after whitespace (so e-mail addresses are left alone),
 * and the query ends at the first whitespace.
 */
export function getMentionQuery(text: string, caret: number): MentionQuery | null {
  for (let i = caret - 1; i >= 0; i--) {
    const ch = text[i];
    if (/\s/.test(ch)) return null;
    if (ch === "@") {
      if (i > 0 && !/\s/.test(text[i - 1])) return null;
      return { start: i, query: text.slice(i + 1, caret) };
    }
  }
  return null;
}

const FINAL_LETTERS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

/** Case-insensitive, and Hebrew final letters match their regular form ("דנ" finds "דן"). */
const fold = (text: string): string => text.toLowerCase().replace(/[ךםןףץ]/g, (c) => FINAL_LETTERS[c]);

/** Members that match the query (names starting with it first); everybody for an empty query. */
export function filterMentionables(list: readonly Mentionable[], query: string): Mentionable[] {
  const q = fold(query.trim());
  if (!q) return [...list];
  const rank = (m: Mentionable): number => {
    const label = fold(m.label);
    const email = fold(m.email);
    if (label.startsWith(q)) return 0;
    if (label.split(/\s+/).some((word) => word.startsWith(q))) return 1;
    if (label.includes(q) || email.startsWith(q)) return 2;
    return -1;
  };
  return list
    .map((m) => ({ m, r: rank(m) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r)
    .map((x) => x.m);
}

/** Replaces the "@query" being typed (from `start` to `caret`) with the chosen tag and a trailing space. */
export function insertMention(text: string, start: number, caret: number, label: string): { text: string; caret: number } {
  const insertion = `@${label} `;
  const next = text.slice(0, start) + insertion + text.slice(caret).replace(/^[ \t]/, "");
  return { text: next, caret: start + insertion.length };
}

export type MentionSegment = { text: string; mention: Mentionable | null };

const WORD_CHAR = /[\p{L}\p{N}_]/u;

/**
 * Splits text into plain parts and tags. Longer labels win, so "@Dana Cohen" is one tag
 * even when a member called "Dana" exists, and a tag must end at a word boundary.
 */
export function splitMentions(text: string, mentionables: readonly Mentionable[]): MentionSegment[] {
  if (!text.includes("@") || mentionables.length === 0) return [{ text, mention: null }];
  const byLength = [...mentionables].sort((a, b) => b.label.length - a.label.length);
  const lower = text.toLowerCase();
  const segments: MentionSegment[] = [];
  let plainFrom = 0;
  let i = 0;
  while (i < text.length) {
    if (text[i] === "@" && (i === 0 || /\s/.test(text[i - 1]))) {
      const hit = byLength.find((m) => {
        const token = `@${m.label}`.toLowerCase();
        if (!lower.startsWith(token, i)) return false;
        const after = text[i + token.length];
        return after === undefined || !WORD_CHAR.test(after);
      });
      if (hit) {
        if (i > plainFrom) segments.push({ text: text.slice(plainFrom, i), mention: null });
        const end = i + hit.label.length + 1;
        segments.push({ text: text.slice(i, end), mention: hit });
        plainFrom = end;
        i = end;
        continue;
      }
    }
    i++;
  }
  if (plainFrom < text.length) segments.push({ text: text.slice(plainFrom), mention: null });
  return segments;
}

/** E-mail addresses of the members tagged in the text, each once, in order of appearance. */
export function findMentions(text: string, mentionables: readonly Mentionable[]): string[] {
  const emails: string[] = [];
  for (const segment of splitMentions(text, mentionables)) {
    if (segment.mention && !emails.includes(segment.mention.email)) emails.push(segment.mention.email);
  }
  return emails;
}

/** The "tag people with @" tip is shown once per kind of field (see `useOneTimeHint`). */
export const MENTION_HINT_KEYS = {
  report: "mirror:hint:mention-report",
  actionItem: "mirror:hint:mention-action-item",
} as const;
