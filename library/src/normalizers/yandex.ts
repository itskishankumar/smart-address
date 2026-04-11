import type { SmartAddress, Coordinates, MapProvider } from "../types.js";

interface YandexComponent {
  kind: string;
  name: string;
}

interface YandexGeoObject {
  metaDataProperty?: {
    GeocoderMetaData?: {
      text?: string;
      Address?: {
        formatted?: string;
        Components?: YandexComponent[];
        country_code?: string;
        postal_code?: string;
      };
    };
  };
}

interface YandexResponse {
  response?: {
    GeoObjectCollection?: {
      featureMember?: Array<{ GeoObject?: YandexGeoObject }>;
    };
  };
}

function getComponent(components: YandexComponent[], kind: string): string {
  return components.find((c) => c.kind === kind)?.name || "";
}

export function normalizeYandex(
  raw: YandexResponse,
  coords: Coordinates,
  provider: MapProvider,
): SmartAddress {
  const geoObject =
    raw.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
  const meta = geoObject?.metaDataProperty?.GeocoderMetaData;
  const addr = meta?.Address;
  const components = addr?.Components || [];

  const street = getComponent(components, "street");
  const house = getComponent(components, "house");
  const city = getComponent(components, "locality");
  const state = getComponent(components, "province");
  const country = getComponent(components, "country");

  return {
    buildingName: "",
    street1: [street, house].filter(Boolean).join(" "),
    street2: "",
    neighborhood: getComponent(components, "district"),
    city,
    state,
    postalCode: addr?.postal_code || "",
    country: addr?.country_code || "",
    countryName: country,
    formatted: addr?.formatted || meta?.text || "",
    coordinates: coords,
    provider,
    geocoder: "yandex",
    raw,
  };
}
