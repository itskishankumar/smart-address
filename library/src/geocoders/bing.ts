import type { Coordinates, SmartAddress, MapProvider } from "../types.js";
import { normalizeBing } from "../normalizers/bing.js";

export async function reverseGeocodeBing(
  coords: Coordinates,
  provider: MapProvider,
  apiKey: string,
): Promise<SmartAddress> {
  const url = `https://dev.virtualearth.net/REST/v1/Locations/${coords.lat},${coords.lng}?key=${apiKey}&o=json`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[smart-address:bing] HTTP error: ${res.status}`);
    throw new Error(`Bing Maps error: ${res.status}`);
  }

  const data = await res.json();

  if (data.statusCode !== 200) {
    console.error(`[smart-address:bing] API error: ${data.statusDescription || "Unknown error"}`);
    throw new Error(`Bing Maps: ${data.statusDescription || "Unknown error"}`);
  }

  return normalizeBing(data, coords, provider);
}
