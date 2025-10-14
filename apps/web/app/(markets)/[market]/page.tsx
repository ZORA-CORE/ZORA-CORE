import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { listMarketPages, loadMarketPage } from "@zoracore/content";
import { MARKETS, type MarketCode } from "@zoracore/config/markets";
import { getDesignTokens } from "@zoracore/design";
import { Accordion, AccordionItem, Card, Tabs, TabsContent, TabsList, TabsTrigger } from "@zoracore/ui";

const SLUGS = ["home", "about", "shop", "legal"] as const;

type Params = {
  market: MarketCode;
};

export function generateStaticParams(): Params[] {
  return Object.keys(MARKETS).map((market) => ({ market })) as Params[];
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const market = params.market;
  if (!MARKETS[market]) return {};
  const home = loadMarketPage(market, "home");
  return {
    title: home.frontMatter?.title as string,
    description: (home.frontMatter?.description as string) ?? undefined
  };
}

export default function MarketPage({ params }: { params: Params }) {
  const market = params.market;
  if (!MARKETS[market]) {
    notFound();
  }
  const pages = listMarketPages(market).filter((page) => SLUGS.includes(page.slug as (typeof SLUGS)[number]));
  const tokens = getDesignTokens(market);

  return (
    <main
      style={{
        backgroundColor: tokens.colors.background,
        color: tokens.colors.foreground
      }}
      className="min-h-screen px-6 py-16"
    >
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-12">
        {pages.map((page) => (
          <Card key={page.slug} className="space-y-6 p-8">
            <header className="space-y-2">
              <h2 className="text-2xl font-semibold">{page.frontMatter?.title as string}</h2>
              {page.frontMatter?.description ? (
                <p className="max-w-2xl text-foreground">
                  {page.frontMatter.description as string}
                </p>
              ) : null}
            </header>
            <div className="space-y-4" dangerouslySetInnerHTML={{ __html: page.body }} />
          </Card>
        ))}
        <Tabs value="brands" className="mx-auto w-full max-w-3xl">
          <TabsList>
            <TabsTrigger value="brands">Brands</TabsTrigger>
            <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          <TabsContent value="brands">
            <p>
              Choose between ZORA (Infinity Blue), GymGlow (neon sport), and GlamGlow (couture-edge) themes.
            </p>
          </TabsContent>
          <TabsContent value="accessibility">
            <p>
              WCAG AA support, keyboard navigation, and tone-of-voice guides are enforced via design tokens.
            </p>
          </TabsContent>
          <TabsContent value="security">
            <p>
              CSP, passkey authentication, and tenant isolation are configured per market with automated audits.
            </p>
          </TabsContent>
        </Tabs>
        <Accordion type="multiple" className="mx-auto w-full max-w-3xl">
          <AccordionItem id="latency" title="Edge latency targets">
            <p>Sub 120 ms page render through Cloudflare Workers and regional caches.</p>
          </AccordionItem>
          <AccordionItem id="consent" title="Consent and localization">
            <p>Consent mode defaults to off until localized acceptance is recorded in zoracore.app.</p>
          </AccordionItem>
        </Accordion>
      </section>
    </main>
  );
}
