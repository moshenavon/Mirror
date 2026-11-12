/**
 * Hebrew support for generated Open Graph images.
 *
 * The image renderer (Satori) has no bidi support: it lays every string out
 * left-to-right in logical order, so Hebrew comes out mirrored. These helpers
 * split text into words in *visual* order, ready to be laid out in an LTR row:
 * Hebrew is reversed character by character, while Latin/digit runs (team
 * names like "Alpha 2") keep their reading order.
 */

const HEBREW = /[֐-׿יִ-ﭏ]/;
const LTR_CHAR = /[A-Za-z0-9À-ɏ]/;
const MIRROR: Record<string, string> = { "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<" };

const isLtrWord = (word: string) => !HEBREW.test(word) && LTR_CHAR.test(word);

/** One word in visual order: LTR runs keep their order, everything else is reversed (brackets mirrored). */
export function visualWord(word: string): string {
  if (!HEBREW.test(word)) return word;
  const runs: string[] = [];
  let current = "";
  let currentLtr: boolean | null = null;
  for (const ch of Array.from(word)) {
    // Keep separators inside numbers/latin runs ("1.5", "a-b") with the run.
    const ltr: boolean = LTR_CHAR.test(ch) || (currentLtr === true && /[.,:\-/]/.test(ch) && !HEBREW.test(ch));
    if (currentLtr !== null && ltr !== currentLtr) {
      runs.push(currentLtr ? current : reverse(current));
      current = "";
    }
    current += ch;
    currentLtr = ltr;
  }
  if (current) runs.push(currentLtr ? current : reverse(current));
  return runs.reverse().join("");
}

function reverse(text: string): string {
  return Array.from(text)
    .reverse()
    .map((ch) => MIRROR[ch] ?? ch)
    .join("");
}

/**
 * Words of an RTL paragraph, each already in visual order and listed from the
 * right edge to the left. Consecutive LTR words are kept together as one item
 * ("Alpha Team" stays readable). Lay them out with `flex-direction: row-reverse`
 * and `flex-wrap: wrap` so lines break between words, right-aligned.
 */
export function rtlWords(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const items: string[] = [];
  let ltrGroup: string[] = [];
  const flush = () => {
    if (ltrGroup.length) items.push(ltrGroup.join(" "));
    ltrGroup = [];
  };
  for (const word of words) {
    if (isLtrWord(word)) {
      ltrGroup.push(word);
      continue;
    }
    flush();
    items.push(visualWord(word));
  }
  flush();
  return items;
}
