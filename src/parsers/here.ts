import type { ParsedLocation, UrlParser } from "../types";

function isHereHost(hostname: string): boolean {
  return (
    hostname === "share.here.com" ||
    hostname === "wego.here.com" ||
    hostname === "her.is"
  );
}

export const hereParser: UrlParser = {
  provider: "here",
  canParse(url: string): boolean {
    try {
      return isHereHost(new URL(url).hostname);
    } catch {
      return false;
    }
  },
  parse(url: string): ParsedLocation | null {
    try {
      const u = new URL(url);

      const pathMatch = u.pathname.match(/\/l\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (pathMatch)
        return {
          coordinates: {
            lat: parseFloat(pathMatch[1]),
            lng: parseFloat(pathMatch[2]),
          },
        };

      const mapParam = u.searchParams.get("map");
      if (mapParam) {
        const parts = mapParam.split(",");
        if (parts.length >= 2) {
          const lat = parseFloat(parts[0]);
          const lng = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lng)) return { coordinates: { lat, lng } };
        }
      }

      const wpMatch = u.pathname.match(/\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (wpMatch)
        return {
          coordinates: {
            lat: parseFloat(wpMatch[1]),
            lng: parseFloat(wpMatch[2]),
          },
        };

      return null;
    } catch {
      return null;
    }
  },
};
