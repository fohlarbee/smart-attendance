"use client";

import { motion } from "motion/react";

/**
 * Ring that depletes over one rotation cycle. Remounts each cycle via `cycleKey`,
 * so the depletion restarts in sync with a fresh QR. Linear easing — it's a clock,
 * not an entrance.
 */
export function CountdownRing({
  cycleKey,
  durationMs,
  size = 520,
  stroke = 6,
  children,
}: {
  cycleKey: number;
  durationMs: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div className="relative" style={{ width: size, height: size, maxWidth: "100%" }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 h-full w-full -rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-hairline)"
          strokeWidth={stroke}
        />
        <motion.circle
          key={cycleKey}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-amber)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: circ }}
          transition={{ duration: durationMs / 1000, ease: "linear" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center p-[8%]">{children}</div>
    </div>
  );
}
