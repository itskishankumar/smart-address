import type { Coordinates, SmartAddress, MapProvider } from "../types.js";
import { normalizeYandex } from "../normalizers/yandex.js";

export async function reverseGeocodeYandex(
  coords: Coordinates,
  provider: MapProvider,
  apiKey: string,
): Promise<SmartAddress> {
  const url = `https://geocode-maps.yandex.ru/1.x/?geocode=${coords.lng},${coords.lat}&apikey=${apiKey}&format=json&lang=en_US`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[smart-address:yandex] HTTP error: ${res.status}`);
    throw new Error(`Yandex Geocoder error: ${res.status}`);
  }

  const data = await res.json();

  return normalizeYandex(data, coords, provider);
}
