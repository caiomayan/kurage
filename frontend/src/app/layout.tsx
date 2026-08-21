import type { Metadata, Viewport } from "next";
import { Inter, EB_Garamond, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/lib/auth";
import { Header } from "@/components/shell/Header";
import { ConditionalFooter } from "@/components/shell/ConditionalFooter";
import { Toaster } from "sonner";
import { SmoothScroll } from "@/providers/SmoothScroll";
import { ScrollProgress } from "@/components/ui/ScrollProgress";

import { InventoryProvider } from "@/lib/inventory/inventory-context";

// Display Serif: EB Garamond (Google Fonts)
const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-eb-garamond",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// UI font (Resend Inter)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Body font (Resend ABC Favorit alternative)
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

// Code font (Resend Geist Mono)
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kurage.caiomayan.com"),
  title: {
    template: "Kurage · %s",
    default: "Kurage · O competitivo em um só lugar",
  },
  description:
    "Portal competitivo de Counter-Strike 2 com identidade digital, rankings ELO em tempo real, telemetria do servidor dedicado e estatísticas avançadas.",
  keywords: [
    "CS2",
    "Counter-Strike 2",
    "Kurage",
    "Competitivo",
    "Ranking",
    "ELO",
    "O Mar",
  ],
  authors: [{ name: "Kurage Team" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://kurage.caiomayan.com",
    siteName: "Kurage",
    title: "Kurage",
    description: "Portal competitivo de Counter-Strike 2.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kurage",
    description: "Portal competitivo de Counter-Strike 2.",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${inter.variable} ${ebGaramond.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased selection:bg-accent-blue/20 selection:text-accent-blue">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-on focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Pular para o conteúdo principal
        </a>
        <SmoothScroll>
          <ScrollProgress />
          <QueryProvider>
          <AuthProvider>
            <InventoryProvider>
              <Header />
              {/* Header is fixed — inner pages that aren't full-screen need pt-[58px] themselves */}
              <main id="main-content" tabIndex={-1} className="w-full outline-none">
                {children}
              </main>
              <ConditionalFooter />
              <Toaster
                theme="dark"
                position="bottom-right"
                toastOptions={{
                  style: {
                    background: "#0a0a0c",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    color: "#fcfdff",
                    fontSize: "14px",
                    borderRadius: "8px",
                  },
                }}
              />
            </InventoryProvider>
          </AuthProvider>
        </QueryProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
