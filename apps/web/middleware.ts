import { NextResponse, type NextRequest } from "next/server";
import { MARKETS, type MarketCode } from "@zoracore/config/markets";
import { resolveMarketFromHost, negotiateLocale } from "@zoracore/i18n";

const LANG_QUERY = "lang";
const LANG_COOKIE = "zoracore_lang";

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get("host") ?? undefined;
  const cookieLang = request.cookies.get(LANG_COOKIE)?.value;
  const override = url.searchParams.get(LANG_QUERY) ?? cookieLang;
  const marketFromHost = resolveMarketFromHost(host);
  const pathSegments = url.pathname.split("/").filter(Boolean);
  const firstSegment = pathSegments[0] as MarketCode | undefined;
  const market = firstSegment && MARKETS[firstSegment] ? firstSegment : marketFromHost ?? "ai";

  if (!firstSegment || firstSegment !== market) {
    url.pathname = `/${market}${url.pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = negotiateLocale({ market, acceptLanguage: request.headers.get("accept-language") ?? undefined, override: override ?? undefined });

  const response = NextResponse.next();
  response.cookies.set(LANG_COOKIE, locale, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/"
  });
  return response;
}

export const config = {
  matcher: "/((?!_next|api|static|.*\\..*).*)"
};
