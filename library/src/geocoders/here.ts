import type { Coordinates, SmartAddress, MapProvider } from "../types.js";
import { normalizeHere } from "../normalizers/here.js";

export async function reverseGeocodeHere(
  coords: Coordinates,
  provider: MapProvider,
  apiKey: string,
): Promise<SmartAddress> {
  const url = `https://revgeocode.search.hereapi.com/v1/revgeocode?at=${coords.lat},${coords.lng}&apiKey=${apiKey}&lang=en`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[smart-address:here] HTTP error: ${res.status}`);
    throw new Error(`HERE Geocoding error: ${res.status}`);
  }

  const data = await res.json();

  return normalizeHere(data, coords, provider);
}
