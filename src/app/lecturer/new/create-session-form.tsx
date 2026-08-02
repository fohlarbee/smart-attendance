"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { CAMPAIGN } from "@/lib/constants";

type Coords = { lat: number; lng: number; accuracy: number };
type LocState =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "located"; coords: Coords }
  | { kind: "error"; message: string };

export function CreateSessionForm({
  courseId,
  courseCode,
  courseTitle,
}: {
  courseId: string;
  courseCode: string;
  courseTitle: string;
}) {
  const router = useRouter();
  const [loc, setLoc] = useState<LocState>({ kind: "idle" });
  const [radius, setRadius] = useState<number>(CAMPAIGN.DEFAULT_RADIUS_M);
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function captureLocation() {
    if (!("geolocation" in navigator)) {
      setLoc({ kind: "error", message: "This device can't share its location." });
      return;
    }
    setLoc({ kind: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLoc({
          kind: "located",
          coords: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          },
        }),
      (err) =>
        setLoc({
          kind: "error",
          message:
            err.code === err.PERMISSION_DENIED
              ? "Location permission was denied. Allow it to set the classroom."
              : "Couldn't get a location fix. Try again near a window.",
        }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  async function start() {
    if (loc.kind !== "located") return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          centreLat: loc.coords.lat,
          centreLng: loc.coords.lng,
          radiusMetres: radius,
          label,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't start the session.");
      router.push(`/lecturer/session/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-wide text-amber">
          {courseCode}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold">{courseTitle}</h1>
        <p className="mt-1 text-sm text-muted">
          Set the classroom, then start the beacon.
        </p>
      </div>

      {/* Location */}
      <div className="rounded-2xl border border-hairline bg-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Classroom location</p>
            <p className="text-xs text-muted">
              Students must be within range to be marked present.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={captureLocation} type="button">
            {loc.kind === "located" ? "Recapture" : "Use my location"}
          </Button>
        </div>

        <div className="mt-4 text-sm">
          {loc.kind === "idle" && (
            <p className="text-faint">No location captured yet.</p>
          )}
          {loc.kind === "locating" && (
            <p className="text-muted">Getting your location…</p>
          )}
          {loc.kind === "located" && (
            <p className="font-mono text-success">
              ✓ {loc.coords.lat.toFixed(5)}, {loc.coords.lng.toFixed(5)}
              <span className="text-faint">
                {" "}
                (±{Math.round(loc.coords.accuracy)}m)
              </span>
            </p>
          )}
          {loc.kind === "error" && <p className="text-alert">{loc.message}</p>}
        </div>
      </div>

      {/* Radius */}
      <div className="rounded-2xl border border-hairline bg-surface p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Allowed radius</p>
          <span className="font-mono text-sm text-amber">{radius} m</span>
        </div>
        <input
          type="range"
          min={CAMPAIGN.MIN_RADIUS_M}
          max={CAMPAIGN.MAX_RADIUS_M}
          step={5}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="mt-4 w-full accent-amber"
          aria-label="Allowed radius in metres"
        />
        <div className="mt-1 flex justify-between font-mono text-[11px] text-faint">
          <span>{CAMPAIGN.MIN_RADIUS_M} m</span>
          <span>{CAMPAIGN.MAX_RADIUS_M} m</span>
        </div>
      </div>

      {/* Label */}
      <div className="rounded-2xl border border-hairline bg-surface p-5">
        <Label htmlFor="label">Session label (optional)</Label>
        <Input
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Week 6 lecture"
          maxLength={80}
        />
      </div>

      {error && <p className="text-sm text-alert">{error}</p>}

      <Button
        size="lg"
        className="w-full"
        onClick={start}
        disabled={loc.kind !== "located" || submitting}
      >
        {submitting ? "Starting…" : "Start session"}
      </Button>
    </div>
  );
}
