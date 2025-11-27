import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { sanitizeContent } from "@zoracore/i18n";
import type { MarketCode } from "@zoracore/config/markets";

export type ContentPage = {
  slug: string;
  frontMatter: Record<string, unknown>;
  body: string;
};

function renderMarkdownToHtml(markdown: string): string {
  const sanitized = sanitizeContent(markdown);
  return sanitized
    .split(/\n\n+/)
    .map((block) => `<p>${block.trim()}</p>`)
    .join("\n");
}

export function loadMarketPage(market: MarketCode, slug: string): ContentPage {
  const filePath = path.join(process.cwd(), "content", "markets", market, `${slug}.mdx`);
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = matter(raw);
  return {
    slug,
    frontMatter: parsed.data,
    body: renderMarkdownToHtml(parsed.content)
  };
}

export function listMarketPages(market: MarketCode): ContentPage[] {
  const dir = path.join(process.cwd(), "content", "markets", market);
  const files = fs.readdirSync(dir).filter((file) => file.endsWith(".mdx"));
  return files.map((file) => loadMarketPage(market, file.replace(/\.mdx$/, "")));
}

export { CTAGroup } from "./src/components/cta-group";
