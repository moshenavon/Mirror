import { describe, expect, it } from "vitest";
import { ANIMATED_EMOJIS, animatedEmojiUrl, emojiCode, findAnimatedEmoji, lastGrapheme } from "./emoji";

describe("emoji", () => {
  it("ships exactly ten animated emojis with unique codes", () => {
    expect(ANIMATED_EMOJIS).toHaveLength(10);
    expect(new Set(ANIMATED_EMOJIS.map((e) => e.code)).size).toBe(10);
  });

  it("converts emojis to Noto code names", () => {
    expect(emojiCode("😄")).toBe("1f604");
    expect(emojiCode("⚠️")).toBe("26a0_fe0f");
    expect(emojiCode("❤️")).toBe("2764_fe0f");
  });

  it("finds animated assets with or without the variation selector", () => {
    expect(findAnimatedEmoji("⚠️")?.code).toBe("26a0_fe0f");
    expect(findAnimatedEmoji("⚠")?.code).toBe("26a0_fe0f");
    expect(findAnimatedEmoji("❤")?.code).toBe("2764_fe0f");
    expect(findAnimatedEmoji(" 😢 ")?.code).toBe("1f622");
    expect(findAnimatedEmoji("🌈")).toBeNull();
    expect(findAnimatedEmoji("")).toBeNull();
    expect(animatedEmojiUrl("1f604")).toBe("/emoji/1f604.json");
  });

  it("keeps only the last typed emoji", () => {
    expect(lastGrapheme("💬🌈")).toBe("🌈");
    expect(lastGrapheme("👨‍👩‍👧")).toBe("👨‍👩‍👧");
    expect(lastGrapheme("  ")).toBe("");
  });
});
