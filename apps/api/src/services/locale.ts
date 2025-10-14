import { MARKETS } from "@zoracore/config/markets";

export const localeService = {
  get: ({ tenant, code }: { tenant: string; code: string }) => {
    const marketKey = tenant in MARKETS ? (tenant as keyof typeof MARKETS) : "ai";
    const locale = Array.isArray(MARKETS[marketKey].locale)
      ? (MARKETS[marketKey].locale as string[])
      : [MARKETS[marketKey].locale as string];
    const active = locale.includes(code) ? code : locale[0];
    return {
      tenant: marketKey,
      locale: active,
      supported: locale,
      currency: MARKETS[marketKey].currency
    };
  }
};
