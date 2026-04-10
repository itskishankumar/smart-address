import type { Coordinates, SmartAddress, MapProvider } from "../types";
import { normalizeGoogle } from "../normalizers/google";

export async function reverseGeocodeGoogle(
  coords: Coordinates,
  provider: MapProvider,
  apiKey: string,
): Promise<SmartAddress> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[smart-address:google] HTTP error: ${res.status}`);
    throw new Error(`Google Geocoding error: ${res.status}`);
  }

  const data = await res.json();

  if (data.status !== "OK") {
    console.error(
      `[smart-address:google] API error: ${data.status} — ${data.error_message || ""}`,
    );
    throw new Error(
      `Google Geocoding: ${data.status} - ${data.error_message || ""}`,
    );
  }

  return normalizeGoogle(data, coords, provider);
}

export async function forwardGeocodeGoogle(
  placeName: string,
  coords: Coordinates | null,
  provider: MapProvider,
  apiKey: string,
): Promise<SmartAddress> {
  // Use a WIDE region bias (not tight bounds) to disambiguate non-unique places.
  // Tight bounds broke when users panned. Wide bias (~50km) keeps us in the right
  // city/region without snapping to the exact viewport position.
  let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(placeName)}&key=${apiKey}`;
  if (coords) {
    const offset = 0.5; // ~50km — wide enough to survive panning, narrow enough to disambiguate cities
    url += `&bounds=${coords.lat - offset},${coords.lng - offset}|${coords.lat + offset},${coords.lng + offset}`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[smart-address:google] Forward geocode HTTP error: ${res.status}`);
    throw new Error(`Google Geocoding error: ${res.status}`);
  }

  const data = await res.json();

  if (data.status !== "OK" || !data.results?.length) {
    if (coords) return reverseGeocodeGoogle(coords, provider, apiKey);
    console.error(`[smart-address:google] No results for "${placeName}"`);
    throw new Error(`Google Geocoding: no results for "${placeName}"`);
  }

  const first = data.results[0];
  const resolvedCoords = first.geometry?.location
    ? { lat: first.geometry.location.lat, lng: first.geometry.location.lng }
    : coords || { lat: 0, lng: 0 };

  // Forward geocode often returns fewer address components (missing postal code, etc.)
  // Use the resolved coordinates to do a reverse geocode for complete address details
  return reverseGeocodeGoogle(resolvedCoords, provider, apiKey);
}
