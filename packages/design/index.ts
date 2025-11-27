import type { MarketCode } from "@zoracore/config/markets";

export type DesignToken = {
  colors: {
    background: string;
    foreground: string;
    primary: string;
    secondary: string;
    accent: string;
  };
  radius: string;
  shadow: string;
  motion: string;
  tone: string;
  imagery: string;
  darkModeDefault?: boolean;
};

const baseTokens: Record<MarketCode, DesignToken> = {
  dk: {
    colors: {
      background: "#f7f7f5",
      foreground: "#0b1d26",
      primary: "#005f73",
      secondary: "#94d2bd",
      accent: "#ee9b00"
    },
    radius: "0.5rem",
    shadow: "0 10px 30px rgba(0,0,0,0.1)",
    motion: "cubic-bezier(0.2,0.8,0.2,1) 160ms",
    tone: "klar, progressiv, jordnær",
    imagery: "kystlinjer, nordisk design"
  },
  se: {
    colors: {
      background: "#ffffff",
      foreground: "#111827",
      primary: "#2563eb",
      secondary: "#a855f7",
      accent: "#f97316"
    },
    radius: "0.4rem",
    shadow: "0 12px 24px rgba(15,23,42,0.12)",
    motion: "cubic-bezier(0.2,0.8,0.2,1) 150ms",
    tone: "moderne, optimistisk",
    imagery: "skærgård, farveblokke"
  },
  pl: {
    colors: {
      background: "#fcf8f5",
      foreground: "#1f2937",
      primary: "#d946ef",
      secondary: "#22d3ee",
      accent: "#f97316"
    },
    radius: "0.45rem",
    shadow: "0 8px 32px rgba(30,41,59,0.16)",
    motion: "cubic-bezier(0.2,0.8,0.2,1) 180ms",
    tone: "selvsikker, kunstnerisk",
    imagery: "plakatkunst, neon-typografi"
  },
  ee: {
    colors: {
      background: "#f5f9ff",
      foreground: "#0f172a",
      primary: "#1d4ed8",
      secondary: "#7c3aed",
      accent: "#facc15"
    },
    radius: "0.4rem",
    shadow: "0 10px 32px rgba(2,6,23,0.14)",
    motion: "cubic-bezier(0.2,0.8,0.2,1) 170ms",
    tone: "digital, fremadstormende",
    imagery: "digitale bølger, baltisk lys"
  },
  gl: {
    colors: {
      background: "#0b1d26",
      foreground: "#f1f5f9",
      primary: "#38bdf8",
      secondary: "#22d3ee",
      accent: "#fbbf24"
    },
    radius: "0.35rem",
    shadow: "0 14px 36px rgba(15,118,110,0.3)",
    motion: "cubic-bezier(0.2,0.8,0.2,1) 200ms",
    tone: "stærk, ceremoniel",
    imagery: "arktiske kontraster, nordlys",
    darkModeDefault: true
  },
  is: {
    colors: {
      background: "#030712",
      foreground: "#e5e7eb",
      primary: "#38bdf8",
      secondary: "#a855f7",
      accent: "#f97316"
    },
    radius: "0.5rem",
    shadow: "0 18px 36px rgba(56,189,248,0.28)",
    motion: "cubic-bezier(0.2,0.8,0.2,1) 160ms",
    tone: "poetisk, teknologisk",
    imagery: "vulkanisk neon",
    darkModeDefault: true
  },
  no: {
    colors: {
      background: "#f8fafc",
      foreground: "#0f172a",
      primary: "#0ea5e9",
      secondary: "#22c55e",
      accent: "#f97316"
    },
    radius: "0.45rem",
    shadow: "0 12px 26px rgba(14,165,233,0.18)",
    motion: "cubic-bezier(0.2,0.8,0.2,1) 150ms",
    tone: "stabil, sanselig",
    imagery: "fjordlinjer, tekstiler"
  },
  fi: {
    colors: {
      background: "#f1f5f9",
      foreground: "#0f172a",
      primary: "#2563eb",
      secondary: "#0ea5e9",
      accent: "#22d3ee"
    },
    radius: "0.5rem",
    shadow: "0 10px 24px rgba(15,23,42,0.14)",
    motion: "cubic-bezier(0.2,0.8,0.2,1) 140ms",
    tone: "rolig, præcis",
    imagery: "søer, minimalisme"
  },
  ai: {
    colors: {
      background: "#020617",
      foreground: "#e0f2fe",
      primary: "#38bdf8",
      secondary: "#22d3ee",
      accent: "#818cf8"
    },
    radius: "0.6rem",
    shadow: "0 20px 40px rgba(2,132,199,0.35)",
    motion: "cubic-bezier(0.2,0.8,0.2,1) 140ms",
    tone: "teknisk, inviterende",
    imagery: "infinit blå, datastrømme",
    darkModeDefault: true
  },
  app: {
    colors: {
      background: "#050816",
      foreground: "#e2e8f0",
      primary: "#6366f1",
      secondary: "#22d3ee",
      accent: "#f472b6"
    },
    radius: "0.5rem",
    shadow: "0 16px 30px rgba(79,70,229,0.28)",
    motion: "cubic-bezier(0.2,0.8,0.2,1) 130ms",
    tone: "immersiv, sikker",
    imagery: "app-shell med stjernestøv",
    darkModeDefault: true
  }
};

export function getDesignTokens(market: MarketCode): DesignToken {
  return baseTokens[market];
}
