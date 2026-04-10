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

const LOG = "[smart-address:geocoder]";

export async function geocode(
  coords: Coordinates | null,
  provider: MapProvider,
  config?: SmartAddressConfig,
  placeName?: string,
): Promise<SmartAddress> {
  // Env vars serve as defaults; explicitly passed keys take priority
  const envKeys: Partial<Record<string, string>> = {
    google: process.env.GOOGLE_MAPS_API_KEY,
    bing: process.env.BING_MAPS_API_KEY,
    here: process.env.HERE_MAPS_API_KEY,
    yandex: process.env.YANDEX_MAPS_API_KEY,
  };
  const keys = { ...envKeys, ...config?.apiKeys };
  const availableKeys = Object.entries(keys)
    .filter(([, v]) => !!v)
    .map(([k]) => k);
  console.log(
    `${LOG} geocode called — provider: ${provider}, placeName: ${placeName || "(none)"}, coords: ${coords ? `${coords.lat},${coords.lng}` : "(none)"}`,
  );
  console.log(
    `${LOG} Available API keys: [${availableKeys.join(", ") || "none"}]`,
  );
  console.log(
    `${LOG} Strategy: ${placeName ? "FORWARD geocode (place name available)" : "REVERSE geocode (coordinates only)"}`,
  );

  // If we have a place name, prefer forward geocoding — much more accurate
  if (placeName) {
    try {
      // Try provider-native forward geocoder first
      switch (provider) {
        case "google":
          if (keys.google) {
            console.log(
              `${LOG} Using Google forward geocoding for "${placeName}"`,
            );
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
    } catch (err) {
      console.warn(
        `${LOG} ${provider} forward geocoder failed, trying Nominatim forward:`,
        err,
      );
    }

    // Nominatim forward geocode fallback
    try {
      console.log(
        `${LOG} Using Nominatim forward geocoding for "${placeName}"`,
      );
      return await forwardGeocodeNominatim(placeName, coords, provider);
    } catch (err) {
      console.warn(
        `${LOG} Nominatim forward geocode failed, falling back to reverse:`,
        err,
      );
    }
  }

  // No place name or forward geocoding failed — use reverse geocoding
  if (!coords) {
    throw new Error("No coordinates available for reverse geocoding");
  }

  console.log(`${LOG} Using reverse geocoding for ${coords.lat},${coords.lng}`);

  // Try provider-specific reverse geocoder
  try {
    switch (provider) {
      case "google":
        if (keys.google) {
          console.log(`${LOG} Using Google reverse geocoding`);
          return await reverseGeocodeGoogle(coords, provider, keys.google);
        }
        break;
      case "bing":
        if (keys.bing) {
          console.log(`${LOG} Using Bing reverse geocoding`);
          return await reverseGeocodeBing(coords, provider, keys.bing);
        }
        break;
      case "here":
        if (keys.here) {
          console.log(`${LOG} Using HERE reverse geocoding`);
          return await reverseGeocodeHere(coords, provider, keys.here);
        }
        break;
      case "yandex":
        if (keys.yandex) {
          console.log(`${LOG} Using Yandex reverse geocoding`);
          return await reverseGeocodeYandex(coords, provider, keys.yandex);
        }
        break;
    }
  } catch (err) {
    console.warn(
      `${LOG} ${provider} reverse geocoder failed, falling back to Nominatim:`,
      err,
    );
  }

  console.log(`${LOG} Using Nominatim reverse geocoding (fallback)`);
  return reverseGeocodeNominatim(coords, provider);
}