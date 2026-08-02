// Geofence math for the location check (SPEC.md §6).

const EARTH_RADIUS_M = 6_371_000;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two lat/lng points, in metres (Haversine). */
export function haversineMetres(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** True when the student's coordinates fall within `radiusMetres` of the session centre. */
export function isInsideGeofence(
  centreLat: number,
  centreLng: number,
  radiusMetres: number,
  lat: number,
  lng: number,
): boolean {
  return haversineMetres(centreLat, centreLng, lat, lng) <= radiusMetres;
}
