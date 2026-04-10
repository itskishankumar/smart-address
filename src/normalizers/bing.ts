import type { SmartAddress, Coordinates, MapProvider } from "../types";

interface BingAddress {
  addressLine?: string;
  adminDistrict?: string;
  adminDistrict2?: string;
  countryRegion?: string;
  countryRegionIso2?: string;
  formattedAddress?: string;
  locality?: string;
  postalCode?: string;
  neighborhood?: string;
}

interface BingResource {
  address?: BingAddress;
  name?: string;
}

interface BingResponse {
  resourceSets?: Array<{ resources?: BingResource[] }>;
  statusCode?: number;
}

export function normalizeBing(
  raw: BingResponse,
  coords: Coordinates,
  provider: MapProvider,
): SmartAddress {
  const resource = raw.resourceSets?.[0]?.resources?.[0];
  const a = resource?.address || {};

  return {
    buildingName: "",
    street1: a.addressLine || "",
    street2: "",
    neighborhood: a.neighborhood || "",
    city: a.locality || "",
    state: a.adminDistrict || "",
    postalCode: a.postalCode || "",
    country: a.countryRegionIso2 || "",
    countryName: a.countryRegion || "",
    formatted: a.formattedAddress || resource?.name || "",
    coordinates: coords,
    provider,
    geocoder: "bing",
    raw,
  };
}
