// Shared tunables for the attendance domain.

export const CAMPAIGN = {
  MIN_RADIUS_M: 10,
  MAX_RADIUS_M: 300,
  DEFAULT_RADIUS_M: 50,
} as const;

// How often the lecturer screen fetches a fresh QR token, in ms.
// Kept below TOKEN_TTL_SECONDS (see lib/token.ts) so the visible code never expires.
export const QR_ROTATE_MS = 20_000;

// How often the lecturer live list / student poll refreshes, in ms.
export const LIVE_POLL_MS = 4_000;
