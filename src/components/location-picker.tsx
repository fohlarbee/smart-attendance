"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type {
  Map as LMap,
  Marker as LMarker,
  Circle as LCircle,
} from "leaflet";

/**
 * Interactive classroom picker. Works on any device — a desktop lecturer with no
 * GPS can drag/click the pin onto their building. Defaults to satellite imagery
 * (with a labels overlay) because OpenStreetMap's building/landmark coverage is
 * patchy in some regions, whereas satellite shows real rooftops everywhere.
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

  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const startLat = lat ?? 9.082;
      const startLng = lng ?? 8.6753;

      const map = L.map(containerRef.current).setView(
        [startLat, startLng],
        lat != null ? 18 : 6,
      );

      // Base layers.
      const satellite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 20, attribution: "Tiles © Esri" },
      );
      const streets = L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        { maxZoom: 19, attribution: "© OpenStreetMap contributors" },
      );
      // Place/road labels drawn on top of the satellite imagery.
      const labels = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 20, attribution: "Labels © Esri" },
      );

      satellite.addTo(map);
      labels.addTo(map);

      L.control
        .layers(
          { Satellite: satellite, Streets: streets },
          { Labels: labels },
          { collapsed: true },
        )
        .addTo(map);

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

      const commit = (la: number, ln: number, zoomIn = false) => {
        marker.setLatLng([la, ln]);
        circle.setLatLng([la, ln]);
        if (zoomIn && map.getZoom() < 17) map.setView([la, ln], 18);
        onChangeRef.current(la, ln);
      };
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        commit(p.lat, p.lng);
      });
      map.on("click", (e) => commit(e.latlng.lat, e.latlng.lng, true));

      mapRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;

      // Robustly fix the classic "gray / partial tiles" problem: remeasure when
      // the container gets its real size and on any later resize.
      ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(containerRef.current);
      setTimeout(() => map.invalidateSize(), 200);
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lat == null || lng == null || !mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([lat, lng]);
    circleRef.current?.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng], 18);
  }, [lat, lng]);

  useEffect(() => {
    circleRef.current?.setRadius(radius);
  }, [radius]);

  return (
    <div
      ref={containerRef}
      className="h-72 w-full overflow-hidden rounded-xl border border-hairline"
    />
  );
}
