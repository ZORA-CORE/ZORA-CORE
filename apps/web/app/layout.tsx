import "./global/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@zoracore/ui";
import { MARKETS, type MarketCode } from "@zoracore/config/markets";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "ZORA CORE – Infinity Blue",
  description: "Market-aware experience platform for Nordic brands.",
  metadataBase: new URL("https://zoracore.ai")
};

type Props = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: Props) {
  const fallbackMarket: MarketCode = "ai";
  const market = fallbackMarket;
  const tokens = MARKETS[market];

  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider market={market} brand="zora" initialDarkMode={tokens.theme === "developer"}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
