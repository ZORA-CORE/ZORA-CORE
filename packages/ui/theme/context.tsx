import * as React from "react";
import { getDesignTokens } from "@zoracore/design";
import type { MarketCode } from "@zoracore/config/markets";

type BrandKey = "zora" | "gmg" | "glam";

export type ThemeContextValue = {
  market: MarketCode;
  brand: BrandKey;
  tokens: ReturnType<typeof getDesignTokens>;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function applyDesignTokens(tokens: ReturnType<typeof getDesignTokens>) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--background", tokens.colors.background);
  root.style.setProperty("--foreground", tokens.colors.foreground);
  root.style.setProperty("--primary", tokens.colors.primary);
  root.style.setProperty("--secondary", tokens.colors.secondary);
  root.style.setProperty("--accent", tokens.colors.accent);
  root.style.setProperty("--radius", tokens.radius);
  root.style.setProperty("--shadow", tokens.shadow);
}

export function ThemeProvider({
  market,
  brand,
  initialDarkMode,
  children
}: {
  market: MarketCode;
  brand: BrandKey;
  initialDarkMode?: boolean;
  children: React.ReactNode;
}) {
  const tokens = React.useMemo(() => getDesignTokens(market), [market]);
  const [darkMode, setDarkMode] = React.useState<boolean>(
    initialDarkMode ?? Boolean(tokens.darkModeDefault)
  );

  React.useEffect(() => {
    applyDesignTokens(tokens);
  }, [tokens]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const value = React.useMemo(
    () => ({ market, brand, tokens, darkMode, setDarkMode }),
    [market, brand, tokens, darkMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
