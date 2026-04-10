import type { Coordinates, SmartAddress, MapProvider } from "../types";
import { normalizeGoogle } from "../normalizers/google";

const LOG = "[smart-address:google]";

export async function reverseGeocodeGoogle(
  coords: Coordinates,
  provider: MapProvider,
  apiKey: string,
): Promise<SmartAddress> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${apiKey}`;
  console.log(
    `${LOG} Reverse geocode: GET ${url.replace(apiKey, apiKey.substring(0, 8) + "...")}`,
  );

  const res = await fetch(url);
  console.log(`${LOG} Response: ${res.status} ${res.statusText}`);
  if (!res.ok) throw new Error(`Google Geocoding error: ${res.status}`);

  const data = await res.json();
  console.log(
    `${LOG} API status: ${data.status}, results: ${data.results?.length || 0}`,
  );

  if (data.status !== "OK") {
    console.error(
      `${LOG} API error: ${data.status} — ${data.error_message || ""}`,
    );
    throw new Error(
      `Google Geocoding: ${data.status} - ${data.error_message || ""}`,
    );
  }

  const first = data.results?.[0];
  console.log(`${LOG} First result: "${first?.formatted_address}"`);
  console.log(
    `${LOG} Components:`,
    first?.address_components?.map((c: any) => ({
      types: c.types,
      long: c.long_name,
    })),
  );

  const result = normalizeGoogle(data, coords, provider);
  console.log(`${LOG} Normalized:`, result);
  return result;
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
    console.log(
      `${LOG} Using wide region bias: ±${offset}° around ${coords.lat.toFixed(2)},${coords.lng.toFixed(2)}`,
    );
  }
  console.log(
    `${LOG} Forward geocode: GET ${url.replace(apiKey, apiKey.substring(0, 8) + "...")}`,
  );

  const res = await fetch(url);
  console.log(`${LOG} Response: ${res.status} ${res.statusText}`);
  if (!res.ok) throw new Error(`Google Geocoding error: ${res.status}`);

  const data = await res.json();
  console.log(
    `${LOG} API status: ${data.status}, results: ${data.results?.length || 0}`,
  );

  if (data.status !== "OK" || !data.results?.length) {
    console.warn(
      `${LOG} Forward geocode failed for "${placeName}" — falling back to reverse`,
    );
    if (coords) return reverseGeocodeGoogle(coords, provider, apiKey);
    throw new Error(`Google Geocoding: no results for "${placeName}"`);
  }

  const first = data.results[0];
  const resolvedCoords = first.geometry?.location
    ? { lat: first.geometry.location.lat, lng: first.geometry.location.lng }
    : coords || { lat: 0, lng: 0 };

  console.log(
    `${LOG} Forward geocode resolved to: "${first.formatted_address}" at ${resolvedCoords.lat},${resolvedCoords.lng}`,
  );

  // Forward geocode often returns fewer address components (missing postal code, etc.)
  // Use the resolved coordinates to do a reverse geocode for complete address details
  console.log(
    `${LOG} Using resolved coordinates for reverse geocode to get full address details...`,
  );
  return reverseGeocodeGoogle(resolvedCoords, provider, apiKey);
}
