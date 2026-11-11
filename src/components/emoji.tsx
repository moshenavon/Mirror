"use client";

import { useEffect, useRef, useState } from "react";
import { animatedEmojiUrl, findAnimatedEmoji } from "@/lib/emoji";

type LottiePlayer = {
  loadAnimation: (params: {
    container: Element;
    renderer: "svg";
    loop: boolean;
    autoplay: boolean;
    animationData: unknown;
    rendererSettings?: Record<string, unknown>;
  }) => LottieAnimation;
};
type LottieAnimation = {
  play: () => void;
  stop: () => void;
  goToAndStop: (frame: number, isFrame?: boolean) => void;
  destroy: () => void;
  totalFrames?: number;
};

let playerPromise: Promise<LottiePlayer> | null = null;
const dataCache = new Map<string, Promise<unknown>>();

function loadPlayer(): Promise<LottiePlayer> {
  playerPromise ??= import("lottie-web/build/player/lottie_light").then(
    (m) => ((m as { default?: LottiePlayer }).default ?? m) as LottiePlayer,
  );
  return playerPromise;
}

function loadData(code: string): Promise<unknown> {
  let promise = dataCache.get(code);
  if (!promise) {
    promise = fetch(animatedEmojiUrl(code)).then((r) => {
      if (!r.ok) throw new Error(`emoji ${code}: ${r.status}`);
      return r.json();
    });
    promise.catch(() => dataCache.delete(code));
    dataCache.set(code, promise);
  }
  return promise;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

type Props = {
  /** Unicode emoji (e.g. "😄"). Known emojis render as animated 3D Lottie. */
  value: string;
  size?: number;
  /** Whether the animation runs. When false the first frame is shown. */
  playing?: boolean;
  className?: string;
  /** Accessible label; when omitted the emoji is decorative. */
  label?: string;
};

export function Emoji({ value, size = 48, playing = true, className = "", label }: Props) {
  const asset = findAnimatedEmoji(value);
  const containerRef = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<LottieAnimation | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!asset || !containerRef.current) return;
    let cancelled = false;
    const container = containerRef.current;
    Promise.all([loadPlayer(), loadData(asset.code)])
      .then(([lottie, data]) => {
        if (cancelled) return;
        animationRef.current = lottie.loadAnimation({
          container,
          renderer: "svg",
          loop: true,
          autoplay: false,
          animationData: data,
          rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: true },
        });
        setReady(true);
      })
      .catch(() => {
        /* keep the unicode fallback */
      });
    return () => {
      cancelled = true;
      animationRef.current?.destroy();
      animationRef.current = null;
      setReady(false);
    };
  }, [asset]);

  useEffect(() => {
    const animation = animationRef.current;
    if (!animation || !ready) return;
    if (playing && !prefersReducedMotion()) animation.play();
    // The first frames are often a neutral "wind-up"; rest on a representative middle frame.
    else animation.goToAndStop(Math.floor((animation.totalFrames ?? 0) / 2), true);
  }, [playing, ready]);

  const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };

  return (
    <span
      {...a11y}
      className={`relative inline-flex shrink-0 select-none items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      data-emoji={value}
    >
      {asset && <span ref={containerRef} className={`absolute inset-0 ${ready ? "" : "invisible"}`} />}
      {!ready && (
        <span
          className={`leading-none ${playing && !asset ? "animate-float" : ""}`}
          style={{ fontSize: Math.round(size * 0.82) }}
        >
          {value}
        </span>
      )}
    </span>
  );
}
