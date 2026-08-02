// Accuracy-aware geolocation.
//
// The browser's first fix is often a coarse network/Wi-Fi reading before GPS
// locks in. We want the best (smallest-accuracy) fix, but we must never fail
// just because a *high-accuracy* fix isn't available (e.g. on a laptop). So we
// run two requests in parallel:
//   - a fast, low-accuracy getCurrentPosition (a reliable floor), and
//   - a high-accuracy watchPosition that refines it.
// We resolve as soon as a fix meets the desired accuracy, or at maxWait with the
// best fix seen. We only reject on permission-denied or if nothing arrives.

import { GEO } from "@/lib/constants";

export type Fix = { lat: number; lng: number; accuracy: number };

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
    let watchId: number | null = null;

    const cleanup = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
    };
    const succeed = (fix: Fix) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(fix);
    };
    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const consider = (p: GeolocationPosition) => {
      const fix: Fix = {
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        accuracy: p.coords.accuracy,
      };
      if (!best || fix.accuracy < best.accuracy) best = fix;
      if (fix.accuracy <= desired) succeed(fix);
    };
    const onError = (err: GeolocationPositionError) => {
      // Permission denied is terminal; tolerate other errors and wait for a fix.
      if (err.code === err.PERMISSION_DENIED) fail(err);
    };

    // Reliable coarse floor (this is what worked previously). maximumAge lets it
    // return a very recent cached fix instantly.
    navigator.geolocation.getCurrentPosition(consider, onError, {
      enableHighAccuracy: false,
      timeout: maxWait,
      maximumAge: 60_000,
    });

    // High-accuracy refinement.
    watchId = navigator.geolocation.watchPosition(consider, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: maxWait,
    });

    const timer = setTimeout(() => {
      if (best) succeed(best);
      else fail(new Error("no-fix"));
    }, maxWait);
  });
}
