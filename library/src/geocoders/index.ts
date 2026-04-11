import type {
  Coordinates,
  SmartAddress,
  MapProvider,
  SmartAddressConfig,
} from "../types.js";
import { reverseGeocodeNominatim, forwardGeocodeNominatim } from "./nominatim.js";
import { reverseGeocodeGoogle, forwardGeocodeGoogle } from "./google.js";
import { reverseGeocodeBing } from "./bing.js";
import { reverseGeocodeHere } from "./here.js";
import { reverseGeocodeYandex } from "./yandex.js";

export async function geocode(
  coords: Coordinates | null,
  provider: MapProvider,
  config?: SmartAddressConfig,
  placeName?: string,
): Promise<SmartAddress> {
  // Env vars serve as defaults; explicitly passed keys take priority.
  // Checks process.env (Node) and import.meta.env (Vite/bundlers).
  const penv =
    typeof process !== "undefined" && process.env ? process.env : {};
  let menv: Record<string, string | undefined> = {};
  try { menv = (import.meta as any).env || {}; } catch {}
  const e = (key: string) => penv[key] || menv[key];
  const envKeys: Partial<Record<string, string>> = {
    google: e("GOOGLE_MAPS_API_KEY"),
    bing: e("BING_MAPS_API_KEY"),
    here: e("HERE_MAPS_API_KEY"),
    yandex: e("YANDEX_MAPS_API_KEY"),
  };
  const keys = { ...envKeys, ...config?.apiKeys };
  const activeKeys = Object.entries(keys)
    .filter(([, v]) => !!v)
    .map(([k]) => k);
  console.log(
    `[smart-address] provider=${provider}, keys=[${activeKeys.join(", ") || "none"}], strategy=${placeName ? "forward" : "reverse"}`,
  );

  // If we have a place name, prefer forward geocoding — much more accurate
  if (placeName) {
    try {
      // Try provider-native forward geocoder first
      switch (provider) {
        case "google":
          if (keys.google) {
            console.log(`[smart-address] Using Google forward geocoder for "${placeName}"`);
            return await forwardGeocodeGoogle(
              placeName,
              coords,
              provider,
              keys.google,
            );
          }
          break;
        // Other providers: fall through to Nominatim forward geocode
      }
    } catch {
      // Provider forward geocoder failed, try Nominatim forward
    }

    // Nominatim forward geocode fallback
    try {
      console.log(`[smart-address] Using Nominatim forward geocoder for "${placeName}"`);
      return await forwardGeocodeNominatim(placeName, coords, provider);
    } catch {
      // Nominatim forward geocode failed, falling back to reverse
    }
  }

  // No place name or forward geocoding failed — use reverse geocoding
  if (!coords) {
    throw new Error("No coordinates available for reverse geocoding");
  }

  // Try provider-specific reverse geocoder
  try {
    switch (provider) {
      case "google":
        if (keys.google) {
          console.log(`[smart-address] Using Google reverse geocoder`);
          return await reverseGeocodeGoogle(coords, provider, keys.google);
        }
        break;
      case "bing":
        if (keys.bing) {
          console.log(`[smart-address] Using Bing reverse geocoder`);
          return await reverseGeocodeBing(coords, provider, keys.bing);
        }
        break;
      case "here":
        if (keys.here) {
          console.log(`[smart-address] Using HERE reverse geocoder`);
          return await reverseGeocodeHere(coords, provider, keys.here);
        }
        break;
      case "yandex":
        if (keys.yandex) {
          console.log(`[smart-address] Using Yandex reverse geocoder`);
          return await reverseGeocodeYandex(coords, provider, keys.yandex);
        }
        break;
    }
  } catch {
    // Provider reverse geocoder failed, falling back to Nominatim
  }

  console.log(`[smart-address] Using Nominatim reverse geocoder (fallback)`);
  return reverseGeocodeNominatim(coords, provider);
}
