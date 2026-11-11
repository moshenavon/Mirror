import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import lottie from "lottie-web/build/player/lottie_light";
import { Emoji } from "./emoji";

describe("Emoji", () => {
  it("loads the animated 3D version of known emojis", async () => {
    render(<Emoji value="😄" label="שמחה" size={64} />);
    const el = screen.getByRole("img", { name: "שמחה" });
    expect(el).toHaveStyle({ width: "64px", height: "64px" });
    await waitFor(() => expect(lottie.loadAnimation).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith("/emoji/1f604.json");
  });

  it("falls back to the unicode character for other emojis", () => {
    render(<Emoji value="🌈" label="קשת" />);
    expect(screen.getByRole("img", { name: "קשת" })).toHaveTextContent("🌈");
  });

  it("is decorative without a label", () => {
    const { container } = render(<Emoji value="🌈" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});
