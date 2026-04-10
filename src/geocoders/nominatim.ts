import type { Coordinates, SmartAddress, MapProvider } from "../types";
import { normalizeNominatim } from "../normalizers/nominatim";

const LOG = "[smart-address:nominatim]";

export async function reverseGeocodeNominatim(
  coords: Coordinates,
  provider: MapProvider,
): Promise<SmartAddress> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&addressdetails=1`;
  console.log(`${LOG} Reverse geocode: GET ${url}`);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "SmartAddress/1.0 (demo)",
      "Accept-Language": "en",
    },
  });

  console.log(`${LOG} Response: ${res.status} ${res.statusText}`);
  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
  const data = await res.json();

  if (data.error) {
    console.error(`${LOG} API error:`, data.error);
    throw new Error(`Nominatim: ${data.error}`);
  }

  console.log(`${LOG} Raw address:`, data.address);
  const result = normalizeNominatim(data, coords, provider);
  console.log(`${LOG} Normalized:`, result);
  return result;
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
    console.log(
      `${LOG} Using wide region bias: ±${offset}° around ${coords.lat.toFixed(2)},${coords.lng.toFixed(2)}`,
    );
  }
  console.log(`${LOG} Forward geocode: GET ${url}`);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "SmartAddress/1.0 (demo)",
      "Accept-Language": "en",
    },
  });

  console.log(`${LOG} Response: ${res.status} ${res.statusText}`);
  if (!res.ok) throw new Error(`Nominatim search error: ${res.status}`);
  const data = await res.json();

  if (!data.length) {
    console.warn(
      `${LOG} No results for "${placeName}" — falling back to reverse geocode`,
    );
    if (coords) return reverseGeocodeNominatim(coords, provider);
    throw new Error(`Nominatim: no results for "${placeName}"`);
  }

  const best = data[0];
  const resolvedCoords = {
    lat: parseFloat(best.lat),
    lng: parseFloat(best.lon),
  };
  console.log(
    `${LOG} Forward geocode resolved to: "${best.display_name}" at ${resolvedCoords.lat},${resolvedCoords.lng}`,
  );

  // Forward search results often have better address data than reverse,
  // but use reverse on the resolved coords if the forward result is sparse
  if (best.address && Object.keys(best.address).length > 3) {
    console.log(`${LOG} Using forward result directly (rich address data)`);
    const result = normalizeNominatim(best, resolvedCoords, provider);
    console.log(`${LOG} Normalized:`, result);
    return result;
  }

  // Sparse forward result — reverse geocode the exact coordinates
  console.log(
    `${LOG} Sparse forward result — reverse geocoding resolved coordinates...`,
  );
  return reverseGeocodeNominatim(resolvedCoords, provider);
}
