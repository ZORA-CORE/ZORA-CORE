import { match as matchLocale } from "@formatjs/intl-localematcher";
import parser from "accept-language-parser";
import { MARKETS, type MarketCode } from "@zoracore/config/markets";
import { sanitizeCopy } from "./utils/sanitize";

export type LocalePreference = {
  market: MarketCode;
  locale: string;
};

export function resolveMarketFromHost(host?: string): MarketCode | undefined {
  if (!host) return undefined;
  const cleaned = host.toLowerCase();
  const entry = Object.entries(MARKETS).find(([, value]) => cleaned.endsWith(value.tld));
  return entry?.[0] as MarketCode | undefined;
}

export function negotiateLocale({
  market,
  acceptLanguage,
  override
}: {
  market: MarketCode;
  acceptLanguage?: string;
  override?: string;
}): string {
  const pool = Array.isArray(MARKETS[market].locale)
    ? (MARKETS[market].locale as string[])
    : [MARKETS[market].locale as string];

  if (override && pool.includes(override)) {
    return override;
  }

  if (!acceptLanguage) {
    return pool[0];
  }

  const parsed = parser.parse(acceptLanguage).map((loc) => loc.code);
  return matchLocale(parsed, pool, "en");
}

export function sanitizeContent(input: string): string {
  return sanitizeCopy(input);
}
