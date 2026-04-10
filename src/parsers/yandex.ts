import type { ParsedLocation, UrlParser } from "../types";

function isYandexHost(hostname: string): boolean {
  return hostname.includes("yandex.");
}

export const yandexParser: UrlParser = {
  provider: "yandex",
  canParse(url: string): boolean {
    try {
      const u = new URL(url);
      return (
        isYandexHost(u.hostname) &&
        (u.pathname.includes("/maps") || u.pathname.includes("/map"))
      );
    } catch {
      return false;
    }
  },
  parse(url: string): ParsedLocation | null {
    try {
      const u = new URL(url);

      // ll=lng,lat (NOTE: Yandex uses lng,lat order!)
      const ll = u.searchParams.get("ll");
      if (ll) {
        const [lng, lat] = ll.split(",").map(Number);
        if (!isNaN(lat) && !isNaN(lng)) return { coordinates: { lat, lng } };
      }

      // pt=lng,lat
      const pt = u.searchParams.get("pt");
      if (pt) {
        const [lng, lat] = pt.split(",").map(Number);
        if (!isNaN(lat) && !isNaN(lng)) return { coordinates: { lat, lng } };
      }

      const pathMatch = url.match(/\/maps\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (pathMatch)
        return {
          coordinates: {
            lat: parseFloat(pathMatch[2]),
            lng: parseFloat(pathMatch[1]),
          },
        };

      return null;
    } catch {
      return null;
    }
  },
};
