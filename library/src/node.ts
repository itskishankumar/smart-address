import http from "http";
import https from "https";

// Hosts we're willing to fetch. Covers:
//   - Shortener entry points (first URL passed in by the caller)
//   - Long-form maps hosts (redirect destinations)
// Both are needed because expandShortUrl() recursively calls itself on every
// Location, and the final request lands on the long-form URL.
const ALLOWED_HOSTS = [
  // Shorteners
  "goo.gl", // maps.app.goo.gl
  "bit.ly",
  "binged.it",
  "her.is",
  // Long-form maps hosts
  "google.com",
  "apple.com", // maps.apple.com
  "openstreetmap.org",
  "osm.org",
  "bing.com",
  "here.com", // share.here.com
  "yandex.com",
  "yandex.ru",
];

export function isAllowedHost(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return ALLOWED_HOSTS.some(
      (h) => hostname === h || hostname.endsWith(`.${h}`),
    );
  } catch {
    return false;
  }
}

export function expandShortUrl(
  url: string,
  maxRedirects = 10,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error("Too many redirects"));

    // SSRF guard: reject anything outside the maps allowlist — both the
    // initial URL and every redirect target (this function calls itself
    // recursively with each Location, so the check runs on both).
    if (!isAllowedHost(url)) {
      let host = "unknown";
      try {
        host = new URL(url).hostname;
      } catch {}
      return reject(
        new Error(
          `[smart-address/node] Refusing to fetch URL: host "${host}" is not in the maps allowlist`,
        ),
      );
    }

    const client = url.startsWith("https") ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; SmartAddress/1.0)",
        },
        timeout: 10000,
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const next = res.headers.location.startsWith("http")
            ? res.headers.location
            : new URL(res.headers.location, url).toString();
          res.resume();
          resolve(expandShortUrl(next, maxRedirects - 1));
        } else {
          res.resume();
          resolve(url);
        }
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
  });
}
