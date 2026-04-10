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

const LOG = "[smart-address]";

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
    console.log(`${LOG} isMapUrl → ${result}`);
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
  console.group(`${LOG} resolveMapUrl`);
  console.log(`${LOG} Input URL:`, resolvedUrl);

  // Step 1: Expand short URLs
  if (isShortUrl(resolvedUrl)) {
    console.log(`${LOG} [Step 1] Short URL detected, expanding...`);
    const original = resolvedUrl;
    resolvedUrl = await expandUrl(resolvedUrl, config?.expandUrl);
    console.log(`${LOG} [Step 1] Expanded: "${original}" → "${resolvedUrl}"`);
  } else {
    console.log(`${LOG} [Step 1] Not a short URL, skipping`);
  }

  // Step 2: Detect provider and parse
  const parser = detectParser(resolvedUrl);
  if (!parser) {
    console.error(`${LOG} [Step 2] No parser matched`);
    console.groupEnd();
    throw new Error(
      `Unsupported map URL: could not detect provider for "${resolvedUrl}"`,
    );
  }

  const parsed = parser.parse(resolvedUrl);
  if (!parsed) {
    console.error(`${LOG} [Step 2] Parser returned null`);
    console.groupEnd();
    throw new Error(`Could not parse URL: "${resolvedUrl}"`);
  }

  const { coordinates, placeName, embeddedAddress, pinCoordinates } = parsed;

  console.log(`${LOG} [Step 2] Parsed:`, {
    provider: parser.provider,
    embeddedAddress: embeddedAddress || "(none)",
    pinCoordinates: pinCoordinates || "(none)",
    placeName: placeName || "(none)",
    viewportCoords:
      coordinates && !pinCoordinates ? coordinates : "(using pin coords)",
  });

  // Use pin coordinates (from data param) over viewport coordinates
  const bestCoords = pinCoordinates || coordinates;

  if (!bestCoords && !embeddedAddress && !placeName) {
    console.error(`${LOG} [Step 2] Nothing to geocode`);
    console.groupEnd();
    throw new Error(`Could not extract location from URL: "${resolvedUrl}"`);
  }

  if (
    bestCoords &&
    (bestCoords.lat < -90 ||
      bestCoords.lat > 90 ||
      bestCoords.lng < -180 ||
      bestCoords.lng > 180)
  ) {
    console.error(`${LOG} [Step 2] Invalid coordinates:`, bestCoords);
    console.groupEnd();
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

  let strategy: string;
  let geocodeAddress: string | undefined;
  let geocodeCoords = bestCoords;

  if (embeddedAddress) {
    strategy = "EMBEDDED_ADDRESS";
    geocodeAddress = embeddedAddress;
    console.log(
      `${LOG} [Step 3] Strategy: EMBEDDED_ADDRESS — geocoding "${embeddedAddress}"`,
    );
  } else if (pinCoordinates) {
    strategy = "PIN_COORDINATES";
    geocodeCoords = pinCoordinates;
    console.log(
      `${LOG} [Step 3] Strategy: PIN_COORDINATES — reverse geocoding exact pin ${pinCoordinates.lat},${pinCoordinates.lng}`,
    );
  } else if (placeName) {
    strategy = "PLACE_NAME";
    geocodeAddress = placeName;
    console.log(
      `${LOG} [Step 3] Strategy: PLACE_NAME — forward geocoding "${placeName}"`,
    );
  } else {
    strategy = "VIEWPORT_COORDS";
    console.log(
      `${LOG} [Step 3] Strategy: VIEWPORT_COORDS — reverse geocoding viewport center ${bestCoords!.lat},${bestCoords!.lng}`,
    );
  }

  const address = await geocode(
    geocodeCoords,
    parser.provider,
    config,
    geocodeAddress,
  );

  // If the geocoder didn't return a building name but we have a place name from the URL, use it
  if (!address.buildingName && placeName) {
    console.log(
      `${LOG} [Step 3] Geocoder returned no buildingName — using URL place name: "${placeName}"`,
    );
    address.buildingName = placeName;
  }

  console.log(
    `${LOG} [Step 3] Done. Strategy: ${strategy}, Geocoder: "${address.geocoder}"`,
  );
  console.log(`${LOG} Final address:`, {
    street1: address.street1,
    street2: address.street2,
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    countryName: address.countryName,
    formatted: address.formatted,
  });
  console.groupEnd();

  return address;
}

export function detectProvider(url: string): MapProvider | null {
  try {
    const parser = detectParser(url.trim());
    const result = parser?.provider ?? null;
    console.log(`${LOG} detectProvider → ${result}`);
    return result;
  } catch {
    return null;
  }
}
