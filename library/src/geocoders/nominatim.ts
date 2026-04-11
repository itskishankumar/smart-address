import type { Coordinates, SmartAddress, MapProvider } from "../types.js";
import { normalizeNominatim } from "../normalizers/nominatim.js";

export async function reverseGeocodeNominatim(
  coords: Coordinates,
  provider: MapProvider,
): Promise<SmartAddress> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&addressdetails=1`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "SmartAddress/1.0 (demo)",
      "Accept-Language": "en",
    },
  });

  if (!res.ok) {
    console.error(`[smart-address:nominatim] HTTP error: ${res.status}`);
    throw new Error(`Nominatim error: ${res.status}`);
  }
  const data = await res.json();

  if (data.error) {
    console.error(`[smart-address:nominatim] API error:`, data.error);
    throw new Error(`Nominatim: ${data.error}`);
  }

  return normalizeNominatim(data, coords, provider);
}

export async function forwardGeocodeNominatim(
  placeName: string,
  coords: Coordinates | null,
  provider: MapProvider,
): Promise<SmartAddress> {
  // Wide region bias to disambiguate non-unique places (Starbucks, Main Street, etc.)
  // ~50km box — survives panning but keeps us in the right city
  let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&addressdetails=1&limit=1`;
  if (coords) {
    const offset = 0.5;
    url += `&viewbox=${coords.lng - offset},${coords.lat + offset},${coords.lng + offset},${coords.lat - offset}&bounded=0`;
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent": "SmartAddress/1.0 (demo)",
      "Accept-Language": "en",
    },
  });

  if (!res.ok) {
    console.error(`[smart-address:nominatim] Search HTTP error: ${res.status}`);
    throw new Error(`Nominatim search error: ${res.status}`);
  }
  const data = await res.json();

  if (!data.length) {
    if (coords) return reverseGeocodeNominatim(coords, provider);
    throw new Error(`Nominatim: no results for "${placeName}"`);
  }

  const best = data[0];
  const resolvedCoords = {
    lat: parseFloat(best.lat),
    lng: parseFloat(best.lon),
  };

  // Forward search results often have better address data than reverse,
  // but use reverse on the resolved coords if the forward result is sparse
  if (best.address && Object.keys(best.address).length > 3) {
    return normalizeNominatim(best, resolvedCoords, provider);
  }

  // Sparse forward result — reverse geocode the exact coordinates
  return reverseGeocodeNominatim(resolvedCoords, provider);
}
