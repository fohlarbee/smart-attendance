"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Html5Qrcode } from "html5-qrcode";
import { AnimatePresence, motion } from "motion/react";
import { SuccessCheck } from "@/components/beacon/success-check";
import { Button } from "@/components/ui/button";
import { getDeviceHash } from "@/lib/device";
import { reverseGeocode } from "@/lib/geocode";

const READER_ID = "qr-reader";

type Status =
  | { kind: "starting" }
  | { kind: "scanning" }
  | { kind: "marking" }
  | { kind: "success"; course: string; already: boolean }
  | { kind: "error"; message: string };

export function ScanClient() {
  const [status, setStatus] = useState<Status>({ kind: "starting" });
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const lockRef = useRef(false);

  // Keep a fresh location fix in the background so marking is instant.
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) =>
        (coordsRef.current = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
        }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const getCoords = useCallback(
    () =>
      new Promise<{ lat: number; lng: number }>((resolve, reject) => {
        if (coordsRef.current) return resolve(coordsRef.current);
        if (!("geolocation" in navigator)) return reject(new Error("no-geo"));
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => reject(new Error("denied")),
          { enableHighAccuracy: true, timeout: 10_000 },
        );
      }),
    [],
  );

  const stopScanner = useCallback(async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) {
      try {
        await s.stop();
        s.clear();
      } catch {
        /* already stopped */
      }
    }
  }, []);

  const submit = useCallback(
    async (token: string) => {
      if (lockRef.current) return;
      lockRef.current = true;
      await stopScanner();
      setStatus({ kind: "marking" });

      let coords: { lat: number; lng: number };
      try {
        coords = await getCoords();
        // Resolve a readable place for display (non-blocking).
        reverseGeocode(coords.lat, coords.lng).then((a) => {
          if (a) setLocationLabel(a.full);
        });
      } catch {
        setStatus({
          kind: "error",
          message:
            "Location is needed to prove you're in the room. Allow location access and try again.",
        });
        return;
      }

      let deviceHash: string | undefined;
      try {
        deviceHash = await getDeviceHash();
      } catch {
        /* degrade: skip the device layer if it can't be computed */
      }

      try {
        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            lat: coords.lat,
            lng: coords.lng,
            deviceHash,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setStatus({
            kind: "success",
            course: data.course ?? "",
            already: Boolean(data.alreadyMarked),
          });
        } else {
          setStatus({ kind: "error", message: data.error ?? "Couldn't mark attendance." });
        }
      } catch {
        setStatus({
          kind: "error",
          message: "Network problem. Check your connection and try again.",
        });
      }
    },
    [getCoords, stopScanner],
  );

  const startScanner = useCallback(async () => {
    lockRef.current = false;
    setStatus({ kind: "starting" });
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(READER_ID, { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          // No fixed qrbox: scan the whole frame so the code is read wherever
          // it lands, instead of forcing it into a small centred square.
          aspectRatio: 1,
        },
        (decoded) => void submit(decoded),
        () => {},
      );
      setStatus({ kind: "scanning" });
    } catch {
      setStatus({
        kind: "error",
        message: "Couldn't start the camera. Allow camera access and try again.",
      });
    }
  }, [submit]);

  useEffect(() => {
    startScanner();
    return () => {
      void stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showReader = status.kind === "starting" || status.kind === "scanning";

  return (
    <div className="mx-auto max-w-md">
      <Link
        href="/student"
        className="mb-6 inline-block text-sm text-muted transition-colors hover:text-fg"
      >
        ← Home
      </Link>

      <h1 className="font-display text-2xl font-semibold">Scan the beacon</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        Point your camera at the code on the lecturer&apos;s screen.
      </p>

      <div className="relative aspect-square overflow-hidden rounded-3xl border border-hairline bg-surface">
        {/* html5-qrcode mounts the camera stream here */}
        <div id={READER_ID} className={showReader ? "h-full w-full" : "hidden"} />

        {showReader && status.kind === "starting" && (
          <p className="absolute inset-x-0 bottom-6 text-center text-sm text-muted">
            Starting camera…
          </p>
        )}

        <AnimatePresence>
          {status.kind === "marking" && (
            <motion.div
              className="absolute inset-0 grid place-items-center bg-ink/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="animate-pulse text-sm text-muted">Marking you present…</p>
            </motion.div>
          )}

          {status.kind === "success" && (
            <motion.div
              className="absolute inset-0 grid place-items-center bg-ink/90 p-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex flex-col items-center">
                <SuccessCheck />
                <p className="mt-5 font-display text-xl font-semibold text-success">
                  {status.already ? "Already marked" : "You're marked present"}
                </p>
                {status.course && (
                  <p className="mt-1 text-sm text-muted">{status.course}</p>
                )}
                {locationLabel && (
                  <p className="mt-3 text-xs text-faint">📍 {locationLabel}</p>
                )}
              </div>
            </motion.div>
          )}

          {status.kind === "error" && (
            <motion.div
              className="absolute inset-0 grid place-items-center bg-ink/90 p-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div>
                <p className="text-3xl">⚠</p>
                <p className="mt-4 text-sm text-alert">{status.message}</p>
                {locationLabel && (
                  <p className="mt-3 text-xs text-faint">
                    📍 Your location: {locationLabel}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-6">
        {status.kind === "success" ? (
          <Link href="/student" className="block">
            <Button size="lg" className="w-full">
              Done
            </Button>
          </Link>
        ) : status.kind === "error" ? (
          <Button size="lg" className="w-full" onClick={startScanner}>
            Try again
          </Button>
        ) : null}
      </div>
    </div>
  );
}
