const LOG = "[smart-address:expander]";

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
    const result = SHORT_URL_HOSTS.some(
      (h) => hostname === h || hostname === `www.${h}`,
    );
    console.log(`${LOG} isShortUrl("${hostname}") → ${result}`);
    return result;
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
    console.log(`${LOG} Using custom expander for: ${url}`);
    const result = await customExpander(url);
    console.log(`${LOG} Custom expander result: ${result}`);
    return result;
  }

  // Use the local proxy endpoint to follow redirects
  const proxyUrl = `/api/expand?url=${encodeURIComponent(url)}`;
  console.log(`${LOG} Calling proxy: ${proxyUrl}`);
  const res = await fetch(proxyUrl);
  if (!res.ok) {
    console.error(`${LOG} Proxy error: ${res.status} ${res.statusText}`);
    throw new Error(`Failed to expand URL: ${res.statusText}`);
  }
  const data = await res.json();
  console.log(`${LOG} Proxy response:`, data);
  return data.finalUrl || url;
}
