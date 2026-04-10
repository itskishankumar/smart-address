# Supported URL Formats

## Google Maps

| # | Format | Example |
|---|---|---|
| 1 | Place URL | `https://www.google.com/maps/place/Eiffel+Tower/@48.858,2.294,17z` |
| 2 | Place URL with data param | `https://www.google.com/maps/place/Target/@33.798,-118.123,17z/data=!4m15!...!2s5551+E+Rolanda+St,+Long+Beach,+CA+90815!...!3d33.800!4d-118.123...` |
| 3 | Search URL | `https://www.google.com/maps/search/restaurants/@48.858,2.294,15z` |
| 4 | Directions URL | `https://www.google.com/maps/dir/Origin/Destination/@48.858,2.294,12z` |
| 5 | Query with coordinates | `https://maps.google.com/?q=48.858,2.294` |
| 6 | Query with place name | `https://maps.google.com/?q=Eiffel+Tower` |
| 7 | LL param | `https://www.google.com/maps?ll=48.858,2.294` |
| 8 | Short URL (new) | `https://maps.app.goo.gl/TUgLTcyjfzxtz9tm9` |
| 9 | Short URL (old) | `https://goo.gl/maps/abc123` |
| 10 | Data param coordinates | `...!3d48.858!4d2.294...` (no `@` in path) |
| 11 | International domains | `https://www.google.co.in/maps/place/...`, `.co.uk`, `.de`, `.fr`, `.es`, `.it`, `.ca`, `.com.au`, `.co.jp`, `.com.br`, `.ru`, `.co.kr`, `.nl`, `.pl` |

### Data param parsing

Google Maps URLs with a `data=` parameter contain the source of truth:

- `!2s` — Embedded address string (e.g. `!2s5551+E+Rolanda+St,+Long+Beach,+CA+90815`)
- `!3d` / `!4d` — Exact pin coordinates (latitude / longitude), not the viewport center
- `!1s` — Place CID / ID

The `@lat,lng` in the URL path is the **viewport center** (camera position), not the pin location. The library prioritizes data param values over viewport coordinates.

## Apple Maps

| # | Format | Example |
|---|---|---|
| 1 | LL param | `https://maps.apple.com/?ll=48.858,2.294` |
| 2 | Query + LL | `https://maps.apple.com/?q=Eiffel+Tower&ll=48.858,2.294` |
| 3 | Query only (place name) | `https://maps.apple.com/?q=Eiffel+Tower` |
| 4 | SLL param | `https://maps.apple.com/?sll=48.858,2.294` |
| 5 | Address param | `https://maps.apple.com/?address=1+Av+Gustave+Eiffel,75007+Paris,France` |

## OpenStreetMap

| # | Format | Example |
|---|---|---|
| 1 | Hash URL | `https://www.openstreetmap.org/#map=18/48.858/2.294` |
| 2 | Marker params | `https://www.openstreetmap.org/?mlat=48.858&mlon=2.294` |
| 3 | Short URL (encoded) | `https://osm.org/go/0BPIgoS-` |
| 4 | Lat/lon params | `https://www.openstreetmap.org/?lat=48.858&lon=2.294` |

### Short URL decoding

OSM short URLs (`osm.org/go/...`) use a quadtile encoding scheme. The library decodes these algorithmically — no HTTP redirect needed.

## Bing Maps

| # | Format | Example |
|---|---|---|
| 1 | CP param | `https://www.bing.com/maps?cp=48.858~2.294` |
| 2 | SP point param | `https://www.bing.com/maps?sp=point.48.858_2.294` |
| 3 | Where param | `https://www.bing.com/maps?where1=48.858,2.294` |
| 4 | Short URL | `https://binged.it/3abc123` |

## HERE Maps

| # | Format | Example |
|---|---|---|
| 1 | Share link | `https://share.here.com/l/48.858,2.294` |
| 2 | Wego map param | `https://wego.here.com/?map=48.858,2.294,16` |
| 3 | Short URL | `https://her.is/abc123` |

## Yandex Maps

| # | Format | Example |
|---|---|---|
| 1 | LL param | `https://yandex.com/maps/?ll=2.294,48.858` |
| 2 | PT param | `https://yandex.com/maps/?pt=2.294,48.858` |
| 3 | Path coordinates | `https://yandex.com/maps/2.294,48.858` |

**Note:** Yandex uses **longitude,latitude** order (reversed from all other providers).

## Short URL Expansion

Short URLs are expanded server-side by following HTTP redirects through a proxy endpoint. Whitelisted hosts:

- `maps.app.goo.gl`
- `goo.gl`
- `binged.it`
- `her.is`
- `osm.org`
- `maps.apple`
- `share.here.com`
- `bit.ly`

## Short URL Limitations

Shortened map links (`maps.app.goo.gl/...`, `binged.it/...`, `her.is/...`, etc.) work by redirecting to the full URL. Expanding these redirects **cannot be done purely on the client side** — browsers block cross-origin redirect following due to CORS (the short URL services don't send `Access-Control-Allow-Origin` headers).

To support short URLs, you need a server-side proxy that follows the redirect chain and returns the final URL. The demo app includes a built-in Vite dev middleware for this (`server/proxy.ts`).

When using the library standalone, provide your own expansion logic via the `expandUrl` config callback:

```ts
const address = await resolveMapUrl(shortUrl, {
  expandUrl: async (url) => {
    // Your server-side proxy or edge function
    const res = await fetch(`/api/expand?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    return data.finalUrl;
  }
});
```

If a short URL is pasted and no `expandUrl` callback is provided, the library will attempt a direct fetch which will fail in browser environments due to CORS. Full (non-shortened) URLs work without any proxy.

## Geocoding Strategy

| Priority | Condition | Action |
|---|---|---|
| 1 | Embedded address in URL (`!2s` param) | Forward geocode the exact address string |
| 2 | Pin coordinates from data param (`!3d`/`!4d`) | Reverse geocode the exact pin |
| 3 | Place name from URL path (`/place/Name/`) | Forward geocode with wide region bias |
| 4 | Viewport coordinates (`@lat,lng`) | Reverse geocode (least accurate) |

If an API key is configured for the detected provider, the library uses that provider's native geocoding API. Otherwise it falls back to Nominatim (OpenStreetMap, free, no key required).
