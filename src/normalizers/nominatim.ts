import type { SmartAddress, Coordinates, MapProvider } from "../types";

interface NominatimAddress {
  house_number?: string;
  road?: string;
  residential?: string;
  hamlet?: string;
  building?: string;
  amenity?: string;
  shop?: string;
  office?: string;
  tourism?: string;
  leisure?: string;
  neighbourhood?: string;
  suburb?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  state_district?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
}

export function normalizeNominatim(
  raw: NominatimResponse,
  coords: Coordinates,
  provider: MapProvider,
): SmartAddress {
  const a = raw.address || {};

  const houseNumber = a.house_number || "";
  const road = a.road || "";

  // Street: prefer house_number + road, fallback to residential/hamlet (common in India, rural areas)
  let street1 = [houseNumber, road].filter(Boolean).join(" ");
  if (!street1) {
    street1 = a.residential || a.hamlet || "";
  }

  const city = a.city || a.town || a.village || a.municipality || "";
  const state = a.state || a.state_district || a.county || "";
  const postalCode = a.postcode || "";
  const countryCode = (a.country_code || "").toUpperCase();
  const countryName = a.country || "";

  const buildingName =
    a.building ||
    a.amenity ||
    a.shop ||
    a.office ||
    a.tourism ||
    a.leisure ||
    "";
  const neighborhood = a.neighbourhood || a.suburb || a.city_district || "";

  return {
    buildingName,
    street1,
    street2: "",
    neighborhood,
    city,
    state,
    postalCode,
    country: countryCode,
    countryName,
    formatted:
      raw.display_name ||
      [street1, city, state, postalCode, countryName]
        .filter(Boolean)
        .join(", "),
    coordinates: coords,
    provider,
    geocoder: "nominatim",
    raw,
  };
}
