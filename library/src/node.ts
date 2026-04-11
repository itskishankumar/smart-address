import http from "http";
import https from "https";

const ALLOWED_HOSTS = [
  "goo.gl",
  "maps.app.goo.gl",
  "bit.ly",
  "binged.it",
  "her.is",
  "osm.org",
  "www.osm.org",
  "maps.apple",
  "maps.apple.com",
  "share.here.com",
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
