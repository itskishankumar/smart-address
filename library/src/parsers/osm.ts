import type { Coordinates, ParsedLocation, UrlParser } from "../types.js";

function isOsmHost(hostname: string): boolean {
  return (
    hostname === "www.openstreetmap.org" ||
    hostname === "openstreetmap.org" ||
    hostname === "osm.org" ||
    hostname === "www.osm.org"
  );
}

function decodeShortUrl(code: string): Coordinates | null {
  const CHARS =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_~";
  let x = 0,
    y = 0;
  let z = 0;

  for (const ch of code) {
    const idx = CHARS.indexOf(ch);
    if (idx === -1) break;
    for (let i = 2; i >= 0; i--) {
      x = (x << 1) | ((idx >> (2 * i + 1)) & 1);
      y = (y << 1) | ((idx >> (2 * i)) & 1);
    }
    z += 3;
  }

  const lng = (x / Math.pow(2, z)) * 360 - 180;
  const lat = (y / Math.pow(2, z)) * 360 - 180;

  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

export const osmParser: UrlParser = {
  provider: "osm",
  canParse(url: string): boolean {
    try {
      return isOsmHost(new URL(url).hostname);
    } catch {
      return false;
    }
  },
  parse(url: string): ParsedLocation | null {
    try {
      const u = new URL(url);

      const hashMatch = u.hash.match(/#map=\d+\/(-?\d+\.?\d*)\/(-?\d+\.?\d*)/);
      if (hashMatch)
        return {
          coordinates: {
            lat: parseFloat(hashMatch[1]),
            lng: parseFloat(hashMatch[2]),
          },
        };

      const mlat = u.searchParams.get("mlat");
      const mlon = u.searchParams.get("mlon");
      if (mlat && mlon) {
        const lat = parseFloat(mlat);
        const lng = parseFloat(mlon);
        if (!isNaN(lat) && !isNaN(lng)) return { coordinates: { lat, lng } };
      }

      const goMatch = u.pathname.match(/\/go\/([A-Za-z0-9_~]+)/);
      if (goMatch) {
        const coords = decodeShortUrl(goMatch[1]);
        return coords ? { coordinates: coords } : null;
      }

      const lat = u.searchParams.get("lat");
      const lon = u.searchParams.get("lon");
      if (lat && lon) {
        const la = parseFloat(lat);
        const lo = parseFloat(lon);
        if (!isNaN(la) && !isNaN(lo))
          return { coordinates: { lat: la, lng: lo } };
      }

      return null;
    } catch {
      return null;
    }
  },
};
