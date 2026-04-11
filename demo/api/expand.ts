import type { IncomingMessage, ServerResponse } from "http";
import { isAllowedHost, expandShortUrl } from "smart-address/node";

export async function handleExpand(
  targetUrl: string | null,
): Promise<{ status: number; body: Record<string, string> }> {
  if (!targetUrl) {
    return { status: 400, body: { error: "Missing url parameter" } };
  }
  if (!isAllowedHost(targetUrl)) {
    return { status: 403, body: { error: "Host not in allowlist" } };
  }
  try {
    const finalUrl = await expandShortUrl(targetUrl);
    return { status: 200, body: { finalUrl, originalUrl: targetUrl } };
  } catch (err) {
    return { status: 500, body: { error: (err as Error).message } };
  }
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const url = new URL(req.url || "", "http://localhost").searchParams.get(
    "url",
  );
  const { status, body } = await handleExpand(url);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}
