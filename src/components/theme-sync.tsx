"use client";

import { useLayoutEffect } from "react";
import { reapplyStoredTheme } from "@/lib/theme";

/** Keeps the saved theme on <html> if React clears it (no-op in production). */
export function ThemeSync() {
  useLayoutEffect(reapplyStoredTheme, []);
  return null;
}
