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

## Repository Layout

This repo contains three independent projects, each with its own `package.json`:

```
smart-address/
├── library/     The actual library — TS source, compiled to dist/ with plain `tsc`.
├── demo/        Vue 3 + Vite demo app that imports the library directly.
└── api/         Serverless endpoint (Vercel) that returns SmartAddress JSON.
```

The library is consumed by `demo/` and `api/` via a `file:../library` dependency. No workspaces, no bundler — just `tsc`. Each consumer has a `postinstall` hook (`cd ../library && npm install && npm run build`) so the library's `dist/` is produced automatically on `npm install` in either project, both locally and on Vercel.

## Install

```bash
npm install smart-address
```

Requires Node 18+ (or any modern bundler for browser use). ESM only.

## Usage

```ts
import { resolveMapUrl, isMapUrl } from "smart-address";

// Check if text is a maps URL
isMapUrl("https://maps.app.goo.gl/TUgLTcyjfzxtz9tm9"); // true

// Resolve a full URL to a structured address
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

### Short URL Expansion — mandatory

Shortened links (`maps.app.goo.gl`, `binged.it`, `bit.ly`, etc.) require following HTTP redirects across origins — something browsers block due to CORS. **The library does not expand shortlinks on its own.** If you pass a short URL without an `expandUrl` callback, `resolveMapUrl()` throws.

You must provide the callback yourself:

```ts
const address = await resolveMapUrl(shortUrl, {
  expandUrl: async (url) => {
    const res = await fetch(`/api/expand?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error(`Failed to expand URL: ${res.statusText}`);
    const data = await res.json();
    return data.finalUrl;
  },
});
```

#### Node-side expander (no HTTP hop)

When running server-side (Vercel functions, Node scripts), you don't need an HTTP proxy — the library ships a Node-native redirect-follower at the `smart-address/node` subpath:

```ts
import { resolveMapUrl } from "smart-address";
import { expandShortUrl } from "smart-address/node";

const address = await resolveMapUrl(shortUrl, {
  expandUrl: expandShortUrl, // follows redirects via Node's http/https modules
});
```

### API Keys

Provider API keys unlock native geocoding APIs (Google, Bing, HERE, Yandex) instead of the Nominatim fallback.

**Environment variables** (picked up automatically):

```bash
GOOGLE_MAPS_API_KEY=AIza...
BING_MAPS_API_KEY=Ak...
HERE_MAPS_API_KEY=...
YANDEX_MAPS_API_KEY=...
```

Node 22+ loads `.env` automatically; for older versions use `node --env-file=.env`. Vite reads `.env` automatically with matching `envPrefix` config.

**Explicit config** (takes priority over env):

```ts
const address = await resolveMapUrl(url, {
  apiKeys: { google: "AIza...", bing: "Ak...", here: "...", yandex: "..." },
  expandUrl: /* ... */,
});
```

Without any keys, everything falls back to Nominatim (free, no key needed).

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

## Project: `library/`

TypeScript library compiled with plain `tsc` — no bundler, no tsup.

```
library/
├── src/
│   ├── index.ts           resolveMapUrl(), isMapUrl(), detectProvider()
│   ├── node.ts            expandShortUrl(), isAllowedHost() — Node-only
│   ├── types.ts           SmartAddress, SmartAddressConfig, MapProvider
│   ├── parsers/           URL parsers (one per provider)
│   ├── geocoders/         Reverse/forward geocoding API clients
│   └── normalizers/       Response → SmartAddress mappers
├── dist/                  Output of `tsc` — .js + .d.ts. Exports point here.
├── package.json           exports: { ".", "./node" }
└── tsconfig.json
```

Build: `cd library && npm install && npm run build`. Consumers do this automatically via their `postinstall` hook, so you rarely need to run it by hand.

## Project: `demo/`

Vue 3 + Vite SPA that imports the library directly and calls its own `/api/expand` endpoint for shortlink expansion.

```
demo/
├── src/                   Vue app (components, composables, providers)
├── api/expand.ts          Shortlink proxy — Vercel function in prod,
│                          also called by the Vite dev middleware
├── vite.config.ts         Includes the dev middleware that mounts /api/expand
├── package.json           depends on smart-address via "file:../library"
└── tsconfig.json
```

Run the demo:

```bash
cd demo
npm install
npm run dev       # http://localhost:5173
# npm run build   # → dist/
```

Paste any maps URL into any form field — it detects the provider, resolves the address, and fills all fields. Includes sample URLs for each supported provider.

## Project: `api/`

Single Vercel serverless function: `GET /api/normalize?url=<maps-url>` → `SmartAddress` JSON.

```
api/
├── normalize.ts           Handler: resolveMapUrl() + expandShortUrl from "smart-address/node"
├── package.json
├── tsconfig.json
└── vercel.json
```

Shortlink expansion runs in-process via `smart-address/node` — no HTTP self-call. Set `GOOGLE_MAPS_API_KEY` (and any other provider keys) via Vercel project env vars or a local `.env`.

Local test with any TS runner (`npx tsx`, `vercel dev`, etc.):

```bash
curl "http://localhost:3000/api/normalize?url=https://maps.app.goo.gl/TUgLTcyjfzxtz9tm9"
```

## License

MIT
