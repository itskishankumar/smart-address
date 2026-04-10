import type { Coordinates, ParsedLocation, UrlParser } from "../types";

const GOOGLE_HOSTS = [
  "google.com",
  "google.co.uk",
  "google.de",
  "google.fr",
  "google.es",
  "google.it",
  "google.ca",
  "google.com.au",
  "google.co.in",
  "google.co.jp",
  "google.com.br",
  "google.ru",
  "google.co.kr",
  "google.nl",
  "google.pl",
];

function isGoogleHost(hostname: string): boolean {
  const h = hostname.replace(/^www\./, "").replace(/^maps\./, "");
  return (
    GOOGLE_HOSTS.some((g) => h === g || h === `maps.${g}`) ||
    h === "goo.gl" ||
    h === "maps.app.goo.gl"
  );
}

/**
 * Parse Google's `data` param which contains the real source of truth:
 *   !2s = address string (URL-encoded)
 *   !3d = latitude (exact pin, not viewport)
 *   !4d = longitude (exact pin, not viewport)
 *   !1s = place CID / ID
 *
 * The data param can contain multiple !3d/!4d pairs — the LAST pair
 * is typically the selected place's coordinates.
 */
function parseDataParam(url: string): {
  address?: string;
  pinCoords?: Coordinates;
} {
  // Extract all !2s address strings
  const addressMatches = url.match(/!2s([^!]+)/g);
  let address: string | undefined;
  if (addressMatches) {
    // Take the first address that looks like an actual address (not an ID)
    for (const m of addressMatches) {
      const raw = m.slice(3); // remove "!2s"
      const decoded = decodeURIComponent(raw).replace(/\+/g, " ");
      // Skip if it looks like a path/ID (e.g. /g/11c4qqgfl5)
      if (!decoded.startsWith("/") && decoded.length > 5) {
        address = decoded;
        break;
      }
    }
  }

  // Extract all !3d/!4d coordinate pairs — last pair = selected place
  const latMatches = [...url.matchAll(/!3d(-?\d+\.?\d*)/g)];
  const lngMatches = [...url.matchAll(/!4d(-?\d+\.?\d*)/g)];
  let pinCoords: Coordinates | undefined;
  if (latMatches.length && lngMatches.length) {
    // Last pair is the selected place
    const lat = parseFloat(latMatches[latMatches.length - 1][1]);
    const lng = parseFloat(lngMatches[lngMatches.length - 1][1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      pinCoords = { lat, lng };
    }
  }

  return { address, pinCoords };
}

/** Extract viewport center from @lat,lng in the path (camera position, NOT the pin) */
function extractViewportCoords(url: string): Coordinates | null {
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch)
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

  const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (llMatch)
    return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };

  return null;
}

/** Extract place name from /place/Name/ path segment */
function extractPlaceName(url: string): string | undefined {
  const match = url.match(/\/place\/([^/@]+)/);
  if (match) {
    const decoded = decodeURIComponent(match[1]).replace(/\+/g, " ");
    if (/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(decoded)) return undefined;
    return decoded;
  }

  try {
    const u = new URL(url);
    const q = u.searchParams.get("q");
    if (q && !/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(q)) {
      return q;
    }
  } catch {}

  return undefined;
}

export const googleParser: UrlParser = {
  provider: "google",
  canParse(url: string): boolean {
    try {
      return isGoogleHost(new URL(url).hostname);
    } catch {
      return false;
    }
  },
  parse(url: string): ParsedLocation | null {
    // 1. Parse the data param — this is the source of truth
    const data = parseDataParam(url);

    // 2. Extract place name and viewport coords as fallbacks
    const placeName = extractPlaceName(url);
    const viewportCoords = extractViewportCoords(url);

    // Priority:
    // - pinCoordinates from data param (exact place pin)
    // - viewportCoords as fallback (camera center)
    const coordinates = data.pinCoords || viewportCoords;

    if (!coordinates && !data.address && !placeName) return null;

    return {
      coordinates,
      placeName,
      embeddedAddress: data.address,
      pinCoordinates: data.pinCoords,
    };
  },
};
