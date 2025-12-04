import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { BillingProvider } from "@/lib/BillingContext";
import { I18nProvider } from "@/lib/I18nProvider";
import { CommandPaletteProvider } from "@/components/CommandPaletteProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZORA CORE - AI Operating System",
  description: "Multi-agent, climate-first AI operating system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <I18nProvider>
          <AuthProvider>
            <BillingProvider>
              <CommandPaletteProvider>
                {children}
              </CommandPaletteProvider>
            </BillingProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
