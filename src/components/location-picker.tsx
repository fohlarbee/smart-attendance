"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LMap, Marker as LMarker, Circle as LCircle } from "leaflet";

/**
 * Interactive classroom picker. Works on any device — a desktop lecturer with no
 * GPS can drag/click the pin onto their building, giving a precise centre that
 * doesn't depend on device location at all.
 */
export function LocationPicker({
  lat,
  lng,
  radius,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  radius: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const markerRef = useRef<LMarker | null>(null);
  const circleRef = useRef<LCircle | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Init once.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const startLat = lat ?? 9.082;
      const startLng = lng ?? 8.6753; // Nigeria-ish default
      const map = L.map(containerRef.current, { attributionControl: false }).setView(
        [startLat, startLng],
        lat != null ? 17 : 6,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: '<div style="width:16px;height:16px;border-radius:50%;background:#f5a524;border:3px solid #0b0f14;box-shadow:0 0 0 2px #f5a524"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      const marker = L.marker([startLat, startLng], {
        draggable: true,
        icon,
      }).addTo(map);
      const circle = L.circle([startLat, startLng], {
        radius,
        color: "#f5a524",
        weight: 1,
        fillColor: "#f5a524",
        fillOpacity: 0.12,
      }).addTo(map);

      const commit = (la: number, ln: number) => {
        marker.setLatLng([la, ln]);
        circle.setLatLng([la, ln]);
        onChangeRef.current(la, ln);
      };
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        commit(p.lat, p.lng);
      });
      map.on("click", (e) => commit(e.latlng.lat, e.latlng.lng));

      mapRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;
      // Container starts hidden/zero-size sometimes; nudge Leaflet to remeasure.
      setTimeout(() => map.invalidateSize(), 120);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter when the parent sets coordinates (e.g. "Use my location").
  useEffect(() => {
    if (lat == null || lng == null || !mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([lat, lng]);
    circleRef.current?.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng], 17);
  }, [lat, lng]);

  // Keep the coverage circle in sync with the radius slider.
  useEffect(() => {
    circleRef.current?.setRadius(radius);
  }, [radius]);

  return (
    <div
      ref={containerRef}
      className="h-64 w-full overflow-hidden rounded-xl border border-hairline"
    />
  );
}
