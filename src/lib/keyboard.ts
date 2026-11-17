import { useEffect, useState, type CSSProperties } from "react";

/** The relevant numbers of `window.innerHeight` and `window.visualViewport`. */
export type ViewportMetrics = { innerHeight: number; height: number; offsetTop: number; scale: number };

/** Anything smaller than this is browser chrome (URL bar, toolbars), not a keyboard. */
const MIN_KEYBOARD_PX = 120;

export type VisibleFrame = { top: number; bottom: number };

/**
 * The part of the layout viewport that is still visible while the on-screen keyboard is up
 * (`top`/`bottom` are the covered strips, in px), or null when no keyboard is covering it.
 * A pinch-zoomed page also shrinks the visual viewport, so zoomed pages never count.
 */
export function visibleFrame({ innerHeight, height, offsetTop, scale }: ViewportMetrics): VisibleFrame | null {
  if (scale > 1.01) return null;
  const bottom = Math.round(innerHeight - offsetTop - height);
  if (bottom < MIN_KEYBOARD_PX) return null;
  return { top: Math.round(offsetTop), bottom };
}

/**
 * Inline style for a modal `<dialog>` that keeps it centred in the space the keyboard leaves
 * free. With the keyboard closed – and always on desktop (mouse + hover) – it returns
 * undefined, so the dialog stays centred in the whole screen.
 */
export function useKeyboardDialogStyle(): CSSProperties | undefined {
  const [frame, setFrame] = useState<VisibleFrame | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    if (window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) return;

    const update = () => {
      const next = visibleFrame({
        innerHeight: window.innerHeight,
        height: viewport.height,
        offsetTop: viewport.offsetTop,
        scale: viewport.scale,
      });
      setFrame((prev) => (prev?.top === next?.top && prev?.bottom === next?.bottom ? prev : next));
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return frame ? { top: frame.top, bottom: frame.bottom } : undefined;
}
