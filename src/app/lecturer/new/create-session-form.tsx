"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { CAMPAIGN, GEO } from "@/lib/constants";
import { reverseGeocode, mapLink, type GeoAddress } from "@/lib/geocode";
import { getAccuratePosition } from "@/lib/geolocation";
import { LocationPicker } from "@/components/location-picker";

type Center = { lat: number; lng: number };

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
  const [center, setCenter] = useState<Center | null>(null);
  // GPS accuracy in metres; null means the pin was placed manually (precise).
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [address, setAddress] = useState<GeoAddress | null>(null);
  const [radius, setRadius] = useState<number>(CAMPAIGN.DEFAULT_RADIUS_M);
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve a readable address whenever the centre moves.
  useEffect(() => {
    if (!center) return;
    let cancelled = false;
    setAddress(null);
    reverseGeocode(center.lat, center.lng).then((a) => {
      if (!cancelled) setAddress(a);
    });
    return () => {
      cancelled = true;
    };
  }, [center]);

  async function useMyLocation() {
    setLocating(true);
    setLocError(null);
    try {
      const fix = await getAccuratePosition();
      setCenter({ lat: fix.lat, lng: fix.lng });
      setAccuracy(fix.accuracy);
    } catch (e) {
      const denied = (e as GeolocationPositionError)?.code === 1;
      setLocError(
        denied
          ? "Location permission was denied. Allow it, or place the pin on the map."
          : "Couldn't get a location fix. Place the pin on the map instead.",
      );
    } finally {
      setLocating(false);
    }
  }

  // Dragging/clicking the map is a deliberate, precise choice.
  function handlePick(lat: number, lng: number) {
    setCenter({ lat, lng });
    setAccuracy(null);
  }

  async function start() {
    if (!center) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          centreLat: center.lat,
          centreLng: center.lng,
          centreAccuracy: accuracy != null ? Math.round(accuracy) : 0,
          radiusMetres: radius,
          label,
          address: address?.full ?? null,
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

  const poorGps = accuracy != null && accuracy > GEO.POOR_ACCURACY_M;

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
      <div className="space-y-3 rounded-2xl border border-hairline bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Classroom location</p>
            <p className="text-xs text-muted">
              Use your location on a phone, or drag the pin to your building.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={useMyLocation}
            type="button"
            disabled={locating}
          >
            {locating ? "Locating…" : center ? "Recapture" : "Use my location"}
          </Button>
        </div>

        <LocationPicker
          lat={center?.lat ?? null}
          lng={center?.lng ?? null}
          radius={radius}
          onChange={handlePick}
        />

        <div className="text-sm">
          {!center && !locError && (
            <p className="text-faint">
              Tap the map to drop the classroom pin, or use your location.
            </p>
          )}
          {locError && <p className="text-alert">{locError}</p>}
          {center && (
            <div className="space-y-2">
              <p className="font-mono text-success">
                ✓ {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
                <span className="text-faint">
                  {" "}
                  {accuracy != null
                    ? `(GPS ±${Math.round(accuracy)}m)`
                    : "(pinned on map)"}
                </span>
              </p>
              {poorGps && (
                <p className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
                  This GPS fix is only accurate to ±{Math.round(accuracy!)}m. Drag
                  the pin to the exact building on the map, or recapture on a phone
                  with GPS near a window.
                </p>
              )}
              {address && (
                <div className="rounded-lg border border-hairline bg-ink px-3 py-2">
                  <p className="text-sm text-fg">{address.full}</p>
                  {(address.state || address.country) && (
                    <p className="mt-0.5 text-xs text-muted">
                      {[address.state, address.country].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              )}
              <a
                href={mapLink(center.lat, center.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs text-amber hover:underline"
              >
                View exact point on map ↗
              </a>
            </div>
          )}
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
        disabled={!center || submitting}
      >
        {submitting ? "Starting…" : "Start session"}
      </Button>
    </div>
  );
}
