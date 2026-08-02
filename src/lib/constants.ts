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

// Geolocation tuning (see lib/geolocation.ts).
export const GEO = {
  DESIRED_ACCURACY_M: 30, // resolve early once a fix is this good
  MAX_WAIT_MS: 12_000, // otherwise wait this long for the best fix
  POOR_ACCURACY_M: 75, // warn the lecturer above this when capturing a classroom
  // Each side's reported accuracy is added to the geofence allowance (so an
  // honest same-spot scan passes despite GPS error), but capped so a garbage
  // fix can't silently disable the fence.
  ACCURACY_CAP_M: 100,
} as const;
