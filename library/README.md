# smart-address

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

### Short URL expansion — mandatory

Shortened links (`maps.app.goo.gl`, `binged.it`, `bit.ly`, etc.) require following HTTP redirects across origins — something browsers block due to CORS. **The library does not expand shortlinks on its own.** Pass a short URL without an `expandUrl` callback and `resolveMapUrl()` throws.

**Browser** — proxy the expansion through your own server:

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

**Node** — use the built-in redirect-follower at the `smart-address/node` subpath, no HTTP hop:

```ts
import { resolveMapUrl } from "smart-address";
import { expandShortUrl } from "smart-address/node";

const address = await resolveMapUrl(shortUrl, {
  expandUrl: expandShortUrl,
});
```

### API keys

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

## How it works

```
URL → detect provider → expand if shortened → parse → geocode → normalize
```

**Parsing priority** (for Google Maps URLs with `data=` params):

1. **Embedded address** (`!2s` param) — the exact address string from the URL
2. **Pin coordinates** (`!3d`/`!4d`) — the place's exact pin, not the viewport center
3. **Place name** (`/place/Name/`) — forward geocoded with wide region bias
4. **Viewport coordinates** (`@lat,lng`) — the camera center (least accurate)

**Geocoding strategy**: If an embedded address or place name is found, the library forward geocodes it to get exact coordinates, then reverse geocodes those coordinates for full structured components. If only coordinates are available, it reverse geocodes directly.

See [SUPPORTED_FORMATS.md](https://github.com/itskishankumar/smart-address/blob/main/SUPPORTED_FORMATS.md) for every vendor and URL format.

## License

MIT
