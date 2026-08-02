// Client-side reverse geocoding: lat/lng -> human-readable place.
// Uses BigDataCloud's free reverse-geocode-client endpoint (no API key, CORS-enabled).
// Note: this resolves to area/locality level, not street/house number.

export type GeoAddress = {
  country?: string;
  state?: string; // principal subdivision
  city?: string;
  full: string; // composed, most-specific-first readable line
};

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<GeoAddress | null> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const d = (await res.json()) as {
      countryName?: string;
      principalSubdivision?: string;
      city?: string;
      locality?: string;
    };

    const country = d.countryName || undefined;
    const state = d.principalSubdivision || undefined;
    const city = d.city || d.locality || undefined;

    const parts = [d.locality, d.city, state, country].filter(Boolean) as string[];
    const full =
      [...new Set(parts)].join(", ") || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    return { country, state, city, full };
  } catch {
    return null;
  }
}
