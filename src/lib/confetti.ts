const BRAND_COLORS = ["#FFD02F", "#050038", "#FF6B7D", "#4FD6A2", "#8B7FF0", "#ffffff"];

function reducedMotion() {
  return typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/** Small celebratory burst, e.g. after sending an entry. */
export async function celebrate(origin: { x: number; y: number } = { x: 0.5, y: 0.65 }) {
  if (reducedMotion()) return;
  const confetti = (await import("canvas-confetti")).default;
  confetti({ particleCount: 90, spread: 75, startVelocity: 42, origin, colors: BRAND_COLORS, scalar: 1.05, zIndex: 9999 });
}

/** Bigger finale with side cannons, e.g. at the end of a retro. */
export async function finale() {
  if (reducedMotion()) return;
  const confetti = (await import("canvas-confetti")).default;
  const end = Date.now() + 1200;
  const frame = () => {
    confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: BRAND_COLORS, zIndex: 9999 });
    confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: BRAND_COLORS, zIndex: 9999 });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
