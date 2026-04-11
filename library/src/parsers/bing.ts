import type { ParsedLocation, UrlParser } from "../types.js";

function isBingHost(hostname: string): boolean {
  return (
    hostname === "www.bing.com" ||
    hostname === "bing.com" ||
    hostname === "binged.it"
  );
}

export const bingParser: UrlParser = {
  provider: "bing",
  canParse(url: string): boolean {
    try {
      const u = new URL(url);
      return (
        isBingHost(u.hostname) &&
        (u.pathname.includes("/maps") || u.hostname === "binged.it")
      );
    } catch {
      return false;
    }
  },
  parse(url: string): ParsedLocation | null {
    try {
      const u = new URL(url);

      const cp = u.searchParams.get("cp");
      if (cp) {
        const [lat, lng] = cp.split("~").map(Number);
        if (!isNaN(lat) && !isNaN(lng)) return { coordinates: { lat, lng } };
      }

      const where = u.searchParams.get("where1");
      if (where) {
        const match = where.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
        if (match)
          return {
            coordinates: {
              lat: parseFloat(match[1]),
              lng: parseFloat(match[2]),
            },
          };
      }

      const sp = u.searchParams.get("sp");
      if (sp) {
        const match = sp.match(/point\.(-?\d+\.?\d*)_(-?\d+\.?\d*)/);
        if (match)
          return {
            coordinates: {
              lat: parseFloat(match[1]),
              lng: parseFloat(match[2]),
            },
          };
      }

      return null;
    } catch {
      return null;
    }
  },
};
