import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Caveat } from "next/font/google";
import "./globals.css";
import { appConfig } from "@/shared/lib/config";
import Providers from "./Providers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { CookieConsent } from "@/shared/components/cookie-consent";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

const caveat = Caveat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-caveat",
  weight: ["400", "500", "600", "700"],
});

function getBaseUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL || "https://hivebudget.com";
  return url.startsWith("http") ? url : `https://${url}`;
}

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    template: `%s | ${appConfig.projectName}`,
    absolute: appConfig.projectName,
  },
  description: appConfig.description,
  keywords: appConfig.keywords,
  openGraph: {
    title: appConfig.projectName,
    description: appConfig.description,
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: appConfig.projectName,
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/assets/logo.png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/assets/logo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#8b5cf6" />
        <link rel="preconnect" href="https://api.dicebear.com" />
      </head>
      <body className={`${plusJakarta.variable} ${jetbrainsMono.variable} ${caveat.variable} font-sans antialiased bg-background`} suppressHydrationWarning>
        {/* Scribble filter defs — referenced by .cartoon-panel ::before to
            paint a hand-drawn wobbled border. Hidden but globally available. */}
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
          <defs>
            <filter id="scribble" x="-8%" y="-8%" width="116%" height="116%">
              <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="3" result="t" />
              <feDisplacementMap in="SourceGraphic" in2="t" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <filter id="scribble-light" x="-12%" y="-12%" width="124%" height="124%">
              <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="7" result="t" />
              <feDisplacementMap in="SourceGraphic" in2="t" scale="0.9" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
        <a href="#main-content" className="skip-to-content">
          Pular para o conteúdo
        </a>
        <Providers>
          <div id="main-content">{children}</div>
          <CookieConsent />
        </Providers>
        <Analytics />
        <SpeedInsights />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
