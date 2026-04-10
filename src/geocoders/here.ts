import type { Coordinates, SmartAddress, MapProvider } from "../types";
import { normalizeHere } from "../normalizers/here";

const LOG = "[smart-address:here]";

export async function reverseGeocodeHere(
  coords: Coordinates,
  provider: MapProvider,
  apiKey: string,
): Promise<SmartAddress> {
  const url = `https://revgeocode.search.hereapi.com/v1/revgeocode?at=${coords.lat},${coords.lng}&apiKey=${apiKey}&lang=en`;
  console.log(
    `${LOG} Request: GET ${url.replace(apiKey, apiKey.substring(0, 8) + "...")}`,
  );

  const res = await fetch(url);
  console.log(`${LOG} Response: ${res.status} ${res.statusText}`);
  if (!res.ok) throw new Error(`HERE Geocoding error: ${res.status}`);

  const data = await res.json();
  console.log(`${LOG} Items count: ${data.items?.length || 0}`);
  console.log(`${LOG} Raw response:`, JSON.stringify(data, null, 2));

  const result = normalizeHere(data, coords, provider);
  console.log(`${LOG} Normalized result:`, result);
  return result;
}
