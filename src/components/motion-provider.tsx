"use client";

import { MotionConfig } from "motion/react";

/** Global animation defaults; honours the user's reduced-motion setting. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 380, damping: 28 }}>
      {children}
    </MotionConfig>
  );
}
