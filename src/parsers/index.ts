import type { UrlParser } from "../types";
import { googleParser } from "./google";
import { appleParser } from "./apple";
import { osmParser } from "./osm";
import { bingParser } from "./bing";
import { hereParser } from "./here";
import { yandexParser } from "./yandex";

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
