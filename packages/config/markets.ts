export const MARKETS = {
  dk: { tld: "zoracore.dk", locale: "da-DK", currency: "DKK", theme: "nordic-minimal", imagery: "coastal+design", dateFmt: "dd-MM-yyyy" },
  se: { tld: "zoracore.se", locale: "sv-SE", currency: "SEK", theme: "archipelago", imagery: "scandi-color-pop" },
  pl: { tld: "zoracore.pl", locale: "pl-PL", currency: "PLN", theme: "posterism", imagery: "bold-typography" },
  ee: { tld: "zoracore.ee", locale: "et-EE", currency: "EUR", theme: "digital-baltic" },
  gl: { tld: "zoracore.gl", locale: ["kl-GL", "da-DK"], currency: "DKK", theme: "arctic-contrast" },
  is: { tld: "zoracore.is", locale: "is-IS", currency: "ISK", theme: "volcanic-neon" },
  no: { tld: "zoracore.no", locale: ["nb-NO", "nn-NO"], currency: "NOK", theme: "fjord-lines" },
  fi: { tld: "zoracore.fi", locale: "fi-FI", currency: "EUR", theme: "lakes-minimal" },
  ai: { tld: "zoracore.ai", locale: "en", currency: "USD", theme: "developer" },
  app: { tld: "zoracore.app", locale: "en", currency: "USD", theme: "app-shell" }
} as const;

export type MarketCode = keyof typeof MARKETS;
