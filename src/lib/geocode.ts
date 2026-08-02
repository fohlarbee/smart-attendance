// Client-side reverse geocoding: lat/lng -> human-readable place.
//
// Uses OpenStreetMap Nominatim, which resolves to street/neighbourhood level
// where the map data exists (BigDataCloud's free tier only returns city level).
// It is best-effort and non-blocking: on any failure it returns null and the UI
// simply omits the label. Accuracy of the *text* is bounded by two things:
//   1. the accuracy of the coordinates passed in (a poor GPS fix -> vague area), and
//   2. OpenStreetMap's data coverage for the area (sparser in some regions).

export type GeoAddress = {
  country?: string;
  state?: string;
  city?: string;
  full: string; // detailed, most-specific-first line
};

type NominatimAddress = {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  country?: string;
};

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<GeoAddress | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      display_name?: string;
      address?: NominatimAddress;
    };
    const a = data.address ?? {};

    const city = a.city || a.town || a.village || a.county;
    const street = a.road
      ? a.house_number
        ? `${a.house_number} ${a.road}`
        : a.road
      : undefined;

    const parts = [
      street,
      a.neighbourhood || a.suburb,
      city,
      a.state,
      a.country,
    ].filter(Boolean) as string[];

    const full =
      [...new Set(parts)].join(", ") ||
      data.display_name ||
      `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    return { country: a.country, state: a.state, city, full };
  } catch {
    return null;
  }
}

/** A map link to the exact coordinates — always precise, regardless of address text. */
export function mapLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
