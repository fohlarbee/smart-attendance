// Accuracy-aware geolocation. The browser's first fix is often a coarse
// network/Wi-Fi reading (hundreds of metres off) before GPS locks in, so we
// watch for a bit and keep the *best* (smallest-accuracy) fix rather than the
// first one. See lib/constants GEO_* for the tunables.

import { GEO } from "@/lib/constants";

export type Fix = { lat: number; lng: number; accuracy: number };

/**
 * Resolve the most accurate position we can get within a time budget.
 * - resolves early once accuracy <= desiredAccuracy
 * - otherwise resolves with the best fix seen by maxWait
 * - rejects only if no fix at all arrives (or permission denied)
 */
export function getAccuratePosition(opts?: {
  desiredAccuracy?: number;
  maxWait?: number;
}): Promise<Fix> {
  const desired = opts?.desiredAccuracy ?? GEO.DESIRED_ACCURACY_M;
  const maxWait = opts?.maxWait ?? GEO.MAX_WAIT_MS;

  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("unsupported"));
      return;
    }

    let best: Fix | null = null;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      if (best) resolve(best);
      else reject(new Error("no-fix"));
    };

    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        const fix: Fix = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
        };
        if (!best || fix.accuracy < best.accuracy) best = fix;
        if (fix.accuracy <= desired) finish();
      },
      (err) => {
        // Only fail hard if we have nothing yet (e.g. permission denied).
        if (!best) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: maxWait },
    );

    const timer = setTimeout(finish, maxWait);
  });
}
