import type { IncomingMessage, ServerResponse } from "http";
import { resolveMapUrl } from "smart-address";
import { expandShortUrl } from "smart-address/node";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const url = new URL(req.url || "", "http://localhost").searchParams.get(
    "url",
  );
  const json = (status: number, body: object) => {
    res.writeHead(status, { "Content-Type": "application/json" });
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
