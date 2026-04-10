import type { Coordinates, SmartAddress, MapProvider } from "../types";
import { normalizeYandex } from "../normalizers/yandex";

const LOG = "[smart-address:yandex]";

export async function reverseGeocodeYandex(
  coords: Coordinates,
  provider: MapProvider,
  apiKey: string,
): Promise<SmartAddress> {
  const url = `https://geocode-maps.yandex.ru/1.x/?geocode=${coords.lng},${coords.lat}&apikey=${apiKey}&format=json&lang=en_US`;
  console.log(
    `${LOG} Request: GET ${url.replace(apiKey, apiKey.substring(0, 8) + "...")}`,
  );

  const res = await fetch(url);
  console.log(`${LOG} Response: ${res.status} ${res.statusText}`);
  if (!res.ok) throw new Error(`Yandex Geocoder error: ${res.status}`);

  const data = await res.json();
  console.log(`${LOG} Raw response:`, JSON.stringify(data, null, 2));

  const result = normalizeYandex(data, coords, provider);
  console.log(`${LOG} Normalized result:`, result);
  return result;
}
