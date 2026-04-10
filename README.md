# Smart Address

Turns any maps URL into a structured, form-ready address.

```
https://www.google.com/maps/place/Target/@33.79,-118.12,17z/data=...!2s5551+E+Rolanda+St,+Long+Beach,+CA+90815...
                                          ↓
{
  buildingName: "Target",
  street1: "5551 East Rolanda Street",
  street2: "",
  neighborhood: "Los Altos",
  city: "Long Beach",
  state: "CA",
  postalCode: "90815",
  country: "US",
  countryName: "United States"
}
```

Supports Google Maps, Apple Maps, OpenStreetMap, Bing, HERE, and Yandex — full URLs, shortened links, and URLs with embedded data params.

## Install

```bash
npm install smart-address
```

## Usage

```ts
import { resolveMapUrl, isMapUrl } from "smart-address";

// Check if text is a maps URL
isMapUrl("https://maps.app.goo.gl/TUgLTcyjfzxtz9tm9"); // true

// Resolve to structured address
const address = await resolveMapUrl(
  "https://www.google.com/maps/place/Gateway+of+India/@18.9219841,72.8346543,17z"
);

address.buildingName  // "Gateway of India"
address.street1       // "Apollo Bandar"
address.neighborhood  // "Colaba"
address.city          // "Mumbai"
address.state         // "MH"
address.postalCode    // "400001"
address.country       // "IN"
```

### With API Keys

Provider API keys unlock native geocoding APIs (Google, Bing, HERE, Yandex) instead of the Nominatim fallback.

**Option 1: Environment variables** (recommended)

Set any of these and they'll be picked up automatically — no code changes needed:

```bash
GOOGLE_MAPS_API_KEY=AIza...
BING_MAPS_API_KEY=Ak...
HERE_MAPS_API_KEY=...
YANDEX_MAPS_API_KEY=...
```

Set them in a `.env` file, your shell, or CI environment. Node 22+ loads `.env` automatically; for older versions use `node --env-file=.env`.

```ts
// Just call resolveMapUrl — keys are read from env automatically
const address = await resolveMapUrl(url);
```

**Option 2: Explicit config**

Pass keys directly — these take priority over env variables:

```ts
const address = await resolveMapUrl(url, {
  apiKeys: {
    google: "AIza...",
    bing: "Ak...",
    here: "...",
    yandex: "...",
  },
});
```

Without any keys (env or explicit), everything falls back to Nominatim (free, no key needed).

### Short URL Expansion

Shortened links (`maps.app.goo.gl`, `binged.it`, etc.) require a server-side proxy to expand — browsers block cross-origin redirect following due to CORS. Provide your own via the `expandUrl` callback:

```ts
const address = await resolveMapUrl(shortUrl, {
  expandUrl: async (url) => {
    const res = await fetch(`/api/expand?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    return data.finalUrl;
  },
});
```

## `SmartAddress`

```ts
{
  buildingName: string   // Place/building name ("Target", "Gateway of India")
  street1: string        // Street address ("5551 East Rolanda Street")
  street2: string        // Apt / suite / unit
  neighborhood: string   // Sub-city area ("Colaba", "Los Altos")
  city: string           // "Mumbai", "Long Beach"
  state: string          // "MH", "CA"
  postalCode: string     // "400001", "90815"
  country: string        // ISO 3166-1 alpha-2 ("IN", "US")
  countryName: string    // "India", "United States"
  formatted: string      // Provider's formatted address string
  coordinates: { lat: number; lng: number }
  provider: string       // "google" | "apple" | "osm" | "bing" | "here" | "yandex"
  geocoder: string       // Which API resolved the address
  raw: unknown           // Original API response
}
```

## How It Works

```
URL → detect provider → expand if shortened → parse → geocode → normalize
```

**Parsing priority** (for Google Maps URLs with `data=` params):

1. **Embedded address** (`!2s` param) — the exact address string from the URL
2. **Pin coordinates** (`!3d`/`!4d`) — the place's exact pin, not the viewport center
3. **Place name** (`/place/Name/`) — forward geocoded with wide region bias
4. **Viewport coordinates** (`@lat,lng`) — the camera center (least accurate)

**Geocoding strategy**: If an embedded address or place name is found, the library forward geocodes it to get exact coordinates, then reverse geocodes those coordinates for full structured components. If only coordinates are available, it reverse geocodes directly.

See [SUPPORTED_FORMATS.md](./SUPPORTED_FORMATS.md) for every vendor and URL format.

## Project Structure

```
smart-address/
  src/                         Library source
    index.ts                   Entry point — resolveMapUrl(), isMapUrl(), detectProvider()
    types.ts                   TypeScript interfaces
    expander.ts                Short URL expansion
    parsers/                   URL parsers (one per provider)
    geocoders/                 Reverse/forward geocoding API clients
    normalizers/               Response → SmartAddress mappers
  dist/                        Built output (ESM + CJS + .d.ts)
  demo/                        Vue 3 demo app (workspace member, not published)
    src/
    server/proxy.ts            Vite dev middleware for short URL expansion
  tsup.config.ts               Library build config
  package.json                 npm package config
```

## Demo

```bash
npm install
npm run dev
```

The demo is a Vue 3 + Vite app. Paste any maps URL into any form field — it detects the provider, resolves the address, and fills all fields. Includes sample URLs for each supported provider and a built-in proxy for short URL expansion.

## License

MIT
