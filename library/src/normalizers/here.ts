import type { SmartAddress, Coordinates, MapProvider } from "../types.js";

interface HereAddress {
  label?: string;
  countryCode?: string;
  countryName?: string;
  stateCode?: string;
  state?: string;
  county?: string;
  city?: string;
  district?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
}

interface HereItem {
  title?: string;
  address?: HereAddress;
}

interface HereResponse {
  items?: HereItem[];
}

export function normalizeHere(
  raw: HereResponse,
  coords: Coordinates,
  provider: MapProvider,
): SmartAddress {
  const item = raw.items?.[0];
  const a = item?.address || {};

  return {
    buildingName: "",
    street1: [a.houseNumber, a.street].filter(Boolean).join(" "),
    street2: "",
    neighborhood: a.district || "",
    city: a.city || "",
    state: a.stateCode || a.state || "",
    postalCode: a.postalCode || "",
    country: a.countryCode || "",
    countryName: a.countryName || "",
    formatted: a.label || item?.title || "",
    coordinates: coords,
    provider,
    geocoder: "here",
    raw,
  };
}
