import { MARKETS, type MarketCode } from "@zoracore/config/markets";
import { resolveMarketFromHost, negotiateLocale } from "@zoracore/i18n";

const LANG_COOKIE = "zoracore_lang";

function buildRedirectUrl(host: string, market: MarketCode, request: Request, locale: string) {
  const url = new URL(request.url);
  url.hostname = host;
  url.pathname = `/${market}`;
  url.searchParams.set("locale", locale);
  return url.toString();
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const cookieLang = request.headers.get("Cookie")?.match(/zoracore_lang=([^;]+)/)?.[1];
    const langOverride = url.searchParams.get("lang") ?? cookieLang ?? undefined;
    const host = url.hostname;
    const market = resolveMarketFromHost(host) ?? "ai";
    const locale = negotiateLocale({
      market,
      acceptLanguage: request.headers.get("Accept-Language") ?? undefined,
      override: langOverride
    });

    const response = await fetch(buildRedirectUrl(host, market, request, locale), {
      method: "GET",
      headers: request.headers
    });

    const newHeaders = new Headers(response.headers);
    newHeaders.set("Set-Cookie", `${LANG_COOKIE}=${locale}; Path=/; Secure; HttpOnly; SameSite=Lax`);
    newHeaders.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
    newHeaders.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }
};
