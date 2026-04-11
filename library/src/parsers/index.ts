import type { UrlParser } from "../types.js";
import { googleParser } from "./google.js";
import { appleParser } from "./apple.js";
import { osmParser } from "./osm.js";
import { bingParser } from "./bing.js";
import { hereParser } from "./here.js";
import { yandexParser } from "./yandex.js";

export const parsers: UrlParser[] = [
  googleParser,
  appleParser,
  osmParser,
  bingParser,
  hereParser,
  yandexParser,
];

export function detectParser(url: string): UrlParser | null {
  for (const p of parsers) {
    if (p.canParse(url)) {
      return p;
    }
  }
  return null;
}
