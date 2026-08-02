"use client";

import { motion } from "motion/react";

/**
 * Spring-loaded success check that draws itself. The one place we spend a spring —
 * it marks the moment attendance is confirmed (SPEC / plan "signature element").
 */
export function SuccessCheck({ size = 96 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 18 }}
      aria-hidden
    >
      <motion.circle
        cx="26"
        cy="26"
        r="24"
        fill="none"
        stroke="var(--color-success)"
        strokeWidth="3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      />
      <motion.path
        d="M16 27 l7 7 l14 -15"
        fill="none"
        stroke="var(--color-success)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.25, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      />
    </motion.svg>
  );
}
