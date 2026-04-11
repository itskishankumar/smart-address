import type { SmartAddress, Coordinates, MapProvider } from "../types.js";

interface GoogleComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GoogleResult {
  formatted_address?: string;
  address_components?: GoogleComponent[];
}

interface GoogleResponse {
  results?: GoogleResult[];
  status?: string;
}

function getComponent(
  components: GoogleComponent[],
  type: string,
): { long: string; short: string } {
  const c = components.find((c) => c.types.includes(type));
  return c
    ? { long: c.long_name, short: c.short_name }
    : { long: "", short: "" };
}

export function normalizeGoogle(
  raw: GoogleResponse,
  coords: Coordinates,
  provider: MapProvider,
): SmartAddress {
  const result = raw.results?.[0];
  const components = result?.address_components || [];

  const streetNumber = getComponent(components, "street_number").long;
  const route = getComponent(components, "route").long;
  const subpremise = getComponent(components, "subpremise").long;
  const premise = getComponent(components, "premise").long;
  const establishment = getComponent(components, "establishment").long;
  const pointOfInterest = getComponent(components, "point_of_interest").long;
  const neighborhood = getComponent(components, "neighborhood").long;
  const sublocalityL1 = getComponent(components, "sublocality_level_1").long;
  const sublocalityL2 = getComponent(components, "sublocality_level_2").long;
  const sublocalityL3 = getComponent(components, "sublocality_level_3").long;
  const sublocality = getComponent(components, "sublocality").long;

  // City: prefer locality, then admin level 2/3 — NOT sublocality (which is a neighborhood in many countries)
  const city =
    getComponent(components, "locality").long ||
    getComponent(components, "administrative_area_level_2").long ||
    getComponent(components, "administrative_area_level_3").long;

  const state = getComponent(components, "administrative_area_level_1");
  const postalCode = getComponent(components, "postal_code").long;
  const country = getComponent(components, "country");

  // Street address: prefer street_number + route (Western style)
  // Fallback: use sublocality levels (common in India, Japan, Korea, etc.)
  let street1 = [streetNumber, route].filter(Boolean).join(" ");
  if (!street1) {
    const parts = [sublocalityL3, sublocalityL2].filter(Boolean);
    street1 = parts.join(", ");
  }

  // buildingName: place/premise/establishment name
  const buildingName = premise || establishment || pointOfInterest || "";

  // street2: apt/suite/unit only
  const street2 = subpremise ? `Unit ${subpremise}` : "";

  // Neighborhood: prefer explicit neighborhood, then sublocality_level_1
  const neighborhoodValue = neighborhood || sublocalityL1 || sublocality || "";

  return {
    buildingName,
    street1,
    street2,
    neighborhood: neighborhoodValue,
    city,
    state: state.short || state.long,
    postalCode,
    country: country.short,
    countryName: country.long,
    formatted: result?.formatted_address || "",
    coordinates: coords,
    provider,
    geocoder: "google",
    raw,
  };
}
