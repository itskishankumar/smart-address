import type { IncomingMessage, ServerResponse } from "http";
import { resolveMapUrl } from "smart-address";
import { expandShortUrl } from "smart-address/node";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  // Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const url = new URL(req.url || "", "http://localhost").searchParams.get(
    "url",
  );
  const json = (status: number, body: object) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    });
    res.end(JSON.stringify(body));
  };

  if (!url) return json(400, { error: "Missing url parameter" });

  try {
    const address = await resolveMapUrl(url, {
      expandUrl: expandShortUrl,
    });
    json(200, address);
  } catch (err) {
    json(500, { error: (err as Error).message });
  }
}
