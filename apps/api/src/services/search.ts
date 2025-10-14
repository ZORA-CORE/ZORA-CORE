import { listMarketPages } from "@zoracore/content";
import { MARKETS, type MarketCode } from "@zoracore/config/markets";

export const searchService = {
  query: ({ tenant, term }: { tenant: string; term: string }) => {
    const market = (tenant in MARKETS ? tenant : "ai") as MarketCode;
    const pages = listMarketPages(market);
    const results = pages
      .filter((page) => page.body.toLowerCase().includes(term.toLowerCase()))
      .map((page) => ({
        slug: page.slug,
        title: page.frontMatter?.title,
        snippet: page.body.slice(0, 160)
      }));
    return { market, count: results.length, results };
  }
};
