import type {
  Coordinates,
  SmartAddress,
  MapProvider,
  SmartAddressConfig,
} from "../types";
import { reverseGeocodeNominatim, forwardGeocodeNominatim } from "./nominatim";
import { reverseGeocodeGoogle, forwardGeocodeGoogle } from "./google";
import { reverseGeocodeBing } from "./bing";
import { reverseGeocodeHere } from "./here";
import { reverseGeocodeYandex } from "./yandex";

export async function geocode(
  coords: Coordinates | null,
  provider: MapProvider,
  config?: SmartAddressConfig,
  placeName?: string,
): Promise<SmartAddress> {
  // Env vars serve as defaults; explicitly passed keys take priority
  const env =
    typeof process !== "undefined" && process.env
      ? process.env
      : ({} as Record<string, string | undefined>);
  const envKeys: Partial<Record<string, string>> = {
    google: env.GOOGLE_MAPS_API_KEY,
    bing: env.BING_MAPS_API_KEY,
    here: env.HERE_MAPS_API_KEY,
    yandex: env.YANDEX_MAPS_API_KEY,
  };
  const keys = { ...envKeys, ...config?.apiKeys };

  // If we have a place name, prefer forward geocoding — much more accurate
  if (placeName) {
    try {
      // Try provider-native forward geocoder first
      switch (provider) {
        case "google":
          if (keys.google) {
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
          return await reverseGeocodeGoogle(coords, provider, keys.google);
        }
        break;
      case "bing":
        if (keys.bing) {
          return await reverseGeocodeBing(coords, provider, keys.bing);
        }
        break;
      case "here":
        if (keys.here) {
          return await reverseGeocodeHere(coords, provider, keys.here);
        }
        break;
      case "yandex":
        if (keys.yandex) {
          return await reverseGeocodeYandex(coords, provider, keys.yandex);
        }
        break;
    }
  } catch {
    // Provider reverse geocoder failed, falling back to Nominatim
  }

  return reverseGeocodeNominatim(coords, provider);
}
