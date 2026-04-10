import type { UrlParser } from "../types";
import { googleParser } from "./google";
import { appleParser } from "./apple";
import { osmParser } from "./osm";
import { bingParser } from "./bing";
import { hereParser } from "./here";
import { yandexParser } from "./yandex";

const LOG = "[smart-address:parsers]";

export const parsers: UrlParser[] = [
  googleParser,
  appleParser,
  osmParser,
  bingParser,
  hereParser,
  yandexParser,
];

export function detectParser(url: string): UrlParser | null {
  console.log(`${LOG} Testing URL against ${parsers.length} parsers...`);
  for (const p of parsers) {
    const canParse = p.canParse(url);
    console.log(`${LOG}   ${p.provider}: canParse → ${canParse}`);
    if (canParse) {
      console.log(`${LOG} Matched parser: ${p.provider}`);
      return p;
    }
  }
  console.warn(`${LOG} No parser matched URL: ${url.substring(0, 80)}`);
  return null;
}
