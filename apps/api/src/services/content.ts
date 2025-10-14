import { listMarketPages } from "@zoracore/content";
import { MARKETS, type MarketCode } from "@zoracore/config/markets";

export const contentService = {
  listCollections: ({ tenant }: { tenant: string }) => {
    const market = (tenant in MARKETS ? tenant : "ai") as MarketCode;
    const pages = listMarketPages(market);
    return {
      market,
      pages: pages.map((page) => ({
        slug: page.slug,
        title: page.frontMatter?.title,
        description: page.frontMatter?.description
      }))
    };
  }
};
