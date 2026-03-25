import type { Metadata } from "next";
import "./globals.css";
import { appConfig } from "@/shared/lib/config";
import Providers from "./Providers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { CookieConsent } from "@/shared/components/cookie-consent";

// Using system fonts as fallback when Google Fonts is unavailable
// This ensures build succeeds in all environments

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://hivebudget.com.br"),
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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#8b5cf6" />
        <link rel="preconnect" href="https://api.dicebear.com" />
      </head>
      <body className="font-sans antialiased bg-background" suppressHydrationWarning>
        <a href="#main-content" className="skip-to-content">
          Pular para o conteúdo
        </a>
        <Providers>
          <div id="main-content">{children}</div>
          <CookieConsent />
        </Providers>
        <SpeedInsights />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
