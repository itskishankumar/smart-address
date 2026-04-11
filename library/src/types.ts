export interface Coordinates {
  lat: number;
  lng: number;
}

export type MapProvider =
  | "google"
  | "apple"
  | "osm"
  | "bing"
  | "here"
  | "yandex"
  | "unknown";

export interface ParsedLocation {
  coordinates: Coordinates | null;
  placeName?: string;
  /** Exact address string embedded in the URL (e.g. from Google's !2s data param) */
  embeddedAddress?: string;
  /** Exact pin coordinates from data param (not viewport center) */
  pinCoordinates?: Coordinates;
}

export interface SmartAddress {
  buildingName: string;
  street1: string;
  street2: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  countryName: string;
  formatted: string;
  coordinates: Coordinates;
  provider: MapProvider;
  geocoder: string;
  raw: unknown;
}

export interface SmartAddressConfig {
  apiKeys?: Partial<Record<MapProvider, string>>;
  expandUrl?: (url: string) => Promise<string>;
}

export interface UrlParser {
  provider: MapProvider;
  canParse(url: string): boolean;
  parse(url: string): ParsedLocation | null;
}