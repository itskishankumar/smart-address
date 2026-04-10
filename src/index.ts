import type {
  SmartAddress,
  SmartAddressConfig,
  MapProvider,
  ParsedMapUrl,
} from "./types";
import { detectParser } from "./parsers";
import { expandUrl, isShortUrl } from "./expander";
import { geocode } from "./geocoders";
export type { SmartAddress, SmartAddressConfig, MapProvider, ParsedMapUrl };

const MAP_URL_PATTERN =
  /^https?:\/\/(maps\.|www\.)?(google|apple|openstreetmap|osm|bing|here|yandex|goo\.gl|maps\.app)/i;

export function isMapUrl(text: string): boolean {
  if (!text || !text.startsWith("http")) return false;
  try {
    const u = new URL(text.trim());
    const h = u.hostname;
    const result =
      MAP_URL_PATTERN.test(text) ||
      (h.includes("google") &&
        (u.pathname.includes("/maps") || h.includes("maps."))) ||
      h === "goo.gl" ||
      h === "maps.app.goo.gl" ||
      h === "maps.apple.com" ||
      h === "maps.apple" ||
      h.includes("openstreetmap.org") ||
      h === "osm.org" ||
      h === "binged.it" ||
      (h.includes("bing.com") && u.pathname.includes("/maps")) ||
      h.includes("here.com") ||
      (h.includes("yandex") && u.pathname.includes("/maps"));
    return result;
  } catch {
    return false;
  }
}

export async function resolveMapUrl(
  url: string,
  config?: SmartAddressConfig,
): Promise<SmartAddress> {
  let resolvedUrl = url.trim();

  // Step 1: Expand short URLs
  if (isShortUrl(resolvedUrl)) {
    resolvedUrl = await expandUrl(resolvedUrl, config?.expandUrl);
  }

  // Step 2: Detect provider and parse
  const parser = detectParser(resolvedUrl);
  if (!parser) {
    console.error(`[smart-address] [Step 2] No parser matched`);
    throw new Error(
      `Unsupported map URL: could not detect provider for "${resolvedUrl}"`,
    );
  }

  const parsed = parser.parse(resolvedUrl);
  if (!parsed) {
    console.error(`[smart-address] [Step 2] Parser returned null`);
    throw new Error(`Could not parse URL: "${resolvedUrl}"`);
  }

  const { coordinates, placeName, embeddedAddress, pinCoordinates } = parsed;

  // Use pin coordinates (from data param) over viewport coordinates
  const bestCoords = pinCoordinates || coordinates;

  if (!bestCoords && !embeddedAddress && !placeName) {
    console.error(`[smart-address] [Step 2] Nothing to geocode`);
    throw new Error(`Could not extract location from URL: "${resolvedUrl}"`);
  }

  if (
    bestCoords &&
    (bestCoords.lat < -90 ||
      bestCoords.lat > 90 ||
      bestCoords.lng < -180 ||
      bestCoords.lng > 180)
  ) {
    console.error(`[smart-address] [Step 2] Invalid coordinates:`, bestCoords);
    throw new Error(
      `Invalid coordinates: lat=${bestCoords.lat}, lng=${bestCoords.lng}`,
    );
  }

  // Step 3: Geocode — pick the best strategy based on what we extracted
  //
  // Priority:
  //   1. Embedded address from URL (e.g. Google's !2s param) → forward geocode the exact address string
  //   2. Pin coordinates from data param → reverse geocode the exact pin
  //   3. Place name → forward geocode
  //   4. Viewport coordinates → reverse geocode (least accurate)

  let geocodeAddress: string | undefined;
  let geocodeCoords = bestCoords;

  if (embeddedAddress) {
    geocodeAddress = embeddedAddress;
  } else if (pinCoordinates) {
    geocodeCoords = pinCoordinates;
  } else if (placeName) {
    geocodeAddress = placeName;
  }

  const address = await geocode(
    geocodeCoords,
    parser.provider,
    config,
    geocodeAddress,
  );

  // If the geocoder didn't return a building name but we have a place name from the URL, use it
  if (!address.buildingName && placeName) {
    address.buildingName = placeName;
  }

  return address;
}

export function detectProvider(url: string): MapProvider | null {
  try {
    const parser = detectParser(url.trim());
    return parser?.provider ?? null;
  } catch {
    return null;
  }
}
