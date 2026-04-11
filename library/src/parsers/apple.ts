import type { ParsedLocation, UrlParser } from "../types.js";

function isAppleHost(hostname: string): boolean {
  return hostname === "maps.apple.com" || hostname === "maps.apple";
}

export const appleParser: UrlParser = {
  provider: "apple",
  canParse(url: string): boolean {
    try {
      return isAppleHost(new URL(url).hostname);
    } catch {
      return false;
    }
  },
  parse(url: string): ParsedLocation | null {
    try {
      const u = new URL(url);

      // Extract place name from q= if it's not coordinates
      let placeName: string | undefined;
      const q = u.searchParams.get("q");
      if (q && !/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(q)) {
        placeName = q;
      }

      // address= param — full address string, use as embedded address
      const address = u.searchParams.get("address");
      const embeddedAddress = address
        ? decodeURIComponent(address).replace(/\+/g, " ")
        : undefined;

      // ll=lat,lng
      const ll = u.searchParams.get("ll");
      if (ll) {
        const [lat, lng] = ll.split(",").map(Number);
        if (!isNaN(lat) && !isNaN(lng))
          return { coordinates: { lat, lng }, placeName, embeddedAddress };
      }

      // sll=lat,lng
      const sll = u.searchParams.get("sll");
      if (sll) {
        const [lat, lng] = sll.split(",").map(Number);
        if (!isNaN(lat) && !isNaN(lng))
          return { coordinates: { lat, lng }, placeName, embeddedAddress };
      }

      // q=lat,lng
      if (q) {
        const match = q.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
        if (match)
          return {
            coordinates: {
              lat: parseFloat(match[1]),
              lng: parseFloat(match[2]),
            },
            embeddedAddress,
          };
      }

      // If we have an address but no coordinates — forward geocode it
      if (embeddedAddress) return { coordinates: null, embeddedAddress, placeName };

      // If we only have a place name but no coordinates
      if (placeName) return { coordinates: null, placeName };

      return null;
    } catch {
      return null;
    }
  },
};
