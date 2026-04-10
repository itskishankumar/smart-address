import type { Coordinates, SmartAddress, MapProvider } from "../types";
import { normalizeBing } from "../normalizers/bing";

const LOG = "[smart-address:bing]";

export async function reverseGeocodeBing(
  coords: Coordinates,
  provider: MapProvider,
  apiKey: string,
): Promise<SmartAddress> {
  const url = `https://dev.virtualearth.net/REST/v1/Locations/${coords.lat},${coords.lng}?key=${apiKey}&o=json`;
  console.log(
    `${LOG} Request: GET ${url.replace(apiKey, apiKey.substring(0, 8) + "...")}`,
  );

  const res = await fetch(url);
  console.log(`${LOG} Response: ${res.status} ${res.statusText}`);
  if (!res.ok) throw new Error(`Bing Maps error: ${res.status}`);

  const data = await res.json();
  console.log(`${LOG} Status code: ${data.statusCode}`);
  console.log(`${LOG} Raw response:`, JSON.stringify(data, null, 2));

  if (data.statusCode !== 200)
    throw new Error(`Bing Maps: ${data.statusDescription || "Unknown error"}`);

  const result = normalizeBing(data, coords, provider);
  console.log(`${LOG} Normalized result:`, result);
  return result;
}
