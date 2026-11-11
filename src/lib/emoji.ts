/**
 * Animated 3D emojis (Google Noto Animated Emoji, CC BY 4.0) shipped as
 * Lottie files under /public/emoji/<code>.json.
 */
export type AnimatedEmoji = { emoji: string; code: string; name: string };

export const ANIMATED_EMOJIS: readonly AnimatedEmoji[] = [
  { emoji: "😄", code: "1f604", name: "שמחה" },
  { emoji: "😢", code: "1f622", name: "עצב" },
  { emoji: "💡", code: "1f4a1", name: "תובנה" },
  { emoji: "⚠️", code: "26a0_fe0f", name: "אזהרה" },
  { emoji: "🎉", code: "1f389", name: "חגיגה" },
  { emoji: "🙏", code: "1f64f", name: "תודה" },
  { emoji: "🚀", code: "1f680", name: "התקדמות" },
  { emoji: "🤔", code: "1f914", name: "מחשבה" },
  { emoji: "🔥", code: "1f525", name: "בוער" },
  { emoji: "❤️", code: "2764_fe0f", name: "אהבה" },
];

/** Code points of an emoji as lower-case hex joined by "_" (Noto naming). */
export function emojiCode(emoji: string): string {
  return Array.from(emoji.trim())
    .map((ch) => ch.codePointAt(0)!.toString(16))
    .join("_");
}

const stripVariation = (code: string) => code.replace(/_fe0f/g, "");
const BY_CODE = new Map(ANIMATED_EMOJIS.map((e) => [stripVariation(e.code), e]));

/** The animated asset for an emoji, matching with or without the U+FE0F selector. */
export function findAnimatedEmoji(emoji: string | null | undefined): AnimatedEmoji | null {
  if (!emoji) return null;
  return BY_CODE.get(stripVariation(emojiCode(emoji))) ?? null;
}

export function animatedEmojiUrl(code: string): string {
  return `/emoji/${code}.json`;
}

/** Last user-perceived character (grapheme) of a string – used so typing an emoji replaces the previous one. */
export function lastGrapheme(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segments = Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(trimmed));
    return segments.at(-1)?.segment ?? "";
  }
  return Array.from(trimmed).at(-1) ?? "";
}
