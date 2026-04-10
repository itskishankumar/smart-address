const SHORT_URL_HOSTS = [
  "goo.gl",
  "maps.app.goo.gl",
  "bit.ly",
  "binged.it",
  "her.is",
  "osm.org",
  "maps.apple",
];

export function isShortUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return SHORT_URL_HOSTS.some(
      (h) => hostname === h || hostname === `www.${h}`,
    );
  } catch {
    return false;
  }
}

export async function expandUrl(
  url: string,
  customExpander?: (url: string) => Promise<string>,
): Promise<string> {
  if (!isShortUrl(url)) return url;

  if (customExpander) {
    const result = await customExpander(url);
    return result;
  }

  // Use the local proxy endpoint to follow redirects
  const proxyUrl = `/api/expand?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) {
    console.error(`[smart-address:expander] Proxy error: ${res.status} ${res.statusText}`);
    throw new Error(`Failed to expand URL: ${res.statusText}`);
  }
  const data = await res.json();
  return data.finalUrl || url;
}
